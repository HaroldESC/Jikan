import { useCallback, useEffect, useState } from 'react';
import { localStore, supabaseStore, normalizeRow } from '../lib/activityStore';
import { guestFlags } from './useSession';

/**
 * Oferta de migración entre el horario local (invitado, IndexedDB) y la cuenta.
 *
 * Se evalúa una sola vez por sesión y solo hay dos direcciones posibles:
 *
 *   'upload' → hay N actividades locales y una sesión real → subirlas a la
 *               cuenta (append, nunca sobrescribe).
 *   'import' → el usuario entró como invitado en este dispositivo, el store
 *               local está vacío y su cuenta tiene actividades → copiar una
 *               copia local (la cuenta no se toca).
 *
 * `null` = no hay nada que ofrecer (o ya se respondió y se marcó
 * `jikan.guest.answered`).
 */
export function useGuestMigration(user, isGuest) {
  const [prompt, setPrompt] = useState(null); // { mode: 'upload' | 'import', count: number }
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { mode, count } al terminar bien

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

      if (localCount > 0) {
        setPrompt({ mode: 'upload', count: localCount });
        return;
      }

      // Store local vacío: solo tiene sentido ofrecer la importación si el
      // usuario pasó por el modo invitado en este dispositivo.
      if (guestFlags.wasGuest()) {
        const remoteRows = await supabaseStore.list();
        if (remoteRows.length > 0) {
          setPrompt({ mode: 'import', count: remoteRows.length });
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
   * @param {'upload' | 'import' | 'discard'} mode
   * @returns {Promise<number>} número de actividades migradas (0 al descartar)
   */
  const run = useCallback(
    async (mode) => {
      if (!user) return 0;
      setBusy(true);
      try {
        if (mode === 'upload') {
          const localRows = await localStore.list();
          const payload = localRows.map((row) =>
            normalizeRow({ ...row, user_id: user.id, id: undefined })
          );
          await supabaseStore.insertMany(payload);
          await localStore.clear();
          guestFlags.clear();
          setPrompt(null);
          setDone({ mode, count: localRows.length });
          return localRows.length;
        }

        if (mode === 'import') {
          const remoteRows = await supabaseStore.list();
          const payload = remoteRows.map((row) =>
            normalizeRow({ ...row, user_id: null, id: undefined })
          );
          await localStore.insertMany(payload);
          guestFlags.markAnswered();
          setPrompt(null);
          setDone({ mode, count: remoteRows.length });
          return remoteRows.length;
        }

        // 'discard': se borra lo local y no se toca la cuenta.
        await localStore.clear();
        guestFlags.clear();
        setPrompt(null);
        setDone({ mode, count: 0 });
        return 0;
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