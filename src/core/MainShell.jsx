import { useMemo, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';

import { useClock } from '../hooks/useClock';
import { useTheme } from '../hooks/useTheme';
import { useActivities } from '../hooks/useActivities';
import { useGuestMigration } from '../hooks/useGuestMigration';
import { useLocalBackup } from '../hooks/useLocalBackup';
import { useCloudBackup } from '../hooks/useCloudBackup';
import { usePrivacy } from '../hooks/usePrivacy';
import { usePwa } from '../hooks/usePwa';
import { getCurrentDay } from '../utils/dates';
import { exportActivitiesToCsv, parseActivitiesCsv } from '../utils/csv';
import {
  backupFileName,
  buildBackup,
  downloadTextFile,
  isCloudEnvelope,
  parseBackup,
  serializeBackup,
} from '../utils/backup';
import { buildWeekRows, exportWeekToPdf, exportWeekToXlsx } from '../utils/export';
import { decryptValue, deriveKey, MIN_PASSPHRASE_LENGTH } from '../lib/crypto';

import AppLayout from './AppLayout';
import DetailViewMaru from './activities/DetailViewMaru';
import EditViewSei from './activities/EditViewSei';
import EditViewMaru from './activities/EditViewMaru';
import GuestMigrationModal from './common/GuestMigrationModal';
import BackupRestoreModal from './common/BackupRestoreModal';
import CloudBackupModal from './common/CloudBackupModal';
import ImportModal from './common/ImportModal';
import PassphraseModal from './common/PassphraseModal';

const timeToDecimal = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + minutes / 60;
};

