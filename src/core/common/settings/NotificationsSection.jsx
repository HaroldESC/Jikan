/**
 * Owns the "Notifications" panel of the Settings modal: the pre-alert offset
 * applied to activity reminders, the pre-exam alert window (v5.0 D2) and the
 * two status notes that explain a blocked permission and the service-worker
 * delivery path.
 */

import { GraduationCap } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { Section, SubGroup, LabeledRow, Note } from './ui';

// Pre-alert presets (minutes before an activity starts).
const PRE_AVISO_OPTIONS = [0, 5, 10, 15, 30];

// Pre-exam alert presets (hours before the exam; `0` = no alert).
const EXAM_PRE_OPTIONS = [0, 1, 24, 48];

export default function NotificationsSection({ s, notifications }) {
  const { t } = useTranslation();

  if (!notifications) return null;

  return (
    <Section s={s} title={t('notifications.title')}>
      <LabeledRow s={s} label={t('notifications.preAviso')}>
        <select
          value={notifications.preMinutes}
          onChange={(e) => notifications.setPreMinutes(Number(e.target.value))}
          className={s.select}
          aria-label={t('notifications.preAviso')}
        >
          {PRE_AVISO_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes} className={s.selectOption}>
              {minutes}
            </option>
          ))}
        </select>
        <span className={s.hint}>{t('notifications.preAvisoUnit')}</span>
      </LabeledRow>
      {notifications.permission === 'denied' && (
        <Note s={s} tone="danger" className="mt-2">
          {t('notifications.denied')}
        </Note>
      )}

      {/* Aviso de pre-examen (v5.0 D2): margen en horas antes del examen. */}
      <SubGroup s={s} icon={GraduationCap} title={t('notifications.examPre')} description={t('notifications.examPreIntro')}>
        <select
          value={notifications.examPreHours}
          onChange={(e) => notifications.setExamPreHours(Number(e.target.value))}
          className={s.select}
          aria-label={t('notifications.examPre')}
        >
          {EXAM_PRE_OPTIONS.map((hours) => (
            <option key={hours} value={hours} className={s.selectOption}>
              {hours === 0 ? t('notifications.examPreOff') : t('notifications.examPreHours', { hours })}
            </option>
          ))}
        </select>
      </SubGroup>

      {notifications.viaServiceWorker && (
        <Note s={s} className="mt-2">
          {t('notifications.viaServiceWorker')}
        </Note>
      )}
    </Section>
  );
}