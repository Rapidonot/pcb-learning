/* Lesson 12 scene: draw a copper region, give it a net, and watch it flood the board around everything else. */
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMission } from '../mission'
import { Button, Toggle, Slider, Segmented, Kbd } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconPointer, IconBox, IconReset, IconEye, IconEyeOff, IconTrash, IconTarget, IconX, IconUndo } from '@/components/icons'
import { PcbCanvas, type PcbCanvasHandle } from '@/pcb/PcbCanvas'
import { analyze, type BoardDoc, type Layer, type WorldPad } from '@/pcb/board'
import { stages, netInfo } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import type { Vec } from '@/pcb/geom'
import { fillPour, connectWithPours, type PourSpec } from './pour'
import { EdaBoard12, PourArt, RealBoard12 } from './board12'
import { ThermalInspector, type HeatRun } from './ThermalInspector'

const GND_TRACKS = ['gnd1', 'gnd2', 'gnd3', 'gnd4', 'gnd5']
const INSET = 0.5
const NETS = ['', 'GND', 'VCC', 'THR', 'DIS', 'OUT', 'LED', 'CTRL']
type Tool = 'select' | 'region'

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

const rectPts = (a: Vec, b: Vec, w: number, h: number): Vec[] => {
  const x0 = Math.max(INSET, Math.min(a[0], b[0]))
  const x1 = Math.min(w - INSET, Math.max(a[0], b[0]))
  const y0 = Math.max(INSET, Math.min(a[1], b[1]))
  const y1 = Math.min(h - INSET, Math.max(a[1], b[1]))
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]
}

