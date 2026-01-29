/**
 * DailyStats Component
 * 
 * Sección de estadísticas diarias del horario.
 */

import { BarChart3, Clock, Calendar, Target, Activity } from 'lucide-react';
import { timeToMinutes, formatDuration } from '../../utils/time';

// Componente para mostrar un ítem de estadística
const StatItem = ({ label, value, icon, color }) => (
  <div className="bg-white/5 rounded-xl p-3">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className={color}>{icon}</span>}
      <p className="text-xs font-medium text-white/70">{label}</p>
    </div>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

// Componente para la barra de progreso
const ProgressBar = ({ percentage, colorClass, height = 'h-3' }) => (
  <div className={`w-full bg-white/10 rounded-full ${height}`}>
    <div 
      className={`${height} rounded-full transition-all duration-1000 ${colorClass}`}
      style={{ width: `${percentage}%` }}
    />
  </div>
);

// Componente para la barra de progreso con colores condicionales
const EfficiencyProgressBar = ({ percentage }) => {
  const getColorClass = (percent) => {
    if (percent > 70) return 'bg-green-500';
    if (percent > 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <>
      <ProgressBar 
        percentage={percentage} 
        colorClass={getColorClass(percentage)}
      />
      <div className="flex justify-between text-xs text-white/50 mt-1">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </>
  );
};

// Componente para la actividad más extensa
const LongestActivityDisplay = ({ activity, minutes, totalMinutes, color }) => {
  const percentage = (minutes / totalMinutes) * 100;
  
  return (
    <div className="mb-6 bg-white/5 rounded-xl p-4">
      <h4 className="text-sm font-medium text-white/70 mb-2">Actividad más extensa</h4>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color || '#3b82f6' }} 
          />
          <span className="font-medium">{activity}</span>
        </div>
        <span className="font-semibold">{formatDuration(minutes)}</span>
      </div>
      <div className="mt-2">
        <ProgressBar 
          percentage={percentage} 
          colorClass="bg-blue-500" 
          height="h-2"
        />
      </div>
    </div>
  );
};

// Componente para la distribución del tiempo por actividad
const ActivityDistribution = ({ activities, activityStats, totalMinutes }) => (
  <div className="mb-4 bg-white/5 rounded-xl p-4">
    <h4 className="text-sm font-medium text-white/70 mb-3">Distribución del tiempo</h4>
    <div className="space-y-3">
      {Object.entries(activityStats)
        .sort(([, a], [, b]) => b - a)
        .map(([activityName, minutes]) => {
          const percentage = Math.round((minutes / totalMinutes) * 100);
          const activityColor = activities.find(a => 
            (a.title || a.activity) === activityName
          )?.color || '#3b82f6';
          
          return (
            <div key={activityName} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activityColor }}
                  />
                  <span className="text-sm">{activityName}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">{formatDuration(minutes)}</span>
                  <span className="text-white/50 ml-2">({percentage}%)</span>
                </div>
              </div>
              <ProgressBar 
                percentage={percentage} 
                colorClass=""
                height="h-1.5"
                customColor={activityColor}
              />
            </div>
          );
        })}
    </div>
  </div>
);

