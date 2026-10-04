import { useRef } from 'react';
import { LogOut, Palette, Globe, Bell, Database, Download, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import LanguageSelector from './LanguageSelector';

// Pre-aviso presets (minutes before an activity starts).
const PRE_AVISO_OPTIONS = [0, 5, 10, 15, 30];

// `csv` is optional: when provided ({ onExport, onImport }), the "Data"
// section with the CSV export/import controls is rendered.
export function SettingsModal({ isOpen, onClose, notifications, csv }) {
  const { style, setStyle } = useTheme();
  const { t } = useTranslation();
  // Declared before the early return: hooks must never come after it.
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Delegated to MainShell.handleImportFile (which reads files[0] itself).
  // Reset after the call so re-picking the same file fires onChange again.
  const handleImportChange = (event) => {
    if (!csv?.onImport) return;
    csv.onImport(event);
    event.target.value = '';
  };

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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-80 shadow-2xl text-white border border-white/20">
        <h2 className="text-2xl font-bold mb-6">{t('settings.title')}</h2>

        <div className="mb-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Palette size={16} />
            {t('settings.visualStyle')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStyle('maru')}
              className={`px-4 py-3 rounded-xl font-medium border transition duration-200 ${
                style === 'maru'
                  ? 'bg-blue-500/40 border-blue-400/60 text-white'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
              }`}
            >
              Maru
            </button>
            <button
              onClick={() => setStyle('sei')}
              className={`px-4 py-3 rounded-xl font-medium border transition duration-200 ${
                style === 'sei'
                  ? 'bg-blue-500/40 border-blue-400/60 text-white'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
              }`}
            >
              Sei
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe size={16} />
            {t('settings.language')}
          </p>
          <LanguageSelector />
        </div>

        {notifications && (
          <div className="mb-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Bell size={16} />
              {t('notifications.title')}
            </p>
            <label className="flex items-center justify-between gap-3 text-sm text-white/85">
              <span>{t('notifications.preAviso')}</span>
              <span className="flex items-center gap-2">
                <select
                  value={notifications.preMinutes}
                  onChange={(event) => notifications.setPreMinutes(Number(event.target.value))}
                  className="bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-blue-400/60"
                  aria-label={t('notifications.preAviso')}
                >
                  {PRE_AVISO_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes} className="text-slate-900">
                      {minutes}
                    </option>
                  ))}
                </select>
                <span className="text-white/60">{t('notifications.preAvisoUnit')}</span>
              </span>
            </label>
            {notifications.permission === 'denied' && (
              <p className="mt-2 text-xs text-red-300">{t('notifications.denied')}</p>
            )}
          </div>
        )}

        {csv && (
          <div className="mb-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Database size={16} />
              {t('settings.dataSection')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportChange}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={csv.onExport}
                aria-label={t('csv.export')}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
              >
                <Download size={16} />
                {t('csv.export')}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('csv.import')}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
              >
                <Upload size={16} />
                {t('csv.import')}
              </button>
            </div>
          </div>
        )}

        <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/50 transition duration-200 font-medium"
        >
            <LogOut size={18} />
            {t('settings.logout')}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
        >
          {t('settings.close')}
        </button>
      </div>
    </div>
  );
}
