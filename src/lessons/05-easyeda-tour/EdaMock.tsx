import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PcbCanvas, type PcbCanvasHandle } from '@/pcb/PcbCanvas'
import { SchematicView, SymbolGraphic } from '@/pcb/SchematicView'
import { blinkySchematic, SCH_BOUNDS, type SchDoc, type SymInst } from '@/pcb/schematic'
import { BoardView, FootprintGraphic } from '@/pcb/render'
import { getFootprint } from '@/pcb/footprints'
import { stages, parts } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import type { Vec } from '@/pcb/geom'
import { menus, searchLibrary, type DocKind, type LibPart, type MenuItem, type RegionId, type ShortcutTheme } from './data'

/* ------------------------------------------------------------------ */
/* Crisp 16px UI icons (stroke-based, drawn for this mock)             */
/* ------------------------------------------------------------------ */

type IcoName =
  | 'select' | 'wire' | 'label' | 'gnd' | 'vcc' | 'device' | 'undo' | 'redo' | 'save' | 'fit' | 'track' | 'via' | 'pour' | 'outline' | 'cube' | 'drc'
  | 'search' | 'folder' | 'sch' | 'pcb' | 'board' | 'lib' | 'chev' | 'star' | 'clock' | 'user' | 'grid' | 'eye' | 'eyeoff' | 'x' | 'measure' | 'text' | 'bus'

export function Ico({ n, size = 16 }: { n: IcoName; size?: number }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const body: Record<IcoName, ReactNode> = {
    select: <path d="M4 2.5 4 12.5 6.8 9.9 8.7 14 10.5 13.2 8.7 9.2 12.4 9.1Z" {...p} fill="currentColor" fillOpacity={0.12} />,
    wire: (
      <g {...p}>
        <path d="M2.5 12.5H7V4H13.5" />
        <circle cx="7" cy="8.2" r="1.3" fill="currentColor" />
      </g>
    ),
    label: (
      <g {...p}>
        <path d="M2 11.5H14" />
        <path d="M3.5 9.5V4.5H10L12 7L10 9.5Z" fill="currentColor" fillOpacity={0.12} />
      </g>
    ),
    gnd: (
      <g {...p}>
        <path d="M8 2.5V8M3.5 8H12.5M5.2 10.5H10.8M6.9 13H9.1" />
      </g>
    ),
    vcc: (
      <g {...p}>
        <path d="M8 14V6M3.5 6H12.5" />
        <path d="M6 3.2 8 1.6 10 3.2" />
      </g>
    ),
    device: (
      <g {...p}>
        <rect x="4" y="3" width="8" height="10" rx="1" fill="currentColor" fillOpacity={0.1} />
        <path d="M2 5H4M2 8H4M2 11H4M12 5H14M12 8H14M12 11H14" />
      </g>
    ),
    undo: <path d="M5.5 4.5 2.5 7.5 5.5 10.5M2.8 7.5H10A3.5 3.5 0 0 1 10 14.5H7" {...p} />,
    redo: <path d="M10.5 4.5 13.5 7.5 10.5 10.5M13.2 7.5H6A3.5 3.5 0 0 0 6 14.5H9" {...p} />,
    save: (
      <g {...p}>
        <path d="M3 2.5H11L13.5 5V13.5H3Z" fill="currentColor" fillOpacity={0.08} />
        <path d="M5.5 2.5V6H10V2.5M5 13.5V9.5H11V13.5" />
      </g>
    ),
    fit: <path d="M2.5 6V2.5H6M10 2.5H13.5V6M13.5 10V13.5H10M6 13.5H2.5V10M6 6H10V10H6Z" {...p} />,
    track: (
      <g {...p} strokeWidth={2.2}>
        <path d="M2.5 12H6.5L10 8.5V3.5" />
      </g>
    ),
    via: (
      <g {...p}>
        <circle cx="8" cy="8" r="5" fill="currentColor" fillOpacity={0.15} />
        <circle cx="8" cy="8" r="2" />
      </g>
    ),
    pour: (
      <g {...p}>
        <path d="M2.5 3.5H13.5V12.5H2.5Z" fill="currentColor" fillOpacity={0.12} strokeDasharray="2 1.6" />
        <path d="M5 10 7.5 7.5 9 9 11.5 6" />
      </g>
    ),
    outline: <rect x="2.5" y="3.5" width="11" height="9" rx="2" {...p} strokeDasharray="0" />,
    cube: (
      <g {...p}>
        <path d="M8 1.8 13.5 4.8V11.2L8 14.2 2.5 11.2V4.8Z" fill="currentColor" fillOpacity={0.08} />
        <path d="M2.5 4.8 8 7.8 13.5 4.8M8 7.8V14.2" />
      </g>
    ),
    drc: (
      <g {...p}>
        <path d="M8 1.8 13.5 4V8.2C13.5 11.3 11 13.4 8 14.2 5 13.4 2.5 11.3 2.5 8.2V4Z" fill="currentColor" fillOpacity={0.08} />
        <path d="M5.5 8.2 7.3 10 10.6 6.4" />
      </g>
    ),
    search: (
      <g {...p}>
        <circle cx="7" cy="7" r="4.2" />
        <path d="M10.2 10.2 13.5 13.5" />
      </g>
    ),
    folder: <path d="M2 4.5V12.5H14V5.8H7.8L6.5 4.5Z" {...p} fill="currentColor" fillOpacity={0.12} />,
    sch: (
      <g {...p}>
        <path d="M3 1.8H10L13 4.8V14.2H3Z" fill="#fff" />
        <path d="M5 9H6.5M9.5 9H11" stroke="#1f7a3f" />
        <rect x="6.5" y="7.8" width="3" height="2.4" stroke="#8a1c1c" />
      </g>
    ),
    pcb: (
      <g>
        <rect x="2.5" y="2.5" width="11" height="11" rx="1.6" fill="#1f6b47" />
        <path d="M5 11V8.5L7.5 6H11" stroke="#e3a361" strokeWidth={1.2} fill="none" strokeLinecap="round" />
        <circle cx="5" cy="11" r="1.1" fill="#d3d6da" />
        <circle cx="11" cy="6" r="1.1" fill="#d3d6da" />
      </g>
    ),
    board: (
      <g {...p}>
        <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" fill="currentColor" fillOpacity={0.1} />
        <path d="M2.5 7H13.5" />
      </g>
    ),
    lib: (
      <g {...p}>
        <path d="M3 2.5H6V13.5H3ZM7 2.5H10V13.5H7Z" fill="currentColor" fillOpacity={0.1} />
        <path d="M11 3.2 13.6 2.6 15 13 12.4 13.6Z" />
      </g>
    ),
    chev: <path d="M6 4 10 8 6 12" {...p} />,
    star: <path d="M8 2 9.8 5.8 14 6.3 10.9 9.1 11.7 13.3 8 11.2 4.3 13.3 5.1 9.1 2 6.3 6.2 5.8Z" {...p} />,
    clock: (
      <g {...p}>
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 5V8L10 9.5" />
      </g>
    ),
    user: (
      <g {...p}>
        <circle cx="8" cy="5.5" r="2.7" />
        <path d="M3 13.8C3.6 11 5.6 9.8 8 9.8S12.4 11 13 13.8" />
      </g>
    ),
    grid: <path d="M2.5 2.5H13.5V13.5H2.5ZM6.2 2.5V13.5M9.8 2.5V13.5M2.5 6.2H13.5M2.5 9.8H13.5" {...p} />,
    eye: (
      <g {...p}>
        <path d="M1.5 8C3 5 5.3 3.5 8 3.5S13 5 14.5 8C13 11 10.7 12.5 8 12.5S3 11 1.5 8Z" />
        <circle cx="8" cy="8" r="2" />
      </g>
    ),
    eyeoff: (
      <g {...p}>
        <path d="M1.5 8C3 5 5.3 3.5 8 3.5S13 5 14.5 8C13 11 10.7 12.5 8 12.5S3 11 1.5 8Z" opacity={0.45} />
        <path d="M2.5 2.5 13.5 13.5" />
      </g>
    ),
    x: <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" {...p} />,
    measure: <path d="M2 11 11 2 14 5 5 14ZM5 8 6.5 9.5M7 6 8.5 7.5M9 4 10.5 5.5" {...p} />,
    text: <path d="M3.5 4V3H12.5V4M8 3V13M6 13H10" {...p} />,
    bus: <path d="M2.5 5H13.5M2.5 11H13.5M5 5V11M11 5V11" {...p} strokeWidth={2} />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      {body[n]}
    </svg>
  )
}

