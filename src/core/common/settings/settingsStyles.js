/**
 * Shared visual tokens for the Settings modal.
 *
 * The settings dialog follows the same approach as the other modals in the app
 * (BackupRestoreModal, PassphraseModal): a **single implementation** styled from
 * `isMaru` / `isDarkMode` props, instead of duplicated `*Maru` / `*Sei` files.
 * Building the class strings once here keeps every section consistent and
 * removes the long repeated Tailwind strings that used to live in Settings.jsx.
 *
 *   Maru      → glassmorphism, always light-on-dark, blue accent.
 *   Sei       → flat Tailwind, light + dark variants.
 *
 * Sections never build their own classes: they receive the `s` object built here
 * and compose it with the primitives in `./ui.jsx`.
 */

import { useMemo } from 'react';

export function buildSettingsStyles(isMaru, isDarkMode) {
  // ── Modal shell ────────────────────────────────────────────────────────────
  const card = isMaru
    ? 'w-full max-w-3xl bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl text-white flex flex-col max-h-[90vh] overflow-hidden'
    : `w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
        isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-800 border-slate-200'
      }`;

  const scrim = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';

  const header = 'flex items-center justify-between gap-4 px-6 py-5 shrink-0 border-b';

  const headerBorder = isMaru ? 'border-white/10' : isDarkMode ? 'border-slate-700' : 'border-slate-200';

  const title = 'text-xl font-bold';

  const closeBtn = isMaru
    ? 'p-2 rounded-lg hover:bg-white/20 transition'
    : `p-2 rounded-lg transition ${
        isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
      }`;

  // ── Body layout (sidebar + panel) ───────────────────────────────────────────
  const body = 'flex-1 min-h-0 flex flex-col sm:flex-row';

  const nav = isMaru
    ? 'shrink-0 sm:w-52 p-3 sm:p-4 sm:pr-0 border-b sm:border-b-0 sm:border-r flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible border-white/10'
    : `shrink-0 sm:w-52 p-3 sm:p-4 sm:pr-0 border-b sm:border-b-0 sm:border-r flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible ${
        isDarkMode ? 'border-slate-700' : 'border-slate-200'
      }`;

  // The section list is a vertical sidebar on desktop and a horizontal chip
  // row on phones, so the active state is background + text colour (an active
  // bar would be wrong in one of the two orientations).
  const navBtn =
    'flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-left transition shrink-0';

  // Note: base variants carry NO colour. Tailwind emits every `bg-*`/`text-*`
  // utility in one layer, so composing an idle background with an active one in
  // the same class list lets the stylesheet order decide the winner — which
  // silently breaks the selected state. Colours live in idle/active only.
  const navBtnActive = isMaru
    ? 'bg-white/20 text-white'
    : isDarkMode
      ? 'bg-slate-700 text-white'
      : 'bg-slate-100 text-slate-900';

  const navBtnIdle = isMaru
    ? 'bg-transparent text-white/70 hover:bg-white/10'
    : isDarkMode
      ? 'text-slate-300 hover:bg-slate-700/60'
      : 'text-slate-600 hover:bg-slate-100';

  const panel = 'flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6';

  // ── Typography ─────────────────────────────────────────────────────────────
  const panelTitle = 'text-lg font-bold flex items-center gap-2';
  const subTitle = 'text-sm font-semibold flex items-center gap-2';
  const description = isMaru
    ? 'text-xs text-white/60'
    : `text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;
  const muted = isMaru
    ? 'text-sm text-white/85'
    : `text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`;
  const hint = isMaru
    ? 'text-xs text-white/50'
    : `text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;
  const label = isMaru
    ? 'text-sm text-white/90'
    : `text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`;

  const divider = isMaru
    ? 'border-t border-white/10'
    : isDarkMode
      ? 'border-t border-slate-700'
      : 'border-t border-slate-200';

  const iconMuted = isMaru ? 'text-white/60' : isDarkMode ? 'text-slate-400' : 'text-slate-500';

  // ── Buttons ────────────────────────────────────────────────────────────────
  const actionBtn = isMaru
    ? 'flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium'
    : `flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium border transition duration-200 ${
        isDarkMode
          ? 'bg-slate-700/60 hover:bg-slate-700 text-white border-slate-600'
          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
      }`;

  const primaryBtn = isMaru
    ? 'flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-blue-100 border border-blue-500/30 hover:border-blue-500/50 transition duration-200 text-sm font-medium'
    : `flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium border transition duration-200 ${
        isDarkMode
          ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border-blue-500/40'
          : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
      }`;

  const dangerBtn = isMaru
    ? 'flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30 hover:border-red-500/50 transition duration-200 text-sm font-medium'
    : `flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium border transition duration-200 ${
        isDarkMode
          ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/30'
          : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
      }`;

  const disabled = 'disabled:opacity-50 disabled:cursor-not-allowed';

  // Segmented option (visual style, language). Structural base + one of the
  // two colour variants, for the same reason as the section list above.
  const option =
    'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition duration-200';

  const optionIdle = isMaru
    ? 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
    : isDarkMode
      ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50';

  const optionActive = isMaru
    ? 'bg-blue-500/40 border-blue-400/60 text-white'
    : isDarkMode
      ? 'bg-blue-500/20 border-blue-500/70 text-blue-200'
      : 'bg-blue-50 border-blue-300 text-blue-700';

  // ── Form controls ──────────────────────────────────────────────────────────
  const row = isMaru
    ? 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/10 border border-white/10'
    : `flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${
        isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'
      }`;

  const rowHover = isMaru ? 'hover:bg-white/15 transition' : isDarkMode ? 'hover:bg-slate-700 transition' : 'hover:bg-slate-100 transition';

  const select = isMaru
    ? 'bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-400/60'
    : `rounded-lg px-2 py-1.5 text-sm border focus:outline-none ${
        isDarkMode
          ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-400'
          : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
      }`;

  // Native <option> popups render on the OS surface, so the colour has to be
  // forced to something legible in both light and dark menus.
  const selectOption = 'bg-white text-slate-900';

  const badgeOn = isMaru
    ? 'shrink-0 text-xs font-medium px-2 py-1 rounded-lg bg-green-500/20 text-green-200'
    : `shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${
        isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
      }`;

  const badgeOff = isMaru
    ? 'shrink-0 text-xs font-medium px-2 py-1 rounded-lg bg-white/10 text-white/60'
    : `shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${
        isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
      }`;

  // ── Notices ────────────────────────────────────────────────────────────────
  const notices = {
    info: isMaru
      ? 'text-xs text-white/70'
      : `text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`,
    ok: isMaru
      ? 'text-xs text-green-300'
      : `text-xs ${isDarkMode ? 'text-green-300' : 'text-green-700'}`,
    warn: isMaru
      ? 'text-xs text-amber-300'
      : `text-xs ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`,
    danger: isMaru
      ? 'text-xs text-red-300'
      : `text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`,
  };

  // Focus ring. No `ring-offset-*`: its default colour is white, which would
  // draw a light halo on the dark Maru surfaces.
  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

  return {
    // shell
    card,
    scrim,
    header,
    headerBorder,
    title,
    closeBtn,
    // layout
    body,
    nav,
    navBtn,
    navBtnActive,
    navBtnIdle,
    panel,
    // typography
    panelTitle,
    subTitle,
    description,
    muted,
    hint,
    label,
    divider,
    iconMuted,
    // buttons
    actionBtn,
    primaryBtn,
    dangerBtn,
    disabled,
    option,
    optionIdle,
    optionActive,
    // controls
    row,
    rowHover,
    select,
    selectOption,
    badgeOn,
    badgeOff,
    // notices
    notices,
    focusRing,
  };
}

export function useSettingsStyles(isMaru, isDarkMode) {
  return useMemo(() => buildSettingsStyles(isMaru, isDarkMode), [isMaru, isDarkMode]);
}
