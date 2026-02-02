/**
 * DetailView Component
 * 
 * Vista detallada de una actividad seleccionada con información
 * completa, descripción y notas personales.
 */

import { useState } from 'react';
import { ChevronLeft, Clock, Calendar, FileText, AlertCircle } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

// Función para convertir horas decimales a string legible
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

// Función para convertir decimal a minutos
const decimalToMinutes = (decimalHours) => {
  return Math.round(decimalHours * 60);
};

const DetailView = ({
  activity,
  day,
  bgColor,
  themeMode,
  onBack,
  onToggleTheme
}) => {
  const [notes, setNotes] = useState('');

  if (!activity) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgColor} p-6 transition-all duration-1000`}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition mb-4"
          >
            <ChevronLeft size={20} />
            Volver
          </button>
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-white text-center">
            <p>No hay actividad seleccionada</p>
          </div>
        </div>
      </div>
    );
  }

  // Usar title en lugar de activity para el nombre
  const activityName = activity.title || activity.activity || 'Actividad sin nombre';
  const activityDescription = activity.description || 'Sin descripción';
  const activityColor = activity.color || '#7c5cff';
  const isEmpty = activity.isEmpty || false;

  // Calcular duración en horas decimales
  const durationHours = activity.end - activity.start;
  
  // Convertir a minutos para estadísticas
  const startMinutes = decimalToMinutes(activity.start);
  const endMinutes = decimalToMinutes(activity.end);
  const durationMinutes = endMinutes - startMinutes;

  // Formatear horas para mostrar
  const formattedStart = formatHour(activity.start);
  const formattedEnd = formatHour(activity.end);

  // Calcular porcentaje del día
  const percentageOfDay = ((durationHours / 24) * 100).toFixed(1);

  // Calcular tiempo restante si la actividad está en curso
  const isCurrentActivity = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    
    return currentTimeDecimal >= activity.start && currentTimeDecimal < activity.end;
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    
    if (currentTimeDecimal < activity.start) {
      // Actividad futura
      const timeUntilStart = activity.start - currentTimeDecimal;
      const startHour = Math.floor(timeUntilStart);
      const startMinutes = Math.round((timeUntilStart - startHour) * 60);
      
      if (startHour > 0 && startMinutes > 0) {
        return `Comienza en ${startHour}h ${startMinutes}m`;
      } else if (startHour > 0) {
        return `Comienza en ${startHour}h`;
      } else {
        return `Comienza en ${startMinutes}m`;
      }
    } else if (currentTimeDecimal < activity.end) {
      // Actividad en curso
      const timeRemaining = activity.end - currentTimeDecimal;
      const remainingHour = Math.floor(timeRemaining);
      const remainingMinutes = Math.round((timeRemaining - remainingHour) * 60);
      
      if (remainingHour > 0 && remainingMinutes > 0) {
        return `Termina en ${remainingHour}h ${remainingMinutes}m`;
      } else if (remainingHour > 0) {
        return `Termina en ${remainingHour}h`;
      } else {
        return `Termina en ${remainingMinutes}m`;
      }
    }
    return null;
  };

  const timeRemainingText = getTimeRemaining();

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${bgColor} p-6 transition-all duration-1000`}
    >
      <div className="max-w-2xl mx-auto">

        {/* Barra superior */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition"
            aria-label="Volver a vista principal"
          >
            <ChevronLeft size={20} />
            Volver al horario
          </button>

          <ThemeToggle
            themeMode={themeMode}
            onToggle={onToggleTheme}
          />
        </div>

        {/* Contenido */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-white">

          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/20"
              style={{ backgroundColor: activityColor }}
            />

            <h2 className="text-3xl font-bold mb-2">
              {activityName}
            </h2>

            <p className="text-xl text-white/80 mb-2">
              {formattedStart} - {formattedEnd}
            </p>
            
            {timeRemainingText && (
              <p className="text-lg text-white/70 mb-4">
                {timeRemainingText}
              </p>
            )}

            {isEmpty && (
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm">
                <AlertCircle size={16} />
                Tiempo libre
              </div>
            )}
          </div>

          {/* Secciones */}
          <div className="space-y-6">

            <DetailBlock 
              title="Descripción" 
              icon={<FileText size={18} />}
            >
              <p className="text-white/90 leading-relaxed">
                {activityDescription}
              </p>
            </DetailBlock>

            <DetailBlock 
              title="Duración" 
              icon={<Clock size={18} />}
            >
              <div className="space-y-4">
                <div className="text-2xl font-bold">
                  {formatDuration(durationHours)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-sm opacity-75">Horas totales</div>
                    <div className="text-lg font-semibold">
                      {durationHours.toFixed(2)} h
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-sm opacity-75">Minutos totales</div>
                    <div className="text-lg font-semibold">
                      {durationMinutes} m
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-sm opacity-75">Porcentaje del día</div>
                    <div className="text-lg font-semibold">{percentageOfDay}%</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-sm opacity-75">Estado</div>
                    <div className="text-lg font-semibold">
                      {isCurrentActivity() ? 'En curso' : 'Programada'}
                    </div>
                  </div>
                </div>
              </div>
            </DetailBlock>

            <DetailBlock 
              title="Horarios exactos" 
              icon={<Clock size={18} />}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-sm opacity-75">Hora de inicio</div>
                  <div className="text-lg font-semibold">{formattedStart}</div>
                  <div className="text-xs opacity-60 mt-1">
                    {activity.start.toFixed(2)} horas
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-sm opacity-75">Hora de fin</div>
                  <div className="text-lg font-semibold">{formattedEnd}</div>
                  <div className="text-xs opacity-60 mt-1">
                    {activity.end.toFixed(2)} horas
                  </div>
                </div>
              </div>
            </DetailBlock>

            <DetailBlock 
              title="Día" 
              icon={<Calendar size={18} />}
            >
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <p className="text-xl font-semibold">{day}</p>
                <p className="text-sm opacity-75 mt-2">
                  Horario configurado para este día específico
                </p>
              </div>
            </DetailBlock>

            {/* Notas personales (opcional) */}
            <DetailBlock 
              title="Notas personales" 
              icon={<FileText size={18} />}
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Añade tus notas personales sobre esta actividad..."
                className="w-full bg-white/10 rounded-lg p-3 text-white placeholder-white/50 border border-white/20 focus:border-white/50 focus:outline-none resize-none"
                rows="3"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    // Aquí podrías guardar las notas
                    alert('Notas guardadas (función pendiente)');
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition text-sm"
                  disabled={!notes.trim()}
                >
                  Guardar notas
                </button>
              </div>
            </DetailBlock>

          </div>
        </div>
      </div>
    </div>
  );
};

const DetailBlock = ({ title, icon, children }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
      {icon && <span>{icon}</span>}
      {title}
    </h3>
    <div>
      {children}
    </div>
  </div>
);

export default DetailView;