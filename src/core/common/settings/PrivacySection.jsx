/**
 * "Privacidad" section of the Settings modal.
 *
 * Owns the per-category private-mode toggles (notes, description, reminders)
 * plus the local-encryption sub-block. Every action is delegated to the
 * `privacy` prop (`toggle`, `onOpen`), so this file stays purely presentational.
 */

import { ShieldCheck, Lock, LockOpen, KeyRound } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { Section, SubGroup, ActionGrid, ActionButton, ToggleRow, Note } from './ui';

// Categorías del modo privado (v4.0 C3) mostradas en la sección "Privacidad".
const PRIVACY_ITEMS = [
  { key: 'notes', label: 'privacy.notes' },
  { key: 'description', label: 'privacy.description' },
  { key: 'reminders', label: 'privacy.reminders' },
];

export default function PrivacySection({ s, privacy }) {
  const { t } = useTranslation();

  if (!privacy) return null;

  const { encryption } = privacy;

  return (
    <Section s={s} title={t('privacy.section')} description={t('privacy.intro')} icon={ShieldCheck}>
      <div className="space-y-2">
        {PRIVACY_ITEMS.map((item) => {
          const enabled = privacy.privacy[item.key] !== false;
          return (
            <ToggleRow
              key={item.key}
              s={s}
              label={t(item.label)}
              on={enabled}
              onLabel={t('privacy.on')}
              offLabel={t('privacy.off')}
              onToggle={() => privacy.privacy.toggle(item.key)}
            />
          );
        })}
      </div>

      <Note s={s} className="mt-3">
        {t('privacy.offHint')}
      </Note>

      {encryption && (
        <SubGroup s={s} icon={Lock} title={t('privacy.encryption')} description={t('privacy.encryptionIntro')}>
          {encryption.enabled && (
            <Note s={s} tone="ok" className="mb-3">
              {t('privacy.encryptionActive')}
            </Note>
          )}

          {!encryption.supported ? (
            <Note s={s} tone="warn">
              {t('encryption.notSupported')}
            </Note>
          ) : encryption.enabled ? (
            <ActionGrid cols={1}>
              <ActionButton s={s} icon={KeyRound} onClick={() => encryption.onOpen('change')}>
                {t('privacy.changePassphrase')}
              </ActionButton>
              <ActionButton s={s} variant="danger" icon={LockOpen} onClick={() => encryption.onOpen('disable')}>
                {t('privacy.disableEncryption')}
              </ActionButton>
            </ActionGrid>
          ) : (
            <ActionButton s={s} icon={Lock} onClick={() => encryption.onOpen('create')}>
              {t('privacy.enableEncryption')}
            </ActionButton>
          )}
        </SubGroup>
      )}
    </Section>
  );
}
