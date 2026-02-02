/**
 * DaySelector Component
 * 
 * Selector de días con versión móvil y escritorio.
 */

const DaySelector = ({ days, currentDay, onSelectDay }) => {

  const isToday = (dayName) => {
    const daysMap = {
      'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
      'Jueves': 4, 'Viernes': 5, 'Sábado': 6
    };
    const today = new Date().getDay();
    return daysMap[dayName] === today;
  };

  const getShortLabel = (day) => {
    const lower = day.toLowerCase();

    if (lower.includes('martes')) return 'M';
    if (lower.includes('miércoles')) return 'X';

    return day.charAt(0);
  };

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
                  {getShortLabel(day)}
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
          {currentDay}
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
                  {day}
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