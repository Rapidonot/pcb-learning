import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { analyze, beginnerRules, drc as runDrcEngine, newId, type BoardDoc, type Layer, type Pour, type Track } from '@/pcb/board'
import { placed as refPlaced, stages } from '@/pcb/project'
import { dist, type Vec } from '@/pcb/geom'
import { toast } from '@/lib/toast'
import { Confetti } from '@/components/Confetti'
import { EditorCanvas, type EditorCanvasHandle } from './EditorCanvas'
import { BoardLayer, CursorOverlay, NET_COLORS, PartsBinLabel, StaticOverlay, type DraftRect } from './CanvasLayers'
import { clearSaved, createCursorStore, loadSaved, useDocStore, writeSaved, type HoverInfo } from './store'
import { appendPts, cornerPath, docBounds, hitTest, partOnBoard, round3, routeSnap, routeStart, snapPt, trackAt, trackLength, type Hit } from './geometry'
import { computeChecklist } from './checklist'
import { MenuBar, StatusBar, ToolRail, CanvasHud } from './Chrome'
import { SidePanel } from './Panels'
import { SchematicDrawer } from './SchematicDrawer'
import { HelpOverlay } from './HelpOverlay'
import { CompleteModal } from './CompleteModal'
import { defaultLayers, defaultPrefs, WIDTHS, type CornerMode, type DrcState, type LayerToggles, type PanelTab, type Prefs, type RouteState, type Sel, type Snap, type Tool, type ViewMode } from './types'
import './sandbox.css'

const View3D = lazy(() => import('./View3D'))

const TOOL_NAMES: Record<Tool, string> = {
  select: 'Select / move',
  route: 'Route track',
  via: 'Via',
  pour: 'Copper region',
  measure: 'Measure',
  highlight: 'Highlight net',
}

