import { useTranslation } from '../../i18n/useTranslation';

export function ActivityList({ activities, isDarkMode, isViewingToday, currentActivityId, dayName, onActivitySelect }) {
  const { t, dayName: translateDay } = useTranslation();
  const isCurrent = (a) => isViewingToday && currentActivityId === a.id;

  return (
    <section className="w-full" aria-label="Lista de actividades del día">
      <header>
        <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 flex justify-between ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <span>{t('header.planFor', { day: translateDay(dayName) })}</span>
          {!isViewingToday && (
            <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 rounded text-slate-500" aria-label={t('header.previewLabel')}>
              {t('header.preview')}
            </span>
          )}
        </h3>
      </header>
      <div className="space-y-3 pb-10" role="list">
        {activities.map((activity, index) => (
          <article
            key={activity.id}
            onClick={(e) => onActivitySelect(activity, index, e)}
            onContextMenu={(e) => onActivitySelect(activity, index, e)}
            role="listitem"
            aria-label={t('detail.aria.activityLabel', { label: activity.label, start: activity.start, end: activity.end })}
            className={`flex items-center p-3 rounded-2xl border cursor-pointer hover:scale-[1.01] transition-transform duration-200 ${
              isDarkMode ? 'border-slate-800 bg-slate-800/50 hover:bg-slate-800/70' : 'border-slate-100 bg-white hover:bg-slate-50'
            } ${isCurrent(activity) ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md' : ''}`}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivitySelect(activity, index, e); } }}
          >
            <div className="w-3 h-10 rounded-full mr-4 flex-shrink-0" style={{ backgroundColor: activity.color }} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <h4 className="font-semibold text-sm truncate">{activity.label}</h4>
                <time className="text-xs font-mono opacity-60 flex-shrink-0 ml-2" dateTime={`${activity.start}/${activity.end}`}>
                  {activity.start} - {activity.end}
                </time>
              </div>
              <p className="text-xs opacity-60 line-clamp-1" title={activity.description}>{activity.description}</p>
            </div>
            {isCurrent(activity) && <span className="sr-only">{t('detail.aria.currentActivity')}</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
