import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { useMission } from '../mission'
import { Button, Chip, FloatingCard, Segmented, Toggle } from '@/components/ui'
import { IconCheck, IconPointer, IconReset, IconRoute, IconTarget, IconTrash, IconUndo, IconX, IconChevronDown, IconSpark } from '@/components/icons'
import { PcbCanvas, type PcbCanvasHandle } from '@/pcb/PcbCanvas'
import { BoardView, PadGlyph } from '@/pcb/render'
import { analyze, beginnerRules, courtyardRect, newId, type BoardDoc, type DrcKind, type Rules, type WorldPad } from '@/pcb/board'
import { getFootprint } from '@/pcb/footprints'
import { netInfo } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { route45, snap, type Vec } from '@/pcb/geom'
import {
  KINDS,
  KIND_ORDER,
  anchorsFor,
  autoRoute,
  buggyBoard,
  movePart,
  rulesAtLeast,
  rulesKey,
  runDrc,
  trackLength,
  type Anchor,
  type DrcItem,
  type Rect,
} from './bugs'

/* ------------------------------------------------------------------ */
/* Small pieces                                                         */
/* ------------------------------------------------------------------ */

export function KindIcon({ kind, size = 16 }: { kind: DrcKind; size?: number }) {
  const c = KINDS[kind].color
  const common = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true } as const
  switch (kind) {
    case 'short':
      return (
        <svg {...common}>
          <path d="M9.5 1.5 4 9h4l-1.5 5.5L12 7H8z" fill={c} />
        </svg>
      )
    case 'clearance':
      return (
        <svg {...common} fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round">
          <path d="M3 2v12M13 2v12M5.5 8h5M7 6.5 5.5 8 7 9.5M9 6.5l1.5 1.5L9 9.5" />
        </svg>
      )
    case 'unrouted':
      return (
        <svg {...common} fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round">
          <circle cx="3" cy="13" r="1.8" fill={c} stroke="none" />
          <circle cx="13" cy="3" r="1.8" fill={c} stroke="none" />
          <path d="M5 11 11 5" strokeDasharray="1.6 1.8" />
        </svg>
      )
    case 'width':
      return (
        <svg {...common} fill="none" stroke={c} strokeLinecap="round">
          <path d="M2 8h12" strokeWidth={0.9} />
          <path d="M8 2.5v3M8 10.5v3M6.5 4 8 5.5 9.5 4M6.5 12 8 10.5 9.5 12" strokeWidth={1.4} />
        </svg>
      )
    case 'edge':
    case 'offboard':
      return (
        <svg {...common} fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round">
          <path d="M2 14V5a3 3 0 0 1 3-3h9" />
          <circle cx="5.6" cy="5.6" r="1.8" fill={c} stroke="none" />
        </svg>
      )
    case 'overlap':
      return (
        <svg {...common} fill="none" stroke={c} strokeWidth={1.5}>
          <rect x="1.5" y="1.5" width="8" height="8" rx="1" />
          <rect x="6.5" y="6.5" width="8" height="8" rx="1" fill={c} fillOpacity={0.35} />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5" fill="none" stroke={c} strokeWidth={1.6} />
          <circle cx="8" cy="8" r="2" fill={c} />
        </svg>
      )
  }
}

const ptsStr = (pts: Vec[]) => pts.map((p) => `${p[0]},${p[1]}`).join(' ')

type Sel = { kind: 'track'; id: string } | { kind: 'part'; ref: string } | null

interface Results {
  errors: DrcItem[]
  rules: Rules
  version: number
  at: number
  delta: number | null
  rulesChanged: boolean
}

interface RouteState {
  net?: string
  width: number
  pts: Vec[]
}

const BUG_KINDS: DrcKind[] = ['short', 'clearance', 'unrouted', 'width', 'edge', 'overlap']

const RULE_FIELDS: { key: 'minTrack' | 'clearance' | 'edgeClearance'; label: string; about: string; fab: string; min: number; max: number }[] = [
  { key: 'minTrack', label: 'Track width (min)', about: 'No track may be thinner than this.', fab: 'JLCPCB min 0.10', min: 0.1, max: 0.6 },
  { key: 'clearance', label: 'Clearance', about: 'Minimum gap between copper of different nets.', fab: 'JLCPCB min 0.10', min: 0.1, max: 0.6 },
  { key: 'edgeClearance', label: 'Copper to board edge', about: 'Keep copper this far from the outline.', fab: 'JLCPCB min 0.20', min: 0.1, max: 1.5 },
]

