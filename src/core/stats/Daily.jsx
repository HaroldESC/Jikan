/**
 * DailyStats Component
 * 
 * Sección de estadísticas diarias del horario.
 */

import { BarChart3, Clock, Calendar, Target, Activity, TrendingUp, Zap } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

// Función para formatear duración de horas decimales
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

// Función para formatear porcentaje
const formatPercentage = (value) => {
  return `${Math.round(value * 100)}%`;
};

const Daily = ({ schedule }) => {
  const { t } = useTranslation();
  if (!schedule || schedule.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={18} />
          {t('stats.title')}
        </h3>
        <div className="text-center py-8">
          <p className="text-white/60">{t('stats.noActivities')}</p>
          <p className="text-sm text-white/40 mt-2">{t('stats.noStats')}</p>
        </div>
      </div>
    );
  }

  // Filtrar solo actividades reales (no tiempo libre)
  const realActivities = schedule.filter(item => !item.isEmpty && item.title);
  
  if (realActivities.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={18} />
          {t('stats.title')}
        </h3>
        <div className="text-center py-8">
          <p className="text-white/60">{t('stats.onlyFreeTime')}</p>
          <p className="text-sm text-white/40 mt-2">{t('stats.noStats')}</p>
        </div>
      </div>
    );
  }

  // Cálculos en horas decimales (solo actividades reales)
  const totalHours = realActivities.reduce((sum, item) => {
    return sum + (item.end - item.start);
  }, 0);

  const activityCount = realActivities.length;
  const averageActivityHours = totalHours / activityCount;

  // Calcular tiempo libre (incluye tiempo libre explícito)
  const totalDayHours = 24;
  const freeTimeHours = totalDayHours - totalHours;

  // Agrupar por tipo de actividad
  const activityStats = {};
  realActivities.forEach(item => {
    const activityName = item.title || item.activity || t('stats.noName');
    const duration = item.end - item.start;
    
    if (activityStats[activityName]) {
      activityStats[activityName] += duration;
    } else {
      activityStats[activityName] = duration;
    }
  });

  // Encontrar la actividad más larga
  const longestActivity = Object.entries(activityStats).reduce(
    (max, [activity, hours]) => 
      hours > max.hours ? { activity, hours } : max,
    { activity: '', hours: 0 }
  );

  // Encontrar la actividad más corta (excluyendo las muy cortas)
  const shortActivities = Object.entries(activityStats).filter(([, hours]) => hours > 0.25); // > 15 minutos
  const shortestActivity = shortActivities.reduce(
    (min, [activity, hours]) => 
      hours < min.hours ? { activity, hours } : min,
    { activity: '', hours: Infinity }
  );

  // Calcular eficiencia (actividades vs tiempo libre)
  const efficiencyPercentage = (totalHours / totalDayHours) * 100;

  // Calcular densidad horaria (actividades por hora)
  const hourDensity = activityCount / totalHours;

  // Encontrar actividad con mayor densidad de tiempo (más continua)
  const activitiesWithBreaks = [];
  schedule.forEach((item, index) => {
    if (!item.isEmpty && item.title) {
      const nextActivity = schedule[index + 1];
      if (nextActivity && !nextActivity.isEmpty && nextActivity.title) {
        const breakDuration = nextActivity.start - item.end;
        activitiesWithBreaks.push({
          name: item.title || item.activity,
          breakDuration: breakDuration,
          color: item.color
        });
      }
    }
  });

  // Actividad con menos tiempo entre actividades siguientes
  const mostContinuousActivity = activitiesWithBreaks.reduce(
    (min, activity) => 
      activity.breakDuration < min.breakDuration ? activity : min,
    { name: '', breakDuration: Infinity, color: '#3b82f6' }
  );

  // Calcular horario de inicio más temprano y fin más tarde
  const startTimes = realActivities.map(a => a.start);
  const endTimes = realActivities.map(a => a.end);
  const earliestStart = Math.min(...startTimes);
  const latestEnd = Math.max(...endTimes);
  const daySpanHours = latestEnd - earliestStart;

  return (
    <section className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <BarChart3 size={20} />
        {t('stats.title')}
      </h3>

      {/* Grid principal de estadísticas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatItem
          label={t('stats.scheduledTime')}
          value={formatDuration(totalHours)}
          icon={<Clock size={16} />}
          color="text-blue-300"
          detail={`${totalHours.toFixed(1)} ${t('activity.hours')}`}
        />
        <StatItem
          label={t('stats.activities')}
          value={activityCount}
          icon={<Activity size={16} />}
          color="text-green-300"
          detail={`${hourDensity.toFixed(1)} ${t('stats.perHour')}`}
        />
        <StatItem
          label={t('stats.average')}
          value={formatDuration(averageActivityHours)}
          icon={<Target size={16} />}
          color="text-purple-300"
          detail={t('stats.perActivity')}
        />
        <StatItem
          label={t('stats.freeTime')}
          value={formatDuration(freeTimeHours)}
          icon={<Calendar size={16} />}
          color="text-yellow-300"
          detail={formatPercentage(freeTimeHours / totalDayHours)}
        />
      </div>

      {/* Actividades extremas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Actividad más larga */}
        {longestActivity.activity && (
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-1">
              <TrendingUp size={14} />
              {t('stats.longestActivity')}
            </h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" 
                     style={{ 
                       backgroundColor: realActivities.find(a => 
                         (a.title || a.activity) === longestActivity.activity
                       )?.color || '#3b82f6' 
                     }} 
                />
                <span className="font-medium text-sm truncate" title={longestActivity.activity}>
                  {longestActivity.activity}
                </span>
              </div>
              <span className="font-semibold">{formatDuration(longestActivity.hours)}</span>
            </div>
            <div className="mt-2 w-full bg-white/10 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(longestActivity.hours / totalHours) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Actividad más continua */}
        {mostContinuousActivity.name && mostContinuousActivity.breakDuration < 2 && (
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-1">
              <Zap size={14} />
              {t('stats.mostContinuous')}
            </h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" 
                     style={{ backgroundColor: mostContinuousActivity.color }} 
                />
                <span className="font-medium text-sm truncate" title={mostContinuousActivity.name}>
                  {mostContinuousActivity.name}
                </span>
              </div>
              <span className="font-semibold text-sm">
                {mostContinuousActivity.breakDuration > 0 ? 
                  t('stats.minutesAfter', { minutes: Math.round(mostContinuousActivity.breakDuration * 60) }) : 
                  t('stats.noBreak')}
              </span>
            </div>
            <div className="mt-2 w-full bg-white/10 rounded-full h-1.5">
              <div 
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.max(10, 100 - (mostContinuousActivity.breakDuration * 50))}%`,
                  backgroundColor: mostContinuousActivity.color
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Porcentaje programado */}
      <div className="mb-6 bg-white/5 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-white/70">{t('stats.dayPercentage')}</h4>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{efficiencyPercentage.toFixed(1)}%</span>
            <div className={`w-2 h-2 rounded-full ${
              efficiencyPercentage > 70 ? 'bg-green-500' : 
              efficiencyPercentage > 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          </div>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full transition-all duration-1000 ${
              efficiencyPercentage > 70 ? 'bg-green-500' : 
              efficiencyPercentage > 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${efficiencyPercentage}%` }}
          />
        </div>
      </div>

      {/* Información del rango del día */}
      {earliestStart > 0 && (
        <div className="mb-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
          <h4 className="text-sm font-medium text-white/70 mb-2">{t('stats.activeHours')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-white/60">{t('activity.start')}</div>
              <div className="font-semibold">
                {earliestStart.toFixed(1)}h
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60">{t('activity.end')}</div>
              <div className="font-semibold">
                {latestEnd.toFixed(1)}h
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-white/50">
            {t('activity.totalHours', { hours: daySpanHours.toFixed(1) })}
          </div>
        </div>
      )}

      {/* Desglose por actividad */}
      <div className="mb-4 bg-white/5 rounded-xl p-4">
        <h4 className="text-sm font-medium text-white/70 mb-3">{t('stats.distribution')}</h4>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(activityStats)
            .sort(([, a], [, b]) => b - a) // Ordenar por duración descendente
            .map(([activity, hours], index) => {
              const percentage = (hours / totalHours) * 100;
              const activityColor = realActivities.find(a => 
                (a.title || a.activity) === activity
              )?.color || '#3b82f6';
              
              return (
                <div key={activity} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: activityColor }}
                      />
                      <span className="text-sm truncate" title={activity}>
                        {activity}
                      </span>
                    </div>
                    <div className="text-sm flex-shrink-0 ml-2">
                      <span className="font-medium">{formatDuration(hours)}</span>
                      <span className="text-white/50 ml-2">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: activityColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
        <div className="text-center mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-white/50">
            {t('stats.totalDuration', { duration: formatDuration(totalHours), count: activityCount, activities: activityCount !== 1 ? t('activity.activityCount_plural', { count: activityCount }) : t('activity.activityCount', { count: activityCount }) })}
          </p>
        </div>
      </div>
    </section>
  );
};

const StatItem = ({ label, value, icon, color, detail }) => (
  <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className={color}>{icon}</span>}
      <p className="text-xs font-medium text-white/70 truncate" title={label}>
        {label}
      </p>
    </div>
    <p className="text-lg font-semibold mb-1">{value}</p>
    {detail && (
      <p className="text-xs text-white/50">{detail}</p>
    )}
  </div>
);

export default Daily;