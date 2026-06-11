import { useState, useMemo } from 'react';
import { Bell, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';

import { useClock } from '../../hooks/useClock';
import { useTheme } from '../../hooks/useTheme';
import { useActivities } from '../../hooks/useActivities';
import { SettingsModal } from '../../core/common/Settings';

import { ScheduleClock } from './components/ScheduleClock';
import { DaysSelector } from './components/DaysSelector';
import { ActivityCard } from './components/ActivityCard';
import { ActivityList } from './components/ActivityList';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { toSeiActivity, DAYS_ABBR, DAYS_FULL } from './utils/adapter';

const findCurrent = (activities, totalMinutes) => {
  return activities.find((a) => {
    const aStart = a.start * 60;
    const aEnd = a.end * 60;
    return totalMinutes >= aStart && totalMinutes < aEnd;
  });
};

const calcTimeRemaining = (activity, totalMinutes) => {
  if (!activity) return '';
  const aEnd = activity.end * 60;
  const diff = aEnd - totalMinutes;
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h > 0 ? h + 'h ' : ''}${m}min restantes`;
};

export default function SeiApp({ user }) {
  const { schedules, loading } = useActivities(user);
  const now = useClock();
  const { isDarkMode, toggleTheme } = useTheme();

  const [viewingDayIndex, setViewingDayIndex] = useState(new Date().getDay());
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const currentRealDayIndex = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isViewingToday = viewingDayIndex === currentRealDayIndex;
  const dayName = DAYS_FULL[viewingDayIndex];

  const rawActivities = schedules[dayName] || [];
  const seiActivities = useMemo(() => rawActivities.map(toSeiActivity), [rawActivities]);

  const realDayName = DAYS_FULL[currentRealDayIndex];
  const rawReal = schedules[realDayName] || [];

  const rawCurrent = useMemo(
    () => findCurrent(rawReal, currentMinutes),
    [rawReal, currentMinutes]
  );
  const currentActivity = useMemo(() => rawCurrent ? toSeiActivity(rawCurrent) : null, [rawCurrent]);

  const timeRemaining = useMemo(
    () => calcTimeRemaining(rawCurrent, currentMinutes),
    [rawCurrent, currentMinutes]
  );
  const currentActivityId = currentActivity?.id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Cargando tu horario…
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-hidden relative font-sans ${isDarkMode() ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <header className="p-4 pb-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Jikan Sei</h1>
            <p className={`text-xs ${isDarkMode() ? 'text-slate-400' : 'text-slate-500'}`}>
              {now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`p-2 rounded-full transition-colors ${notificationsEnabled ? 'bg-blue-100 text-blue-600' : 'bg-transparent text-gray-400'}`}
              aria-label={notificationsEnabled ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}
            >
              <Bell size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${isDarkMode() ? 'bg-slate-800 text-yellow-400' : 'bg-white shadow-sm text-slate-600'}`}
              aria-label={isDarkMode() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {isDarkMode() ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-full transition-colors ${isDarkMode() ? 'hover:bg-slate-800' : 'hover:bg-slate-200'} text-gray-400 hover:text-gray-600 dark:hover:text-gray-200`}
              aria-label="Abrir configuración"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </div>
        <DaysSelector
          days={DAYS_ABBR}
          activeIndex={viewingDayIndex}
          todayIndex={currentRealDayIndex}
          isDarkMode={isDarkMode()}
          onDaySelect={setViewingDayIndex}
        />
      </header>

      <main className="flex flex-col items-center px-4 w-full max-w-md mx-auto relative z-10">
        <ActivityCard
          activity={currentActivity}
          dayName={DAYS_FULL[currentRealDayIndex]}
          isDarkMode={isDarkMode()}
          timeRemaining={timeRemaining}
          onClick={() => setSelectedActivity(currentActivity)}
        />

        <div className="w-full max-w-[320px] aspect-square relative mb-6">
          <ScheduleClock
            schedule={seiActivities}
            nowMinutes={currentMinutes}
            currentActivityId={currentActivityId}
            isViewingToday={isViewingToday}
            isDarkMode={isDarkMode()}
            onActivitySelect={setSelectedActivity}
          />
        </div>

        <ActivityList
          activities={seiActivities}
          isDarkMode={isDarkMode()}
          isViewingToday={isViewingToday}
          currentActivityId={currentActivityId}
          dayName={dayName}
          onActivitySelect={setSelectedActivity}
        />
      </main>

      <ActivityDetailModal
        activity={selectedActivity}
        isDarkMode={isDarkMode()}
        onClose={() => setSelectedActivity(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
