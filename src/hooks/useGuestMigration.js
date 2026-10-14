import { useCallback, useEffect, useState } from 'react';
import { localStore, supabaseStore, normalizeRow } from '../lib/activityStore';
import {
  localStore as examStore,
  supabaseStore as examSupabaseStore,
  normalizeRow as normalizeExamRow,
} from '../lib/examStore';
import {
  localDecks,
  localCards,
  supabaseDecks,
  supabaseCards,
  normalizeCardRow,
  normalizeDeckRow,
} from '../lib/flashcardStore';
import { guestFlags } from './useSession';

/** Recuento vacío: lo que devuelven `run` y `done` cuando no se mueve nada. */
const EMPTY_RESULT = { count: 0, examCount: 0, deckCount: 0, cardCount: 0 };

/**
 * Oferta de migración entre los datos locales (invitado, IndexedDB) y la cuenta.
 *
 * Se evalúa una sola vez por sesión (flag `jikan.guest.answered`) y solo hay dos
 * direcciones posibles. Desde v5.0 D3 cada dirección mueve **tres** entidades: el
 * horario, el calendario de exámenes y las flashcards (mazos con sus cartas),
 * con un único modal y una única decisión para el usuario:
 *
 *   'upload' → hay N actividades y/o M exámenes y/o K mazos locales y una sesión
 *               real → subirlos a la cuenta (append, nunca sobrescribe).
 *   'import' → el usuario entró como invitado en este dispositivo, los stores
 *               locales están vacíos y su cuenta tiene datos → copiar una copia
 *               local (la cuenta no se toca).
 *
 * `count` cuenta actividades, `examCount` exámenes, `deckCount` mazos y
 * `cardCount` cartas, en el prompt y en el `done` final, para que la UI pueda
 * nombrarlos por separado.
 *
 * La flashcards es la única entidad que hay que **remapear**: el `deck_id` de
 * cada carta lo genera el store de destino, así que los mazos se insertan uno a
 * uno (el `id` que devuelve la inserción es fiable; el orden de retorno de
 * `insertMany` en Postgres no lo es) y se guarda el mapa `deckAntiguo → deckNuevo`
 * para colgarle después sus cartas. Mismo criterio que `useFlashcards.appendDecks`.
 *
 * `null` = no hay nada que ofrecer (o ya se respondió y se marcó
 * `jikan.guest.answered`).
 */
