/**
 * examStore — adaptador de persistencia de exámenes.
 *
 * Dos implementaciones intercambiables con la misma interfaz asíncrona:
 *
 *   localStore    → IndexedDB (modo invitado, sin cuenta). db `jikan`,
 *                   store `exams` (ver `localDb.js`). Los ids los genera
 *                   `crypto.randomUUID()` y la forma de fila es idéntica a la
 *                   de Supabase.
 *   supabaseStore → tabla `exams` (RLS por `user_id`).
 *
 * Interfaz común (todas las funciones son async y lanzan Error con `message`):
 *
 *   list()               → Row[]
 *   create(payload)      → Row
 *   update(id, payload)  → Row
 *   remove(id)           → void
 *   insertMany(payloads) → Row[]          (append; nunca sobrescribe)
 *   clear()              → void           (vacía el store local)
 *   count()              → number
 *
 * Forma de fila (`Row`):
 *   { id, user_id, subject, date, time, activity_id, notes, color }
 * `date` es 'YYYY-MM-DD' y `time` es 'HH:MM' o `null` (sin hora, el examen cae
 * a las 00:00 local de ese día). `activity_id` apunta a `activities(id)` con
 * `on delete set null` y puede ser `null`. La normalización vive en
 * `sanitizeExam` (`src/utils/exams.js`), la única fuente de verdad.
 *
 * A diferencia de `activityStore.js` no hay dimensión `day_of_week`: no existe
 * `replaceDay` ni índices por día.
 *
 * Con cifrado local activo (v4.0 C3) la fila **completa** se guarda cifrada en
 * un sobre `{ id, enc }`: nada del contenido (asignatura, fecha, hora, notas,
 * color o vínculo) queda en claro. `decryptAll` / `encryptAll` /
 * `reencryptAll` migran las filas al Activar, desactivar o cambiar la
 * passphrase.
 */

import { supabase } from './supabase';
import { DEFAULT_EXAM_COLOR, sanitizeExam } from '../utils/exams';
import { EXAMS_STORE, getAllFromStore, countFromStore, withTransaction } from './localDb';
import { decryptValue, encryptValue, getSessionKey, isUnlocked } from './crypto';

// Reexportado para dar a los exámenes la misma superficie que `activityStore.js`.
// La constante vive allí: no se duplica.
export { GUEST_USER_ID } from './activityStore';

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de fila
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rellena los campos opcionales de una fila para que ambos stores guarden lo
 * mismo. Una fila inservible (sin asignatura o con fecha inválida) deja los
 * campos a `null`: el store no lanza, quien llama decide si la descarta.
 */
export function normalizeRow(row = {}) {
  const exam = sanitizeExam(row) ?? {};
  return {
    user_id: row.user_id ?? null,
    subject: exam.subject ?? '',
    date: exam.date ?? null,
    time: exam.time ?? null,
    activity_id: exam.activity_id ?? null,
    notes: exam.notes ?? '',
    color: exam.color ?? DEFAULT_EXAM_COLOR,
  };
}

