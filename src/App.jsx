import { useCallback, useEffect, useState } from 'react';
import LoginScreen from './core/LoginScreen';
import ResetPassword from './core/ResetPassword';
import MainShell from './core/MainShell';
import UnlockScreen from './core/common/UnlockScreen';
import { useSession } from './hooks/useSession';
import { useEncryption } from './hooks/useEncryption';
import { localStore } from './lib/activityStore';
import { backupStore } from './lib/backupStore';
import { clearEncryptionSettings } from './hooks/useEncryption';

export default function App() {
  const { user, loading, isGuest, startGuest, exitGuest, guestUser } = useSession();
  const encryption = useEncryption();
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
      setRecoveryMode(true);
      window.location.hash = '';
    }
  }, []);

  const handleUnlock = useCallback((passphrase) => encryption.unlock(passphrase), [encryption]);

  /**
   * Salida de emergencia: sin la passphrase los datos cifrados no son
   * recuperables, así que se borran del dispositivo y Jikan empieza de cero.
   */
  const handleForgetPassphrase = useCallback(async () => {
    try {
      await localStore.clear();
      await backupStore.clear(user?.id ?? 'guest');
    } catch (error) {
      console.error('Error wiping encrypted local data:', error);
    }
    clearEncryptionSettings();
    encryption.refresh();
  }, [encryption, user?.id]);

  // El candado se comprueba antes que la sesión: con cifrado activo la app no
  // muestra nada hasta escribir la passphrase, haya cuenta o no. La MISMA
  // instancia de `useEncryption` se pasa a `MainShell` para que el estado
  // (enabled / unlocked / error) no se duplique en dos hooks sueltos.
  if (encryption.enabled && !encryption.unlocked) {
    return (
      <UnlockScreen
        onUnlock={handleUnlock}
        onForget={handleForgetPassphrase}
        busy={encryption.busy}
        error={encryption.error?.code ?? null}
        errorMessage={encryption.error?.message ?? ''}
      />
    );
  }

  if (recoveryMode) {
    return <ResetPassword />;
  }

  if (loading) {
    return null;
  }

  // Sin sesión de Supabase y sin modo invitado → pantalla de acceso.
  if (!user && !isGuest) {
    return <LoginScreen onContinueAsGuest={startGuest} />;
  }

  return (
    <MainShell
      user={user ?? guestUser}
      isGuest={isGuest}
      onExitGuest={exitGuest}
      encryption={encryption}
    />
  );
}