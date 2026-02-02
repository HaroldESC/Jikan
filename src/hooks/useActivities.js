import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Función auxiliar para convertir string "HH:MM" a decimal
const timeToDecimal = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + (minutes / 60);
};

// Función para convertir decimal a string de hora legible
const decimalToDisplayTime = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  
  if (minutes === 0) return `${hours}h`;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

export function useActivities(user) {
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('start_time');

      if (error) {
        console.error('Error loading activities:', error);
        setSchedules({});
        setLoading(false);
        return;
      }

      const grouped = {};
      
      // Inicializar todos los días con array vacío
      const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      daysOfWeek.forEach(day => {
        grouped[day] = [];
      });

      data?.forEach(a => {
        if (!grouped[a.day_of_week]) {
          grouped[a.day_of_week] = [];
        }

        // Convertir tiempos de string "HH:MM" a decimal
        const startDecimal = timeToDecimal(a.start_time);
        const endDecimal = timeToDecimal(a.end_time);

        grouped[a.day_of_week].push({
          id: a.id,
          start: startDecimal,
          end: endDecimal,
          startDisplay: decimalToDisplayTime(startDecimal),
          endDisplay: decimalToDisplayTime(endDecimal),
          startTime: a.start_time, // Mantener el string original para referencia
          endTime: a.end_time,     // Mantener el string original para referencia
          title: a.title,
          description: a.description,
          color: a.color,
        });
      });

      // Ordenar actividades por hora de inicio en cada día
      Object.keys(grouped).forEach(day => {
        grouped[day].sort((a, b) => a.start - b.start);
      });

      setSchedules(grouped);
    } catch (error) {
      console.error('Unexpected error:', error);
      setSchedules({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [user]);

  // Función para obtener actividades de un día específico
  const getDayActivities = (day) => {
    return schedules[day] || [];
  };

  // Función para obtener la actividad actual de un día
  const getCurrentActivity = (day) => {
    const now = new Date();
    const currentTime = now.getHours() + (now.getMinutes() / 60);
    const dayActivities = getDayActivities(day);
    
    return dayActivities.find(activity => 
      currentTime >= activity.start && currentTime < activity.end
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

    const earliestStart = Math.min(...dayActivities.map(a => a.start));
    const latestEnd = Math.max(...dayActivities.map(a => a.end));

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
    setSchedules(prev => {
      const newSchedules = { ...prev };
      if (!newSchedules[day]) {
        newSchedules[day] = [];
      }
      
      const newActivity = {
        ...activity,
        id: `temp-${Date.now()}`, // ID temporal
      };
      
      // Insertar manteniendo el orden por hora de inicio
      const updatedDayActivities = [...newSchedules[day], newActivity]
        .sort((a, b) => a.start - b.start);
      
      newSchedules[day] = updatedDayActivities;
      return newSchedules;
    });
  };

  // Función para eliminar una actividad temporalmente
  const removeTemporaryActivity = (day, activityId) => {
    setSchedules(prev => {
      const newSchedules = { ...prev };
      if (!newSchedules[day]) return prev;
      
      newSchedules[day] = newSchedules[day].filter(a => a.id !== activityId);
      return newSchedules;
    });
  };

  // Función para verificar superposición de horarios
  const checkOverlap = (day, newStart, newEnd, excludeId = null) => {
    const dayActivities = getDayActivities(day);
    
    return dayActivities.some(activity => {
      if (excludeId && activity.id === excludeId) return false;
      
      // Verificar si hay superposición
      const overlaps = (
        (newStart >= activity.start && newStart < activity.end) ||
        (newEnd > activity.start && newEnd <= activity.end) ||
        (newStart <= activity.start && newEnd >= activity.end)
      );
      
      if (overlaps) {
        console.warn(`Superposición detectada: Nueva actividad (${newStart}-${newEnd}) se superpone con ${activity.title} (${activity.start}-${activity.end})`);
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
            end: currentActivity.end + durationHours 
          };
        }
      }
    }
    
    // Si no hay huecos, poner después de la última actividad
    const lastActivity = sortedActivities[sortedActivities.length - 1];
    return { 
      start: lastActivity.end, 
      end: lastActivity.end + durationHours 
    };
  };

  return {
    schedules,
    loading,
    reload,
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