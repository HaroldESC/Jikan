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

import App from './App.jsx'
import { ThemeProvider } from './hooks/useTheme.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
