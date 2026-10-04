/**
 * backupStore — snapshots versionados del estado local de Jikan.
 *
 * Vive en el object store `backups` de la base local `jikan` (ver `localDb.js`)
 * y funciona **sin conexión**: es el "auto-backup" de la v4.0 C2.
 *
 * Un snapshot es una fila:
 *   { id, user_id, created_at (ISO), version, count, payload }
 * donde `payload` es el backup completo que produce `src/utils/backup.js`
 * (actividades + recordatorios + paneles + ajustes + pomodoro + notificaciones).
 *
 * Interfaz (async):
 *   list(userId)                → Snapshot[]           (más reciente primero)
 *   latest(userId)              → Snapshot | null
 *   create({ userId, payload }) → Snapshot
 *   remove(id)                  → void
 *   clear(userId)               → number               (cuántas borró)
 *   prune(userId, keep)         → number               (cuántas borró)
 */

import { BACKUPS_STORE, getAllFromStore, withTransaction } from './localDb';

const newId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `backup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Copia pública de un snapshot (el payload va entero: es lo que hay que guardar). */
const toSnapshot = (row) => ({
  id: row.id,
  user_id: row.user_id,
  created_at: row.created_at,
  version: row.version,
  count: row.count,
  payload: row.payload,
});

/** Ordena de más reciente a más antigua (ISO-8601 ordena lexicográficamente). */
const byNewestFirst = (a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0);

const rowsOf = async (userId) => {
  const all = await getAllFromStore(BACKUPS_STORE);
  return all.filter((row) => row.user_id === (userId || 'anon')).sort(byNewestFirst);
};

export const backupStore = {
  async list(userId) {
    return (await rowsOf(userId)).map(toSnapshot);
  },

  async latest(userId) {
    const [first] = await rowsOf(userId);
    return first ? toSnapshot(first) : null;
  },

  async create({ userId, payload }) {
    const row = {
      id: newId(),
      user_id: userId || 'anon',
      created_at: new Date().toISOString(),
      version: payload?.version ?? 1,
      count: payload?.data?.activities?.length ?? 0,
      payload,
    };
    await withTransaction(BACKUPS_STORE, (store) => store.add(row));
    return toSnapshot(row);
  },

  async remove(id) {
    await withTransaction(BACKUPS_STORE, (store) => store.delete(id));
  },

  async clear(userId) {
    const rows = await rowsOf(userId);
    if (rows.length === 0) return 0;
    await withTransaction(BACKUPS_STORE, (store) => rows.forEach((row) => store.delete(row.id)));
    return rows.length;
  },

  /** Conserva solo las `keep` más recientes (mínimo 1) y devuelve cuántas borró. */
  async prune(userId, keep = 10) {
    const rows = await rowsOf(userId);
    const limit = Math.max(1, keep);
    const doomed = rows.slice(limit);
    if (doomed.length === 0) return 0;
    await withTransaction(BACKUPS_STORE, (store) => doomed.forEach((row) => store.delete(row.id)));
    return doomed.length;
  },
};

export default backupStore;