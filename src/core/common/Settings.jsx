/**
 * SettingsModal — the application settings dialog.
 *
 * Layout is a two-pane "sidebar + panel" shell: a list of sections on the left
 * (a vertical `tablist` on desktop, a horizontally scrollable chip row on
 * phones) and the active section rendered on the right. Each section is an
 * isolated component in `./settings/`, so no file has to know about the others.
 *
 * Styling follows the pattern used by the other modals in the app: a single
 * implementation fed by `isMaru` / `isDarkMode`, with every colour resolved in
 * `./settings/settingsStyles.js`.
 *
 * Props:
 *   isOpen, onClose   — visibility.
 *   notifications     — { preMinutes, setPreMinutes, permission, viaServiceWorker }
 *                       Enables the "Notifications" section when present.
 *   data              — { onExport, onExportPdf, onExportXlsx, onImport,
 *                         onExportJson, onImportJson, onOpenBackups,
 *                         onSaveBackupNow, snapshotCount, lastBackupAt,
 *                         backupBusy }
 *                       Enables the "Data" section (CSV/PDF/XLSX + local backup).
 *   privacy           — { privacy: { notes, description, reminders, toggle },
 *                         encryption: { supported, enabled, onOpen } }
 *                       Enables the "Privacy" section.
 *   pwa               — { canInstall, isInstalled, isOffline, offlineReady, onInstall }
 *                       Enables the "App" section.
 *   isGuest           — switches the "Account" section to local-mode actions.
 *   onExitGuest       — leaves the account-free local mode.
 *   isMaru/isDarkMode — visual variant of the app currently in use.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Palette, Bell, Database, ShieldCheck, Smartphone, User } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStyles } from './settings/settingsStyles';
import AppearanceSection from './settings/AppearanceSection';
import NotificationsSection from './settings/NotificationsSection';
import DataSection from './settings/DataSection';
import PrivacySection from './settings/PrivacySection';
import AppSection from './settings/AppSection';
import AccountSection from './settings/AccountSection';

// Section registry: the order here is the order shown in the sidebar. Optional
// sections disappear when the props that feed them are missing.
const SECTIONS = [
  { id: 'appearance', icon: Palette, labelKey: 'settings.appearance', enabled: () => true },
  { id: 'notifications', icon: Bell, labelKey: 'notifications.title', enabled: ({ notifications }) => !!notifications },
  { id: 'data', icon: Database, labelKey: 'settings.dataSection', enabled: ({ data }) => !!data },
  { id: 'privacy', icon: ShieldCheck, labelKey: 'privacy.section', enabled: ({ privacy }) => !!privacy },
  { id: 'app', icon: Smartphone, labelKey: 'pwa.title', enabled: ({ pwa }) => !!pwa },
  { id: 'account', icon: User, labelKey: 'settings.account', enabled: () => true },
];

const SECTION_VIEWS = {
  appearance: AppearanceSection,
  notifications: NotificationsSection,
  data: DataSection,
  privacy: PrivacySection,
  app: AppSection,
  account: AccountSection,
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const tabId = (id) => `settings-tab-${id}`;
const panelId = (id) => `settings-panel-${id}`;

export function SettingsModal({
  isOpen,
  onClose,
  notifications,
  data,
  isGuest = false,
  onExitGuest,
  privacy,
  pwa,
  isMaru = true,
  isDarkMode = false,
}) {
  const { t } = useTranslation();
  const s = useSettingsStyles(isMaru, isDarkMode);
  const dialogRef = useRef(null);

  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  const enabledIds = useMemo(
    () =>
      SECTIONS.filter((section) => section.enabled({ notifications, data, privacy, pwa })).map((section) => section.id),
    [notifications, data, privacy, pwa]
  );

  // The active section must always be one that is actually rendered.
  useEffect(() => {
    setActiveId((prev) => (enabledIds.includes(prev) ? prev : enabledIds[0] ?? null));
  }, [enabledIds]);

  // Always reopen on the first section.
  useEffect(() => {
    if (isOpen) setActiveId(SECTIONS[0].id);
  }, [isOpen]);

  // Move focus into the dialog on open and give it back to the trigger on close.
  // No requestAnimationFrame: the DOM is already committed when this effect
  // runs, and rAF never fires in a fully hidden tab, which would silently skip
  // the focus move.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    const target =
      dialogRef.current?.querySelector(`#${tabId(enabledIds[0] ?? 'appearance')}`) || dialogRef.current;
    target?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => onClose?.(), [onClose]);

  // Escape closes, Tab is trapped inside the dialog.
  const handleDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusables = dialogRef.current?.querySelectorAll(FOCUSABLE);
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Roving focus on the section list (WAI-ARIA tabs pattern).
  const handleNavKeyDown = (event) => {
    const isNext = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    const isPrev = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
    if (!isNext && !isPrev && event.key !== 'Home' && event.key !== 'End') return;

    event.preventDefault();
    const index = enabledIds.indexOf(activeId);
    let nextIndex = index;
    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = enabledIds.length - 1;
    else nextIndex = (index + (isNext ? 1 : -1) + enabledIds.length) % enabledIds.length;

    const nextId = enabledIds[nextIndex];
    if (!nextId) return;
    setActiveId(nextId);
    // Every section button is always mounted (only the panel swaps), so the
    // target exists before the state update and can be focused right away.
    document.getElementById(tabId(nextId))?.focus();
  };

  // Clicking the backdrop closes; clicks inside the card must not bubble out.
  const handleScrimClick = (event) => {
    if (event.target === event.currentTarget) close();
  };

  if (!isOpen) return null;

  const ActiveView = activeId ? SECTION_VIEWS[activeId] : null;

  return (
    <div className={s.scrim} onMouseDown={handleScrimClick} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className={s.card}
        onKeyDown={handleDialogKeyDown}
      >
        {/* ── HEADER ── */}
        <div className={`${s.header} ${s.headerBorder}`}>
          <h2 id="settings-title" className={s.title}>
            {t('settings.title')}
          </h2>
          <button type="button" onClick={close} className={`${s.closeBtn} ${s.focusRing}`} aria-label={t('common.close')}>
            <X size={22} />
          </button>
        </div>

        {/* ── BODY: sidebar + panel ── */}
        <div className={s.body}>
          <nav
            className={s.nav}
            role="tablist"
            aria-orientation="vertical"
            aria-label={t('settings.nav')}
            onKeyDown={handleNavKeyDown}
          >
            {SECTIONS.filter((section) => enabledIds.includes(section.id)).map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeId;
              return (
                <button
                  key={section.id}
                  id={tabId(section.id)}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId(section.id)}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveId(section.id)}
                  className={`${s.navBtn} ${isActive ? s.navBtnActive : s.navBtnIdle} ${s.focusRing}`}
                >
                  <Icon size={16} className="shrink-0" />
                  {t(section.labelKey)}
                </button>
              );
            })}
          </nav>

          <div
            id={panelId(activeId)}
            role="tabpanel"
            aria-labelledby={tabId(activeId)}
            tabIndex={0}
            className={`${s.panel} ${s.focusRing}`}
          >
            {ActiveView && (
              <ActiveView
                s={s}
                notifications={notifications}
                data={data}
                privacy={privacy}
                pwa={pwa}
                isGuest={isGuest}
                onExitGuest={onExitGuest}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
