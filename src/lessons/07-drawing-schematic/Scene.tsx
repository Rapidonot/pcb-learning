import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMission } from '../mission'
import { Button, FloatingCard } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconCheck, IconFlip, IconRedo, IconReset, IconSpark, IconTrash, IconUndo, IconX, IconWarn } from '@/components/icons'
import { PcbCanvas, type PcbCanvasHandle } from '@/pcb/PcbCanvas'
import { blinkySchematic, SCH_BOUNDS, type SchDoc, type SchWire } from '@/pcb/schematic'
import { netlist } from '@/pcb/project'
import type { Vec } from '@/pcb/geom'
import { fitInsets, netColor, netGraph, SchDrawing, useElementSize, useUnitsPerPx, usePrefersReducedMotion } from '../06-reading-schematics/schKit'
import {
  cloneWires,
  describePins,
  lRoute,
  NET_ORDER,
  netStatus,
  pick,
  pointTargets,
  REF_WIRES,
  refWire,
  same,
  simplify,
  snapV,
  type Axis,
  type NetName,
  type NetStatus,
  type Target,
} from './editor'

const BASE = blinkySchematic()
let wid = 0
const newWireId = () => `lw${++wid}`

interface Draft {
  pts: Vec[]
  axis: Axis
  startId: string
}

/* Blink timing for the finished circuit: R1 = 1k, R2 = 47k, C1 = 10 µF */
const R1 = 1e3
const R2 = 47e3
const C1 = 10e-6
const T_HIGH = 0.693 * (R1 + R2) * C1
const T_LOW = 0.693 * R2 * C1
const FREQ = 1 / (T_HIGH + T_LOW)

