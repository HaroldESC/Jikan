export function DaysSelector({ days, activeIndex, todayIndex, isDarkMode, onDaySelect }) {
  return (
    <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 rounded-2xl p-1 mb-2">
      {days.map((day, index) => {
        const isActive = activeIndex === index;
        const isToday = todayIndex === index;
        const btnClass = `relative w-9 h-9 rounded-xl text-xs font-bold transition-all ${
          isActive
            ? 'bg-white text-black shadow-lg dark:bg-white dark:text-black'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
        }`;

        return (
          <button
            key={index}
            onClick={() => onDaySelect(index)}
            className={btnClass}
            aria-label={`Seleccionar ${day}`}
            aria-current={isActive ? 'true' : 'false'}
            title={`${day}${isToday ? ' (hoy)' : ''}`}
          >
            {day}
            {isToday && !isActive && (
              <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
