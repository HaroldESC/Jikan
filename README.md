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
- **Dark / Light / Auto Theme** — Three-mode theme toggle with dynamic day/night backgrounds
- **User Authentication** — Email/password login & registration via Supabase
- **Guest Mode** — Use Jikan without an account: the schedule lives in IndexedDB on the device, with an optional offer to upload it to an account later
- **Cloud Sync** — Activities stored in Supabase PostgreSQL, synced across your devices
- **Responsive Design** — Fully functional on mobile, tablet, and desktop

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
```

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (localhost:7000) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

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
| IndexedDB | Guest-mode data storage (device only, db `jikan`) |
| Supabase Realtime | Live sync — not wired yet (data refreshes via explicit `reload()`) |

### Dev Tools

- **ESLint** — Code linting
- **PostCSS** + **Autoprefixer** — CSS processing

## Project Structure

```
jikan/
├── public/                  # Static assets
├── src/
│   ├── components/          # Shared UI (Header, DaySelector, ActivityCard)
│   ├── core/                # Main application components
│   │   ├── activities/      # Activity list, detail views, editors (Maru/Sei)
│   │   ├── common/          # Settings, LanguageSelector, ThemeToggle, modals
│   │   │                    # (incl. GuestMigrationModal.jsx — guest ↔ account migration)
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
│   │   └── useClock.js      # Real-time clock
│   ├── i18n/                # Translations (es / en / ja) + provider
│   ├── lib/                 # External service clients + persistence adapters
│   │   ├── activityStore.js # Store adapter: IndexedDB (guest) / Supabase, one async API
│   │   │                    # (list, create, update, remove, insertMany,
│   │   │                    #  replaceDay, clear, count); getActivityStore(isGuest) picks one
│   │   └── supabase.js      # Supabase client
│   ├── utils/               # Utility functions
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
- [ ] **Local auto-backup** (no internet required)
- [ ] **Full data export** (GDPR compliance)
- [ ] **Private mode** — opt out of saving certain data
- [ ] **Local encryption** for sensitive data
- [ ] **Cloud backup** (Google Drive, Dropbox)
- [ ] **PWA** — offline support, home screen widgets

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

- Guest schedules live in **IndexedDB** (`jikan` → `activities`) and are **not encrypted** — local encryption lands in v4.0 phase C3
- Guest and account data live in **separate stores**, so alternating between the two can leave them diverged; this is why the app asks before migrating (migration always appends, it never overwrites)

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
