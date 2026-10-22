/* Lesson 11 scene: a mini EasyEDA PCB editor where RESET can only be routed by hopping layers through a via. */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMission } from '../mission'
import { FloatingCard, Button, Toggle, Tabs, Slider, Kbd, Segmented } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconPointer, IconRoute, IconVia, IconFlip, IconUndo, IconLayers, IconEye, IconEyeOff, IconCheck, IconX, IconTrash } from '@/components/icons'
import { PcbCanvas, type PcbCanvasHandle } from '@/pcb/PcbCanvas'
import { BoardView, DrcMarkers } from '@/pcb/render'
import { analyze, drc, newId, padShape, type BoardDoc, type Layer, type Track, type Via, type WorldPad } from '@/pcb/board'
import { stages } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { dist, pointSegDist, route45, shapeDist, type Vec } from '@/pcb/geom'
import { ViaSection, ViaPlan } from './ViaSection'

const Via3D = lazy(() => import('./Via3D'))

export const VIA_SIZES = [
  { d: 0.6, drill: 0.3, name: 'Beginner default', note: 'Comfortably makeable, no extra cost.' },
  { d: 0.8, drill: 0.4, name: 'Roomy', note: 'Sturdier, but takes more space.' },
  { d: 0.4, drill: 0.2, name: 'Tiny', note: 'A 0.2 mm hole with a ring under 0.45 mm costs extra at JLCPCB.' },
]

const PIN_NAMES: Record<string, string> = {
  'U1.1': 'GND',
  'U1.2': 'TRIG',
  'U1.3': 'OUT',
  'U1.4': 'RESET',
  'U1.5': 'CONT',
  'U1.6': 'THRES',
  'U1.7': 'DISCH',
  'U1.8': 'VCC',
  'J1.1': '+5V in',
  'J1.2': 'GND in',
  'D1.1': 'cathode',
  'D1.2': 'anode',
}

const TRACK_W = 0.25
const RESET_PIN: Vec = [15.3, 14.905]

type Tool = 'select' | 'route' | 'via'
interface Route {
  layer: Layer
  pts: Vec[]
}
interface Snapshot {
  tracks: Track[]
  vias: Via[]
}
interface Ed extends Snapshot {
  route: Route | null
  past: Snapshot[]
}
interface Snap {
  p: Vec
  kind: 'pad' | 'via' | 'track' | 'grid'
  label?: string
}

function baseDoc(): BoardDoc {
  const d = stages.routed()
  d.tracks = d.tracks.filter((t) => !t.id.startsWith('rst'))
  d.vias = []
  return d
}

const same = (a: Vec, b: Vec) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6
const r2 = (v: number) => Math.round(v * 100) / 100

function extend(pts: Vec[], to: Vec, diagFirst: boolean): Vec[] {
  const last = pts[pts.length - 1]
  if (same(last, to)) return pts
  return [...pts, ...route45(last, to, diagFirst).slice(1)]
}

