/**
 * activityStore — adaptador de persistencia de actividades.
 *
 * Dos implementaciones intercambiables con la misma interfaz asíncrona:
 *
 *   localStore    → IndexedDB (modo invitado, sin cuenta). db `jikan`,
 *                   store `activities` (ver `localDb.js`). Los ids los genera
 *                   `crypto.randomUUID()` y la forma de fila es idéntica a la de
 *                   Supabase.
 *   supabaseStore → tabla `activities` (RLS por `user_id`).
 *
 * Interfaz común (todas las funciones son async y lanzan Error con `message`):
 *
 *   list()                  → Row[]
 *   create(payload)         → Row
 *   update(id, payload)     → Row
 *   remove(id)              → void
 *   insertMany(payloads)    → Row[]          (append; nunca sobrescribe)
 *   replaceDay(day, items)  → Row[]          (borra el día y reinserta)
 *   clear()                 → void           (vacía el store local)
 *   count()                 → number
 *
 * Forma de fila (`Row`):
 *   { id, user_id, day_of_week, start_time, end_time, title, description, notes, color }
 * `day_of_week` es el nombre del día tal y como aparece en `src/utils/dates.js`
 * ('Lunes' … 'Domingo'); `start_time` / `end_time` son strings "HH:MM".
 *
 * Con cifrado local activo (v4.0 C3) la fila **completa** se guarda cifrada en
 * un sobre `{ id, enc }`: nada del contenido (título, descripción, notas,
 * color, día ni horas) queda en claro, ni siquiera el índice por día.
 * `decryptAll` / `encryptAll` / `reencryptAll` migran las filas al Activar,
 * desactivar o cambiar la passphrase.
 */

import { supabase } from './supabase';
import {
  ACTIVITIES_STORE,
  getAllFromStore,
  countFromStore,
  withTransaction,
} from './localDb';
import { decryptValue, encryptValue, getSessionKey, isUnlocked } from './crypto';

export const GUEST_USER_ID = 'guest';

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de fila
// ─────────────────────────────────────────────────────────────────────────────

/** Rellena los campos opcionales de una fila para que ambos stores guarden lo mismo. */
export function normalizeRow(row = {}) {
  return {
    user_id: row.user_id ?? null,
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    title: row.title,
    description: row.description ?? '',
    notes: row.notes ?? '',
    color: row.color ?? '#7c5cff',
  };
}

const newId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

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
  const rows = await getAllFromStore(ACTIVITIES_STORE);
  return Promise.all(rows.map(fromStored));
}

