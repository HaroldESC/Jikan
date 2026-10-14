import { useCallback, useEffect, useMemo, useState } from 'react';
import { GUEST_USER_ID } from '../lib/activityStore';
import { getCardStore, getDeckStore } from '../lib/flashcardStore';
import {
  MAX_CARDS_PER_DECK,
  isCardDue,
  pickReviewCards,
  sanitizeCard,
  sanitizeDeck,
  scheduleCard,
} from '../utils/flashcards';

/**
 * Fuente única de verdad de las flashcards (mazos y cartas).
 *
 * Clon estructural de `useExams`: elige los stores según la sesión
 * (`localDecks`/`localCards` con IndexedDB si `isGuest`,
 * `supabaseDecks`/`supabaseCards` si hay cuenta) y centraliza TODO el CRUD.
 *
 * Mazos y cartas viven en **un solo hook** porque comparten usuario, stores,
 * gate de privacidad y recarga: separarlas obligaría a duplicar las dos
 * puertas de escritura y a mantener sincronizadas dos listas que además están
 * unidas por `deck_id`.
 *
 * @param {object} user
 * @param {object} [options]
 * @param {boolean} [options.isGuest]
 * @param {{cardBacks?: boolean}} [options.privacy]
 *   Modo privado (v5.0 D3): con la categoría apagada el reverso no se escribe,
 *   así que nunca se guarda ni se sincroniza. El anverso sí se guarda siempre
 *   (es el "título" de la carta, como el `title` de una actividad).
 */
