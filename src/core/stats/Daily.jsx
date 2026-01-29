/**
 * DailyStats Component
 * 
 * Sección de estadísticas diarias del horario.
 */

import { BarChart3, Clock, Calendar, Target, Activity } from 'lucide-react';
import { timeToMinutes, formatDuration } from '../../utils/time';

const Daily = ({ schedule }) => {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={18} />
          ESTADÍSTICAS DEL DÍA
        </h3>
        <div className="text-center py-8">
          <p className="text-white/60">No hay actividades programadas</p>
          <p className="text-sm text-white/40 mt-2">Añade actividades para ver estadísticas</p>
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
          ESTADÍSTICAS DEL DÍA
        </h3>
        <div className="text-center py-8">
          <p className="text-white/60">Solo tiempo libre programado</p>
          <p className="text-sm text-white/40 mt-2">Añade actividades para ver estadísticas</p>
        </div>
      </div>
    );
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
  const allActivities = schedule; // Incluye tiempo libre
  const totalDayMinutes = 24 * 60;
  const freeTimeMinutes = totalDayMinutes - totalMinutes;

  // Agrupar por tipo de actividad
  const activityStats = {};
  realActivities.forEach(item => {
    const activityName = item.title || item.activity || 'Sin nombre';
    const startMinutes = timeToMinutes(item.start);
    const endMinutes = timeToMinutes(item.end);
    const duration = endMinutes - startMinutes;
    
    if (activityStats[activityName]) {
      activityStats[activityName] += duration;
    } else {
      activityStats[activityName] = duration;
    }
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

  // Calcular eficiencia (actividades vs tiempo libre)
  const efficiencyPercentage = Math.round((totalMinutes / totalDayMinutes) * 100);

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
        <div className="mb-6 bg-white/5 rounded-xl p-4">
          <h4 className="text-sm font-medium text-white/70 mb-2">Actividad más extensa</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" 
                   style={{ 
                     backgroundColor: realActivities.find(a => 
                       (a.title || a.activity) === longestActivity.activity
                     )?.color || '#3b82f6' 
                   }} 
              />
              <span className="font-medium">{longestActivity.activity}</span>
            </div>
            <span className="font-semibold">{formatDuration(longestActivity.minutes)}</span>
          </div>
          <div className="mt-2 w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(longestActivity.minutes / totalMinutes) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Porcentaje programado */}
      <div className="mb-6 bg-white/5 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-white/70">Porcentaje programado</h4>
          <span className="font-semibold">{efficiencyPercentage}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ${
              efficiencyPercentage > 70 ? 'bg-green-500' : 
              efficiencyPercentage > 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${efficiencyPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/50 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Desglose por actividad */}
      <div className="mb-4 bg-white/5 rounded-xl p-4">
        <h4 className="text-sm font-medium text-white/70 mb-3">Distribución del tiempo</h4>
        <div className="space-y-3">
          {Object.entries(activityStats)
            .sort(([, a], [, b]) => b - a) // Ordenar por duración descendente
            .map(([activity, minutes], index) => {
              const percentage = Math.round((minutes / totalMinutes) * 100);
              const activityColor = realActivities.find(a => 
                (a.title || a.activity) === activity
              )?.color || '#3b82f6';
              
              return (
                <div key={activity} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: activityColor }}
                      />
                      <span className="text-sm">{activity}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{formatDuration(minutes)}</span>
                      <span className="text-white/50 ml-2">({percentage}%)</span>
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
      </div>
    </section>
  );
};

const StatItem = ({ label, value, icon, color }) => (
  <div className="bg-white/5 rounded-xl p-3">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className={color}>{icon}</span>}
      <p className="text-xs font-medium text-white/70">{label}</p>
    </div>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default Daily;