/**
 * CopyDayModal Component
 * 
 * Modal para copiar todas las actividades de un día a otro
 */

import { X, Copy } from 'lucide-react';
import { DAYS_OF_WEEK } from '../../utils/index';
import { useTranslation } from '../../i18n/useTranslation';

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

// Función para calcular el total de horas de actividades en un día
const calculateTotalHours = (activities) => {
  if (!activities || activities.length === 0) return 0;
  
  return activities.reduce((total, activity) => {
    return total + (activity.end - activity.start);
  }, 0);
};

const CopyDayModal = ({ 
  isOpen, 
  onClose, 
  currentDay, 
  schedules, 
  onCopyDay 
}) => {
  if (!isOpen) return null;

  const { t } = useTranslation();

  const handleCopy = (sourceDay) => {
    onCopyDay(sourceDay, currentDay);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-4xl w-full text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">{t('copyDay.title', { day: currentDay })}</h2>
            <p className="text-white/70 text-sm mt-1">
              {t('copyDay.description')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
            aria-label={t('common.close')}
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {DAYS_OF_WEEK.filter(day => day !== currentDay).map(day => {
            const activities = schedules[day] || [];
            const activityCount = activities.length;
            const totalHours = calculateTotalHours(activities);
            const formattedTotalHours = formatDuration(totalHours);
            
            return (
              <button
                key={day}
                onClick={() => handleCopy(day)}
                disabled={activityCount === 0}
                className={`
                  p-5 rounded-xl text-left transition group
                  ${activityCount === 0 
                    ? 'bg-white/5 opacity-50 cursor-not-allowed' 
                    : 'bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-lg block">{day}</span>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm opacity-80">
                        {t('copyDay.activityCount', { count: activityCount })}
                      </span>
                      <span className="text-sm opacity-80">
                        {formattedTotalHours} {t('copyDay.total')}
                      </span>
                    </div>
                  </div>
                  {activityCount > 0 && (
                    <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition">
                      <Copy size={18} className="opacity-80" />
                    </div>
                  )}
                </div>
                
                {activityCount > 0 ? (
                  <>
                    {/* Preview de las actividades */}
                    <div className="space-y-2 mt-3">
                      {activities.slice(0, 3).map((activity, idx) => {
                        const duration = activity.end - activity.start;
                        const formattedDuration = formatDuration(duration);
                        
                        return (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: activity.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {activity.title || activity.activity}
                              </div>
                              <div className="text-xs opacity-70 flex items-center gap-2">
                                <span>
                                  {formatHour(activity.start)} - {formatHour(activity.end)}
                                </span>
                                <span className="opacity-50">•</span>
                                <span>{formattedDuration}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {activityCount > 3 && (
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-xs opacity-60 text-center">
                            {t('copyDay.moreAria', { count: activityCount - 3 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2 opacity-30">📅</div>
                    <p className="text-sm opacity-60">{t('copyDay.noActivities')}</p>
                    <p className="text-xs opacity-40 mt-1">
                      {t('copyDay.freeDay')}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
          <div className="flex gap-3">
            <div className="text-yellow-300 mt-0.5 flex-shrink-0">⚠️</div>
            <div className="text-sm">
              <p className="font-semibold mb-1">{t('copyDay.warning')}</p>
              <p className="opacity-90 mb-2">
                {t('copyDay.bulletReplace', { day: currentDay })}
              </p>
              <ul className="list-disc pl-5 opacity-80 space-y-1">
                <li>{t('copyDay.bulletPermanent', { day: currentDay })}</li>
                <li>{t('copyDay.bulletCreate')}</li>
                <li>{t('copyDay.bulletPreserve')}</li>
                <li>{t('copyDay.bulletIrreversible')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Información resumen del día actual */}
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{t('copyDay.destinationDay', { day: currentDay })}</p>
              <p className="text-xs opacity-80">
                {t('copyDay.currentCount', { count: schedules[currentDay]?.length || 0 })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyDayModal;