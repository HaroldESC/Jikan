import { createContext, useState, useCallback, useMemo } from 'react';
import es from './locales/es.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

const LANG_KEY = 'jikan-lang';

const LOCALES = { es, en, ja };

const getInitialLang = () => {
  try { return localStorage.getItem(LANG_KEY) || 'es'; } catch { return 'es'; }
};

const flattenKeys = (obj, prefix = '') => {
  let result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
};

const flattened = {};
for (const [lang, data] of Object.entries(LOCALES)) {
  flattened[lang] = flattenKeys(data);
}

export const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLang);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'ja' ? 'ja' : 'es';
  }, []);

  const t = useCallback((key, params) => {
    let msg = flattened[language]?.[key] ?? flattened.es?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, v);
      }
    }
    return msg;
  }, [language]);

  const localeForDate = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'es-ES';

  const DAY_KEY = {
    'Domingo': 'days.sunday', 'Lunes': 'days.monday', 'Martes': 'days.tuesday',
    'Miércoles': 'days.wednesday', 'Jueves': 'days.thursday', 'Viernes': 'days.friday',
    'Sábado': 'days.saturday',
  };
  const dayName = useCallback((day) => t(DAY_KEY[day] || day), [t]);

  const value = useMemo(() => ({ t, language, setLanguage, localeForDate, dayName }), [t, language, setLanguage, localeForDate, dayName]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
