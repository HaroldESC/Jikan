/**
 * Reminders Component
 *
 * Sección de recordatorios con lista, formulario para añadir nuevos y borrado.
 */

import { useState } from 'react';
import { Bell, Plus, Trash2, X, Check } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

const timeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const Reminders = ({ reminders = [], onAddReminder, onDeleteReminder }) => {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [text, setText] = useState('');
  const [time, setTime] = useState('08:00');
  const [error, setError] = useState(false);

  const resetForm = () => {
    setText('');
    setTime('08:00');
    setError(false);
    setIsAdding(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const added = onAddReminder && onAddReminder({ text, time });
    if (added === false) {
      setError(true);
      return;
    }
    resetForm();
  };

  // Ordenar recordatorios por hora
  const sortedReminders = [...reminders].sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
  );

  // Verificar si un recordatorio ya pasó
  const isReminderPast = (reminderTime) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes > timeToMinutes(reminderTime);
  };

  // Obtener el próximo recordatorio
  const getNextReminder = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return sortedReminders.find(
      (reminder) => timeToMinutes(reminder.time) > currentMinutes
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
        {reminders.length === 0 && !isAdding && (
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

      {/* ── FORMULARIO DE ALTA ── */}
      {isAdding ? (
        <form className="reminders-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="reminders-input"
            value={text}
            onChange={(event) => { setText(event.target.value); setError(false); }}
            placeholder={t('reminders.textPlaceholder')}
            aria-label={t('reminders.textPlaceholder')}
            autoFocus
          />

          <div className="reminders-form-row">
            <label className="reminders-time-label">
              {t('reminders.time')}
              <input
                type="time"
                className="reminders-input reminders-input--time"
                value={time}
                onChange={(event) => { setTime(event.target.value); setError(false); }}
                aria-label={t('reminders.time')}
              />
            </label>

            <button type="submit" className="reminders-form-btn reminders-form-btn--save" aria-label={t('reminders.save')}>
              <Check size={16} />
              {t('reminders.save')}
            </button>

            <button type="button" className="reminders-form-btn" onClick={resetForm} aria-label={t('common.cancel')}>
              <X size={16} />
              {t('common.cancel')}
            </button>
          </div>

          {error && <p className="reminders-form-error">{t('reminders.required')}</p>}
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="reminders-add-btn"
          aria-label={t('reminders.addAria')}
        >
          <Plus size={16} />
          {t('reminders.add')}
        </button>
      )}
    </section>
  );
};

export default Reminders;