// Hook personalizado para calcular estadísticas
const useDailyStats = (schedule) => {
  if (!schedule || schedule.length === 0) {
    return { hasData: false };
  }

  // Filtrar solo actividades reales (no tiempo libre)
  const realActivities = schedule.filter(item => !item.isEmpty && item.title);
  
  if (realActivities.length === 0) {
    return { hasData: false, hasOnlyFreeTime: true };
  }

  // Cálculos en minutos (solo actividades reales)
  const totalMinutes = realActivities.reduce((sum, item) => {
    const startMinutes = timeToMinutes(item.start);
    const endMinutes = timeToMinutes(item.end);
    return sum + (endMinutes - startMinutes);
  }, 0);

  const activityCount = realActivities.length;
  const averageActivityMinutes = Math.round(totalMinutes / activityCount);

  // Calcular tiempo libre
  const totalDayMinutes = 24 * 60;
  const freeTimeMinutes = totalDayMinutes - totalMinutes;

  // Agrupar por tipo de actividad
  const activityStats = {};
  realActivities.forEach(item => {
    const activityName = item.title || item.activity || 'Sin nombre';
    const startMinutes = timeToMinutes(item.start);
    const endMinutes = timeToMinutes(item.end);
    const duration = endMinutes - startMinutes;
    
    activityStats[activityName] = (activityStats[activityName] || 0) + duration;
  });

  // Encontrar la actividad más larga
  const longestActivity = Object.entries(activityStats).reduce(
    (max, [activity, minutes]) => 
      minutes > max.minutes ? { activity, minutes } : max,
    { activity: '', minutes: 0 }
  );

  // Encontrar la actividad más corta (excluyendo las muy cortas)
  const shortestActivity = Object.entries(activityStats).reduce(
    (min, [activity, minutes]) => 
      minutes < min.minutes && minutes > 30 ? { activity, minutes } : min,
    { activity: '', minutes: Infinity }
  );

  // Calcular eficiencia
  const efficiencyPercentage = Math.round((totalMinutes / totalDayMinutes) * 100);

  return {
    hasData: true,
    realActivities,
    totalMinutes,
    activityCount,
    averageActivityMinutes,
    freeTimeMinutes,
    activityStats,
    longestActivity,
    shortestActivity,
    efficiencyPercentage,
    totalDayMinutes
  };
};

// Componente principal
const Daily = ({ schedule }) => {
  const stats = useDailyStats(schedule);

  // Casos sin datos
  if (!stats.hasData) {
    return <NoDataMessage hasOnlyFreeTime={stats.hasOnlyFreeTime} />;
  }

  const {
    realActivities,
    totalMinutes,
    activityCount,
    averageActivityMinutes,
    freeTimeMinutes,
    activityStats,
    longestActivity,
    efficiencyPercentage,
    totalDayMinutes
  } = stats;

  const longestActivityColor = realActivities.find(a => 
    (a.title || a.activity) === longestActivity.activity
  )?.color;

  return (
    <section className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <BarChart3 size={20} />
        ESTADÍSTICAS DEL DÍA
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatItem
          label="Tiempo programado"
          value={formatDuration(totalMinutes)}
          icon={<Clock size={16} />}
          color="text-blue-300"
        />
        <StatItem
          label="Actividades"
          value={activityCount}
          icon={<Activity size={16} />}
          color="text-green-300"
        />
        <StatItem
          label="Promedio por actividad"
          value={formatDuration(averageActivityMinutes)}
          icon={<Target size={16} />}
          color="text-purple-300"
        />
        <StatItem
          label="Tiempo libre"
          value={formatDuration(freeTimeMinutes)}
          icon={<Calendar size={16} />}
          color="text-yellow-300"
        />
      </div>

      {/* Actividad más larga */}
      {longestActivity.activity && (
        <LongestActivityDisplay
          activity={longestActivity.activity}
          minutes={longestActivity.minutes}
          totalMinutes={totalMinutes}
          color={longestActivityColor}
        />
      )}

      {/* Porcentaje programado */}
      <div className="mb-6 bg-white/5 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-white/70">Porcentaje programado</h4>
          <span className="font-semibold">{efficiencyPercentage}%</span>
        </div>
        <EfficiencyProgressBar percentage={efficiencyPercentage} />
      </div>

      {/* Desglose por actividad */}
      <ActivityDistribution
        activities={realActivities}
        activityStats={activityStats}
        totalMinutes={totalMinutes}
      />
    </section>
  );
};

// Componente para mensajes cuando no hay datos
const NoDataMessage = ({ hasOnlyFreeTime = false }) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <BarChart3 size={18} />
      ESTADÍSTICAS DEL DÍA
    </h3>
    <div className="text-center py-8">
      <p className="text-white/60">
        {hasOnlyFreeTime 
          ? "Solo tiempo libre programado" 
          : "No hay actividades programadas"}
      </p>
      <p className="text-sm text-white/40 mt-2">
        Añade actividades para ver estadísticas
      </p>
    </div>
  </div>
);

export default Daily;