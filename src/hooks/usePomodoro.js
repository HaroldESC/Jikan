import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pomodoro timer — states: idle → focus → break → focus …
 *
 * - The countdown is driven by an end timestamp (`endsAt`), never by tick
 *   counts, so a throttled/backgrounded tab stays accurate: every tick (and
 *   `visibilitychange`) recomputes the remaining seconds from the clock.
 * - Completed focus sessions are counted per local day and persisted in
 *   localStorage keyed per user: `jikan.pomodoro.<userId || 'anon'>` →
 *   { '2026-10-03': 4 }. The map is pruned to the current day on write, so
 *   the count "resets" naturally at local midnight.
 * - Works standalone (no activity selected) and can be tied to the current
 *   activity by passing an optional `label` (activity title).
 *
 * Durations are configurable via `setFocusMinutes` / `setBreakMinutes`
 * (defaults 25 / 5, clamped to 1–180). Changing them affects the next phase;
 * while idle it also resets the displayed countdown.
 */

const storageKey = (userId) => `jikan.pomodoro.${userId || 'anon'}`;

const localDayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const readCounts = (userId) => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    // Keep only numeric counts.
    const counts = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        counts[key] = Math.floor(value);
      }
    });
    return counts;
  } catch (error) {
    console.error('Error reading pomodoro sessions:', error);
    return {};
  }
};

const writeCounts = (userId, counts) => {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(counts));
  } catch (error) {
    console.error('Error saving pomodoro sessions:', error);
  }
};

const clampDuration = (value) => {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(180, Math.max(1, numeric));
};

export function usePomodoro(userId, label) {
  // ── Configurable durations (minutes) ──
  const [focusMinutes, setFocusMinutesState] = useState(25);
  const [breakMinutes, setBreakMinutesState] = useState(5);

  // ── Timer state ──
  const [status, setStatus] = useState('idle'); // 'idle' | 'focus' | 'break'
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);

  // ── Completed focus sessions per local day ──
  const [counts, setCounts] = useState(() => readCounts(userId));

  // Epoch ms when the current phase ends (source of truth while running).
  const endsAtRef = useRef(null);

  // Re-read counts when the signed-in user changes.
  useEffect(() => {
    setCounts(readCounts(userId));
  }, [userId]);

  useEffect(() => {
    writeCounts(userId, counts);
  }, [counts, userId]);

  // While idle, the countdown mirrors the focus duration.
  useEffect(() => {
    if (status === 'idle') setSecondsLeft(focusMinutes * 60);
  }, [status, focusMinutes]);

  /**
   * Advance to the next phase. When leaving `focus`, `countSession` decides
   * whether the completed session is added to today's counter (skip doesn't).
   */
  const advancePhase = useCallback((countSession) => {
    if (status === 'focus') {
      if (countSession) {
        setCounts((prev) => {
          const key = localDayKey();
          const next = { [key]: (prev[key] || 0) + 1 };
          return next; // prune: only today's count is kept
        });
      }
      const nextSeconds = breakMinutes * 60;
      endsAtRef.current = Date.now() + nextSeconds * 1000;
      setSecondsLeft(nextSeconds);
      setStatus('break');
    } else if (status === 'break') {
      const nextSeconds = focusMinutes * 60;
      endsAtRef.current = Date.now() + nextSeconds * 1000;
      setSecondsLeft(nextSeconds);
      setStatus('focus');
    }
  }, [status, focusMinutes, breakMinutes]);

  // ── Countdown: timestamp math, safe under tab throttling ──
  useEffect(() => {
    if (!running || status === 'idle' || endsAtRef.current == null) return undefined;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((endsAtRef.current - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining <= 0) advancePhase(true);
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    const handleVisibility = () => {
      if (!document.hidden) tick(); // catch up immediately when the tab returns
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [running, status, advancePhase]);

  // ── Controls ──
  const start = useCallback(() => {
    if (status === 'idle') {
      const nextSeconds = focusMinutes * 60;
      endsAtRef.current = Date.now() + nextSeconds * 1000;
      setSecondsLeft(nextSeconds);
      setStatus('focus');
    } else {
      // Resume: restart the clock from the frozen remaining time.
      endsAtRef.current = Date.now() + Math.max(0, secondsLeft) * 1000;
    }
    setRunning(true);
  }, [status, secondsLeft, focusMinutes]);

  const pause = useCallback(() => {
    if (endsAtRef.current != null) {
      const remaining = Math.max(
        0,
        Math.ceil((endsAtRef.current - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    }
    setRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (running) pause();
    else start();
  }, [running, pause, start]);

  const reset = useCallback(() => {
    setRunning(false);
    endsAtRef.current = null;
    setStatus('idle');
    setSecondsLeft(focusMinutes * 60);
  }, [focusMinutes]);

  const skip = useCallback(() => {
    if (status === 'idle') return;
    advancePhase(false); // skipping a focus does not count as a session
  }, [status, advancePhase]);

  const setFocusMinutes = useCallback((value) => {
    setFocusMinutesState(clampDuration(value));
  }, []);

  const setBreakMinutes = useCallback((value) => {
    setBreakMinutesState(clampDuration(value));
  }, []);

  return {
    status,            // 'idle' | 'focus' | 'break'
    running,           // boolean
    secondsLeft,       // seconds remaining in the current phase
    sessionsToday: counts[localDayKey()] || 0,
    label,             // optional current-activity title
    focusMinutes,
    breakMinutes,
    setFocusMinutes,
    setBreakMinutes,
    start,
    pause,
    toggle,
    reset,
    skip,
  };
}

export default usePomodoro;
