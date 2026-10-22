import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMission } from '../mission'
import { FloatingCard, Button, Segmented, Kbd } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconRoute, IconPointer, IconUndo, IconCheck, IconTrash, IconReset, IconWave } from '@/components/icons'
import { PcbCanvas, type PcbCanvasHandle } from '@/pcb/PcbCanvas'
import { BoardView, DrcMarkers, PadGlyph } from '@/pcb/render'
import { analyze, beginnerRules, drc, newId, padShape, type BoardDoc, type Connectivity, type DrcError, type Track, type WorldPad } from '@/pcb/board'
import { stages, netInfo } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { dist, pointSegDist, route45, shapeDist, snap, type Vec } from '@/pcb/geom'
import { Calculator } from './Calculator'
import { ROUTER_WIDTHS } from './ipc'

/** Tracks left for the learner: the decoupling VCC link, DIS, OUT and LED. Everything else comes pre-routed. */
const LEARNER_NETS = new Set(['vcc3', 'dis1', 'dis2', 'out1', 'led1'])
const startTracks = (): Track[] => stages.routed().tracks.filter((t) => !LEARNER_NETS.has(t.id))
const shell = stages.routed()

const WIDTHS = ROUTER_WIDTHS
type Corner = '45' | '90' | 'free'
const CORNERS: Corner[] = ['45', '90', 'free']
const cornerLabel: Record<Corner, string> = { '45': '45°', '90': '90°', free: 'Any' }
const NETS = Object.keys(netInfo)
const GRID = 0.25

interface Routing {
  net: string | undefined
  pts: Vec[]
  /** pad key or track id we started on (ignored as a finish target for the first click) */
  from: string
}

interface Target {
  pt: Vec
  pad?: WorldPad
  track?: Track
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(900)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

function pathTo(a: Vec, b: Vec, corner: Corner): Vec[] {
  if (corner === 'free') return [a, b]
  if (corner === '90') {
    if (Math.abs(a[0] - b[0]) < 1e-6 || Math.abs(a[1] - b[1]) < 1e-6) return [a, b]
    return [a, [b[0], a[1]], b]
  }
  return route45(a, b)
}

function appendPts(pts: Vec[], more: Vec[]): Vec[] {
  const out = pts.slice()
  for (const p of more) {
    const last = out[out.length - 1]
    if (!last || dist(last, p) > 1e-4) out.push(p)
  }
  return out
}

function closestOnSeg(p: Vec, a: Vec, b: Vec): Vec {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  if (!l2) return a
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  return [a[0] + dx * t, a[1] + dy * t]
}

const trackNet = (conn: Connectivity, t: Track) => conn.netOf.get(`track:${t.id}`) ?? t.net
const realErrors = (errs: DrcError[]) => errs.filter((e) => e.kind !== 'unrouted')

export function Scene() {
  const mission = useMission()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<PcbCanvasHandle>(null)
  const width = useWidth(wrapRef)
  const narrow = width < 640

  const [tracks, setTracks] = useState<Track[]>(startTracks)
  const [tool, setTool] = useState<'route' | 'select'>('route')
  const [trackW, setTrackW] = useState<number>(0.25)
  const [corner, setCorner] = useState<Corner>('45')
  const [routing, setRouting] = useState<Routing | null>(null)
  const [cursor, setCursor] = useState<Target | null>(null)
  const [selTrack, setSelTrack] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; tone: 'bad' | 'good' | 'info' } | null>(null)
  const [calcOpen, setCalcOpen] = useState(false)
  const [calc, setCalc] = useState({ amps: 0.5, rise: 10, oz: 1 })
  const down = useRef<{ x: number; y: number; started: boolean } | null>(null)
  const msgTimer = useRef<number>(0)
  const bgDown = useRef<{ x: number; y: number } | null>(null)

