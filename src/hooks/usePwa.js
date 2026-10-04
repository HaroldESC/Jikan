import { useCallback, useEffect, useState } from 'react';

/**
 * Estado de la PWA (v4.0 C4).
 *
 * - **Service worker**: espera a que se registre y controle la página.
 * - **Instalación**: captura `beforeinstallprompt` (Chrome/Edge/Android) para
 *   poder ofrecer el botón "Instalar app" desde Configuración. En iOS/Safari no
 *   existe ese evento, así que `canInstall` es `false` y la app ya es instalable
 *   con "Añadir a pantalla de inicio".
 * - **Offline**: expone el estado de `navigator.onLine`.
 * - **Actualizaciones**: con `registerType: 'autoUpdate'` el service worker
 *   actualiza solo y llama a `skipWaiting`; estas banderas sirven para informar,
 *   no para pedir permiso.
 *
 * El registro lo hace `vite-plugin-pwa` (script inyectado en `index.html` en
 * build); aquí solo se consume `navigator.serviceWorker`.
 */

const isBrowser = () => typeof window !== 'undefined';

/** ¿La app ya está instalada como nativa (standalone / display-mode)? */
const isStandalone = () => {
  if (!isBrowser()) return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.matchMedia?.('(display-mode: fullscreen)').matches === true ||
    window.navigator.standalone === true
  );
};

export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [swControlled, setSwControlled] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (isBrowser() ? !navigator.onLine : false));

  useEffect(() => {
    // `beforeinstallprompt` solo se emite una vez y antes de instalar.
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // App instalada en otra pestaña/ventana.
    const media = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayModeChange = (event) => setIsInstalled(event.matches);
    media?.addEventListener?.('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', onDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    const online = () => setIsOffline(false);
    const offline = () => setIsOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      setSwControlled(Boolean(navigator.serviceWorker.controller));
    };

    sync();
    navigator.serviceWorker.ready.then(sync).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', sync);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', sync);
    };
  }, []);

  /**
   * Lanza el diálogo de instalación del navegador.
   * @returns {Promise<'accepted'|'dismissed'|'unavailable'>}
   */
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    const prompt = deferredPrompt;
    setDeferredPrompt(null);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      return outcome;
    } catch (error) {
      console.warn('Error showing the install prompt:', error);
      return 'dismissed';
    }
  }, [deferredPrompt]);

  return {
    /** El navegador ha emitido `beforeinstallprompt` y aún no se ha instalado. */
    canInstall: deferredPrompt != null && !isInstalled,
    isInstalled,
    isOffline,
    /** Hay un service worker controlando la página (la app ya es "offline-capable"). */
    offlineReady: swControlled,
    promptInstall,
    /** ¿La plataforma soporta service workers? */
    supported: isBrowser() && 'serviceWorker' in navigator,
  };
}

export default usePwa;