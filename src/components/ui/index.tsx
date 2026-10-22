import { useId, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import './ui.css'

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'accent' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: boolean
  active?: boolean
}

export function Button({ variant = 'default', size = 'md', icon, active, className = '', ...rest }: ButtonProps) {
  const cls = [
    'btn',
    variant !== 'default' && `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    icon && 'btn--icon',
    active && 'is-active',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button type="button" className={cls} {...rest} />
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  actions,
  children,
  className = '',
  bodyClassName = '',
  style,
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  style?: CSSProperties
}) {
  return (
    <section className={`panel ${className}`} style={style}>
      {(title || actions) && (
        <header className="panel__head">
          {title && <div className="panel__title">{title}</div>}
          <div className="grow" />
          {actions}
        </header>
      )}
      <div className={`panel__body ${bodyClassName}`}>{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* FloatingCard — the control card that sits on top of a scene         */
/* ------------------------------------------------------------------ */

export function FloatingCard({
  title,
  subtitle,
  children,
  corner = 'tl',
  width,
  collapsible = true,
  defaultCollapsed = false,
  style,
}: {
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  corner?: 'tl' | 'tr' | 'bl' | 'br'
  width?: number
  collapsible?: boolean
  defaultCollapsed?: boolean
  style?: CSSProperties
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  return (
    <div
      className={`float-card float-card--${corner} ${collapsed ? 'is-collapsed' : ''}`}
      style={{ width, ...style }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="float-card__head">
        <div className="float-card__title">{title}</div>
        {collapsible && (
          <button
            className="float-card__collapse"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand controls' : 'Collapse controls'}
          >
            {collapsed ? '+' : '–'}
          </button>
        )}
      </div>
      {subtitle && <div className="float-card__sub">{subtitle}</div>}
      <div className="float-card__content">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Slider                                                              */
/* ------------------------------------------------------------------ */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  unit,
}: {
  label: ReactNode
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
  unit?: string
}) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        <span>{label}</span>
        <span className="field__value">
          {format ? format(value) : value}
          {unit && <span style={{ color: 'var(--ink-3)', marginLeft: 3 }}>{unit}</span>}
        </span>
      </label>
      <input
        id={id}
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" />
      <span>{label}</span>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  accent,
}: {
  label?: ReactNode
  options: { value: T; label: ReactNode }[] | readonly T[]
  value: T
  onChange: (v: T) => void
  accent?: boolean
}) {
  const opts = (options as readonly unknown[]).map((o) =>
    typeof o === 'object' && o !== null ? (o as { value: T; label: ReactNode }) : { value: o as T, label: String(o) },
  )
  const seg = (
    <div className={`seg ${accent ? 'seg--accent' : ''}`} role="radiogroup">
      {opts.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          className={`seg__opt ${o.value === value ? 'is-on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
  if (!label) return seg
  return (
    <div className="field">
      <div className="field__label">{label}</div>
      {seg}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Keyboard keys                                                       */
/* ------------------------------------------------------------------ */

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

/** Renders "Ctrl+Shift+B" as three key caps. Use "Space", "Esc", "Del" etc. */
export function Keys({ combo }: { combo: string }) {
  const parts = combo.split('+').map((p) => p.trim())
  return (
    <span className="kbd-combo">
      {parts.map((p, i) => (
        <span key={i} className="kbd-combo">
          {i > 0 && <span className="kbd-combo__plus">+</span>}
          <kbd className="kbd">{p}</kbd>
        </span>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Callout                                                             */
/* ------------------------------------------------------------------ */

const calloutIcons = { tip: '✓', warn: '!', danger: '×', easyeda: 'E', fab: '◆', info: 'i' } as const

export function Callout({
  kind = 'info',
  title,
  children,
}: {
  kind?: keyof typeof calloutIcons
  title?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={`callout callout--${kind}`}>
      <div className="callout__icon" aria-hidden>
        {calloutIcons[kind]}
      </div>
      <div>
        {title && <div className="callout__title">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Readout                                                             */
/* ------------------------------------------------------------------ */

export function Readout({
  label,
  value,
  unit,
  tone,
  style,
}: {
  label: ReactNode
  value: ReactNode
  unit?: string
  tone?: 'good' | 'warn' | 'bad'
  style?: CSSProperties
}) {
  return (
    <div className={`readout ${tone ? `readout--${tone}` : ''}`} style={style}>
      <div className="readout__label">{label}</div>
      <div className="readout__value">
        {value}
        {unit && <span className="readout__unit">{unit}</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chip                                                                */
/* ------------------------------------------------------------------ */

export function Chip({
  children,
  tone,
  dot,
  style,
}: {
  children: ReactNode
  tone?: 'good' | 'bad' | 'warn' | 'accent'
  dot?: boolean
  style?: CSSProperties
}) {
  return (
    <span className={`chip ${tone ? `chip--${tone}` : ''}`} style={style}>
      {dot && <span className="chip__dot" />}
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  style,
}: {
  tabs: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  style?: CSSProperties
}) {
  return (
    <div className="tabs" role="tablist" style={style}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={t.value === value}
          className={`tabs__tab ${t.value === value ? 'is-on' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

export function Legend({ items }: { items: { color: string; label: ReactNode }[] }) {
  return (
    <div className="legend">
      {items.map((it, i) => (
        <span key={i} className="legend__item">
          <span className="legend__swatch" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Meter                                                               */
/* ------------------------------------------------------------------ */

export function Meter({ value, color }: { value: number; color?: string }) {
  return (
    <div className="meter">
      <div className="meter__fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  )
}
