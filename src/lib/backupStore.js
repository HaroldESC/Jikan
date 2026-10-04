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
 *   encryptAll(key)             → number               (cifra snapshots en claro)
 *   decryptAll(key)             → number
 *   reencryptAll(oldKey,newKey) → number
 *
 * Con cifrado local activo (v4.0 C3) el `payload` se guarda cifrado en un sobre
 * `{ id, user_id, created_at, version, enc }`. `created_at` y `version` quedan en
 * claro porque se necesitan para ordenar y validar; el resto del snapshot no.
 */

import { BACKUPS_STORE, getAllFromStore, withTransaction } from './localDb';
import { decryptValue, encryptValue, getSessionKey, isUnlocked } from './crypto';

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
  payload: row.payload ?? null,
});

/** Ordena de más reciente a más antigua (ISO-8601 ordena lexicográficamente). */
const byNewestFirst = (a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0);

const encryptedMode = () => isUnlocked() && getSessionKey() != null;

/** Snapshot → fila guardable, cifrando el payload si hay clave de sesión. */
async function toStoredRow(row) {
  if (!encryptedMode()) return row;
  return { ...row, enc: await encryptValue(getSessionKey(), row.payload) };
}

/** Fila guardada → snapshot, descifrando el payload cuando corresponda. */
async function toPublic(row) {
  if (!row.enc) return toSnapshot(row);
  if (!getSessionKey()) {
    // App bloqueada: se expone la metadata para poder listar, sin el contenido.
    return { id: row.id, user_id: row.user_id, created_at: row.created_at, version: row.version, count: null, payload: null };
  }
  const payload = await decryptValue(getSessionKey(), row.enc);
  return {
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    version: row.version,
    count: payload?.data?.activities?.length ?? 0,
    payload,
  };
}

const rowsOf = async (userId) => {
  const all = await getAllFromStore(BACKUPS_STORE);
  return all.filter((row) => row.user_id === (userId || 'anon')).sort(byNewestFirst);
};

const rewrite = async (rows) => {
  await withTransaction(BACKUPS_STORE, (store) => rows.forEach((row) => store.put(row)));
  return rows.length;
};

export const backupStore = {
  async list(userId) {
    return Promise.all((await rowsOf(userId)).map(toPublic));
  },

  async latest(userId) {
    const [first] = await rowsOf(userId);
    return first ? toPublic(first) : null;
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
    const stored = await toStoredRow(row);
    await withTransaction(BACKUPS_STORE, (store) => store.add(stored));
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

  // ── Migraciones de cifrado (v4.0 C3) ─────────────────────────────────────

  async encryptAll(key) {
    const rows = (await getAllFromStore(BACKUPS_STORE)).filter((row) => !row.enc);
    if (rows.length === 0) return 0;
    return rewrite(
      await Promise.all(
        rows.map(async (row) => ({
          // Sin `payload`: la copia en claro se descarta al cifrar.
          id: row.id,
          user_id: row.user_id,
          created_at: row.created_at,
          version: row.version,
          count: row.count,
          enc: await encryptValue(key, row.payload),
        }))
      )
    );
  },

  async decryptAll(key) {
    const rows = (await getAllFromStore(BACKUPS_STORE)).filter((row) => row.enc);
    if (rows.length === 0) return 0;
    return rewrite(
      await Promise.all(
        rows.map(async (row) => {
          const payload = await decryptValue(key, row.enc);
          return {
            id: row.id,
            user_id: row.user_id,
            created_at: row.created_at,
            version: row.version,
            count: row.count,
            payload,
          };
        })
      )
    );
  },

  async reencryptAll(oldKey, newKey) {
    const rows = await getAllFromStore(BACKUPS_STORE);
    return rewrite(
      await Promise.all(
        rows.map(async (row) => {
          const payload = row.enc ? await decryptValue(oldKey, row.enc) : row.payload;
          return {
            id: row.id,
            user_id: row.user_id,
            created_at: row.created_at,
            version: row.version,
            count: row.count,
            enc: await encryptValue(newKey, payload),
          };
        })
      )
    );
  },
};

export default backupStore;