const PRESETS: { id: string; label: string; rules: Rules }[] = [
  { id: 'beginner', label: 'Beginner', rules: beginnerRules },
  { id: 'strict', label: 'Strict', rules: { ...beginnerRules, minTrack: 0.3, clearance: 0.3, edgeClearance: 0.5 } },
  { id: 'fab', label: 'Fab limit', rules: { ...beginnerRules, minTrack: 0.1, clearance: 0.1, edgeClearance: 0.2 } },
]

const BOARD_RECT: Rect = { x: 0, y: 0, w: 30, h: 26 }

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */

export function Scene() {
  const mission = useMission()
  const [doc, setDocRaw] = useState<BoardDoc>(() => buggyBoard())
  const [history, setHistory] = useState<BoardDoc[]>([])
  const [version, setVersion] = useState(0)
  const [rules, setRules] = useState<Rules>(beginnerRules)
  const [results, setResults] = useState<Results | null>(null)
  const [selErr, setSelErr] = useState<string | null>(null)
  const [sel, setSel] = useState<Sel>(null)
  const [tool, setTool] = useState<'select' | 'route'>('select')
  const [route, setRoute] = useState<RouteState | null>(null)
  const [cursor, setCursor] = useState<Vec | null>(null)
  const [hoverPad, setHoverPad] = useState<WorldPad | null>(null)
  const [menu, setMenu] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [realtime, setRealtime] = useState(false)
  const [note, setNote] = useState<ReactNode>(null)
  const [scanning, setScanning] = useState(false)
  const [showPours, setShowPours] = useState(false)

  const canvasRef = useRef<PcbCanvasHandle>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width > 640))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const conn = useMemo(() => analyze(doc), [doc])

  /* ---------- doc edits with undo ---------- */
  const docRef = useRef(doc)
  docRef.current = doc
  const histRef = useRef(history)
  histRef.current = history
  const commit = useCallback((next: BoardDoc | ((d: BoardDoc) => BoardDoc)) => {
    const cur = docRef.current
    const n = typeof next === 'function' ? next(cur) : next
    if (n === cur) return
    docRef.current = n
    setHistory((h) => [...h.slice(-40), cur])
    setDocRaw(n)
    setVersion((v) => v + 1)
  }, [])
  const undo = useCallback(() => {
    const h = histRef.current
    if (!h.length) return
    setDocRaw(h[h.length - 1])
    setHistory(h.slice(0, -1))
    setVersion((v) => v + 1)
    setSel(null)
  }, [])

  /* ---------- camera ---------- */
  const leftPad = wide ? 11 : 0
  const homeFit = useMemo<Rect>(() => ({ x: BOARD_RECT.x - leftPad, y: BOARD_RECT.y, w: BOARD_RECT.w + leftPad, h: BOARD_RECT.h }), [leftPad])
  const [fit, setFit] = useState<Rect>(homeFit)
  const fitRef = useRef(fit)
  fitRef.current = fit
  const anim = useRef(0)
  const flyTo = useCallback((target: Rect) => {
    cancelAnimationFrame(anim.current)
    const from = fitRef.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return setFit(target)
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 520)
      const e = 1 - Math.pow(1 - k, 3)
      setFit({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      })
      if (k < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => {
    if (!selErr) setFit(homeFit)
  }, [homeFit]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelAnimationFrame(anim.current), [])

  /* ---------- DRC ---------- */
  const resultsRef = useRef(results)
  resultsRef.current = results
  const runCheck = useCallback(
    (quiet = false) => {
      const d = docRef.current
      const errors = runDrc(d, rules)
      const prev = resultsRef.current
      const rulesChanged = !!prev && rulesKey(prev.rules) !== rulesKey(rules)
      const next: Results = { errors, rules, version, at: Date.now(), delta: prev ? errors.length - prev.errors.length : null, rulesChanged }
      resultsRef.current = next
      setResults(next)
      setSelErr((cur) => (cur && errors.some((e) => e.id === cur) ? cur : null))
      mission.complete('run')
      if (rulesChanged || rulesKey(rules) !== rulesKey(beginnerRules)) mission.complete('rules')
      if (errors.length === 0 && rulesAtLeast(rules)) mission.complete('fixall')
      if (!quiet) {
        setScanning(true)
        window.setTimeout(() => setScanning(false), 700)
        listRef.current?.scrollTo({ top: 0 })
      }
    },
    [rules, version, mission],
  )

  // real-time DRC
  useEffect(() => {
    if (!realtime) return
    const t = window.setTimeout(() => runCheck(true), 120)
    return () => window.clearTimeout(t)
  }, [realtime, doc, rules]) // eslint-disable-line react-hooks/exhaustive-deps

  const stale = !!results && (results.version !== version || rulesKey(results.rules) !== rulesKey(rules))
  const errors = results?.errors ?? []
  const selected = errors.find((e) => e.id === selErr) ?? null

  const pickError = (e: DrcItem) => {
    if (selErr === e.id) {
      setSelErr(null)
      flyTo(homeFit)
      return
    }
    setSelErr(e.id)
    setTool('select')
    setRoute(null)
    const f = e.focus
    flyTo(wide ? { x: f.x - f.w * 0.25, y: f.y, w: f.w * 1.25, h: f.h } : f)
    mission.complete('locate')
  }

  /* ---------- selection helpers ---------- */
  const selTrack = sel?.kind === 'track' ? doc.tracks.find((t) => t.id === sel.id) ?? null : null
  const selPart = sel?.kind === 'part' ? doc.parts.find((p) => p.ref === sel.ref) ?? null : null

  const deleteSelected = useCallback(() => {
    if (sel?.kind !== 'track') return
    commit((d) => ({ ...d, tracks: d.tracks.filter((t) => t.id !== sel.id) }))
    setSel(null)
  }, [sel, commit])

  const setWidth = (w: number) => {
    if (sel?.kind !== 'track') return
    commit((d) => ({ ...d, tracks: d.tracks.map((t) => (t.id === sel.id ? { ...t, width: w } : t)) }))
  }

  const selectCulprit = (e: DrcItem) => {
    const t = e.culprits.find((c) => c.startsWith('track:'))
    const p = e.culprits.find((c) => c.startsWith('part:'))
    const pad = e.culprits.find((c) => c.startsWith('pad:'))
    if (e.kind === 'overlap' && p) setSel({ kind: 'part', ref: e.culprits[e.culprits.length - 1].slice(5) })
    else if (t) setSel({ kind: 'track', id: t.slice(6) })
    else if (pad) setSel({ kind: 'part', ref: pad.slice(4).split('.')[0] })
  }

  const routeAirwire = (e: DrcItem) => {
    const r = conn.ratsnest.find((x) => e.culprits.includes(`pad:${x.a.key}`) && e.culprits.includes(`pad:${x.b.key}`)) ?? conn.ratsnest[0]
    if (!r) return
    commit((d) => autoRoute(d, r.net, r.a, r.b))
    setNote(<>Routed {r.a.key} → {r.b.key}. Run <b>Check DRC</b> again to confirm.</>)
  }

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!wrapRef.current?.isConnected) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel?.kind === 'track') {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape') {
        if (route) setRoute(null)
        else if (menu) setMenu(false)
        else if (rulesOpen) setRulesOpen(false)
        else setSel(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, route, menu, rulesOpen, deleteSelected, undo])

  /* ---------- part dragging ---------- */
  const drag = useRef<{ ref: string; start: Vec; orig: Vec; anchors: Anchor[]; base: BoardDoc; moved: boolean; id: number } | null>(null)
  const onPartDown = (ref: string, e: RPointerEvent<SVGGElement>) => {
    if (tool !== 'select' || e.button !== 0) return
    e.stopPropagation()
    const part = doc.parts.find((p) => p.ref === ref)!
    const world = canvasRef.current!.toWorld(e.clientX, e.clientY)
    drag.current = { ref, start: world, orig: [part.x, part.y], anchors: anchorsFor(doc, ref), base: doc, moved: false, id: e.pointerId }
    canvasRef.current?.svg?.setPointerCapture(e.pointerId)
    setSel({ kind: 'part', ref })
  }
  const onMove = (e: RPointerEvent<SVGSVGElement>, w: Vec) => {
    const d = drag.current
    if (d && d.id === e.pointerId) {
      const nx = snap(d.orig[0] + w[0] - d.start[0], 0.1)
      const ny = snap(d.orig[1] + w[1] - d.start[1], 0.1)
      if (!d.moved && Math.hypot(w[0] - d.start[0], w[1] - d.start[1]) < 0.15) return
      d.moved = true
      setDocRaw(movePart(d.base, d.ref, Math.round(nx * 10) / 10, Math.round(ny * 10) / 10, d.anchors))
      return
    }
    if (tool === 'route') setCursor([snap(w[0], 0.1), snap(w[1], 0.1)])
  }
  const onUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    if (d.moved) {
      setHistory((h) => [...h.slice(-40), d.base])
      setVersion((v) => v + 1)
    }
  }

  /* ---------- routing ---------- */
  const routeTarget = (): Vec | null => (hoverPad ? [hoverPad.x, hoverPad.y] : cursor)
  const preview = route && routeTarget() ? route45(route.pts[route.pts.length - 1], routeTarget()!) : null
  const finishRoute = (pts: Vec[], r: RouteState) => {
    const clean = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6)
    if (clean.length >= 2) commit((d) => ({ ...d, tracks: [...d.tracks, { id: newId('usr'), layer: 'top', width: r.width, net: r.net, pts: clean }] }))
    setRoute(null)
  }
  const onPadDown = (pad: WorldPad, e: RPointerEvent<SVGGElement>) => {
    if (tool !== 'route' || e.button !== 0) return
    e.stopPropagation()
    if (!route) {
      setRoute({ net: pad.net, width: pad.net === 'VCC' || pad.net === 'GND' ? 0.5 : 0.25, pts: [[pad.x, pad.y]] })
      setCursor([pad.x, pad.y])
      return
    }
    const last = route.pts[route.pts.length - 1]
    const seg = route45(last, [pad.x, pad.y])
    finishRoute([...route.pts, ...seg.slice(1)], route)
  }
  const onCanvasDown = (e: RPointerEvent<SVGSVGElement>, w: Vec) => {
    if (tool !== 'route' || e.button !== 0) return
    if (!route) {
      setNote(<>Start a track on a <b>pad</b>: click R3’s lower pad, then D1’s upper pad.</>)
      return
    }
    const target: Vec = [snap(w[0], 0.1), snap(w[1], 0.1)]
    const seg = route45(route.pts[route.pts.length - 1], target)
    setRoute({ ...route, pts: [...route.pts, ...seg.slice(1)] })
  }

  /* ---------- background click deselects ---------- */
  const downAt = useRef<{ x: number; y: number; bg: boolean } | null>(null)

  /* ---------- derived ---------- */
  const kindCounts = useMemo(() => {
    const m = new Map<DrcKind, number>()
    for (const e of errors) m.set(e.kind, (m.get(e.kind) ?? 0) + 1)
    return m
  }, [errors])
  const groups = KIND_ORDER.filter((k) => kindCounts.get(k)).map((k) => ({ kind: k, items: errors.filter((e) => e.kind === k) }))
  const clean = !!results && errors.length === 0 && !stale
  const looseRules = !rulesAtLeast(rules)

  const culprits = new Set(selected?.culprits ?? [])
  const culpritParts = [...culprits].filter((c) => c.startsWith('part:')).map((c) => c.slice(5))
  const selectedRefs = [...(selPart ? [selPart.ref] : []), ...culpritParts]

  const shownErrors = results ? errors : undefined

  /* ---------- render ---------- */
  const menuBar = (
    <div className="l14-menu" onPointerDown={(e) => e.stopPropagation()}>
      {['File', 'Edit', 'View', 'Place', 'Route'].map((m, i) => (
        <span key={m} className={`l14-menu__item is-dim ${i > 1 ? 'l14-wide-only' : ''}`}>
          {m}
        </span>
      ))}
      <div className="l14-menu__wrap">
        <button className={`l14-menu__item ${menu ? 'is-open' : ''} ${!results ? 'is-hint' : ''}`} onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
          Design
        </button>
        {menu && (
          <div className="l14-drop" role="menu">
            <button role="menuitem" onClick={() => (setMenu(false), setRulesOpen(true))}>
              Design Rules…
            </button>
            <button role="menuitem" className="is-strong" onClick={() => (setMenu(false), runCheck())}>
              Check DRC
            </button>
            <div className="l14-drop__sep" />
            <button
              role="menuitem"
              onClick={() => {
                setMenu(false)
                setNote(<>In EasyEDA Pro, <b>Design › DFM Check</b> opens JLCPCB’s manufacturability (DFM) tool for a second opinion. It isn’t simulated here.</>)
              }}
            >
              DFM Check
              <span className="l14-drop__ext">↗</span>
            </button>
          </div>
        )}
      </div>
      {['Tools', 'Export', 'Order'].map((m) => (
        <span key={m} className="l14-menu__item is-dim l14-wide-only">
          {m}
        </span>
      ))}
    </div>
  )

  const toolbar = (
    <div className="l14-tools" onPointerDown={(e) => e.stopPropagation()}>
      <button className={`l14-tool ${tool === 'select' ? 'is-on' : ''}`} onClick={() => (setTool('select'), setRoute(null))} aria-label="Select tool" title="Select / drag">
        <IconPointer size={16} />
        <span className="l14-tool__lbl">Select</span>
      </button>
      <button className={`l14-tool ${tool === 'route' ? 'is-on' : ''}`} onClick={() => (setTool('route'), setSel(null))} aria-label="Route tool" title="Route a track: click pad, then pad">
        <IconRoute size={16} />
        <span className="l14-tool__lbl">Route</span>
      </button>
      <span className="l14-tools__sep" />
      <button className="l14-tool" onClick={deleteSelected} disabled={sel?.kind !== 'track'} aria-label="Delete selected track" title="Delete (Del)">
        <IconTrash size={16} />
      </button>
      <button className="l14-tool" onClick={undo} disabled={!history.length} aria-label="Undo" title="Undo (Ctrl+Z)">
        <IconUndo size={16} />
      </button>
      <button className="l14-tool" onClick={() => (setSelErr(null), flyTo(homeFit))} aria-label="Fit board" title="Fit board">
        <IconTarget size={16} />
      </button>
      <button
        className="l14-tool"
        onClick={() => {
          commit(buggyBoard())
          setResults(null)
          resultsRef.current = null
          setSelErr(null)
          setSel(null)
          setRoute(null)
          flyTo(homeFit)
        }}
        aria-label="Reset the board with all its mistakes"
        title="Reset the buggy board"
      >
        <IconReset size={16} />
      </button>
      <span className="grow" />
      <button className="l14-tool" onClick={() => setRulesOpen(true)} title="Design › Design Rules">
        <span className="l14-tool__lbl l14-tool__lbl--always">Rules</span>
      </button>
      <button className="l14-tool l14-tool--go" onClick={() => runCheck()} title="Design › Check DRC">
        <IconSpark size={15} />
        <span className="l14-tool__lbl l14-tool__lbl--always">Check DRC</span>
      </button>
    </div>
  )

  const propsPanel = (
    <div className="l14-props">
      <div className="l14-props__head mono">Property</div>
      {selTrack ? (
        <TrackProps
          track={selTrack}
          net={conn.netOf.get(`track:${selTrack.id}`)}
          onWidth={setWidth}
          onDelete={deleteSelected}
        />
      ) : selPart ? (
        <div className="l14-props__body">
          <div className="l14-prop">
            <span>Designator</span>
            <b>{selPart.ref}</b>
          </div>
          <div className="l14-prop">
            <span>Value</span>
            <b>{selPart.value}</b>
          </div>
          <div className="l14-prop">
            <span>Footprint</span>
            <b>{getFootprint(selPart.fp).pkg}</b>
          </div>
          <div className="l14-prop">
            <span>X / Y</span>
            <b className="mono">
              {selPart.x.toFixed(1)}, {selPart.y.toFixed(1)}
            </b>
          </div>
          <p className="l14-props__hint">Drag the part on the canvas. Tracks ending on its pads stretch to follow it.</p>
        </div>
      ) : (
        <div className="l14-props__body">
          <p className="l14-props__hint">
            {tool === 'route' ? (
              <>
                <b>Route tool.</b> Click a pad to start, click empty space to add a corner, click the target pad to finish. <kbd className="kbd">Esc</kbd> cancels.
              </>
            ) : (
              <>Click a <b>track</b> to change its width or delete it. Drag a <b>part</b> to move it.</>
            )}
          </p>
          <Toggle label="Copper pours" checked={showPours} onChange={setShowPours} />
        </div>
      )}
    </div>
  )

  return (
    <div className="l14-scene" ref={wrapRef}>
      <div className="l14-win">
        <div className="l14-title">
          <span className="l14-title__dots">
            <i />
            <i />
            <i />
          </span>
          <span className="mono l14-title__app">EasyEDA Pro</span>
          <span className="l14-title__doc">Blinky — PCB</span>
          <span className="grow" />
          <span className="mono l14-title__sim">simulated</span>
        </div>
        {menuBar}
        {toolbar}

        <div className="l14-main">
          <div
            className={`l14-canvas ${scanning ? 'is-scanning' : ''}`}
            onPointerDownCapture={(e) => {
              const t = e.target as Element
              downAt.current = { x: e.clientX, y: e.clientY, bg: t.getAttribute?.('data-bg') === '1' || t.tagName === 'svg' }
              setMenu(false)
            }}
            onPointerUpCapture={(e) => {
              const d = downAt.current
              if (d && d.bg && tool === 'select' && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) setSel(null)
              downAt.current = null
            }}
          >
            <PcbCanvas
              ref={canvasRef}
              fit={fit}
              pad={selErr ? 0.5 : 1.5}
              theme="eda"
              grid={1}
              cursor={tool === 'route' ? 'crosshair' : undefined}
              onPointerDown={tool === 'route' ? onCanvasDown : undefined}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onContextMenu={() => route && setRoute(null)}
              ariaLabel="Blinky PCB in the EDA editor"
            >
              <BoardView
                doc={doc}
                conn={conn}
                mode="eda"
                vis={{ pours: showPours }}
                selectedRefs={selectedRefs}
                drcErrors={shownErrors}
                onPartPointerDown={tool === 'select' ? onPartDown : undefined}
                onPadPointerDown={tool === 'route' ? onPadDown : undefined}
                onPadEnter={tool === 'route' ? setHoverPad : undefined}
              />
              {/* culprit highlight */}
              {selected && <Culprits doc={doc} pads={conn.pads} ids={culprits} at={selected.at} stale={stale} />}
              {/* selected track */}
              {selTrack && (
                <polyline
                  points={ptsStr(selTrack.pts)}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={selTrack.width + 0.22}
                  strokeOpacity={0.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="0.35 0.2"
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* track hit areas */}
              {tool === 'select' &&
                doc.tracks.map((t) => (
                  <polyline
                    key={t.id}
                    points={ptsStr(t.pts)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max(0.7, t.width + 0.3)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      e.stopPropagation()
                      setSel({ kind: 'track', id: t.id })
                    }}
                  />
                ))}
              {/* route preview */}
              {route && (
                <g style={{ pointerEvents: 'none' }}>
                  <polyline points={ptsStr(route.pts)} fill="none" stroke={EDA.top} strokeWidth={route.width} strokeLinecap="round" strokeLinejoin="round" />
                  {preview && (
                    <polyline points={ptsStr(preview)} fill="none" stroke={EDA.top} strokeOpacity={0.6} strokeWidth={route.width} strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </g>
              )}
              {tool === 'route' && hoverPad && (
                <g transform={`translate(${hoverPad.x} ${hoverPad.y}) rotate(${hoverPad.rot})`} style={{ pointerEvents: 'none' }}>
                  <PadGlyph pad={hoverPad} fill="none" hole={null} inflate={0.18} stroke="#fff" strokeWidth={0.1} />
                </g>
              )}
            </PcbCanvas>

            {wide && (
              <FloatingCard title="Bug hunt" subtitle="Six kinds of mistake are hiding on this board." width={196}>
                <BugList results={results} stale={stale} counts={kindCounts} />
              </FloatingCard>
            )}

            {/* phone: selection strip */}
            {!wide && (selTrack || selPart) && (
              <div className="l14-strip" onPointerDown={(e) => e.stopPropagation()}>
                {selTrack ? (
                  <>
                    <span className="mono l14-strip__lbl">Track · {conn.netOf.get(`track:${selTrack.id}`) ?? '—'}</span>
                    <WidthPicker value={selTrack.width} onChange={setWidth} />
                    <button className="l14-tool" onClick={deleteSelected} aria-label="Delete track">
                      <IconTrash size={16} />
                    </button>
                  </>
                ) : (
                  <span className="mono l14-strip__lbl">
                    {selPart!.ref} · {selPart!.value} · drag to move
                  </span>
                )}
              </div>
            )}

            {tool === 'route' && (
              <div className="l14-hint mono" onPointerDown={(e) => e.stopPropagation()}>
                {route ? 'Click the target pad to finish · Esc / right-click cancels' : 'Route: click a pad to start a track'}
                {route && (
                  <button className="l14-hint__x" onClick={() => setRoute(null)} aria-label="Cancel route">
                    <IconX size={13} />
                  </button>
                )}
              </div>
            )}

            {note && (
              <div className="l14-note" onPointerDown={(e) => e.stopPropagation()}>
                <span>{note}</span>
                <button onClick={() => setNote(null)} aria-label="Dismiss">
                  <IconX size={13} />
                </button>
              </div>
            )}

            {rulesOpen && (
              <RulesDialog
                rules={rules}
                onChange={setRules}
                onClose={() => setRulesOpen(false)}
                onCheck={() => {
                  setRulesOpen(false)
                  runCheck()
                }}
              />
            )}
          </div>
          {wide && propsPanel}
        </div>

        {/* bottom panel: DRC */}
        <div className="l14-bottom" onPointerDown={(e) => e.stopPropagation()}>
          <div className="l14-bottom__head">
            <span className="l14-tab is-dim">Library</span>
            <span className="l14-tab is-on">
              DRC
              {results && <span className={`l14-badge ${errors.length ? 'is-bad' : 'is-good'}`}>{errors.length}</span>}
            </span>
            <span className="grow" />
            <label className="l14-rt" title="Real-time DRC checks as you edit">
              <input type="checkbox" checked={realtime} onChange={(e) => setRealtime(e.target.checked)} />
              <span className="l14-rt__box" />
              <span className="mono">Real-time</span>
            </label>
          </div>
          <div className="l14-list" ref={listRef}>
            {!results && (
              <div className="l14-empty">
                <div className="l14-empty__big">No check run yet</div>
                <div>
                  Choose <span className="l14-kbdmenu">Design › Check DRC</span> (or the button above) and EasyEDA lists every rule broken on the board here.
                </div>
                <Button size="sm" variant="accent" onClick={() => runCheck()}>
                  <IconSpark size={14} /> Check DRC
                </Button>
              </div>
            )}
            {results && (
              <div className={`l14-summary ${clean ? 'is-clean' : ''}`}>
                {clean ? (
                  <>
                    <span className="l14-summary__ok">
                      <IconCheck size={14} />
                    </span>
                    <b>0 errors.</b>
                    <span>
                      {looseRules ? 'But your rules are looser than the beginner defaults. Loosening rules hides problems instead of fixing them.' : 'The board passes every rule. Ready for the next step: Gerbers.'}
                    </span>
                  </>
                ) : (
                  <>
                    <b>{errors.length} error{errors.length === 1 ? '' : 's'}</b>
                    <span className="muted">
                      · rules {rules.minTrack}/{rules.clearance}/{rules.edgeClearance} mm
                      {results.delta !== null && results.delta !== 0 && (
                        <>
                          {' '}
                          · <span className={results.delta > 0 ? 'l14-up' : 'l14-down'}>{results.delta > 0 ? `+${results.delta}` : results.delta}</span> since last check
                        </>
                      )}
                    </span>
                  </>
                )}
                {stale && (
                  <button className="l14-stale" onClick={() => runCheck()}>
                    {results.version !== version ? "Board changed" : "Rules changed"} · re-check
                  </button>
                )}
              </div>
            )}
            {groups.map((g) => (
              <div key={g.kind} className="l14-group">
                <div className="l14-group__head">
                  <KindIcon kind={g.kind} />
                  <span>{KINDS[g.kind].label}</span>
                  <span className="l14-count mono">{g.items.length}</span>
                </div>
                {g.items.map((e) => {
                  const on = e.id === selErr
                  return (
                    <div key={e.id} className={`l14-err ${on ? 'is-on' : ''} ${stale ? 'is-stale' : ''}`}>
                      <button className="l14-err__row" onClick={() => pickError(e)} aria-expanded={on}>
                        <span className="l14-err__dot" style={{ background: KINDS[e.kind].color }} />
                        <span className="l14-err__msg">{e.message}</span>
                        <IconChevronDown size={14} className="l14-err__chev" />
                      </button>
                      {on && (
                        <div className="l14-err__more">
                          <p>
                            <b>Why it matters.</b> {KINDS[e.kind].why}
                          </p>
                          <p>
                            <b>Fix.</b> {KINDS[e.kind].fix}
                          </p>
                          <div className="l14-err__actions">
                            {e.kind === 'unrouted' ? (
                              <>
                                <Button size="sm" variant="accent" onClick={() => routeAirwire(e)}>
                                  <IconRoute size={14} /> Route this airwire
                                </Button>
                                <Button size="sm" onClick={() => (setTool('route'), setSel(null))}>
                                  Use the Route tool
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" onClick={() => selectCulprit(e)}>
                                <IconPointer size={14} /> Select the culprit
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function Culprits({ doc, pads, ids, at, stale }: { doc: BoardDoc; pads: WorldPad[]; ids: Set<string>; at: Vec; stale: boolean }) {
  return (
    <g className="l14-culprit" style={{ pointerEvents: 'none' }} opacity={stale ? 0.45 : 1}>
      {doc.tracks
        .filter((t) => ids.has(`track:${t.id}`))
        .map((t) => (
          <polyline
            key={t.id}
            points={ptsStr(t.pts)}
            fill="none"
            stroke={EDA.drc}
            strokeWidth={t.width + 0.35}
            strokeOpacity={0.55}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      {pads
        .filter((p) => ids.has(`pad:${p.key}`))
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill="none" hole={null} inflate={0.16} stroke={EDA.drc} strokeWidth={0.14} />
          </g>
        ))}
      {doc.parts
        .filter((p) => ids.has(`part:${p.ref}`))
        .map((p) => {
          const r = courtyardRect(p)
          return <rect key={p.ref} x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} fill={EDA.drc} fillOpacity={0.12} stroke={EDA.drc} strokeWidth={0.1} />
        })}
      <circle className="l14-ping" cx={at[0]} cy={at[1]} r={1.4} fill="none" stroke={EDA.drc} strokeWidth={0.12} />
    </g>
  )
}

function WidthPicker({ value, onChange }: { value: number; onChange: (w: number) => void }) {
  const opts = [0.1, 0.2, 0.25, 0.3, 0.5]
  return (
    <Segmented
      options={opts.map((w) => ({ value: w, label: w.toFixed(2).replace(/0$/, '') }))}
      value={opts.includes(value) ? value : -1}
      onChange={onChange}
    />
  )
}

function TrackProps({ track, net, onWidth, onDelete }: { track: BoardDoc['tracks'][number]; net?: string; onWidth: (w: number) => void; onDelete: () => void }) {
  return (
    <div className="l14-props__body">
      <div className="l14-prop">
        <span>Type</span>
        <b>Track</b>
      </div>
      <div className="l14-prop">
        <span>Net</span>
        <b>
          {net ? (
            <>
              <i className="l14-netdot" style={{ background: netInfo[net]?.color }} /> {net}
            </>
          ) : (
            <span style={{ color: 'var(--bad)' }}>shorted / none</span>
          )}
        </b>
      </div>
      <div className="l14-prop">
        <span>Layer</span>
        <b>{track.layer === 'top' ? 'Top Layer' : 'Bottom Layer'}</b>
      </div>
      <div className="l14-prop">
        <span>Length</span>
        <b className="mono">{trackLength(track).toFixed(2)} mm</b>
      </div>
      <div className="l14-prop l14-prop--col">
        <span>
          Width <b className="mono">{track.width.toFixed(2)} mm</b>
        </span>
        <WidthPicker value={track.width} onChange={onWidth} />
      </div>
      <Button size="sm" onClick={onDelete}>
        <IconTrash size={14} /> Delete track
      </Button>
    </div>
  )
}

function BugList({ results, stale, counts }: { results: Results | null; stale: boolean; counts: Map<DrcKind, number> }) {
  const fixed = results ? BUG_KINDS.filter((k) => !counts.get(k)).length : 0
  return (
    <div className="l14-bugs">
      {BUG_KINDS.map((k) => {
        const n = counts.get(k) ?? 0
        const state = !results ? 'unknown' : n ? 'bad' : 'good'
        return (
          <div key={k} className={`l14-bug is-${state}`}>
            <KindIcon kind={k} size={14} />
            <span className="l14-bug__name">{KINDS[k].label}</span>
            <span className="l14-bug__state mono">{state === 'unknown' ? '?' : state === 'bad' ? n : <IconCheck size={12} />}</span>
          </div>
        )
      })}
      <div className="l14-bugs__foot mono">
        {!results ? 'Run DRC to reveal them' : `${fixed}/6 fixed${stale ? ' · re-check' : ''}`}
      </div>
    </div>
  )
}

function RulesDialog({ rules, onChange, onClose, onCheck }: { rules: Rules; onChange: (r: Rules) => void; onClose: () => void; onCheck: () => void }) {
  const preset = PRESETS.find((p) => rulesKey(p.rules) === rulesKey(rules))?.id ?? 'custom'
  return (
    <div className="l14-dialog-wrap" onPointerDown={(e) => e.stopPropagation()}>
      <div className="l14-dialog" role="dialog" aria-label="Design rules">
        <div className="l14-dialog__head">
          <span className="mono">Design Rules</span>
          <span className="l14-dialog__rule mono">Default</span>
          <span className="grow" />
          <button onClick={onClose} aria-label="Close">
            <IconX size={15} />
          </button>
        </div>
        <div className="l14-dialog__body">
          <div className="l14-presets">
            {PRESETS.map((p) => (
              <button key={p.id} className={preset === p.id ? 'is-on' : ''} onClick={() => onChange(p.rules)}>
                {p.label}
              </button>
            ))}
          </div>
          {RULE_FIELDS.map((f) => {
            const v = rules[f.key]
            const set = (nv: number) => onChange({ ...rules, [f.key]: Math.round(Math.max(f.min, Math.min(f.max, nv)) * 100) / 100 })
            const loose = v < beginnerRules[f.key] - 1e-6
            return (
              <div key={f.key} className="l14-rule">
                <div className="l14-rule__txt">
                  <div className="l14-rule__label">{f.label}</div>
                  <div className="l14-rule__about">
                    {f.about} <span className="mono">{f.fab}</span>
                  </div>
                </div>
                <div className={`l14-step ${loose ? 'is-loose' : ''}`}>
                  <button onClick={() => set(v - 0.05)} aria-label={`Decrease ${f.label}`}>
                    −
                  </button>
                  <span className="mono">{v.toFixed(2)}</span>
                  <button onClick={() => set(v + 0.05)} aria-label={`Increase ${f.label}`}>
                    +
                  </button>
                </div>
              </div>
            )
          })}
          <p className="l14-dialog__note">
            Beginner defaults: 0.2 mm min track (draw signals at 0.25 mm), 0.2 mm clearance, 0.3 mm to the edge. Fab limits change, so check your manufacturer’s capabilities page.
          </p>
        </div>
        <div className="l14-dialog__foot">
          <Chip tone={preset === 'fab' ? 'warn' : undefined}>{preset === 'custom' ? 'custom' : preset}</Chip>
          <span className="grow" />
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" variant="accent" onClick={onCheck}>
            Apply &amp; Check DRC
          </Button>
        </div>
      </div>
    </div>
  )
}
