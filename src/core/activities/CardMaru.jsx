/**
 * ActivityCard Component
 * 
 * Tarjeta que muestra la actividad actual del día.
 */

import { Calendar, Clock } from 'lucide-react';

// Función para formatear horas decimales a string legible
const formatHour = (decimalHour) => {
  const hours = Math.floor(decimalHour);
  const minutes = Math.round((decimalHour - hours) * 60);
  
  // Manejar caso donde minutos son 60 (por redondeo)
  let adjustedHour = hours;
  let adjustedMinutes = minutes;
  
  if (minutes === 60) {
    adjustedHour = hours + 1;
    adjustedMinutes = 0;
  }
  
  // Manejar caso donde la hora es 24 (medianoche)
  if (adjustedHour === 24) {
    adjustedHour = 0;
  }
  
  return `${adjustedHour.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
};

// Función para formatear duración
const formatDuration = (decimalHours) => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

const CardMaru = ({ activity, currentDay, currentTime, label = "ACTIVIDAD ACTUAL" }) => {
  if (!activity) return null;

  // Usar title en lugar de activity para el nombre
  const activityName = activity.title || activity.activity || 'Actividad sin nombre';
  const activityDescription = activity.description || '';
  
  // Formatear horas para mostrar
  const formattedStart = formatHour(activity.start);
  const formattedEnd = formatHour(activity.end);
  
  // Calcular duración
  const durationHours = activity.end - activity.start;
  
  // Calcular progreso de la actividad actual
  const calculateProgress = () => {
    if (!currentTime) return 0;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    
    // Verificar si estamos dentro del horario de la actividad
    if (currentTimeDecimal < activity.start) return 0;
    if (currentTimeDecimal >= activity.end) return 100;
    
    // Calcular progreso porcentual
    const elapsed = currentTimeDecimal - activity.start;
    const totalDuration = activity.end - activity.start;
    return Math.min(Math.round((elapsed / totalDuration) * 100), 100);
  };

  // Calcular tiempo restante si es la actividad actual
  const getTimeRemaining = () => {
    if (!currentTime) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    
    if (currentTimeDecimal >= activity.start && currentTimeDecimal < activity.end) {
      const timeRemaining = activity.end - currentTimeDecimal;
      const remainingHour = Math.floor(timeRemaining);
      const remainingMinutes = Math.round((timeRemaining - remainingHour) * 60);
      
      if (remainingHour > 0 && remainingMinutes > 0) {
        return `${remainingHour}h ${remainingMinutes}m restantes`;
      } else if (remainingHour > 0) {
        return `${remainingHour}h restantes`;
      } else if (remainingMinutes > 0) {
        return `${remainingMinutes}m restantes`;
      } else {
        return 'Finalizando pronto';
      }
    }
    return null;
  };

  const progress = calculateProgress();
  const timeRemaining = getTimeRemaining();

  // Determinar si es la actividad actual basándose en la hora
  const isCurrentActivity = () => {
    if (!currentTime) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    
    return currentTimeDecimal >= activity.start && currentTimeDecimal < activity.end;
  };

  // Si no es la actividad actual y la etiqueta es "ACTIVIDAD ACTUAL", no mostrar
  if (label === "ACTIVIDAD ACTUAL" && !isCurrentActivity()) {
    return null;
  }

  return (
    <div className="activity-card bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white overflow-hidden relative">
      {/* Banda de color lateral */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-2"
        style={{ backgroundColor: activity.color }}
      />
      
      {/* Encabezado */}
      <div className="flex items-center gap-2 mb-4 ml-2">
        <Calendar size={18} className="opacity-80" />
        <span className="text-sm font-semibold tracking-wide opacity-80">
          {label}
        </span>
      </div>

      {/* Nombre de la actividad */}
      <h2 className="activity-card__name text-xl font-bold mb-3 ml-2">
        {activityName}
      </h2>

      {/* Descripción */}
      {activityDescription && (
        <p className="activity-card__description text-white/80 text-sm mb-4 ml-2 leading-relaxed">
          {activityDescription}
        </p>
      )}

      {/* Información de tiempo */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm opacity-75 mb-1">
            <Clock size={14} />
            <span>Horario</span>
          </div>
          <div className="font-semibold text-lg">
            {formattedStart} - {formattedEnd}
          </div>
        </div>
        
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm opacity-75 mb-1">
            <Clock size={14} />
            <span>Duración</span>
          </div>
          <div className="font-semibold text-lg">
            {formatDuration(durationHours)}
          </div>
        </div>
      </div>

      {/* Barra de progreso para actividad actual */}
      {isCurrentActivity() && progress > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: activity.color,
                width: `${progress}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Tiempo restante */}
      {timeRemaining && (
        <div className="flex items-center gap-2 text-sm text-white/70 bg-white/10 rounded-lg p-3">
          <Clock size={14} />
          <span>{timeRemaining}</span>
        </div>
      )}

      {/* Día de la semana (solo si se proporciona) */}
      {currentDay && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-sm opacity-75">Programado para</div>
          <div className="font-semibold">{currentDay}</div>
        </div>
      )}
    </div>
  );
};

export default CardMaru;