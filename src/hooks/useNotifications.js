import { useCallback, useEffect, useState } from 'react';

/**
 * Browser notifications settings (Web Notifications API, no service worker —
 * that arrives with PWA support in a later version).
 *
 * - `permission` mirrors `Notification.permission` ('default' | 'granted' |
 *   'denied'); `requestPermission()` prompts the browser the first time.
 * - User settings are persisted per user in localStorage:
 *   `jikan.notify.<userId || 'anon'>` → { enabled: boolean, preMinutes: number }
 *   defaults: { enabled: false, preMinutes: 5 }.
 * - `notify(title, options)` is a safe fire-and-forget helper: it only fires
 *   when permission is granted, guards against unsupported/insecure contexts
 *   and passes a stable `tag` so duplicate notifications collapse.
 *
 * This hook owns no scheduling: the event logic (activity change / pre-aviso)
 * lives in AppLayout, driven by `useClock`.
 */

const storageKey = (userId) => `jikan.notify.${userId || 'anon'}`;

const DEFAULTS = { enabled: false, preMinutes: 5 };

const clampPreMinutes = (value) => {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return DEFAULTS.preMinutes;
  return Math.min(60, Math.max(0, numeric));
};

const readSettings = (userId) => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULTS };
    return {
      enabled: parsed.enabled === true,
      preMinutes: clampPreMinutes(parsed.preMinutes ?? DEFAULTS.preMinutes),
    };
  } catch (error) {
    console.error('Error reading notification settings:', error);
    return { ...DEFAULTS };
  }
};

const writeSettings = (userId, settings) => {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
};

const isSupported = () => typeof Notification !== 'undefined';

export function useNotifications(userId) {
  const [settings, setSettings] = useState(() => readSettings(userId));
  const [permission, setPermission] = useState(() =>
    isSupported() ? Notification.permission : 'denied'
  );

  // Re-read when the signed-in user changes.
  useEffect(() => {
    setSettings(readSettings(userId));
  }, [userId]);

  useEffect(() => {
    writeSettings(userId, settings);
  }, [settings, userId]);

  const requestPermission = useCallback(async () => {
    if (!isSupported()) {
      setPermission('denied');
      return 'denied';
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      const current = Notification.permission;
      setPermission(current);
      return current;
    }
  }, []);

  const setEnabled = useCallback((value) => {
    setSettings((prev) => ({ ...prev, enabled: value === true }));
  }, []);

  const setPreMinutes = useCallback((value) => {
    setSettings((prev) => ({ ...prev, preMinutes: clampPreMinutes(value) }));
  }, []);

  /**
   * Fire a notification. Returns true when it was actually shown.
   * `options.tag` is recommended so repeated events collapse into one.
   */
  const notify = useCallback((title, options = {}) => {
    if (!isSupported() || Notification.permission !== 'granted') return false;
    try {
      new Notification(title, options);
      return true;
    } catch (error) {
      console.warn('Error showing notification:', error);
      return false;
    }
  }, []);

  return {
    supported: isSupported(),
    permission,               // 'default' | 'granted' | 'denied'
    requestPermission,
    enabled: settings.enabled,
    setEnabled,
    preMinutes: settings.preMinutes,
    setPreMinutes,
    notify,
  };
}

export default useNotifications;
