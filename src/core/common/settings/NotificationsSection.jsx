/**
 * Owns the "Notifications" panel of the Settings modal: the pre-alert offset
 * applied to activity reminders, plus the two status notes that explain a
 * blocked permission and the service-worker delivery path.
 */

import { useTranslation } from '../../../i18n/useTranslation';
import { Section, LabeledRow, Note } from './ui';

// Pre-alert presets (minutes before an activity starts).
const PRE_AVISO_OPTIONS = [0, 5, 10, 15, 30];

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
      {notifications.viaServiceWorker && (
        <Note s={s} className="mt-2">
          {t('notifications.viaServiceWorker')}
        </Note>
      )}
    </Section>
  );
}