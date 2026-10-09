/**
 * Style-aware primitives shared by every Settings section.
 *
 * These components never hardcode colours: they read the token object built by
 * `./settingsStyles.js`, so a section looks identical in Maru (glass) and in Sei
 * (light/dark) without a single `isMaru ? … : …` ternary in the section itself.
 */

// ── Section header ───────────────────────────────────────────────────────────

/**
 * Top-level block inside a settings panel: icon + title, optional description.
 */
export function Section({ s, title, description, icon: Icon, children }) {
  return (
    <section>
      <h3 className={s.panelTitle}>
        {Icon && <Icon size={18} />}
        {title}
      </h3>
      {description && <p className={`${s.description} mt-1 mb-4`}>{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  );
}

/**
 * Nested block inside a section (e.g. "Local backup" inside "Data"). Rendered
 * after a divider so the hierarchy is visually clear.
 */
export function SubGroup({ s, title, description, icon: Icon, divided = true, children }) {
  return (
    <div className={divided ? `mt-6 pt-6 ${s.divider}` : 'mt-4'}>
      {title && (
        <h4 className={s.subTitle}>
          {Icon && <Icon size={16} className={s.iconMuted} />}
          {title}
        </h4>
      )}
      {description && <p className={`${s.description} mt-1 mb-3`}>{description}</p>}
      {children}
    </div>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────

/**
 * Grid of actions. `cols` is the number of columns from the `sm` breakpoint
 * up; below it everything stacks to a single column, which is what we want on
 * narrow phones.
 */
export function ActionGrid({ children, cols = 2 }) {
  const colsClass = cols === 1 ? 'sm:grid-cols-1' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return <div className={`grid grid-cols-1 ${colsClass} gap-2`}>{children}</div>;
}

// ── Buttons ──────────────────────────────────────────────────────────────────

/**
 * Standard action button.
 * `variant`: 'default' | 'primary' | 'danger'
 */
export function ActionButton({ s, icon: Icon, variant = 'default', className = '', children, ...rest }) {
  const variantClass =
    variant === 'danger' ? s.dangerBtn : variant === 'primary' ? s.primaryBtn : s.actionBtn;

  return (
    <button type="button" className={`${variantClass} ${s.disabled} ${s.focusRing} ${className}`} {...rest}>
      {Icon && <Icon size={16} className="shrink-0" />}
      {children}
    </button>
  );
}

/**
 * Segmented option button (visual style, language). `active` drives the accent.
 * Exactly one of `optionIdle` / `optionActive` is applied, never both.
 */
export function OptionButton({ s, active, icon: Icon, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`${s.option} ${active ? s.optionActive : s.optionIdle} ${s.focusRing} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      {children}
    </button>
  );
}

// ── Rows and controls ────────────────────────────────────────────────────────

/** Label on the left, control on the right (e.g. the notification pre-notice). */
export function LabeledRow({ s, label, children }) {
  return (
    <div className={`${s.row} ${s.muted}`}>
      <span>{label}</span>
      <span className="flex items-center gap-2 shrink-0">{children}</span>
    </div>
  );
}

/**
 * Boolean toggle rendered as a pressable row with an on/off badge.
 * `onLabel` / `offLabel` are translated by the caller (they are not style tokens).
 */
export function ToggleRow({ s, label, on, onLabel, offLabel, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`${s.row} ${s.rowHover} w-full text-left ${s.focusRing}`}
    >
      <span className={s.label}>{label}</span>
      <span className={on ? s.badgeOn : s.badgeOff}>{on ? onLabel : offLabel}</span>
    </button>
  );
}

/**
 * Inline status / explanatory line. The icon is opt-in: a plain status line does
 * not need one, and a wrong-semantics icon is worse than none.
 * `tone`: 'info' | 'ok' | 'warn' | 'danger'
 */
export function Note({ s, tone = 'info', icon: Icon, className = '', children }) {
  const toneClass = s.notices[tone] || s.notices.info;
  const Wrapper = Icon ? 'p' : 'div';
  return (
    <Wrapper className={`${toneClass} ${Icon ? 'flex items-start gap-2' : ''} ${className}`}>
      {Icon && <Icon size={14} className="mt-0.5 shrink-0" />}
      <span className="min-w-0">{children}</span>
    </Wrapper>
  );
}
