/**
 * ImportModal Component
 *
 * Vista previa de la importación de un CSV: cuenta de filas válidas,
 * errores de fila y confirmación antes del insert en Supabase.
 * Soporta ambas variantes: Maru (glass) y Sei (Tailwind plano).
 */

import { X, Upload, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

const MAX_ERRORS_SHOWN = 5;

const ImportModal = ({
  isOpen,
  fileName,
  rows,
  errors,
  onConfirm,
  onClose,
  isMaru,
  isDarkMode,
  labels,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // `labels` permite reutilizar el modal con otra fuente (p. ej. backup JSON)
  // sin duplicar el componente. Los errores por fila siempre usan `csv.err*`
  // porque son genéricos (día inválido, título vacío, rango de horas).
  const copy = {
    title: t('csv.importTitle'),
    file: t('csv.importFile', { file: fileName }),
    confirm: t('csv.importConfirm', { count: rows.length }),
    nothingToImport: t('csv.nothingToImport'),
    confirmButton: t('csv.importConfirmButton'),
    ...(labels || {}),
  };

  const canImport = rows.length > 0;
  const shownErrors = errors.slice(0, MAX_ERRORS_SHOWN);

  const cardClass = isMaru
    ? 'bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-lg w-full text-white'
    : `rounded-2xl p-6 max-w-lg w-full shadow-xl ${
        isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
      }`;

  const closeBtnClass = isMaru
    ? 'p-2 hover:bg-white/20 rounded-lg transition'
    : 'p-2 rounded-lg transition ' + (isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100');

  const cancelBtnClass = isMaru
    ? 'px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium'
    : 'px-4 py-2 rounded-xl font-medium transition text-sm ' +
      (isDarkMode
        ? 'bg-slate-700 hover:bg-slate-600 text-white'
        : 'bg-slate-100 hover:bg-slate-200 text-slate-700');

  const confirmBtnClass = isMaru
    ? 'px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
    : 'px-4 py-2 rounded-xl font-medium transition text-sm bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={cardClass}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">{copy.title}</h2>
            <p className={`text-sm mt-1 ${isMaru ? 'text-white/70' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {copy.file}
            </p>
          </div>
          <button onClick={onClose} className={closeBtnClass} aria-label={t('common.close')}>
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {canImport ? (
            <p className="text-sm font-medium">
              <Upload size={16} className="inline mr-2 -mt-0.5" />
              {copy.confirm}
            </p>
          ) : (
            <p className={`text-sm font-medium ${isMaru ? 'text-white/70' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {copy.nothingToImport}
            </p>
          )}

          {errors.length > 0 && (
            <div
              className={`p-4 rounded-lg border text-sm ${
                isMaru
                  ? 'bg-yellow-500/15 border-yellow-500/30'
                  : isDarkMode
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <p className="font-semibold flex items-center gap-2 mb-2">
                <AlertTriangle size={16} />
                {t('csv.invalidRows', { count: errors.length })}
              </p>
              <ul className="space-y-1 opacity-90">
                {shownErrors.map((error, index) => (
                  <li key={index}>{t(error.key, { row: error.row })}</li>
                ))}
                {errors.length > MAX_ERRORS_SHOWN && (
                  <li>{t('csv.moreErrors', { count: errors.length - MAX_ERRORS_SHOWN })}</li>
                )}
              </ul>
              <p className="mt-2 text-xs opacity-70">{t('csv.errorsSkipped')}</p>
            </div>
          )}
        </div>

        <div className={`mt-6 flex justify-end gap-3 ${isMaru ? '' : 'pt-2'}`}>
          <button onClick={onClose} className={cancelBtnClass}>
            {t('common.cancel')}
          </button>
          {canImport && (
            <button onClick={onConfirm} className={confirmBtnClass}>
              {copy.confirmButton}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
