import { useEffect, useState } from 'react';
import LoginScreen from './core/LoginScreen';
import ResetPassword from './core/ResetPassword';
import MainShell from './core/MainShell';
import { useSession } from './hooks/useSession';

export default function App() {
  const { user, loading, isGuest, startGuest, exitGuest, guestUser } = useSession();
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
      setRecoveryMode(true);
      window.location.hash = '';
    }
  }, []);

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
    />
  );
}