import { useState, useCallback } from 'react';

const STYLE_KEY = 'jikan-style';
const THEME_KEY = 'jikan-theme';

const getInitial = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export const useTheme = () => {
  const [themeMode, setThemeMode] = useState(() => getInitial(THEME_KEY, 'auto'));
  const [style, setStyleState] = useState(() => getInitial(STYLE_KEY, 'maru'));

  const persistTheme = (mode) => {
    setThemeMode(mode);
    try { localStorage.setItem(THEME_KEY, mode); } catch {}
  };

  const setStyle = useCallback((s) => {
    setStyleState(s);
    try { localStorage.setItem(STYLE_KEY, s); } catch {}
  }, []);

  const isNightTime = () => {
    const hours = new Date().getHours();
    return hours >= 20 || hours < 6;
  };

  const isDarkMode = () => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return isNightTime();
  };

  const toggleTheme = () => {
    persistTheme(themeMode === 'auto' ? 'light' : themeMode === 'light' ? 'dark' : 'auto');
  };

  const bgColor = isDarkMode()
    ? 'from-indigo-900 via-purple-900 to-pink-900'
    : 'from-blue-400 via-cyan-400 to-teal-400';

  return { themeMode, toggleTheme, isDarkMode, bgColor, isNightTime, style, setStyle };
};
