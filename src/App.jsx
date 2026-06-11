import { useEffect, useState } from 'react';
import LoginScreen from './core/LoginScreen';
import ResetPassword from './core/ResetPassword';
import JikanApp from './JikanApp';
import SeiApp from './styles/sei/SeiApp';
import { useSession } from './hooks/useSession';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { user, loading } = useSession();
  const { style } = useTheme();
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setRecoveryMode(true);
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

  return (
    <div key={style} className="animate-fadeIn">
      {style === 'maru' ? <JikanApp user={user} /> : <SeiApp user={user} />}
    </div>
  );
}
