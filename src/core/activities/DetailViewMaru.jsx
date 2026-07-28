import { useState } from 'react';
import { ChevronLeft, Clock, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import ThemeToggle from '../common/ThemeToggle';

const formatHour = (decimalHour) => {
  const hours = Math.floor(decimalHour);
  const minutes = Math.round((decimalHour - hours) * 60);
  let adjustedHour = hours;
  let adjustedMinutes = minutes;
  if (minutes === 60) {
    adjustedHour = hours + 1;
    adjustedMinutes = 0;
  }
  if (adjustedHour === 24) {
    adjustedHour = 0;
  }
  return `${adjustedHour.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
};

const formatDuration = (decimalHours) => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const decimalToMinutes = (decimalHours) => Math.round(decimalHours * 60);

const DetailViewMaru = ({
  activity,
  day,
  bgColor,
  themeMode,
  onBack,
  onToggleTheme
}) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');

  if (!activity) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgColor} p-6 transition-all duration-1000`}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition mb-4"
          >
            <ChevronLeft size={20} />
            {t('common.back')}
          </button>
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-white text-center">
            <p>{t('detail.noActivity')}</p>
          </div>
        </div>
      </div>
    );
  }

  const activityName = activity.title || activity.activity || t('activity.noName');
  const activityDescription = activity.description || t('activity.noDescription');
  const activityColor = activity.color || '#7c5cff';
  const isEmpty = activity.isEmpty || false;

  const durationHours = activity.end - activity.start;
  const startMinutes = decimalToMinutes(activity.start);
  const endMinutes = decimalToMinutes(activity.end);
  const durationMinutes = endMinutes - startMinutes;

  const formattedStart = formatHour(activity.start);
  const formattedEnd = formatHour(activity.end);

  const percentageOfDay = ((durationHours / 24) * 100).toFixed(1);

  const isCurrentActivity = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    return currentTimeDecimal >= activity.start && currentTimeDecimal < activity.end;
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);

    if (currentTimeDecimal < activity.start) {
      const timeUntilStart = activity.start - currentTimeDecimal;
      const startHour = Math.floor(timeUntilStart);
      const startMinutes = Math.round((timeUntilStart - startHour) * 60);
      if (startHour > 0 && startMinutes > 0) return t('detail.startsIn', { hours: startHour, minutes: startMinutes });
      if (startHour > 0) return t('detail.startsInHours', { hours: startHour });
      return t('detail.startsInMinutes', { minutes: startMinutes });
    } else if (currentTimeDecimal < activity.end) {
      const timeRemaining = activity.end - currentTimeDecimal;
      const remainingHour = Math.floor(timeRemaining);
      const remainingMinutes = Math.round((timeRemaining - remainingHour) * 60);
      if (remainingHour > 0 && remainingMinutes > 0) return t('detail.endsIn', { hours: remainingHour, minutes: remainingMinutes });
      if (remainingHour > 0) return t('detail.endsInHours', { hours: remainingHour });
      return t('detail.endsInMinutes', { minutes: remainingMinutes });
    }
    return null;
  };

  const timeRemainingText = getTimeRemaining();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgColor} p-6 transition-all duration-1000`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition"
            aria-label={t('detail.back')}
          >
            <ChevronLeft size={20} />
            {t('detail.back')}
          </button>
          <ThemeToggle themeMode={themeMode} onToggle={onToggleTheme} />
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-white">
          <div className="text-center mb-8">
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <p className="text-xl font-semibold">{day}</p>
            </div>
            <div
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/20 my-6"
              style={{ backgroundColor: activityColor }}
            />
            <h2 className="text-3xl font-bold mb-2">{activityName}</h2>
            <p className="text-xl text-white/80 mb-2">{formattedStart} - {formattedEnd}</p>
            {timeRemainingText && <p className="text-lg text-white/70 mb-4">{timeRemainingText}</p>}
            {isEmpty && (
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm">
                <AlertCircle size={16} />
                {t('detail.freeTime')}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <DetailBlock title={t('activity.description')} icon={<FileText size={18} />}>
              <p className="text-white/90 leading-relaxed">{activityDescription}</p>
            </DetailBlock>

            <DetailBlock title={t('detail.exactSchedule')} icon={<Clock size={18} />}>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-sm opacity-75">{t('activity.startTime')}</div>
                  <div className="text-lg font-semibold">{formattedStart}</div>
                  <div className="text-xs opacity-60 mt-1">{activity.start.toFixed(2)} {t('activity.hours')}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-sm opacity-75">{t('activity.endTime')}</div>
                  <div className="text-lg font-semibold">{formattedEnd}</div>
                  <div className="text-xs opacity-60 mt-1">{activity.end.toFixed(2)} {t('activity.hours')}</div>
                </div>
              </div>
            </DetailBlock>

            <DetailBlock title={t('detail.personalNotes')} icon={<FileText size={18} />}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('detail.notesPlaceholder')}
                className="w-full bg-white/10 rounded-lg p-3 text-white placeholder-white/50 border border-white/20 focus:border-white/50 focus:outline-none resize-none"
                rows="3"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => alert(t('detail.notesSaved'))}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition text-sm"
                  disabled={!notes.trim()}
                >
                  {t('detail.saveNotes')}
                </button>
              </div>
            </DetailBlock>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailBlock = ({ title, icon, children }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
      {icon && <span>{icon}</span>}
      {title}
    </h3>
    <div>{children}</div>
  </div>
);

export default DetailViewMaru;
