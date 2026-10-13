import { useCallback, useEffect, useState } from 'react';
import { localStore, supabaseStore, normalizeRow } from '../lib/activityStore';
import {
  localStore as examStore,
  supabaseStore as examSupabaseStore,
  normalizeRow as normalizeExamRow,
} from '../lib/examStore';
import { guestFlags } from './useSession';

/**
 * Oferta de migración entre los datos locales (invitado, IndexedDB) y la cuenta.
 *
 * Se evalúa una sola vez por sesión (flag `jikan.guest.answered`) y solo hay dos
 * direcciones posibles. Desde v5.0 D2 cada dirección mueve **dos** entidades:
 * el horario y el calendario de exámenes, con un único modal y una única
 * decisión para el usuario:
 *
 *   'upload' → hay N actividades y/o M exámenes locales y una sesión real →
 *               subirlos a la cuenta (append, nunca sobrescribe).
 *   'import' → el usuario entró como invitado en este dispositivo, los stores
 *               locales están vacíos y su cuenta tiene datos → copiar una copia
 *               local (la cuenta no se toca).
 *
 * `count` cuenta actividades y `examCount` exámenes, en el prompt y en el
 * `done` final, para que la UI pueda nombrarlos por separado.
 *
 * `null` = no hay nada que ofrecer (o ya se respondió y se marcó
 * `jikan.guest.answered`).
 */
export function useGuestMigration(user, isGuest) {
  // { mode: 'upload' | 'import', count: number, examCount: number }
  const [prompt, setPrompt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { mode, count, examCount } al terminar bien

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

      if (localCount + examCount > 0) {
        setPrompt({ mode: 'upload', count: localCount, examCount });
        return;
      }

      // Stores locales vacíos: solo tiene sentido ofrecer la importación si el
      // usuario pasó por el modo invitado en este dispositivo.
      if (guestFlags.wasGuest()) {
        const remoteRows = await supabaseStore.list();
        const remoteExams = await examSupabaseStore.list();
        if (remoteRows.length > 0 || remoteExams.length > 0) {
          setPrompt({
            mode: 'import',
            count: remoteRows.length,
            examCount: remoteExams.length,
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
   * @returns {Promise<{count: number, examCount: number}>} cuántas actividades
   *   y cuántos exámenes se han movido (a 0 al descartar). Lo usan los alerts
   *   de `MainShell`, que nombran las dos entidades por separado.
   */
  const run = useCallback(
    async (mode) => {
      if (!user) return { count: 0, examCount: 0 };
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

          await localStore.clear();
          await examStore.clear();
          guestFlags.clear();
          setPrompt(null);
          setDone({ mode, count: localRows.length, examCount: localExams.length });
          return { count: localRows.length, examCount: localExams.length };
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

          guestFlags.markAnswered();
          setPrompt(null);
          setDone({ mode, count: remoteRows.length, examCount: remoteExams.length });
          return { count: remoteRows.length, examCount: remoteExams.length };
        }

        // 'discard': se borra lo local de las dos entidades y no se toca la cuenta.
        await localStore.clear();
        await examStore.clear();
        guestFlags.clear();
        setPrompt(null);
        setDone({ mode, count: 0, examCount: 0 });
        return { count: 0, examCount: 0 };
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