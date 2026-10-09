/**
 * Settings › Data section.
 * Owns the CSV import/export grid, the optional PDF/XLSX exports and the JSON
 * local-backup sub-block. Every visual comes from the `s` tokens plus the
 * primitives in `./ui.jsx`, so Maru and Sei share a single implementation.
 */

import { useRef } from 'react';
import {
  Archive,
  Cloud,
  CloudDownload,
  CloudOff,
  CloudUpload,
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileUp,
  History,
  Save,
  Upload,
  UploadCloud,
} from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { Section, SubGroup, ActionGrid, ActionButton, Note } from './ui';

export default function DataSection({ s, data }) {
  const { t, localeForDate } = useTranslation();
  // Declared before the early return: hooks must never come after it.
  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);

  if (!data) return null;

  // Delegated to MainShell.handleImportFile (which reads files[0] itself).
  // Reset after the call so re-picking the same file fires onChange again.
  const handleImportChange = (event) => {
    if (!data.onImport) return;
    data.onImport(event);
    event.target.value = '';
  };

  const handleBackupImportChange = (event) => {
    if (!data.onImportJson) return;
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

  return (
    <Section s={s} title={t('settings.dataSection')} description={t('settings.dataIntro')} icon={Database}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportChange}
      />

      <ActionGrid>
        <ActionButton s={s} icon={Download} onClick={data.onExport}>
          {t('csv.export')}
        </ActionButton>
        <ActionButton s={s} icon={Upload} onClick={() => fileInputRef.current?.click()}>
          {t('csv.import')}
        </ActionButton>
        {data.onExportPdf && (
          <ActionButton s={s} icon={FileText} onClick={data.onExportPdf}>
            {t('export.pdf')}
          </ActionButton>
        )}
        {data.onExportXlsx && (
          <ActionButton s={s} icon={FileSpreadsheet} onClick={data.onExportXlsx}>
            {t('export.xlsx')}
          </ActionButton>
        )}
      </ActionGrid>

      {/* ── Local backup (v4.0 C2) ── */}
      {data.onExportJson && (
        <SubGroup s={s} icon={Archive} title={t('backup.title')} description={t('backup.intro')}>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleBackupImportChange}
          />

          <ActionGrid>
            <ActionButton s={s} icon={FileDown} onClick={data.onExportJson}>
              {t('backup.exportJson')}
            </ActionButton>
            <ActionButton s={s} icon={FileUp} onClick={() => backupInputRef.current?.click()}>
              {t('backup.importJson')}
            </ActionButton>
            <ActionButton s={s} icon={History} onClick={data.onOpenBackups}>
              {t('backup.backups')}
            </ActionButton>
            <ActionButton s={s} icon={Save} onClick={data.onSaveBackupNow} disabled={data.backupBusy}>
              {t('backup.saveNow')}
            </ActionButton>
          </ActionGrid>

          <Note s={s} className="mt-2">
            {data.lastBackupAt
              ? t('backup.lastBackup', { when: formatWhen(data.lastBackupAt) })
              : t('backup.noBackups')}
          </Note>
        </SubGroup>
      )}

      {/* ── Cloud backup (v4.0 C5) ── */}
      {data.onCloudUpload && (
        <SubGroup s={s} icon={CloudUpload} title={t('backup.cloudTitle')} description={t('backup.cloudIntro')}>
          <ActionGrid>
            {data.status === 'connected' ? (
              <ActionButton s={s} icon={CloudOff} onClick={data.onCloudDisconnect} disabled={data.cloudBusy}>
                {t('backup.cloudDisconnect')}
              </ActionButton>
            ) : (
              <ActionButton s={s} icon={Cloud} onClick={data.onCloudConnect} disabled={data.cloudBusy}>
                {t('backup.cloudConnect')}
              </ActionButton>
            )}
            <ActionButton
              s={s}
              icon={UploadCloud}
              onClick={data.onCloudUpload}
              disabled={data.cloudBusy || data.status !== 'connected'}
            >
              {t('backup.cloudUpload')}
            </ActionButton>
            <ActionButton
              s={s}
              icon={CloudDownload}
              onClick={data.onOpenCloudList}
              disabled={data.status !== 'connected'}
            >
              {t('backup.cloudList')}
            </ActionButton>
          </ActionGrid>

          <Note
            s={s}
            tone={data.status === 'expired' ? 'warn' : 'info'}
            className="mt-2"
          >
            {data.status === 'connected'
              ? t('backup.cloudConnected')
              : data.status === 'expired'
                ? t('backup.cloudExpired')
                : t('backup.cloudDisconnected')}
          </Note>
          <Note s={s} className="mt-2">
            {t('legal.driveNotice')}
          </Note>
        </SubGroup>
      )}

      <Note s={s} className="mt-4">
        <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="underline">
          {t('legal.privacy')}
        </a>
        {' · '}
        <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="underline">
          {t('legal.terms')}
        </a>
      </Note>
    </Section>
  );
}