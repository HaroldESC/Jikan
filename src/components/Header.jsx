import { Bell, Moon, Sun, SunMoon, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

const themeIcons = { auto: SunMoon, light: Sun, dark: Moon };

export default function Header({
  title,
  currentTime,
  themeMode,
  onToggleTheme,
  onOpenSettings,
  notificationsEnabled,
  onToggleNotifications,
  isDarkMode,
}) {
  const { t, localeForDate } = useTranslation();
  const themeLabels = { auto: t('theme.auto'), light: t('theme.light'), dark: t('theme.dark') };
  const ThemeIcon = themeIcons[themeMode] || SunMoon;
  const timeStr = currentTime.toLocaleTimeString(localeForDate, { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString(localeForDate, { day: 'numeric', month: 'long' });

  return (
    <header className={`app-header${isDarkMode ? ' app-header--dark' : ''}`}>
      <div className="app-header__row">
        <div className="app-header__left">
          <button
            onClick={onToggleTheme}
            className="app-header__theme-maru"
            title={t('theme.mode', { mode: themeLabels[themeMode] || t('theme.auto') })}
            aria-label={t('theme.changeAria', { mode: themeLabels[themeMode] || t('theme.auto') })}
          >
            <ThemeIcon size={20} />
            <span className="app-header__theme-label">{themeMode}</span>
          </button>
        </div>

        <div className="app-header__brand">
          <h1 className="app-header__title">{title}</h1>
          <div className="app-header__meta-row">
            <span className="app-header__time">{timeStr}</span>
            <span className="app-header__date">{dateStr}</span>
          </div>
        </div>

        <div className="app-header__right">
          {onToggleNotifications && (
            <button
              onClick={onToggleNotifications}
              className={`app-header__notif-btn${notificationsEnabled ? ' app-header__notif-btn--on' : ''}`}
              aria-label={notificationsEnabled ? t('theme.notificationsOn') : t('theme.notificationsOff')}
            >
              <Bell size={18} />
            </button>
          )}
          <button
            onClick={onToggleTheme}
            className="app-header__theme-sei"
            aria-label={t('theme.change')}
          >
            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={onOpenSettings}
            className="app-header__settings-btn"
            aria-label={t('settings.ariaOpen')}
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
