import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const formatHour = (decimal) => {
  const hours = Math.floor(decimal);
  let minutes = Math.round((decimal - hours) * 60);
  let h = hours;
  if (minutes === 60) { h += 1; minutes = 0; }
  if (h === 24) h = 0;
  return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const formatDuration = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export default function ActivityCard({ activity, currentDay, isDarkMode, onClick, label = 'ACTIVIDAD ACTUAL' }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  if (!activity) return null;

  const currentDecimal = now.getHours() + now.getMinutes() / 60;
  const isCurrent = currentDecimal >= activity.start && currentDecimal < activity.end;

  const progress = isCurrent
    ? Math.min(Math.round(((currentDecimal - activity.start) / (activity.end - activity.start)) * 100), 100)
    : 0;

  const remaining = activity.end - currentDecimal;
  const timeRemaining = isCurrent && remaining > 0
    ? (() => {
        const h = Math.floor(remaining);
        const m = Math.round((remaining - h) * 60);
        if (h > 0 && m > 0) return `${h}h ${m}m restantes`;
        if (h > 0) return `${h}h restantes`;
        if (m > 0) return `${m}m restantes`;
        return 'Finalizando pronto';
      })()
    : null;

  const name = activity.title || activity.activity || 'Actividad sin nombre';
  const timeBadge = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div
      className={`activity-card${isDarkMode ? ' activity-card--dark' : ''}`}
      style={{ '--accent': activity.color }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Ver detalles de ${name}` : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="activity-card__accent" style={{ backgroundColor: activity.color }} />

      <div className="activity-card__header">
        <div className="activity-card__label">
          <Clock size={12} />
          <span>{label}</span>
        </div>
        <div className="activity-card__time-badge">{timeBadge}</div>
      </div>

      <h2 className="activity-card__name">{name}</h2>

      {activity.description && (
        <p className="activity-card__description">{activity.description}</p>
      )}

      <div className="activity-card__times">
        <div className="activity-card__time-block">
          <span className="activity-card__time-label">Horario</span>
          <span className="activity-card__time-value">
            {formatHour(activity.start)} - {formatHour(activity.end)}
          </span>
        </div>
        <div className="activity-card__time-block">
          <span className="activity-card__time-label">Duración</span>
          <span className="activity-card__time-value">{formatDuration(activity.end - activity.start)}</span>
        </div>
      </div>

      {(progress > 0 || timeRemaining) && (
        <div className="activity-card__progress-area">
          <div className="activity-card__progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label="Progreso de la actividad">
            <div className="activity-card__progress-fill" style={{ width: `${progress}%`, backgroundColor: activity.color }} />
          </div>
          {timeRemaining && (
            <span className="activity-card__progress-text">{timeRemaining}</span>
          )}
        </div>
      )}

      {currentDay && (
        <div className="activity-card__day">
          <span className="activity-card__day-label">Programado para</span>
          <span className="activity-card__day-value">{currentDay}</span>
        </div>
      )}
    </div>
  );
}
