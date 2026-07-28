/**
 * ThemeToggle Component
 * 
 * Botón para cambiar entre modos de tema (automático, claro, oscuro).
 */

import { Sun, Moon, SunMoon } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

const ThemeToggle = ({ themeMode, onToggle }) => {
  const { t } = useTranslation();

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Sun size={20} />;
      case 'night':
        return <Moon size={20} />;
      default:
        return <SunMoon size={20} />;
    }
  };

  const getThemeLabel = () => {
    if (themeMode === 'auto') return t('theme.auto');
    if (themeMode === 'light') return t('theme.light');
    return t('theme.dark');
  };

  return (
    <button
      onClick={onToggle}
      className="theme-toggle-btn"
      title={t('theme.mode', { mode: getThemeLabel() })}
      aria-label={t('theme.changeAria', { mode: getThemeLabel() })}
    >
      <span className="theme-toggle-icon">
        {getThemeIcon()}
      </span>

      <span className="theme-toggle-text">
        {themeMode}
      </span>
    </button>
  );
};

export default ThemeToggle;
