import { useCallback, useEffect, useMemo, useState } from 'react';
import { getActivityStore, GUEST_USER_ID } from '../lib/activityStore';
import { timeToDecimal, decimalToTime } from '../utils/dates';

// Función para convertir decimal a string de hora legible
const decimalToDisplayTime = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);

  if (minutes === 0) return `${hours}h`;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Agrupa filas crudas del store en `{ [día]: Activity[] }`, ordenando por hora
 * de inicio y calculando los campos derivados (`start`, `end`, `startDisplay`…).
 */
export function groupActivitiesByDay(rows = []) {
  const grouped = {};
  DAYS_OF_WEEK.forEach((day) => {
    grouped[day] = [];
  });

  rows.forEach((a) => {
    if (!a.day_of_week) return;
    if (!grouped[a.day_of_week]) grouped[a.day_of_week] = [];

    const startDecimal = timeToDecimal(a.start_time);
    const endDecimal = timeToDecimal(a.end_time);

    grouped[a.day_of_week].push({
      id: a.id,
      start: startDecimal,
      end: endDecimal,
      startDisplay: decimalToDisplayTime(startDecimal),
      endDisplay: decimalToDisplayTime(endDecimal),
      startTime: a.start_time,
      endTime: a.end_time,
      title: a.title,
      description: a.description,
      notes: a.notes || '',
      color: a.color,
    });
  });

  Object.keys(grouped).forEach((day) => {
    grouped[day].sort((a, b) => a.start - b.start);
  });

  return grouped;
}

/**
 * Fuente única de verdad de las actividades.
 *
 * Elige el store según la sesión (`localStore` con IndexedDB si `isGuest`,
 * `supabaseStore` si hay cuenta) y centraliza TODO el CRUD: `MainShell` ya no
 * habla con Supabase directamente.
 *
 * @param {object} user
 * @param {object} [options]
 * @param {boolean} [options.isGuest]
 * @param {{notes?: boolean, description?: boolean}} [options.privacy]
 *   Modo privado (v4.0 C3): las categorías desactivadas se descartan al guardar,
 *   así que nunca se escriben ni se sincronizan.
 */
