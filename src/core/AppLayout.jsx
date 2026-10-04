import { useState, useMemo, useRef, useEffect } from 'react';
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
import ImportModal from './common/ImportModal';
import Panel from './common/Panel';
import Pomodoro from './common/Pomodoro';

import { ActivityList } from './activities/ActivityList';
import DetailViewSei from './activities/DetailViewSei';
import { toSeiActivity, DAYS_FULL } from './utils/adapter';
import { getCurrentDay } from '../utils/dates';
import { DAYS_OF_WEEK } from '../utils/index';
import { useReminders } from '../hooks/useReminders';
import { usePanels } from '../hooks/usePanels';
import { usePomodoro } from '../hooks/usePomodoro';
import { useNotifications } from '../hooks/useNotifications';

// Panel groups per style: the wheel lives in its own column, so it only
// supports hide/show; the content column supports hide + drag-to-reorder.
const MARU_CONTENT_PANELS = ['current', 'stats', 'reminders', 'pomodoro'];
const SEI_CONTENT_PANELS = ['current', 'list', 'reminders', 'pomodoro'];
const WHEEL_PANELS = ['wheel'];

// Sentinel: distinguishes "no previous activity tracked yet" from "there is
// genuinely no current activity" (null) when watching activity transitions.
const UNSET = Symbol('unset');