export const localStore = {
  async list() {
    return readAll();
  },

  async create(payload) {
    const row = { id: newId(), ...normalizeRow(payload) };
    const stored = await toStored(row);
    await withTransaction(ACTIVITIES_STORE, (store) => store.add(stored));
    return row;
  },

  async update(id, payload) {
    const existing = (await readAll()).find((row) => row.id === id);
    if (!existing) throw new Error(`Actividad local no encontrada: ${id}`);
    const row = { ...existing, ...normalizeRow(payload), id };
    const stored = await toStored(row);
    await withTransaction(ACTIVITIES_STORE, (store) => store.put(stored));
    return row;
  },

  async remove(id) {
    await withTransaction(ACTIVITIES_STORE, (store) => store.delete(id));
  },

  async insertMany(payloads = []) {
    const rows = payloads.map((payload) => ({ id: newId(), ...normalizeRow(payload) }));
    if (rows.length === 0) return [];
    const stored = await Promise.all(rows.map(toStored));
    await withTransaction(ACTIVITIES_STORE, (store) => stored.forEach((row) => store.add(row)));
    return rows;
  },

  async replaceDay(day, items = []) {
    const rows = items.map((item) => ({ id: newId(), ...normalizeRow({ ...item, day_of_week: day }) }));
    const stored = await Promise.all(rows.map(toStored));

    if (encryptedMode()) {
      // Sin el índice por `day_of_week` (todo va cifrado): se localiza en memoria.
      const doomed = (await readAll()).filter((row) => row.day_of_week === day).map((row) => row.id);
      await withTransaction(ACTIVITIES_STORE, (store) => {
        doomed.forEach((id) => store.delete(id));
        stored.forEach((row) => store.add(row));
      });
      return rows;
    }

    await withTransaction(ACTIVITIES_STORE, (store) => {
      const request = store.index('day_of_week').openKeyCursor(IDBKeyRange.only(day));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        store.delete(cursor.primaryKey);
        cursor.continue();
      };
      stored.forEach((row) => store.add(row));
    });
    return rows;
  },

  async clear() {
    await withTransaction(ACTIVITIES_STORE, (store) => store.clear());
  },

  async count() {
    return countFromStore(ACTIVITIES_STORE);
  },

  // ── Migraciones de cifrado (v4.0 C3) ─────────────────────────────────────

  /** Cifra todas las filas que aún estén en claro. */
  async encryptAll(key) {
    const rows = await getAllFromStore(ACTIVITIES_STORE);
    const pending = rows.filter((row) => !row.enc);
    if (pending.length === 0) return 0;
    const stored = await Promise.all(
      pending.map(async (row) => ({ id: row.id, enc: await encryptValue(key, row) }))
    );
    await withTransaction(ACTIVITIES_STORE, (store) =>
      stored.forEach((row) => store.put(row))
    );
    return pending.length;
  },

  /** Devuelve todas las filas al almacenamiento en claro. */
  async decryptAll(key) {
    const rows = await getAllFromStore(ACTIVITIES_STORE);
    const encrypted = rows.filter((row) => row.enc);
    if (encrypted.length === 0) return 0;
    const plain = await Promise.all(
      encrypted.map(async (row) => ({ id: row.id, ...(await decryptValue(key, row.enc)) }))
    );
    await withTransaction(ACTIVITIES_STORE, (store) => plain.forEach((row) => store.put(row)));
    return encrypted.length;
  },

  /** Reescribe todas las filas con otra clave (cambio de passphrase). */
  async reencryptAll(oldKey, newKey) {
    const rows = await getAllFromStore(ACTIVITIES_STORE);
    const stored = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        enc: await encryptValue(newKey, row.enc ? await decryptValue(oldKey, row.enc) : row),
      }))
    );
    await withTransaction(ACTIVITIES_STORE, (store) => stored.forEach((row) => store.put(row)));
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
    return unwrap(await supabase.from('activities').select('*').order('start_time')) ?? [];
  },

  async create(payload) {
    const rows = unwrap(await supabase.from('activities').insert([normalizeRow(payload)]).select());
    return rows?.[0] ?? null;
  },

  async update(id, payload) {
    const rows = unwrap(
      await supabase.from('activities').update(normalizeRow(payload)).eq('id', id).select()
    );
    return rows?.[0] ?? null;
  },

  async remove(id) {
    unwrap(await supabase.from('activities').delete().eq('id', id));
  },

  async insertMany(payloads = []) {
    if (payloads.length === 0) return [];
    const rows = unwrap(
      await supabase.from('activities').insert(payloads.map(normalizeRow)).select()
    );
    return rows ?? [];
  },

  async replaceDay(day, items = []) {
    unwrap(await supabase.from('activities').delete().eq('day_of_week', day));
    return items.length === 0 ? [] : this.insertMany(items.map((item) => ({ ...item, day_of_week: day })));
  },

  async clear() {
    // Nunca se llama en el store remoto: los datos de la cuenta se borran
    // explícitamente desde la app (o están protegidos por RLS).
    throw new Error('clear() no está disponible en el store de Supabase');
  },

  async count() {
    const { count, error } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Selección de store
// ─────────────────────────────────────────────────────────────────────────────

/** Devuelve el store que corresponde a la sesión actual. */
export function getActivityStore(isGuest) {
  return isGuest ? localStore : supabaseStore;
}