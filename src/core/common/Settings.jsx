import { useRef } from 'react';
import {
  LogOut,
  LogIn,
  Palette,
  Globe,
  Bell,
  Database,
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  FileDown,
  FileUp,
  Archive,
  History,
  Save,
  Info,
  ShieldCheck,
  Lock,
  LockOpen,
  KeyRound,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import LanguageSelector from './LanguageSelector';

// Categorías del modo privado (v4.0 C3) mostradas en la sección "Privacidad".
const PRIVACY_ITEMS = [
  { key: 'notes', label: 'privacy.notes' },
  { key: 'description', label: 'privacy.description' },
  { key: 'reminders', label: 'privacy.reminders' },
];

// Pre-aviso presets (minutes before an activity starts).
const PRE_AVISO_OPTIONS = [0, 5, 10, 15, 30];

// `data` is optional: when provided it enables the "Data" section with the
// CSV/PDF/XLSX export, CSV import and the JSON backup controls (v4.0 C2):
//   {
//     onExport, onExportPdf, onExportXlsx, onImport,
//     onExportJson, onImportJson, onOpenBackups, onSaveBackupNow,
//     snapshotCount, lastBackupAt, backupBusy
//   }
// `isGuest` switches the account section: in guest mode there is no Supabase
// session to sign out of, so instead of "Log out" we offer "Create account /
// Log in" plus a secondary "Exit local mode" (both delegate to `onExitGuest`).
// `privacy` is optional and enables the "Privacy" section (v4.0 C3):
//   { privacy: { notes, description, reminders, toggle(category) },
//     encryption: { supported, enabled, onOpen(mode) } }
export function SettingsModal({ isOpen, onClose, notifications, data, isGuest = false, onExitGuest, privacy }) {
  const { style, setStyle } = useTheme();
  const { t, localeForDate } = useTranslation();
  // Declared before the early return: hooks must never come after it.
  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);

  if (!isOpen) return null;

  // Delegated to MainShell.handleImportFile (which reads files[0] itself).
  // Reset after the call so re-picking the same file fires onChange again.
  const handleImportChange = (event) => {
    if (!data?.onImport) return;
    data.onImport(event);
    event.target.value = '';
  };

  const handleBackupImportChange = (event) => {
    if (!data?.onImportJson) return;
    data.onImportJson(event);
    event.target.value = '';
  };

  const formatWhen = (iso) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString(localeForDate);
    } catch {
      return iso;
    }
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

  // Guest mode: leaving the local mode returns to the login screen. Local data
  // is kept, hence the explicit confirmation.
  const handleExitGuest = () => {
    const accepted = window.confirm(t('guest.confirmExit'));
    if (!accepted) return;
    onExitGuest?.();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-80 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl text-white border border-white/20">
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

        {data && (
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
                onClick={data.onExport}
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
              {data.onExportPdf && (
                <button
                  onClick={data.onExportPdf}
                  aria-label={t('export.pdf')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
                >
                  <FileText size={16} />
                  {t('export.pdf')}
                </button>
              )}
              {data.onExportXlsx && (
                <button
                  onClick={data.onExportXlsx}
                  aria-label={t('export.xlsx')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
                >
                  <FileSpreadsheet size={16} />
                  {t('export.xlsx')}
                </button>
              )}
            </div>

            {data.onExportJson && (
              <>
                {/* ── Local backup (v4.0 C2) ── */}
                <p className="text-sm font-semibold mt-5 mb-1 flex items-center gap-2">
                  <Archive size={16} />
                  {t('backup.title')}
                </p>
                <p className="text-xs text-white/60 mb-3">{t('backup.intro')}</p>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleBackupImportChange}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={data.onExportJson}
                    aria-label={t('backup.exportJson')}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
                  >
                    <FileDown size={16} />
                    {t('backup.exportJson')}
                  </button>
                  <button
                    onClick={() => backupInputRef.current?.click()}
                    aria-label={t('backup.importJson')}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
                  >
                    <FileUp size={16} />
                    {t('backup.importJson')}
                  </button>
                  <button
                    onClick={data.onOpenBackups}
                    aria-label={t('backup.backups')}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
                  >
                    <History size={16} />
                    {t('backup.backups')}
                  </button>
                  <button
                    onClick={data.onSaveBackupNow}
                    disabled={data.backupBusy}
                    aria-label={t('backup.saveNow')}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium disabled:opacity-50"
                  >
                    <Save size={16} />
                    {t('backup.saveNow')}
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  {data.lastBackupAt
                    ? t('backup.lastBackup', { when: formatWhen(data.lastBackupAt) })
                    : t('backup.noBackups')}
                </p>
              </>
            )}
          </div>
        )}

        {privacy && (
          <div className="mb-4">
            <p className="text-sm font-semibold mb-1 flex items-center gap-2">
              <ShieldCheck size={16} />
              {t('privacy.section')}
            </p>
            <p className="text-xs text-white/60 mb-3">{t('privacy.intro')}</p>

            <div className="space-y-2">
              {PRIVACY_ITEMS.map((item) => {
                const enabled = privacy.privacy[item.key] !== false;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => privacy.privacy.toggle(item.key)}
                    aria-pressed={enabled}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition"
                  >
                    <span className="text-sm text-white/90">{t(item.label)}</span>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${
                        enabled ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {enabled ? t('privacy.on') : t('privacy.off')}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-white/50">{t('privacy.offHint')}</p>

            {privacy.encryption && (
              <>
                <p className="text-sm font-semibold mt-5 mb-1 flex items-center gap-2">
                  <Lock size={16} />
                  {t('privacy.encryption')}
                </p>
                <p className="text-xs text-white/60 mb-3">{t('privacy.encryptionIntro')}</p>
                {privacy.encryption.enabled && (
                  <p className="mb-2 text-xs text-green-300">{t('privacy.encryptionActive')}</p>
                )}
                {!privacy.encryption.supported ? (
                  <p className="text-xs text-amber-300">{t('encryption.notSupported')}</p>
                ) : privacy.encryption.enabled ? (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => privacy.encryption.onOpen('change')}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition text-sm font-medium"
                    >
                      <KeyRound size={16} />
                      {t('privacy.changePassphrase')}
                    </button>
                    <button
                      onClick={() => privacy.encryption.onOpen('disable')}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30 transition text-sm font-medium"
                    >
                      <LockOpen size={16} />
                      {t('privacy.disableEncryption')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => privacy.encryption.onOpen('create')}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition text-sm font-medium"
                  >
                    <Lock size={16} />
                    {t('privacy.enableEncryption')}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {isGuest ? (
          <div>
            <p className="mb-3 text-xs text-white/70 flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>{t('guest.dataNotice')}</span>
            </p>
            <button
              onClick={() => onExitGuest?.()}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-blue-100 border border-blue-500/30 hover:border-blue-500/50 transition duration-200 font-medium"
            >
              <LogIn size={18} />
              {t('guest.createAccount')}
            </button>
            <button
              onClick={handleExitGuest}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 mt-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 transition duration-200 text-sm font-medium"
            >
              <LogOut size={16} />
              {t('guest.exitLocalMode')}
            </button>
          </div>
        ) : (
          <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/50 transition duration-200 font-medium"
          >
              <LogOut size={18} />
              {t('settings.logout')}
          </button>
        )}

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
