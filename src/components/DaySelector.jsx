import { DAYS_OF_WEEK } from '../utils/index';
import { useTranslation } from '../i18n/useTranslation';

export default function DaySelector({ days = DAYS_OF_WEEK, currentDay, onSelectDay, isDarkMode }) {
  const { t } = useTranslation();
  const getShortLabel = (day) => {
    const lower = day.toLowerCase();
    if (lower.includes('martes')) return 'M';
    if (lower.includes('miércoles')) return 'X';
    return day.charAt(0);
  };

  const isToday = (dayName) => {
    const daysMap = {
      Domingo: 0, Lunes: 1, Martes: 2, 'Miércoles': 3,
      Jueves: 4, Viernes: 5, Sábado: 6,
    };
    return daysMap[dayName] === new Date().getDay();
  };

  return (
    <div className={`day-selector${isDarkMode ? ' day-selector--dark' : ''}`}>
      <div className="day-selector__grid">
        {days.map((day) => {
          const active = currentDay === day;
          const today = isToday(day);

          return (
            <div key={day} className="day-btn-wrapper">
              <button
                onClick={() => onSelectDay(day)}
                className={`day-btn${active ? ' day-btn--active' : ''}${today ? ' day-btn--today' : ''}`}
                aria-current={active ? 'true' : undefined}
                aria-label={t('days.select', { day })}
                title={today ? t('days.todayAria', { day }) : day}
              >
                <span className="day-btn__label">{getShortLabel(day)}</span>
                <span className="day-btn__full">{day}</span>
                {today && <span className="today-dot" />}
              </button>
              {active && <div className="day-indicator" />}
            </div>
          );
        })}
      </div>
      <div className="day-current">{currentDay}</div>
    </div>
  );
}