function cleanPts(pts: Vec[]): Vec[] {
  const out: Vec[] = []
  for (const p of pts) if (!out.length || !same(out[out.length - 1], p)) out.push(p)
  return out
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [s, setS] = useState({ w: 900, h: 600 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setS({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return s
}

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const v = useRef(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => (v.current = e.intersectionRatio > 0.25), { threshold: [0, 0.25, 0.5] })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return v
}

export function Scene() {
  const mission = useMission()
  const rootRef = useRef<HTMLDivElement>(null)
  const size = useSize(rootRef)
  const narrow = size.w < 640
  const inView = useInView(rootRef)
  const canvas = useRef<PcbCanvasHandle>(null)

  const base = useMemo(baseDoc, [])
  const [ed, setEd] = useState<Ed>({ tracks: [], vias: [], route: null, past: [] })
  const [tool, setTool] = useState<Tool>('route')
  const [layer, setLayer] = useState<Layer>('top')
  const [vis, setVis] = useState({ top: true, bottom: true })
  const [viaIdx, setViaIdx] = useState(0)
  const [autoVia, setAutoVia] = useState(true)
  const [flipped, setFlipped] = useState(false)
  const [view, setView] = useState<'editor' | 'photo'>('editor')
  const [diagFirst, setDiagFirst] = useState(false)
  const [cursor, setCursor] = useState<Snap | null>(null)
  const [hoverPad, setHoverPad] = useState<WorldPad | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [inspector, setInspector] = useState(false)
  const [insTab, setInsTab] = useState<'side' | '3d'>('side')
  const [explode, setExplode] = useState(0)
  const [flow, setFlow] = useState(true)
  const lastClick = useRef({ t: 0, p: [0, 0] as Vec })
  const lastPtr = useRef('mouse')

  const via = VIA_SIZES[viaIdx]

  const doc = useMemo<BoardDoc>(() => ({ ...base, tracks: [...base.tracks, ...ed.tracks], vias: [...ed.vias] }), [base, ed.tracks, ed.vias])
  const conn = useMemo(() => analyze(doc), [doc])
  const errors = useMemo(() => drc(doc, undefined, conn).filter((e) => e.kind !== 'unrouted'), [doc, conn])
  const vccDone = conn.complete.has('VCC')
  const usedVia = ed.vias.length > 0 && ed.tracks.some((t) => t.layer === 'bottom')
  const solved = vccDone && errors.length === 0 && usedVia
  const sneaky = vccDone && errors.length === 0 && !usedVia

  // preview route + live DRC on it
  const previewPts = useMemo(() => {
    if (!ed.route) return null
    const pts = cursor ? extend(ed.route.pts, cursor.p, diagFirst) : ed.route.pts
    return cleanPts(pts)
  }, [ed.route, cursor, diagFirst])
  const previewErrors = useMemo(() => {
    if (!ed.route || !previewPts || previewPts.length < 2) return []
    const pd: BoardDoc = { ...doc, tracks: [...doc.tracks, { id: '__preview', layer: ed.route.layer, width: TRACK_W, pts: previewPts }] }
    const c = analyze(pd)
    return drc(pd, undefined, c).filter((e) => e.kind !== 'unrouted' && e.items.some((i) => i === 'track:__preview' || c.root(i) === c.root('track:__preview')) && !errors.some((x) => x.message === e.message))
  }, [doc, ed.route, previewPts, errors])

  /* ---------------- missions ---------------- */
  useEffect(() => {
    if (layer === 'bottom') mission.complete('bottom')
  }, [layer, mission])
  useEffect(() => {
    if (solved) mission.complete('route')
  }, [solved, mission])
  useEffect(() => {
    if (flipped) mission.complete('flip')
  }, [flipped, mission])
  useEffect(() => {
    if (inspector && explode >= 0.85) mission.complete('explode')
  }, [inspector, explode, mission])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 2600)
    return () => clearTimeout(t)
  }, [flash])

  /* ---------------- editing ops ---------------- */
  const snapshot = (s: Ed): Snapshot => ({ tracks: s.tracks, vias: s.vias })

  const commitRoute = useCallback((s: Ed, extra?: Vec): Ed => {
    if (!s.route) return s
    const pts = cleanPts(extra ? extend(s.route.pts, extra, diagFirst) : s.route.pts)
    if (pts.length < 2) return { ...s, route: null }
    const t: Track = { id: newId('t'), layer: s.route.layer, width: TRACK_W, pts }
    return { ...s, past: [...s.past, snapshot(s)], tracks: [...s.tracks, t], route: null }
  }, [diagFirst])

  const hasViaAt = (s: Ed, p: Vec) => s.vias.some((v) => dist([v.x, v.y], p) < 0.05)

  const dropVia = useCallback(
    (to: Layer) => {
      setEd((s) => {
        if (!s.route) return s
        const pos = cursor && lastPtr.current !== 'touch' ? cursor.p : s.route.pts[s.route.pts.length - 1]
        const pts = cleanPts(extend(s.route.pts, pos, diagFirst))
        const past = [...s.past, snapshot(s)]
        const tracks = pts.length >= 2 ? [...s.tracks, { id: newId('t'), layer: s.route.layer, width: TRACK_W, pts }] : s.tracks
        const vias = hasViaAt(s, pos) ? s.vias : [...s.vias, { id: newId('v'), x: r2(pos[0]), y: r2(pos[1]), d: via.d, drill: via.drill }]
        return { ...s, past, tracks, vias, route: { layer: to, pts: [pos] } }
      })
      setLayer(to)
    },
    [cursor, diagFirst, via],
  )

  const switchLayer = useCallback(
    (to: Layer) => {
      if (ed.route && ed.route.layer !== to) {
        if (autoVia) {
          dropVia(to)
          setFlash(`Via added: now routing on the ${to} layer`)
          return
        }
        setEd((s) => commitRoute(s))
      }
      setLayer(to)
    },
    [ed.route, autoVia, dropVia, commitRoute],
  )

  const undo = useCallback(() => {
    setEd((s) => {
      if (s.route) {
        if (s.route.pts.length > 1) return { ...s, route: { ...s.route, pts: s.route.pts.slice(0, -1) } }
        return { ...s, route: null }
      }
      const prev = s.past[s.past.length - 1]
      if (!prev) return s
      return { ...s, ...prev, past: s.past.slice(0, -1) }
    })
    setSelected(null)
  }, [])

  const deleteSelected = useCallback(() => {
    if (!selected) return
    setEd((s) => ({
      ...s,
      past: [...s.past, snapshot(s)],
      tracks: s.tracks.filter((t) => t.id !== selected),
      vias: s.vias.filter((v) => v.id !== selected),
    }))
    setSelected(null)
  }, [selected])

  const finish = useCallback(() => setEd((s) => commitRoute(s)), [commitRoute])

  const reset = () => {
    setEd({ tracks: [], vias: [], route: null, past: [] })
    setLayer('top')
    setSelected(null)
  }

  /* ---------------- snapping & hit testing ---------------- */
  const tolerance = () => {
    const c = canvas.current
    if (!c) return 0.6
    const a = c.toWorld(0, 0)
    const b = c.toWorld(14, 0)
    return Math.max(0.25, Math.min(1.2, Math.abs(b[0] - a[0])))
  }

  const snapAt = useCallback(
    (w: Vec, l: Layer): Snap => {
      const tol = tolerance()
      const pt = { pts: [w], r: 0 }
      let best: Snap | null = null
      let bd = Infinity
      for (const p of conn.pads) {
        if (!p.layers.includes(l)) continue
        const d = shapeDist(pt, padShape(p))
        if (d <= tol * 0.5 && d < bd) {
          bd = d
          best = { p: [p.x, p.y], kind: 'pad', label: `${p.ref} pin ${p.num}` }
        }
      }
      if (best) return best
      for (const v of doc.vias) {
        const d = dist(w, [v.x, v.y]) - v.d / 2
        if (d <= tol * 0.6 && d < bd) {
          bd = d
          best = { p: [v.x, v.y], kind: 'via', label: 'via' }
        }
      }
      if (best) return best
      for (const t of doc.tracks) {
        if (t.layer !== l) continue
        for (const q of t.pts) {
          const d = dist(w, q)
          if (d <= tol * 0.7 && d < bd) {
            bd = d
            best = { p: q, kind: 'track', label: 'track corner' }
          }
        }
      }
      if (best) return best
      for (const t of doc.tracks) {
        if (t.layer !== l) continue
        for (let i = 0; i < t.pts.length - 1; i++) {
          const a = t.pts[i]
          const b = t.pts[i + 1]
          const d = pointSegDist(w, a, b) - t.width / 2
          if (d <= tol * 0.35 && d < bd) {
            bd = d
            // project onto the segment, keep it on a 0.05 mm grid along the axis
            const ab: Vec = [b[0] - a[0], b[1] - a[1]]
            const L2 = ab[0] * ab[0] + ab[1] * ab[1]
            let k = ((w[0] - a[0]) * ab[0] + (w[1] - a[1]) * ab[1]) / (L2 || 1)
            k = Math.max(0, Math.min(1, k))
            best = { p: [r2(a[0] + ab[0] * k), r2(a[1] + ab[1] * k)], kind: 'track', label: `${conn.netOf.get(`track:${t.id}`) ?? ''} track` }
          }
        }
      }
      if (best) return best
      const g = 0.1
      return { p: [Math.round(w[0] / g) * g, Math.round(w[1] / g) * g].map(r2) as Vec, kind: 'grid' }
    },
    [conn, doc],
  )

  const hitItem = useCallback(
    (w: Vec): string | null => {
      const tol = tolerance() * 0.5
      for (const v of ed.vias) if (dist(w, [v.x, v.y]) <= v.d / 2 + tol) return v.id
      for (const t of ed.tracks) {
        if (!vis[t.layer]) continue
        for (let i = 0; i < t.pts.length - 1; i++) if (pointSegDist(w, t.pts[i], t.pts[i + 1]) <= t.width / 2 + tol) return t.id
      }
      return null
    },
    [ed.tracks, ed.vias, vis],
  )

  const toDoc = (w: Vec): Vec => (flipped ? [base.w - w[0], w[1]] : w)

  /* ---------------- pointer ---------------- */
  const onDown = (e: React.PointerEvent<SVGSVGElement>, raw: Vec) => {
    if (view !== 'editor') return
    lastPtr.current = e.pointerType
    if (e.button !== 0) {
      if (ed.route) finish()
      return
    }
    const w = toDoc(raw)
    const snap = snapAt(w, layer)
    setCursor(snap)
    if (tool === 'select') {
      const id = hitItem(w)
      setSelected(id)
      if (!id) {
        const onBase = base.tracks.some((t) => t.layer === layer && t.pts.some((_, i) => i < t.pts.length - 1 && pointSegDist(w, t.pts[i], t.pts[i + 1]) <= t.width / 2 + 0.1))
        if (onBase) setFlash('The pre-routed tracks are locked in this lesson. Only your own tracks and vias can be deleted.')
      }
      return
    }
    if (tool === 'via') {
      setEd((s) => (hasViaAt(s, snap.p) ? s : { ...s, past: [...s.past, snapshot(s)], vias: [...s.vias, { id: newId('v'), x: r2(snap.p[0]), y: r2(snap.p[1]), d: via.d, drill: via.drill }] }))
      setFlash(`Via placed (${via.d}/${via.drill} mm). Route to it on either layer.`)
      return
    }
    // route tool
    const now = performance.now()
    const dbl = now - lastClick.current.t < 320 && dist(lastClick.current.p, snap.p) < 0.3
    lastClick.current = { t: now, p: snap.p }
    if (!ed.route) {
      setEd((s) => ({ ...s, route: { layer, pts: [snap.p] } }))
      return
    }
    if (dbl) {
      finish()
      return
    }
    const start = ed.route.pts[0]
    const endsOnCopper = snap.kind !== 'grid' && !same(snap.p, start)
    setEd((s) => {
      if (!s.route) return s
      const next = { ...s, route: { ...s.route, pts: cleanPts(extend(s.route.pts, snap.p, diagFirst)) } }
      return endsOnCopper ? commitRoute(next) : next
    })
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>, raw: Vec) => {
    if (view !== 'editor' || e.pointerType === 'touch') return
    setCursor(snapAt(toDoc(raw), layer))
  }

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inView.current) return
      const tgt = e.target as HTMLElement
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT' || tgt.isContentEditable)) return
      const k = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (e.ctrlKey || e.metaKey) return
      if (view !== 'editor' && k !== 'f') return
      if (k === 'escape') {
        if (ed.route) finish()
        else setTool('select')
      } else if (k === 'w') setTool('route')
      else if (k === 'v' && e.shiftKey) {
        setViaIdx((i) => (i + 1) % VIA_SIZES.length)
      } else if (k === 'v') {
        if (ed.route) {
          dropVia(ed.route.layer === 'top' ? 'bottom' : 'top')
        } else setTool('via')
      } else if (k === 't') switchLayer('top')
      else if (k === 'b') switchLayer('bottom')
      else if (k === 'f') setFlipped((f) => !f)
      else if (k === 'l') setDiagFirst((d) => !d)
      else if (k === 'delete' || k === 'backspace') {
        if (ed.route) undo()
        else deleteSelected()
      } else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ed.route, view, undo, finish, dropVia, switchLayer, deleteSelected, inView])

  /* ---------------- coaching ---------------- */
  const shortErr = errors.find((e) => e.kind === 'short')
  const previewShort = previewErrors.find((e) => e.kind === 'short' || e.kind === 'clearance')
  let coach: { tone: 'info' | 'bad' | 'warn' | 'good'; text: ReactNode }
  if (solved)
    coach = {
      tone: 'good',
      text: flipped ? (
        <>RESET is connected through the bottom layer. Open the <b>cross-section</b> to look inside a via.</>
      ) : (
        <>RESET is connected through the bottom layer with no errors. Press <Kbd>F</Kbd> to flip the board and look from underneath.</>
      ),
    }
  else if (shortErr) coach = { tone: 'bad', text: <>Short circuit: {shortErr.message.replace('Short circuit: ', '')}. Tracks on the same layer can't cross. Undo with <Kbd>Ctrl+Z</Kbd> and use the other layer.</> }
  else if (errors.length) coach = { tone: 'warn', text: <>{errors[0].message}. Undo (<Kbd>Ctrl+Z</Kbd>) and leave a little more room.</> }
  else if (sneaky)
    coach = { tone: 'warn', text: <>Sneaky! You threaded a path on one layer. It's legal, but long and cramped. Undo and try the two-layer way with a via.</> }
  else if (ed.route && previewShort && ed.route.layer === 'top')
    coach = { tone: 'bad', text: <>That would hit another net. Press <Kbd>V</Kbd> (or tap <b>Via</b>) to drop a via here and continue on the bottom layer.</> }
  else if (ed.route && previewShort) coach = { tone: 'bad', text: <>Too close to other copper. Pick a clearer path.</> }
  else if (ed.route && ed.route.layer === 'top')
    coach = { tone: 'info', text: <>Click to add corners. Every way out of here crosses other tracks, so press <Kbd>V</Kbd> for a via and dive to the bottom layer.</> }
  else if (ed.route)
    coach = {
      tone: 'info',
      text: <>Bottom layer: the way is clear. Finish on VCC copper that reaches the bottom: J1 pin 1 (a through-hole pad), or drop a second via onto the VCC track along the top edge.</>,
    }
  else if (tool !== 'route') coach = { tone: 'info', text: <>Pick <b>Route</b> (<Kbd>W</Kbd>), then click the pulsing pad: U1 pin 4, RESET.</> }
  else coach = { tone: 'info', text: <>Click the pulsing pad (U1 pin 4, RESET) to start a track. Its airwire to VCC crosses the chip.</> }
  if (flash) coach = { tone: 'info', text: flash }

  /* ---------------- render ---------------- */
  const fit = narrow ? { x: 0, y: -1.5, w: base.w, h: base.h + 3 } : { x: -12, y: -2.6, w: base.w + 12, h: base.h + 5.6 }
  const flipStyle: React.CSSProperties = {
    transform: flipped ? 'scale(-1, 1)' : 'scale(1, 1)',
    transformOrigin: `${base.w / 2}px ${base.h / 2}px`,
    transition: 'transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1)',
  }
  const layerColor = (l: Layer) => (l === 'top' ? EDA.top : EDA.bottom)
  const routeColor = ed.route ? layerColor(ed.route.layer) : layerColor(layer)
  const resetPending = !vccDone && !ed.route
  const selTrack = ed.tracks.find((t) => t.id === selected)
  const selVia = ed.vias.find((v) => v.id === selected)

  const toolbar = (
    <SceneToolbar>
      {ed.route ? (
        <Button size="sm" variant="ghost" onClick={finish} aria-label="Finish track">
          <IconCheck size={15} /> {!narrow && 'Finish'}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" active={tool === 'select'} onClick={() => setTool('select')} aria-label="Select tool">
          <IconPointer size={15} /> {!narrow && 'Select'}
        </Button>
      )}
      <Button size="sm" variant="ghost" active={tool === 'route' && !ed.route} onClick={() => setTool('route')} aria-label="Route tool (W)">
        <IconRoute size={15} /> {!narrow && 'Route'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={ed.route ? 'l11-hot' : ''}
        active={tool === 'via' && !ed.route}
        onClick={() => (ed.route ? dropVia(ed.route.layer === 'top' ? 'bottom' : 'top') : setTool('via'))}
        aria-label={ed.route ? 'Drop a via here and switch layer (V)' : 'Via tool (V)'}
      >
        <IconVia size={15} /> Via
      </Button>
      <span className="scene-toolbar__sep" />
      <button className={`l11-layerbtn ${layer === 'top' ? 'is-on' : ''}`} onClick={() => switchLayer('top')} aria-label="Top layer (T)" style={{ ['--c' as string]: EDA.top }}>
        T
      </button>
      <button className={`l11-layerbtn ${layer === 'bottom' ? 'is-on' : ''}`} onClick={() => switchLayer('bottom')} aria-label="Bottom layer (B)" style={{ ['--c' as string]: EDA.bottom }}>
        B
      </button>
      <span className="scene-toolbar__sep" />
      <Button size="sm" variant="ghost" active={flipped} onClick={() => setFlipped((f) => !f)} aria-label="Flip board view (F)">
        <IconFlip size={15} /> {!narrow && 'Flip'}
      </Button>
      <Button size="sm" variant="ghost" onClick={undo} aria-label="Undo (Ctrl+Z)" disabled={!ed.route && !ed.past.length}>
        <IconUndo size={15} />
      </Button>
      <Button size="sm" variant="ghost" active={inspector} onClick={() => setInspector((i) => !i)} aria-label="Via cross-section">
        <IconLayers size={15} /> {!narrow && 'Cross-section'}
      </Button>
    </SceneToolbar>
  )

  return (
    <div ref={rootRef} className={`l11-root ${inspector ? 'has-ins' : ''}`}>
      <div className="l11-canvas">
        <PcbCanvas
          ref={canvas}
          fit={fit}
          pad={narrow ? 1 : 0.8}
          theme="eda"
          grid={1}
          zoomControls={!narrow}
          cursor={view === 'editor' ? (tool === 'select' ? 'default' : 'crosshair') : 'grab'}
          onPointerDown={view === 'editor' ? onDown : undefined}
          onPointerMove={onMove}
          onContextMenu={() => ed.route && finish()}
          ariaLabel="PCB editor showing the Blinky board"
        >
          {view === 'photo' ? (
            <BoardView doc={doc} conn={conn} mode="real" side={flipped ? 'bottom' : 'top'} vis={{ bodies: !flipped }} />
          ) : (
            <g style={flipStyle}>
              <BoardView doc={doc} conn={conn} activeLayer={layer} vis={{ top: vis.top, bottom: vis.bottom }} onPadEnter={setHoverPad} />
              <DrcMarkers errors={errors} />

              {/* pulsing hint on RESET */}
              {resetPending && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={RESET_PIN[0]} cy={RESET_PIN[1]} r={0.9} fill="none" stroke="#ffe27a" strokeWidth={0.12} className="pin-hint" />
                  <circle cx={RESET_PIN[0]} cy={RESET_PIN[1]} r={0.9} fill="none" stroke="#ffe27a" strokeWidth={0.08} opacity={0.6} />
                  {!flipped && (
                    <text x={RESET_PIN[0]} y={RESET_PIN[1] + 2.1} textAnchor="middle" fontSize={0.8} fill="#ffe27a" fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
                      RESET
                    </text>
                  )}
                </g>
              )}

              {/* selection */}
              {selTrack && (
                <polyline points={selTrack.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff" strokeWidth={selTrack.width + 0.2} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
              )}
              {selVia && <circle cx={selVia.x} cy={selVia.y} r={selVia.d / 2 + 0.2} fill="none" stroke="#fff" strokeWidth={0.08} strokeDasharray="0.2 0.12" />}

              {/* route preview */}
              {ed.route && previewPts && (
                <g style={{ pointerEvents: 'none' }}>
                  <polyline points={previewPts.map((p) => p.join(',')).join(' ')} fill="none" stroke={routeColor} strokeWidth={TRACK_W} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                  <polyline points={previewPts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff" strokeWidth={0.04} strokeDasharray="0.25 0.2" opacity={0.6} />
                  {previewErrors.length > 0 && <DrcMarkers errors={previewErrors} />}
                </g>
              )}

              {/* cursor */}
              {cursor && view === 'editor' && tool !== 'select' && (
                <g style={{ pointerEvents: 'none' }} opacity={0.9}>
                  {tool === 'via' && !ed.route ? (
                    <>
                      <circle cx={cursor.p[0]} cy={cursor.p[1]} r={via.d / 2} fill={EDA.via} opacity={0.6} />
                      <circle cx={cursor.p[0]} cy={cursor.p[1]} r={via.drill / 2} fill={EDA.hole} />
                    </>
                  ) : (
                    <>
                      <line x1={cursor.p[0] - 0.6} y1={cursor.p[1]} x2={cursor.p[0] + 0.6} y2={cursor.p[1]} stroke="#fff" strokeWidth={0.04} />
                      <line x1={cursor.p[0]} y1={cursor.p[1] - 0.6} x2={cursor.p[0]} y2={cursor.p[1] + 0.6} stroke="#fff" strokeWidth={0.04} />
                    </>
                  )}
                  {cursor.kind !== 'grid' && <circle cx={cursor.p[0]} cy={cursor.p[1]} r={0.35} fill="none" stroke="#7fe1ff" strokeWidth={0.06} />}
                </g>
              )}
            </g>
          )}
        </PcbCanvas>

        {/* EasyEDA-style banner: active layer, flip state */}
        <div className="l11-hud" aria-live="polite">
          <span className="l11-hud__layer" style={{ ['--c' as string]: layerColor(layer) }}>
            {layer === 'top' ? 'TopLayer' : 'BottomLayer'}
          </span>
          {flipped && <span className="l11-hud__tag">Flipped · viewing from below</span>}
          {view === 'photo' && <span className="l11-hud__tag">2D preview</span>}
          {hoverPad && view === 'editor' && (
            <span className="l11-hud__tag">
              {hoverPad.ref} pin {hoverPad.num}
              {PIN_NAMES[hoverPad.key] ? ` · ${PIN_NAMES[hoverPad.key]}` : ''} · net {hoverPad.net}
            </span>
          )}
        </div>

        <div className={`l11-coach l11-coach--${coach.tone}`} role="status">
          <span className="l11-coach__dot" />
          <span>{coach.text}</span>
        </div>

        {toolbar}
        <FloatingCard style={{ maxHeight: 'calc(100% - 24px)', overflowY: 'auto' }} title="Layers & vias" subtitle="Like EasyEDA's Layers panel. The active layer is drawn on top; the other one dims.">
          <div className="l11-layers">
            {(['top', 'bottom'] as Layer[]).map((l) => (
              <div key={l} className={`l11-lrow ${layer === l ? 'is-on' : ''}`}>
                <button className="l11-lrow__main" onClick={() => switchLayer(l)}>
                  <span className="l11-lrow__sw" style={{ background: layerColor(l) }} />
                  <span className="l11-lrow__name">{l === 'top' ? 'Top Layer' : 'Bottom Layer'}</span>
                  <Kbd>{l === 'top' ? 'T' : 'B'}</Kbd>
                </button>
                <button className="l11-lrow__eye" aria-label={vis[l] ? `Hide ${l} layer` : `Show ${l} layer`} onClick={() => setVis((v) => ({ ...v, [l]: !v[l] }))}>
                  {vis[l] ? <IconEye size={15} /> : <IconEyeOff size={15} />}
                </button>
              </div>
            ))}
          </div>
          <div className="field">
            <div className="field__label">
              <span>Via size</span>
              <span className="field__value">
                <Kbd>Shift</Kbd>+<Kbd>V</Kbd>
              </span>
            </div>
            <button className="l11-viasize" onClick={() => setViaIdx((i) => (i + 1) % VIA_SIZES.length)}>
              <ViaPlan d={via.d} drill={via.drill} size={38} trace={false} />
              <span>
                <b className="mono">
                  {via.d} / {via.drill} mm
                </b>
                <span className={viaIdx === 2 ? 'l11-warn' : ''}>{via.name}</span>
              </span>
            </button>
            <div className="l11-note">{via.note}</div>
          </div>
          <Toggle label="Add a via when I switch layers mid-route" checked={autoVia} onChange={setAutoVia} />
          <Segmented
            label="View"
            value={view}
            onChange={(v) => {
              setView(v)
              if (v === 'photo') setEd((s) => commitRoute(s))
            }}
            options={[
              { value: 'editor', label: 'Editor' },
              { value: 'photo', label: '2D preview' },
            ]}
          />
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <Button size="sm" onClick={deleteSelected} disabled={!selected}>
              <IconTrash size={14} /> Delete
            </Button>
            <Button size="sm" onClick={reset} disabled={!ed.tracks.length && !ed.vias.length}>
              <IconX size={14} /> Start over
            </Button>
          </div>
          <div className="l11-keys">
            <span><Kbd>W</Kbd> route</span>
            <span><Kbd>V</Kbd> via</span>
            <span><Kbd>F</Kbd> flip</span>
            <span><Kbd>L</Kbd> corner</span>
            <span><Kbd>Esc</Kbd> finish</span>
          </div>
        </FloatingCard>
      </div>


      {inspector && (
        <div className="l11-ins" onPointerDown={(e) => e.stopPropagation()}>
          <div className="l11-ins__head">
            <span className="float-card__title">Inside a via</span>
            <Tabs
              value={insTab}
              onChange={setInsTab}
              tabs={[
                { value: 'side', label: 'Side' },
                { value: '3d', label: '3D' },
              ]}
              style={{ width: 140 }}
            />
            <span className="grow" />
            <button className="l11-ins__close" aria-label="Close cross-section" onClick={() => setInspector(false)}>
              <IconX size={15} />
            </button>
          </div>
          <div className="l11-ins__body">
            <div className="l11-ins__view">
              {insTab === 'side' ? (
                <ViaSection d={via.d} drill={via.drill} explode={explode} flow={flow} />
              ) : (
                <Suspense fallback={<div className="l11-ins__loading"><div className="spinner" /></div>}>
                  <Via3D d={via.d} drill={via.drill} explode={explode} flow={flow} />
                </Suspense>
              )}
            </div>
            <div className="l11-ins__ctl">
              <Slider label="Explode" value={explode} min={0} max={1} step={0.01} onChange={setExplode} format={(v) => `${Math.round(v * 100)}%`} />
              <Toggle label="Show current" checked={flow} onChange={setFlow} />
              <div className="l11-note">
                {via.d} mm via, {via.drill} mm drill, ring {((via.d - via.drill) / 2).toFixed(2)} mm. {insTab === '3d' ? 'Drag to orbit.' : <>Cycle sizes with <Kbd>Shift+V</Kbd>.</>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
