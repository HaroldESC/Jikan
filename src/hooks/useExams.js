import { useCallback, useEffect, useMemo, useState } from 'react';
import { GUEST_USER_ID } from '../lib/activityStore';
import { getExamStore } from '../lib/examStore';
import { daysUntilExam, examTimestamp, sanitizeExam, sortExams } from '../utils/exams';

/**
 * Fuente única de verdad del calendario de exámenes.
 *
 * Clon estructural de `useActivities`: elige el store según la sesión
 * (`localStore` con IndexedDB si `isGuest`, `supabaseStore` si hay cuenta) y
 * centraliza TODO el CRUD, de modo que `MainShell` no habla con Supabase
 * directamente.
 *
 * No hay dimensión `day_of_week`: los exámenes no se agrupan por día de la
 * semana, no existe `copyDay` ni adapter.
 *
 * @param {object} user
 * @param {object} [options]
 * @param {boolean} [options.isGuest]
 * @param {{examNotes?: boolean}} [options.privacy]
 *   Modo privado (v5.0 D2): las categorías desactivadas se descartan al guardar,
 *   así que nunca se escriben ni se sincronizan.
 */
export function useExams(user, { isGuest = false, privacy } = {}) {
  const store = useMemo(() => getExamStore(isGuest), [isGuest]);

  const userId = user?.id ?? GUEST_USER_ID;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Normalización también en lectura: Supabase devuelve `time` como
      // 'HH:MM:SS' y los `date` como texto; `sanitizeExam` deja las filas en
      // forma canónica sin tocar `id`, `user_id` ni `created_at`.
      const list = await store.list();
      setRows(
        list.map((row) => {
          const exam = sanitizeExam(row);
          return exam ? { ...row, ...exam } : row;
        })
      );
    } catch (error) {
      console.error('Error loading exams:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    reload();
  }, [reload, userId]);

  /**
   * Normaliza el payload que espera el store a partir del editor de exámenes.
   * `null` si la fila no es válida (asignatura vacía o fecha inválida).
   */
  const toPayload = useCallback(
    (exam) => {
      const sanitized = sanitizeExam(exam);
      if (!sanitized) return null;
      return {
        ...sanitized,
        // Modo privado: si la categoría está apagada, el dato no se escribe.
        notes: privacy?.examNotes ? (sanitized.notes ?? '') : '',
        user_id: userId,
      };
    },
    [privacy?.examNotes, userId]
  );

  /** Crea un examen nuevo y recarga. Devuelve la fila creada. */
  const createExam = useCallback(
    async (exam) => {
      const payload = toPayload(exam);
      if (!payload) throw new Error('Examen inválido: falta la asignatura o la fecha');
      const created = await store.create(payload);
      await reload();
      return created;
    },
    [reload, store, toPayload]
  );

  /** Actualiza un examen existente y recarga. */
  const updateExam = useCallback(
    async (id, exam) => {
      const payload = toPayload(exam);
      if (!payload) throw new Error('Examen inválido: falta la asignatura o la fecha');
      const updated = await store.update(id, payload);
      await reload();
      return updated;
    },
    [reload, store, toPayload]
  );

  /** Crea o actualiza según exista `original.id`. */
  const saveExam = useCallback(
    async (original, updated) => {
      if (original?.id) {
        return updateExam(original.id, updated);
      }
      return createExam(updated);
    },
    [createExam, updateExam]
  );

  /**
   * Borra un examen. Si estaba vinculado a una actividad, en Supabase lo
   * resuelve el FK (`on delete set null`) y en invitado el `activity_id` queda
   * colgado: el panel simplemente no muestra el vínculo.
   */
  const deleteExam = useCallback(
    async (id) => {
      await store.remove(id);
      await reload();
    },
    [reload, store]
  );

  /**
   * Append de filas crudas (importación JSON, snapshots, migración y nube).
   * Las filas inválidas se descartan en silencio: no rompen el append.
   */
  const appendExamRows = useCallback(
    async (payloads = []) => {
      const list = Array.isArray(payloads) ? payloads : [];
      // El modo privado también aplica a lo importado: no se escribe lo apagado.
      const sanitized = list.map((payload) => toPayload(payload)).filter((payload) => payload);
      if (sanitized.length === 0) return [];
      const created = await store.insertMany(sanitized);
      await reload();
      return created;
    },
    [reload, store, toPayload]
  );

  /** Filas crudas ordenadas: por fecha, luego hora (los `null` al final). */
  const sortedExams = useMemo(() => sortExams(rows), [rows]);

  /**
   * Primer examen que aún no ha pasado (hoy cuenta mientras no venza).
   * Sin `useMemo` a propósito: depende de la hora actual, no solo de las
   * filas, así que se recalcula en cada render.
   */
  const nextExam =
    sortedExams.find((exam) => {
      const moment = examTimestamp(exam.date, exam.time);
      return moment != null && moment.getTime() >= Date.now();
    }) ?? null;

  /** Días naturales hasta `exam` (0 = hoy, negativo = pasado). */
  const daysUntil = useCallback((exam) => (exam ? daysUntilExam(exam.date) : null), []);

  return {
    // Datos crudos (migración invitado <-> cuenta) y store activo
    rows,
    store,
    loading,
    reload,
    toPayload,
    // CRUD (única vía de escritura, sea invitado o cuenta)
    createExam,
    updateExam,
    saveExam,
    deleteExam,
    appendExamRows,
    // Derivados de lectura
    sortedExams,
    nextExam,
    daysUntil,
  };
}