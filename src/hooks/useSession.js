import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GUEST_USER_ID } from '../lib/activityStore';

// Flags del modo invitado (localStorage, síncrono y por navegador).
//   jikan.guest          → "1" mientras se usa Jikan sin cuenta
//   jikan.guest.wasGuest → "1" si en este dispositivo se entró alguna vez como invitado
//   jikan.guest.answered → "1" si el usuario ya respondió a la oferta de migración
const GUEST_FLAG = 'jikan.guest';
const WAS_GUEST_FLAG = 'jikan.guest.wasGuest';
const ANSWERED_FLAG = 'jikan.guest.answered';

const readFlag = (key) => {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (key, value) => {
  try {
    if (value) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
  }
};

export const guestFlags = {
  isGuest: () => readFlag(GUEST_FLAG),
  wasGuest: () => readFlag(WAS_GUEST_FLAG),
  isAnswered: () => readFlag(ANSWERED_FLAG),
  /** Marca la oferta de migración como resuelta (subir, importar o descartar). */
  markAnswered: () => writeFlag(ANSWERED_FLAG, true),
  /** Limpia el estado de invitado al terminar la migración. */
  clear: () => {
    writeFlag(GUEST_FLAG, false);
    writeFlag(WAS_GUEST_FLAG, false);
    writeFlag(ANSWERED_FLAG, false);
  },
};

/**
 * Sesión de Supabase + modo invitado.
 *
 * `user` es siempre el usuario de Supabase (o `null`). `isGuest` indica que no
 * hay sesión pero el usuario eligió usar Jikan sin cuenta; en ese caso la app
 * opera con el pseudo-usuario `{ id: GUEST_USER_ID, isGuest: true }`.
 */
export function useSession() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => readFlag(GUEST_FLAG));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

    return () => listener.subscription.unsubscribe();
  }, []);

  /** Entra en modo local: los datos se guardan solo en este dispositivo. */
  const startGuest = useCallback(() => {
    writeFlag(GUEST_FLAG, true);
    writeFlag(WAS_GUEST_FLAG, true);
    setIsGuest(true);
  }, []);

  /** Sale del modo local y vuelve a la pantalla de inicio de sesión. */
  const exitGuest = useCallback(() => {
    writeFlag(GUEST_FLAG, false);
    setIsGuest(false);
  }, []);

  // El usuario real manda sobre el modo invitado: si aparece una sesión de
  // Supabase, el flag local deja de aplicar en el gate de `App`.
  const guestActive = isGuest && !user;

  // Pseudo-usuario estable (misma referencia entre renders) para que los hooks
  // derivados (paneles, recordatorios, pomodoro, notificaciones) no se recreen.
  const guestUser = useMemo(() => ({ id: GUEST_USER_ID, isGuest: true }), []);

  return {
    user,
    loading,
    isGuest: guestActive,
    startGuest,
    exitGuest,
    guestUser,
  };
}