/** leave room for the coach card (top-left on desktop, across the top on phones) */
function framing(b: { x: number; y: number; w: number; h: number }) {
  const wide = typeof window !== 'undefined' && window.innerWidth > 900
  const phone = typeof window !== 'undefined' && window.innerWidth <= 760
  const left = wide ? 15 : 0
  const top = phone ? 6 : 3
  const right = phone ? 4 : 1
  return { x: b.x - left, y: b.y - top, w: b.w + left + right, h: b.h + top + 3 }
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const otherLayer = (l: Layer): Layer => (l === 'top' ? 'bottom' : 'top')
const normRot = (r: number) => ((r % 360) + 360) % 360

type Drag =
  | { kind: 'parts'; refs: string[]; start: Vec; orig: Map<string, Vec>; moved: boolean }
  | { kind: 'via'; id: string; start: Vec; orig: Vec; moved: boolean }
  | { kind: 'pour'; a: Vec }
  | { kind: 'measure'; a: Vec }

export function Editor() {
  const saved = useMemo(() => loadSaved(), [])
  const store = useDocStore(() => saved?.doc ?? stages.converted())
  const { doc } = store
  const conn = useMemo(() => analyze(doc), [doc])

  const [prefs, setPrefs] = useState<Prefs>(() => saved?.prefs ?? defaultPrefs)
  const [viewed3d, setViewed3d] = useState(() => saved?.viewed3d ?? false)
  const [tool, setToolState] = useState<Tool>('select')
  const [activeLayer, setActiveLayer] = useState<Layer>('top')
  const [layers, setLayers] = useState<LayerToggles>(defaultLayers)
  const [singleLayer, setSingleLayer] = useState(false)
  const [sel, setSel] = useState<Sel[]>([])
  const [highlightNet, setHighlightNet] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('eda')
  const [photoSide, setPhotoSide] = useState<Layer>('top')
  const [tab, setTab] = useState<PanelTab>('checklist')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [schOpen, setSchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [drcState, setDrc] = useState<DrcState | null>(null)
  const [focus, setFocus] = useState<Vec | null>(null)
  const [route, setRouteState] = useState<RouteState | null>(null)
  const [pourDraft, setPourDraft] = useState<DraftRect | null>(null)
  const [newPour, setNewPour] = useState<string | null>(null)
  const [measure, setMeasure] = useState<{ a: Vec; b: Vec } | null>(null)
  const [hoverRef, setHoverRef] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [celebrate, setCelebrate] = useState(0)
  const [showComplete, setShowComplete] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const cursor = useMemo(createCursorStore, [])
  const canvasRef = useRef<EditorCanvasHandle>(null)
  const drag = useRef<Drag | null>(null)
  const routeRef = useRef<RouteState | null>(null)
  const pressStartedRoute = useRef(false)
  const bulkChange = useRef(false)
  const tipShown = useRef(new Set<string>())

  const setRoute = useCallback((r: RouteState | null) => {
    routeRef.current = r
    setRouteState(r)
  }, [])

  const checklist = useMemo(() => computeChecklist(doc, conn, drcState, viewed3d), [doc, conn, drcState, viewed3d])
  const selectedRefs = useMemo(() => sel.filter((s) => s.kind === 'part').map((s) => s.id), [sel])
  const fitRect = useMemo(() => framing(docBounds(doc)), [doc])

  const once = (key: string, fn: () => void) => {
    if (tipShown.current.has(key)) return
    tipShown.current.add(key)
    fn()
  }

  /* ---------------- persistence ---------------- */
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (writeSaved({ v: 1, doc, viewed3d, prefs })) setSavedAt(Date.now())
    }, 450)
    return () => window.clearTimeout(t)
  }, [doc, viewed3d, prefs])

  /* ---------------- live feedback ---------------- */
  const prevComplete = useRef<Set<string>>(conn.complete)
  const prevAir = useRef(conn.ratsnest.length)
  useEffect(() => {
    const prev = prevComplete.current
    prevComplete.current = conn.complete
    if (bulkChange.current) {
      bulkChange.current = false
      prevAir.current = conn.ratsnest.length
      return
    }
    const fresh = [...conn.complete].filter((n) => !prev.has(n))
    const left = conn.ratsnest.length
    if (fresh.length && fresh.length <= 2) {
      toast({ kind: 'success', title: `Net ${fresh.join(' + ')} routed`, body: left ? `${left} airwire${left === 1 ? '' : 's'} to go.` : 'No airwires left. Nice routing.' })
    } else if (left < prevAir.current && !fresh.length) {
      toast({ kind: 'success', title: 'Connected', body: `${left} airwire${left === 1 ? '' : 's'} to go.` }, 2200)
    }
    prevAir.current = left
    if (conn.shorts.length) once(`short:${conn.shorts[0].nets.join()}`, () => toast({ kind: 'error', title: 'Short circuit', body: `Copper now joins ${conn.shorts[0].nets.join(' and ')}. Undo with Ctrl+Z.` }, 4500))
  }, [conn]) // eslint-disable-line react-hooks/exhaustive-deps

  const prevAll = useRef(checklist.allDone)
  useEffect(() => {
    if (checklist.allDone && !prevAll.current) {
      setCelebrate((c) => c + 1)
      setShowComplete(true)
    }
    prevAll.current = checklist.allDone
  }, [checklist.allDone])

  // real-time DRC: cheap enough (~3 ms) but never while dragging or mid-route
  useEffect(() => {
    if (!prefs.realtimeDrc || busy || route) return
    const t = window.setTimeout(() => setDrc({ errors: runDrcEngine(doc, beginnerRules, conn), doc, manual: false, at: Date.now() }), 220)
    return () => window.clearTimeout(t)
  }, [prefs.realtimeDrc, busy, route, doc, conn])

  // drop selections that no longer exist (after undo, delete…)
  useEffect(() => {
    setSel((cur) => {
      const next = cur.filter((s) =>
        s.kind === 'part' ? doc.parts.some((p) => p.ref === s.id) : s.kind === 'track' ? doc.tracks.some((t) => t.id === s.id) : s.kind === 'via' ? doc.vias.some((v) => v.id === s.id) : doc.pours.some((p) => p.id === s.id),
      )
      return next.length === cur.length ? cur : next
    })
    if (newPour && !doc.pours.some((p) => p.id === newPour)) setNewPour(null)
  }, [doc, newPour])

  useEffect(() => {
    if (view === '3d' && !viewed3d) {
      setViewed3d(true)
      toast({ kind: 'mission', title: 'Viewed in 3D', body: 'Drag to orbit, scroll to zoom. Watch the LED blink.' })
    }
  }, [view, viewed3d])

  /* ---------------- helpers ---------------- */
  const px = () => {
    const c = canvasRef.current
    if (!c) return 0.05
    return (c.toWorld(100, 0)[0] - c.toWorld(0, 0)[0]) / 100
  }
  const tolFor = (e: { pointerType?: string }) => (e.pointerType === 'touch' ? 12 : 6) * px()
  const visibleLayers = useMemo(
    () => ({
      top: layers.top && (!singleLayer || activeLayer === 'top'),
      bottom: layers.bottom && (!singleLayer || activeLayer === 'bottom'),
      pours: layers.pours,
    }),
    [layers, singleLayer, activeLayer],
  )

  const setTool = useCallback(
    (t: Tool) => {
      const r = routeRef.current
      if (r && t !== 'route') finishRoute(r)
      setToolState(t)
      setPourDraft(null)
      if (t !== 'measure') setMeasure(null)
      drag.current = null
      cursor.set({ snap: null })
      if (view !== 'eda') setView('eda')
    },
    [view], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const runDrc = useCallback(() => {
    const errors = runDrcEngine(doc, beginnerRules, conn)
    setDrc({ errors, doc, manual: true, at: Date.now() })
    setTab('drc')
    setSheetOpen(true)
    if (!errors.length) toast({ kind: 'success', title: 'DRC passed', body: '0 errors. Your copper meets the beginner rules.' })
    else toast({ kind: 'error', title: `DRC: ${errors.length} error${errors.length === 1 ? '' : 's'}`, body: 'Click an error in the DRC tab to zoom to it.' }, 3800)
  }, [doc, conn])

  /* ---------------- routing ---------------- */
  const curTrack = (r: RouteState): Track => ({ id: newId('t'), layer: r.layer, width: r.width, pts: r.pts, net: r.net })

  const finishRoute = useCallback(
    (r: RouteState) => {
      const tracks = [...r.done, curTrack(r)].filter((t) => t.pts.length >= 2 && trackLength(t) > 1e-6)
      setRoute(null)
      cursor.set({ snap: null })
      if (!tracks.length && !r.vias.length) return
      store.commit((d) => ({ ...d, tracks: [...d.tracks, ...tracks], vias: [...d.vias, ...r.vias] }))
    },
    [store, setRoute, cursor],
  )

  const extendRoute = (r: RouteState, target: Vec, corner: CornerMode): RouteState => {
    const last = r.pts[r.pts.length - 1]
    return { ...r, pts: appendPts(r.pts, cornerPath(last, target, corner).slice(1)) }
  }

  const routeClick = (snap: Snap) => {
    const r = routeRef.current
    if (!r) return
    if (snap.reason) {
      toast({ kind: 'error', title: 'Can’t connect there', body: snap.reason }, 3600)
      return
    }
    const next = extendRoute(r, snap.pt, prefs.corner)
    if (snap.ok) {
      finishRoute(next)
      return
    }
    setRoute(next)
  }

  const switchLayerMidRoute = (layer: Layer, why: 'key' | 'via') => {
    const r = routeRef.current
    if (!r || r.layer === layer) return
    const c = cursor.get()
    const target = c.snap?.kind === 'grid' && c.snap.pt ? c.snap.pt : r.pts[r.pts.length - 1]
    const next = extendRoute(r, target, prefs.corner)
    const last = next.pts[next.pts.length - 1]
    const via = { id: newId('v'), x: round3(last[0]), y: round3(last[1]), d: 0.6, drill: 0.3 }
    const done = next.pts.length >= 2 ? [...next.done, curTrack(next)] : next.done
    setRoute({ ...next, done, vias: [...next.vias, via], pts: [last], layer })
    setActiveLayer(layer)
    once('via-mid', () =>
      toast({ kind: 'success', title: why === 'via' ? 'Via dropped' : 'Layer switched', body: `A via carries the track to the ${layer} layer. Keep clicking to route on ${layer}.` }, 3600),
    )
  }

  const cycleWidth = () => {
    const i = WIDTHS.indexOf(prefs.width as (typeof WIDTHS)[number])
    const w = WIDTHS[(i + 1) % WIDTHS.length]
    setPrefs((p) => ({ ...p, width: w }))
    const r = routeRef.current
    if (r) {
      if (r.pts.length >= 2) {
        const last = r.pts[r.pts.length - 1]
        setRoute({ ...r, done: [...r.done, curTrack(r)], pts: [last], width: w })
      } else setRoute({ ...r, width: w })
    }
    toast({ kind: 'success', title: 'Track width', body: `${w.toFixed(2)} mm${w >= 0.5 ? ' (good for power and GND)' : ' (good for signals)'}` }, 1600)
  }

  const backspaceRoute = () => {
    const r = routeRef.current
    if (!r) return
    if (r.pts.length > 1) {
      setRoute({ ...r, pts: r.pts.slice(0, -1) })
      return
    }
    const start = r.pts[0]
    const viaIdx = r.vias.findIndex((v) => dist([v.x, v.y], start) < 1e-6)
    if (r.done.length) {
      const prev = r.done[r.done.length - 1]
      const vias = viaIdx >= 0 ? r.vias.filter((_, i) => i !== viaIdx) : r.vias
      setRoute({ ...r, done: r.done.slice(0, -1), vias, pts: prev.pts.slice(0, -1).length ? prev.pts.slice(0, -1) : prev.pts, layer: prev.layer, width: prev.width })
      if (prev.layer !== r.layer) setActiveLayer(prev.layer)
      return
    }
    setRoute(null)
  }

  /* ---------------- edits ---------------- */
  const rotateSelection = useCallback(() => {
    const refs = sel.filter((s) => s.kind === 'part').map((s) => s.id)
    if (!refs.length) {
      once('rotate-none', () => toast({ kind: 'info', title: 'Nothing to rotate', body: 'Select or drag a part, then press Space.' }))
      return
    }
    const fn = (d: BoardDoc): BoardDoc => ({ ...d, parts: d.parts.map((p) => (refs.includes(p.ref) ? { ...p, rot: normRot(p.rot + 90) } : p)) })
    if (drag.current?.kind === 'parts') store.live(fn)
    else store.commit(fn)
  }, [sel, store])

  const flipPart = useCallback(
    (ref: string, side?: Layer) => {
      store.commit((d) => ({ ...d, parts: d.parts.map((p) => (p.ref === ref ? { ...p, side: side ?? otherLayer(p.side) } : p)) }))
      const p = store.get().parts.find((q) => q.ref === ref)
      if (p) toast({ kind: 'success', title: `${ref} on the ${p.side} side`, body: p.side === 'bottom' ? 'Its pads are now bottom copper (blue). Route to them on the bottom layer.' : 'Back on top.' }, 2600)
    },
    [store],
  )

  const deleteSelection = useCallback(() => {
    const ids = { track: new Set<string>(), via: new Set<string>(), pour: new Set<string>() }
    let parts = 0
    for (const s of sel) {
      if (s.kind === 'part') parts++
      else ids[s.kind].add(s.id)
    }
    if (!ids.track.size && !ids.via.size && !ids.pour.size) {
      if (parts) toast({ kind: 'info', title: 'Parts stay', body: 'Parts come from the schematic. To remove one you would delete it there and update the PCB.' }, 3600)
      return
    }
    store.commit((d) => ({
      ...d,
      tracks: d.tracks.filter((t) => !ids.track.has(t.id)),
      vias: d.vias.filter((v) => !ids.via.has(v.id)),
      pours: d.pours.filter((p) => !ids.pour.has(p.id)),
    }))
    setSel([])
    const n = ids.track.size + ids.via.size + ids.pour.size
    toast({ kind: 'success', title: 'Deleted', body: `${n} item${n === 1 ? '' : 's'} removed. Ctrl+Z to undo.` }, 1800)
  }, [sel, store])

  const updatePour = useCallback(
    (id: string, patch: Partial<Pour>) => store.commit((d) => ({ ...d, pours: d.pours.map((p) => (p.id === id ? { ...p, ...patch } : p)) }), { merge: `pour:${id}:${Object.keys(patch).join()}` }),
    [store],
  )

  const loadPlacement = useCallback(() => {
    bulkChange.current = true
    store.commit((d) => ({ ...d, parts: clone(refPlaced) }))
    setSel([])
    toast({ kind: 'success', title: 'Reference placement loaded', body: 'Every part is where the course puts it. Ctrl+Z to undo.' })
    window.setTimeout(() => canvasRef.current?.zoomTo({ x: -1, y: -2, w: 32, h: 29 }), 30)
  }, [store])

  const loadSolution = useCallback(() => {
    bulkChange.current = true
    setRoute(null)
    store.commit(() => stages.poured())
    setSel([])
    setHighlightNet(null)
    toast({ kind: 'success', title: 'Reference solution loaded', body: 'Placed, routed and poured. Run Design › Check DRC to confirm it is clean.' }, 4200)
    window.setTimeout(() => canvasRef.current?.zoomTo({ x: -1, y: -2, w: 32, h: 29 }), 30)
  }, [store, setRoute])

  const reset = useCallback(() => {
    bulkChange.current = true
    setRoute(null)
    store.commit(() => stages.converted())
    clearSaved()
    setSel([])
    setHighlightNet(null)
    setDrc(null)
    setViewed3d(false)
    setFocus(null)
    toast({ kind: 'success', title: 'Board reset', body: 'Back to right after Convert to PCB. Ctrl+Z brings your work back.' }, 3600)
    window.setTimeout(() => canvasRef.current?.zoomTo(docBounds(stages.converted())), 30)
  }, [store, setRoute])

  const crossProbe = useCallback(
    (ref: string) => {
      setSel([{ kind: 'part', id: ref }])
      const p = store.get().parts.find((q) => q.ref === ref)
      const c = canvasRef.current
      if (!p || view !== 'eda' || !c?.svg) return
      // keep the part clear of the schematic drawer, which covers the left of the canvas
      const w = c.svg.clientWidth
      const drawer = w > 760 ? Math.min(520, 0.62 * w) : 0
      const mmPerPx = (c.toWorld(100, 0)[0] - c.toWorld(0, 0)[0]) / 100
      c.centerOn([p.x - (drawer / 2) * mmPerPx, p.y])
    },
    [store, view],
  )

  const focusDrc = useCallback((at: Vec, items: string[]) => {
    setFocus(at)
    if (view !== 'eda') setView('eda')
    canvasRef.current?.zoomTo({ x: at[0] - 3, y: at[1] - 3, w: 6, h: 6 }, { minW: 20 })
    const next: Sel[] = []
    for (const it of items) {
      const [k, id] = [it.slice(0, it.indexOf(':')), it.slice(it.indexOf(':') + 1)]
      if (k === 'track' || k === 'via') next.push({ kind: k, id })
      if (k === 'part') next.push({ kind: 'part', id })
    }
    if (next.length) setSel(next.slice(0, 4))
  }, [view])

  /* ---------------- pointer handling ---------------- */
  const hoverOf = (hit: Hit | null): HoverInfo | null => {
    if (!hit) return null
    switch (hit.kind) {
      case 'pad':
        return { kind: 'pad', id: hit.pad.key, net: hit.pad.net, label: `${hit.pad.key}${hit.pad.name ? ` ${hit.pad.name}` : ''}` }
      case 'via':
        return { kind: 'via', id: hit.via.id, net: hit.net, label: 'Via' }
      case 'track':
        return { kind: 'track', id: hit.track.id, net: hit.net, label: `Track ${hit.track.width.toFixed(2)} mm` }
      case 'part':
        return { kind: 'part', id: hit.part.ref, label: `${hit.part.ref} ${hit.part.value}` }
      case 'pour':
        return { kind: 'pour', id: hit.pour.id, net: hit.pour.net, label: 'Copper region' }
    }
  }

  const viaSnap = (w: Vec, tol: number): Snap => {
    const t = trackAt(doc, w, tol, [activeLayer])
    if (t) {
      const vtx = t.track.pts.reduce((b, q) => (dist(q, w) < dist(b, w) ? q : b), t.track.pts[0])
      return { pt: dist(vtx, w) < tol * 2 ? vtx : snapPt(t.at, 0.05), kind: 'track', ok: true, label: 'track' }
    }
    return { pt: snapPt(w, prefs.grid), kind: 'grid', ok: true }
  }

  const onDown = (e: React.PointerEvent<SVGSVGElement>, w: Vec): boolean => {
    if (view !== 'eda') return false
    setFocus(null)
    const tol = tolFor(e)
    switch (tool) {
      case 'select': {
        const hit = hitTest(doc, conn, w, tol, { activeLayer, visible: visibleLayers })
        if (!hit || hit.kind === 'pour') return false
        if (hit.kind === 'pad' || hit.kind === 'part') {
          const ref = hit.part.ref
          const has = sel.some((s) => s.kind === 'part' && s.id === ref)
          let next: Sel[]
          if (e.shiftKey) next = has ? sel.filter((s) => !(s.kind === 'part' && s.id === ref)) : [...sel, { kind: 'part', id: ref }]
          else next = has ? sel : [{ kind: 'part', id: ref }]
          setSel(next)
          const refs = next.filter((s) => s.kind === 'part').map((s) => s.id)
          if (!refs.includes(ref)) return true
          drag.current = { kind: 'parts', refs, start: w, orig: new Map(doc.parts.filter((p) => refs.includes(p.ref)).map((p) => [p.ref, [p.x, p.y] as Vec])), moved: false }
          return true
        }
        if (hit.kind === 'via') {
          setSel(e.shiftKey ? [...sel, { kind: 'via', id: hit.via.id }] : [{ kind: 'via', id: hit.via.id }])
          drag.current = { kind: 'via', id: hit.via.id, start: w, orig: [hit.via.x, hit.via.y], moved: false }
          return true
        }
        const id = hit.track.id
        const has = sel.some((s) => s.kind === 'track' && s.id === id)
        setSel(e.shiftKey ? (has ? sel.filter((s) => s.id !== id) : [...sel, { kind: 'track', id }]) : [{ kind: 'track', id }])
        return true
      }
      case 'route': {
        if (routeRef.current) {
          pressStartedRoute.current = false
          onMove(e, w)
          return true
        }
        const st = routeStart(doc, conn, w, tol, activeLayer, (l) => visibleLayers[l])
        if (!st) return false
        const width = st.width ?? prefs.width
        if (st.layer !== activeLayer) setActiveLayer(st.layer)
        setRoute({ net: st.net, layer: st.layer, width, pts: [st.pt], done: [], vias: [], from: st.from })
        pressStartedRoute.current = true
        cursor.set({ snap: { pt: st.pt, kind: 'pad', ok: false, net: st.net } })
        if ((st.net === 'VCC' || st.net === 'GND') && width < 0.5)
          once('power-width', () => toast({ kind: 'info', title: `${st.net} is a power net`, body: 'Power tracks are usually 0.5 mm or wider. Press Shift+W to widen this one.' }, 4200))
        return true
      }
      case 'via':
      case 'highlight':
        return true
      case 'pour': {
        const a = snapPt(w, prefs.grid)
        drag.current = { kind: 'pour', a }
        setPourDraft({ a, b: a })
        setBusy(true)
        return true
      }
      case 'measure': {
        const pad = hitTest(doc, conn, w, tol, { activeLayer, visible: visibleLayers })
        const a: Vec = pad?.kind === 'pad' ? [pad.pad.x, pad.pad.y] : pad?.kind === 'via' ? [pad.via.x, pad.via.y] : snapPt(w, prefs.grid)
        drag.current = { kind: 'measure', a }
        setMeasure({ a, b: a })
        return true
      }
    }
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (view !== 'eda') {
      cursor.set({ world: w, snap: null, hover: null })
      return
    }
    const tol = tolFor(e)
    const d = drag.current
    if (d?.kind === 'parts') {
      const dx = w[0] - d.start[0]
      const dy = w[1] - d.start[1]
      if (!d.moved && Math.hypot(dx, dy) < tol * 0.6) return
      if (!d.moved) {
        d.moved = true
        setBusy(true)
      }
      const g = prefs.grid
      store.live((doc0) => ({
        ...doc0,
        parts: doc0.parts.map((p) => {
          const o = d.orig.get(p.ref)
          if (!o) return p
          const nx = round3(Math.round((o[0] + dx) / g) * g)
          const ny = round3(Math.round((o[1] + dy) / g) * g)
          return nx === p.x && ny === p.y ? p : { ...p, x: nx, y: ny }
        }),
      }))
      const lead = store.get().parts.find((p) => p.ref === d.refs[0])
      cursor.set({ world: w, snap: lead ? { pt: [lead.x, lead.y], kind: 'grid', ok: true } : null })
      return
    }
    if (d?.kind === 'via') {
      const dx = w[0] - d.start[0]
      const dy = w[1] - d.start[1]
      if (!d.moved && Math.hypot(dx, dy) < tol * 0.6) return
      if (!d.moved) {
        d.moved = true
        setBusy(true)
      }
      const p = snapPt([d.orig[0] + dx, d.orig[1] + dy], prefs.grid)
      store.live((doc0) => ({ ...doc0, vias: doc0.vias.map((v) => (v.id === d.id ? { ...v, x: p[0], y: p[1] } : v)) }))
      cursor.set({ world: w, snap: { pt: p, kind: 'grid', ok: true } })
      return
    }
    if (d?.kind === 'pour') {
      const b = snapPt(w, prefs.grid)
      setPourDraft({ a: d.a, b })
      cursor.set({ world: w, snap: { pt: b, kind: 'grid', ok: true } })
      return
    }
    if (d?.kind === 'measure') {
      const h = hitTest(doc, conn, w, tol, { activeLayer, visible: visibleLayers })
      const b: Vec = h?.kind === 'pad' ? [h.pad.x, h.pad.y] : h?.kind === 'via' ? [h.via.x, h.via.y] : snapPt(w, prefs.grid)
      setMeasure({ a: d.a, b })
      cursor.set({ world: w, snap: { pt: b, kind: h?.kind === 'pad' || h?.kind === 'via' ? 'pad' : 'grid', ok: true } })
      return
    }

    const r = routeRef.current
    const hit = hitTest(doc, conn, w, tol, { activeLayer, visible: visibleLayers })
    const hover = hoverOf(hit)
    let snap: Snap | null = null
    if (r) {
      snap = routeSnap(doc, conn, w, { net: r.net, layer: r.layer, tol, grid: prefs.grid, startPt: r.pts[0], pendingVias: r.vias })
      if (snap.kind === 'pad' && snap.ok && r.pts.length === 1 && r.done.length === 0 && dist(snap.pt, r.pts[0]) < 1e-6) snap = { ...snap, ok: false }
    } else if (tool === 'route') {
      const st = routeStart(doc, conn, w, tol, activeLayer, (l) => visibleLayers[l])
      snap = st ? { pt: st.pt, kind: 'pad', ok: true, net: st.net } : { pt: snapPt(w, prefs.grid), kind: 'grid', ok: false }
    } else if (tool === 'via') snap = viaSnap(w, tol)
    else if (tool === 'select') snap = null
    else snap = { pt: snapPt(w, prefs.grid), kind: 'grid', ok: false }
    cursor.set({ world: w, snap, hover })

    const partRef = tool === 'select' && (hit?.kind === 'part' || hit?.kind === 'pad') ? hit.part.ref : null
    if (partRef !== hoverRef) setHoverRef(partRef)
    const svg = canvasRef.current?.svg
    if (svg) svg.style.cursor = tool !== 'select' ? 'crosshair' : partRef ? 'move' : hit && hit.kind !== 'pour' ? 'pointer' : 'default'
  }

  const onUp = (e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    const d = drag.current
    drag.current = null
    if (d?.kind === 'parts') {
      setBusy(false)
      if (d.moved) {
        store.endLive()
        const now = store.get()
        const moved = now.parts.filter((p) => d.refs.includes(p.ref))
        if (moved.length === 1 && partOnBoard(moved[0], now)) {
          const nOn = now.parts.filter((p) => partOnBoard(p, now)).length
          if (nOn === 1) toast({ kind: 'success', title: `${moved[0].ref} is on the board`, body: 'Now bring the parts its airwires point to close to it.' })
        }
      }
      return
    }
    if (d?.kind === 'via') {
      setBusy(false)
      if (d.moved) store.endLive()
      return
    }
    if (d?.kind === 'pour') {
      setBusy(false)
      setPourDraft(null)
      const b = snapPt(w, prefs.grid)
      const inset = 0.5
      const x0 = Math.max(inset, Math.min(d.a[0], b[0]))
      const y0 = Math.max(inset, Math.min(d.a[1], b[1]))
      const x1 = Math.min(doc.w - inset, Math.max(d.a[0], b[0]))
      const y1 = Math.min(doc.h - inset, Math.max(d.a[1], b[1]))
      if (x1 - x0 < 1 || y1 - y0 < 1) {
        toast({ kind: 'info', title: 'Drag a bigger area', body: 'Press on one corner of the board and drag to the opposite corner. The region is clipped to the board.' }, 3600)
        return
      }
      const pour: Pour = { id: newId('pour'), net: 'GND', layer: activeLayer, clearance: 0.3, pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map((q) => [round3(q[0]), round3(q[1])] as Vec) }
      store.commit((doc0) => ({ ...doc0, pours: [...doc0.pours, pour] }))
      setSel([{ kind: 'pour', id: pour.id }])
      setNewPour(pour.id)
      return
    }
    if (d?.kind === 'measure') return

    if (view !== 'eda') return
    const tol = tolFor(e)
    if (tool === 'route' && routeRef.current) {
      if (pressStartedRoute.current) {
        pressStartedRoute.current = false
        return
      }
      const r = routeRef.current
      let snap = routeSnap(doc, conn, w, { net: r.net, layer: r.layer, tol, grid: prefs.grid, startPt: r.pts[0], pendingVias: r.vias })
      if (snap.kind === 'pad' && r.pts.length === 1 && r.done.length === 0 && dist(snap.pt, r.pts[0]) < 1e-6) snap = { ...snap, ok: false, reason: undefined }
      routeClick(snap)
      return
    }
    if (tool === 'via') {
      const s = viaSnap(w, tol)
      const v = { id: newId('v'), x: round3(s.pt[0]), y: round3(s.pt[1]), d: 0.6, drill: 0.3 }
      if (v.x < 0 || v.y < 0 || v.x > doc.w || v.y > doc.h) {
        toast({ kind: 'info', title: 'Vias live on the board', body: 'Click inside the board outline.' })
        return
      }
      store.commit((doc0) => ({ ...doc0, vias: [...doc0.vias, v] }))
      once('via-tip', () => toast({ kind: 'success', title: 'Via placed', body: '0.6 mm pad, 0.3 mm drill. Route a track to it from each layer to hop between sides.' }, 3600))
      return
    }
    if (tool === 'highlight') {
      const hit = hitTest(doc, conn, w, tol, { activeLayer, visible: visibleLayers })
      const net = hoverOf(hit)?.net ?? null
      setHighlightNet((cur) => (net && cur !== net ? net : null))
    }
  }

  const onTap = (e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (view !== 'eda') return
    if (tool === 'select') {
      const hit = hitTest(doc, conn, w, tolFor(e), { activeLayer, visible: visibleLayers })
      if (hit?.kind === 'pour') setSel(e.shiftKey ? [...sel, { kind: 'pour', id: hit.pour.id }] : [{ kind: 'pour', id: hit.pour.id }])
      else if (!e.shiftKey) setSel([])
      return
    }
    if (tool === 'route' && !routeRef.current) toast({ kind: 'info', title: 'Start on copper', body: 'Click a pad (or the end of a track) to start routing its net.' }, 2600)
  }

  const onSecondaryTap = () => {
    const r = routeRef.current
    if (r) finishRoute(r)
    else if (tool !== 'select') setTool('select')
  }

  const onGestureCancel = () => {
    const d = drag.current
    drag.current = null
    if (d?.kind === 'parts' || d?.kind === 'via') store.cancelLive()
    setPourDraft(null)
    setBusy(false)
  }

  const onDoubleClick = () => {
    const r = routeRef.current
    if (r && r.pts.length > 1) finishRoute(r)
  }

  /* ---------------- keyboard ---------------- */
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
    const ctrl = e.ctrlKey || e.metaKey
    const code = e.code
    if (ctrl) {
      if (code === 'KeyZ') {
        e.preventDefault()
        if (routeRef.current) return backspaceRoute()
        if (e.shiftKey) store.redo()
        else store.undo()
      } else if (code === 'KeyY') {
        e.preventDefault()
        store.redo()
      } else if (code === 'KeyS') {
        e.preventDefault()
        if (writeSaved({ v: 1, doc, viewed3d, prefs })) {
          setSavedAt(Date.now())
          toast({ kind: 'success', title: 'Saved', body: 'Your board is stored in this browser.' }, 1800)
        }
      }
      return
    }
    if (e.key === '?') {
      setHelpOpen((o) => !o)
      return
    }
    if (helpOpen || showComplete) {
      if (e.key === 'Escape') {
        setHelpOpen(false)
        setShowComplete(false)
      }
      return
    }
    if (code === 'KeyK') {
      canvasRef.current?.fit()
      return
    }
    if (code === 'KeyQ') {
      setPrefs((p) => ({ ...p, units: p.units === 'mm' ? 'mil' : 'mm' }))
      return
    }
    if (view !== 'eda') {
      if (e.key === 'Escape') setView('eda')
      return
    }
    const r = routeRef.current
    switch (code) {
      case 'KeyW':
        if (e.shiftKey) cycleWidth()
        else setTool('route')
        break
      case 'KeyV':
        if (r) switchLayerMidRoute(otherLayer(r.layer), 'via')
        else setTool('via')
        break
      case 'KeyE':
        setTool('pour')
        break
      case 'KeyM':
        if (e.altKey) {
          e.preventDefault()
          setTool('measure')
        } else if (e.shiftKey) {
          setLayers((l) => ({ ...l, pours: !l.pours }))
          toast({ kind: 'info', title: layers.pours ? 'Copper pours hidden' : 'Copper pours shown' }, 1400)
        }
        break
      case 'KeyH': {
        const net = cursor.get().hover?.net ?? null
        setHighlightNet((cur) => (net && cur !== net ? net : null))
        break
      }
      case 'KeyT':
        if (r) switchLayerMidRoute('top', 'key')
        else setActiveLayer('top')
        break
      case 'KeyB':
        if (e.shiftKey) {
          toast({ kind: 'success', title: 'Copper rebuilt', body: `${doc.pours.length} region${doc.pours.length === 1 ? '' : 's'} refilled around the current tracks.` }, 2000)
          break
        }
        if (r) switchLayerMidRoute('bottom', 'key')
        else setActiveLayer('bottom')
        break
      case 'KeyL': {
        const order: CornerMode[] = ['45', '45d', '90']
        const next = order[(order.indexOf(prefs.corner) + 1) % order.length]
        setPrefs((p) => ({ ...p, corner: next }))
        toast({ kind: 'success', title: 'Routing corner', body: next === '90' ? '90°' : next === '45d' ? '45°, diagonal first' : '45°, straight first' }, 1400)
        break
      }
      case 'KeyS':
        if (e.shiftKey) setSingleLayer((s) => !s)
        break
      case 'KeyX':
        if (e.shiftKey) {
          setSchOpen(true)
          if (selectedRefs.length) crossProbe(selectedRefs[0])
          else toast({ kind: 'info', title: 'Cross-probe', body: 'Select a part on the PCB (or click a symbol in the schematic) to find it on the other side.' }, 3000)
        }
        break
      case 'Space':
        e.preventDefault()
        rotateSelection()
        break
      case 'Delete':
        deleteSelection()
        break
      case 'Backspace':
        e.preventDefault()
        if (r) backspaceRoute()
        else deleteSelection()
        break
      case 'Escape':
        if (r) {
          finishRoute(r)
        } else if (measure || pourDraft) {
          setMeasure(null)
          setPourDraft(null)
        } else if (newPour) setNewPour(null)
        else if (highlightNet) setHighlightNet(null)
        else if (sel.length) setSel([])
        else if (tool !== 'select') setTool('select')
        else if (schOpen) setSchOpen(false)
        break
    }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  /* ---------------- render ---------------- */
  const drcErrorsShown = useMemo(() => {
    if (!layers.drc || !drcState || drcState.doc !== doc) return undefined
    return drcState.errors.filter((er) => er.kind !== 'unrouted')
  }, [layers.drc, drcState, doc])

  const edaVis = useMemo(
    () => ({ top: visibleLayers.top, bottom: visibleLayers.bottom, silk: layers.silk, outline: layers.outline, ratsnest: layers.ratsnest, pours: layers.pours, refs: layers.silk }),
    [visibleLayers, layers],
  )
  const photoVis = useMemo(() => ({ bodies: true, ratsnest: false, pours: layers.pours }), [layers.pours])
  const netColors = prefs.netColors ? NET_COLORS : undefined

  const noneOnBoard = checklist.items[0].status.startsWith('0 ')

  const api: EditorApi = {
    doc,
    conn,
    sel,
    setSel,
    store,
    tool,
    setTool,
    prefs,
    setPrefs,
    layers,
    setLayers,
    activeLayer,
    setActiveLayer,
    singleLayer,
    setSingleLayer,
    highlightNet,
    setHighlightNet,
    checklist,
    drcState,
    runDrc,
    focusDrc,
    rotateSelection,
    flipPart,
    deleteSelection,
    updatePour,
    crossProbe,
    view,
    setView,
    openSchematic: () => setSchOpen(true),
    openSummary: () => setShowComplete(true),
  }

  return (
    <div className={`sbx-editor ${sheetOpen ? 'is-sheet-open' : ''}`}>
      <MenuBar
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        undo={store.undo}
        redo={store.redo}
        runDrc={runDrc}
        realtimeDrc={prefs.realtimeDrc}
        toggleRealtime={() => setPrefs((p) => ({ ...p, realtimeDrc: !p.realtimeDrc }))}
        loadPlacement={loadPlacement}
        loadSolution={loadSolution}
        reset={reset}
        fit={() => canvasRef.current?.fit()}
        view={view}
        setView={setView}
        schOpen={schOpen}
        toggleSch={() => setSchOpen((o) => !o)}
        openHelp={() => setHelpOpen(true)}
        progress={checklist.done}
        total={checklist.items.length}
      />

      <ToolRail tool={tool} setTool={setTool} activeLayer={activeLayer} setActiveLayer={setActiveLayer} disabled={view !== 'eda'} hasSel={sel.length > 0} rotate={rotateSelection} del={deleteSelection} undo={store.undo} redo={store.redo} canUndo={store.canUndo} canRedo={store.canRedo} />

      <main className={`sbx-canvas sbx-canvas--${view} ${schOpen ? 'has-sch' : ''}`}>
        {view !== '3d' && (
          <EditorCanvas
            ref={canvasRef}
            fit={fitRect}
            theme={view === 'eda' ? 'eda' : 'photo'}
            grid={view === 'eda' ? prefs.grid : false}
            majorEvery={view === 'eda' && prefs.grid < 0.5 ? 4 : 5}
            pad={3}
            ariaLabel="PCB editor canvas"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onTap={onTap}
            onSecondaryTap={onSecondaryTap}
            onGestureCancel={onGestureCancel}
            onDoubleClick={onDoubleClick}
            onLeave={() => cursor.set({ world: null, snap: null, hover: null })}
          >
            {view === 'eda' ? (
              <>
                <BoardLayer
                  doc={doc}
                  conn={conn}
                  mode="eda"
                  vis={edaVis}
                  activeLayer={activeLayer}
                  highlightNet={highlightNet}
                  selectedRefs={selectedRefs}
                  drcErrors={drcErrorsShown}
                  netColors={netColors}
                  maskColor={prefs.maskColor}
                  finish={prefs.finish}
                  side="top"
                />
                <PartsBinLabel doc={doc} />
                <StaticOverlay doc={doc} conn={conn} sel={sel} showNetLabels={prefs.netLabels} highlightNet={highlightNet} focus={focus} showEmptyHint={noneOnBoard} visible={visibleLayers} />
                <CursorOverlay
                  store={cursor}
                  tool={tool}
                  route={route}
                  corner={prefs.corner}
                  pourDraft={pourDraft}
                  measure={measure}
                  activeLayer={activeLayer}
                  doc={doc}
                  hoverRef={hoverRef}
                  clearance={beginnerRules.clearance}
                />
              </>
            ) : (
              <BoardLayer
                doc={doc}
                conn={conn}
                mode="real"
                vis={photoVis}
                activeLayer={activeLayer}
                highlightNet={null}
                selectedRefs={[]}
                maskColor={prefs.maskColor}
                finish={prefs.finish}
                side={photoSide}
              />
            )}
          </EditorCanvas>
        )}
        {view === '3d' && (
          <Suspense
            fallback={
              <div className="sbx-loading">
                <div className="sbx-spinner" />
                <span className="mono">Building your board in 3D…</span>
              </div>
            }
          >
            <View3D doc={doc} maskColor={prefs.maskColor} finish={prefs.finish} />
          </Suspense>
        )}

        <CanvasHud
          view={view}
          tool={tool}
          toolName={TOOL_NAMES[tool]}
          route={route}
          sel={sel}
          doc={doc}
          conn={conn}
          coach={checklist.coach}
          prefs={prefs}
          setPrefs={setPrefs}
          photoSide={photoSide}
          setPhotoSide={setPhotoSide}
          rotate={rotateSelection}
          flipPart={flipPart}
          del={deleteSelection}
          finishRoute={() => routeRef.current && finishRoute(routeRef.current)}
          cancelRoute={() => setRoute(null)}
          backspaceRoute={backspaceRoute}
          cycleWidth={cycleWidth}
          switchLayer={() => routeRef.current && switchLayerMidRoute(otherLayer(routeRef.current.layer), 'via')}
          newPour={newPour}
          closeNewPour={() => setNewPour(null)}
          updatePour={updatePour}
          crossProbe={(ref) => {
            setSchOpen(true)
            crossProbe(ref)
          }}
          onCoachAction={(a) => {
            if (a === 'route') setTool('route')
            else if (a === 'pour') setTool('pour')
            else if (a === 'drc') runDrc()
            else if (a === '3d') setView('3d')
            else if (a === 'select') setTool('select')
          }}
          highlightNet={highlightNet}
          clearHighlight={() => setHighlightNet(null)}
          measure={measure}
          clearMeasure={() => setMeasure(null)}
        />

        <SchematicDrawer
          open={schOpen}
          onClose={() => setSchOpen(false)}
          selectedRefs={selectedRefs}
          highlightNet={highlightNet}
          onSymbol={(ref) => {
            // on phones the drawer covers the board: close it so the found part is visible
            if (window.innerWidth <= 760) setSchOpen(false)
            crossProbe(ref)
          }}
          onNet={(n) => setHighlightNet((cur) => (cur === n ? null : n))}
        />
      </main>

      <SidePanel api={api} tab={tab} setTab={setTab} sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} />

      <StatusBar cursor={cursor} prefs={prefs} setPrefs={setPrefs} activeLayer={activeLayer} toolName={TOOL_NAMES[tool]} route={route} airwires={conn.ratsnest.length} drcState={drcState} doc={doc} savedAt={savedAt} />

      {createPortal(
        <>
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {showComplete && (
        <CompleteModal
          doc={doc}
          maskColor={prefs.maskColor}
          onClose={() => setShowComplete(false)}
          open3d={() => {
            setShowComplete(false)
            setView('3d')
          }}
        />
      )}
      <Confetti fire={celebrate} />
        </>,
        document.body,
      )}
      <span className="sr-only" aria-live="polite">
        {checklist.coach.title}
      </span>
    </div>
  )
}

export type EditorApi = {
  doc: BoardDoc
  conn: ReturnType<typeof analyze>
  sel: Sel[]
  setSel: (s: Sel[]) => void
  store: ReturnType<typeof useDocStore>
  tool: Tool
  setTool: (t: Tool) => void
  prefs: Prefs
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>
  layers: LayerToggles
  setLayers: React.Dispatch<React.SetStateAction<LayerToggles>>
  activeLayer: Layer
  setActiveLayer: (l: Layer) => void
  singleLayer: boolean
  setSingleLayer: React.Dispatch<React.SetStateAction<boolean>>
  highlightNet: string | null
  setHighlightNet: React.Dispatch<React.SetStateAction<string | null>>
  checklist: ReturnType<typeof computeChecklist>
  drcState: DrcState | null
  runDrc: () => void
  focusDrc: (at: Vec, items: string[]) => void
  rotateSelection: () => void
  flipPart: (ref: string, side?: Layer) => void
  deleteSelection: () => void
  updatePour: (id: string, patch: Partial<Pour>) => void
  crossProbe: (ref: string) => void
  view: ViewMode
  setView: (v: ViewMode) => void
  openSchematic: () => void
  openSummary: () => void
}
