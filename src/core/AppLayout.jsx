import { useState, useMemo, useRef } from 'react';
import { Plus, Copy } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

import WheelMaru from './wheel/WheelMaru';
import WheelSei from './wheel/WheelSei';
import Header from '../components/Header';
import DaySelector from '../components/DaySelector';
import ActivityCard from '../components/ActivityCard';
import Daily from './stats/Daily';
import Reminders from './stats/Reminders';
import { SettingsModal } from './common/Settings';
import CopyDayModal from './common/CopyDayModal';
import Panel from './common/Panel';

import { ActivityList } from './activities/ActivityList';
import DetailViewSei from './activities/DetailViewSei';
import { toSeiActivity, DAYS_FULL } from './utils/adapter';
import { getCurrentDay } from '../utils/dates';
import { DAYS_OF_WEEK } from '../utils/index';
import { useReminders } from '../hooks/useReminders';
import { usePanels } from '../hooks/usePanels';

// Panel groups per style: the wheel lives in its own column, so it only
// supports hide/show; the content column supports hide + drag-to-reorder.
const MARU_CONTENT_PANELS = ['current', 'stats', 'reminders'];
const SEI_CONTENT_PANELS = ['current', 'list', 'reminders'];
const WHEEL_PANELS = ['wheel'];

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
  const { t } = useTranslation();
  const { reminders, addReminder, deleteReminder } = useReminders(user?.id);

  // ── Layout editor state ──
  const isMaru = style === 'maru';
  const [layoutEdit, setLayoutEdit] = useState(false);
  // Ref (not state): dragstart → drop can happen before React re-renders.
  const draggingPanel = useRef(null);
  const wheelPanels = usePanels(user?.id, style, 'wheel', WHEEL_PANELS);
  const contentPanels = usePanels(
    user?.id,
    style,
    'content',
    isMaru ? MARU_CONTENT_PANELS : SEI_CONTENT_PANELS
  );

  const panelTitle = (id) => t(`panels.names.${id}`);

  const panelProps = (group, id) => ({
    editMode: layoutEdit,
    isVisible: group.isVisible(id),
    onToggle: group.togglePanel,
    onDragStart: (id) => { draggingPanel.current = id; },
    onDragEnd: () => { draggingPanel.current = null; },
    onDrop: (id) => {
      if (draggingPanel.current) group.movePanel(draggingPanel.current, id);
      draggingPanel.current = null;
    },
  });

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
        <Header
          title={`Jikan ${style === 'maru' ? 'Maru' : 'Sei'}`}
          currentTime={currentTime}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
          isDarkMode={dark}
          layoutEditMode={layoutEdit}
          onToggleLayoutEdit={() => setLayoutEdit((prev) => !prev)}
        />

        {/* ── DAY SELECTOR ── */}
        <DaySelector days={DAYS_OF_WEEK} currentDay={currentDay} onSelectDay={onSelectDay} isDarkMode={dark} />

        {/* ── MAIN GRID ── */}
        <div className={`${isMaru ? 'lg:grid-cols-3' : 'max-w-md mx-auto flex flex-col items-center'} grid gap-6 mt-6`}>
          {/* ── WHEEL / CLOCK COLUMN ── */}
          <div className={isMaru ? 'lg:col-span-2' : 'w-full'}>
            {(layoutEdit || wheelPanels.isVisible('wheel')) && (
              <Panel id="wheel" title={panelTitle('wheel')} {...panelProps(wheelPanels, 'wheel')}>
                {isMaru ? (
                  <div key={currentDay} className="bg-white/10 backdrop-blur-lg rounded-3xl p-8">
                    <WheelMaru schedule={rawActivities} currentDay={currentDay} onActivitySelect={onActivitySelect} />
                  </div>
                ) : (
                  <div key={currentDay} className="w-full max-w-[320px] aspect-square relative mb-6 mx-auto">
                    <WheelSei schedule={seiActivities} nowMinutes={currentMinutes}
                      currentActivityId={seiCurrentId} isViewingToday={isViewingToday}
                      isDarkMode={dark} onActivitySelect={handleSeiClick} />
                  </div>
                )}
              </Panel>
            )}

            {/* ── ACTION BUTTONS ── */}
            {isMaru ? (
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button onClick={() => onAddActivity(currentDay)}
                  className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
                  <Plus size={20} /> {t('header.addActivity')}
                </button>
                <button onClick={() => setShowCopyModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
                  <Copy size={20} /> {t('header.copyFromDay')}
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button onClick={() => onAddActivity(currentDay)}
                  className={`px-6 py-3 rounded-xl font-medium transition inline-flex items-center gap-2 ${dark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white shadow-sm hover:bg-slate-50 text-slate-700'}`}>
                  <Plus size={18} /> {t('header.addActivity')}
                </button>
              </div>
            )}
          </div>

          {/* ── MARU SIDE PANEL ── */}
          {isMaru && (
            <div className={`space-y-4 lg:overflow-auto lg:max-h-[calc(100vh-200px)] custom-scrollbar ${layoutEdit ? 'pt-4' : ''}`}>
              {contentPanels.order.map((id) => {
                const visible = contentPanels.isVisible(id);
                const hasCurrent = currentDay === getCurrentDay() && !!rawCurrent;
                if (id === 'current' && !hasCurrent && !layoutEdit) return null;
                if (!layoutEdit && !visible) return null;

                return (
                  <Panel key={id} id={id} title={panelTitle(id)} {...panelProps(contentPanels, id)}>
                    {id === 'current' ? (
                      hasCurrent ? (
                        <ActivityCard activity={rawCurrent} currentDay={currentDay} isDarkMode={dark} label={t('header.currentActivity')} />
                      ) : (
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white/60 text-sm text-center">
                          {t('panels.empty')}
                        </div>
                      )
                    ) : id === 'stats' ? (
                      <Daily schedule={rawActivities} />
                    ) : (
                      <Reminders
                        reminders={reminders}
                        onAddReminder={addReminder}
                        onDeleteReminder={deleteReminder}
                      />
                    )}
                  </Panel>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SEI CARDS BELOW GRID ── */}
        {!isMaru && (
          <main className="flex flex-col items-center px-4 w-full max-w-md mx-auto relative z-10">
            {contentPanels.order.map((id) => {
              const hasCurrent = !!rawCurrent;
              if (id === 'current' && !hasCurrent && !layoutEdit) return null;
              if (!layoutEdit && !contentPanels.isVisible(id)) return null;

              return (
                <Panel key={id} id={id} title={panelTitle(id)} className="w-full" {...panelProps(contentPanels, id)}>
                  {id === 'current' ? (
                    hasCurrent ? (
                      <ActivityCard activity={rawCurrent} currentDay={currentDay}
                        isDarkMode={dark} onClick={() => setSeiSelectedActivity(rawCurrent ? toSeiActivity(rawCurrent) : null)} />
                    ) : (
                      <div className="w-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                        {t('panels.empty')}
                      </div>
                    )
                  ) : id === 'list' ? (
                    <ActivityList activities={seiActivities} isDarkMode={dark} isViewingToday={isViewingToday}
                      currentActivityId={seiCurrentId} dayName={currentDay} onActivitySelect={handleSeiClick} />
                  ) : (
                    <div className="w-full mt-6">
                      <Reminders
                        reminders={reminders}
                        onAddReminder={addReminder}
                        onDeleteReminder={deleteReminder}
                      />
                    </div>
                  )}
                </Panel>
              );
            })}
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
          onClose={() => setSeiSelectedActivity(null)}
          onEdit={!seiSelectedActivity ? undefined : () => {
            const raw = rawActivities.find(a => a.id === seiSelectedActivity.id);
            if (raw) {
              const idx = rawActivities.indexOf(raw);
              setSeiSelectedActivity(null);
              onEditActivity(raw, currentDay, idx);
            }
          }}
        />
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
