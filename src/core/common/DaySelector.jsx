/**
 * DaySelector Component
 * 
 * Selector de días con versión móvil y escritorio.
 */

import { useTranslation } from '../../i18n/useTranslation';

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

const DaySelector = ({ days, currentDay, onSelectDay }) => {
  const { t } = useTranslation();

  const isToday = (dayName) => {
    const daysMap = {
      'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
      'Jueves': 4, 'Viernes': 5, 'Sábado': 6
    };
    const today = new Date().getDay();
    return daysMap[dayName] === today;
  };

  const dayLabel = (day) => t(DAY_KEY_MAP[day] || day);

  return (
    <div className="day-selector">

      {/* MÓVIL */}
      <div className="block sm:hidden">
        <div className="day-selector__mobile-grid">
          {days.map(day => {
            const isActive = currentDay === day;
            const today = isToday(day);

            return (
              <div key={day} className="relative pb-3">
                <button
                  onClick={() => onSelectDay(day)}
                  className={`
                    day-btn 
                    ${isActive ? 'day-btn--active' : ''}
                    ${today ? 'day-btn--today' : ''}
                  `}
                >
                  {SHORT_LABELS[day]}
                  {today && (
                    <span className="today-dot"></span>
                  )}
                </button>

                {isActive && (
                  <div className="day-indicator" />
                )}
              </div>
            );
          })}
        </div>

        <div className="day-current">
          {dayLabel(currentDay)}
        </div>
      </div>

      {/* ESCRITORIO */}
      <div className="hidden sm:block">
        <div className="day-selector__desktop-grid">
          {days.map(day => {
            const isActive = currentDay === day;
            const today = isToday(day);

            return (
              <button
                key={day}
                onClick={() => onSelectDay(day)}
                className={`
                  day-btn day-btn--desktop 
                  ${isActive ? 'day-btn--active' : ''}
                  ${today ? 'day-btn--today' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  {dayLabel(day)}
                  {today && (
                    <span className="today-dot"></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DaySelector;