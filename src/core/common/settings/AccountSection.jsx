/**
 * "Cuenta" section of the Settings modal.
 *
 * Owns the sign-out flow for authenticated users and the local-mode (guest)
 * actions — create an account or leave guest mode — including their
 * confirmations. It is the only section that talks to Supabase directly.
 */

import { User, LogIn, LogOut, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from '../../../i18n/useTranslation';
import { Section, ActionButton, Note } from './ui';

export default function AccountSection({ s, isGuest, onExitGuest }) {
  const { t } = useTranslation();

  const handleLogout = async () => {
    const confirm = window.confirm(t('settings.confirmLogout'));
    if (!confirm) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert(t('settings.logoutError', { msg: error.message }));
        return;
      }
    } catch (error) {
      alert(t('settings.unexpectedError', { msg: error.message }));
    }
  };

  // Guest mode: leaving the local mode returns to the login screen. Local data
  // is kept, hence the explicit confirmation.
  const handleExitGuest = () => {
    const accepted = window.confirm(t('guest.confirmExit'));
    if (!accepted) return;
    onExitGuest?.();
  };

  return (
    <Section s={s} title={t('settings.account')} description={t('settings.accountIntro')} icon={User}>
      {isGuest ? (
        <>
          <Note s={s} icon={Info} className="mb-4">
            {t('guest.dataNotice')}
          </Note>
          <ActionButton s={s} variant="primary" icon={LogIn} onClick={() => onExitGuest?.()}>
            {t('guest.createAccount')}
          </ActionButton>
          <ActionButton s={s} icon={LogOut} onClick={handleExitGuest} className="mt-2">
            {t('guest.exitLocalMode')}
          </ActionButton>
        </>
      ) : (
        <ActionButton s={s} variant="danger" icon={LogOut} onClick={handleLogout}>
          {t('settings.logout')}
        </ActionButton>
      )}
    </Section>
  );
}
