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
- **Dark / Light / Auto Theme** — Three-mode theme toggle with dynamic day/night backgrounds
- **User Authentication** — Email/password login & registration via Supabase
- **Cloud Sync** — Real-time data sync powered by Supabase (PostgreSQL + Realtime)
- **Responsive Design** — Fully functional on mobile, tablet, and desktop

### Dual-Style Architecture (Planned — Maru + Sei)

Jikan's roadmap includes integrating **two visual styles** that share the same data layer:

| Style | Aesthetic | CSS Approach | UX Pattern |
|---|---|---|---|
| **Maru** (丸) | Glassmorphism, gradients, frosted glass | Tailwind + custom CSS files | Full-page views, sidebar layout |
| **Sei** (静) | Minimal flat design, solid colors | Tailwind only (zero custom CSS) | Mobile-first, card-based, bottom sheets |

Sei is currently a separate standalone project. Integration as an optional style within Jikan is planned for v2.0.

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
| `npm run dev` | Start dev server (localhost:5173) |
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
| Supabase Realtime | Live sync |

### Dev Tools

- **ESLint** — Code linting
- **PostCSS** + **Autoprefixer** — CSS processing

## Project Structure

```
jikan/
├── public/                  # Static assets
├── src/
│   ├── core/                # Main application components
│   │   ├── activities/      # Activity cards, detail view, editor
│   │   ├── common/          # Header, DaySelector, ThemeToggle, modals
│   │   ├── stats/           # Statistics dashboard, reminders
│   │   ├── wheel/           # SVG circular chart
│   │   └── LoginScreen.jsx  # Authentication screen
│   ├── hooks/               # Custom React hooks
│   │   ├── useActivities.js # Activity CRUD operations
│   │   ├── useSession.js    # User session management
│   │   ├── useTheme.js      # Theme state (auto/light/dark)
│   │   └── useClock.js      # Real-time clock
│   ├── lib/                 # External service clients
│   │   └── supabase.js      # Supabase client
│   ├── utils/               # Utility functions
│   ├── styles/              # CSS by theme
│   │   ├── maru/            # Maru style (10 CSS files)
│   │   └── sei/             # Sei style (Tailwind-only)
│   ├── assets/              # Images & resources
│   ├── App.jsx              # Auth gate
│   ├── JikanApp.jsx         # Main app shell
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
- [ ] "Remember me" / password reset flow

### v2.0 — Dual Style & Internationalization
- [ ] **Sei integration** — Sei as an optional visual style within Jikan + style selector in settings
- [ ] **Language selector** (日本語, Español, English)
- [ ] **Hideable & draggable widgets** — eye-off toggle per panel; settings gear for component visibility (stats, pomodoro, notes, etc.); drag-to-reorder mode with toggle icon

### v3.0 — Productivity & Notifications
- [ ] **Pomodoro Timer** integrated per activity
- [ ] **Notes** per activity block
- [ ] **Browser notifications** (activity change alerts, pre-activity warnings)
- [ ] **Import/export schedules** (XLSX and other formats)
- [ ] **Export to PDF**

### v4.0 — Study & Content Tools
- [ ] **Custom fonts**
- [ ] **Resource links** per activity (class materials, URLs)
- [ ] **Exam calendar** with auto-preparation
- [ ] **Integrated flashcards** for review during breaks
- [ ] **Productivity graphs & comparative charts** (month vs month)

### v5.0 — University Module
- [ ] **Grade calculator** — time spent vs grades correlation
- [ ] **Campus interactive map**
- [ ] **Weekly credit counter** — visualize academic load
- [ ] **Professor office hours** directory
- [ ] **Deadline tracking** integrated
- [ ] **Attendance tracker** — mark classes attended

### v6.0 — Privacy, Backup & PWA
- [ ] **Private mode** — opt out of saving certain data
- [ ] **Local auto-backup** (no internet required)
- [ ] **Full data export** (GDPR compliance)
- [ ] **Cloud backup** (Google Drive, Dropbox)
- [ ] **Local encryption** for sensitive data
- [ ] **PWA** — offline support, home screen widgets

### v7.0 — Health & Minimalism
- [ ] **Break alerts** — "3h studying — take a break", "Sleep in 30 min", hydration reminders
- [ ] **Minimalist mode** — ultra-simple distraction-free view
- [ ] **Stretching routines** between blocks
- [ ] **Guided meditation** for breaks
- [ ] **Meal reminders**
- [ ] **Burnout detection** — alerts if overworking

### v8.0+ — Future (Collaboration, Integrations & Advanced)
- **Productivity extras:** To-do list per activity, pull animations, study groups
- **Collaboration:** Shared schedules, group study sessions, chat per activity, study communities, mentor/accountability partner, community template library
- **Integrations:** Google Calendar, Notion, Obsidian, Google Keep
- **Visual extras:** Retro, pixelart, matrix, anime styles; custom themes & backgrounds
- **Platform:** Desktop app (Electron/Tauri), voice commands, multi-user profiles, Apple Watch
- **Gamification:** XP system, badges, levels, challenges, avatar
- **AI & automation:** Schedule suggestions, auto-adjustment, time prediction, optimization, sleep analysis, personalized recommendations, virtual assistant

## Styling System

Jikan currently uses the **Maru style** with a **theme-driven CSS architecture**:

- **Maru (current default):** 10 dedicated CSS files in `src/styles/maru/` for glassmorphism effects, custom scrollbar, animations
- **Sei (planned):** Pure Tailwind utility classes, no custom CSS — minimal and flat. The `src/styles/sei/` directory is ready to receive Sei components once integrated.

## Security

- Authentication via Supabase (server-side)
- Data stored in PostgreSQL (encrypted at rest)
- API credentials managed through environment variables
- No exposed secrets in client-side code

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
