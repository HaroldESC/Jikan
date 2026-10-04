/**
 * Bootstrap de la base de datos local (IndexedDB) de Jikan.
 *
 * Una sola base (`jikan`) con varios object stores:
 *   - `activities` → filas del horario (modo invitado, ver `activityStore.js`)
 *   - `backups`    → snapshots versionados (ver `backupStore.js`)
 *
 * Todo es asíncrono: nada en el proyecto debe asumir sincronía para actividades
 * ni para backups.
 */

export const DB_NAME = 'jikan';
export const DB_VERSION = 2;
export const ACTIVITIES_STORE = 'activities';
export const BACKUPS_STORE = 'backups';

let dbPromise = null;

/**
 * Abre (o reutiliza) la conexión. Crea los object stores que falten al subir
 * de versión. Lanza si el navegador no soporta IndexedDB.
 */
export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error('IndexedDB no disponible en este navegador'));
        return;
      }
      const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ACTIVITIES_STORE)) {
          const store = db.createObjectStore(ACTIVITIES_STORE, { keyPath: 'id' });
          store.createIndex('day_of_week', 'day_of_week', { unique: false });
        }
        if (!db.objectStoreNames.contains(BACKUPS_STORE)) {
          const store = db.createObjectStore(BACKUPS_STORE, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      // Permite reintentar si el fallo fue transitorio (p. ej. base bloqueada).
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Envuelve una IDBRequest en una promesa. */
export const toPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Atajo: `getAll()` de un store en modo lectura. */
export async function getAllFromStore(storeName) {
  const db = await openDb();
  return (await toPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll())) ?? [];
}

/** Atajo: `count()` de un store en modo lectura. */
export async function countFromStore(storeName) {
  const db = await openDb();
  return toPromise(db.transaction(storeName, 'readonly').objectStore(storeName).count());
}

/**
 * Ejecuta `fn` dentro de una transacción de escritura y resuelve cuando la
 * transacción confirma (no cuando finishes de escribir: solo entonces los datos
 * están realmente en disco).
 *
 * @param {string} storeName
 * @param {(store: IDBObjectStore) => any} fn
 * @returns {Promise<any>} lo que devuelva `fn`, si no es una IDBRequest
 */
export async function withTransaction(storeName, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = fn(store);
    } catch (error) {
      tx.abort();
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(result instanceof IDBRequest ? undefined : result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
  });
}

/** Sólo para tests/herramientas: olvida la conexión cacheada. */
export function resetDbConnection() {
  dbPromise = null;
}