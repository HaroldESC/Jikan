/**
 * flashcardStore — adaptador de persistencia de flashcards (mazos y cartas).
 *
 * Un **único módulo para las dos entidades**: los dos stores comparten forma
 * de sobre cifrado, helpers de cifrado y selectores de store, así que separarlos
 * solo repetiría los mismos ~100 renglones cuatro veces.
 *
 *   localDecks / localCards   → IndexedDB (modo invitado, sin cuenta). db
 *     `jikan`, stores `decks` y `cards` (ver `localDb.js`). Los ids los genera
 *     `crypto.randomUUID()` y la forma de fila es idéntica a la de Supabase.
 *   supabaseDecks / supabaseCards → tablas `decks` y `cards` (RLS por `user_id`).
 *
 * Interfaz común (todas las funciones son async y lanzan Error con `message`):
 *
 *   list()                          → Row[]
 *   create(payload)                 → Row
 *   update(id, payload)             → Row
 *   remove(id)                      → void
 *   insertMany(payloads)            → Row[]        (append; nunca sobrescribe)
 *   clear()                         → void         (vacía el store local)
 *   count()                         → number
 *   encryptAll/decryptAll/reencryptAll → number    (migraciones de cifrado)
 *
 * Además, solo en `cards`: `listByDeck(deckId)` → Row[].
 *
 * Formas de fila:
 *   Deck → { id, user_id, title, exam_id }
 *   Card → { id, user_id, deck_id, front, back, ease, interval, due, reps,
 *            last_review }
 * `due` es 'YYYY-MM-DD' o `null` (carta nunca repasada) y se compara siempre en
 * fecha local. La normalización vive en `sanitizeDeck` / `sanitizeCard`
 * (`src/utils/flashcards.js`), la única fuente de verdad.
 * `created_at` lo pone la base en Supabase y `createdStamp` en local: en ambos
 * casos solo se escribe al crear, nunca al editar.
 *
 * Relación `cards.deck_id → decks.id`: **obligatoria**. En Supabase la
 * resuelve el FK (`on delete cascade`), así que borrar un mazo borra sus cartas
 * y no hace falta nada más. IndexedDB no tiene integridad referencial, así que
 * `localDecks.remove()` hace la cascada a mano en una única transacción
 * (`withTransactionMany`).
 *
 * Con cifrado local activo (v4.0 C3) la fila **completa** se guarda cifrada en
 * un sobre `{ id, enc }`: del mazo no queda ni el título en claro y de la carta
 * ni el anverso. Eso deja el índice `deck_id` inservible (la fila solo tiene
 * `id` y `enc`), así que `listByDeck` y el borrado en cascada filtran en memoria,
 * igual que `activityStore.replaceDay` con `day_of_week`.
 * `encryptAll` / `decryptAll` / `reencryptAll` migran las filas al activar,
 * desactivar o cambiar la passphrase.
 */

import { supabase } from './supabase';
import {
  DEFAULT_EASE,
  MAX_CARDS_PER_DECK,
  sanitizeCard,
  sanitizeDeck,
} from '../utils/flashcards';
import {
  CARDS_STORE,
  DECKS_STORE,
  countFromStore,
  getAllFromStore,
  openDb,
  toPromise,
  withTransaction,
  withTransactionMany,
} from './localDb';
import { decryptValue, encryptValue, getSessionKey, isUnlocked } from './crypto';

// Reexportado para dar a las flashcards la misma superficie que `activityStore.js`.
// La constante vive allí: no se duplica.
export { GUEST_USER_ID } from './activityStore';

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de fila y de cifrado (comunes a los dos stores)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza una fila de mazo. Una fila inservible (sin título) deja `title: ''`
 * y no lanza: el store guarda lo que le den y quien llama decide si la descarta.
 */
export function normalizeDeckRow(row = {}) {
  const source = row && typeof row === 'object' ? row : {};
  const deck = sanitizeDeck(source) ?? {};
  return {
    user_id: source.user_id ?? null,
    title: deck.title ?? '',
    exam_id: deck.exam_id ?? null,
  };
}

/**
 * Marcador interno para normalizar una carta a la que le falta el reverso (p.
 * ej. en modo privado, donde el reverso se escribe vacío a propósito). Nunca
 * llega al disco: se descarta al final de `normalizeCardRow`.
 */
const BACK_PLACEHOLDER = '#';

