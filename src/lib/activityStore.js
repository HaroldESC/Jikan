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
 */

import { supabase } from './supabase';
import {
  ACTIVITIES_STORE,
  openDb,
  toPromise,
  getAllFromStore,
  countFromStore,
  withTransaction,
} from './localDb';

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

export const localStore = {
  async list() {
    return getAllFromStore(ACTIVITIES_STORE);
  },

  async create(payload) {
    const row = { id: newId(), ...normalizeRow(payload) };
    await withTransaction(ACTIVITIES_STORE, (store) => store.add(row));
    return row;
  },

  async update(id, payload) {
    const db = await openDb();
    const existing = await toPromise(
      db.transaction(ACTIVITIES_STORE, 'readonly').objectStore(ACTIVITIES_STORE).get(id)
    );
    if (!existing) throw new Error(`Actividad local no encontrada: ${id}`);
    const row = { ...existing, ...normalizeRow(payload), id };
    await withTransaction(ACTIVITIES_STORE, (store) => store.put(row));
    return row;
  },

  async remove(id) {
    await withTransaction(ACTIVITIES_STORE, (store) => store.delete(id));
  },

  async insertMany(payloads = []) {
    const rows = payloads.map((payload) => ({ id: newId(), ...normalizeRow(payload) }));
    if (rows.length === 0) return [];
    await withTransaction(ACTIVITIES_STORE, (store) => rows.forEach((row) => store.add(row)));
    return rows;
  },

  async replaceDay(day, items = []) {
    const rows = items.map((item) => ({ id: newId(), ...normalizeRow({ ...item, day_of_week: day }) }));
    await withTransaction(ACTIVITIES_STORE, (store) => {
      const request = store.index('day_of_week').openKeyCursor(IDBKeyRange.only(day));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        store.delete(cursor.primaryKey);
        cursor.continue();
      };
      rows.forEach((row) => store.add(row));
    });
    return rows;
  },

  async clear() {
    await withTransaction(ACTIVITIES_STORE, (store) => store.clear());
  },

  async count() {
    return countFromStore(ACTIVITIES_STORE);
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