// Decimal hours → 'HH:MM' (internal time is decimal: 9.5 = 09:30).
const formatClock = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  const h = hours === 24 ? 0 : hours;
  return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const localDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
  onExportCsv,
  onImportFile,
  importPreview,
  onCloseImport,
  onConfirmImport,
  currentTime,
  themeMode,
  toggleTheme,
  bgColor,
  isDarkMode,
  user,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [seiSelectedActivity, setSeiSelectedActivity] = useState(null);
  const { t } = useTranslation();
  const { reminders, addReminder, deleteReminder } = useReminders(user?.id);

  // CSV controls live in the Settings modal ("Data" section).
  const csvActions = useMemo(
    () => ({ onExport: onExportCsv, onImport: onImportFile }),
    [onExportCsv, onImportFile]
  );

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
    onDragStart: (panelId) => { draggingPanel.current = panelId; },
    onDragMove: (targetId) => {
      const from = draggingPanel.current;
      if (from && from !== targetId) group.movePanel(from, targetId);
    },
    onDragEnd: () => { draggingPanel.current = null; },
    onMoveBy: (panelId, delta) => {
      const order = group.order;
      const current = order.indexOf(panelId);
      const next = current + delta;
      if (current < 0 || next < 0 || next >= order.length) return;
      group.movePanel(panelId, order[next]);
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

  // ── A2: Pomodoro (standalone, tied to the current activity via label) ──
  const pomodoroLabel = currentDay === getCurrentDay() ? rawCurrent?.title : undefined;
  const pomodoro = usePomodoro(user?.id, pomodoroLabel);

  // ── A3: browser notifications (settings + permission; no scheduling here) ──
  const notifications = useNotifications(user?.id);
  const {
    permission: notifyPermission,
    preMinutes,
    requestPermission,
    setEnabled: setNotifyEnabled,
    notify,
  } = notifications;

  const handleToggleNotifications = async () => {
    if (notifications.enabled) {
      setNotifyEnabled(false);
      return;
    }
    let result = notifyPermission;
    if (result === 'default') result = await requestPermission();
    if (result === 'granted') {
      setNotifyEnabled(true);
    } else {
      window.alert(t('notifications.denied'));
    }
  };

  // Ref of the last observed current activity (real day). `UNSET` on mount so
  // opening the app mid-activity never fires a notification — only entries do.
  const prevCurrentIdRef = useRef(UNSET);

  // Notify once per activity entry (one notification per transition).
  useEffect(() => {
    const currentId = rawCurrent?.id ?? null;
    const prevId = prevCurrentIdRef.current;
    prevCurrentIdRef.current = currentId;
    if (prevId === UNSET || currentId === prevId || currentId == null) return;
    if (!notifications.enabled || notifyPermission !== 'granted') return;

    notify(t('notifications.activityNow', { activity: rawCurrent.title || t('activity.noName') }), {
      body: `${formatClock(rawCurrent.start)} – ${formatClock(rawCurrent.end)}`,
      tag: `jikan-current-${currentId}`,
    });
  }, [rawCurrent, notifications.enabled, notifyPermission, notify, t]);

  // Ref of already-notified pre-avisos (keyed by local date + activity id so
  // the same recurring activity notifies again on another day).
  const preAvisoNotifiedRef = useRef(new Set());

  // Pre-aviso: notify once when an upcoming activity starts within `preMinutes`.
  // Re-evaluated on every `useClock` tick (once per minute); `preMinutes === 0`
  // disables it.
  useEffect(() => {
    if (!notifications.enabled || notifyPermission !== 'granted') return;
    if (preMinutes <= 0 || realRaw.length === 0) return;

    const dayKey = localDateKey(currentTime);
    realRaw.forEach((activity) => {
      const startMinutes = Math.round(activity.start * 60);
      const deltaMinutes = startMinutes - currentMinutes;
      if (deltaMinutes <= 0 || deltaMinutes > preMinutes) return;

      const key = `${dayKey}:${activity.id}`;
      if (preAvisoNotifiedRef.current.has(key)) return;
      preAvisoNotifiedRef.current.add(key);

      notify(t('notifications.activityStarting'), {
        body: t('notifications.bodyStarting', {
          activity: activity.title || t('activity.noName'),
          time: formatClock(activity.start),
        }),
        tag: `jikan-pre-${key}`,
      });
    });
  }, [
    notifications.enabled,
    notifyPermission,
    preMinutes,
    realRaw,
    currentMinutes,
    currentTime,
    notify,
    t,
  ]);

  // Shared props for the Pomodoro panel (rendered by both style branches).
  const pomodoroPanelProps = {
    status: pomodoro.status,
    running: pomodoro.running,
    secondsLeft: pomodoro.secondsLeft,
    sessionsToday: pomodoro.sessionsToday,
    label: pomodoro.label,
    onToggle: pomodoro.toggle,
    onReset: pomodoro.reset,
    onSkip: pomodoro.skip,
    isDarkMode: dark,
  };

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
          notificationsEnabled={notifications.enabled && notifyPermission === 'granted'}
          onToggleNotifications={handleToggleNotifications}
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
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center">
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
              <div className="flex flex-wrap justify-center gap-3">
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
                          <p className="font-semibold text-white/85">{panelTitle(id)}</p>
                          <p className="mt-1 text-white/55">{t('panels.empty')}</p>
                        </div>
                      )
                    ) : id === 'stats' ? (
                      <Daily schedule={rawActivities} />
                    ) : id === 'pomodoro' ? (
                      <Pomodoro {...pomodoroPanelProps} isMaru />
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
                        <p className="font-semibold text-slate-500">{panelTitle(id)}</p>
                        <p className="mt-1">{t('panels.empty')}</p>
                      </div>
                    )
                  ) : id === 'list' ? (
                    <ActivityList activities={seiActivities} isDarkMode={dark} isViewingToday={isViewingToday}
                      currentActivityId={seiCurrentId} dayName={currentDay} onActivitySelect={handleSeiClick} />
                  ) : id === 'pomodoro' ? (
                    <div className="w-full mt-6">
                      <Pomodoro {...pomodoroPanelProps} isMaru={false} />
                    </div>
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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        notifications={notifications}
        csv={csvActions}
      />

      <ImportModal
        isOpen={!!importPreview}
        fileName={importPreview?.fileName || ''}
        rows={importPreview?.rows || []}
        errors={importPreview?.errors || []}
        onConfirm={onConfirmImport}
        onClose={onCloseImport}
        isMaru={isMaru}
        isDarkMode={dark}
      />
    </div>
  );
}
