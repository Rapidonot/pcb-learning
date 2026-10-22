import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { BoardDoc, Connectivity, Layer, Pour } from '@/pcb/board'
import { MASKS, type MaskColor } from '@/pcb/palette'
import { netInfo, parts as projectParts } from '@/pcb/project'
import { getFootprint } from '@/pcb/footprints'
import { Kbd, Slider } from '@/components/ui'
import {
  IconCheck,
  IconChevronDown,
  IconCube,
  IconEye,
  IconFlip,
  IconLayers,
  IconPointer,
  IconRedo,
  IconRoute,
  IconRotate,
  IconTrash,
  IconUndo,
  IconVia,
  IconX,
} from '@/components/icons'
import { useCursor, type CursorStore } from './store'
import { trackLength } from './geometry'
import type { Coach } from './checklist'
import { GRIDS, WIDTHS, type DrcState, type Prefs, type RouteState, type Sel, type Tool, type ViewMode } from './types'

const I = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
export const IconPour = (p: { size?: number }) => (
  <I {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M3.5 10 10 3.5M3.5 16.5 16.5 3.5M7 20.5 20.5 7M13.5 20.5l7-7" />
  </I>
)
export const IconRuler = (p: { size?: number }) => (
  <I {...p}>
    <path d="m3 16 13-13 5 5L8 21z" />
    <path d="m7 12 2 2M10 9l2 2M13 6l2 2" />
  </I>
)
export const IconHighlight = (p: { size?: number }) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
  </I>
)
const IconSch = (p: { size?: number }) => (
  <I {...p}>
    <path d="M2 12h4l2-4 4 8 2-4h8" />
    <rect x="15" y="3" width="6" height="5" rx="1" />
  </I>
)
const IconHelp = (p: { size?: number }) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6M12 17h.01" />
  </I>
)
const IconDrc = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </I>
)
const IconLifebuoy = (p: { size?: number }) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" />
  </I>
)

/* ------------------------------------------------------------------ */
/* Dropdown menu                                                       */
/* ------------------------------------------------------------------ */

interface MenuItem {
  label: string
  hint?: string
  keys?: string
  onClick?: () => void
  checked?: boolean
  danger?: boolean
  sep?: boolean
}

