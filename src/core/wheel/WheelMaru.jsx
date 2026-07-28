import { useTranslation } from '../../i18n/useTranslation';

const CENTER = 200;
const RADIUS = 180;
const LABEL_RADIUS = 120;
const TOTAL_MINUTES = 24 * 60;

const WheelMaru = ({ schedule, currentDay, onActivitySelect }) => {
  const { t, dayName: translateDay } = useTranslation();
  const isToday = (dayName) => {
    const daysMap = {
      'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
      'Jueves': 4, 'Viernes': 5, 'Sábado': 6
    };
    return daysMap[dayName] === new Date().getDay();
  };

  const createFullSchedule = (schedule) => {
    if (!schedule || schedule.length === 0) {
      return [{
        activity: t('wheel.unassigned'),
        title: t('wheel.unassigned'),
        color: '#d1d5db',
        start: 0,
        end: 24,
        description: t('wheel.noActivitiesDesc'),
        isEmpty: true,
        isFullDay: true
      }];
    }

    const fullSchedule = [];
    let currentMinutes = 0;
    const sortedSchedule = [...schedule].sort((a, b) => a.start - b.start);

    sortedSchedule.forEach((item) => {
      const itemStartMinutes = Math.round(item.start * 60);
      const itemEndMinutes = Math.round(item.end * 60);

      if (currentMinutes < itemStartMinutes) {
        fullSchedule.push({
          activity: t('wheel.free'),
          color: '#e5e7eb',
          start: currentMinutes / 60,
          end: itemStartMinutes / 60,
          description: t('wheel.freeTime'),
          isEmpty: true
        });
      }

      fullSchedule.push({
        ...item,
        start: itemStartMinutes / 60,
        end: itemEndMinutes / 60
      });
      currentMinutes = itemEndMinutes;
    });

    if (currentMinutes < TOTAL_MINUTES) {
      fullSchedule.push({
        activity: t('wheel.free'),
        color: '#e5e7eb',
        start: currentMinutes / 60,
        end: 24,
        description: t('wheel.freeTime'),
        isEmpty: true
      });
    }

    return fullSchedule;
  };

  const fullSchedule = createFullSchedule(schedule);
  let currentAngle = -90;

  const polarToCartesian = (angle, radius) => {
    const rad = (angle * Math.PI) / 180;
    return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
  };

  const formatTime = (hours) => {
    const hour = Math.floor(hours);
    const minutes = Math.round((hours - hour) * 60);
    let adjustedHour = hour;
    let adjustedMinutes = minutes;
    if (minutes === 60) { adjustedHour = hour + 1; adjustedMinutes = 0; }
    if (adjustedHour === 24) adjustedHour = 0;
    return `${adjustedHour.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
  };

  const renderSlices = () =>
    fullSchedule.map((item, index) => {
      const startHours = item.start;
      const endHours = item.end;
      const durationHours = endHours - startHours;
      const angle = (durationHours / 24) * 360;
      const endAngle = currentAngle + angle;
      const largeArcFlag = angle > 180 ? 1 : 0;
      const start = polarToCartesian(currentAngle, RADIUS);
      const end = polarToCartesian(endAngle, RADIUS);
      const path = `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
      const labelAngle = currentAngle + angle / 2;
      const label = polarToCartesian(labelAngle, LABEL_RADIUS);
      let originalIndex = -1;
      if (!item.isEmpty) {
        originalIndex = schedule.findIndex(a =>
          a.id === item.id || (a.start === item.start && a.end === item.end && a.title === item.activity)
        );
      }
      const showLabel = durationHours >= 0.25;

      const sliceContent = (
        <>
          <path d={path} fill={item.color} stroke="white" strokeWidth="2" opacity={item.isEmpty ? "0.4" : "1"} />
          {showLabel && (
            <>
              <text x={label.x} y={item.isFullDay ? label.y : label.y - 5} textAnchor="middle"
                fill={item.isFullDay ? "#9ca3af" : "white"} fontSize={item.isFullDay ? "20" : "16"}
                fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
                {item.title || item.activity}
              </text>
              {!item.isFullDay && (
                <text x={label.x} y={label.y + 14} textAnchor="middle" fill="white" fontSize="12"
                  fontWeight="500" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
                  {formatTime(item.start)}-{formatTime(item.end)}
                </text>
              )}
            </>
          )}
        </>
      );

      currentAngle = endAngle;

      if (item.isEmpty) {
        return (
          <g key={`empty-${index}`} className="wheel-slice wheel-slice-empty animate-arc-reveal"
            style={{ animationDelay: `${index * 0.04}s` }}>
            {sliceContent}
          </g>
        );
      }

      return (
        <g key={`${item.id || item.title}-${index}`} className="wheel-slice wheel-slice-activity animate-arc-reveal"
          style={{ cursor: 'pointer', animationDelay: `${index * 0.04}s` }}
          onClick={(e) => { e.stopPropagation(); onActivitySelect(item, originalIndex, e); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onActivitySelect(item, originalIndex, e); }}>
          {sliceContent}
          <title>{item.title || item.activity}{'\n'}{formatTime(item.start)} - {formatTime(item.end)}{'\n'}
            {item.description || t('wheel.noDescription')}{'\n'}{t('wheel.durationLabel', { hours: Math.floor(durationHours), minutes: Math.round((durationHours % 1) * 60) })}</title>
        </g>
      );
    });

  const renderHourMarks = () => {
    const marks = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * 360 - 90;
      const labelPoint = polarToCartesian(angle, RADIUS - 20);
      marks.push(
        <g key={`hour-${i}`}>
          <line x1={CENTER + (RADIUS - 5) * Math.cos((angle * Math.PI) / 180)}
            y1={CENTER + (RADIUS - 5) * Math.sin((angle * Math.PI) / 180)}
            x2={CENTER + (RADIUS + 5) * Math.cos((angle * Math.PI) / 180)}
            y2={CENTER + (RADIUS + 5) * Math.sin((angle * Math.PI) / 180)}
            stroke="#64748b" strokeWidth="1" opacity="0.3" />
          {i % 2 === 0 && (
            <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle"
              fill="#64748b" fontSize="10" fontWeight="500" opacity="0.6">
              {`${i.toString().padStart(2, '0')}:00`}
            </text>
          )}
        </g>
      );
    }
    return marks;
  };

  return (
    <svg viewBox="0 0 400 400" className="wheel-svg animate-wheel-entrance" style={{ width: '100%', height: 'auto' }}>
      {renderHourMarks()}
      {renderSlices()}
      <circle cx={CENTER} cy={CENTER} r="60" fill="white" opacity="0.95" />
      <text x={CENTER} y={isToday(currentDay) ? CENTER - 8 : CENTER} textAnchor="middle" dominantBaseline="middle"
        fill="#1e293b" fontSize="20" fontWeight="bold">{translateDay(currentDay)}</text>
      {isToday(currentDay) && (
        <text x={CENTER} y={CENTER + 16} textAnchor="middle" dominantBaseline="middle"
          fill="#64748b" fontSize="12">{t('days.today')}</text>
      )}
    </svg>
  );
};

export default WheelMaru;
