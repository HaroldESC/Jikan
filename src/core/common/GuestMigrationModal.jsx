/**
 * GuestMigrationModal Component
 *
 * Diálogo de oferta de migración entre el horario local (modo invitado,
 * IndexedDB) y la cuenta de Supabase. Se muestra una sola vez por sesión y
 * siempre antes de tocar nada: la migración hace append, nunca sobrescribe.
 *
 * Soporta ambas variantes: Maru (glass) y Sei (Tailwind plano).
 */

import { X, CloudUpload, Download, Trash2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

const GuestMigrationModal = ({ prompt, busy, onConfirm, onClose, isMaru, isDarkMode }) => {
  const { t } = useTranslation();

  if (!prompt) return null;

  const isUpload = prompt.mode === 'upload';
  const count = prompt.count;

  const cardClass = isMaru
    ? 'bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-lg w-full text-white'
    : `rounded-2xl p-6 max-w-lg w-full shadow-xl ${
        isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
      }`;

  const closeBtnClass = isMaru
    ? 'p-2 hover:bg-white/20 rounded-lg transition'
    : 'p-2 rounded-lg transition ' + (isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100');

  const secondaryClass = isMaru
    ? 'px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium'
    : 'px-4 py-2 rounded-xl font-medium transition text-sm ' +
      (isDarkMode
        ? 'bg-slate-700 hover:bg-slate-600 text-white'
        : 'bg-slate-100 hover:bg-slate-200 text-slate-700');

  const dangerClass = isMaru
    ? 'px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition text-sm font-medium'
    : 'px-4 py-2 rounded-xl font-medium transition text-sm bg-red-500/15 hover:bg-red-500/25 text-red-500';

  const primaryClass = isMaru
    ? 'flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium disabled:opacity-50'
    : 'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition text-sm bg-green-500 hover:bg-green-600 text-white disabled:opacity-50';

  const mutedClass = isMaru
    ? 'text-sm text-white/70'
    : `text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={cardClass}>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold">{t('guest.migrateTitle')}</h2>
          <button onClick={onClose} className={closeBtnClass} aria-label={t('common.close')}>
            <X size={24} />
          </button>
        </div>

        <p className={`text-sm mb-6 ${mutedClass}`}>
          {isUpload ? t('guest.migrateUploadDesc', { count }) : t('guest.migrateImportDesc')}
        </p>

        <div className={`flex flex-wrap justify-end gap-3 ${isMaru ? '' : 'pt-2'}`}>
          <button onClick={() => onConfirm('discard')} disabled={busy} className={dangerClass}>
            <Trash2 size={16} className="inline mr-1.5 -mt-0.5" />
            {t('guest.discard')}
          </button>
          <button onClick={onClose} disabled={busy} className={secondaryClass}>
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onConfirm(prompt.mode)}
            disabled={busy}
            className={primaryClass}
          >
            {isUpload ? <CloudUpload size={16} /> : <Download size={16} />}
            {busy ? t('guest.migrating') : isUpload ? t('guest.migrateUpload') : t('guest.migrateImport')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestMigrationModal;