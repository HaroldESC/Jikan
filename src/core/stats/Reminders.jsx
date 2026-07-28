/**
 * Reminders Component
 * 
 * Sección de recordatorios con lista y opción para añadir nuevos.
 */

import { Bell, Plus, Trash2} from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

const Reminders = ({ reminders = [], onAddReminder, onDeleteReminder }) => {
  const { t } = useTranslation();
  
  // Ordenar recordatorios por hora
  const sortedReminders = [...reminders].sort((a, b) => 
    timeToMinutes(a.time) - timeToMinutes(b.time)
  );

  // Verificar si un recordatorio ya pasó
  const isReminderPast = (reminderTime) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const reminderMinutes = timeToMinutes(reminderTime);
    return currentMinutes > reminderMinutes;
  };

  // Obtener el próximo recordatorio
  const getNextReminder = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return sortedReminders.find(reminder => 
      timeToMinutes(reminder.time) > currentMinutes
    );
  };

  const nextReminder = getNextReminder();

  return (
    <section className="reminders-card">
      <h3 className="reminders-title">
        <Bell size={18} />
        {t('reminders.title')}
      </h3>

      {/* Próximo recordatorio destacado */}
      {nextReminder && (
        <div className="next-reminder">
          <div className="next-reminder__content">
            <p className="next-reminder__label">{t('reminders.next')}</p>
            <p className="next-reminder__text">{nextReminder.text}</p>
            <p className="next-reminder__time">{nextReminder.time}</p>
          </div>
        </div>
      )}

      <div className="reminders-list">
        {reminders.length === 0 && (
          <p className="reminders-empty">
            {t('reminders.empty')}
          </p>
        )}

        {sortedReminders.map(reminder => (
          <div
            key={reminder.id}
            className={`reminder-item ${isReminderPast(reminder.time) ? 'reminder-item--past' : ''}`}
          >
            <div className="reminder-item__content">
              <p className="reminder-text">
                {reminder.text}
              </p>
              <p className="reminder-time">
                {reminder.time}
              </p>
            </div>

            {onDeleteReminder && (
              <button
                onClick={() => onDeleteReminder(reminder.id)}
                className="reminder-delete-btn"
                aria-label={t('reminders.deleteAria', { text: reminder.text })}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onAddReminder}
        className="reminders-add-btn"
        aria-label={t('reminders.addAria')}
      >
        <Plus size={16} />
        {t('reminders.add')}
      </button>
    </section>
  );
};

export default Reminders;