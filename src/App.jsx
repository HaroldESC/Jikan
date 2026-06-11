import { useEffect, useState } from 'react';
import LoginScreen from './core/LoginScreen';
import ResetPassword from './core/ResetPassword';
import MainShell from './core/MainShell';
import { useSession } from './hooks/useSession';

export default function App() {
  const { user, loading } = useSession();
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

  if (!user) {
    return <LoginScreen />;
  }

  return <MainShell user={user} />;
}