/** Igual que `normalizeDeckRow` pero con el estado de repaso y el `deck_id`. */
export function normalizeCardRow(row = {}) {
  const source = row && typeof row === 'object' ? row : {};
  // `sanitizeCard` exige anverso **y** reverso, así que una carta con el
  // reverso vacío (privacidad apagada, o una a medio rellenar en el editor) se
  // normalizaría entera a campos vacíos y se perderían el anverso, el
  // `deck_id` y el estado de repaso. Se reintenta con un marcador en el
  // reverso: así solo se cae el reverso, que es justo lo que se quería ocultar.
  const sanitized = sanitizeCard(source);
  const card = sanitized ?? sanitizeCard({ ...source, back: BACK_PLACEHOLDER }) ?? {};
  return {
    user_id: source.user_id ?? null,
    deck_id: source.deck_id ?? null,
    front: card.front ?? '',
    back: sanitized ? card.back : '',
    ease: card.ease ?? DEFAULT_EASE,
    interval: card.interval ?? 0,
    due: card.due ?? null,
    reps: card.reps ?? 0,
    last_review: card.last_review ?? null,
  };
}

const newId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `card-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Sello de creación de las filas **locales**.
 *
 * En Postgres `created_at` es un `default now()` de la base y nunca se
 * reenvía: por eso no forma parte de `normalizeDeckRow`/`normalizeCardRow` (si
 * lo hiciera, una edición lo cambiaría). En local no hay base que lo ponga y sin
 * él el listado sale en el orden arbitrario de los uuid, así que se estampa al
 * crear y se conserva al actualizar, igual que en la nube.
 *
 * El sello es **monótono**: dos filas creadas en el mismo milisegundo (un
 * `insertMany` entero) siguen teniendo orden, como si fuera una secuencia.
 */
let lastStampMs = 0;
const createdStamp = (payload) => {
  if (payload?.created_at) return payload.created_at;
  const now = Date.now();
  lastStampMs = now > lastStampMs ? now : lastStampMs + 1;
  return new Date(lastStampMs).toISOString();
};

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

/** Todas las filas de un store, ya descifradas. */
async function readAll(storeName) {
  const rows = await getAllFromStore(storeName);
  return Promise.all(rows.map(fromStored));
}

/** Traduce la respuesta de supabase-js a `throw Error(message)`. */
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/**
 * Orden estable de lectura para el store local, que no tiene `ORDER BY`: por
 * `created_at` (el que estampa `createdStamp`) y, si la fila no lo trae (p. ej.
 * una importada a mano), por la clave de reserva indicada.
 */
function sortByCreation(rows, fallbackKey) {
  return [...rows].sort((a, b) => {
    const createdA = a.created_at ?? '';
    const createdB = b.created_at ?? '';
    if (createdA !== createdB) {
      if (createdA === '') return 1;
      if (createdB === '') return -1;
      return createdA < createdB ? -1 : 1;
    }
    const keyA = String(a[fallbackKey] ?? '');
    const keyB = String(b[fallbackKey] ?? '');
    if (keyA !== keyB) return keyA.localeCompare(keyB);
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mazos — IndexedDB (modo invitado)
// ─────────────────────────────────────────────────────────────────────────────

export const localDecks = {
  async list() {
    return sortByCreation(await readAll(DECKS_STORE), 'title');
  },

  async create(payload) {
    const row = { id: newId(), ...normalizeDeckRow(payload), created_at: createdStamp(payload) };
    const stored = await toStored(row);
    await withTransaction(DECKS_STORE, (store) => store.add(stored));
    return row;
  },

  async update(id, payload) {
    const existing = (await readAll(DECKS_STORE)).find((row) => row.id === id);
    if (!existing) throw new Error(`Mazo local no encontrado: ${id}`);
    const row = { ...existing, ...normalizeDeckRow(payload), id };
    const stored = await toStored(row);
    await withTransaction(DECKS_STORE, (store) => store.put(stored));
    return row;
  },

  /**
   * Borra el mazo **y sus cartas** en la misma transacción, para no dejar
   * tarjetas huérfanas (Supabase lo hace el FK `on delete cascade`).
   */
  async remove(id) {
    if (encryptedMode()) {
      // Sin índice por `deck_id` (todo va cifrado): se localiza en memoria.
      const doomed = (await readAll(CARDS_STORE))
        .filter((row) => row.deck_id === id)
        .map((row) => row.id);
      await withTransactionMany([DECKS_STORE, CARDS_STORE], (decks, cards) => {
        decks.delete(id);
        doomed.forEach((cardId) => cards.delete(cardId));
      });
      return;
    }

    // Con el store en claro el índice `deck_id` resuelve la cascada sin cargar
    // todas las cartas: cursor por el índice borrando sobre la marcha (el
    // criterio de `activityStore.replaceDay`).
    await withTransactionMany([DECKS_STORE, CARDS_STORE], (decks, cards) => {
      decks.delete(id);
      const request = cards.index('deck_id').openKeyCursor(IDBKeyRange.only(id));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cards.delete(cursor.primaryKey);
        cursor.continue();
      };
    });
  },

  async insertMany(payloads = []) {
    const rows = payloads.map((payload) => ({
      id: newId(),
      ...normalizeDeckRow(payload),
      created_at: createdStamp(payload),
    }));
    if (rows.length === 0) return [];
    const stored = await Promise.all(rows.map(toStored));
    await withTransaction(DECKS_STORE, (store) => stored.forEach((row) => store.add(row)));
    return rows;
  },

  async clear() {
    await withTransaction(DECKS_STORE, (store) => store.clear());
  },

  async count() {
    return countFromStore(DECKS_STORE);
  },

  // ── Migraciones de cifrado (v4.0 C3) ─────────────────────────────────────

  /** Cifra todas las filas que aún estén en claro. */
  async encryptAll(key) {
    return encryptStore(DECKS_STORE, key);
  },

  /** Devuelve todas las filas al almacenamiento en claro. */
  async decryptAll(key) {
    return decryptStore(DECKS_STORE, key);
  },

  /** Reescribe todas las filas con otra clave (cambio de passphrase). */
  async reencryptAll(oldKey, newKey) {
    return reencryptStore(DECKS_STORE, oldKey, newKey);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Mazos — Supabase (usuario con cuenta)
// ─────────────────────────────────────────────────────────────────────────────

export const supabaseDecks = {
  async list() {
    return unwrap(await supabase.from('decks').select('*').order('created_at')) ?? [];
  },

  async create(payload) {
    const rows = unwrap(await supabase.from('decks').insert([normalizeDeckRow(payload)]).select());
    return rows?.[0] ?? null;
  },

  async update(id, payload) {
    const rows = unwrap(
      await supabase.from('decks').update(normalizeDeckRow(payload)).eq('id', id).select()
    );
    return rows?.[0] ?? null;
  },

  async remove(id) {
    // Las cartas se van solas: `cards.deck_id` es `on delete cascade`.
    unwrap(await supabase.from('decks').delete().eq('id', id));
  },

  async insertMany(payloads = []) {
    if (payloads.length === 0) return [];
    const rows = unwrap(
      await supabase.from('decks').insert(payloads.map(normalizeDeckRow)).select()
    );
    return rows ?? [];
  },

  async clear() {
    // Nunca se llama en el store remoto: los datos de la cuenta se borran
    // explícitamente desde la app (o están protegidos por RLS).
    throw new Error('clear() no está disponible en el store de Supabase');
  },

  async count() {
    const { count, error } = await supabase
      .from('decks')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Cartas — IndexedDB (modo invitado)
// ─────────────────────────────────────────────────────────────────────────────

export const localCards = {
  async list() {
    return sortByCreation(await readAll(CARDS_STORE), 'id');
  },

  /** Cartas de un mazo, en orden de creación. */
  async listByDeck(deckId) {
    if (encryptedMode()) {
      // Sin índice por `deck_id` (todo va cifrado): se localiza en memoria,
      // igual que `activityStore.replaceDay` con `day_of_week`.
      return sortByCreation(
        (await readAll(CARDS_STORE)).filter((row) => row.deck_id === deckId),
        'id'
      );
    }

    const db = await openDb();
    const tx = db.transaction(CARDS_STORE, 'readonly');
    const rows =
      (await toPromise(
        tx.objectStore(CARDS_STORE).index('deck_id').getAll(IDBKeyRange.only(deckId))
      )) ?? [];
    return sortByCreation(rows, 'id');
  },

  async create(payload) {
    const row = { id: newId(), ...normalizeCardRow(payload), created_at: createdStamp(payload) };
    const stored = await toStored(row);
    await withTransaction(CARDS_STORE, (store) => store.add(stored));
    return row;
  },

  async update(id, payload) {
    const existing = (await readAll(CARDS_STORE)).find((row) => row.id === id);
    if (!existing) throw new Error(`Carta local no encontrada: ${id}`);
    const row = { ...existing, ...normalizeCardRow(payload), id };
    const stored = await toStored(row);
    await withTransaction(CARDS_STORE, (store) => store.put(stored));
    return row;
  },

  async remove(id) {
    await withTransaction(CARDS_STORE, (store) => store.delete(id));
  },

  async insertMany(payloads = []) {
    const rows = payloads
      .slice(0, MAX_CARDS_PER_DECK)
      .map((payload) => ({
        id: newId(),
        ...normalizeCardRow(payload),
        created_at: createdStamp(payload),
      }));
    if (rows.length === 0) return [];
    const stored = await Promise.all(rows.map(toStored));
    await withTransaction(CARDS_STORE, (store) => stored.forEach((row) => store.add(row)));
    return rows;
  },

  async clear() {
    await withTransaction(CARDS_STORE, (store) => store.clear());
  },

  async count() {
    return countFromStore(CARDS_STORE);
  },

  // ── Migraciones de cifrado (v4.0 C3) ─────────────────────────────────────

  async encryptAll(key) {
    return encryptStore(CARDS_STORE, key);
  },

  async decryptAll(key) {
    return decryptStore(CARDS_STORE, key);
  },

  async reencryptAll(oldKey, newKey) {
    return reencryptStore(CARDS_STORE, oldKey, newKey);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Cartas — Supabase (usuario con cuenta)
// ─────────────────────────────────────────────────────────────────────────────

export const supabaseCards = {
  /** Orden de repaso: `due` ascendente y las nuevas (`due` nulo) al final. */
  async list() {
    return (
      unwrap(await supabase.from('cards').select('*').order('due', { nullsFirst: false })) ?? []
    );
  },

  async listByDeck(deckId) {
    return (
      unwrap(
        await supabase
          .from('cards')
          .select('*')
          .eq('deck_id', deckId)
          .order('created_at')
      ) ?? []
    );
  },

  async create(payload) {
    const rows = unwrap(await supabase.from('cards').insert([normalizeCardRow(payload)]).select());
    return rows?.[0] ?? null;
  },

  async update(id, payload) {
    const rows = unwrap(
      await supabase.from('cards').update(normalizeCardRow(payload)).eq('id', id).select()
    );
    return rows?.[0] ?? null;
  },

  async remove(id) {
    unwrap(await supabase.from('cards').delete().eq('id', id));
  },

  async insertMany(payloads = []) {
    if (payloads.length === 0) return [];
    const rows = unwrap(
      await supabase
        .from('cards')
        .insert(payloads.slice(0, MAX_CARDS_PER_DECK).map(normalizeCardRow))
        .select()
    );
    return rows ?? [];
  },

  async clear() {
    // Nunca se llama en el store remoto: los datos de la cuenta se borran
    // explícitamente desde la app (o están protegidos por RLS).
    throw new Error('clear() no está disponible en el store de Supabase');
  },

  async count() {
    const { count, error } = await supabase
      .from('cards')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Migraciones de cifrado compartidas (los dos stores)
// ─────────────────────────────────────────────────────────────────────────────

/** Cifra las filas de un store que aún estén en claro. */
async function encryptStore(storeName, key) {
  const rows = await getAllFromStore(storeName);
  const pending = rows.filter((row) => !row.enc);
  if (pending.length === 0) return 0;
  const stored = await Promise.all(
    pending.map(async (row) => ({ id: row.id, enc: await encryptValue(key, row) }))
  );
  await withTransaction(storeName, (store) => stored.forEach((row) => store.put(row)));
  return pending.length;
}

/** Devuelve a claro las filas cifradas de un store. */
async function decryptStore(storeName, key) {
  const rows = await getAllFromStore(storeName);
  const encrypted = rows.filter((row) => row.enc);
  if (encrypted.length === 0) return 0;
  const plain = await Promise.all(
    encrypted.map(async (row) => ({ id: row.id, ...(await decryptValue(key, row.enc)) }))
  );
  await withTransaction(storeName, (store) => plain.forEach((row) => store.put(row)));
  return encrypted.length;
}

/** Reescribe todas las filas de un store con otra clave (cambio de passphrase). */
async function reencryptStore(storeName, oldKey, newKey) {
  const rows = await getAllFromStore(storeName);
  const stored = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      enc: await encryptValue(newKey, row.enc ? await decryptValue(oldKey, row.enc) : row),
    }))
  );
  await withTransaction(storeName, (store) => stored.forEach((row) => store.put(row)));
  return rows.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Selección de store
// ─────────────────────────────────────────────────────────────────────────────

/** Devuelve el store de mazos que corresponde a la sesión actual. */
export function getDeckStore(isGuest) {
  return isGuest ? localDecks : supabaseDecks;
}

/** Devuelve el store de cartas que corresponde a la sesión actual. */
export function getCardStore(isGuest) {
  return isGuest ? localCards : supabaseCards;
}