export function useGuestMigration(user, isGuest) {
  // { mode: 'upload' | 'import', count: number, examCount: number,
  //   deckCount: number, cardCount: number }
  const [prompt, setPrompt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { mode, …EMPTY_RESULT } al terminar bien

  const evaluate = useCallback(async () => {
    if (isGuest || !user) {
      setPrompt(null);
      return;
    }
    if (guestFlags.isAnswered()) {
      setPrompt(null);
      return;
    }

    try {
      const localCount = await localStore.count();
      const examCount = await examStore.count();
      const deckCount = await localDecks.count();
      const cardCount = await localCards.count();

      if (localCount + examCount + deckCount > 0) {
        setPrompt({ mode: 'upload', count: localCount, examCount, deckCount, cardCount });
        return;
      }

      // Stores locales vacíos: solo tiene sentido ofrecer la importación si el
      // usuario pasó por el modo invitado en este dispositivo.
      if (guestFlags.wasGuest()) {
        const remoteRows = await supabaseStore.list();
        const remoteExams = await examSupabaseStore.list();
        const remoteDecks = await supabaseDecks.list();
        const remoteCards = await supabaseCards.list();
        if (remoteRows.length > 0 || remoteExams.length > 0 || remoteDecks.length > 0) {
          setPrompt({
            mode: 'import',
            count: remoteRows.length,
            examCount: remoteExams.length,
            deckCount: remoteDecks.length,
            cardCount: remoteCards.length,
          });
          return;
        }
      }

      setPrompt(null);
    } catch (error) {
      console.error('Error evaluating guest migration:', error);
      setPrompt(null);
    }
  }, [isGuest, user]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  /**
   * Ejecuta la acción elegida.
   *
   * @param {'upload' | 'import' | 'discard'} mode
   * @returns {Promise<{count:number, examCount:number, deckCount:number,
   *   cardCount:number}>} cuántas actividades, exámenes, mazos y cartas se han
   *   movido (todo a 0 al descartar). Lo usan los alerts de `MainShell`, que
   *   nombran las entidades por separado.
   */
  const run = useCallback(
    async (mode) => {
      if (!user) return EMPTY_RESULT;
      setBusy(true);
      try {
        if (mode === 'upload') {
          const localRows = await localStore.list();
          const payload = localRows.map((row) =>
            normalizeRow({ ...row, user_id: user.id, id: undefined })
          );
          await supabaseStore.insertMany(payload);

          // Los exámenes viajan con la misma decisión: el `id` lo pone el store
          // remoto y el `user_id` pasa a ser el de la cuenta (RLS).
          const localExams = await examStore.list();
          const examPayload = localExams.map((row) =>
            normalizeExamRow({ ...row, user_id: user.id, id: undefined })
          );
          await examSupabaseStore.insertMany(examPayload);

          // Mazos y cartas: hay que reconstruir el `deck_id`, porque Supabase
          // genera ids nuevos. Se inserta mazo a mazo para poder guardar el mapa
          // `id antiguo → id nuevo` (el orden de retorno de `insertMany` en
          // Postgres no está garantizado, el id de una inserción sí), y las
          // cartas se cuelgan del mazo recién creado.
          const localDeckRows = await localDecks.list();
          const deckIdMap = new Map();
          for (const deck of localDeckRows) {
            const created = await supabaseDecks.create(
              normalizeDeckRow({ ...deck, user_id: user.id, id: undefined })
            );
            if (created?.id) deckIdMap.set(deck.id, created.id);
          }

          const localCardRows = await localCards.list();
          const cardGroups = new Map();
          deckIdMap.forEach((newDeckId) => cardGroups.set(newDeckId, []));
          localCardRows.forEach((row) => {
            const group = cardGroups.get(deckIdMap.get(row?.deck_id));
            // Sin mazo destino la carta no tiene dónde colgar: se descarta.
            if (!group) return;
            group.push(
              normalizeCardRow({
                ...row,
                deck_id: deckIdMap.get(row.deck_id),
                user_id: user.id,
                id: undefined,
              })
            );
          });

          // Un `insertMany` por mazo: el store recorta a `MAX_CARDS_PER_DECK`
          // por llamada, así que mandar todas las cartas de una vez perdería
          // las que quedaran por encima del corte.
          let movedCards = 0;
          for (const group of cardGroups.values()) {
            if (group.length === 0) continue;
            const inserted = await supabaseCards.insertMany(group);
            movedCards += inserted?.length ?? 0;
          }

          await localStore.clear();
          await examStore.clear();
          await localDecks.clear();
          await localCards.clear();
          guestFlags.clear();
          const result = {
            count: localRows.length,
            examCount: localExams.length,
            deckCount: deckIdMap.size,
            cardCount: movedCards,
          };
          setPrompt(null);
          setDone({ mode, ...result });
          return result;
        }

        if (mode === 'import') {
          const remoteRows = await supabaseStore.list();
          const payload = remoteRows.map((row) =>
            normalizeRow({ ...row, user_id: null, id: undefined })
          );
          await localStore.insertMany(payload);

          const remoteExams = await examSupabaseStore.list();
          const examPayload = remoteExams.map((row) =>
            normalizeExamRow({ ...row, user_id: null, id: undefined })
          );
          await examStore.insertMany(examPayload);

          // Mismo remapeo en sentido contrario: cada mazo se crea en local y sus
          // cartas se cuelgan del id nuevo (un viaje por mazo, como en
          // `useFlashcards.appendDecks`).
          const remoteDecks = await supabaseDecks.list();
          const remoteCards = await supabaseCards.list();
          const deckIdMap = new Map();
          const cardGroups = new Map();
          for (const deck of remoteDecks) {
            const created = await localDecks.create(
              normalizeDeckRow({ ...deck, user_id: null, id: undefined })
            );
            if (!created?.id) continue;
            deckIdMap.set(deck.id, created.id);
            cardGroups.set(created.id, []);
          }
          remoteCards.forEach((card) => {
            const group = cardGroups.get(deckIdMap.get(card?.deck_id));
            if (!group) return;
            group.push(
              normalizeCardRow({
                ...card,
                deck_id: deckIdMap.get(card.deck_id),
                user_id: null,
                id: undefined,
              })
            );
          });

          let movedCards = 0;
          for (const group of cardGroups.values()) {
            if (group.length === 0) continue;
            const inserted = await localCards.insertMany(group);
            movedCards += inserted?.length ?? 0;
          }

          guestFlags.markAnswered();
          const result = {
            count: remoteRows.length,
            examCount: remoteExams.length,
            deckCount: deckIdMap.size,
            cardCount: movedCards,
          };
          setPrompt(null);
          setDone({ mode, ...result });
          return result;
        }

        // 'discard': se borra lo local de las tres entidades y no se toca la
        // cuenta. Mazos antes que cartas, por si la cascada fallara.
        await localStore.clear();
        await examStore.clear();
        await localDecks.clear();
        await localCards.clear();
        guestFlags.clear();
        setPrompt(null);
        setDone({ mode, ...EMPTY_RESULT });
        return EMPTY_RESULT;
      } finally {
        setBusy(false);
      }
    },
    [user]
  );

  /**
   * Cierra la oferta sin migrar. Se marca como respondida (`jikan.guest.answered`)
   * para no volver a preguntar en esta sesión ni en la siguiente.
   */
  const dismiss = useCallback(() => {
    guestFlags.markAnswered();
    setPrompt(null);
  }, []);

  return { prompt, busy, done, run, dismiss, evaluate };
}

export default useGuestMigration;