/**
 * BackupRestoreModal Component
 *
 * Lista las copias locales automáticas (snapshots en IndexedDB) y permite
 * restaurar o eliminar cada una. Restaurar hace **append**: añade las
 * actividades de la copia al horario actual sin borrar nada.
 *
 * Soporta ambas variantes: Maru (glass) y Sei (Tailwind plano).
 */

import { X, Archive, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

const BackupRestoreModal = ({
  isOpen,
  snapshots = [],
  busy = false,
  onRestore,
  onDelete,
  onClose,
  isMaru,
  isDarkMode,
}) => {
  const { t, localeForDate } = useTranslation();

  if (!isOpen) return null;

  const formatWhen = (iso) => {
    try {
      return new Date(iso).toLocaleString(localeForDate);
    } catch {
      return iso;
    }
  };

  const cardClass = isMaru
    ? 'bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-lg w-full text-white'
    : `rounded-2xl p-6 max-w-lg w-full shadow-xl ${
        isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
      }`;

  const closeBtnClass = isMaru
    ? 'p-2 hover:bg-white/20 rounded-lg transition'
    : 'p-2 rounded-lg transition ' + (isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100');

  const listItemClass = isMaru
    ? 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/10 border border-white/10'
    : `flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${
        isDarkMode ? 'bg-slate-700/60 border-slate-600' : 'bg-slate-50 border-slate-200'
      }`;

  const secondaryClass = isMaru
    ? 'px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium'
    : 'px-4 py-2 rounded-xl font-medium transition text-sm ' +
      (isDarkMode
        ? 'bg-slate-700 hover:bg-slate-600 text-white'
        : 'bg-slate-100 hover:bg-slate-200 text-slate-700');

  const mutedClass = isMaru
    ? 'text-sm text-white/70'
    : `text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  const metaClass = isMaru
    ? 'text-xs text-white/60'
    : `text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  const iconBtnClass = isMaru
    ? 'p-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-40'
    : `p-2 rounded-lg transition disabled:opacity-40 ${
        isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
      }`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${cardClass} max-h-[85vh] flex flex-col`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Archive size={20} />
            <h2 className="text-2xl font-bold">{t('backup.restoreTitle')}</h2>
          </div>
          <button onClick={onClose} className={closeBtnClass} aria-label={t('common.close')}>
            <X size={24} />
          </button>
        </div>

        <p className={`${mutedClass} mb-4`}>{t('backup.restoreIntro')}</p>

        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1">
          {snapshots.length === 0 ? (
            <p className={`${mutedClass} py-6 text-center`}>{t('backup.noBackups')}</p>
          ) : (
            <ul className="space-y-2">
              {snapshots.map((snapshot) => {
                const when = formatWhen(snapshot.created_at);
                return (
                  <li key={snapshot.id} className={listItemClass}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t('backup.snapshotMeta', { count: snapshot.count, when })}
                      </p>
                      <p className={metaClass}>{when}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onRestore?.(snapshot)}
                        disabled={busy}
                        aria-label={t('backup.restore')}
                        title={t('backup.restore')}
                        className={iconBtnClass}
                      >
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                      </button>
                      <button
                        onClick={() => onDelete?.(snapshot)}
                        disabled={busy}
                        aria-label={t('backup.deleteSnapshot')}
                        title={t('backup.deleteSnapshot')}
                        className={iconBtnClass}
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

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className={secondaryClass}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreModal;