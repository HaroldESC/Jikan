import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Modo privado (v4.0 C3): opt-out por categoría de datos.
 *
 * Cuando una categoría está desactivada, esos datos **no se guardan** en ningún
 * sitio (ni en el store local ni en Supabase) y **no se sincronizan**:
 *
 *   notes       → las notas de actividad se descartan al guardar
 *   description → la descripción de actividad se descarta al guardar
 *   reminders   → los recordatorios no se persisten (solo viven en memoria)
 *
 * Ajustes en localStorage: `jikan.privacy.<userId | 'anon'>`.
 */

export const PRIVACY_CATEGORIES = ['notes', 'description', 'reminders'];

const DEFAULT_PRIVACY = { notes: true, description: true, reminders: true };

const storageKey = (userId) => `jikan.privacy.${userId || 'anon'}`;

const readStored = (userId) => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_PRIVACY;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PRIVACY;
    // Solo se aceptan las categorías conocidas; el resto se ignora.
    return PRIVACY_CATEGORIES.reduce(
      (acc, key) => ({ ...acc, [key]: parsed[key] !== false }),
      {}
    );
  } catch (error) {
    console.error('Error reading privacy settings:', error);
    return DEFAULT_PRIVACY;
  }
};

export function usePrivacy(userId) {
  const [privacy, setPrivacyState] = useState(() => readStored(userId));

  // Re-lee al cambiar de usuario (invitado <-> cuenta).
  useEffect(() => {
    setPrivacyState(readStored(userId));
  }, [userId]);

  // Guarda solo si algo se ha desactivado: en la configuración por defecto no
  // dejamos rastro en localStorage.
  useEffect(() => {
    const isDefault = PRIVACY_CATEGORIES.every((key) => privacy[key]);
    try {
      if (isDefault) window.localStorage.removeItem(storageKey(userId));
      else window.localStorage.setItem(storageKey(userId), JSON.stringify(privacy));
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    }
  }, [privacy, userId]);

  const setCategory = useCallback((category, enabled) => {
    if (!PRIVACY_CATEGORIES.includes(category)) return;
    setPrivacyState((prev) => ({ ...prev, [category]: Boolean(enabled) }));
  }, []);

  const toggle = useCallback((category) => {
    if (!PRIVACY_CATEGORIES.includes(category)) return;
    setPrivacyState((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const restoreDefaults = useCallback(() => setPrivacyState(DEFAULT_PRIVACY), []);

  return useMemo(
    () => ({
      ...privacy,
      setCategory,
      toggle,
      restoreDefaults,
      /** Todas las categorías activas → no hay nada que ocultar. */
      isFullyPrivate: PRIVACY_CATEGORIES.every((key) => !privacy[key]),
    }),
    [privacy, setCategory, toggle, restoreDefaults]
  );
}

export default usePrivacy;