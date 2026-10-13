/**
 * Exams Component (v5.0 D2)
 *
 * Calendario de exámenes: bloque destacado del próximo examen, lista ordenada y
 * formulario inline (alta y edición). Es un componente **único** para Maru y
 * Sei: el aspecto lo resuelve `styles/maru/exams.css`, que aplica el glass de
 * Maru por defecto y se aplaniza con el bloque `.theme-sei` final.
 *
 * No habla con el store: recibe el objeto que devuelve `useExams` (`exams`) y
 * llama a su API (`saveExam`, `deleteExam`), igual que `Reminders` recibe
 * callbacks. `activities` es la lista plana de la semana, que alimenta el
 * `<select>` de vínculo (opcional).
 */

import { useState } from 'react';
import { CalendarClock, Check, Link2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { DEFAULT_EXAM_COLOR, MAX_NOTES, MAX_SUBJECT, examTimestamp } from '../../utils/exams';

// Paleta de swatches (mismo criterio que `COLOR_PALETTE` de los editores de
// actividad). El color solo se usa como `backgroundColor` inline.
const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
];

/** 'YYYY-MM-DD' **local** de hoy (nunca `toISOString`: devuelve fecha UTC). */
const todayKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/** Estado inicial del formulario; `exam` a null = alta, a fila = edición. */
const blankValues = () => ({
  subject: '',
  date: todayKey(),
  time: '',
  activity_id: '',
  color: DEFAULT_EXAM_COLOR,
  notes: '',
});

/** Formulario cargado desde una fila existente (los `null` pasan a cadena). */
const valuesFrom = (exam) => ({
  subject: exam.subject ?? '',
  date: exam.date ?? '',
  time: exam.time ?? '',
  activity_id: exam.activity_id ?? '',
  color: exam.color || DEFAULT_EXAM_COLOR,
  notes: exam.notes ?? '',
});

/** Texto visible del countdown: hoy / mañana / en N días. */
const countdownText = (t, days) => {
  if (days === 0) return t('exams.today');
  if (days === 1) return t('exams.tomorrow');
  // Plural emulado con clave `_plural`, igual que `activity.activityCount`.
  return t('exams.inDays_plural', { days });
};

/** Forma numérica ("En 1 día") para el `title` del countdown. */
const countdownTitle = (t, days) =>
  days >= 1 ? t(days === 1 ? 'exams.inDays' : 'exams.inDays_plural', { days }) : undefined;

