/**
 * Header Component
 * 
 * Encabezado de la aplicación con título, hora actual y control de tema.
 */

import { useState } from 'react';
import { Clock } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { SettingsButton, SettingsModal } from './Settings';
import { useTranslation } from '../../i18n/useTranslation';

const Header = ({ currentTime, themeMode, onToggleTheme }) => {
  const { t, localeForDate } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const timeString = currentTime.toLocaleTimeString(localeForDate, {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <header className="app-header">

      <div className="app-header__top">
        <div className="flex-1">
          <ThemeToggle
            themeMode={themeMode}
            onToggle={onToggleTheme}
          />
        </div>

        <h1 className="app-header__title">
          Jikan Maru
        </h1>

        <div className="flex-1 flex justify-end">
          <SettingsButton
            onClick={() => setIsSettingsOpen(true)}
          />
        </div>
      </div>

      <div className="app-header__time">
        <span>{timeString}</span>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </header>
  );
};

export default Header;
