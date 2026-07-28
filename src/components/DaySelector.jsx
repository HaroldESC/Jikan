import { DAYS_OF_WEEK } from '../utils/index';
import { useTranslation } from '../i18n/useTranslation';

const DAY_KEY_MAP = {
  'Domingo': 'days.sunday',
  'Lunes': 'days.monday',
  'Martes': 'days.tuesday',
  'Miércoles': 'days.wednesday',
  'Jueves': 'days.thursday',
  'Viernes': 'days.friday',
  'Sábado': 'days.saturday',
};

const SHORT_LABELS = {
  'Domingo': 'D', 'Lunes': 'L', 'Martes': 'M', 'Miércoles': 'X',
  'Jueves': 'J', 'Viernes': 'V', 'Sábado': 'S',
};

export default function DaySelector({ days = DAYS_OF_WEEK, currentDay, onSelectDay, isDarkMode }) {
  const { t } = useTranslation();

  const isToday = (dayName) => {
    const daysMap = {
      Domingo: 0, Lunes: 1, Martes: 2, 'Miércoles': 3,
      Jueves: 4, Viernes: 5, Sábado: 6,
    };
    return daysMap[dayName] === new Date().getDay();
  };

  const dayLabel = (day) => t(DAY_KEY_MAP[day] || day);

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
                aria-label={t('days.select', { day: dayLabel(day) })}
                title={today ? t('days.todayAria', { day: dayLabel(day) }) : dayLabel(day)}
              >
                <span className="day-btn__label">{SHORT_LABELS[day]}</span>
                <span className="day-btn__full">{dayLabel(day)}</span>
                {today && <span className="today-dot" />}
              </button>
              {active && <div className="day-indicator" />}
            </div>
          );
        })}
      </div>
      <div className="day-current">{dayLabel(currentDay)}</div>
    </div>
  );
}