export function Scene() {
  const mission = useMission()
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<PcbCanvasHandle>(null)
  const size = useElementSize(rootRef)
  const compact = size.w > 0 && size.w < 640
  const reduced = usePrefersReducedMotion()
  const coarse = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches, [])

  const [wires, setWires] = useState<SchWire[]>([])
  const [past, setPast] = useState<SchWire[][]>([])
  const [future, setFuture] = useState<SchWire[][]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [flip, setFlip] = useState(false)
  const [cursor, setCursor] = useState<Vec | null>(null)
  const [hoverT, setHoverT] = useState<Target | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [focusNet, setFocusNet] = useState<NetName | null>(null)
  const [fresh, setFresh] = useState<string[]>([])
  const [auto, setAuto] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [blinkOn, setBlinkOn] = useState(false)
  const pressAt = useRef<{ x: number; y: number } | null>(null)

  const doc: SchDoc = useMemo(() => ({ ...BASE, wires }), [wires])
  const graph = useMemo(() => netGraph(doc, netlist), [doc])
  const status = useMemo(() => netStatus(doc), [doc])
  const targets = useMemo(() => pointTargets(doc), [doc])
  const upp = useUnitsPerPx(() => canvasRef.current?.svg, [compact])
  const hitR = Math.max(4, (coarse ? 20 : 13) * upp)

  /* ---------------- missions ---------------- */
  const vccDone = status.rows.find((r) => r.net === 'VCC')!.status === 'done'
  useEffect(() => {
    if (vccDone) mission.complete('vcc')
  }, [vccDone, mission])
  useEffect(() => {
    if (status.clean) mission.complete('clean')
  }, [status.clean, mission])

  /* ---------------- history ---------------- */
  const apply = useCallback(
    (next: SchWire[]) => {
      setPast((p) => [...p.slice(-60), wires])
      setFuture([])
      setWires(next)
    },
    [wires],
  )
  const undo = useCallback(() => {
    if (draft) {
      setDraft(null)
      return
    }
    if (!past.length || auto) return
    setFuture((f) => [wires, ...f])
    setWires(past[past.length - 1])
    setPast((p) => p.slice(0, -1))
    setSelected(null)
    mission.complete('fix')
  }, [draft, past, wires, auto, mission])
  const redo = useCallback(() => {
    if (!future.length || auto) return
    setPast((p) => [...p, wires])
    setWires(future[0])
    setFuture((f) => f.slice(1))
  }, [future, wires, auto])
  const deleteSelected = useCallback(() => {
    if (!selected) return
    apply(wires.filter((w) => w.id !== selected))
    setSelected(null)
    mission.complete('fix')
  }, [selected, wires, apply, mission])

  const markFresh = (ids: string[]) => {
    setFresh((f) => [...f, ...ids])
    window.setTimeout(() => setFresh((f) => f.filter((x) => !ids.includes(x))), 700)
  }

  /* ---------------- drawing ---------------- */
  const axisFor = (d: Draft): Axis => {
    let a: Axis = d.axis
    if (d.pts.length >= 2) {
      const [p, q] = [d.pts[d.pts.length - 2], d.pts[d.pts.length - 1]]
      a = p[1] === q[1] ? 'v' : 'h'
    }
    return flip ? (a === 'h' ? 'v' : 'h') : a
  }

  const commit = (pts: Vec[]) => {
    const clean = simplify(pts)
    if (clean.length < 2) return
    const id = newWireId()
    apply([...wires, { id, pts: clean }])
    markFresh([id])
    // first real wire: it must join at least two things
    mission.complete('first')
  }

  const handlePress = (world: Vec) => {
    if (auto) return
    setNote(null)
    const t = pick(doc, world, hitR, targets)
    if (!draft) {
      if (t && t.kind !== 'wire') {
        setDraft({ pts: [t.p], axis: t.axis, startId: `${t.kind}:${t.id}` })
        setFlip(false)
        setSelected(null)
        setCursor(t.p)
      } else if (t && t.kind === 'wire') {
        setSelected(t.id)
      } else setSelected(null)
      return
    }
    const last = draft.pts[draft.pts.length - 1]
    if (t && draft.pts.length === 1 && same(t.p, draft.pts[0])) {
      // tapped the start again: cancel
      setDraft(null)
      return
    }
    if (t) {
      commit([...draft.pts, ...lRoute(last, t.p, axisFor(draft))])
      setDraft(null)
      setFlip(false)
      return
    }
    const p = snapV(world)
    if (same(p, last)) return
    setDraft({ ...draft, pts: [...draft.pts, ...lRoute(last, p, axisFor(draft))] })
    setFlip(false)
  }

  const busy = !!draft || !!selected
  const onCanvasDown = (e: React.PointerEvent, world: Vec) => {
    if (e.button !== 0) return
    pressAt.current = { x: e.clientX, y: e.clientY }
    handlePress(world)
  }
  const onHitDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.altKey) return
    pressAt.current = { x: e.clientX, y: e.clientY }
    const world = canvasRef.current?.toWorld(e.clientX, e.clientY)
    if (world) handlePress(world)
  }
  const onMove = (_e: React.PointerEvent, world: Vec) => {
    const t = pick(doc, world, hitR, targets)
    setHoverT(t)
    setCursor(t ? t.p : snapV(world))
  }
  const onUp = (e: React.PointerEvent, world: Vec) => {
    const p = pressAt.current
    pressAt.current = null
    // press-drag-release from a pin also draws a wire
    if (draft && draft.pts.length === 1 && p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 14) handlePress(world)
  }

  /* ---------------- keyboard ---------------- */
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key
    if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    } else if ((e.ctrlKey || e.metaKey) && (k === 'y' || k === 'Y')) {
      e.preventDefault()
      redo()
    } else if (k === ' ') {
      e.preventDefault()
      if (draft) setFlip((f) => !f)
    } else if (k === 'Escape') {
      setDraft(null)
      setSelected(null)
    } else if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault()
      if (draft) {
        if (draft.pts.length > 1) setDraft({ ...draft, pts: draft.pts.slice(0, -1) })
        else setDraft(null)
      } else deleteSelected()
    }
  }

  /* ---------------- hint & show me ---------------- */
  const nextNet = status.rows.find((r) => r.status !== 'done' && r.status !== 'short')
  const hint = () => {
    if (!nextNet) {
      const s = status.rows.find((r) => r.status === 'short')
      setNote(s ? `${s.net} is shorted to ${s.shortWith.join(', ')}. Tap the red wire and delete it, or undo.` : 'Everything is connected. Nice work!')
      return
    }
    setFocusNet(nextNet.net)
  }
  const showMe = () => {
    if (auto) return
    setDraft(null)
    setSelected(null)
    if (!nextNet) {
      hint()
      return
    }
    const net = nextNet.net
    const add = REF_WIRES[net]
      .map(refWire)
      .filter((rw) => !wires.some((w) => w.pts.length === rw.pts.length && w.pts.every((p, i) => same(p, rw.pts[i]))))
      .map((rw) => ({ id: newWireId(), pts: rw.pts.map((p) => [...p] as Vec) }))
    if (!add.length) return
    setFocusNet(net)
    setPast((p) => [...p, wires])
    setFuture([])
    setAuto(true)
    const step = reduced ? 0 : 320
    add.forEach((w, i) => {
      window.setTimeout(() => {
        setWires((ws) => [...ws, w])
        markFresh([w.id])
        if (i === add.length - 1) {
          setAuto(false)
          window.setTimeout(() => setFocusNet((f) => (f === net ? null : f)), 900)
        }
      }, i * step)
    })
  }
  const reset = () => {
    if (!wires.length) return
    apply([])
    setDraft(null)
    setSelected(null)
  }

  // clear hint focus once that net is finished
  useEffect(() => {
    if (focusNet && status.rows.find((r) => r.net === focusNet)?.status === 'done' && !auto) {
      const t = window.setTimeout(() => setFocusNet(null), 900)
      return () => window.clearTimeout(t)
    }
  }, [focusNet, status, auto])

  // blink the LED once everything is clean
  useEffect(() => {
    if (!status.clean) {
      setBlinkOn(false)
      return
    }
    let on = true
    let t = 0
    const loop = () => {
      setBlinkOn(on)
      t = window.setTimeout(() => {
        on = !on
        loop()
      }, (on ? T_HIGH : T_LOW) * 1000)
    }
    loop()
    return () => window.clearTimeout(t)
  }, [status.clean])

  /* ---------------- render ---------------- */
  const badWires = useMemo(() => {
    const bad = new Set<number>()
    graph.groups.forEach((g) => {
      const nets = new Set(g.pins.map((k) => netlist[k]).filter(Boolean))
      if (nets.size > 1) bad.add(g.idx)
    })
    return new Set(wires.filter((w) => bad.has(graph.groupOf.get(`wire:${w.id}`)!)).map((w) => w.id))
  }, [graph, wires])

  const focusTargets = useMemo(() => {
    if (!focusNet) return []
    const pins = Object.keys(netlist).filter((k) => netlist[k] === focusNet)
    const pts: Vec[] = targets.filter((t) => t.kind === 'pin' && pins.includes(t.id)).map((t) => t.p)
    for (const f of BASE.flags) if (f.name === focusNet) pts.push([f.x, f.y])
    for (const l of BASE.labels) if (l.name === focusNet) pts.push([l.x, l.y])
    return pts
  }, [focusNet, targets])

  const connected = (p: Vec) => wires.some((w) => w.pts.some((q, i) => i < w.pts.length - 1 && pointOnSeg(p, q, w.pts[i + 1])))

  const draftAxis = draft ? axisFor(draft) : 'h'
  const preview = draft && cursor ? [...draft.pts, ...lRoute(draft.pts[draft.pts.length - 1], cursor, draftAxis)] : draft?.pts

  const insets = compact ? { l: 6, r: 6, t: 74, b: 64 } : { l: 286, r: 14, t: 52, b: 66 }
  const fit = size.w > 0 ? fitInsets(SCH_BOUNDS, size, insets, 6) : SCH_BOUNDS

  const doneCount = status.rows.filter((r) => r.status === 'done').length
  const modeText = status.clean
    ? `Schematic check passed. The LED would blink at ${FREQ.toFixed(1)} Hz.`
    : auto
      ? 'Watch: drawing the wires for you…'
      : draft
        ? coarse
          ? 'Tap a pin, flag or wire to finish. Tap empty space for a corner.'
          : 'Click a pin, flag or wire to finish · click empty space for a corner · Space flips the bend · Esc cancels'
        : selected
          ? 'Wire selected. Delete removes it.'
          : coarse
            ? 'Tap a pin to start a wire, then tap where it should end.'
            : 'Click a pin to start a wire. Click another pin, flag or wire to finish it.'

  const canvas = (
    <PcbCanvas
      ref={canvasRef}
      fit={fit}
      pad={0}
      theme="schematic"
      grid={10}
      majorEvery={5}
      interactive
      zoomControls={!compact}
      cursor={draft ? 'crosshair' : 'default'}
      onPointerDown={busy ? onCanvasDown : undefined}
      onPointerMove={onMove}
      onPointerUp={onUp}
      ariaLabel="Schematic editor: wire up Blinky"
    >
      <SchDrawing
        doc={doc}
        graph={graph}
        active={null}
        showPinNumbers
        litRefs={status.clean && blinkOn ? ['D1'] : []}
        wireStyle={(w) => {
          const isFresh = fresh.includes(w.id)
          if (w.id === selected) return { color: '#e0542c', width: 2.4, glow: '#e0542c', className: isFresh ? 'l07-draw' : undefined }
          if (badWires.has(w.id)) return { color: '#cf3f2b', width: 2, glow: '#cf3f2b', className: isFresh ? 'l07-draw' : undefined }
          if (isFresh) return { className: 'l07-draw', width: 1.8 }
          return undefined
        }}
      >
        {/* open connection points */}
        <g style={{ pointerEvents: 'none' }}>
          {targets
            .filter((t) => t.kind !== 'end' && !connected(t.p))
            .map((t) => (
              <circle key={`${t.kind}${t.id}`} cx={t.p[0]} cy={t.p[1]} r={2} fill="var(--sch-bg)" stroke={t.kind === 'pin' ? '#9a9a9a' : '#1b4fbf'} strokeWidth={0.9} />
            ))}
        </g>

        {/* hint rings */}
        {focusTargets.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="none" stroke={netColor(focusNet)} strokeWidth={1.4} className="pin-hint" style={{ pointerEvents: 'none' }} />
        ))}

        {/* hit layer (idle mode) */}
        <g onPointerDown={busy ? undefined : onHitDown} style={{ cursor: 'pointer' }}>
          {wires.map((w) => (
            <polyline key={w.id} points={w.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth={hitR * 1.4} strokeLinecap="round" />
          ))}
          {targets.map((t) => (
            <circle key={`${t.kind}${t.id}${t.p.join()}`} cx={t.p[0]} cy={t.p[1]} r={hitR} fill="transparent" style={{ cursor: 'crosshair' }} />
          ))}
        </g>

        {/* rubber band */}
        {preview && preview.length > 0 && (
          <g style={{ pointerEvents: 'none' }}>
            <polyline points={preview.map((p) => p.join(',')).join(' ')} fill="none" stroke="#e0542c" strokeOpacity={0.18} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={preview.map((p) => p.join(',')).join(' ')} fill="none" stroke="#e0542c" strokeWidth={1.5} strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" className="l07-ants" />
            {draft!.pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 2.8 : 1.8} fill="#e0542c" />
            ))}
          </g>
        )}
        {/* snap ring */}
        {hoverT && !auto && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={hoverT.p[0]} cy={hoverT.p[1]} r={5} fill="none" stroke="#e0542c" strokeWidth={1.2} />
            {draft && hoverT.kind !== 'wire' && <circle cx={hoverT.p[0]} cy={hoverT.p[1]} r={2} fill="#e0542c" />}
          </g>
        )}
      </SchDrawing>
    </PcbCanvas>
  )

  const toolbar = (
    <SceneToolbar>
      <Button size="sm" variant="ghost" icon onClick={undo} disabled={!past.length && !draft} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)">
        <IconUndo size={16} />
      </Button>
      {!compact && (
        <Button size="sm" variant="ghost" icon onClick={redo} disabled={!future.length} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)">
          <IconRedo size={16} />
        </Button>
      )}
      <Button size="sm" variant="ghost" icon onClick={deleteSelected} disabled={!selected} aria-label="Delete selected wire" title="Delete selected wire (Delete)">
        <IconTrash size={16} />
      </Button>
      <span className="scene-toolbar__sep" />
      {draft ? (
        <>
          <Button size="sm" variant="ghost" onClick={() => setFlip((f) => !f)} title="Flip the bend (Space)">
            <IconFlip size={15} /> {compact ? 'Flip' : 'Flip bend'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)} title="Cancel the wire (Esc)">
            <IconX size={15} /> Cancel
          </Button>
        </>
      ) : compact ? (
        <>
          <Button size="sm" variant="ghost" onClick={hint}>
            Hint
          </Button>
          <Button size="sm" variant="ghost" onClick={showMe} disabled={auto || status.clean}>
            <IconSpark size={15} /> Show me
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={reset} disabled={!wires.length || auto} title="Remove every wire">
          <IconReset size={15} /> Clear
        </Button>
      )}
    </SceneToolbar>
  )

  const focusRow = focusNet ? status.rows.find((r) => r.net === focusNet) : null
  const hintText = focusRow && focusRow.status !== 'done' && (
    <>
      <b>{focusRow.net}:</b> join {describePins(focusRow.net).join(', ')}
      {focusRow.net === 'VCC' && '. Run one wire to the VCC flag, then T into it.'}
      {focusRow.net === 'GND' && '. Each one can go to its nearby GND flag.'}
      {focusRow.net === 'THR' && '. Route through the two THR labels: same name, same net.'}
    </>
  )

  return (
    <div
      ref={rootRef}
      className={`l07 ${compact ? 'l07--compact' : ''} ${status.clean ? 'is-clean' : ''}`}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDownCapture={() => rootRef.current?.focus({ preventScroll: true })}
      aria-label="Wiring editor. Space flips the bend, Escape cancels, Delete removes, Ctrl+Z undoes."
    >
      {canvas}

      <div className={`l07-mode ${status.clean ? 'is-clean' : draft ? 'is-drawing' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
        <span className="l07-mode__tag mono">{status.clean ? 'DRC ✓' : draft ? 'WIRE' : 'WIRE TOOL'}</span>
        <span className="l07-mode__text">{note ?? modeText}</span>
      </div>

      {compact ? (
        <div className="l07-strip" onPointerDown={(e) => e.stopPropagation()}>
          {status.rows.map((r) => (
            <button key={r.net} className={`l07-chip is-${r.status} ${focusNet === r.net ? 'is-focus' : ''}`} onClick={() => setFocusNet((f) => (f === r.net ? null : r.net))} style={{ ['--c' as string]: netColor(r.net) }}>
              <StatusIcon s={r.status} />
              <span className="mono">{r.net}</span>
            </button>
          ))}
        </div>
      ) : (
        <FloatingCard title="Netlist check" subtitle={`${doneCount} of 7 nets complete. Live, like Design › Check DRC.`} width={262}>
          <div className="l07-rows">
            {status.rows.map((r) => (
              <NetRow key={r.net} r={r} focus={focusNet === r.net} onClick={() => setFocusNet((f) => (f === r.net ? null : r.net))} />
            ))}
          </div>
          {hintText && <div className="l07-hint">{hintText}</div>}
          <div className="l07-actions">
            <Button size="sm" onClick={hint} disabled={status.clean}>
              Hint
            </Button>
            <Button size="sm" variant="primary" onClick={showMe} disabled={auto || status.clean}>
              <IconSpark size={14} /> Show me
            </Button>
          </div>
        </FloatingCard>
      )}

      {compact && hintText && <div className="l07-hint l07-hint--float">{hintText}</div>}

      {status.clean && (
        <div className="l07-win" aria-live="polite">
          <span className={`l07-win__led ${blinkOn ? 'is-on' : ''}`} />
          <div>
            <div className="l07-win__title mono">0 errors · 7/7 nets</div>
            <div className="l07-win__sub">Blinking at {FREQ.toFixed(2)} Hz</div>
          </div>
        </div>
      )}
      {toolbar}
    </div>
  )
}

function pointOnSeg(p: Vec, a: Vec, b: Vec) {
  if (a[0] === b[0]) return Math.abs(p[0] - a[0]) < 0.5 && p[1] >= Math.min(a[1], b[1]) - 0.5 && p[1] <= Math.max(a[1], b[1]) + 0.5
  if (a[1] === b[1]) return Math.abs(p[1] - a[1]) < 0.5 && p[0] >= Math.min(a[0], b[0]) - 0.5 && p[0] <= Math.max(a[0], b[0]) + 0.5
  return false
}

function StatusIcon({ s }: { s: NetStatus['status'] }) {
  if (s === 'done') return <IconCheck size={12} />
  if (s === 'short') return <IconWarn size={12} />
  return <i className="l07-dot" />
}

function NetRow({ r, focus, onClick }: { r: NetStatus; focus: boolean; onClick: () => void }) {
  return (
    <button className={`l07-row is-${r.status} ${focus ? 'is-focus' : ''}`} onClick={onClick} style={{ ['--c' as string]: netColor(r.net) }} title={`Show the ${r.net} pins`}>
      <span className="l07-row__st">
        <StatusIcon s={r.status} />
      </span>
      <span className="l07-row__name mono">{r.net}</span>
      {r.status === 'short' ? (
        <span className="l07-row__short mono">short ↔ {r.shortWith.join(', ')}</span>
      ) : (
        <span className="l07-row__meter">
          <span style={{ width: `${r.progress * 100}%` }} />
        </span>
      )}
      <span className="l07-row__n mono">
        {r.pins.length - r.pieces + 1}/{r.pins.length}
      </span>
    </button>
  )
}
