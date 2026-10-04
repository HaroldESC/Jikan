/**
 * Pomodoro — panel content shared by both styles.
 *
 * Presentational only: all timer logic lives in `usePomodoro` (wired up by
 * AppLayout). Shows the state label (foco/descanso), the MM:SS countdown,
 * today's completed focus sessions and the Start/Pause, Reset and Skip
 * controls (lucide icons only).
 *
 * - Maru: glassmorphism card (like Daily / Reminders inside Panel).
 * - Sei: pure Tailwind with `isDarkMode` ternaries (same convention as the
 *   rest of the Sei content — there is no `.dark` class strategy in the app).
 */
import { Play, Pause, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

const STATE_KEYS = {
  idle: 'pomodoro.idle',
  focus: 'pomodoro.focus',
  break: 'pomodoro.break',
};

const formatMMSS = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const maruSkin = {
  card: 'bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white',
  topRow: 'flex items-center justify-between gap-3',
  state: 'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70',
  label: 'text-xs text-white/55 truncate max-w-[55%]',
  time: 'text-center text-5xl font-bold tabular-nums my-4 text-white',
  sessions: 'text-center text-sm text-white/65 mb-4',
  controls: 'flex items-center gap-2',
  primary:
    'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition bg-white/20 hover:bg-white/30 text-white disabled:opacity-40 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center px-3 py-2.5 rounded-xl transition bg-white/10 hover:bg-white/20 text-white/85 disabled:opacity-40 disabled:cursor-not-allowed',
};

const seiSkin = (dark) => ({
  card: `w-full rounded-xl border p-6 ${
    dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
  }`,
  topRow: 'flex items-center justify-between gap-3',
  state: `inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
    dark ? 'text-slate-400' : 'text-slate-500'
  }`,
  label: `text-xs truncate max-w-[55%] ${dark ? 'text-slate-500' : 'text-slate-400'}`,
  time: `text-center text-5xl font-bold tabular-nums my-4 ${
    dark ? 'text-white' : 'text-slate-900'
  }`,
  sessions: `text-center text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`,
  controls: 'flex items-center gap-2',
  primary:
    'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed',
  secondary: `inline-flex items-center justify-center px-3 py-2.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
    dark
      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
  }`,
});

export default function Pomodoro({
  status = 'idle',
  secondsLeft = 0,
  running = false,
  sessionsToday = 0,
  label,
  onToggle,
  onReset,
  onSkip,
  isMaru = true,
  isDarkMode = false,
}) {
  const { t } = useTranslation();

  const isRunning = running && status !== 'idle';
  const stateLabel = t(STATE_KEYS[status] || STATE_KEYS.idle);
  const timeStr = formatMMSS(secondsLeft);
  const skin = isMaru ? maruSkin : seiSkin(isDarkMode);

  return (
    <section className={skin.card}>
      {/* ── State + optional activity label ── */}
      <div className={skin.topRow}>
        <span className={skin.state}>
          <Timer size={14} />
          {stateLabel}
        </span>
        {label && (
          <span className={skin.label} title={label}>
            {label}
          </span>
        )}
      </div>

      {/* ── MM:SS countdown ── */}
      <p className={skin.time} role="timer" aria-live="off">
        {timeStr}
      </p>

      {/* ── Completed focus sessions today ── */}
      <p className={skin.sessions}>
        {t('pomodoro.sessions', { count: sessionsToday })}
      </p>

      {/* ── Controls ── */}
      <div className={skin.controls}>
        <button
          type="button"
          onClick={onToggle}
          className={skin.primary}
          aria-label={isRunning ? t('pomodoro.pause') : t('pomodoro.start')}
          title={isRunning ? t('pomodoro.pause') : t('pomodoro.start')}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
          {isRunning ? t('pomodoro.pause') : t('pomodoro.start')}
        </button>
        <button
          type="button"
          onClick={onReset}
          className={skin.secondary}
          aria-label={t('pomodoro.reset')}
          title={t('pomodoro.reset')}
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={status === 'idle'}
          className={skin.secondary}
          aria-label={t('pomodoro.skip')}
          title={t('pomodoro.skip')}
        >
          <SkipForward size={16} />
        </button>
      </div>
    </section>
  );
}
