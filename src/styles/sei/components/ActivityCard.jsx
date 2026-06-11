import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function ActivityCard({ activity, dayName, isDarkMode, timeRemaining, onClick }) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    };
    updateTime();
    const id = setInterval(updateTime, 60000);
    return () => clearInterval(id);
  }, []);

  if (!activity) return null;

  return (
    <div
      className={`w-full mb-6 p-5 rounded-3xl shadow-lg transition-all cursor-pointer transform hover:scale-[1.02] border-l-8 relative overflow-hidden group`}
      style={{
        backgroundColor: isDarkMode ? '#1e293b' : 'white',
        borderLeftColor: activity.color,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalles de ${activity.label}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="flex justify-between items-start z-10 relative">
        <div className="flex-1">
          <span className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-1 mb-1">
            <Clock size={12} aria-hidden="true" />
            Actual ({dayName})
          </span>
          <h2 className="text-2xl font-bold mb-1">{activity.label}</h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-1`}>
            {activity.description}
          </p>
        </div>
        <div className="text-right ml-4">
          <span
            className="text-xs font-bold px-2 py-1 rounded-full bg-opacity-20"
            style={{ backgroundColor: `${activity.color}33`, color: activity.color }}
            aria-label={`Hora actual: ${currentTime}`}
          >
            {currentTime}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div
          className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden dark:bg-slate-700"
          role="progressbar"
          aria-valuenow={60}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Progreso de la actividad"
        >
          <div className="h-full rounded-full animate-pulse" style={{ width: '60%', backgroundColor: activity.color }} />
        </div>
        <span className="text-xs font-mono font-medium opacity-80 whitespace-nowrap" aria-label={`Tiempo restante: ${timeRemaining}`}>
          {timeRemaining}
        </span>
      </div>
    </div>
  );
}