  const flash = useCallback((text: string, tone: 'bad' | 'good' | 'info' = 'info', ms = 3800) => {
    setMsg({ text, tone })
    window.clearTimeout(msgTimer.current)
    msgTimer.current = window.setTimeout(() => setMsg(null), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(msgTimer.current), [])

  /* ---------------- documents ---------------- */

  const doc: BoardDoc = useMemo(() => ({ ...shell, tracks }), [tracks])
  const conn = useMemo(() => analyze(doc), [doc])
  const errors = useMemo(() => realErrors(drc(doc, beginnerRules, conn)), [doc, conn])

  const livePts = useMemo(() => {
    if (!routing) return null
    const last = routing.pts[routing.pts.length - 1]
    if (!cursor) return routing.pts
    return appendPts(routing.pts, pathTo(last, cursor.pt, corner).slice(1))
  }, [routing, cursor, corner])

  const liveDoc: BoardDoc = useMemo(() => {
    if (!routing || !livePts || livePts.length < 2) return doc
    return { ...doc, tracks: [...doc.tracks, { id: '__live', layer: 'top', width: trackW, pts: livePts, net: routing.net }] }
  }, [doc, routing, livePts, trackW])
  const liveConn = useMemo(() => (liveDoc === doc ? conn : analyze(liveDoc)), [liveDoc, doc, conn])
  const liveErrors = useMemo(() => (liveDoc === doc ? errors : realErrors(drc(liveDoc, beginnerRules, liveConn))), [liveDoc, doc, errors, liveConn])

  /* ---------------- missions ---------------- */

  useEffect(() => {
    if (conn.complete.size === NETS.length && errors.length === 0 && !routing) mission.complete('all')
  }, [conn, errors, routing, mission])
  useEffect(() => {
    // count it once the learner settles on 1 A (not when the slider merely sweeps past it)
    if (Math.abs(calc.amps - 1) > 1e-6) return
    const t = window.setTimeout(() => mission.complete('calc'), 600)
    return () => window.clearTimeout(t)
  }, [calc.amps, mission])

  /* ---------------- hit testing ---------------- */

  const pxPerMm = () => {
    const m = canvasRef.current?.svg?.getScreenCTM()
    return m ? m.a : 10
  }

  const pick = useCallback(
    (w: Vec, opts: { snapGrid: boolean }): Target => {
      const tol = Math.max(0.12, 7 / pxPerMm())
      let bestPad: WorldPad | undefined
      let bestD = Infinity
      const probe = { pts: [w], r: 0 }
      for (const p of conn.pads) {
        const d = shapeDist(probe, padShape(p))
        if (d <= tol && d < bestD) {
          bestD = d
          bestPad = p
        }
      }
      if (bestPad) return { pt: [bestPad.x, bestPad.y], pad: bestPad }
      let bestT: Track | undefined
      let bestPt: Vec = w
      bestD = Infinity
      for (const t of doc.tracks) {
        for (let i = 0; i < t.pts.length - 1; i++) {
          const d = pointSegDist(w, t.pts[i], t.pts[i + 1]) - t.width / 2
          if (d <= tol && d < bestD) {
            bestD = d
            bestT = t
            bestPt = closestOnSeg(w, t.pts[i], t.pts[i + 1])
          }
        }
      }
      if (bestT) return { pt: bestPt, track: bestT }
      return { pt: opts.snapGrid ? [snap(w[0], GRID), snap(w[1], GRID)] : w }
    },
    [conn, doc],
  )

  /* ---------------- routing actions ---------------- */

  const finish = useCallback(
    (pts: Vec[], net: string | undefined) => {
      setRouting(null)
      setCursor(null)
      if (pts.length < 2) return
      const t: Track = { id: newId('lt'), layer: 'top', width: trackW, pts, net }
      const next = [...tracks, t]
      const before = conn.ratsnest.length
      const after = analyze({ ...doc, tracks: next })
      setTracks(next)
      const shorts = after.shorts.filter((s) => s.items.includes(`track:${t.id}`))
      if (shorts.length) {
        flash(`Short circuit! That joins ${shorts[0].nets.join(' and ')}. Select the track and delete it.`, 'bad', 6000)
        return
      }
      if (after.ratsnest.length < before) {
        mission.complete('first')
        if (net && (net === 'VCC' || net === 'GND') && trackW >= 0.5 - 1e-6) mission.complete('power')
        const done = net && after.complete.has(net)
        flash(done ? `Net ${net} is fully connected.` : `Connected. ${after.ratsnest.length} airwire${after.ratsnest.length === 1 ? '' : 's'} to go.`, 'good')
      }
    },
    [tracks, conn, doc, trackW, flash, mission],
  )

  const stop = useCallback(() => {
    if (!routing) return
    finish(routing.pts, routing.net)
  }, [routing, finish])

  const undoSegment = useCallback(() => {
    setRouting((r) => {
      if (!r) return r
      if (r.pts.length <= 1) return null
      return { ...r, pts: r.pts.slice(0, -1) }
    })
  }, [])

  const commit = useCallback(
    (w: Vec) => {
      if (!routing) return
      const tgt = pick(w, { snapGrid: true })
      const last = routing.pts[routing.pts.length - 1]
      const onStart = routing.pts.length === 1 && ((tgt.pad && tgt.pad.key === routing.from) || (tgt.track && tgt.track.id === routing.from))
      if (onStart) return
      if (dist(last, tgt.pt) < 1e-3) return
      const pts = appendPts(routing.pts, pathTo(last, tgt.pt, corner).slice(1))
      if (tgt.pad) {
        if (tgt.pad.net !== routing.net) {
          // EasyEDA would let you do this too — and DRC flags the short
          finish(pts, routing.net)
          return
        }
        finish(pts, routing.net)
        return
      }
      if (tgt.track && trackNet(conn, tgt.track) === routing.net) {
        finish(pts, routing.net)
        return
      }
      setRouting({ ...routing, pts })
    },
    [routing, pick, corner, finish, conn],
  )

  const startAt = useCallback(
    (tgt: Target) => {
      if (tgt.pad || tgt.track) setMsg(null)
      if (tgt.pad) {
        setRouting({ net: tgt.pad.net, pts: [[tgt.pad.x, tgt.pad.y]], from: tgt.pad.key })
        setSelTrack(null)
        return true
      }
      if (tgt.track) {
        // a route started from an existing track inherits that track's width
        setTrackW(tgt.track.width)
        setRouting({ net: trackNet(conn, tgt.track), pts: [tgt.pt], from: tgt.track.id })
        setSelTrack(null)
        if (tgt.track.width !== trackW) flash(`Width inherited from the track: ${tgt.track.width} mm`, 'info')
        return true
      }
      return false
    },
    [conn, trackW, flash],
  )

  /* ---------------- pointer handlers ---------------- */

  const focusScene = () => wrapRef.current?.focus({ preventScroll: true })

  const onDown = (e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (e.button !== 0) return
    focusScene()
    e.currentTarget.setPointerCapture(e.pointerId)
    const tgt = pick(w, { snapGrid: true })
    setCursor(tgt)
    down.current = { x: e.clientX, y: e.clientY, started: false }
    if (!routing) {
      if (startAt(tgt)) down.current.started = true
      else flash('Start a track on a pad (or on an existing track).', 'info', 2600)
    }
  }

  const onMove = (_e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (tool !== 'route') {
      const tgt = pick(w, { snapGrid: false })
      setCursor(tgt.pad || tgt.track ? tgt : null)
      return
    }
    setCursor(pick(w, { snapGrid: true }))
  }

  const onUp = (e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (tool === 'select') {
      const tgt = pick(w, { snapGrid: false })
      setSelTrack(tgt.track && !tgt.pad ? tgt.track.id : null)
      return
    }
    const d = down.current
    down.current = null
    if (!d) return
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6
    if (d.started && !moved) return // the click that started the route
    // touch-style "press on a pad, drag, release" commits the first segment too
    commit(w)
  }

  /* ---------------- keyboard ---------------- */

  const cycleWidth = useCallback(() => {
    setTrackW((w) => {
      const i = WIDTHS.findIndex((x) => Math.abs(x - w) < 1e-6)
      return WIDTHS[(i + 1) % WIDTHS.length]
    })
  }, [])
  const cycleCorner = useCallback(() => setCorner((c) => CORNERS[(CORNERS.indexOf(c) + 1) % CORNERS.length]), [])
  const deleteSel = useCallback(() => {
    if (!selTrack) return
    setTracks((ts) => ts.filter((t) => t.id !== selTrack))
    setSelTrack(null)
  }, [selTrack])

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === 'w' && e.shiftKey) {
      e.preventDefault()
      cycleWidth()
    } else if (k === 'w') {
      e.preventDefault()
      setTool('route')
    } else if (k === 'l') {
      e.preventDefault()
      cycleCorner()
    } else if (k === 'escape') {
      if (routing) stop()
      else if (selTrack) setSelTrack(null)
      else setTool('select')
    } else if (k === 'backspace') {
      e.preventDefault()
      if (routing) undoSegment()
      else deleteSel()
    } else if (k === 'delete') {
      e.preventDefault()
      deleteSel()
    }
  }