export function useFlashcards(user, { isGuest = false, privacy } = {}) {
  const store = useMemo(
    () => ({ decks: getDeckStore(isGuest), cards: getCardStore(isGuest) }),
    [isGuest]
  );

  const userId = user?.id ?? GUEST_USER_ID;
  const [decks, setDecks] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Normalización también en lectura: la fila puede venir de un backup, de
      // una migración o de Postgres (donde `due` llega como texto). Se
      // preservan `id`, `user_id`, `deck_id` y `created_at`.
      const [deckRows, cardRows] = await Promise.all([store.decks.list(), store.cards.list()]);
      setDecks(
        deckRows.map((row) => {
          const deck = sanitizeDeck(row);
          return deck ? { ...row, ...deck } : row;
        })
      );
      setCards(
        cardRows.map((row) => {
          const card = sanitizeCard(row);
          return card ? { ...row, ...card } : row;
        })
      );
    } catch (error) {
      console.error('Error loading flashcards:', error);
      setDecks([]);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    reload();
  }, [reload, userId]);

  /**
   * Normaliza el payload de un mazo a partir del editor.
   * `null` si la fila no es válida (título vacío).
   */
  const toDeckPayload = useCallback(
    (deck) => {
      const sanitized = sanitizeDeck(deck);
      if (!sanitized) return null;
      return { ...sanitized, user_id: userId };
    },
    [userId]
  );

  /**
   * Normaliza el payload de una carta a partir del editor. Es el **único**
   * punto por el que se escriben cartas (editor, importación y repaso), así
   * que la privacidad se aplica una sola vez y en un solo sitio.
   *
   * `null` si falta el anverso o el reverso.
   */
  const toCardPayload = useCallback(
    (card) => {
      const sanitized = sanitizeCard(card);
      if (!sanitized) return null;
      return {
        ...sanitized,
        deck_id: card?.deck_id ?? null,
        // Modo privado: si la categoría está apagada, el reverso no se escribe.
        back: privacy?.cardBacks ? (sanitized.back ?? '') : '',
        user_id: userId,
      };
    },
    [privacy?.cardBacks, userId]
  );

  // ── Mazos ──────────────────────────────────────────────────────────────────

  /** Crea un mazo nuevo y recarga. Devuelve la fila creada. */
  const createDeck = useCallback(
    async (deck) => {
      const payload = toDeckPayload(deck);
      if (!payload) throw new Error('Mazo inválido: falta el título');
      const created = await store.decks.create(payload);
      await reload();
      return created;
    },
    [reload, store, toDeckPayload]
  );

  /** Actualiza un mazo existente y recarga. */
  const updateDeck = useCallback(
    async (id, deck) => {
      const payload = toDeckPayload(deck);
      if (!payload) throw new Error('Mazo inválido: falta el título');
      const updated = await store.decks.update(id, payload);
      await reload();
      return updated;
    },
    [reload, store, toDeckPayload]
  );

  /** Crea o actualiza según exista `original.id`. */
  const saveDeck = useCallback(
    async (original, updated) => {
      if (original?.id) return updateDeck(original.id, updated);
      return createDeck(updated);
    },
    [createDeck, updateDeck]
  );

  /**
   * Borra un mazo y sus cartas. No quedan tarjetas huérfanas: en Supabase lo
   * resuelve el FK (`on delete cascade`) y en local el store las borra en la
   * misma transacción. El `exam_id` del mazo era solo informativo (no altera la
   * fila del examen).
   */
  const deleteDeck = useCallback(
    async (id) => {
      await store.decks.remove(id);
      await reload();
    },
    [reload, store]
  );

  // ── Cartas ─────────────────────────────────────────────────────────────────

  /** Crea una carta nueva y recarga. Devuelve la fila creada. */
  const createCard = useCallback(
    async (card) => {
      const payload = toCardPayload(card);
      if (!payload) throw new Error('Carta inválida: faltan el anverso o el reverso');
      const created = await store.cards.create(payload);
      await reload();
      return created;
    },
    [reload, store, toCardPayload]
  );

  /** Actualiza una carta existente y recarga. */
  const updateCard = useCallback(
    async (id, card) => {
      const payload = toCardPayload(card);
      if (!payload) throw new Error('Carta inválida: faltan el anverso o el reverso');
      const updated = await store.cards.update(id, payload);
      await reload();
      return updated;
    },
    [reload, store, toCardPayload]
  );

  /** Crea o actualiza según exista `original.id`. */
  const saveCard = useCallback(
    async (original, updated) => {
      if (original?.id) return updateCard(original.id, updated);
      return createCard(updated);
    },
    [createCard, updateCard]
  );

  /** Borra una carta y recarga. */
  const deleteCard = useCallback(
    async (id) => {
      await store.cards.remove(id);
      await reload();
    },
    [reload, store]
  );

  // ── Derivados de lectura ───────────────────────────────────────────────────

  /** `{ [deck_id]: Card[] }`, calculado una vez por cambio de `cards`. */
  const cardsByDeck = useMemo(() => {
    const grouped = {};
    for (const card of cards) {
      const key = card?.deck_id;
      if (!key) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(card);
    }
    return grouped;
  }, [cards]);

  /** Cartas de un mazo (array vacío si no existe). */
  const cardsFor = useCallback((deckId) => cardsByDeck[deckId] ?? [], [cardsByDeck]);

  /** Cuántas cartas toca repasar. Sin `deckId`, cuenta todas. */
  const dueCount = useCallback(
    (deckId) => {
      const list = deckId ? cardsByDeck[deckId] ?? [] : cards;
      return list.filter((card) => isCardDue(card)).length;
    },
    [cards, cardsByDeck]
  );

  /**
   * Tanda de repaso de un mazo (o de todos, sin `deckId`): vencidas, luego
   * nuevas, luego el resto. Ver `pickReviewCards`.
   */
  const pickFor = useCallback(
    (deckId, options) => pickReviewCards(deckId ? cardsByDeck[deckId] ?? [] : cards, options),
    [cards, cardsByDeck]
  );

  // ── Acciones ───────────────────────────────────────────────────────────────

  /**
   * Importación anidada de mazos con sus cartas (backup, snapshots, nube,
   * migración invitado → cuenta). Bucle por mazo: se crea el mazo y se cuelgan
   * sus cartas del id recién creado, así que no hace falta confiar en el orden
   * de retorno de `insertMany` (Postgres no lo garantiza).
   *
   * Son dos viajes por mazo; a cambio los ids locales y los de la nube quedan
   * coherentes sin remapear nada. Los mazos y cartas inválidos se descartan en
   * silencio y cada mazo se recorta a `MAX_CARDS_PER_DECK` cartas.
   *
   * @param {Array<{title: string, exam_id?: string, cards?: Array}>} nested
   * @returns {Promise<Array<{id: string, cards: Array}>>} lo creado
   */
  const appendDecks = useCallback(
    async (nested = []) => {
      const list = Array.isArray(nested) ? nested : [];
      const created = [];

      for (const item of list) {
        const deckPayload = toDeckPayload(item);
        if (!deckPayload) continue;
        const deck = await store.decks.create(deckPayload);
        const deckId = deck?.id;
        if (!deckId) continue;

        // El modo privado también aplica a lo importado: no se escribe lo apagado.
        const payloads = (Array.isArray(item?.cards) ? item.cards : [])
          .slice(0, MAX_CARDS_PER_DECK)
          .map((card) => toCardPayload({ ...card, deck_id: deckId }))
          .filter(Boolean);

        const inserted = payloads.length === 0 ? [] : await store.cards.insertMany(payloads);
        created.push({ ...deck, cards: inserted });
      }

      await reload();
      return created;
    },
    [reload, store, toCardPayload, toDeckPayload]
  );

  /**
   * Aplica un grado de repaso (`'again'` | `'good'`) a la carta, guarda el
   * estado nuevo que devuelve `scheduleCard` y recarga.
   *
   * Pasa por `toCardPayload`, así que la puerta de privacidad también se
   * respeta aquí: en modo privado el reverso se queda vacío (si ya lo estaba, no
   * cambia nada).
   *
   * @param {object} card
   * @param {'again'|'good'} grade
   * @returns {Promise<object>} la carta actualizada
   */
  const gradeCard = useCallback(
    async (card, grade) => {
      if (!card?.id) throw new Error('Carta inválida: falta el id');
      const next = scheduleCard(card, grade);
      const payload = toCardPayload({ ...card, ...next });
      if (!payload) throw new Error('Carta inválida: faltan el anverso o el reverso');
      const updated = await store.cards.update(card.id, payload);
      await reload();
      return updated;
    },
    [reload, store, toCardPayload]
  );

  return {
    // Datos (migración invitado <-> cuenta) y stores activos
    decks,
    cards,
    cardsByDeck,
    loading,
    reload,
    store,
    // CRUD de mazos
    createDeck,
    updateDeck,
    saveDeck,
    deleteDeck,
    // CRUD de cartas
    createCard,
    updateCard,
    saveCard,
    deleteCard,
    // Append de mazos con sus cartas anidadas (backup/migración)
    appendDecks,
    // Derivados de lectura y repaso
    cardsFor,
    dueCount,
    pickFor,
    gradeCard,
  };
}