function Menu({ label, icon, items, testId, className = '' }: { label: string; icon?: ReactNode; items: MenuItem[]; testId?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div className={`sbx-menu ${className}`} ref={ref}>
      <button className={`sbx-menu__btn ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" data-testid={testId}>
        {icon}
        <span>{label}</span>
        <IconChevronDown size={13} />
      </button>
      {open && (
        <div className="sbx-menu__pop" role="menu">
          {items.map((it, i) =>
            it.sep ? (
              <div key={i} className="sbx-menu__sep" />
            ) : (
              <button
                key={i}
                role="menuitem"
                className={`sbx-menu__item ${it.danger ? 'is-danger' : ''}`}
                onClick={() => {
                  setOpen(false)
                  it.onClick?.()
                }}
              >
                <span className="sbx-menu__check">{it.checked && <IconCheck size={13} />}</span>
                <span className="grow">
                  <span className="sbx-menu__label">{it.label}</span>
                  {it.hint && <span className="sbx-menu__hint">{it.hint}</span>}
                </span>
                {it.keys && <Kbd>{it.keys}</Kbd>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Menu bar                                                            */
/* ------------------------------------------------------------------ */

export function MenuBar(p: {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  runDrc: () => void
  realtimeDrc: boolean
  toggleRealtime: () => void
  loadPlacement: () => void
  loadSolution: () => void
  reset: () => void
  fit: () => void
  view: ViewMode
  setView: (v: ViewMode) => void
  schOpen: boolean
  toggleSch: () => void
  openHelp: () => void
  progress: number
  total: number
}) {
  return (
    <header className="sbx-bar">
      <div className="sbx-doc">
        <span className="sbx-doc__icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2.5" fill="#1f6b47" />
            <path d="M7 9h5l3 3h3M7 15h4" stroke="#e3a361" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle cx="18" cy="12" r="1.4" fill="#e3a361" />
            <circle cx="11" cy="15" r="1.4" fill="#e3a361" />
          </svg>
        </span>
        <span className="sbx-doc__name">
          Blinky<span className="sbx-doc__ext">.PCB</span>
        </span>
        <span className="sbx-doc__badge mono">
          {p.progress}/{p.total} GOALS
        </span>
      </div>
      <nav className="sbx-bar__menus">
        <Menu
          label="Design"
          className="sbx-menu--design"
          icon={<IconDrc size={15} />}
          testId="menu-design"
          items={[
            { label: 'Check DRC', hint: 'Design › Check DRC', onClick: p.runDrc },
            { label: 'Real-time DRC', hint: 'Re-check after every edit', checked: p.realtimeDrc, onClick: p.toggleRealtime },
            { sep: true, label: '' },
            { label: 'Fit all', keys: 'K', onClick: p.fit },
          ]}
        />
        <Menu
          label="Stuck?"
          icon={<IconLifebuoy size={15} />}
          testId="menu-help"
          items={[
            { label: 'Load reference placement', hint: 'Parts where the course puts them', onClick: p.loadPlacement },
            { label: 'Load full reference solution', hint: 'Placed, routed and poured', onClick: p.loadSolution },
            { sep: true, label: '' },
            { label: 'Reset board', hint: 'Back to right after Convert to PCB', danger: true, onClick: p.reset },
            { sep: true, label: '' },
            { label: 'Real-time DRC', hint: 'Re-check after every edit', checked: p.realtimeDrc, onClick: p.toggleRealtime },
            { sep: true, label: '' },
            { label: 'Keyboard shortcuts', keys: '?', onClick: p.openHelp },
          ]}
        />
      </nav>
      <div className="sbx-bar__group">
        <button className="sbx-ibtn" onClick={p.undo} disabled={!p.canUndo} aria-label="Undo" data-tip="Undo (Ctrl+Z)">
          <IconUndo size={17} />
        </button>
        <button className="sbx-ibtn" onClick={p.redo} disabled={!p.canRedo} aria-label="Redo" data-tip="Redo (Ctrl+Y)">
          <IconRedo size={17} />
        </button>
      </div>
      <button className="sbx-drcbtn" onClick={p.runDrc} data-testid="check-drc" data-tip="Design › Check DRC">
        <IconDrc size={15} />
        <span>Check DRC</span>
      </button>
      <div className="grow" />
      <div className="sbx-viewseg" role="radiogroup" aria-label="View">
        {(
          [
            ['eda', 'EDA', <IconLayers key="i" size={14} />],
            ['photo', 'Photo', <IconEye key="i" size={14} />],
            ['3d', '3D', <IconCube key="i" size={14} />],
          ] as const
        ).map(([v, l, icon]) => (
          <button key={v} role="radio" aria-checked={p.view === v} className={p.view === v ? 'is-on' : ''} onClick={() => p.setView(v)} data-testid={`view-${v}`}>
            {icon}
            <span>{l}</span>
          </button>
        ))}
      </div>
      <button className={`sbx-ibtn sbx-ibtn--label ${p.schOpen ? 'is-on' : ''}`} onClick={p.toggleSch} data-tip="Schematic: cross-probe (Shift+X)" aria-pressed={p.schOpen}>
        <IconSch size={16} />
        <span>Schematic</span>
      </button>
      <button className="sbx-ibtn sbx-helpbtn" onClick={p.openHelp} aria-label="Keyboard shortcuts" data-tip="Shortcuts (?)">
        <IconHelp size={17} />
      </button>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Tool rail                                                           */
/* ------------------------------------------------------------------ */

export const TOOLS: { id: Tool; label: string; key?: string; icon: ReactNode; tip: string }[] = [
  { id: 'select', label: 'Select', key: 'Esc', icon: <IconPointer size={18} />, tip: 'Select & move parts (Esc)' },
  { id: 'route', label: 'Route', key: 'W', icon: <IconRoute size={18} />, tip: 'Route track (W)' },
  { id: 'via', label: 'Via', key: 'V', icon: <IconVia size={18} />, tip: 'Place via (V)' },
  { id: 'pour', label: 'Pour', key: 'E', icon: <IconPour size={18} />, tip: 'Copper region (Place › Copper Region)' },
  { id: 'measure', label: 'Measure', key: 'Alt+M', icon: <IconRuler size={18} />, tip: 'Measure (Alt+M)' },
  { id: 'highlight', label: 'Net', key: 'H', icon: <IconHighlight size={18} />, tip: 'Highlight net (H)' },
]

export function ToolRail(p: {
  tool: Tool
  setTool: (t: Tool) => void
  activeLayer: Layer
  setActiveLayer: (l: Layer) => void
  disabled: boolean
  hasSel: boolean
  rotate: () => void
  del: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}) {
  return (
    <aside className={`sbx-tools ${p.disabled ? 'is-disabled' : ''}`} aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`sbx-tool ${p.tool === t.id && !p.disabled ? 'is-on' : ''}`}
          onClick={() => p.setTool(t.id)}
          data-tip={t.tip}
          data-tip-pos="right"
          aria-label={t.tip}
          aria-pressed={p.tool === t.id}
          data-testid={`tool-${t.id}`}
        >
          {t.icon}
          <span className="sbx-tool__label">{t.label}</span>
          {t.key && <span className="sbx-tool__key mono">{t.key.replace('Alt+', '⌥')}</span>}
        </button>
      ))}
      <span className="sbx-tools__sep" />
      <button className="sbx-tool" onClick={p.rotate} disabled={!p.hasSel || p.disabled} data-tip="Rotate part (Space)" data-tip-pos="right" aria-label="Rotate selected part">
        <IconRotate size={18} />
        <span className="sbx-tool__label">Rotate</span>
      </button>
      <button className="sbx-tool" onClick={p.del} disabled={!p.hasSel || p.disabled} data-tip="Delete (Delete)" data-tip-pos="right" aria-label="Delete selection">
        <IconTrash size={18} />
        <span className="sbx-tool__label">Delete</span>
      </button>
      <button className="sbx-tool sbx-tool--phone" onClick={p.undo} disabled={!p.canUndo} aria-label="Undo">
        <IconUndo size={18} />
        <span className="sbx-tool__label">Undo</span>
      </button>
      <button className="sbx-tool sbx-tool--phone" onClick={p.redo} disabled={!p.canRedo} aria-label="Redo">
        <IconRedo size={18} />
        <span className="sbx-tool__label">Redo</span>
      </button>
      <span className="sbx-tools__sep" />
      <div className="sbx-layerpick" role="radiogroup" aria-label="Active layer">
        {(['top', 'bottom'] as const).map((l) => (
          <button
            key={l}
            role="radio"
            aria-checked={p.activeLayer === l}
            className={`sbx-layerpill sbx-layerpill--${l} ${p.activeLayer === l ? 'is-on' : ''}`}
            onClick={() => p.setActiveLayer(l)}
            data-tip={`${l === 'top' ? 'Top' : 'Bottom'} layer (${l === 'top' ? 'T' : 'B'})`}
            data-tip-pos="right"
          >
            {l === 'top' ? 'T' : 'B'}
          </button>
        ))}
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/* Status bar                                                          */
/* ------------------------------------------------------------------ */

const fmt = (mm: number, units: 'mm' | 'mil') => (units === 'mm' ? mm.toFixed(2) : (mm / 0.0254).toFixed(0))

export function StatusBar(p: {
  cursor: CursorStore
  prefs: Prefs
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>
  activeLayer: Layer
  toolName: string
  route: RouteState | null
  airwires: number
  drcState: DrcState | null
  doc: BoardDoc
  savedAt: number | null
}) {
  const c = useCursor(p.cursor)
  const pt = c.snap?.pt ?? c.world
  const u = p.prefs.units
  const fresh = p.drcState && p.drcState.doc === p.doc
  const width = p.route?.width ?? p.prefs.width
  return (
    <footer className="sbx-status mono" aria-label="Status">
      <span className="sbx-status__xy">
        <b>X</b> {pt ? fmt(pt[0], u) : '—'} <b>Y</b> {pt ? fmt(pt[1], u) : '—'}{' '}
        <button className="sbx-status__unit" onClick={() => p.setPrefs((q) => ({ ...q, units: q.units === 'mm' ? 'mil' : 'mm' }))} data-tip="Units (Q)">
          {u}
        </button>
      </span>
      <span className="sbx-status__item">
        <i className={`sbx-dot sbx-dot--${p.route?.layer ?? p.activeLayer}`} />
        {(p.route?.layer ?? p.activeLayer) === 'top' ? 'Top layer' : 'Bottom layer'}
      </span>
      <label className="sbx-status__item">
        Grid
        <select value={p.prefs.grid} onChange={(e) => p.setPrefs((q) => ({ ...q, grid: parseFloat(e.target.value) }))} aria-label="Grid size">
          {GRIDS.map((g) => (
            <option key={g} value={g}>
              {u === 'mm' ? `${g} mm` : `${Math.round(g / 0.0254)} mil`}
            </option>
          ))}
        </select>
      </label>
      <label className="sbx-status__item">
        Track
        <select value={width} onChange={(e) => p.setPrefs((q) => ({ ...q, width: parseFloat(e.target.value) }))} aria-label="Track width" disabled={!!p.route}>
          {WIDTHS.map((w) => (
            <option key={w} value={w}>
              {u === 'mm' ? `${w.toFixed(2)} mm` : `${Math.round(w / 0.0254)} mil`}
            </option>
          ))}
        </select>
      </label>
      <span className="sbx-status__item sbx-status__tool">{p.toolName}</span>
      {c.hover && <span className="sbx-status__item sbx-status__hover">{c.hover.label}{c.hover.net ? ` · ${c.hover.net}` : ''}</span>}
      <span className="grow" />
      <span className={`sbx-status__item ${p.airwires ? '' : 'is-good'}`}>Airwires {p.airwires}</span>
      <span className={`sbx-status__item ${fresh ? (p.drcState!.errors.length ? 'is-bad' : 'is-good') : ''}`}>DRC {fresh ? p.drcState!.errors.length : '–'}</span>
      <span className="sbx-status__item sbx-status__saved">{p.savedAt ? 'Saved in browser' : 'Not saved yet'}</span>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/* Canvas HUD: coach card, context bar, tool hint, photo controls      */
/* ------------------------------------------------------------------ */

const HINTS: Record<Tool, string> = {
  select: 'Drag parts to move them · Space rotates · click a track or via to select it · drag empty space to pan',
  route: 'Click a pad to start · click to add corners · click the matching pad to finish',
  via: 'Click on the board to drop a via (0.6 mm pad, 0.3 mm drill)',
  pour: 'Drag a rectangle across the board. It is clipped to the outline and set to GND',
  measure: 'Drag between two points. Snaps to pad and via centres',
  highlight: 'Click a pad, track or via to highlight its whole net',
}

export function CanvasHud(p: {
  view: ViewMode
  tool: Tool
  toolName: string
  route: RouteState | null
  sel: Sel[]
  doc: BoardDoc
  conn: Connectivity
  coach: Coach
  prefs: Prefs
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>
  photoSide: Layer
  setPhotoSide: (l: Layer) => void
  rotate: () => void
  flipPart: (ref: string) => void
  del: () => void
  finishRoute: () => void
  cancelRoute: () => void
  backspaceRoute: () => void
  cycleWidth: () => void
  switchLayer: () => void
  newPour: string | null
  closeNewPour: () => void
  updatePour: (id: string, patch: Partial<Pour>) => void
  crossProbe: (ref: string) => void
  onCoachAction: (a: NonNullable<Coach['action']>) => void
  highlightNet: string | null
  clearHighlight: () => void
  measure: unknown
  clearMeasure: () => void
}) {
  // on phones the coach starts collapsed (title only) to leave room for the board
  const [coachOpen, setCoachOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 760)
  const pour = p.newPour ? p.doc.pours.find((q) => q.id === p.newPour) : null
  const one = p.sel.length === 1 ? p.sel[0] : null
  const part = one?.kind === 'part' ? p.doc.parts.find((q) => q.ref === one.id) : null
  const track = one?.kind === 'track' ? p.doc.tracks.find((q) => q.id === one.id) : null
  const via = one?.kind === 'via' ? p.doc.vias.find((q) => q.id === one.id) : null
  const selPour = one?.kind === 'pour' ? p.doc.pours.find((q) => q.id === one.id) : null
  const actionLabel: Record<NonNullable<Coach['action']>, string> = { route: 'Route tool (W)', pour: 'Copper region', drc: 'Check DRC', '3d': 'Open 3D view', select: 'Select tool' }

  if (p.view === '3d') return null

  return (
    <>
      {p.view === 'eda' && (
        <div className={`sbx-coach ${coachOpen ? '' : 'is-collapsed'}`} onPointerDown={(e) => e.stopPropagation()} data-testid="coach">
          <button className="sbx-coach__head" onClick={() => setCoachOpen((o) => !o)} aria-expanded={coachOpen}>
            <span className="sbx-coach__step mono">{p.coach.step <= 6 ? `${p.coach.step}/6` : <IconCheck size={12} />}</span>
            <span className="sbx-coach__eyebrow mono">{p.coach.step <= 6 ? 'Next step' : 'Done'}</span>
            <span className="grow" />
            <span className="sbx-coach__toggle">{coachOpen ? '–' : '+'}</span>
          </button>
          <div className="sbx-coach__title">{p.coach.title}</div>
          {coachOpen && (
            <>
              <div className="sbx-coach__body">{p.coach.body}</div>
              {p.coach.action && !(p.coach.action === 'select' && p.tool === 'select') && !(p.coach.action === p.tool) && (
                <button className="sbx-coach__cta" onClick={() => p.onCoachAction(p.coach.action!)}>
                  {actionLabel[p.coach.action]} →
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* context bar */}
      {p.view === 'eda' && p.route && (
        <div className="sbx-ctx" onPointerDown={(e) => e.stopPropagation()} data-testid="route-hud">
          <span className="sbx-ctx__title">
            <i className={`sbx-dot sbx-dot--${p.route.layer}`} /> Routing <b style={{ color: netInfo[p.route.net ?? '']?.color }}>{p.route.net ?? 'track'}</b>
          </span>
          <button className="sbx-ctx__btn" onClick={p.backspaceRoute} data-tip="Remove last corner (Backspace)">
            <span className="sbx-long">Undo corner</span>
            <span className="sbx-short">Undo</span>
          </button>
          <button className="sbx-ctx__btn" onClick={p.cycleWidth} data-tip="Cycle width (Shift+W)">
            {p.route.width.toFixed(2)} mm
          </button>
          <button className="sbx-ctx__btn" onClick={p.switchLayer} data-tip="Via + other layer (V, or T / B)">
            <span className="sbx-long">Via → {p.route.layer === 'top' ? 'bottom' : 'top'}</span>
            <span className="sbx-short">Via</span>
          </button>
          <button className="sbx-ctx__btn is-primary" onClick={p.finishRoute} data-tip="Finish (Esc / right-click)">
            Finish
          </button>
          <button className="sbx-ctx__x" onClick={p.cancelRoute} aria-label="Cancel route" data-tip="Discard this route">
            <IconX size={14} />
          </button>
        </div>
      )}
      {p.view === 'eda' && !p.route && part && (
        <div className="sbx-ctx" onPointerDown={(e) => e.stopPropagation()}>
          <span className="sbx-ctx__title">
            <b>{part.ref}</b> {part.value} <span className="muted">· {getFootprint(part.fp).pkg}</span>
          </span>
          <button className="sbx-ctx__btn" onClick={p.rotate} data-tip="Rotate (Space)">
            <IconRotate size={14} /> Rotate
          </button>
          <button className="sbx-ctx__btn" onClick={() => p.flipPart(part.ref)} data-tip="Move to the other side (Property panel › Layer)">
            <IconFlip size={14} /> {part.side === 'top' ? 'To bottom' : 'To top'}
          </button>
          <button className="sbx-ctx__btn" onClick={() => p.crossProbe(part.ref)} data-tip="Find in schematic (Shift+X)">
            Schematic
          </button>
        </div>
      )}
      {p.view === 'eda' && !p.route && (track || via || selPour) && !pour && (
        <div className="sbx-ctx" onPointerDown={(e) => e.stopPropagation()}>
          <span className="sbx-ctx__title">
            {track && (
              <>
                <i className={`sbx-dot sbx-dot--${track.layer}`} /> Track <b>{p.conn.netOf.get(`track:${track.id}`) ?? track.net ?? '—'}</b> <span className="muted">· {track.width.toFixed(2)} mm · {trackLength(track).toFixed(1)} mm long</span>
              </>
            )}
            {via && (
              <>
                Via <b>{p.conn.netOf.get(`via:${via.id}`) ?? 'no net'}</b> <span className="muted">· {via.d}/{via.drill} mm</span>
              </>
            )}
            {selPour && (
              <>
                <i className={`sbx-dot sbx-dot--${selPour.layer}`} /> Copper region <b>{selPour.net}</b>
              </>
            )}
          </span>
          <button className="sbx-ctx__btn is-danger" onClick={p.del} data-tip="Delete">
            <IconTrash size={14} /> Delete
          </button>
        </div>
      )}

      {pour && p.view === 'eda' && (
        <div className="sbx-newpour" onPointerDown={(e) => e.stopPropagation()} data-testid="new-pour">
          <div className="sbx-newpour__head">
            <span className="mono">New copper region</span>
            <button onClick={p.closeNewPour} aria-label="Close">
              <IconX size={14} />
            </button>
          </div>
          <div className="sbx-field">
            <span className="sbx-field__label mono">Net</span>
            <div className="sbx-chips">
              {Object.keys(netInfo).map((n) => (
                <button key={n} className={`sbx-netchip ${pour.net === n ? 'is-on' : ''}`} style={{ ['--c' as string]: netInfo[n].color }} onClick={() => p.updatePour(pour.id, { net: n })}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="sbx-field">
            <span className="sbx-field__label mono">Layer</span>
            <div className="sbx-seg">
              {(['top', 'bottom'] as const).map((l) => (
                <button key={l} className={pour.layer === l ? 'is-on' : ''} onClick={() => p.updatePour(pour.id, { layer: l })}>
                  <i className={`sbx-dot sbx-dot--${l}`} /> {l === 'top' ? 'Top' : 'Bottom'}
                </button>
              ))}
            </div>
          </div>
          <Slider label="Clearance" value={pour.clearance} min={0.2} max={1} step={0.05} onChange={(v) => p.updatePour(pour.id, { clearance: Math.round(v * 100) / 100 })} unit="mm" format={(v) => v.toFixed(2)} />
          {pour.net !== 'GND' && <div className="sbx-note is-warn">Most beginner boards pour GND. A pour on another net connects only that net’s pads.</div>}
          <button className="sbx-btn sbx-btn--primary" onClick={p.closeNewPour}>
            Done
          </button>
        </div>
      )}

      {p.view === 'eda' && (p.highlightNet || p.measure) ? (
        <div className="sbx-pills" onPointerDown={(e) => e.stopPropagation()}>
          {p.highlightNet && (
            <button className="sbx-pill" onClick={p.clearHighlight} style={{ ['--c' as string]: netInfo[p.highlightNet]?.color }}>
              <i className="sbx-pill__sw" /> Highlighting {p.highlightNet} <IconX size={12} />
            </button>
          )}
          {p.measure ? (
            <button className="sbx-pill" onClick={p.clearMeasure}>
              Clear measurement <IconX size={12} />
            </button>
          ) : null}
        </div>
      ) : null}

      {p.view === 'eda' && !p.route && <div className="sbx-hint mono">{HINTS[p.tool]}</div>}

      {p.view === 'photo' && (
        <div className="sbx-photo" onPointerDown={(e) => e.stopPropagation()}>
          <div className="sbx-seg">
            {(['top', 'bottom'] as const).map((l) => (
              <button key={l} className={p.photoSide === l ? 'is-on' : ''} onClick={() => p.setPhotoSide(l)}>
                {l === 'top' ? 'Top side' : 'Bottom side'}
              </button>
            ))}
          </div>
          <span className="sbx-photo__sep" />
          <span className="sbx-field__label mono">Mask</span>
          <div className="sbx-swatches" role="radiogroup" aria-label="Solder mask colour">
            {(Object.keys(MASKS) as MaskColor[]).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={p.prefs.maskColor === m}
                aria-label={`${m} solder mask`}
                className={`sbx-swatch ${p.prefs.maskColor === m ? 'is-on' : ''}`}
                style={{ background: MASKS[m].mask }}
                onClick={() => p.setPrefs((q) => ({ ...q, maskColor: m }))}
                data-tip={m[0].toUpperCase() + m.slice(1)}
              />
            ))}
          </div>
          <span className="sbx-photo__sep" />
          <div className="sbx-seg">
            {(['hasl', 'enig'] as const).map((f) => (
              <button key={f} className={p.prefs.finish === f ? 'is-on' : ''} onClick={() => p.setPrefs((q) => ({ ...q, finish: f }))}>
                {f === 'hasl' ? 'HASL' : 'ENIG'}
              </button>
            ))}
          </div>
        </div>
      )}
      {p.view === 'photo' && <div className="sbx-hint mono">Photo preview, like View › 2D Preview. Switch back to EDA to edit.</div>}
    </>
  )
}

/** part role lookup, used by the Properties panel */
export const roleOf = (ref: string) => projectParts.find((q) => q.ref === ref)?.role ?? ''