  const reset = () => {
    setTracks(startTracks())
    setRouting(null)
    setSelTrack(null)
    setCursor(null)
  }

  /* ---------------- render helpers ---------------- */

  const fit = narrow ? { x: -0.5, y: -5, w: 31, h: 36 } : { x: -10.5, y: -1, w: 41.5, h: 28 }
  const remaining = conn.ratsnest.length
  const hoverPad = cursor?.pad
  const highlight = routing?.net ?? (tool === 'route' ? hoverPad?.net : undefined) ?? null
  const errorItems = useMemo(() => {
    const out = new Set<string>()
    for (const e of liveErrors) {
      if (e.kind !== 'short') e.items.forEach((i) => out.add(i))
      else {
        // a short lights up a whole copper island; point at the learner's own tracks when they are involved
        const tr = e.items.filter((i) => i.startsWith('track:'))
        const mine = tr.filter((i) => i.startsWith('track:lt') || i === 'track:__live')
        ;(mine.length ? mine : tr).forEach((i) => out.add(i))
      }
    }
    return out
  }, [liveErrors])
  const selT = selTrack ? tracks.find((t) => t.id === selTrack) : undefined
  const status = statusText()

  function statusText() {
    if (msg) return msg
    if (tool === 'select') return { text: selT ? `Track selected (${selT.width} mm). Delete removes it.` : 'Select tool: click a track to select it.', tone: 'info' as const }
    if (routing) {
      const n = routing.net ?? 'no net'
      return { text: `Routing ${n}: click to drop a corner, then click a ${n} pad to finish.`, tone: 'info' as const }
    }
    if (hoverPad) return { text: `${hoverPad.key}${hoverPad.net ? ` · ${hoverPad.net}` : ''}: click to start a track here.`, tone: 'info' as const }
    return { text: remaining ? 'Click a pad with an airwire to start a track.' : 'Every net is routed.', tone: remaining ? ('info' as const) : ('good' as const) }
  }

