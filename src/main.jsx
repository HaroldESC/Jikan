import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "./styles/maru/base.css";
import "./styles/maru/activity-card.css";
import "./styles/maru/stats.css";
import "./styles/maru/day-selector.css";
import "./styles/maru/detail.css";
import "./styles/maru/header.css";
import "./styles/maru/wheel.css";
import "./styles/maru/reminders.css";
import "./styles/maru/theme-toggle.css";
import "./styles/maru/scrollbar.css";
import "./styles/sei/day-selector.css";
import "./styles/sei/activity-card.css";
import "./styles/sei/header.css";

import App from './App.jsx'
import { ThemeProvider } from './hooks/useTheme.jsx'
import { I18nProvider } from './i18n/I18nProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