const decimalToTimeString = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export default function MainShell({ user, isGuest = false, onExitGuest, encryption }) {
  // Modo privado (v4.0 C3): define qué categorías se descartan al guardar.
  const privacy = usePrivacy(user?.id);

  // Todo el CRUD pasa por el store que corresponda (IndexedDB o Supabase).
  const {
    schedules,
    loading,
    reload,
    rows,
    saveActivity,
    deleteActivity,
    copyDay: copyDayStore,
    appendRows,
  } = useActivities(user, { isGuest, privacy });
  const currentTime = useClock();
  const { themeMode, toggleTheme, bgColor, isDarkMode, style } = useTheme();
  const { t, localeForDate } = useTranslation();

  // Cifrado local (v4.0 C3). La instancia viene de `App.jsx`, que ya bloquea la
  // app si no está desbloqueada: aquí solo se gestionan los diálogos de passphrase.
  const [passphraseMode, setPassphraseMode] = useState(null); // 'create' | 'change' | 'disable'
  const [passphraseBusy, setPassphraseBusy] = useState(false);
  const [passphraseError, setPassphraseError] = useState(null);
  const [passphraseErrorMessage, setPassphraseErrorMessage] = useState('');

  // PWA (v4.0 C4): instalación, estado offline y service worker.
  const pwa = usePwa();

  // Oferta de migración del horario local (invitado) a la cuenta y viceversa.
  const migration = useGuestMigration(user, isGuest);

  // Auto-backup local en IndexedDB (v4.0 C2), sin conexión.
  const localBackup = useLocalBackup({
    userId: user?.id,
    activities: rows,
    loading,
    isGuest,
  });

  // Backup en la nube (v4.0 C5): Google Drive, manual. El hook y el estado del
  // modal se declaran ANTES del early return de `loading` (orden de hooks).
  const cloud = useCloudBackup({ rows, user, isGuest, encryption });
  const [showCloudModal, setShowCloudModal] = useState(false);

  const [currentDay, setCurrentDay] = useState(getCurrentDay());
  const [view, setView] = useState('main');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [editingActivityIndex, setEditingActivityIndex] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  // Vista previa de importación CSV: { fileName, rows, errors } | null
  const [importPreview, setImportPreview] = useState(null);
  // Vista previa de importación de backup JSON: { fileName, rows, errors } | null
  const [backupImportPreview, setBackupImportPreview] = useState(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [tempActivity, setTempActivity] = useState({
    start: 9,
    end: 10,
    activity: '',
    description: '',
    notes: '',
    color: '#7c5cff',
  });
  const [tempStartTime, setTempStartTime] = useState('09:00');
  const [tempEndTime, setTempEndTime] = useState('10:00');

  // Etiquetas traducidas que consumen los exportadores de PDF/XLSX
  // (src/utils/export.js no depende del i18n).
  const exportLabels = useMemo(
    () => ({
      docTitle: t('export.docTitle'),
      generatedOn: t('export.generatedOn'),
      summaryTitle: t('export.summaryTitle'),
      totalActivities: t('export.totalActivities'),
      totalHours: t('export.totalHours'),
      colDay: t('export.colDay'),
      colTitle: t('export.colTitle'),
      colStart: t('export.colStart'),
      colEnd: t('export.colEnd'),
      colDuration: t('export.colDuration'),
      colColor: t('export.colColor'),
      colDescription: t('export.colDescription'),
      colNotes: t('export.colNotes'),
      sheetWeek: t('export.sheetWeek'),
      sheetSummary: t('export.sheetSummary'),
      pageNumber: t('export.pageNumber'),
    }),
    [t]
  );

  // Ejecuta la oferta de migración (subir / importar / descartar) y avisa.
  const handleMigrationConfirm = async (mode) => {
    try {
      const count = await migration.run(mode);
      // Tras subir filas a la cuenta, el store activo (Supabase) debe releer.
      if (mode === 'upload') {
        await reload();
        alert(t('guest.migrateUploadSuccess', { count }));
      } else if (mode === 'import') {
        alert(t('guest.migrateImportSuccess', { count }));
      }
    } catch (error) {
      alert(t('guest.migrateError', { msg: error.message }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
        {t('common.loading')}
      </div>
    );
  }

  // ── Backup local (v4.0 C2) ───────────────────────────────────────────────

  /** Exportación completa en JSON (actividades + ajustes locales, formato GDPR). */
  const handleExportBackup = () => {
    try {
      const payload = buildBackup({ activities: rows, userId: user?.id, isGuest });
      downloadTextFile(serializeBackup(payload), backupFileName());
    } catch (error) {
      alert(t('backup.exportError', { msg: error.message }));
    }
  };

  /** Lee el archivo JSON y muestra la vista previa antes de insertar (append). */
  const handleImportBackupFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const { rows: validRows, errors } = parseBackup(String(reader.result ?? ''));
      setBackupImportPreview({ fileName: file.name, rows: validRows, errors });
    };
    reader.onerror = () => alert(t('backup.importError', { msg: 'read error' }));
    reader.readAsText(file);
  };

  const handleConfirmImportBackup = async () => {
    if (!backupImportPreview || backupImportPreview.rows.length === 0) return;

    try {
      const payload = backupImportPreview.rows.map((row) => ({ ...row, user_id: user.id }));
      await appendRows(payload);
      alert(t('backup.importSuccess', { count: payload.length }));
    } catch (error) {
      alert(t('backup.importError', { msg: error.message }));
    } finally {
      setBackupImportPreview(null);
    }
  };

  /** Snapshot manual inmediato. */
  const handleSaveBackupNow = async () => {
    const snapshot = await localBackup.createSnapshot();
    alert(snapshot ? t('backup.saved') : t('backup.localError', { msg: 'unknown' }));
  };

  /**
   * Restaura un snapshot local: **append** de sus actividades al horario actual,
   * sin borrar nada. Pide confirmación porque puede duplicar bloques.
   */
  const handleRestoreSnapshot = async (snapshot) => {
    const { rows: validRows } = localBackup.readSnapshotActivities(snapshot);
    if (validRows.length === 0) {
      alert(t('backup.restoreEmpty'));
      return;
    }

    const when = new Date(snapshot.created_at).toLocaleString(localeForDate);
    if (!window.confirm(t('backup.restoreConfirm', { count: validRows.length, when }))) return;

    try {
      const payload = validRows.map((row) => ({ ...row, user_id: user.id }));
      await appendRows(payload);
      setShowBackupModal(false);
      alert(t('backup.restoreSuccess', { count: payload.length }));
    } catch (error) {
      alert(t('backup.localError', { msg: error.message }));
    }
  };

  const handleDeleteSnapshot = async (snapshot) => {
    if (!window.confirm(t('backup.confirmDelete'))) return;
    try {
      await localBackup.deleteSnapshot(snapshot.id);
    } catch (error) {
      alert(t('backup.localError', { msg: error.message }));
    }
  };

  // ── Fin backup local ─────────────────────────────────────────────────────

  // ── Backup en la nube (v4.0 C5) ─────────────────────────────────────────

  /** Traduce los códigos de error de Drive a i18n; el resto usa `genericKey`. */
  const cloudAlert = (error, genericKey) => {
    const code = error?.code;
    if (code === 'offline') alert(t('backup.cloudOffline'));
    else if (code === 'expired') alert(t('backup.cloudExpired'));
    else if (code === 'forbidden') alert(t('backup.cloudNeedConnect'));
    else alert(t(genericKey, { msg: String(error?.message ?? code ?? 'unknown') }));
  };

  const handleCloudConnect = async () => {
    try {
      await cloud.connect();
    } catch (error) {
      // Cerrar el popup de consentimiento no es un error: no alertar.
      if (error?.code === 'popup_closed') return;
      cloudAlert(error, 'backup.cloudUploadError');
    }
  };

  const handleCloudDisconnect = () => {
    cloud.disconnect();
  };

  const handleCloudUpload = async () => {
    try {
      await cloud.upload();
      alert(t('backup.cloudUploaded'));
    } catch (error) {
      cloudAlert(error, 'backup.cloudUploadError');
    }
  };

  /** Abre el modal de copias en la nube y refresca la lista (errores → modal). */
  const handleOpenCloudList = () => {
    setShowCloudModal(true);
    cloud.list().catch(() => {}); // el modal pinta listBusy/listError
  };

  const handleCloudDelete = async (item) => {
    if (!window.confirm(t('backup.cloudConfirmDelete'))) return;
    try {
      await cloud.remove(item.id);
    } catch (error) {
      cloudAlert(error, 'backup.cloudListError');
    }
  };

  /**
   * Restaura una copia de la nube (append). Devuelve una promise que:
   *  - resuelve al completarse,
   *  - rechaza con `{ code: 'needsPassphrase' | 'wrongPassphrase' }` (el
   *    modal repite el prompt de frase inline, sin alert),
   *  - rechaza con `{ code: 'download' | 'format' | 'empty' | 'cancelled' |
   *    'append' }` para el resto (los no-inline ya han alertado aquí).
   */
  const handleCloudRestore = async (item, passphrase) => {
    let text;
    try {
      text = await cloud.download(item.id);
    } catch (error) {
      cloudAlert(error, 'backup.cloudRestoreError');
      throw { code: 'download' };
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      alert(t('backup.cloudRestoreError', { msg: 'invalid JSON' }));
      throw { code: 'format' };
    }

    let parsed;
    if (isCloudEnvelope(json)) {
      if (!passphrase) throw { code: 'needsPassphrase' };
      let inner;
      try {
        const { key } = await deriveKey(passphrase, json.kdf);
        inner = await decryptValue(key, json.payload);
      } catch {
        throw { code: 'wrongPassphrase' };
      }
      parsed = parseBackup(serializeBackup(inner));
    } else {
      parsed = parseBackup(text);
    }

    if (!parsed.payload || parsed.rows.length === 0) {
      alert(t('backup.restoreEmpty'));
      throw { code: 'empty' };
    }

    const when = new Date(item.createdTime).toLocaleString(localeForDate);
    if (!window.confirm(t('backup.restoreConfirm', { count: parsed.rows.length, when }))) {
      throw { code: 'cancelled' };
    }

    try {
      const payload = parsed.rows.map((row) => ({ ...row, user_id: user.id }));
      await appendRows(payload);
      setShowCloudModal(false);
      alert(t('backup.restoreSuccess', { count: payload.length }));
    } catch (error) {
      cloudAlert(error, 'backup.cloudRestoreError');
      throw { code: 'append' };
    }
  };

  // ── Fin backup en la nube ───────────────────────────────────────────────

  // ── Cifrado local (v4.0 C3) ──────────────────────────────────────────────

  const closePassphraseModal = () => {
    setPassphraseMode(null);
    setPassphraseError(null);
    setPassphraseErrorMessage('');
  };

  const handlePassphraseSubmit = async ({ passphrase, confirmation, newPassphrase }) => {
    setPassphraseBusy(true);
    setPassphraseError(null);
    setPassphraseErrorMessage('');

    const fail = () => {
      setPassphraseError(encryption.getError() ?? 'unexpected');
      setPassphraseErrorMessage(encryption.getErrorMessage());
    };

    try {
      if (passphraseMode === 'create') {
        if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
          setPassphraseError('passphraseTooShort');
          return;
        }
        if (passphrase !== confirmation) {
          setPassphraseError('passphraseMismatch');
          return;
        }
        if (await encryption.enable(passphrase)) closePassphraseModal();
        else fail();
        return;
      }

      if (passphraseMode === 'change') {
        if (newPassphrase.length < MIN_PASSPHRASE_LENGTH) {
          setPassphraseError('passphraseTooShort');
          return;
        }
        if (await encryption.changePassphrase(passphrase, newPassphrase)) closePassphraseModal();
        else fail();
        return;
      }

      if (passphraseMode === 'disable') {
        if (await encryption.disable(passphrase)) closePassphraseModal();
        else fail();
      }
    } finally {
      setPassphraseBusy(false);
    }
  };

  // ── Fin cifrado local ────────────────────────────────────────────────────

  // ── PWA (v4.0 C4) ───────────────────────────────────────────────────────

  const handleInstall = async () => {
    const outcome = await pwa.promptInstall();
    if (outcome === 'accepted') {
      alert(t('pwa.installed'));
    } else if (outcome === 'dismissed') {
      alert(t('pwa.installDismissed'));
    }
  };

  // ── Fin PWA ─────────────────────────────────────────────────────────────

  const handleCopyDay = async (sourceDay, targetDay) => {
    const sourceActivities = schedules[sourceDay] || [];
    if (sourceActivities.length === 0) {
      alert(t('messages.noActivitiesCopy'));
      return;
    }

    if (!window.confirm(t('messages.confirmReplace', { target: targetDay, source: sourceDay }) + '\n\n' + t('messages.willDelete', { count: (schedules[targetDay] || []).length }))) return;

    try {
      const count = await copyDayStore(sourceDay, targetDay);
      alert(t('messages.copiedSuccess', { count, source: sourceDay, target: targetDay }));
    } catch (error) {
      alert(t('messages.copyError', { msg: error.message }));
    }
  };

  // Exporta la semana completa (7 días) a un archivo CSV con BOM UTF-8.
  const handleExportCsv = () => {
    const totalActivities = Object.values(schedules).reduce(
      (total, day) => total + (day?.length || 0),
      0
    );
    if (totalActivities === 0) {
      alert(t('csv.noActivities'));
      return;
    }

    try {
      const csv = exportActivitiesToCsv(schedules);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      link.href = url;
      link.download = `jikan-schedule-${dateKey}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(t('csv.exportError', { msg: error.message }));
    }
  };

  // Exporta la semana completa a un PDF A4 apaisado (resumen + tabla por día).
  const handleExportPdf = async () => {
    const rows = buildWeekRows(schedules);
    if (rows.length === 0) {
      alert(t('export.noActivities'));
      return;
    }

    try {
      await exportWeekToPdf({ rows, labels: exportLabels });
    } catch (error) {
      alert(t('export.exportError', { msg: error.message }));
    }
  };

  // Exporta la semana completa a un XLSX de dos hojas (Semana + Resumen).
  const handleExportXlsx = async () => {
    const rows = buildWeekRows(schedules);
    if (rows.length === 0) {
      alert(t('export.noActivities'));
      return;
    }

    try {
      await exportWeekToXlsx({ rows, labels: exportLabels });
    } catch (error) {
      alert(t('export.exportError', { msg: error.message }));
    }
  };

  // Lee el archivo seleccionado y muestra la vista previa (modal de importación).
  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const { rows, errors } = parseActivitiesCsv(String(reader.result ?? ''));
      setImportPreview({ fileName: file.name, rows, errors });
    };
    reader.onerror = () => alert(t('csv.parseError'));
    reader.readAsText(file);
  };

  // Inserta las filas válidas (append) y recarga el calendario.
  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.rows.length === 0) return;

    try {
      const payload = importPreview.rows.map((row) => ({ ...row, user_id: user.id }));
      await appendRows(payload);
      alert(t('csv.importSuccess', { count: payload.length }));
    } catch (error) {
      alert(t('csv.importError', { msg: error.message }));
    } finally {
      setImportPreview(null);
    }
  };

  const handleDeleteActivity = async (day, activityIndex) => {
    const schedule = schedules[day] || [];
    const activity = schedule[activityIndex];
    if (!activity?.id) return;

    try {
      await deleteActivity(activity.id);
    } catch (error) {
      alert(t('messages.deleteError', { msg: error.message }));
    }
  };

  const handleSaveActivity = async (day, originalActivity, updatedActivity) => {
    if (updatedActivity.end <= updatedActivity.start) {
      alert(t('messages.endAfterStart'));
      return;
    }
    if (!updatedActivity.activity.trim()) {
      alert(t('messages.nameRequired'));
      return;
    }

    try {
      await saveActivity(day, originalActivity, updatedActivity);
    } catch (error) {
      alert(t('messages.error', { msg: error.message }));
      return;
    }

    setView('main');
    setEditingActivity(null);
    setEditingDay(null);
    setEditingActivityIndex(null);
  };

  const handleAddActivity = (day) => {
    setEditingDay(day);
    setEditingActivity(null);
    setEditingActivityIndex(null);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.floor(now.getMinutes() / 15) * 15;
    const startStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const endStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute + 30).padStart(2, '0')}`;

    setTempActivity({
      start: timeToDecimal(startStr),
      end: timeToDecimal(endStr),
      activity: '',
      description: '',
      notes: '',
      color: '#7c5cff',
    });
    setTempStartTime(startStr);
    setTempEndTime(endStr);
    setView('edit');
  };

  const handleEditActivity = (activity, day, index) => {
    setEditingDay(day);
    setEditingActivity(activity);
    setEditingActivityIndex(index);
    const startStr = decimalToTimeString(activity.start);
    const endStr = decimalToTimeString(activity.end);

    setTempActivity({
      start: activity.start,
      end: activity.end,
      activity: activity.title,
      description: activity.description || '',
      notes: activity.notes || '',
      color: activity.color || '#7c5cff',
    });
    setTempStartTime(startStr);
    setTempEndTime(endStr);
    setView('edit');
  };

  const handleActivitySelect = (activity, index, event) => {
    if (event?.button === 2 || event?.ctrlKey) {
      event.preventDefault();
      handleEditActivity(activity, currentDay, index);
      return;
    }
    setSelectedActivity(activity);
    setView('detail');
  };

  const handleBackToMain = () => {
    setView('main');
    setSelectedActivity(null);
  };

  const handleStartTimeChange = (timeString) => {
    setTempStartTime(timeString);
    setTempActivity((prev) => ({ ...prev, start: timeToDecimal(timeString) }));
  };

  const handleEndTimeChange = (timeString) => {
    setTempEndTime(timeString);
    setTempActivity((prev) => ({ ...prev, end: timeToDecimal(timeString) }));
  };

  if (view === 'detail' && selectedActivity) {
    return (
      <DetailViewMaru
        activity={selectedActivity}
        day={currentDay}
        bgColor={bgColor}
        themeMode={themeMode}
        onBack={handleBackToMain}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (view === 'edit') {
    const editorProps = {
      bgColor,
      editingActivity,
      editingDay,
      editingActivityIndex,
      tempActivity,
      tempStartTime,
      tempEndTime,
      isDarkMode: isDarkMode(),
      onSave: handleSaveActivity,
      onCancel: () => { setView('main'); setEditingActivity(null); setEditingDay(null); setEditingActivityIndex(null); },
      onDelete: (day, idx) => {
        if (window.confirm(t('messages.confirmDelete'))) {
          handleDeleteActivity(day, idx);
          setView('main');
          setEditingActivity(null);
          setEditingDay(null);
          setEditingActivityIndex(null);
        }
      },
      onStartTimeChange: handleStartTimeChange,
      onEndTimeChange: handleEndTimeChange,
      onTempActivityChange: setTempActivity,
    };

    return style === 'maru'
      ? <EditViewMaru {...editorProps} />
      : <EditViewSei {...editorProps} />;
  }

  return (
    <>
      <AppLayout
        style={style}
        schedules={schedules}
        currentDay={currentDay}
        onSelectDay={setCurrentDay}
        onActivitySelect={handleActivitySelect}
        onAddActivity={handleAddActivity}
        onEditActivity={handleEditActivity}
        showCopyModal={showCopyModal}
        setShowCopyModal={setShowCopyModal}
        onCopyDay={handleCopyDay}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onExportXlsx={handleExportXlsx}
        onImportFile={handleImportFile}
        importPreview={importPreview}
        onCloseImport={() => setImportPreview(null)}
        onConfirmImport={handleConfirmImport}
        backupActions={{
          onExportJson: handleExportBackup,
          onImportJson: handleImportBackupFile,
          onOpenBackups: () => setShowBackupModal(true),
          onSaveBackupNow: handleSaveBackupNow,
          snapshotCount: localBackup.snapshots.length,
          lastBackupAt: localBackup.lastBackupAt,
          busy: localBackup.busy,
        }}
        cloudActions={{
          onCloudConnect: handleCloudConnect,
          onCloudDisconnect: handleCloudDisconnect,
          onCloudUpload: handleCloudUpload,
          onOpenCloudList: handleOpenCloudList,
          status: cloud.status,
          cloudBusy: cloud.busy,
        }}
        currentTime={currentTime}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
        bgColor={bgColor}
        isDarkMode={isDarkMode}
        user={user}
        isGuest={isGuest}
        onExitGuest={onExitGuest}
        privacy={{
          privacy,
          encryption: {
            supported: encryption.supported,
            enabled: encryption.enabled,
            onOpen: (mode) => {
              setPassphraseError(null);
              setPassphraseMode(mode);
            },
          },
        }}
        pwa={{
          canInstall: pwa.canInstall,
          isInstalled: pwa.isInstalled,
          isOffline: pwa.isOffline,
          offlineReady: pwa.offlineReady,
          supported: pwa.supported,
          onInstall: handleInstall,
        }}
      />

      <GuestMigrationModal
        prompt={migration.prompt}
        busy={migration.busy}
        onConfirm={handleMigrationConfirm}
        onClose={migration.dismiss}
        isMaru={style === 'maru'}
        isDarkMode={isDarkMode()}
      />

      <ImportModal
        isOpen={!!backupImportPreview}
        fileName={backupImportPreview?.fileName || ''}
        rows={backupImportPreview?.rows || []}
        errors={backupImportPreview?.errors || []}
        onConfirm={handleConfirmImportBackup}
        onClose={() => setBackupImportPreview(null)}
        isMaru={style === 'maru'}
        isDarkMode={isDarkMode()}
        labels={{
          title: t('backup.importTitle'),
          file: t('backup.importFile', { file: backupImportPreview?.fileName || '' }),
          confirm: t('backup.importConfirm', { count: backupImportPreview?.rows?.length || 0 }),
          nothingToImport: t('backup.nothingToImport'),
          confirmButton: t('backup.importConfirmButton'),
        }}
      />

      <BackupRestoreModal
        isOpen={showBackupModal}
        snapshots={localBackup.snapshots}
        busy={localBackup.busy}
        onRestore={handleRestoreSnapshot}
        onDelete={handleDeleteSnapshot}
        onClose={() => setShowBackupModal(false)}
        isMaru={style === 'maru'}
        isDarkMode={isDarkMode()}
      />

      <CloudBackupModal
        isOpen={showCloudModal}
        items={cloud.items}
        busy={cloud.busy}
        listBusy={cloud.listBusy}
        listError={cloud.listError}
        status={cloud.status}
        onRestore={handleCloudRestore}
        onDelete={handleCloudDelete}
        onClose={() => setShowCloudModal(false)}
        isMaru={style === 'maru'}
        isDarkMode={isDarkMode()}
      />

      <PassphraseModal
        isOpen={passphraseMode != null}
        mode={passphraseMode ?? 'create'}
        busy={passphraseBusy}
        error={passphraseError}
        errorMessage={passphraseErrorMessage}
        onSubmit={handlePassphraseSubmit}
        onClose={closePassphraseModal}
        isMaru={style === 'maru'}
        isDarkMode={isDarkMode()}
      />
    </>
  );
}


