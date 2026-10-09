/**
 * Settings › App section.
 * Owns the PWA state: the install button (or the installed / manual-install
 * notice) plus the online-offline and offline-ready status lines.
 */

import { Download, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { Section, ActionButton, Note } from './ui';

export default function AppSection({ s, pwa }) {
  const { t } = useTranslation();

  if (!pwa) return null;

  return (
    <Section s={s} title={t('pwa.title')} description={t('pwa.intro')} icon={Smartphone}>
      {pwa.isInstalled ? (
        <Note s={s} tone="ok">
          {t('pwa.installedApp')}
        </Note>
      ) : pwa.canInstall ? (
        <ActionButton s={s} icon={Download} onClick={pwa.onInstall}>
          {t('pwa.install')}
        </ActionButton>
      ) : (
        <Note s={s}>{t('pwa.manualInstall')}</Note>
      )}

      <div className="mt-4 space-y-2">
        <Note s={s} icon={Wifi}>
          {pwa.isOffline ? t('pwa.offline') : t('pwa.online')}
        </Note>
        <Note s={s} icon={WifiOff}>
          {pwa.offlineReady ? t('pwa.offlineReady') : t('pwa.offlinePending')}
        </Note>
      </div>
    </Section>
  );
}