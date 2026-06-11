import { Plus, Copy } from 'lucide-react';

import PieChart from './wheel/PieChart';
import DaySelector from './common/DaySelector';
import CardMaru from './activities/CardMaru';
import Daily from './stats/Daily';
import Header from './common/Header';
import CopyDayModal from './common/CopyDayModal';
import { getCurrentDay } from '../utils/dates';
import { DAYS_OF_WEEK } from '../utils/index';

export default function MaruLayout({
  schedules,
  currentDay,
  onSelectDay,
  onActivitySelect,
  onAddActivity,
  showCopyModal,
  setShowCopyModal,
  onCopyDay,
  currentTime,
  themeMode,
  toggleTheme,
  bgColor,
  user,
}) {
  const getCurrentActivity = () => {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeDecimal = currentHour + currentMinute / 60;
    const schedule = schedules[currentDay] || [];
    return schedule.find((item) => currentTimeDecimal >= item.start && currentTimeDecimal < item.end);
  };

  const currentActivity = getCurrentActivity();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgColor} p-6 transition-all duration-1000`}>
      <div className="max-w-6xl mx-auto">
        <Header currentTime={currentTime} themeMode={themeMode} onToggleTheme={toggleTheme} />

        <DaySelector days={DAYS_OF_WEEK} currentDay={currentDay} onSelectDay={onSelectDay} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8">
              <PieChart
                schedule={schedules[currentDay] || []}
                currentDay={currentDay}
                onActivitySelect={onActivitySelect}
              />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => onAddActivity(currentDay)}
                className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-lg transition inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Añadir actividad
              </button>

              <button
                onClick={() => setShowCopyModal(true)}
                className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-lg transition inline-flex items-center gap-2"
              >
                <Copy size={20} />
                Copiar desde otro día
              </button>
            </div>
            <p className="text-white/60 text-sm mt-3 text-center">
              Click derecho en una actividad para editarla
            </p>
          </div>

          <div className="space-y-4 lg:overflow-auto lg:max-h-[calc(100vh-200px)] custom-scrollbar">
            {currentDay === getCurrentDay() && currentActivity && (
              <CardMaru activity={currentActivity} currentDay={currentDay} currentTime={currentTime} label="ACTIVIDAD ACTUAL" />
            )}
            <Daily schedule={schedules[currentDay] || []} />
          </div>
        </div>
      </div>

      <CopyDayModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        currentDay={currentDay}
        schedules={schedules}
        onCopyDay={onCopyDay}
      />
    </div>
  );
}
