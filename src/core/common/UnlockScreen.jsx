/**
 * UnlockScreen Component
 *
 * Pantalla de bloqueo que aparece en cada arranque cuando el cifrado local está
 * activo (v4.0 C3). La clave AES solo vive en memoria, así que hace falta
 * escribir la passphrase para volver a abrir el horario.
 *
 * Incluye la salida de emergencia: si el usuario ha perdido la passphrase, los
 * datos locales no se pueden recuperar, así que se ofrece borrarlos y empezar de
 * cero (doble confirmación).
 */

import { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, Trash2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { MIN_PASSPHRASE_LENGTH } from '../../lib/crypto';

const ERROR_KEYS = {
  wrongPassphrase: 'encryption.wrongPassphrase',
  unsupported: 'encryption.notSupported',
  unexpected: 'encryption.unexpectedError',
};

export default function UnlockScreen({ onUnlock, onForget, busy = false, error = null, errorMessage = '' }) {
  const { t } = useTranslation();
  const [passphrase, setPassphrase] = useState('');
  const [confirmForget, setConfirmForget] = useState(false);

  const errorKey = error ? ERROR_KEYS[error] ?? ERROR_KEYS.unexpected : null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!passphrase || busy) return;
    onUnlock?.(passphrase);
  };

  const handleForget = () => {
    if (!confirmForget) {
      setConfirmForget(true);
      return;
    }
    onForget?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-lg rounded-full mb-4">
            <Lock size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('encryption.lockTitle')}</h1>
          <p className="text-white/60 text-sm">{t('encryption.lockIntro')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          <label className="block text-white/90 text-sm font-medium mb-2" htmlFor="unlock-passphrase">
            {t('encryption.passphrase')}
          </label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
            <input
              id="unlock-passphrase"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
              placeholder="••••••••"
            />
          </div>

          {errorKey && (
            <p className="mt-4 text-red-300 text-sm text-center" role="alert">
              {error === 'unexpected' && errorMessage
                ? t(errorKey, { msg: errorMessage })
                : t(errorKey)}
            </p>
          )}

          <button
            type="submit"
            disabled={!passphrase || busy}
            className="w-full mt-6 bg-white text-indigo-900 py-3 rounded-xl font-bold hover:bg-white/90 transition transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-60"
          >
            {busy ? t('common.processing') : t('encryption.unlock')}
          </button>

          <div className="mt-6 pt-5 border-t border-white/15">
            {confirmForget ? (
              <div className="space-y-3">
                <p className="text-sm text-red-300 flex items-start gap-2">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{t('encryption.forgetWarning')}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleForget}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    {t('encryption.forgetConfirmButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmForget(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition text-sm font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleForget}
                className="w-full text-white/50 hover:text-white text-xs transition"
              >
                {t('encryption.forgot')}
              </button>
            )}
          </div>
        </form>

        <p className="text-white/40 text-xs text-center mt-6">
          {t('encryption.lockHint', { min: MIN_PASSPHRASE_LENGTH })}
        </p>
      </div>
    </div>
  );
}