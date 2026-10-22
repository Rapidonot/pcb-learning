/* Building blocks for lesson articles ("Understand" section) and scenes. */
import type { CSSProperties, ReactNode } from 'react'
import './content.css'

/** A captioned figure frame for diagrams inside articles. */
export function Figure({
  label,
  caption,
  children,
  height,
  bg,
  style,
}: {
  label?: string
  caption?: ReactNode
  children: ReactNode
  height?: number
  bg?: 'card' | 'paper' | 'eda' | 'schematic'
  style?: CSSProperties
}) {
  const bgs = {
    card: 'var(--card)',
    paper: 'var(--paper-2)',
    eda: '#101210',
    schematic: 'var(--sch-bg)',
  }
  return (
    <figure className="figure" style={{ margin: '1.6em 0', ...style }}>
      <div className="figure__body" style={{ height, background: bgs[bg ?? 'card'] }}>
        {children}
      </div>
      {caption && (
        <figcaption className="figure__cap">
          {label && <b>{label}</b>}
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/** Centred monospace formula block. */
export function Formula({ children }: { children: ReactNode }) {
  return <div className="formula">{children}</div>
}

/** Two-column comparison (e.g. good vs bad). */
export function Compare({
  left,
  right,
  leftLabel = 'Do',
  rightLabel = "Don't",
}: {
  left: ReactNode
  right: ReactNode
  leftLabel?: ReactNode
  rightLabel?: ReactNode
}) {
  return (
    <div className="compare">
      <div className="compare__col compare__col--good">
        <div className="compare__label mono">✓ {leftLabel}</div>
        {left}
      </div>
      <div className="compare__col compare__col--bad">
        <div className="compare__label mono">✕ {rightLabel}</div>
        {right}
      </div>
    </div>
  )
}

/** Numbered "how it's made" style step list with big numbers. */
export function Steps({ items }: { items: { title: ReactNode; body: ReactNode }[] }) {
  return (
    <ol className="csteps">
      {items.map((it, i) => (
        <li key={i}>
          <span className="csteps__n mono">{String(i + 1).padStart(2, '0')}</span>
          <div>
            <div className="csteps__t">{it.title}</div>
            <div className="csteps__b">{it.body}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Inline EasyEDA menu path, e.g. <Menu path={['Design', 'Check DRC']} /> */
export function Menu({ path }: { path: string[] }) {
  return (
    <span className="imenu">
      {path.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="imenu__sep">›</span>}
          <span className="imenu__item">{p}</span>
        </span>
      ))}
    </span>
  )
}

/** A key-value spec table rendered as a neat card grid. */
export function Specs({ items }: { items: { k: ReactNode; v: ReactNode; note?: ReactNode }[] }) {
  return (
    <div className="specs">
      {items.map((it, i) => (
        <div key={i} className="specs__item">
          <div className="specs__k mono">{it.k}</div>
          <div className="specs__v">{it.v}</div>
          {it.note && <div className="specs__n">{it.note}</div>}
        </div>
      ))}
    </div>
  )
}

/**
 * A mock EasyEDA Pro window frame — use inside scenes/figures to show where things live.
 * Children render inside the canvas area.
 */
export function EdaWindow({
  title = 'Blinky — PCB',
  children,
  left,
  right,
  bottom,
  toolbar,
  style,
  dark = true,
}: {
  title?: string
  children?: ReactNode
  left?: ReactNode
  right?: ReactNode
  bottom?: ReactNode
  toolbar?: ReactNode
  style?: CSSProperties
  dark?: boolean
}) {
  return (
    <div className="edawin" style={style}>
      <div className="edawin__title">
        <span className="edawin__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="edawin__app mono">EasyEDA Pro</span>
        <span className="edawin__doc">{title}</span>
      </div>
      <div className="edawin__menu">
        {['File', 'Edit', 'View', 'Place', 'Route', 'Design', 'Tools', 'Export', 'Order', 'Settings', 'Help'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      {toolbar && <div className="edawin__tools">{toolbar}</div>}
      <div className="edawin__main">
        {left && <div className="edawin__left">{left}</div>}
        <div className={`edawin__canvas ${dark ? 'is-dark' : ''}`}>{children}</div>
        {right && <div className="edawin__right">{right}</div>}
      </div>
      {bottom && <div className="edawin__bottom">{bottom}</div>}
    </div>
  )
}

/** Sizes a scene: a flex column where the canvas takes the remaining height. */
export function SceneFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', ...style }}>{children}</div>
}

/** A small pill toolbar centred at the bottom of a scene (like the screenshot's undo/zoom bar). */
export function SceneToolbar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="scene-toolbar" onPointerDown={(e) => e.stopPropagation()} style={style}>
      {children}
    </div>
  )
}

/** A status readout bar pinned to the bottom-left/right of a scene. */
export function SceneStatus({ children, side = 'left', style }: { children: ReactNode; side?: 'left' | 'right'; style?: CSSProperties }) {
  return (
    <div className={`scene-status scene-status--${side}`} style={style}>
      {children}
    </div>
  )
}