const Exams = ({ exams, activities = [] }) => {
  const { t, localeForDate } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(blankValues);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const sorted = exams?.sortedExams ?? [];
  const nextExam = exams?.nextExam ?? null;
  const list = Array.isArray(activities) ? activities : [];

  const closeForm = () => {
    setIsAdding(false);
    setEditing(null);
    setValues(blankValues());
    setError(false);
    setBusy(false);
  };

  const startAdding = () => {
    setEditing(null);
    setValues(blankValues());
    setError(false);
    setIsAdding(true);
  };

  const startEditing = (exam) => {
    setIsAdding(false);
    setEditing(exam);
    setValues(valuesFrom(exam));
    setError(false);
  };

  const setField = (patch) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setError(false);
  };

  // Sólo se guardan los campos del formulario: `id`/`user_id` los pone el store.
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!values.subject.trim() || !values.date) {
      setError(true);
      return;
    }

    setBusy(true);
    try {
      await exams.saveExam(editing, {
        subject: values.subject.trim(),
        date: values.date,
        time: values.time || null,
        activity_id: values.activity_id || null,
        color: values.color,
        notes: values.notes,
      });
      closeForm();
    } catch (err) {
      console.error('Error saving exam:', err);
      setBusy(false);
    }
  };

  const handleDelete = async (exam) => {
    if (!exam?.id) return;
    if (!window.confirm(t('exams.deleteConfirm', { subject: exam.subject }))) return;
    try {
      await exams.deleteExam(exam.id);
    } catch (err) {
      console.error('Error deleting exam:', err);
    }
  };

  /** Un `activity_id` colgado (invitado) no se muestra ni rompe la lista. */
  const linkedActivity = (exam) =>
    exam.activity_id ? list.find((activity) => activity?.id === exam.activity_id) : undefined;

  /** Un examen ya pasado (instante local completo, no solo la fecha). */
  const isPast = (exam) => {
    const moment = examTimestamp(exam.date, exam.time);
    return moment ? moment.getTime() < Date.now() : false;
  };

  /** Fecha legible en el idioma activo ('2026-10-13' → '13/10/2026'). */
  const formatDate = (dateKey) => {
    const [year, month, day] = String(dateKey).split('-').map(Number);
    if (!year || !month || !day) return dateKey;
    return new Date(year, month - 1, day).toLocaleDateString(localeForDate);
  };

  const nextDays = nextExam ? exams.daysUntil(nextExam) : null;

  return (
    <section className="exams-card">
      <h3 className="exams-title">
        <CalendarClock size={18} />
        {t('exams.title')}
      </h3>

      {/* ── Próximo examen destacado ── */}
      {nextExam && (
        <div className="next-exam">
          <div className="next-exam__content">
            <p className="next-exam__label">{t('exams.next')}</p>
            <p className="next-exam__text">{nextExam.subject}</p>
            <p className="next-exam__time">
              {formatDate(nextExam.date)}
              {nextExam.time ? ` · ${nextExam.time}` : ''}
            </p>
            <p className="next-exam__countdown" title={countdownTitle(t, nextDays)}>
              {countdownText(t, nextDays)}
            </p>
          </div>
        </div>
      )}

      <div className="exams-list">
        {sorted.length === 0 && !isAdding && !editing && (
          <p className="exams-empty">{t('exams.empty')}</p>
        )}

        {sorted.map((exam) => {
          const linked = linkedActivity(exam);
          const past = isPast(exam);
          return (
            <div
              key={exam.id}
              className={`exam-item ${past ? 'exam-item--past' : ''}`}
              style={{ borderLeftColor: exam.color || DEFAULT_EXAM_COLOR }}
            >
              <span
                className="exam-item__dot"
                style={{ backgroundColor: exam.color || DEFAULT_EXAM_COLOR }}
                aria-hidden="true"
              />
              <div className="exam-item__content">
                <p className="exam-subject">{exam.subject}</p>
                <p className="exam-date">
                  {formatDate(exam.date)}
                  {exam.time ? ` · ${exam.time}` : ''}
                  {past && <span className="exam-item__flag">{t('exams.past')}</span>}
                </p>
                {linked && (
                  <p className="exam-linked">
                    <Link2 size={12} />
                    {linked.title}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => startEditing(exam)}
                className="exam-edit-btn"
                aria-label={t('exams.editAria', { subject: exam.subject })}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(exam)}
                className="exam-delete-btn"
                aria-label={t('exams.deleteAria', { subject: exam.subject })}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Formulario inline (alta y edición comparten el mismo bloque) ── */}
      {isAdding || editing ? (
        <form className="exams-form" onSubmit={handleSubmit}>
          <div className="exams-form-row">
            <input
              type="text"
              className="exams-input exams-input--subject"
              value={values.subject}
              onChange={(event) => setField({ subject: event.target.value })}
              placeholder={t('exams.subjectPlaceholder')}
              aria-label={t('exams.subject')}
              maxLength={MAX_SUBJECT}
              autoFocus
            />
            <input
              type="date"
              className="exams-input exams-input--date"
              value={values.date}
              onChange={(event) => setField({ date: event.target.value })}
              aria-label={t('exams.date')}
            />
            <input
              type="time"
              className="exams-input exams-input--time"
              value={values.time}
              onChange={(event) => setField({ time: event.target.value })}
              aria-label={t('exams.time')}
            />
          </div>

          <div className="exams-form-row">
            <select
              className="exams-input exams-input--select"
              value={values.activity_id}
              onChange={(event) => setField({ activity_id: event.target.value })}
              aria-label={t('exams.linkedActivity')}
            >
              <option value="" className="exams-option">{t('exams.noLinkedActivity')}</option>
              {list.map((activity) => (
                <option key={activity.id} value={activity.id} className="exams-option">
                  {activity.title}
                </option>
              ))}
            </select>

            <div className="exams-swatches" role="group" aria-label={t('exams.color')}>
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`exams-swatch ${values.color === color ? 'exams-swatch--active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setField({ color })}
                  aria-label={color}
                  aria-pressed={values.color === color}
                />
              ))}
            </div>
          </div>

          <textarea
            className="exams-textarea"
            value={values.notes}
            onChange={(event) => setField({ notes: event.target.value })}
            placeholder={t('exams.notes')}
            aria-label={t('exams.notes')}
            maxLength={MAX_NOTES}
            rows={2}
          />

          <div className="exams-form-row exams-form-row--actions">
            <button
              type="submit"
              className="exams-form-btn exams-form-btn--save"
              aria-label={t('exams.save')}
              disabled={busy}
            >
              <Check size={16} />
              {t('exams.save')}
            </button>
            <button type="button" className="exams-form-btn" onClick={closeForm} aria-label={t('common.cancel')}>
              <X size={16} />
              {t('common.cancel')}
            </button>
          </div>

          {error && <p className="exams-form-error">{t('exams.required')}</p>}
        </form>
      ) : (
        <button type="button" onClick={startAdding} className="exams-add-btn" aria-label={t('exams.addAria')}>
          <Plus size={16} />
          {t('exams.add')}
        </button>
      )}
    </section>
  );
};

export default Exams;