export function Scene() {
  const mission = useMission()
  const rootRef = useRef<HTMLDivElement>(null)
  const size = useSize(rootRef)
  const narrow = size.w < 640
  const inView = useInView(rootRef)
  const canvas = useRef<PcbCanvasHandle>(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const routed = useMemo(() => stages.routed(), [])
  const [tool, setTool] = useState<Tool>('region')
  const [pour, setPour] = useState<PourSpec | null>(null)
  const [selected, setSelected] = useState(false)
  const [drag, setDrag] = useState<{ a: Vec; b: Vec } | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [showPour, setShowPour] = useState(true)
  const [keepIslands, setKeepIslands] = useState(false)
  const [autoRebuild, setAutoRebuild] = useState(true)
  const [built, setBuilt] = useState<{ pour: PourSpec | null; deleted: boolean }>({ pour: null, deleted: false })
  const [view, setView] = useState<'editor' | 'photo'>('editor')
  const [sweep, setSweep] = useState(1)
  const [flashIslands, setFlashIslands] = useState(false)
  const [inspector, setInspector] = useState(false)
  const [padKey, setPadKey] = useState('J1.2')
  const [runs, setRuns] = useState<HeatRun[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [demoThermals, setDemoThermals] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  useEffect(() => {
    if (narrow) setPanelOpen(false)
  }, [narrow])

  const doc = useMemo<BoardDoc>(() => ({ ...routed, tracks: deleted ? routed.tracks.filter((t) => !GND_TRACKS.includes(t.id)) : routed.tracks }), [routed, deleted])

  // what the copper region is actually filled from (stale when auto-rebuild is off)
  const effPour = autoRebuild ? pour : pour ? built.pour : null
  const effDeleted = autoRebuild ? deleted : built.deleted
  const stale = !autoRebuild && !!pour && (JSON.stringify(pour) !== JSON.stringify(built.pour) || deleted !== built.deleted)
  const fillDoc = useMemo<BoardDoc>(() => ({ ...routed, tracks: effDeleted ? routed.tracks.filter((t) => !GND_TRACKS.includes(t.id)) : routed.tracks }), [routed, effDeleted])
  const deferredPour = useDeferredValue(effPour)
  const fillConn = useMemo(() => analyze({ ...fillDoc, pours: [] }), [fillDoc])
  const filled = !!deferredPour && (!!deferredPour.net || keepIslands)
  const fill = useMemo(() => (deferredPour && filled ? fillPour(fillDoc, fillConn, deferredPour) : null), [deferredPour, filled, fillDoc, fillConn])
  const conn = useMemo(() => connectWithPours(doc, fill && deferredPour?.net ? [fill] : []), [doc, fill, deferredPour])
  const gndDone = conn.complete.has('GND')
  const allDone = Object.keys(netInfo).every((n) => conn.complete.has(n))

  /* ---------------- missions ---------------- */
  useEffect(() => {
    if (pour) mission.complete('draw')
  }, [pour, mission])
  useEffect(() => {
    if (effPour?.net === 'GND' && fill) mission.complete('gnd')
  }, [effPour, fill, mission])
  useEffect(() => {
    if (deleted && effPour?.net === 'GND' && fill && allDone && !stale) mission.complete('delete')
  }, [deleted, effPour, fill, allDone, stale, mission])
  useEffect(() => {
    if (runs.some((r) => r.thermals && r.melted) && runs.some((r) => !r.thermals)) mission.complete('thermal')
  }, [runs, mission])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  /* ---------------- animations ---------------- */
  const sweepRaf = useRef(0)
  const animateSweep = useCallback(() => {
    cancelAnimationFrame(sweepRaf.current)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setSweep(1)
      setFlashIslands(true)
      return
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 750)
      setSweep(1 - Math.pow(1 - k, 3))
      if (k < 1) sweepRaf.current = requestAnimationFrame(step)
      else setFlashIslands(true)
    }
    setSweep(0)
    sweepRaf.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => () => cancelAnimationFrame(sweepRaf.current), [])
  useEffect(() => {
    if (!flashIslands) return
    const t = setTimeout(() => setFlashIslands(false), 1900)
    return () => clearTimeout(t)
  }, [flashIslands])

  /* ---------------- actions ---------------- */
  const update = (patch: Partial<PourSpec>) => {
    setPour((p) => (p ? { ...p, ...patch } : p))
  }
  const setNet = (net: string) => {
    update({ net })
    if (autoRebuild && net) animateSweep()
    if (net && net !== 'GND') setToast(`A ${net} pour would only connect ${net} pads. Ground is the usual choice.`)
  }
  const rebuild = useCallback(() => {
    if (!pour) return
    setBuilt({ pour, deleted })
    animateSweep()
    if (!pour.net && !keepIslands) setToast('Rebuilt: the region has no net, so all of its copper was removed as an island.')
    else setToast('Copper rebuilt.')
  }, [pour, deleted, keepIslands, animateSweep])
  const createPour = (pts: Vec[]) => {
    const p: PourSpec = { id: 'region1', net: '', layer: 'top', pts, clearance: 0.3, thermals: true, spoke: 0.35 }
    setPour(p)
    setBuilt({ pour: p, deleted })
    setSelected(true)
    setPanelOpen(true)
    setTool('select')
    setSweep(1)
  }
  const wholeBoard = () =>
    createPour([
      [INSET, INSET],
      [routed.w - INSET, INSET],
      [routed.w - INSET, routed.h - INSET],
      [INSET, routed.h - INSET],
    ])
  const removePour = () => {
    setPour(null)
    setSelected(false)
    setTool('region')
  }
  const toggleDeleted = () => {
    setDeleted((d) => !d)
    if (!deleted) setToast('GND tracks deleted. Watch the ratsnest: does every GND pad still connect?')
  }

  /* ---------------- pointer ---------------- */
  const snap = (w: Vec): Vec => [Math.round(w[0] * 2) / 2, Math.round(w[1] * 2) / 2]
  const insidePour = (w: Vec) => {
    if (!pour) return false
    const xs = pour.pts.map((p) => p[0])
    const ys = pour.pts.map((p) => p[1])
    return w[0] >= Math.min(...xs) && w[0] <= Math.max(...xs) && w[1] >= Math.min(...ys) && w[1] <= Math.max(...ys)
  }
  const onDown = (_e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (view !== 'editor') return
    if (tool === 'region') {
      const a = snap(w)
      setDrag({ a, b: a })
      return
    }
    setSelected(insidePour(w))
  }
  const onMove = (_e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (drag) setDrag({ ...drag, b: snap(w) })
  }
  const onUp = () => {
    if (!drag) return
    const pts = rectPts(drag.a, drag.b, routed.w, routed.h)
    setDrag(null)
    if (pts[1][0] - pts[0][0] < 2 || pts[2][1] - pts[1][1] < 2) {
      setToast('Drag a bigger rectangle across the board.')
      return
    }
    createPour(pts)
  }
  const onPad = (p: WorldPad) => {
    if (tool !== 'select' || view !== 'editor') return
    if (p.net === 'GND' && p.layers.includes(pour?.layer ?? 'top')) {
      setPadKey(p.key)
      setInspector(true)
    }
  }

  /* ---------------- keys ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inView.current) return
      const tgt = e.target as HTMLElement
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT' || tgt.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (e.shiftKey && k === 'b') rebuild()
      else if (e.shiftKey && k === 'm') setShowPour((s) => !s)
      else if (k === 'escape') {
        setDrag(null)
        setTool('select')
      } else if ((k === 'delete' || k === 'backspace') && selected && pour) removePour()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------------- coaching ---------------- */
  let coach: { tone: 'info' | 'good' | 'warn' | 'bad'; text: ReactNode }
  if (!pour) coach = { tone: 'info', text: <>Choose <b>Copper Region</b> and drag a rectangle over the board, or tap <b>Whole board</b>.</> }
  else if (!pour.net && !keepIslands)
    coach = { tone: 'warn', text: <>The region has <b>no net</b>, so it isn't connected to anything. Set its net to <b>GND</b> in the Property panel.</> }
  else if (!pour.net) coach = { tone: 'warn', text: <>Floating copper: Keep Islands is on, so it stays, but it's connected to nothing. Give it a net.</> }
  else if (stale) coach = { tone: 'warn', text: <>The copper is out of date. Press <Kbd>Shift+B</Kbd> (or <b>Rebuild</b>) to refill it.</> }
  else if (pour.net !== 'GND') coach = { tone: 'warn', text: <>A {pour.net} pour connects only {pour.net} pads. Ground is the usual choice: switch the net to GND.</> }
  else if (!deleted) coach = { tone: 'good', text: <>GND copper now floods around everything. Try the clearance slider, then <b>delete the GND tracks</b>: does GND stay connected?</> }
  else if (!gndDone) coach = { tone: 'bad', text: <>GND is broken: {conn.ratsnest.filter((r) => r.net === 'GND').length} airwire(s). A pour on the {pour.layer} layer can only reach pads on that layer. Try the top layer.</> }
  else if (runs.length < 2) coach = { tone: 'good', text: <>Every GND pad is connected through the pour alone. Click a GND pad (or <b>Thermals</b>) to see how it joins.</> }
  else coach = { tone: 'good', text: <>That's a proper ground pour: connected, with thermal reliefs that are easy to solder.</> }
  if (toast) coach = { tone: 'info', text: toast }

  /* ---------------- render ---------------- */
  const fit = narrow ? { x: 0, y: -1.5, w: routed.w, h: routed.h + 3 } : { x: -1.5, y: -2.6, w: routed.w + 1.5 + 15, h: routed.h + 5.6 }
  const pourSlot = (layer: Layer, color: string, real = false) => {
    if (!pour || pour.layer !== layer || !showPour) return null
    if (fill && deferredPour) {
      return (
        <g>
          <PourArt
            pour={deferredPour}
            doc={fillDoc}
            conn={fillConn}
            fill={color}
            opacity={real ? 1 : 0.5}
            islands={fill.islands}
            keepIslands={keepIslands}
            uid={`${uid}${real ? 'r' : 'e'}`}
            sweep={sweep}
          />
        </g>
      )
    }
    return null
  }
  const pts = pour?.pts
  const showProps = !!pour && selected && view === 'editor'
  const islandCount = fill && !keepIslands && deferredPour?.net ? fill.islandCount : 0

  const toolbar = (
    <SceneToolbar>
      <Button size="sm" variant="ghost" active={tool === 'select'} onClick={() => setTool('select')} aria-label="Select">
        <IconPointer size={15} /> {!narrow && 'Select'}
      </Button>
      <Button size="sm" variant="ghost" active={tool === 'region'} onClick={() => setTool('region')} aria-label="Draw a copper region">
        <IconBox size={15} /> {narrow ? 'Region' : 'Copper Region'}
      </Button>
      {!pour && (
        <Button size="sm" variant="ghost" onClick={wholeBoard} aria-label="Pour over the whole board">
          <IconTarget size={15} /> {!narrow && 'Whole board'}
        </Button>
      )}
      <span className="scene-toolbar__sep" />
      <Button size="sm" variant="ghost" className={stale ? 'l12-hot' : ''} onClick={rebuild} disabled={!pour} aria-label="Rebuild copper (Shift+B)">
        <IconReset size={15} /> {!narrow && 'Rebuild'}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setShowPour((s) => !s)} aria-label="Show or hide copper regions (Shift+M)">
        {showPour ? <IconEye size={15} /> : <IconEyeOff size={15} />}
      </Button>
      <span className="scene-toolbar__sep" />
      <Button size="sm" variant="ghost" active={deleted} onClick={toggleDeleted} aria-label={deleted ? 'Restore the GND tracks' : 'Delete the GND tracks'}>
        {deleted ? <IconUndo size={15} /> : <IconTrash size={15} />} {narrow ? 'GND' : deleted ? 'Restore GND tracks' : 'Delete GND tracks'}
      </Button>
      <Button size="sm" variant="ghost" active={inspector} onClick={() => setInspector((i) => !i)} aria-label="Thermal relief inspector">
        <span className="l12-thermal-ico" aria-hidden /> {!narrow && 'Thermals'}
      </Button>
    </SceneToolbar>
  )

  return (
    <div ref={rootRef} className="l12-root">
      <div className="l12-canvas">
        <PcbCanvas
          ref={canvas}
          fit={fit}
          pad={narrow ? 1 : 0.8}
          theme="eda"
          zoomControls={!narrow}
          cursor={view === 'editor' && tool === 'region' ? 'crosshair' : 'default'}
          onPointerDown={view === 'editor' ? onDown : undefined}
          onPointerMove={onMove}
          onPointerUp={onUp}
          ariaLabel="PCB editor showing the Blinky board"
        >
          <defs>
            <pattern id={`hatch-${uid}`} width={0.6} height={0.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={0.6} stroke={EDA.top} strokeWidth={0.08} opacity={0.6} />
            </pattern>
            <pattern id={`ihatch-${uid}`} width={0.4} height={0.4} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1={0} y1={0} x2={0} y2={0.4} stroke={EDA.drc} strokeWidth={0.1} />
            </pattern>
          </defs>
          {view === 'photo' ? (
            <RealBoard12 doc={doc} conn={conn} pourSlot={(l, c) => pourSlot(l, c, true)} />
          ) : (
            <EdaBoard12 doc={doc} conn={conn} activeLayer={pour?.layer ?? 'top'} pourSlot={(l, c) => pourSlot(l, c)} onPadPointerDown={onPad}>
              {/* region outline */}
              {pts && (
                <g style={{ pointerEvents: 'none' }}>
                  {!filled && <polygon points={pts.map((p) => p.join(',')).join(' ')} fill={`url(#hatch-${uid})`} />}
                  <polygon
                    points={pts.map((p) => p.join(',')).join(' ')}
                    fill="none"
                    stroke={pour!.layer === 'top' ? EDA.top : EDA.bottom}
                    strokeWidth={selected ? 0.14 : 0.08}
                    strokeDasharray={selected ? '0.5 0.25' : '0.3 0.3'}
                    className={selected ? 'l12-ants' : ''}
                  />
                  {selected &&
                    pts.map((p, i) => <rect key={i} x={p[0] - 0.3} y={p[1] - 0.3} width={0.6} height={0.6} fill="#fff" stroke="#333" strokeWidth={0.05} />)}
                </g>
              )}
              {/* islands that were just removed */}
              {flashIslands && fill && !keepIslands && deferredPour?.net && (
                <g className="l12-islandflash" style={{ pointerEvents: 'none' }}>
                  {fill.islands.map((r, i) => (
                    <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={`url(#ihatch-${uid})`} />
                  ))}
                </g>
              )}
              {drag && (
                <polygon
                  points={rectPts(drag.a, drag.b, routed.w, routed.h)
                    .map((p) => p.join(','))
                    .join(' ')}
                  fill="rgba(232,69,60,0.12)"
                  stroke={EDA.top}
                  strokeWidth={0.1}
                  strokeDasharray="0.4 0.25"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </EdaBoard12>
          )}
        </PcbCanvas>

        <div className={`l12-coach l12-coach--${coach.tone}`} role="status">
          <span className="l12-coach__dot" />
          <span>{coach.text}</span>
        </div>

        {!narrow && (
          <div className="l12-status mono">
            <span className={gndDone ? 'is-good' : 'is-bad'}>GND {gndDone ? 'connected' : `${conn.ratsnest.filter((r) => r.net === 'GND').length} open`}</span>
            <span>Nets {Object.keys(netInfo).filter((n) => conn.complete.has(n)).length}/{Object.keys(netInfo).length}</span>
            {pour && <span>Islands removed {islandCount}</span>}
          </div>
        )}

        {toolbar}

        <div className={`l12-side ${panelOpen ? '' : 'is-collapsed'}`} onPointerDown={(e) => e.stopPropagation()}>
          <div className="float-card__head">
            <div className="float-card__title">{showProps ? 'Property' : 'Copper region'}</div>
            <button className="float-card__collapse" aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'} onClick={() => setPanelOpen((o) => !o)}>
              {panelOpen ? '–' : '+'}
            </button>
          </div>
          {panelOpen && showProps && pour && (
            <div className="l12-side__body">
              <div className="l12-prop__kind mono">Copper Region · {pour.layer === 'top' ? 'TopLayer' : 'BottomLayer'}</div>
              <label className="l12-field">
                <span>Net</span>
                <select value={pour.net} onChange={(e) => setNet(e.target.value)} className={`l12-select ${!pour.net ? 'is-empty' : ''}`} aria-label="Net">
                  {NETS.map((n) => (
                    <option key={n} value={n}>
                      {n || 'No Net'}
                    </option>
                  ))}
                </select>
              </label>
              <div className="l12-field">
                <span>Layer</span>
                <Segmented
                  value={pour.layer}
                  onChange={(l) => update({ layer: l })}
                  options={[
                    { value: 'top', label: 'Top' },
                    { value: 'bottom', label: 'Bottom' },
                  ]}
                />
              </div>
              <Slider label="Clearance" value={pour.clearance} min={0.2} max={1} step={0.05} onChange={(v) => update({ clearance: Math.round(v * 100) / 100 })} format={(v) => `${v.toFixed(2)} mm`} />
              <div className="l12-field">
                <span>Pad connection</span>
                <Segmented
                  value={pour.thermals ? 'th' : 'solid'}
                  onChange={(v) => update({ thermals: v === 'th' })}
                  options={[
                    { value: 'th', label: 'Thermal' },
                    { value: 'solid', label: 'Solid' },
                  ]}
                />
              </div>
              {pour.thermals && <Slider label="Spoke width" value={pour.spoke} min={0.2} max={0.6} step={0.05} onChange={(v) => update({ spoke: Math.round(v * 100) / 100 })} format={(v) => `${v.toFixed(2)} mm`} />}
              <Toggle label="Keep islands" checked={keepIslands} onChange={setKeepIslands} />
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" onClick={rebuild}>
                  <IconReset size={14} /> Rebuild
                </Button>
                <Button size="sm" variant="ghost" onClick={removePour}>
                  <IconTrash size={14} /> Delete
                </Button>
                <span className="grow" />
                <Button size="sm" variant="ghost" onClick={() => setSelected(false)} aria-label="Back to the steps">
                  <IconX size={14} />
                </Button>
              </div>
            </div>
          )}
          {panelOpen && !showProps && (
            <div className="l12-side__body">
              <div className="float-card__sub">Three steps, just like in EasyEDA: draw it, give it a net, rebuild.</div>
              <ol className="l12-steps">
                <li className={pour ? 'is-done' : 'is-now'}>
                  <b>Draw</b> a region: <span className="l12-menu">Place › Copper Region</span>
                </li>
                <li className={pour?.net === 'GND' ? 'is-done' : pour ? 'is-now' : ''}>
                  <b>Set its net</b> to GND in the Property panel
                </li>
                <li className={pour?.net && !stale ? 'is-done' : pour?.net ? 'is-now' : ''}>
                  <b>Rebuild</b> the copper <Kbd>Shift+B</Kbd>
                </li>
              </ol>
              {pour && view === 'editor' && (
                <Button size="sm" onClick={() => setSelected(true)}>
                  Edit the region's properties
                </Button>
              )}
              <Toggle label="Rebuild copper regions automatically" checked={autoRebuild} onChange={(v) => { setAutoRebuild(v); if (!v) setBuilt({ pour, deleted }) }} />
              <div className="l12-note">In EasyEDA: Settings › PCB/Footprint › General.</div>
              <Toggle label="Show copper regions (Shift+M)" checked={showPour} onChange={setShowPour} />
              <Segmented
                label="View"
                value={view}
                onChange={setView}
                options={[
                  { value: 'editor', label: 'Editor' },
                  { value: 'photo', label: 'Real board' },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {inspector && (
        <div className="l12-ins" onPointerDown={(e) => e.stopPropagation()}>
          <div className="l12-ins__head">
            <span className="float-card__title">Thermal relief inspector</span>
            <span className="grow" />
            <button className="l12-ins__close" aria-label="Close inspector" onClick={() => setInspector(false)}>
              <IconX size={15} />
            </button>
          </div>
          <InspectorBody
            doc={doc}
            pour={pour}
            padKey={padKey}
            setPadKey={setPadKey}
            onThermals={(v) => (pour ? update({ thermals: v }) : setDemoThermals(v))}
            demoThermals={demoThermals}
            onRun={(r) => setRuns((rs) => [...rs, r])}
          />
        </div>
      )}
    </div>
  )
}

/* the inspector works even before a GND pour exists, using a demo pour */
function InspectorBody({
  doc,
  pour,
  padKey,
  setPadKey,
  onThermals,
  onRun,
  demoThermals,
}: {
  demoThermals: boolean
  doc: BoardDoc
  pour: PourSpec | null
  padKey: string
  setPadKey: (k: string) => void
  onThermals: (v: boolean) => void
  onRun: (r: HeatRun) => void
}) {
  const spec: PourSpec =
    pour && pour.net === 'GND'
      ? pour
      : {
          id: 'demo',
          net: 'GND',
          layer: 'top',
          clearance: pour?.clearance ?? 0.3,
          thermals: pour ? pour.thermals : demoThermals,
          spoke: pour?.spoke ?? 0.35,
          pts: [
            [INSET, INSET],
            [doc.w - INSET, INSET],
            [doc.w - INSET, doc.h - INSET],
            [INSET, doc.h - INSET],
          ],
        }
  const conn = useMemo(() => analyze({ ...doc, pours: [] }), [doc])
  const pads = conn.pads.filter((p) => p.net === 'GND' && p.layers.includes(spec.layer) && ['J1.2', 'C2.2', 'U1.1'].includes(p.key))
  const key = pads.some((p) => p.key === padKey) ? padKey : pads[0]?.key
  return <ThermalInspector doc={doc} conn={conn} pour={spec} pads={pads} padKey={key} onPad={setPadKey} onThermals={onThermals} onRun={onRun} />
}
