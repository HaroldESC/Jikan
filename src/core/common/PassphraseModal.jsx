/**
 * PassphraseModal Component
 *
 * Diálogo único para toda la gestión de la passphrase del cifrado local
 * (v4.0 C3), en tres modos:
 *
 *   create   → activar el cifrado (passphrase + confirmación)
 *   change   → cambiar la passphrase (actual + nueva + confirmación)
 *   disable  → desactivar el cifrado (passphrase actual)
 *
 * La validación se hace en el componente (mín. longitud y coincidencia) para
 * poder avisar sin perder lo que el usuario ha escrito.
 */

import { useEffect, useState } from 'react';
import { X, Lock, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { MIN_PASSPHRASE_LENGTH } from '../../lib/crypto';

const ERROR_KEYS = {
  wrongPassphrase: 'encryption.wrongPassphrase',
  unexpected: 'encryption.unexpectedError',
  notSupported: 'encryption.notSupported',
  tooShort: 'encryption.passphraseTooShort',
  mismatch: 'encryption.passphraseMismatch',
};

const PassphraseModal = ({ isOpen, mode = 'create', busy = false, error = null, errorMessage = '', onSubmit, onClose, isMaru, isDarkMode }) => {
  const { t } = useTranslation();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [localError, setLocalError] = useState(null);

  // Cada apertura empieza limpio.
  useEffect(() => {
    if (isOpen) {
      setPassphrase('');
      setConfirmation('');
      setLocalError(null);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const needsCurrent = mode === 'change' || mode === 'disable';
  const needsNew = mode === 'create' || mode === 'change';

  const cardClass = isMaru
    ? 'bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-white'
    : `rounded-2xl p-6 max-w-md w-full shadow-xl ${
        isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
      }`;

  const closeBtnClass = isMaru
    ? 'p-2 hover:bg-white/20 rounded-lg transition'
    : 'p-2 rounded-lg transition ' + (isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100');

  const cancelClass = isMaru
    ? 'px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium'
    : 'px-4 py-2 rounded-xl font-medium transition text-sm ' +
      (isDarkMode
        ? 'bg-slate-700 hover:bg-slate-600 text-white'
        : 'bg-slate-100 hover:bg-slate-200 text-slate-700');

  const submitClass = isMaru
    ? 'flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium disabled:opacity-50'
    : 'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition text-sm bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50';

  const mutedClass = isMaru
    ? 'text-sm text-white/70'
    : `text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  const inputClass = isMaru
    ? 'w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition'
    : `w-full rounded-xl py-3 px-4 focus:outline-none focus:ring-2 transition ${
        isDarkMode
          ? 'bg-slate-900 border border-slate-600 text-white focus:ring-indigo-400'
          : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-indigo-400'
      }`;

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalError(null);

    if (needsNew && passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setLocalError(ERROR_KEYS.tooShort);
      return;
    }
    if (mode === 'create' && passphrase !== confirmation) {
      setLocalError(ERROR_KEYS.mismatch);
      return;
    }

    // En modo 'disable' la frase se escribe en el campo de "frase actual", que
    // se enlaza a `confirmation` (mismo input que la confirmación de 'create').
    const typed = mode === 'disable' ? confirmation : passphrase;

    onSubmit?.({
      passphrase: typed,
      confirmation,
      newPassphrase: mode === 'change' ? confirmation : undefined,
    });
  };

  const shownError = localError ?? (error ? ERROR_KEYS[error] ?? ERROR_KEYS.unexpected : null);
  const showErrorDetail = !localError && error === 'unexpected' && !!errorMessage;

  const titles = {
    create: t('encryption.enableTitle'),
    change: t('encryption.changeTitle'),
    disable: t('encryption.disableTitle'),
  };

  // El modo 'create' usa las claves `enable*` del namespace `encryption`.
  const descriptionKeys = {
    create: 'encryption.enableDescription',
    change: 'encryption.changeDescription',
    disable: 'encryption.disableDescription',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={cardClass}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Lock size={20} />
            <h2 className="text-xl font-bold">{titles[mode]}</h2>
          </div>
          <button onClick={onClose} className={closeBtnClass} aria-label={t('common.close')}>
            <X size={22} />
          </button>
        </div>

        <p className={`${mutedClass} mb-5`}>
          {t(descriptionKeys[mode], { min: MIN_PASSPHRASE_LENGTH })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {needsCurrent && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isMaru ? 'text-white/90' : ''}`}>
                {mode === 'change' ? t('encryption.currentPassphrase') : t('encryption.passphrase')}
              </label>
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={mode === 'change' ? passphrase : confirmation}
                onChange={(event) =>
                  mode === 'change' ? setPassphrase(event.target.value) : setConfirmation(event.target.value)
                }
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          )}

          {needsNew && mode === 'create' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isMaru ? 'text-white/90' : ''}`}>
                {t('encryption.passphrase')}
              </label>
              <input
                type="password"
                autoFocus
                autoComplete="new-password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          )}

          {mode === 'create' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isMaru ? 'text-white/90' : ''}`}>
                {t('encryption.confirmPassphrase')}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          )}

          {mode === 'change' && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isMaru ? 'text-white/90' : ''}`}>
                  {t('encryption.newPassphrase')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              {confirmation && confirmation.length < MIN_PASSPHRASE_LENGTH && (
                <p className="text-xs text-amber-300">{t('encryption.passphraseTooShort')}</p>
              )}
            </>
          )}

          {shownError && (
            <p className="text-sm text-red-300 text-center" role="alert">
              {showErrorDetail ? t(shownError, { msg: errorMessage }) : t(shownError)}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className={cancelClass}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={busy || (mode === 'disable' && !confirmation)}
              className={submitClass}
            >
              <ShieldCheck size={16} />
              {busy ? t('common.processing') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PassphraseModal;