  return (
    <div
      ref={wrapRef}
      className="l10-scene"
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        if (tool === 'select' && (e.target as Element).getAttribute?.('data-bg') === '1') bgDown.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        const b = bgDown.current
        bgDown.current = null
        if (b && Math.hypot(e.clientX - b.x, e.clientY - b.y) < 5) setSelTrack(null)
      }}
      aria-label="Routing editor. W route tool, Shift+W cycles width, L changes corner style, Backspace removes the last segment, Escape stops."
    >
      <PcbCanvas
        ref={canvasRef}
        fit={fit}
        theme="eda"
        grid={1}
        onPointerDown={tool === 'route' ? onDown : undefined}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onContextMenu={() => routing && stop()}
        cursor={tool === 'route' ? 'crosshair' : 'default'}
        ariaLabel="Blinky routing canvas"
      >
        <BoardView doc={liveDoc} conn={liveConn} highlightNet={highlight} />
        <ErrorGlow doc={liveDoc} conn={liveConn} items={errorItems} />
        {selT && (
          <polyline
            points={selT.pts.map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke="#fff"
            strokeWidth={0.08}
            strokeDasharray="0.3 0.2"
            className="l10-sel"
            style={{ pointerEvents: 'none' }}
          />
        )}
        {routing && livePts && <RouteCursor pts={routing.pts} live={livePts} width={trackW} />}
        {cursor?.pad && <PadRing pad={cursor.pad} net={routing?.net} routing={!!routing} />}
        <DrcMarkers errors={liveErrors} />
      </PcbCanvas>

      <FloatingCard title="Router" subtitle={<>Click a pad to start, click to add corners, click a matching pad to finish.</>}>
        <Segmented
          label="Tool"
          options={[
            { value: 'route', label: 'Route (W)' },
            { value: 'select', label: 'Select' },
          ]}
          value={tool}
          onChange={(t) => {
            if (routing) stop()
            setTool(t)
          }}
        />
        <Segmented
          label={
            <>
              Track width <span className="l10-key">Shift+W</span>
            </>
          }
          options={WIDTHS.map((w) => ({ value: w, label: `${w.toFixed(2).replace(/0$/, '')}` }))}
          value={trackW}
          onChange={setTrackW}
          accent
        />
        <Segmented
          label={
            <>
              Corner <span className="l10-key">L</span>
            </>
          }
          options={CORNERS.map((c) => ({ value: c, label: cornerLabel[c] }))}
          value={corner}
          onChange={setCorner}
        />
        <NetList conn={conn} highlight={highlight} />
        <div className="l10-stats">
          <div>
            <span className="eyebrow">Airwires</span>
            <b className={`mono ${remaining ? '' : 'is-good'}`}>{remaining}</b>
          </div>
          <div>
            <span className="eyebrow">DRC errors</span>
            <b className={`mono ${errors.length ? 'is-bad' : 'is-good'}`}>{errors.length}</b>
          </div>
        </div>
        {errors.length > 0 && <div className="l10-err">{errors[0].message}</div>}
        <div className="l10-keys">
          <span>
            <Kbd>Backspace</Kbd> undo corner
          </span>
          <span>
            <Kbd>Esc</Kbd> stop
          </span>
          <span>
            <Kbd>Del</Kbd> delete track
          </span>
        </div>
      </FloatingCard>

      <div className={`l10-status l10-status--${status.tone} ${narrow ? 'is-narrow' : ''}`} aria-live="polite">
        {status.text}
      </div>

      {calcOpen && (
        <Calculator
          value={calc}
          onChange={setCalc}
          routerWidth={trackW}
          onUse={(w) => {
            setTrackW(w)
            setTool('route')
            flash(`Router width set to ${w} mm`, 'good')
          }}
          onClose={() => setCalcOpen(false)}
          narrow={narrow}
        />
      )}

      <SceneToolbar>
        {routing ? (
          <>
            <Button size="sm" variant="ghost" onClick={undoSegment} aria-label="Undo last segment (Backspace)">
              <IconUndo size={15} /> {!narrow && 'Undo'}
            </Button>
            <Button size="sm" variant="ghost" onClick={stop} aria-label="Stop routing (Esc)">
              <IconCheck size={15} /> Stop
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" icon active={tool === 'route'} onClick={() => setTool('route')} aria-label="Route tool (W)" title="Route (W)">
              <IconRoute size={16} />
            </Button>
            <Button size="sm" variant="ghost" icon active={tool === 'select'} onClick={() => setTool('select')} aria-label="Select tool" title="Select">
              <IconPointer size={16} />
            </Button>
          </>
        )}
        <span className="scene-toolbar__sep" />
        <Button size="sm" variant="ghost" onClick={cycleWidth} aria-label={`Track width ${trackW} mm, click to change`} title="Width (Shift+W)">
          <span className="l10-wswatch" style={{ height: Math.max(2, trackW * 6) }} />
          <span className="mono">{trackW}</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={cycleCorner} aria-label={`Corner style ${cornerLabel[corner]}, click to change`} title="Corner (L)">
          <span className="mono">{cornerLabel[corner]}</span>
        </Button>
        <span className="scene-toolbar__sep" />
        {selT && !routing && (
          <Button size="sm" variant="ghost" onClick={deleteSel} aria-label="Delete selected track">
            <IconTrash size={15} />
          </Button>
        )}
        <Button size="sm" variant="ghost" active={calcOpen} onClick={() => setCalcOpen((o) => !o)} aria-label="Trace width calculator">
          <IconWave size={15} /> {narrow ? 'Calc' : 'Width calc'}
        </Button>
        <Button size="sm" variant="ghost" icon onClick={reset} aria-label="Reset tracks" title="Reset">
          <IconReset size={15} />
        </Button>
      </SceneToolbar>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function NetList({ conn, highlight }: { conn: Connectivity; highlight: string | null }) {
  return (
    <div className="l10-nets">
      {NETS.map((n) => {
        const done = conn.complete.has(n)
        return (
          <span key={n} className={`l10-net ${done ? 'is-done' : ''} ${highlight === n ? 'is-hl' : ''}`} title={netInfo[n].about}>
            <i style={{ background: netInfo[n].color }} />
            {n}
            {done && <IconCheck size={11} />}
          </span>
        )
      })}
    </div>
  )
}

function RouteCursor({ pts, live, width }: { pts: Vec[]; live: Vec[]; width: number }) {
  const end = live[live.length - 1]
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* the uncommitted part, drawn as a bright overlay so you can see what a click will add */}
      <polyline
        points={live.slice(Math.max(0, pts.length - 1)).map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="#fff"
        strokeOpacity={0.55}
        strokeWidth={Math.min(0.08, width / 3)}
        strokeDasharray="0.25 0.18"
        className="l10-ants"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={0.12} fill="#fff" />
      ))}
      <g transform={`translate(${end[0]} ${end[1]})`}>
        <circle r={width / 2 + 0.25} fill="none" stroke="#fff" strokeWidth={0.06} />
        <line x1={-0.9} x2={0.9} y1={0} y2={0} stroke="#fff" strokeOpacity={0.6} strokeWidth={0.04} />
        <line x1={0} x2={0} y1={-0.9} y2={0.9} stroke="#fff" strokeOpacity={0.6} strokeWidth={0.04} />
      </g>
    </g>
  )
}