const newId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `exam-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB (modo invitado)
// ─────────────────────────────────────────────────────────────────────────────

/** ¿Hay que escribir las filas cifradas? (solo con cifrado activo y desbloqueado) */
const encryptedMode = () => isUnlocked() && getSessionKey() != null;

/** Fila completa → sobre cifrado `{ id, enc }`, o la fila tal cual si no hay clave. */
async function toStored(row) {
  if (!encryptedMode()) return row;
  return { id: row.id, enc: await encryptValue(getSessionKey(), row) };
}

/** Sobre → fila. Las filas en claro (anteriores al cifrado) se devuelven tal cual. */
async function fromStored(stored) {
  if (!stored || !stored.enc) return stored;
  if (!getSessionKey()) throw new Error('Los datos locales están cifrados: desbloquea la app');
  return decryptValue(getSessionKey(), stored.enc);
}

/** Todas las filas, ya descifradas. */
async function readAll() {
  const rows = await getAllFromStore(EXAMS_STORE);
  return Promise.all(rows.map(fromStored));
}

export const localStore = {
  async list() {
    return readAll();
  },

  async create(payload) {
    const row = { id: newId(), ...normalizeRow(payload) };
    const stored = await toStored(row);
    await withTransaction(EXAMS_STORE, (store) => store.add(stored));
    return row;
  },

  async update(id, payload) {
    const existing = (await readAll()).find((row) => row.id === id);
    if (!existing) throw new Error(`Examen local no encontrado: ${id}`);
    const row = { ...existing, ...normalizeRow(payload), id };
    const stored = await toStored(row);
    await withTransaction(EXAMS_STORE, (store) => store.put(stored));
    return row;
  },

  async remove(id) {
    await withTransaction(EXAMS_STORE, (store) => store.delete(id));
  },

  async insertMany(payloads = []) {
    const rows = payloads.map((payload) => ({ id: newId(), ...normalizeRow(payload) }));
    if (rows.length === 0) return [];
    const stored = await Promise.all(rows.map(toStored));
    await withTransaction(EXAMS_STORE, (store) => stored.forEach((row) => store.add(row)));
    return rows;
  },

  async clear() {
    await withTransaction(EXAMS_STORE, (store) => store.clear());
  },

  async count() {
    return countFromStore(EXAMS_STORE);
  },

  // ── Migraciones de cifrado (v4.0 C3) ─────────────────────────────────────

  /** Cifra todas las filas que aún estén en claro. */
  async encryptAll(key) {
    const rows = await getAllFromStore(EXAMS_STORE);
    const pending = rows.filter((row) => !row.enc);
    if (pending.length === 0) return 0;
    const stored = await Promise.all(
      pending.map(async (row) => ({ id: row.id, enc: await encryptValue(key, row) }))
    );
    await withTransaction(EXAMS_STORE, (store) =>
      stored.forEach((row) => store.put(row))
    );
    return pending.length;
  },

  /** Devuelve todas las filas al almacenamiento en claro. */
  async decryptAll(key) {
    const rows = await getAllFromStore(EXAMS_STORE);
    const encrypted = rows.filter((row) => row.enc);
    if (encrypted.length === 0) return 0;
    const plain = await Promise.all(
      encrypted.map(async (row) => ({ id: row.id, ...(await decryptValue(key, row.enc)) }))
    );
    await withTransaction(EXAMS_STORE, (store) => plain.forEach((row) => store.put(row)));
    return encrypted.length;
  },

  /** Reescribe todas las filas con otra clave (cambio de passphrase). */
  async reencryptAll(oldKey, newKey) {
    const rows = await getAllFromStore(EXAMS_STORE);
    const stored = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        enc: await encryptValue(newKey, row.enc ? await decryptValue(oldKey, row.enc) : row),
      }))
    );
    await withTransaction(EXAMS_STORE, (store) => stored.forEach((row) => store.put(row)));
    return rows.length;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Supabase (usuario con cuenta)
// ─────────────────────────────────────────────────────────────────────────────

/** Traduce la respuesta de supabase-js a `throw Error(message)`. */
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export const supabaseStore = {
  async list() {
    return (
      unwrap(
        await supabase.from('exams').select('*').order('date').order('time', { nullsFirst: false })
      ) ?? []
    );
  },

  async create(payload) {
    const rows = unwrap(await supabase.from('exams').insert([normalizeRow(payload)]).select());
    return rows?.[0] ?? null;
  },

  async update(id, payload) {
    const rows = unwrap(
      await supabase.from('exams').update(normalizeRow(payload)).eq('id', id).select()
    );
    return rows?.[0] ?? null;
  },

  async remove(id) {
    unwrap(await supabase.from('exams').delete().eq('id', id));
  },

  async insertMany(payloads = []) {
    if (payloads.length === 0) return [];
    const rows = unwrap(await supabase.from('exams').insert(payloads.map(normalizeRow)).select());
    return rows ?? [];
  },

  async clear() {
    // Nunca se llama en el store remoto: los datos de la cuenta se borran
    // explícitamente desde la app (o están protegidos por RLS).
    throw new Error('clear() no está disponible en el store de Supabase');
  },

  async count() {
    const { count, error } = await supabase
      .from('exams')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Selección de store
// ─────────────────────────────────────────────────────────────────────────────

/** Devuelve el store que corresponde a la sesión actual. */
export function getExamStore(isGuest) {
  return isGuest ? localStore : supabaseStore;
}