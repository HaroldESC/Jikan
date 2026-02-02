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

            return (
              <div key={day} className="relative pb-3">
                <button
                  key={day}
                  onClick={() => onSelectDay(day)}
                  className={`
                    px-4 py-2 rounded-xl font-medium transition-all duration-300
                    ${currentDay === day 
                      ? 'bg-white text-gray-900 shadow-lg' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                    }
                    ${isToday(day) ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {day}
                    {isToday(day) && (
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    )}
                  </div>
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

            return (
              <button
                key={day}
                onClick={() => onSelectDay(day)}
                className={`
                  px-4 py-2 rounded-xl font-medium transition-all duration-300
                  ${currentDay === day 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                  }
                  ${isToday(day) ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  {day}
                  {isToday(day) && (
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
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