function PadRing({ pad, net, routing }: { pad: WorldPad; net: string | undefined; routing: boolean }) {
  const ok = !routing || pad.net === net
  const col = ok ? '#4fe0a6' : EDA.drc
  const label = `${pad.key}${pad.net ? ` · ${pad.net}` : ''}`
  const w = label.length * 0.5 + 0.8
  const above = pad.y > 3
  return (
    <g style={{ pointerEvents: 'none' }}>
      <g transform={`translate(${pad.x} ${pad.y}) rotate(${pad.rot})`}>
        <PadGlyph pad={pad} fill="none" hole={null} inflate={0.18} stroke={col} strokeWidth={0.1} />
      </g>
      <g transform={`translate(${pad.x} ${pad.y + (above ? -Math.max(pad.w, pad.h) / 2 - 1.1 : Math.max(pad.w, pad.h) / 2 + 1.1)})`}>
        <rect x={-w / 2} y={-0.6} width={w} height={1.2} rx={0.3} fill="rgba(12,14,12,0.9)" stroke={col} strokeWidth={0.05} />
        <text className="l10-padlabel" textAnchor="middle" dominantBaseline="central" fill={col}>
          {label}
        </text>
      </g>
    </g>
  )
}

/** Magenta halo around copper that breaks a rule. */
function ErrorGlow({ doc, conn, items }: { doc: BoardDoc; conn: Connectivity; items: Set<string> }) {
  if (!items.size) return null
  return (
    <g style={{ pointerEvents: 'none' }} className="l10-glow">
      {doc.tracks
        .filter((t) => items.has(`track:${t.id}`))
        .map((t) => (
          <polyline
            key={t.id}
            points={t.pts.map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke={EDA.drc}
            strokeOpacity={0.55}
            strokeWidth={t.width + 0.22}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      {conn.pads
        .filter((p) => items.has(`pad:${p.key}`))
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill="none" hole={null} inflate={0.12} stroke={EDA.drc} strokeWidth={0.12} />
          </g>
        ))}
    </g>
  )
}

