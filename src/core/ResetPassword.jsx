import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../i18n/useTranslation';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
      }
    });
  }, []);

  const handleReset = async () => {
    setError(null);

    if (!password) {
      setError(t('password.enterNewPassword'));
      return;
    }

    if (password.length < 6) {
      setError(t('password.minLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('password.passwordsDontMatch'));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full text-center text-white">
          <h2 className="text-2xl font-bold mb-4">{t('password.passwordUpdated')}</h2>
          <p className="text-white/70 mb-6">{t('password.passwordUpdatedDesc')}</p>
          <a
            href="/"
            className="inline-block bg-white text-indigo-900 py-3 px-8 rounded-xl font-bold hover:bg-white/90 transition"
          >
            {t('password.goToLogin')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full text-white">
        <h2 className="text-2xl font-bold mb-2">{t('password.reset')}</h2>
        <p className="text-white/60 text-sm mb-6">{t('password.resetDescription')}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">{t('password.newPassword')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">{t('password.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full bg-white text-indigo-900 py-3 rounded-xl font-bold hover:bg-white/90 transition transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-60"
          >
            {loading ? t('common.saving') : t('password.changePassword')}
          </button>

          {error && (
            <p className="text-red-300 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
