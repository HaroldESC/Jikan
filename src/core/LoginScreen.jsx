import React, { useState, useEffect } from 'react';
import { Clock, Mail, Lock, Eye, EyeOff, User, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../i18n/useTranslation';

const LoginScreen = () => {
  const { t, localeForDate } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isNightTime = () => {
    const hours = currentTime.getHours();
    return hours >= 20 || hours < 6;
  };

  const bgGradient = isNightTime()
    ? 'from-indigo-900 via-purple-900 to-pink-900'
    : 'from-blue-400 via-cyan-400 to-teal-400';

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    const { email, password, name } = formData;

    if (!email || !password) {
      setError(t('auth.completeAllFields'));
      setLoading(false);
      return;
    }

    let result;

    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
    }

    if (result.error) {
      setError(result.error.message);
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    setError(null);
    setLoading(true);

    if (!formData.email) {
      setError(t('auth.enterEmail'));
      setLoading(false);
      return;
    }

    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: origin,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const DecorativeWheel = () => {
    const segments = [
      { color: '#4ade80', rotation: 0 },
      { color: '#fb923c', rotation: 60 },
      { color: '#3b82f6', rotation: 120 },
      { color: '#60a5fa', rotation: 180 },
      { color: '#4ade80', rotation: 240 },
      { color: '#fb923c', rotation: 300 }
    ];

    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10">
        <div className="relative w-96 h-96 animate-spin-slow">
          {segments.map((segment, i) => (
            <div
              key={i}
              className="absolute top-0 left-0 w-full h-full"
              style={{ transform: `rotate(${segment.rotation}deg)` }}
            >
              <div
                className="absolute top-0 left-1/2 w-48 h-48 origin-bottom"
                style={{
                  backgroundColor: segment.color,
                  clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center p-6 transition-all duration-1000 relative overflow-hidden`}>
      <DecorativeWheel />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              width: Math.random() * 6 + 2 + 'px',
              height: Math.random() * 6 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s infinite ease-in-out`
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full mb-4">
            <Clock size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Jikan Maru</h1>
          <h2 className="text-xl text-white/90">{t('auth.projectTitle')}</h2>
          <p className="text-white/60 text-sm mt-1">
            {currentTime.toLocaleDateString(localeForDate, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          {resetSent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{t('password.emailSent')}</h3>
              <p className="text-white/70 text-sm mb-6">
                {t('password.emailSentDesc')}
              </p>
              <button
                onClick={() => { setResetMode(false); setResetSent(false); }}
                className="text-white/60 hover:text-white text-sm transition"
              >
                {t('password.backToLogin')}
              </button>
            </div>
          ) : resetMode ? (
            <>
              <button
                onClick={() => { setResetMode(false); setError(null); }}
                className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-4 transition"
              >
                <ArrowLeft size={16} /> {t('password.back')}
              </button>
              <h3 className="text-xl font-bold text-white mb-2">{t('password.recover')}</h3>
              <p className="text-white/60 text-sm mb-6">
                {t('password.sendLinkDescription')}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">
                    {t('auth.email')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                        placeholder="ejemplo@email.com"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="w-full bg-white text-indigo-900 py-3 rounded-xl font-bold hover:bg-white/90 transition transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-60"
                  >
                    {loading ? t('common.sending') : t('password.sendLink')}
                </button>
                {error && (
                  <p className="text-red-300 text-sm text-center mt-4">{error}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 rounded-xl font-semibold transition ${
                    isLogin
                      ? 'bg-white text-indigo-900'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {t('auth.login')}
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 rounded-xl font-semibold transition ${
                    !isLogin
                      ? 'bg-white text-indigo-900'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {t('auth.signup')}
                </button>
              </div>

              <div className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">
                      {t('auth.fullName')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                        placeholder={t('auth.name')}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                      placeholder="ejemplo@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {isLogin && (
                    <button
                      onClick={() => { setResetMode(true); setError(null); }}
                      className="text-white/50 hover:text-white text-xs mt-2 transition"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-white text-indigo-900 py-3 rounded-xl font-bold hover:bg-white/90 transition transform hover:scale-105 active:scale-95 shadow-lg mt-6 disabled:opacity-60"
                >
                  {loading
                    ? t('common.processing')
                    : isLogin
                      ? t('auth.login')
                      : t('auth.createAccount')}
                </button>

                {error && (
                  <p className="text-red-300 text-sm text-center mt-4">
                    {error}
                  </p>
                )}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-white/60">{t('auth.orContinueWith')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl transition">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-20px); }
        }
        .animate-spin-slow {
          animation: spin 60s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
