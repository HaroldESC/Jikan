/**
 * CloudBackupModal Component
 *
 * Lista las copias guardadas en Google Drive y permite restaurar o eliminar
 * cada una. Restaurar hace **append**: añade las actividades de la copia al
 * horario actual sin borrar nada.
 *
 * Si el archivo descargado está cifrado, la frase se pide con un prompt
 * **inline** dentro de este mismo modal (decisión fija del plan C5: no se usa
 * PassphraseModal, que solo tiene modos create|change|disable y renderizaría
 * mal aquí). B1 gestiona los alert/confirm de éxito y borrado; este componente
 * solo muestra errores propios de la restauración.
 *
 * Soporta ambas variantes: Maru (glass) y Sei (Tailwind plano), sin un solo
 * color literal: todo sale de `useSettingsStyles` + `./settings/ui.jsx`.
 */

import { useEffect, useRef, useState } from 'react';
import { X, Cloud, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStyles } from './settings/settingsStyles';
import { ActionButton, Note } from './settings/ui';

const CloudBackupModal = ({
  isOpen,
  items = [],
  busy = false,
  listBusy = false,
  listError = null,
  status,
  onRestore,
  onDelete,
  onClose,
  isMaru,
  isDarkMode,
}) => {
  const { t, localeForDate } = useTranslation();
  const s = useSettingsStyles(isMaru, isDarkMode);

  // Inline passphrase prompt state. Hooks must be declared before the early
  // return, exactly like the other modals of the app.
  const [passphrase, setPassphrase] = useState('');
  const [promptFor, setPromptFor] = useState(null);
  const [restoreError, setRestoreError] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const passphraseRef = useRef(null);

  // Focus the input as soon as the passphrase prompt appears.
  useEffect(() => {
    if (promptFor) passphraseRef.current?.focus();
  }, [promptFor]);

  // Closing mid-prompt must leave a clean state for the next opening.
  useEffect(() => {
    if (!isOpen) {
      setPassphrase('');
      setPromptFor(null);
      setRestoreError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatWhen = (iso) => {
    try {
      return new Date(iso).toLocaleString(localeForDate);
    } catch {
      return iso;
    }
  };

  const formatSize = (bytes) => (bytes ? `${(bytes / 1024).toFixed(1)} KB` : null);

  // Same card treatment as the settings shell (`s.card`), narrowed to
  // `max-w-lg` as done in BackupRestoreModal (only the width is swapped).
  const cardClass = `${s.card.replace('max-w-3xl', 'max-w-lg')} p-6 sm:p-8`;

  // Compact icon-only buttons for the list: `s` has no token for these, so the
  // class is built with the same ternaries as BackupRestoreModal.
  const iconBtnClass = isMaru
    ? 'p-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-40 disabled:cursor-not-allowed'
    : `p-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${
        isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
      }`;

  const restoreErrorText = !restoreError
    ? null
    : restoreError === 'wrongPassphrase'
      ? t('encryption.wrongPassphrase')
      : t('backup.cloudRestoreError', { msg: restoreError });

  const resetPrompt = () => {
    setPassphrase('');
    setPromptFor(null);
    setRestoreError(null);
  };

  const runRestore = async (item, pass) => {
    setRestoring(true);
    setRestoreError(null);
    try {
      await onRestore?.(item, pass ?? null);
      // Success: B1 shows the confirmation alert; just close everything.
      resetPrompt();
      onClose?.();
    } catch (err) {
      const code = err?.code ?? null;
      if (code === 'needsPassphrase') {
        // Encrypted file → show the inline prompt for this item.
        setPromptFor(item);
      } else if (code === 'wrongPassphrase') {
        // Keep the prompt open, flag the error and clear the input.
        setPromptFor((prev) => prev ?? item);
        setRestoreError('wrongPassphrase');
        setPassphrase('');
      } else if (code === 'cancelled') {
        // User dismissed the confirmation: clear silently.
        resetPrompt();
      } else if (['download', 'format', 'empty', 'append'].includes(code)) {
        // MainShell already alerted for these: don't duplicate inline.
        resetPrompt();
      } else if (code) {
        setRestoreError(code);
      } else {
        setRestoreError(err?.message || 'error');
      }
    } finally {
      setRestoring(false);
    }
  };

  // First click sends `null`; once the prompt is up, resend with the passphrase.
  const handleRestore = (item) => runRestore(item, promptFor ? passphrase : null);

  const handlePromptConfirm = () => {
    if (!promptFor || !passphrase || busy || restoring) return;
    runRestore(promptFor, passphrase);
  };

  const handlePromptKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlePromptConfirm();
    }
  };

  return (
    <div className={s.scrim}>
      <div className={cardClass} role="dialog" aria-modal="true" aria-labelledby="cloud-backup-modal-title">
        <div className="flex justify-between items-start gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Cloud size={20} />
            <h2 id="cloud-backup-modal-title" className={s.title}>
              {t('backup.cloudList')}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={s.closeBtn} aria-label={t('common.close')}>
            <X size={24} />
          </button>
        </div>

        <p className={`${s.muted} mb-4`}>{t('backup.cloudIntro')}</p>

        {status && status !== 'connected' && (
          <Note s={s} tone={status === 'expired' ? 'warn' : 'info'} className="mb-3">
            {status === 'expired' ? t('backup.cloudExpired') : t('backup.cloudDisconnected')}
          </Note>
        )}

        {restoreError && !promptFor && (
          <p className={`${s.notices.danger} mb-3`}>{restoreErrorText}</p>
        )}

        {/* ── Inline passphrase prompt (encrypted backups) ── */}
        {promptFor && (
          <div className="mb-4">
            <p className={s.label}>{t('backup.cloudPassphrase')}</p>
            <p className={`${s.hint} mt-0.5 truncate`}>{promptFor.name}</p>
            <input
              ref={passphraseRef}
              type="password"
              className={`${s.select} w-full mt-2`}
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder={t('backup.cloudPassphrase')}
              aria-label={t('backup.cloudPassphrase')}
              autoComplete="off"
              disabled={busy || restoring}
            />
            {restoreErrorText && <p className={`${s.notices.danger} mt-2`}>{restoreErrorText}</p>}
            <div className="mt-3">
              <ActionButton
                s={s}
                variant="primary"
                icon={RotateCcw}
                onClick={handlePromptConfirm}
                disabled={busy || restoring || !passphrase}
              >
                {t('backup.cloudRestore')}
              </ActionButton>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1">
          {listBusy ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : listError ? (
            <p className={`${s.muted} py-6 text-center`}>
              {t('backup.cloudListError', { msg: listError })}
            </p>
          ) : items.length === 0 ? (
            <p className={`${s.muted} py-6 text-center`}>{t('backup.cloudEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const size = formatSize(item.size);
                return (
                  <li key={item.id} className={s.row}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className={s.hint}>
                        {formatWhen(item.createdTime)}
                        {size ? ` · ${size}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(item)}
                        disabled={busy || restoring}
                        aria-label={t('backup.cloudRestore')}
                        title={t('backup.cloudRestore')}
                        className={`${iconBtnClass} ${s.focusRing}`}
                      >
                        {busy || restoring ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete?.(item)}
                        disabled={busy || restoring}
                        aria-label={t('backup.cloudDelete')}
                        title={t('backup.cloudDelete')}
                        className={`${iconBtnClass} ${s.focusRing}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <div className="w-40">
            <ActionButton s={s} onClick={onClose}>
              {t('common.close')}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudBackupModal;