export function useActivities(user, { isGuest = false, privacy } = {}) {
  const store = useMemo(() => getActivityStore(isGuest), [isGuest]);

  const userId = user?.id ?? GUEST_USER_ID;
  const [rows, setRows] = useState([]);
  const [schedules, setSchedules] = useState(() => groupActivitiesByDay([]));
  const [loading, setLoading] = useState(true);

  const applyRows = useCallback((nextRows) => {
    setRows(nextRows);
    setSchedules(groupActivitiesByDay(nextRows));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      applyRows(await store.list());
    } catch (error) {
      console.error('Error loading activities:', error);
      applyRows([]);
    } finally {
      setLoading(false);
    }
  }, [applyRows, store]);

  useEffect(() => {
    reload();
  }, [reload, userId]);

  /** Normaliza el payload que espera el store a partir del editor de actividades. */
  const toPayload = useCallback(
    (day, activity) => ({
      day_of_week: day,
      start_time: decimalToTime(activity.start),
      end_time: decimalToTime(activity.end),
      title: activity.title ?? activity.activity ?? '',
      // Modo privado: si la categoría está apagada, el dato no se escribe.
      description: privacy?.description ? (activity.description ?? '') : '',
      notes: privacy?.notes ? (activity.notes ?? '') : '',
      color: activity.color ?? '#7c5cff',
      user_id: userId,
    }),
    [privacy?.description, privacy?.notes, userId]
  );

  /** Crea una actividad nueva y recarga. Devuelve la fila creada. */
  const createActivity = useCallback(
    async (day, activity) => {
      const created = await store.create(toPayload(day, activity));
      await reload();
      return created;
    },
    [reload, store, toPayload]
  );

  /** Actualiza una actividad existente y recarga. */
  const updateActivity = useCallback(
    async (id, day, activity) => {
      const updated = await store.update(id, toPayload(day, activity));
      await reload();
      return updated;
    },
    [reload, store, toPayload]
  );

  /** Crea o actualiza según exista `originalActivity.id`. */
  const saveActivity = useCallback(
    async (day, originalActivity, updatedActivity) => {
      if (originalActivity?.id) {
        return updateActivity(originalActivity.id, day, updatedActivity);
      }
      return createActivity(day, updatedActivity);
    },
    [createActivity, updateActivity]
  );

  const deleteActivity = useCallback(
    async (id) => {
      await store.remove(id);
      await reload();
    },
    [reload, store]
  );

  /** Sustituye todas las actividades de `targetDay` por las de `sourceDay`. */
  const copyDay = useCallback(
    async (sourceDay, targetDay) => {
      const items = (rows || []).filter((row) => row.day_of_week === sourceDay);
      const created = await store.replaceDay(
        targetDay,
        items.map((row) => toPayload(targetDay, { ...row, title: row.title }))
      );
      await reload();
      return created.length;
    },
    [reload, rows, store, toPayload]
  );

  /** Append de filas ya normalizadas (importación CSV/JSON, migración desde cuenta). */
  const appendRows = useCallback(
    async (payloads = []) => {
      if (payloads.length === 0) return [];
      // El modo privado también aplica a lo importado: no se escribe lo apagado.
      const sanitized = payloads.map((payload) => ({
        ...payload,
        description: privacy?.description ? (payload.description ?? '') : '',
        notes: privacy?.notes ? (payload.notes ?? '') : '',
      }));
      const created = await store.insertMany(sanitized);
      await reload();
      return created;
    },
    [privacy?.description, privacy?.notes, reload, store]
  );

  // Función para obtener actividades de un día específico
  const getDayActivities = (day) => {
    return schedules[day] || [];
  };

  // Función para obtener la actividad actual de un día
  const getCurrentActivity = (day) => {
    const now = new Date();
    const currentTime = now.getHours() + (now.getMinutes() / 60);
    const dayActivities = getDayActivities(day);

    return dayActivities.find(
      (activity) => currentTime >= activity.start && currentTime < activity.end
    );
  };

  // Función para calcular estadísticas de un día
  const getDayStats = (day) => {
    const dayActivities = getDayActivities(day);

    if (dayActivities.length === 0) {
      return {
        totalActivities: 0,
        totalHours: 0,
        startTime: null,
        endTime: null,
      };
    }

    const totalHours = dayActivities.reduce((sum, activity) => {
      return sum + (activity.end - activity.start);
    }, 0);

    const earliestStart = Math.min(...dayActivities.map((a) => a.start));
    const latestEnd = Math.max(...dayActivities.map((a) => a.end));

    return {
      totalActivities: dayActivities.length,
      totalHours: totalHours,
      startTime: earliestStart,
      endTime: latestEnd,
      productivityPercentage: Math.min(Math.round((totalHours / 16) * 100), 100), // 16 horas máximo de día productivo
    };
  };

  // Función para agregar una actividad temporalmente (para preview)
  const addTemporaryActivity = (day, activity) => {
    setSchedules((prev) => {
      const newSchedules = { ...prev };
      if (!newSchedules[day]) {
        newSchedules[day] = [];
      }

      const newActivity = {
        ...activity,
        id: `temp-${Date.now()}`, // ID temporal
      };

      // Insertar manteniendo el orden por hora de inicio
      const updatedDayActivities = [...newSchedules[day], newActivity].sort((a, b) => a.start - b.start);

      newSchedules[day] = updatedDayActivities;
      return newSchedules;
    });
  };

  // Función para eliminar una actividad temporalmente
  const removeTemporaryActivity = (day, activityId) => {
    setSchedules((prev) => {
      const newSchedules = { ...prev };
      if (!newSchedules[day]) return prev;

      newSchedules[day] = newSchedules[day].filter((a) => a.id !== activityId);
      return newSchedules;
    });
  };

  // Función para verificar superposición de horarios
  const checkOverlap = (day, newStart, newEnd, excludeId = null) => {
    const dayActivities = getDayActivities(day);

    return dayActivities.some((activity) => {
      if (excludeId && activity.id === excludeId) return false;

      // Verificar si hay superposición
      const overlaps =
        (newStart >= activity.start && newStart < activity.end) ||
        (newEnd > activity.start && newEnd <= activity.end) ||
        (newStart <= activity.start && newEnd >= activity.end);

      if (overlaps) {
        console.warn(
          `Superposición detectada: Nueva actividad (${newStart}-${newEnd}) se superpone con ${activity.title} (${activity.start}-${activity.end})`
        );
      }

      return overlaps;
    });
  };

  // Función para obtener el siguiente horario disponible
  const getNextAvailableSlot = (day, durationHours = 1) => {
    const dayActivities = getDayActivities(day);

    if (dayActivities.length === 0) {
      return { start: 9, end: 9 + durationHours }; // Hora predeterminada 9:00 AM
    }

    // Ordenar actividades por hora de fin
    const sortedActivities = [...dayActivities].sort((a, b) => a.end - b.end);

    // Buscar huecos entre actividades
    for (let i = 0; i < sortedActivities.length; i++) {
      const currentActivity = sortedActivities[i];
      const nextActivity = sortedActivities[i + 1];

      if (nextActivity) {
        const gap = nextActivity.start - currentActivity.end;
        if (gap >= durationHours) {
          return {
            start: currentActivity.end,
            end: currentActivity.end + durationHours,
          };
        }
      }
    }

    // Si no hay huecos, poner después de la última actividad
    const lastActivity = sortedActivities[sortedActivities.length - 1];
    return {
      start: lastActivity.end,
      end: lastActivity.end + durationHours,
    };
  };

  return {
    schedules,
    loading,
    reload,
    // CRUD (única vía de escritura, sea invitado o cuenta)
    createActivity,
    updateActivity,
    saveActivity,
    deleteActivity,
    copyDay,
    appendRows,
    // Datos crudos (migración invitado <-> cuenta) y store activo
    rows,
    store,
    getDayActivities,
    getCurrentActivity,
    getDayStats,
    addTemporaryActivity,
    removeTemporaryActivity,
    checkOverlap,
    getNextAvailableSlot,
    timeToDecimal, // Exportar función auxiliar
  };
}