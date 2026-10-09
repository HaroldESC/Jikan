# Jikan (時間) — Circular Schedule Manager

[![Jikan Badge](https://img.shields.io/badge/Jikan-Schedule_Manager-blue?style=flat-square)](https://jikan-self.vercel.app)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.3.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.18-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> **Jikan** (時間 — "time" in Japanese) is a modern web application for daily schedule management. It visualizes your activities in an interactive circular wheel, giving you an intuitive understanding of your day at a single glance.

🔗 **Live demo:** [jikan-self.vercel.app](https://jikan-self.vercel.app)

---

## Features

### Core

- **Circular Wheel Visualization** — 24-hour pie chart with clickable slices representing your daily activities
- **Activity CRUD** — Create, edit, and delete activities with custom colors, descriptions, and time slots
- **Daily Schedule per Day** — Independent schedules for each day of the week
- **Copy Day** — Duplicate an entire day's schedule to another day in one click
- **Statistics Dashboard** — Daily metrics: total time, averages, efficiency, activity distribution
- **Reminders** — Basic reminder system for your activities
- **Activity Notes** — Free-text notes per activity block, editable in the editor and shown in the detail view
- **Pomodoro Timer** — Shared focus/break panel with configurable durations and a daily session counter
- **Browser Notifications** — Alert on activity change plus a configurable pre-activity warning
- **CSV Import / Export** — Export the full week to CSV (UTF-8) and import schedules back with per-row validation
- **PDF & XLSX Export** — Export the full week as a landscape PDF (summary + one table per day, color-coded) or as an XLSX workbook (Week + Summary sheets)
- **Local Auto-Backup** — A versioned snapshot is written to IndexedDB whenever your state changes (at most every 30 min), keeping the 10 most recent copies per user; browse, restore or delete them from Settings (no internet required)
- **Full JSON Export / Import (GDPR)** — The "Data" section of Settings exports everything the app keeps in your browser (activities, reminders, panels, settings, pomodoro, notifications) to a `jikan-backup-YYYY-MM-DD.json` file, and imports it back with per-row validation
- **Private Mode** — Opt out of saving notes, descriptions or reminders; disabled categories are discarded on save (and on import), living only in memory for the current session. Configured in the new "Privacy" section of Settings, next to the "Data" section
- **Local Encryption** — AES-GCM 256 + PBKDF2-SHA256 (250 000 iterations) over your whole local schedule and your local snapshots, with a full-screen lock asking for the passphrase on every launch; set up from the "Privacy" section of Settings (enable / change passphrase / disable)
- **Cloud Backup (Google Drive)** — Manually upload the full backup to your own Drive, list the stored copies and restore or delete them from Settings → Data; the access token lives only in memory (no refresh token is stored) and uploads are encrypted client-side whenever local encryption is enabled
- **Dark / Light / Auto Theme** — Three-mode theme toggle with dynamic day/night backgrounds
- **User Authentication** — Email/password login & registration via Supabase
- **Guest Mode** — Use Jikan without an account: the schedule lives in IndexedDB on the device, with an optional offer to upload it to an account later
- **Cloud Sync** — Activities stored in Supabase PostgreSQL, synced across your devices
- **Progressive Web App (PWA)** — Installable on mobile and desktop ("Install app" from Settings → App, or "Add to Home Screen" on iOS), keeps working without a connection, and delivers notifications through the service worker so they also arrive while the app is in the background
- **Responsive Design** — Fully functional on mobile, tablet, and desktop

### Settings

The settings dialog uses a **sidebar + panel** layout: the sidebar lists every section with an icon and a label, and the right panel shows the active one (on phones the sidebar becomes a horizontally scrollable chip row). It renders correctly in both visual styles and covers six sections:

- **Appearance** — visual style (Maru / Sei) and interface language
- **Notifications** — pre-activity warning offset, permission status and service-worker delivery
- **Data** — CSV / PDF / XLSX import and export, the "Local backup" sub-block (snapshots to browse / restore / delete and the full JSON export & import) and the "Cloud backup" sub-block (connect Google Drive, upload, list, restore and delete copies — shown only when `VITE_GOOGLE_CLIENT_ID` is configured)
- **Privacy** — private mode (opt out per category) and the "Local encryption" sub-block
- **App** — install Jikan as a native app, plus the connection status and whether the app is already available offline
- **Account** — sign out, or create an account / leave guest mode

Each section lives in its own component under `src/core/common/settings/` (`Settings.jsx` is just the shell). Keyboard and accessibility: close button, <kbd>Escape</kbd>, click-outside, focus trap, arrow-key navigation across the section list and focus restored to the gear icon on close.

### Dual-Style Architecture (Maru + Sei)

Jikan ships **two visual styles** that share the same data layer and can be switched from Settings:

| Style | Aesthetic | CSS Approach | UX Pattern |
|---|---|---|---|
| **Maru** (丸) | Glassmorphism, gradients, frosted glass | Tailwind + custom CSS files | Full-page views, sidebar layout |
| **Sei** (静) | Minimal flat design, solid colors | Tailwind only (zero custom CSS) | Mobile-first, card-based, bottom sheets |

`AppLayout.jsx` renders one tree or the other from a single `style` flag, so both styles read the
same activities, session, theme and locale. Integrated as an optional style in v2.0.

## Quick Start

```bash
# Clone
git clone https://github.com/Harold-ESC/Jikan-Maru.git
cd jikan

# Install
npm install

# Environment
cp .env.example .env.local
# Fill in your Supabase credentials

# Dev server
npm run dev
```

### Prerequisites

- Node.js 18+
- npm / yarn
- Supabase account (free tier works)

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional — enables the Google Drive cloud backup block in Settings → Data
# (Google Cloud Console → OAuth client ID, Web application, Authorized
# JavaScript origins only; no redirect URI needed)
VITE_GOOGLE_CLIENT_ID=
```

Without `VITE_GOOGLE_CLIENT_ID` the app works exactly the same, minus the cloud backup block.

**Google Cloud setup for the cloud backup** — the OAuth consent screen must be **External**, with:

| Field | Value (production) |
|---|---|
| Application home page | `https://jikan-self.vercel.app` |
| Privacy policy link | `https://jikan-self.vercel.app/privacy-policy.html` |
| Terms of service link | `https://jikan-self.vercel.app/terms-of-service.html` |
| Authorized JavaScript origins | `http://localhost:7000` + the production origin |

Both legal pages live in `public/` and ship with every deploy, so the URLs must be filled **after**
the first deploy that contains them. While the consent screen is in *Testing*, only the Google
accounts added as test users can connect (the "Google hasn't verified this app" screen is expected
— proceed via *Advanced* → *Continue*).

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (localhost:7000) |
| `npm run build` | Production build (also emits the manifest and the service worker) |
| `npm run preview` | Preview production build — **use this to test the PWA** (the service worker is disabled on purpose in dev) |
| `npm run icons` | Regenerate the PWA icons (`*.png`, `icon.ico`) from the SVG sources in `public/` |

## Tech Stack

### Frontend

| Library | Version | Purpose |
|---|---|---|
| React | 19.2.3 | UI framework |
| Vite | 7.3.0 | Bundler & dev server |
| Tailwind CSS | 4.1.18 | Utility-first CSS |
| Lucide React | 0.562.0 | Icons |

### Backend & Database

| Service | Purpose |
|---|---|
| Supabase Auth | Authentication (email/password) |
| Supabase PostgreSQL | Data storage |
| IndexedDB | Local storage (device only, db `jikan` v2 → `activities` + `backups`) |
| Supabase Realtime | Live sync — not wired yet (data refreshes via explicit `reload()`) |

### Dev Tools

- **Vite Plugin PWA** — 2.0.0, devDependency: generates the web manifest, the service worker (Workbox) and the PWA icons set (dev dependency, configured in `vite.config.js`)
- **ESLint** — Code linting
- **PostCSS** + **Autoprefixer** — CSS processing
- **Sharp** — devDependency: rasterises the icon SVGs into the PNG/ICO set via `npm run icons`

## Project Structure

```
jikan/
├── public/                  # Static assets
│                            # (privacy-policy.html + terms-of-service.html — required by the
│                            #  Google OAuth consent screen, served at the app root so they are
│                            #  live on any deploy; linked from the login footer and Data section.
│                            #  PWA icons — icon.svg and icon-maskable.svg are the SOURCES:
│                            #  icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png,
│                            #  apple-touch-icon.png, icon.ico; run `npm run icons` after
│                            #  editing an SVG; the web manifest comes from vite-plugin-pwa)
├── scripts/
│   └── generate-icons.mjs   # Rasterises the icon SVGs into the PNG/ICO set (sharp)
├── src/
│   ├── components/          # Shared UI (Header, DaySelector, ActivityCard)
│   ├── core/                # Main application components
│   │   ├── activities/      # Activity list, detail views, editors (Maru/Sei)
│   │   ├── common/          # Settings, ThemeToggle, modals
│   │   │                    # (incl. GuestMigrationModal.jsx — guest ↔ account migration,
│   │   │                    #  BackupRestoreModal.jsx — local snapshot list: restore/delete,
│   │   │                    #  CloudBackupModal.jsx — Drive backup list: restore/delete with an
│   │   │                    #  inline passphrase prompt for encrypted files,
│   │   │                    #  UnlockScreen.jsx — full-screen lock when encryption is on,
│   │   │                    #  PassphraseModal.jsx — enable/change/disable encryption;
│   │   │                    #  settings/ — the settings dialog split per section and styled
│   │   │                    #  for both Maru and Sei: settingsStyles.js, ui.jsx,
│   │   │                    #  LanguageSelector.jsx + one file per section)
│   │   ├── stats/           # Daily statistics dashboard, reminders
│   │   ├── wheel/           # SVG circular chart (WheelMaru / WheelSei)
│   │   ├── utils/           # Maru ↔ Sei adapters
│   │   ├── AppLayout.jsx    # Dual-style layout (renders both styles)
│   │   ├── MainShell.jsx    # View orchestration (activity CRUD lives in useActivities)
│   │   ├── LoginScreen.jsx  # Authentication screen (email/password + "continue without an account")
│   │   └── ResetPassword.jsx # Password recovery
│   ├── hooks/               # Custom React hooks
│   │   ├── useActivities.js # Store-aware activity CRUD (local or Supabase) + day copy / row append
│   │   ├── useGuestMigration.js # Guest ↔ account migration offer (once per session)
│   │   ├── useSession.js    # User session (+ isGuest, startGuest, exitGuest, guestUser)
│   │   ├── useTheme.jsx     # Theme + visual style state
│   │   ├── useReminders.js  # Reminders (localStorage, per user)
│   │   ├── usePanels.js     # Panel layout: visibility + order (localStorage)
│   │   ├── usePomodoro.js   # Pomodoro focus/break timer (localStorage)
│   │   ├── useNotifications.js # Browser notifications (permission + pre-warning)
│   │                        # (delivered via ServiceWorkerRegistration.showNotification
│   │                        #  when a service worker is active)
│   │   ├── usePwa.js       # PWA state: canInstall, isInstalled, isOffline, offlineReady
│   │                        # (captures beforeinstallprompt + service worker status)
│   │   ├── useLocalBackup.js # Auto local snapshots in IndexedDB (≤ every 30 min, keep 10 per user)
│   │   ├── useCloudBackup.js # Google Drive connection state + manual cloud backups (v4.0 C5)
│   │   ├── usePrivacy.js    # Private mode: opt-out per category (notes, description, reminders)
│   │   ├── useEncryption.js # Encryption state (enable/unlock/change/disable + row migration)
│   │   └── useClock.js      # Real-time clock
│   ├── i18n/                # Translations (es / en / ja) + provider
│   ├── lib/                 # External service clients + persistence adapters
│   │   ├── activityStore.js # Store adapter: IndexedDB (guest) / Supabase, one async API
│   │   │                    # (list, create, update, remove, insertMany,
│   │   │                    #  replaceDay, clear, count); getActivityStore(isGuest) picks one;
│   │   │                    #  local part now goes through localDb.js; encryptAll / decryptAll /
│   │   │                    #  reencryptAll migrate rows to/from `{ id, enc }`
│   │   ├── localDb.js       # IndexedDB bootstrap (db `jikan` v2 → stores `activities`, `backups`)
│   │   ├── backupStore.js   # Versioned local snapshots in the `backups` store (list/latest/create/
│   │   │                    #  remove/clear/prune); same encryptAll/decryptAll/reencryptAll
│   │   ├── crypto.js        # Web Crypto: AES-GCM 256 + PBKDF2, session key (memory only)
│   │   ├── gdrive.js        # Google Drive client (GIS token flow, scope drive.file; the OAuth
│   │   │                    #  access token lives only in module memory)
│   │   └── supabase.js      # Supabase client
│   ├── utils/               # Utility functions (dates, csv, export, backup.js: pure
│   │                        #  build/serialize/parse helpers, BACKUP_VERSION = 1, retention 10)
│   ├── styles/              # CSS by theme
│   │   ├── maru/            # Maru style (glassmorphism)
│   │   └── sei/             # Sei style (mostly Tailwind)
│   ├── assets/              # Images & resources
│   ├── App.jsx              # Session gate (auth or guest mode)
│   └── main.jsx             # Entry point
├── README.md                # This file
├── README_ES.md             # Spanish documentation (local)
├── TECHNICAL_SPEC.md        # Technical specification (local)
├── tailwind.config.js
├── vite.config.js
├── eslint.config.js
├── postcss.config.js
├── package.json
└── .env                     # Environment variables (gitignored)
```

## Roadmap

### v1.0 — Minimum Viable Product
- [x] Responsive layout (mobile & desktop)
- [x] Dark/light manual theme toggle
- [x] Activity editor & creator
- [x] Login & registration
- [x] Cloud database (Supabase) & cross-device sync
- [x] Daily statistics & time distribution metrics
- [x] Basic reminders (create/delete)
- [x] Theme persistence
- [x] "Remember me" / password reset flow

### v2.0 — Dual Style & Internationalization
- [x] **Sei integration** — Sei as an optional visual style within Jikan + style selector in settings
- [x] **Language selector** (日本語, Español, English)
- [x] **Hideable & draggable widgets** — dedicated header button toggles layout edit mode: eye toggle per panel (wheel, current activity, statistics, reminders, activity list) and drag-to-reorder within each column; layout persisted per user + style in `localStorage`

### v3.0 — Productivity & Notifications
- [x] **Pomodoro Timer** — focus/break countdown tied to the current activity, configurable durations (25/5 min), daily sessions tracked locally
- [x] **Notes** per activity block (stored in the `activities` table)
- [x] **Browser notifications** — activity change alerts + pre-activity warnings (0/5/10/15/30 min, configurable in Settings)
- [x] **Import/export schedules** — CSV only (UTF-8 export with BOM, validated import in append mode)
- [x] **Export to PDF / XLSX** — landscape PDF (summary + per-day tables) and XLSX workbook (Week + Summary sheets), generated client-side; export only (import stays CSV)

### v4.0 — Privacy, Local-first & PWA
- [x] **Usable without an account** — local guest mode (data stays on device)
- [x] **Promote guest data to an account** (ask before migrating)
- [x] **Local auto-backup** (no internet required)
- [x] **Full data export** (GDPR compliance)
- [x] **Private mode** — opt out of saving certain data
- [x] **Local encryption** for sensitive data
- [x] **Cloud backup** — manual upload/list/restore/delete on Google Drive (Dropbox deferred to v4.1)
- [x] **PWA** — offline support, installable (home screen widgets are not a standard PWA capability and are out of scope)

### v5.0 — Study & Content Tools
- [ ] **Custom fonts**
- [ ] **Resource links** per activity (class materials, URLs)
- [ ] **Exam calendar** with auto-preparation
- [ ] **Integrated flashcards** for review during breaks
- [ ] **Productivity graphs & comparative charts** (month vs month)

### v6.0 — University Module
- [ ] **Grade calculator** — time spent vs grades correlation
- [ ] **Campus interactive map**
- [ ] **Weekly credit counter** — visualize academic load
- [ ] **Professor office hours** directory
- [ ] **Deadline tracking** integrated
- [ ] **Attendance tracker** — mark classes attended

### v7.0 — Health & Minimalism
- [ ] **Break alerts** — "3h studying — take a break", "Sleep in 30 min", hydration reminders
- [ ] **Minimalist mode** — ultra-simple distraction-free view
- [ ] **Stretching routines** between blocks
- [ ] **Guided meditation** for breaks
- [ ] **Meal reminders**
- [ ] **Burnout detection** — alerts if overworking

### v8.0 — Productivity Extras & Collaboration
- [ ] **To-do list** per activity
- [ ] **Pull animations** — smooth transitions
- [ ] **Shared schedules** — see your classmates' schedules
- [ ] **Group study sessions** — "someone else is studying right now"
- [ ] **Chat per activity** — talk to whoever is doing the same thing
- [ ] **Study groups** — communities per subject
- [ ] **Work groups** — organize team projects
- [ ] **Mentor / accountability partner** — someone who reviews your progress
- [ ] **Community template library** — share schedule layouts
- [ ] **Multi-user** — several profiles on one device

### v9.0 — Integrations & Platforms
- [ ] **Google Calendar** integration
- [ ] **Notion / Obsidian / Google Keep** integration — sync notes
- [ ] **Desktop app** (Electron/Tauri) — always-visible widget, screensaver, taskbar timer
- [ ] **Voice commands** — "what's next in my schedule?"
- [ ] **Apple Watch / Smartwatch** — notifications on your wrist
- [ ] **Extra visual styles** — retro, pixelart, matrix, anime (long term)
- [ ] **Custom themes** — build your own color palettes
- [ ] **Custom backgrounds** — upload images or use photo APIs

### v10.0+ — AI & Automation (Experimental)
- [ ] **AI schedule suggestions** based on your productivity patterns
- [ ] **Auto-adjustment** — when you skip something, it re-shuffles
- [ ] **Time prediction** — "this will actually take 2h"
- [ ] **Auto-optimization** based on your performance data
- [ ] **Sleep pattern analysis** correlated with productivity
- [ ] **Personalized recommendations** — "you study better in the morning"
- [ ] **Virtual assistant** for productivity queries
- [ ] **Gamification:** XP system, badges, levels, weekly challenges, customizable avatar

## Styling System

Jikan ships a **theme-driven CSS architecture** with two selectable styles:

- **Maru (default):** 11 dedicated CSS files in `src/styles/maru/`, all scoped under `.theme-maru` — glassmorphism effects, custom scrollbar, animations
- **Sei:** pure Tailwind utility classes, zero custom CSS — minimal and flat; overrides live under `.theme-sei`

## Security

- Authentication via Supabase (server-side)
- Data stored in PostgreSQL (encrypted at rest)
- API credentials managed through environment variables
- No exposed secrets in client-side code

## Technical Notes

- Guest schedules live in **IndexedDB** (`jikan` → `activities`) and can be encrypted from Settings → Privacy
- The AES key is derived with **PBKDF2** (250 000 iterations) from a passphrase that is **never stored**: the non-exportable key only lives in memory, so the app asks for the passphrase on every launch — forget it and the local data cannot be recovered (an Unlock screen offers a two-step reset that wipes it)
- With encryption on, **nothing is stored in clear** in IndexedDB — not even `day_of_week`, which is why `replaceDay` now locates rows in memory instead of using the day index
- Private mode **avoids the write, it does not delete**: whatever was already saved is discarded the next time that activity is saved
- Encryption also covers the v4.0 C2 snapshots; enabling, changing or disabling the passphrase re-encrypts both activity rows and backups
- Guest and account data live in **separate stores**, so alternating between the two can leave them diverged; this is why the app asks before migrating (migration always appends, it never overwrites)
- Local snapshots share the same IndexedDB database as the guest schedule (`jikan` → `backups`), keeping the **10 most recent per user** (pruned automatically)
- Both JSON **import** and snapshot **restore** are **append-only** — they never overwrite or delete, so restoring a copy can duplicate blocks (the app asks for confirmation first)
- `src/utils/backup.js` is a **pure module** (no React, Supabase or i18n): `parseBackup()` never throws and accumulates per-row errors instead of failing the whole file

### PWA (v4.0 C4)

- The service worker is **only registered on build**: `devOptions.enabled` is `false` because caching the HMR client breaks development. Test offline mode with `npm run build && npm run preview`
- The precache holds **11 entries** (web manifest, `index.html`, icons, main JS/CSS). The lazy PDF/XLSX chunks (`xlsx-*`, `jspdf*`, `html2canvas*`, …) are excluded from it and get cached on demand by the `StaleWhileRevalidate` rule in `jikan-assets`
- Supabase requests are **never** served from cache (`NetworkOnly`): RLS decisions must be taken live, so a stale row or a revoked token would be a bug. Images use `CacheFirst`
- `registerType: 'autoUpdate'` + `skipWaiting`: the app updates on its own, because data lives in IndexedDB / `localStorage` / Supabase and never in the bundle
- There is **no offline write queue** (Workbox Background Sync), on purpose: writes either go to IndexedDB (guest, works with no network) or to Supabase (account, needs a network), and replicating deferred authenticated requests would risk token and RLS collisions for no real gain. With an account and no connection, writes fail with the existing error alert
- Notifications are delivered with `ServiceWorkerRegistration.showNotification()` when a service worker is active (falling back to `new Notification()`), because notifications created with the constructor are not shown while the tab is in the background on most browsers. Note that `navigator.serviceWorker.controller` is a `ServiceWorker`, not a registration: use `getRegistration()` and check that it is active

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

## Author

**Harold-ESC** — Computer Science student at Universidad Nacional de Colombia

- GitHub: [@Harold-ESC](https://github.com/Harold-ESC)
