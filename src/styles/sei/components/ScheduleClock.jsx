const timeToMinutes = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const minutesToDegrees = (m) => (m / 1440) * 360;
const polarToCartesian = (cx, cy, r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const describeArc = (x, y, radius, startAngle, endAngle, innerRadius) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);
  const large = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, large, 0, end.x, end.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, large, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
};

export function ScheduleClock({ schedule, nowMinutes, currentActivityId, isViewingToday, isDarkMode, onActivitySelect }) {
  const cx = 150, cy = 150, radius = 120, innerRadius = 70;

  return (
    <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-xl" aria-label="Reloj circular de horario diario">
      <circle cx={cx} cy={cy} r={radius} fill={isDarkMode ? '#1e293b' : '#f1f5f9'} aria-hidden="true" />
      {schedule.length === 0 && (
        <text x={cx} y={cy + 5} textAnchor="middle" className={`text-sm font-medium ${isDarkMode ? 'fill-gray-500' : 'fill-gray-400'}`} aria-hidden="true">
          Sin actividades
        </text>
      )}
      {schedule.map((activity, index) => {
        let startMins = timeToMinutes(activity.start);
        let endMins = timeToMinutes(activity.end);
        if (endMins === 0) endMins = 1440;
        const startAng = minutesToDegrees(startMins);
        const endAng = minutesToDegrees(endMins);
        const isCurrent = isViewingToday && currentActivityId === activity.id;

        return (
          <path
            key={activity.id}
            d={describeArc(cx, cy, radius, startAng, endAng, innerRadius)}
            fill={activity.color}
            opacity={isCurrent ? 1 : 0.5}
            className="cursor-pointer transition-all duration-300 hover:opacity-100 hover:scale-105 origin-center"
            onClick={(e) => onActivitySelect(activity, index, e)}
            onContextMenu={(e) => onActivitySelect(activity, index, e)}
            stroke={isDarkMode ? '#0f172a' : '#ffffff'}
            strokeWidth="2"
            aria-label={`${activity.label} de ${activity.start} a ${activity.end}`}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivitySelect(activity, index, e); } }}
          />
        );
      })}
      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
        const angle = (h / 24) * 360;
        const pos = polarToCartesian(cx, cy, innerRadius - 15, angle);
        return (
          <text key={h} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
            className={`text-[10px] font-bold ${isDarkMode ? 'fill-gray-400' : 'fill-gray-500'}`} aria-hidden="true">
            {h}h
          </text>
        );
      })}
      {isViewingToday && (
        <g transform={`rotate(${minutesToDegrees(nowMinutes)}, ${cx}, ${cy})`}>
          <line x1={cx} y1={cy - innerRadius} x2={cx} y2={cy - radius - 10}
            stroke={isDarkMode ? '#ffffff' : '#334155'} strokeWidth="2" strokeLinecap="round" aria-hidden="true" />
          <circle cx={cx} cy={cy - radius - 10} r="4" fill={isDarkMode ? '#ffffff' : '#334155'} aria-hidden="true" />
        </g>
      )}
      <text x={cx} y={cy - 10} textAnchor="middle" className={`text-sm font-medium ${isDarkMode ? 'fill-gray-400' : 'fill-gray-500'}`} aria-hidden="true">
        {isViewingToday ? 'Ahora' : 'Viendo'}
      </text>
    </svg>
  );
}
