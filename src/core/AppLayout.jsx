import { useState, useMemo } from 'react';
import { Plus, Copy, Bell, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';

import PieChart from './wheel/PieChart';
import DaySelector from '../components/DaySelector';
import ActivityCard from '../components/ActivityCard';
import Daily from './stats/Daily';
import ThemeToggle from './common/ThemeToggle';
import { SettingsButton, SettingsModal } from './common/Settings';
import CopyDayModal from './common/CopyDayModal';
import { ScheduleClock } from '../styles/sei/components/ScheduleClock';
import { ActivityList } from '../styles/sei/components/ActivityList';
import DetailViewSei from './activities/DetailViewSei';
import { toSeiActivity, DAYS_FULL } from '../styles/sei/utils/adapter';
import { getCurrentDay } from '../utils/dates';
import { DAYS_OF_WEEK } from '../utils/index';

export default function AppLayout({
  style,
  schedules,
  currentDay,
  onSelectDay,
  onActivitySelect,
  onAddActivity,
  onEditActivity,
  showCopyModal,
  setShowCopyModal,
  onCopyDay,
  currentTime,
  themeMode,
  toggleTheme,
  bgColor,
  isDarkMode,
  user,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [seiSelectedActivity, setSeiSelectedActivity] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const isMaru = style === 'maru';
  const dark = isDarkMode();

  const rawActivities = schedules[currentDay] || [];
  const seiActivities = useMemo(() => rawActivities.map(toSeiActivity), [rawActivities]);

  const realDayIndex = currentTime.getDay();
  const realDayName = DAYS_FULL[realDayIndex];
  const realRaw = schedules[realDayName] || [];

  const findCurrent = (activities, totalMinutes) =>
    activities.find((a) => {
      const s = a.start * 60, e = a.end * 60;
      return totalMinutes >= s && totalMinutes < e;
    });

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const rawCurrent = useMemo(() => findCurrent(realRaw, currentMinutes), [realRaw, currentMinutes]);
  const seiCurrent = useMemo(() => (rawCurrent ? toSeiActivity(rawCurrent) : null), [rawCurrent]);
  const seiCurrentId = seiCurrent?.id;

  const handleSeiClick = (activity, index, e) => {
    if (e?.button === 2 || e?.ctrlKey) {
      e.preventDefault();
      const raw = rawActivities[index];
      if (raw) onEditActivity(raw, currentDay, index);
      return;
    }
    setSeiSelectedActivity(activity);
  };

  const isViewingToday = currentDay === realDayName;

  return (
    <div className={`theme-${style} ${isMaru ? `min-h-screen bg-gradient-to-br ${bgColor}` : `min-h-screen ${dark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`} p-6 transition-all duration-1000 font-sans`}>
      <div className={isMaru ? 'max-w-6xl mx-auto' : ''}>
        {/* ── HEADER ── */}
        {isMaru ? (
          <header className="app-header">
            <div className="app-header__top">
              <div className="flex-1">
                <ThemeToggle themeMode={themeMode} onToggle={toggleTheme} />
              </div>
              <h1 className="app-header__title">Jikan Maru</h1>
              <div className="flex-1 flex justify-end">
                <SettingsButton onClick={() => setIsSettingsOpen(true)} />
              </div>
            </div>
            <div className="app-header__time">
              <span>{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </header>
        ) : (
          <header className="p-4 pb-2">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Jikan Sei</h1>
                <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`p-2 rounded-full transition-colors ${notificationsEnabled ? 'bg-blue-100 text-blue-600' : 'bg-transparent text-gray-400'}`}
                  aria-label={notificationsEnabled ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}>
                  <Bell size={18} />
                </button>
                <button onClick={toggleTheme}
                  className={`p-2 rounded-full transition-colors ${dark ? 'bg-slate-800 text-yellow-400' : 'bg-white shadow-sm text-slate-600'}`}>
                  {dark ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button onClick={() => setIsSettingsOpen(true)}
                  className={`p-2 rounded-full transition-colors ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'} text-gray-400`}>
                  <SettingsIcon size={18} />
                </button>
              </div>
            </div>
          </header>
        )}

        {/* ── DAY SELECTOR ── */}
        <DaySelector days={DAYS_OF_WEEK} currentDay={currentDay} onSelectDay={onSelectDay} isDarkMode={dark} />

        {/* ── MAIN GRID ── */}
        <div className={`${isMaru ? 'lg:grid-cols-3' : 'max-w-md mx-auto flex flex-col items-center'} grid gap-6 mt-6`}>
          {/* ── WHEEL / CLOCK COLUMN ── */}
          <div className={isMaru ? 'lg:col-span-2' : 'w-full'}>
            {isMaru ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8">
                <PieChart schedule={rawActivities} currentDay={currentDay} onActivitySelect={onActivitySelect} />
              </div>
            ) : (
              <div className="w-full max-w-[320px] aspect-square relative mb-6 mx-auto">
                <ScheduleClock schedule={seiActivities} nowMinutes={currentMinutes}
                  currentActivityId={seiCurrentId} isViewingToday={isViewingToday}
                  isDarkMode={dark} onActivitySelect={handleSeiClick} />
              </div>
            )}

            {/* ── ACTION BUTTONS ── */}
            {isMaru ? (
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button onClick={() => onAddActivity(currentDay)}
                  className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
                  <Plus size={20} /> Añadir actividad
                </button>
                <button onClick={() => setShowCopyModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
                  <Copy size={20} /> Copiar desde otro día
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button onClick={() => onAddActivity(currentDay)}
                  className={`px-6 py-3 rounded-xl font-medium transition inline-flex items-center gap-2 ${dark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white shadow-sm hover:bg-slate-50 text-slate-700'}`}>
                  <Plus size={18} /> Añadir actividad
                </button>
              </div>
            )}
          </div>

          {/* ── MARU SIDE PANEL ── */}
          {isMaru && (
            <div className="space-y-4 lg:overflow-auto lg:max-h-[calc(100vh-200px)] custom-scrollbar">
              {currentDay === getCurrentDay() && rawCurrent && (
                <ActivityCard activity={rawCurrent} currentDay={currentDay} isDarkMode={dark} label="ACTIVIDAD ACTUAL" />
              )}
              <Daily schedule={rawActivities} />
            </div>
          )}
        </div>

        {/* ── SEI CARDS BELOW GRID ── */}
        {!isMaru && (
          <main className="flex flex-col items-center px-4 w-full max-w-md mx-auto relative z-10">
            <ActivityCard activity={rawCurrent} currentDay={currentDay}
              isDarkMode={dark} onClick={() => setSeiSelectedActivity(rawCurrent ? toSeiActivity(rawCurrent) : null)} />
            <ActivityList activities={seiActivities} isDarkMode={dark} isViewingToday={isViewingToday}
              currentActivityId={seiCurrentId} dayName={currentDay} onActivitySelect={handleSeiClick} />
          </main>
        )}
      </div>

      {/* ── MODALS ── */}
      {isMaru && (
        <CopyDayModal isOpen={showCopyModal} onClose={() => setShowCopyModal(false)}
          currentDay={currentDay} schedules={schedules} onCopyDay={onCopyDay} />
      )}

      {!isMaru && (
        <DetailViewSei activity={seiSelectedActivity} isDarkMode={dark}
          onClose={() => setSeiSelectedActivity(null)} />
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
