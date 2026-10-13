import { createContext, useContext, useState, useCallback } from 'react';

const STYLE_KEY = 'jikan-style';
const THEME_KEY = 'jikan-theme';
const FONT_KEY = 'jikan-font';

const FONTS = ['system', 'serif', 'mono', 'rounded'];

const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'Cascadia Mono', Consolas, monospace",
  rounded: "ui-rounded, 'SF Pro Rounded', 'Segoe UI Rounded', 'Hiragino Maru Gothic ProN', sans-serif",
};

const getInitial = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};

const getInitialFont = () => {
  const value = getInitial(FONT_KEY, 'system');
  return FONTS.includes(value) ? value : 'system';
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => getInitial(THEME_KEY, 'auto'));
  const [style, setStyleState] = useState(() => getInitial(STYLE_KEY, 'maru'));
  const [font, setFontState] = useState(getInitialFont);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const next = prev === 'auto' ? 'light' : prev === 'light' ? 'dark' : 'auto';
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      return next;
    });
  }, []);

  const setStyle = useCallback((s) => {
    setStyleState(s);
    try { localStorage.setItem(STYLE_KEY, s); } catch {}
  }, []);

  const setFont = useCallback((f) => {
    setFontState(f);
    try { localStorage.setItem(FONT_KEY, f); } catch {}
  }, []);

  const isDarkMode = useCallback(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    const hours = new Date().getHours();
    return hours >= 20 || hours < 6;
  }, [themeMode]);

  const bgColor = isDarkMode()
    ? 'from-indigo-900 via-purple-900 to-pink-900'
    : 'from-blue-400 via-cyan-400 to-teal-400';

  const fontFamily = FONT_STACKS[font] ?? FONT_STACKS.system;

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, isDarkMode, bgColor, style, setStyle, font, setFont, fontFamily }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  return ctx;
}
