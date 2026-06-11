import { useState, useMemo } from 'react';
import { Bell, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';

import { ScheduleClock } from '../styles/sei/components/ScheduleClock';
import { DaysSelector } from '../styles/sei/components/DaysSelector';
import { ActivityCard } from '../styles/sei/components/ActivityCard';
import { ActivityList } from '../styles/sei/components/ActivityList';
import { ActivityDetailModal } from '../styles/sei/components/ActivityDetailModal';
import { SettingsModal } from './common/Settings';
import { toSeiActivity, DAYS_ABBR, DAYS_FULL, DAY_MAP } from '../styles/sei/utils/adapter';

export default function SeiLayout({
  schedules,
  currentDay,
  onSelectDay,
  currentTime,
  isDarkMode,
  toggleTheme,
  onEditActivity,
  user,
}) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const viewingDayIndex = DAY_MAP[currentDay] ?? new Date().getDay();
  const currentRealDayIndex = currentTime.getDay();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isViewingToday = viewingDayIndex === currentRealDayIndex;
  const dayName = DAYS_FULL[viewingDayIndex];

  const rawActivities = schedules[currentDay] || [];
  const seiActivities = useMemo(() => rawActivities.map(toSeiActivity), [rawActivities]);

  const realDayName = DAYS_FULL[currentRealDayIndex];
  const rawReal = schedules[realDayName] || [];

  const findCurrent = (activities, totalMinutes) =>
    activities.find((a) => {
      const aStart = a.start * 60;
      const aEnd = a.end * 60;
      return totalMinutes >= aStart && totalMinutes < aEnd;
    });

  const rawCurrent = useMemo(() => findCurrent(rawReal, currentMinutes), [rawReal, currentMinutes]);
  const currentActivity = useMemo(() => (rawCurrent ? toSeiActivity(rawCurrent) : null), [rawCurrent]);

  const calcTimeRemaining = (activity, totalMinutes) => {
    if (!activity) return '';
    const aEnd = activity.end * 60;
    const diff = aEnd - totalMinutes;
    if (diff <= 0) return '';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}min restantes`;
  };

  const timeRemaining = useMemo(() => calcTimeRemaining(rawCurrent, currentMinutes), [rawCurrent, currentMinutes]);
  const currentActivityId = currentActivity?.id;

  const handleDaySelect = (index) => {
    const dayName = DAYS_FULL[index];
    onSelectDay(dayName);
  };

  const handleActivityClick = (activity, index, e) => {
    if (e?.button === 2 || e?.ctrlKey) {
      e.preventDefault();
      const raw = rawActivities[index];
      if (raw) onEditActivity(raw, currentDay, index);
      return;
    }
    setSelectedActivity(activity);
  };

  const dark = isDarkMode();

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-hidden relative font-sans ${dark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <header className="p-4 pb-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Jikan Sei</h1>
            <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
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
              className={`p-2 rounded-full transition-colors ${dark ? 'bg-slate-800 text-yellow-400' : 'bg-white shadow-sm text-slate-600'}`}
              aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {dark ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-full transition-colors ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'} text-gray-400 hover:text-gray-600 dark:hover:text-gray-200`}
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
          isDarkMode={dark}
          onDaySelect={handleDaySelect}
        />
      </header>

      <main className="flex flex-col items-center px-4 w-full max-w-md mx-auto relative z-10">
        <ActivityCard
          activity={currentActivity}
          dayName={DAYS_FULL[currentRealDayIndex]}
          isDarkMode={dark}
          timeRemaining={timeRemaining}
          onClick={() => setSelectedActivity(currentActivity)}
        />

        <div className="w-full max-w-[320px] aspect-square relative mb-6">
          <ScheduleClock
            schedule={seiActivities}
            nowMinutes={currentMinutes}
            currentActivityId={currentActivityId}
            isViewingToday={isViewingToday}
            isDarkMode={dark}
            onActivitySelect={handleActivityClick}
          />
        </div>

        <ActivityList
          activities={seiActivities}
          isDarkMode={dark}
          isViewingToday={isViewingToday}
          currentActivityId={currentActivityId}
          dayName={dayName}
          onActivitySelect={handleActivityClick}
        />
      </main>

      <ActivityDetailModal
        activity={selectedActivity}
        isDarkMode={dark}
        onClose={() => setSelectedActivity(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