/* ------------------------------------------------------------------ */

export interface MockState {
  doc: DocKind
  leftOpen: boolean
  rightOpen: boolean
  bottomOpen: boolean
  rightTab: 'layers' | 'property'
}

export interface EdaMockProps extends MockState {
  compact: boolean
  set: (p: Partial<MockState>) => void
  regionRef: (id: RegionId | 'left' | 'right') => (el: HTMLElement | null) => void
  onLayerHidden: () => void
  onValueEdited: () => void
  onSearch555: () => void
  status: string | null
  setStatus: (s: string | null) => void
  locked: boolean
}

type LayerKey = 'top' | 'bottom' | 'silk' | 'outline'
const LAYERS: { k: LayerKey; name: string; color: string; key?: string }[] = [
  { k: 'top', name: 'Top Layer', color: EDA.top, key: 'T' },
  { k: 'bottom', name: 'Bottom Layer', color: EDA.bottom, key: 'B' },
  { k: 'silk', name: 'Top Silkscreen', color: EDA.silkTop },
  { k: 'outline', name: 'Board Outline', color: EDA.outline },
]

export function EdaMock(props: EdaMockProps) {
  const { doc, compact, set, regionRef, status, setStatus, locked } = props
  const canvasRef = useRef<PcbCanvasHandle>(null)
  const [sch, setSch] = useState<SchDoc>(() => blinkySchematic())
  const board = useMemo(() => stages.routed(), [])
  const [sel, setSel] = useState<string | null>(null)
  const [probe, setProbe] = useState(0)
  const [menu, setMenu] = useState<string | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const [theme, setTheme] = useState<ShortcutTheme>('pro')
  const [wireKey, setWireKey] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [vis, setVis] = useState<Record<LayerKey, boolean>>({ top: true, bottom: true, silk: true, outline: true })
  const [active, setActive] = useState<'top' | 'bottom'>('top')
  const [mil, setMil] = useState(false)
  const [cursor, setCursor] = useState<Vec | null>(null)
  const [tool, setTool] = useState('select')
  const [leftTab, setLeftTab] = useState<'project' | 'common'>('project')
  const [bottomTab, setBottomTab] = useState<'library' | 'drc'>('library')
  const [libTab, setLibTab] = useState<'System' | 'Recent' | 'Personal' | 'Favorite'>('System')
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState<LibPart | null>(null)
  const [drcRun, setDrcRun] = useState<DocKind | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const effWire = wireKey ?? (theme === 'pro' ? 'Alt+W' : 'W')
  const menuData = useMemo(() => {
    const m = menus(doc, theme)
    if (m.Place) m.Place = m.Place.map((it) => (it.label === 'Wire' ? { ...it, keys: effWire } : it))
    return m
  }, [doc, theme, effWire])
  const results = useMemo(() => searchLibrary(query), [query])

  useEffect(() => {
    if (query.toLowerCase().includes('555')) props.onSearch555()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // close menus on outside press
  useEffect(() => {
    if (!menu) return
    const h = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.('[data-menu-zone]')) setMenu(null)
    }
    window.addEventListener('pointerdown', h, true)
    return () => window.removeEventListener('pointerdown', h, true)
  }, [menu])

  const openDoc = (d: DocKind) => {
    set({ doc: d, rightTab: d === 'pcb' ? 'layers' : 'property', leftOpen: compact ? false : props.leftOpen })
    setStatus(d === 'pcb' ? 'Opened PCB1. Its Layers panel is on the right.' : 'Opened Schematic1.')
  }

  const crossProbe = () => {
    if (!sel) {
      setStatus('Cross probe: select a part first, then press Shift+X.')
      return
    }
    const to: DocKind = doc === 'sch' ? 'pcb' : 'sch'
    set({ doc: to, rightTab: 'property' })
    setProbe((p) => p + 1)
    setStatus(`Cross probe: jumped to ${sel} in the ${to === 'pcb' ? 'PCB' : 'schematic'}.`)
    window.setTimeout(() => canvasRef.current?.fit(), 0)
  }

  const runMenu = (it: MenuItem, subLabel?: string) => {
    setMenu(null)
    setSub(null)
    const path = `${it.label}${subLabel ? ` › ${subLabel}` : ''}`
    switch (it.action) {
      case 'drc':
        setDrcRun(doc)
        set({ bottomOpen: true })
        setBottomTab('drc')
        setStatus('Design › Check DRC finished. Results are in the bottom panel.')
        return
      case 'shortcuts':
        setShortcutsOpen(true)
        return
      case 'convert':
        openDoc('pcb')
        setStatus('Update/Convert Schematic to PCB: in the real editor you would confirm the changes first.')
        return
      case 'import':
        setStatus('Import Changes from Schematic pulls schematic edits into this PCB.')
        return
      case 'library':
        set({ bottomOpen: true })
        setBottomTab('library')
        setStatus('Place › Device opens a device search. The Library panel below searches parts too.')
        return
    }
    setStatus(`${path}${it.keys ? `  (${it.keys})` : ''}: menu command. This demo only shows where it lives.`)
  }

  // keyboard
  useEffect(() => {
    const el = rootRef.current?.closest('.l05') as HTMLElement | null
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (locked) return
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT') return
      if (shortcutsOpen) return
      const k = e.key.toLowerCase()
      if (e.shiftKey && k === 'x') {
        e.preventDefault()
        crossProbe()
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (k === 'k') {
          canvasRef.current?.fit()
          setStatus('K: fit all.')
        } else if (k === 'q' && doc === 'pcb') {
          setMil((m) => !m)
          setStatus('Q: switched units.')
        } else if (k === 's') {
          set({ bottomOpen: !props.bottomOpen })
          setStatus('S: toggled the Library panel.')
        } else if (doc === 'pcb' && (k === 't' || k === 'b')) {
          setActive(k === 't' ? 'top' : 'bottom')
          setStatus(`${k.toUpperCase()}: ${k === 't' ? 'Top' : 'Bottom'} Layer is now active.`)
        } else if (k === 'escape') {
          setMenu(null)
          setSel(null)
        }
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  })

  const selInst = sch.symbols.find((s) => s.ref === sel)
  const selPart = parts.find((p) => p.ref === sel)

  /* ---------------- canvas ---------------- */
  const probePulse = sel && probe > 0 && (
    <g key={probe} style={{ pointerEvents: 'none' }}>
      {doc === 'sch' && selInst && <circle cx={selInst.x} cy={selInst.y} r={34} fill="none" stroke="#ff8a3d" strokeWidth={2} className="l05-probe" />}
      {doc === 'pcb' &&
        (() => {
          const p = board.parts.find((q) => q.ref === sel)
          return p ? <circle cx={p.x} cy={p.y} r={4} fill="none" stroke="#fff" strokeWidth={0.25} className="l05-probe" /> : null
        })()}
    </g>
  )

  const canvas =
    doc === 'sch' ? (
      <PcbCanvas
        key="sch"
        ref={canvasRef}
        fit={SCH_BOUNDS}
        pad={14}
        theme="schematic"
        grid={10}
        majorEvery={5}
        zoomControls={false}
        ariaLabel="Schematic canvas"
      >
        <SchematicView
          doc={sch}
          highlightRefs={sel ? [sel] : []}
          showPinNames
          showPinNumbers
          onSymbolPointerDown={(ref, e) => {
            if (e.button !== 0) return
            setSel(ref)
            set({ rightTab: 'property' })
          }}
        />
        {probePulse}
      </PcbCanvas>
    ) : (
      <PcbCanvas
        key="pcb"
        ref={canvasRef}
        fit={{ x: 0, y: 0, w: board.w, h: board.h }}
        pad={2}
        theme="eda"
        grid={1}
        zoomControls={false}
        onPointerMove={(_e, w) => setCursor(w)}
        ariaLabel="PCB canvas"
      >
        <BoardView
          doc={board}
          mode="eda"
          vis={{ ...vis, refs: vis.silk, ratsnest: false }}
          activeLayer={active}
          selectedRefs={sel ? [sel] : []}
          onPartPointerDown={(ref, e) => {
            if (e.button !== 0) return
            setSel(ref)
            set({ rightTab: 'property' })
          }}
        />
        {probePulse}
      </PcbCanvas>
    )

  const fmt = (mm: number) => (mil ? `${(mm / 0.0254).toFixed(0)}` : mm.toFixed(2))

  /* ---------------- panels ---------------- */
  const left = (
    <aside className="l05-left" ref={regionRef('project')} data-region="project">
      <div className="l05-ptabs">
        <button className={leftTab === 'project' ? 'is-on' : ''} onClick={() => setLeftTab('project')}>
          <Ico n="folder" size={13} /> Project
        </button>
        <button className={leftTab === 'common' ? 'is-on' : ''} onClick={() => setLeftTab('common')}>
          <Ico n="lib" size={13} /> Common Library
        </button>
      </div>
      {leftTab === 'project' ? (
        <div className="l05-tree">
          <div className="l05-tree__row is-head">
            <span className="l05-tree__chev is-open">
              <Ico n="chev" size={11} />
            </span>
            <Ico n="folder" size={14} /> Blinky
          </div>
          <div className="l05-tree__row" style={{ paddingLeft: 18 }}>
            <span className="l05-tree__chev is-open">
              <Ico n="chev" size={11} />
            </span>
            <Ico n="board" size={14} /> Board1
          </div>
          {(['sch', 'pcb'] as const).map((d) => (
            <button
              key={d}
              className={`l05-tree__row is-doc ${doc === d ? 'is-open' : ''}`}
              style={{ paddingLeft: 40 }}
              onClick={() => openDoc(d)}
              onDoubleClick={() => openDoc(d)}
              title="Double-click to open"
            >
              <Ico n={d} size={14} /> {d === 'sch' ? 'Schematic1' : 'PCB1'}
              {doc === d && <span className="l05-tree__dot" />}
            </button>
          ))}
          <div className="l05-tree__hint">Double-click a document to open it.</div>
        </div>
      ) : (
        <div className="l05-common">
          {(['R', 'C', 'LED', 'NE555'] as const).map((s) => (
            <div key={s} className="l05-common__item" title={s}>
              <svg viewBox={s === 'NE555' ? '-64 -74 128 148' : '-24 -22 48 44'} width="100%" height="34">
                <SymbolGraphic inst={{ ref: '', sym: s, value: '', x: 0, y: 0, rot: 0 }} showPinNames={false} showPinNumbers={false} />
              </svg>
              <span>{{ R: 'Resistor', C: 'Capacitor', LED: 'LED', NE555: 'Timer' }[s]}</span>
            </div>
          ))}
          <div className="l05-common__item">
            <svg viewBox="-12 -2 24 18" width="100%" height="34">
              <g stroke="#8a1c1c" strokeWidth={1.4} fill="none">
                <line x1={0} y1={0} x2={0} y2={6} />
                <line x1={-8} y1={6} x2={8} y2={6} />
                <line x1={-5} y1={9.5} x2={5} y2={9.5} />
                <line x1={-2} y1={13} x2={2} y2={13} />
              </g>
            </svg>
            <span>GND</span>
          </div>
          <div className="l05-common__item">
            <svg viewBox="-12 -18 24 20" width="100%" height="34">
              <g stroke="#8a1c1c" strokeWidth={1.6} fill="none">
                <line x1={0} y1={0} x2={0} y2={-6} />
                <line x1={-8} y1={-6} x2={8} y2={-6} />
              </g>
              <text x={0} y={-10} fontSize={6.5} textAnchor="middle" fill="#8a1c1c" fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
                VCC
              </text>
            </svg>
            <span>VCC</span>
          </div>
        </div>
      )}
    </aside>
  )

  const property = (
    <div className="l05-prop" ref={regionRef('property')} data-region="property">
      {sel && selPart ? (
        <>
          <div className="l05-prop__title">
            {doc === 'sch' ? 'Component' : 'Footprint'} · <b>{sel}</b>
          </div>
          <PropRow k="Designator" v={sel} />
          {doc === 'sch' && selInst ? (
            <label className="l05-prop__row">
              <span>Name</span>
              <input
                className="l05-input"
                value={selInst.value}
                onChange={(e) => {
                  const v = e.target.value
                  setSch((d) => ({ ...d, symbols: d.symbols.map((s) => (s.ref === sel ? { ...s, value: v } : s)) }))
                  props.onValueEdited()
                }}
                aria-label={`Value of ${sel}`}
              />
            </label>
          ) : (
            <PropRow k="Name" v={selInst?.value ?? ''} />
          )}
          <PropRow k="Footprint" v={getFootprint(selPart.fp).name} link />
          <PropRow k="Supplier" v="LCSC" />
          <PropRow k="Supplier Part" v="C…" muted />
          <PropRow k="Manufacturer Part" v={selPart.ref === 'U1' ? 'NE555…' : '—'} muted />
          <div className="l05-prop__note">{doc === 'sch' ? 'Try editing the name: the label on the canvas changes.' : 'Shift+X jumps back to this part in the schematic.'}</div>
        </>
      ) : (
        <>
          <div className="l05-prop__title">{doc === 'sch' ? 'Schematic1' : 'PCB1'}</div>
          <PropRow k="Document" v={doc === 'sch' ? 'Schematic' : 'PCB'} />
          {doc === 'pcb' && <PropRow k="Units" v={mil ? 'mil' : 'mm'} />}
          {doc === 'pcb' && <PropRow k="Size" v={`${board.w} × ${board.h} mm`} />}
          <div className="l05-prop__empty">
            <Ico n="select" size={18} />
            Click a part on the canvas to see and edit its properties here.
          </div>
        </>
      )}
    </div>
  )

  const layers = (
    <div className="l05-layers" ref={regionRef('layers')} data-region="layers">
      {LAYERS.map((l) => (
        <div key={l.k} className={`l05-layer ${active === l.k ? 'is-active' : ''} ${!vis[l.k] ? 'is-off' : ''}`}>
          <button
            className="l05-layer__main"
            onClick={() => {
              if (l.k === 'top' || l.k === 'bottom') {
                setActive(l.k)
                setStatus(`${l.name} is now the active layer${l.key ? ` (shortcut ${l.key})` : ''}.`)
              }
            }}
          >
            <span className="l05-layer__sw" style={{ background: l.color }} />
            <span className="l05-layer__name">{l.name}</span>
            {l.key && <kbd className="l05-kbd">{l.key}</kbd>}
          </button>
          <button
            className="l05-layer__eye"
            aria-label={vis[l.k] ? `Hide ${l.name}` : `Show ${l.name}`}
            onClick={() => {
              setVis((v) => ({ ...v, [l.k]: !v[l.k] }))
              if (vis[l.k]) props.onLayerHidden()
            }}
          >
            <Ico n={vis[l.k] ? 'eye' : 'eyeoff'} size={14} />
          </button>
        </div>
      ))}
      <div className="l05-layers__more">Silkscreen, solder mask and more layers are listed in the real panel.</div>
    </div>
  )

  const right = (
    <aside className="l05-right">
      <div className="l05-ptabs">
        {doc === 'pcb' && (
          <button className={props.rightTab === 'layers' ? 'is-on' : ''} onClick={() => set({ rightTab: 'layers' })}>
            Layers
          </button>
        )}
        <button className={props.rightTab === 'property' || doc === 'sch' ? 'is-on' : ''} onClick={() => set({ rightTab: 'property' })}>
          Property
        </button>
        <button className="is-dim" tabIndex={-1}>
          Filter
        </button>
      </div>
      {doc === 'pcb' && props.rightTab === 'layers' ? layers : property}
    </aside>
  )

  const libBody = (
    <div className="l05-lib">
      <div className="l05-lib__side">
        {(['System', 'Recent', 'Personal', 'Favorite'] as const).map((t) => (
          <button key={t} className={libTab === t ? 'is-on' : ''} onClick={() => setLibTab(t)}>
            <Ico n={t === 'System' ? 'lib' : t === 'Recent' ? 'clock' : t === 'Personal' ? 'user' : 'star'} size={13} /> {t}
          </button>
        ))}
      </div>
      <div className="l05-lib__main">
        <div className="l05-search">
          <Ico n="search" size={14} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPick(null)
              setLibTab('System')
            }}
            placeholder="Search parts, e.g. NE555"
            aria-label="Search the library"
          />
          {query ? (
            <button className="l05-search__x" onClick={() => setQuery('')} aria-label="Clear search">
              <Ico n="x" size={12} />
            </button>
          ) : (
            <button className="l05-search__try" onClick={() => setQuery('NE555')}>
              Try NE555
            </button>
          )}
        </div>
        {libTab !== 'System' ? (
          <div className="l05-lib__empty">
            {libTab === 'Recent' ? 'Parts you placed recently show up here.' : libTab === 'Personal' ? 'Symbols and footprints you make yourself live here.' : 'Star a part to keep it here.'}
          </div>
        ) : results.length ? (
          <div className="l05-results" role="table">
            <div className="l05-results__row is-head" role="row">
              <span>Device</span>
              <span>Package</span>
              <span>Description</span>
            </div>
            {results.map((r) => (
              <button key={r.name} className={`l05-results__row ${pick?.name === r.name ? 'is-on' : ''}`} onClick={() => setPick(r)} role="row">
                <span className="mono">{r.name}</span>
                <span className="mono">{r.pkg}</span>
                <span>{r.desc}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="l05-lib__empty">{query ? 'No matches in this demo. Try NE555, 1k or 10µF.' : 'Type a part name or value. Results come with a symbol and a footprint.'}</div>
        )}
      </div>
      {pick && !compact && <LibPreview part={pick} onPlace={() => setStatus(`${pick.name}: in EasyEDA the part would now follow your cursor, ready to click into place.`)} />}
    </div>
  )

  const bottom = (
    <section className={`l05-bottom ${props.bottomOpen ? 'is-open' : ''}`} ref={regionRef('bottom')} data-region="bottom">
      <div className="l05-btabs">
        <button
          className={bottomTab === 'library' && props.bottomOpen ? 'is-on' : ''}
          onClick={() => {
            setBottomTab('library')
            set({ bottomOpen: bottomTab === 'library' ? !props.bottomOpen : true })
          }}
        >
          <Ico n="lib" size={13} /> Library
        </button>
        <button
          className={bottomTab === 'drc' && props.bottomOpen ? 'is-on' : ''}
          onClick={() => {
            setBottomTab('drc')
            set({ bottomOpen: bottomTab === 'drc' ? !props.bottomOpen : true })
          }}
        >
          <Ico n="drc" size={13} /> DRC
        </button>
        <span className="grow" />
        <span className="l05-btabs__hint mono">S</span>
      </div>
      {props.bottomOpen &&
        (bottomTab === 'library' ? (
          libBody
        ) : (
          <div className="l05-drc">
            {drcRun === doc ? (
              <>
                <div className="l05-drc__ok">
                  <Ico n="drc" size={16} /> 0 errors · 0 warnings
                </div>
                <div className="l05-lib__empty">Blinky's {doc === 'sch' ? 'schematic' : 'PCB'} passes. Any problems would be listed here.</div>
              </>
            ) : (
              <div className="l05-lib__empty">
                Run <b>Design › Check DRC</b> from the top menu to list problems here.
              </div>
            )}
          </div>
        ))}
    </section>
  )

  /* ---------------- toolbar ---------------- */
  const tools: { n: IcoName; label: string }[] =
    doc === 'sch'
      ? [
          { n: 'select', label: 'Select' },
          { n: 'wire', label: `Wire (${effWire})` },
          { n: 'bus', label: 'Bus (Alt+B)' },
          { n: 'label', label: 'Net Label (N)' },
          { n: 'gnd', label: 'Ground flag' },
          { n: 'vcc', label: 'Power flag' },
          { n: 'device', label: 'Place Device (Shift+F)' },
          { n: 'text', label: 'Text' },
        ]
      : [
          { n: 'select', label: 'Select' },
          { n: 'track', label: 'Route Track' },
          { n: 'via', label: 'Via (V)' },
          { n: 'pour', label: 'Copper Region' },
          { n: 'outline', label: 'Board Outline' },
          { n: 'measure', label: 'Measure (Alt+M)' },
          { n: 'cube', label: '3D Preview' },
        ]

  const toolbar = (
    <div className="l05-toolbar" ref={regionRef('toolbar')} data-region="toolbar">
      <div className="l05-tgroup">
        <button className="l05-tbtn" title="Save All (Ctrl+S)" onClick={() => setStatus('Save All (Ctrl+S).')}>
          <Ico n="save" />
        </button>
        <button className="l05-tbtn" title="Undo (Ctrl+Z)" onClick={() => setStatus('Undo (Ctrl+Z).')}>
          <Ico n="undo" />
        </button>
        <button className="l05-tbtn" title="Redo (Ctrl+Y)" onClick={() => setStatus('Redo (Ctrl+Y).')}>
          <Ico n="redo" />
        </button>
      </div>
      <div className="l05-tgroup">
        {tools.map((t) => (
          <button
            key={t.label}
            className={`l05-tbtn ${tool === t.n ? 'is-on' : ''}`}
            title={t.label}
            aria-label={t.label}
            onClick={() => {
              setTool(t.n)
              setStatus(`${t.label}: tool selected. This demo only shows where tools live.`)
            }}
          >
            <Ico n={t.n} />
          </button>
        ))}
      </div>
      <div className="l05-tgroup">
        <button
          className="l05-tbtn"
          title="Fit All (K)"
          onClick={() => {
            canvasRef.current?.fit()
            setStatus('Fit All (K).')
          }}
        >
          <Ico n="fit" />
        </button>
        <button className="l05-tbtn" title="Design › Check DRC" onClick={() => runMenu({ label: 'Check DRC', action: 'drc' })}>
          <Ico n="drc" />
        </button>
      </div>
    </div>
  )

  /* ---------------- render ---------------- */
  const docTabs = (
    <div className="l05-doctabs">
      {(['sch', 'pcb'] as const).map((d) => (
        <button key={d} className={`l05-doctab ${doc === d ? 'is-on' : ''}`} onClick={() => openDoc(d)}>
          <Ico n={d} size={13} />
          {d === 'sch' ? 'Schematic1' : 'PCB1'}
        </button>
      ))}
      <span className="grow" />
      {!compact && <span className="l05-doctabs__hint mono">Shift+X cross probe · K fit</span>}
    </div>
  )

  return (
    <div className={`l05-win ${compact ? 'is-compact' : ''}`} ref={rootRef}>
      {!compact && (
        <div className="l05-titlebar">
          <span className="l05-lights">
            <i />
            <i />
            <i />
          </span>
          <span className="l05-titlebar__t">
            <b>Blinky</b> — {doc === 'sch' ? 'Schematic1' : 'PCB1'} · EasyEDA Pro
          </span>
        </div>
      )}
      <nav className="l05-menubar" ref={regionRef('menu')} data-region="menu" data-menu-zone>
        <span className="l05-appmark" aria-hidden>
          <svg viewBox="0 0 16 16" width="15" height="15">
            <defs>
              <linearGradient id="l05-mark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#4aa3ff" />
                <stop offset="1" stopColor="#1e64c8" />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="14" height="14" rx="3.5" fill="url(#l05-mark)" />
            <path d="M4.5 10.5H7.5L9.5 6.5H11.5" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="4.5" cy="10.5" r="1.2" fill="#fff" />
            <circle cx="11.5" cy="6.5" r="1.2" fill="#fff" />
          </svg>
        </span>
        {Object.entries(menuData).map(([name, items]) => (
          <div key={name} className="l05-menu">
            <button
              className={`l05-menu__btn ${menu === name ? 'is-on' : ''}`}
              onClick={() => {
                setMenu((m) => (m === name ? null : name))
                setSub(null)
              }}
              onPointerEnter={() => menu && setMenu(name)}
            >
              {name}
            </button>
            {menu === name && !compact && (
              <div className="l05-drop" role="menu">
                {items.map((it) => (
                  <div key={it.label} className="l05-drop__wrap" onPointerEnter={() => setSub(it.sub ? it.label : null)}>
                    <button className={`l05-drop__item ${it.action ? 'is-live' : ''}`} role="menuitem" onClick={() => (it.sub ? setSub(it.label) : runMenu(it))}>
                      <span>{it.label}</span>
                      {it.keys && <span className="l05-drop__keys mono">{it.keys}</span>}
                      {it.sub && <Ico n="chev" size={11} />}
                    </button>
                    {it.sub && sub === it.label && (
                      <div className="l05-drop l05-drop--sub">
                        {it.sub.map((s) => (
                          <button key={s} className="l05-drop__item" onClick={() => runMenu(it, s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      {compact && menu && menuData[menu] && (
        <div className="l05-drop l05-drop--sheet" role="menu" data-menu-zone>
          <div className="l05-drop__head mono">{menu}</div>
          {menuData[menu].map((it) => (
            <div key={it.label}>
              <button className={`l05-drop__item ${it.action ? 'is-live' : ''}`} role="menuitem" onClick={() => (it.sub ? setSub(sub === it.label ? null : it.label) : runMenu(it))}>
                <span>{it.label}</span>
                {it.keys && <span className="l05-drop__keys mono">{it.keys}</span>}
                {it.sub && <Ico n="chev" size={11} />}
              </button>
              {it.sub && sub === it.label && (
                <div className="l05-drop__subs">
                  {it.sub.map((x) => (
                    <button key={x} className="l05-drop__item" onClick={() => runMenu(it, x)}>
                      {x}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {toolbar}
      <div className="l05-main">
        {!compact && left}
        <div className="l05-center" ref={regionRef('canvas')} data-region="canvas">
          {docTabs}
          <div className="l05-canvas">
            {canvas}
            {compact && (
              <>
                <button className="l05-edge l05-edge--l" ref={regionRef('left')} data-region="project" onClick={() => set({ leftOpen: !props.leftOpen, rightOpen: false })}>
                  <Ico n="folder" size={13} /> Project
                </button>
                <button className="l05-edge l05-edge--r" ref={regionRef('right')} data-region={doc === 'pcb' && props.rightTab === 'layers' ? 'layers' : 'property'} onClick={() => set({ rightOpen: !props.rightOpen, leftOpen: false })}>
                  {doc === 'pcb' ? 'Layers · Property' : 'Property'} <Ico n="chev" size={11} />
                </button>
              </>
            )}
          </div>
        </div>
        {!compact && right}
        {compact && (props.leftOpen || props.rightOpen) && <div className="l05-scrim" onClick={() => set({ leftOpen: false, rightOpen: false })} aria-hidden />}
        {compact && props.leftOpen && <div className="l05-drawer l05-drawer--l">{left}</div>}
        {compact && props.rightOpen && <div className="l05-drawer l05-drawer--r">{right}</div>}
      </div>
      {bottom}
      <footer className="l05-status mono">
        <span className="l05-status__msg">{status ?? (doc === 'sch' ? 'Ready. Click a part to select it.' : 'Ready. Q toggles mm and mil.')}</span>
        <span className="grow" />
        {doc === 'pcb' && (
          <>
            {!compact && cursor && (
              <span className="l05-status__xy">
                X {fmt(cursor[0])} Y {fmt(cursor[1])}
              </span>
            )}
            <button
              className="l05-status__unit"
              onClick={() => {
                setMil((m) => !m)
                setStatus('Units switched (shortcut Q).')
              }}
              title="Units (Q)"
            >
              {mil ? 'mil' : 'mm'}
            </button>
          </>
        )}
      </footer>

      {shortcutsOpen && (
        <ShortcutsDialog
          theme={theme}
          setTheme={(t) => {
            setTheme(t)
            setWireKey(null)
          }}
          wireKey={effWire}
          setWireKey={setWireKey}
          onClose={() => setShortcutsOpen(false)}
        />
      )}
    </div>
  )
}

function PropRow({ k, v, link, muted }: { k: string; v: string; link?: boolean; muted?: boolean }) {
  return (
    <div className="l05-prop__row">
      <span>{k}</span>
      <span className={`l05-prop__v ${link ? 'is-link' : ''} ${muted ? 'is-muted' : ''}`}>{v}</span>
    </div>
  )
}

function LibPreview({ part, onPlace }: { part: LibPart; onPlace: () => void }) {
  const fp = getFootprint(part.fp)
  const inst: SymInst = { ref: '', sym: part.sym, value: '', x: 0, y: 0, rot: 0 }
  const big = part.sym === 'NE555'
  const pad = 0.8
  return (
    <div className="l05-prev">
      <div className="l05-prev__cell">
        <svg viewBox={big ? '-66 -76 132 152' : '-26 -22 52 44'} width="100%" height="100%">
          <SymbolGraphic inst={inst} showPinNumbers showPinNames={big} />
        </svg>
        <span className="mono">Symbol</span>
      </div>
      <div className="l05-prev__cell is-dark">
        <svg viewBox={`${-fp.courtyard.w - pad} ${-fp.courtyard.h - pad} ${fp.courtyard.w * 2 + pad * 2} ${fp.courtyard.h * 2 + pad * 2}`} width="100%" height="100%">
          <FootprintGraphic fp={fp} mode="eda" showNumbers />
        </svg>
        <span className="mono">Footprint · {part.pkg}</span>
      </div>
      <button className="l05-prev__place" onClick={onPlace}>
        Place
      </button>
    </div>
  )
}

function ShortcutsDialog({
  theme,
  setTheme,
  wireKey,
  setWireKey,
  onClose,
}: {
  theme: ShortcutTheme
  setTheme: (t: ShortcutTheme) => void
  wireKey: string
  setWireKey: (k: string) => void
  onClose: () => void
}) {
  const [listening, setListening] = useState(false)
  useEffect(() => {
    if (!listening) return
    const h = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      const parts = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.key.length === 1 ? e.key.toUpperCase() : e.key].filter(Boolean)
      setWireKey(parts.join('+'))
      setListening(false)
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [listening, setWireKey])
  return (
    <div className="l05-modal" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="l05-dialog" role="dialog" aria-label="Shortcuts">
        <div className="l05-dialog__head">
          <span>Settings › Shortcuts</span>
          <button onClick={onClose} aria-label="Close">
            <Ico n="x" size={13} />
          </button>
        </div>
        <div className="l05-dialog__body">
          <div className="l05-dialog__label">Shortcut theme</div>
          <div className="l05-radio">
            {(
              [
                ['pro', 'Professional Edition'],
                ['std', 'Standard Edition'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={theme === v ? 'is-on' : ''} onClick={() => setTheme(v)}>
                <i />
                {l}
              </button>
            ))}
          </div>
          <div className="l05-sctable">
            <div className="l05-sctable__row is-head">
              <span>Command</span>
              <span>Key</span>
            </div>
            <div className="l05-sctable__row">
              <span>Wire</span>
              <button className={`l05-keycap ${listening ? 'is-listening' : ''}`} onClick={() => setListening(true)}>
                {listening ? 'Press a key…' : wireKey}
              </button>
            </div>
          </div>
          <p className="l05-dialog__note">
            Switch the theme and watch the Wire key change between <b>Alt+W</b> and <b>W</b>. Many other keys change too. Click the key
            to remap it, then open the Place menu: the new key shows up there.
          </p>
        </div>
      </div>
    </div>
  )
}
