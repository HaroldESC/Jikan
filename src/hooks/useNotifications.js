import { useCallback, useEffect, useState } from 'react';

/**
 * Browser notifications settings (Web Notifications API, delivered through the
 * service worker when one is available — see v4.0 C4).
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
 * Delivery order (why): `ServiceWorkerRegistration.showNotification()` is used
 * when a service worker controls the page, because notifications raised through
 * `new Notification()` are **not** shown once the tab is in the background on
 * most browsers. The plain constructor stays as a fallback so notifications keep
 * working in dev (no service worker) and on browsers without one.
 *
 * This hook owns no scheduling: the event logic (activity change / pre-aviso)
 * lives in AppLayout, driven by `useClock`.
 */

const storageKey = (userId) => `jikan.notify.${userId || 'anon'}`;

const DEFAULTS = { enabled: false, preMinutes: 5 };

/**
 * Registro **activo** del service worker, o `null` si no hay ninguno.
 *
 * Ojo: `navigator.serviceWorker.controller` es un `ServiceWorker`, no un
 * `ServiceWorkerRegistration` — `showNotification()` vive en el registro, así que
 * hay que pasar por `getRegistration()` y comprobar que esté activo.
 */
const activeRegistration = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active ? registration : null;
  } catch (error) {
    console.warn('Error reading the service worker registration:', error);
    return null;
  }
};

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
  // ¿Hay un service worker activo? Se resuelve de forma asíncrona y se mantiene
  // en estado para que la UI pueda reflejarlo (y para no leerlo en cada render).
  const [hasServiceWorker, setHasServiceWorker] = useState(false);

  // Re-read when the signed-in user changes.
  useEffect(() => {
    setSettings(readSettings(userId));
  }, [userId]);

  useEffect(() => {
    writeSettings(userId, settings);
  }, [settings, userId]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    let cancelled = false;
    const sync = async () => {
      const registration = await activeRegistration();
      if (!cancelled) setHasServiceWorker(Boolean(registration));
    };

    sync();
    // El service worker se registra tras cargar la página, así que hay que
    // reaccionar a `controllerchange` además de al montaje.
    navigator.serviceWorker.addEventListener('controllerchange', sync);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', sync);
    };
  }, []);

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
   * Fires a notification. Returns a promise resolving to true when it was
   * actually handed to the platform.
   *
   * `options.tag` is recommended so repeated events collapse into one. Prefers
   * the service worker (works with the tab in the background) and falls back to
   * the `Notification` constructor when there is none (dev, no SW support).
   */
  const notify = useCallback(async (title, options = {}) => {
    if (!isSupported() || Notification.permission !== 'granted') return false;

    const registration = await activeRegistration();
    if (registration?.showNotification) {
      try {
        await registration.showNotification(title, options);
        return true;
      } catch (error) {
        // Some browsers reject the SW path (e.g. insecure context): fall back.
        console.warn('Service worker notification failed, using fallback:', error);
      }
    }

    try {
      // eslint-disable-next-line no-new
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
    /** `true` cuando las notificaciones salen por el service worker (C4). */
    viaServiceWorker: hasServiceWorker,
  };
}

export default useNotifications;
