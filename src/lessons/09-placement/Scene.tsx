import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useMission } from '../mission'
import { FloatingCard, Button, Meter, Kbd } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconRotate, IconEye, IconEyeOff, IconReset } from '@/components/icons'
import { PcbCanvas, type PcbCanvasHandle } from '@/pcb/PcbCanvas'
import { BoardView, PadGlyph, partTransform } from '@/pcb/render'
import { getFootprint } from '@/pcb/footprints'
import { analyze, type BoardDoc, type PartInst } from '@/pcb/board'
import { stages, placed as refPlaced, parts as projectParts } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { snap, type Vec } from '@/pcb/geom'
import { measure, TARGETS, type PlacementMetrics } from './metrics'

const GRID = 0.5

/** Remember the doc shell (size, netlist) once — only parts change in this scene. */
const shell = stages.converted()

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

export function Scene() {
  const mission = useMission()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<PcbCanvasHandle>(null)
  const width = useWidth(wrapRef)
  const narrow = width < 640

  const [parts, setParts] = useState<PartInst[]>(() => shell.parts)
  const [selected, setSelected] = useState<string | null>(null)
  const [ghost, setGhost] = useState(false)
  const [touched, setTouched] = useState(false)
  const drag = useRef<{ ref: string; off: Vec; pointerId: number } | null>(null)
  const bgDown = useRef<{ x: number; y: number } | null>(null)

  const doc: BoardDoc = useMemo(() => ({ ...shell, parts }), [parts])
  const conn = useMemo(() => analyze(doc), [doc])
  const m: PlacementMetrics = useMemo(() => measure(doc, conn), [doc, conn])

  // missions
  useEffect(() => {
    if (m.onBoard === m.total && m.overlaps.size === 0) mission.complete('onboard')
    if (m.allOnBoard && m.decouple !== null && m.decouple <= TARGETS.decouple) mission.complete('decouple')
    if (m.clean && m.crossings <= TARGETS.crossings) mission.complete('untangle')
    if (m.clean && m.length <= TARGETS.length) mission.complete('short')
  }, [m, mission])

  /* ---------------- interaction ---------------- */

  const focusScene = () => wrapRef.current?.focus({ preventScroll: true })

  const onPartDown = useCallback(
    (ref: string, e: RPointerEvent<SVGGElement>) => {
      if (e.button !== 0) return
      const c = canvasRef.current
      if (!c) return
      const w = c.toWorld(e.clientX, e.clientY)
      const p = parts.find((q) => q.ref === ref)
      if (!p) return
      drag.current = { ref, off: [p.x - w[0], p.y - w[1]], pointerId: e.pointerId }
      c.svg?.setPointerCapture(e.pointerId)
      setSelected(ref)
      setTouched(true)
      focusScene()
    },
    [parts],
  )

  const onMove = useCallback((e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    const nx = snap(w[0] + d.off[0], GRID)
    const ny = snap(w[1] + d.off[1], GRID)
    setParts((ps) => {
      const i = ps.findIndex((p) => p.ref === d.ref)
      if (i < 0 || (ps[i].x === nx && ps[i].y === ny)) return ps
      const next = ps.slice()
      next[i] = { ...ps[i], x: nx, y: ny }
      return next
    })
  }, [])

  const onUp = useCallback(() => {
    drag.current = null
  }, [])

  const rotateSel = useCallback(() => {
    if (!selected) return
    // EasyEDA's Space = "rotate left" (counter-clockwise). Our +rot is clockwise on screen.
    setParts((ps) => ps.map((p) => (p.ref === selected ? { ...p, rot: (p.rot + 270) % 360 } : p)))
  }, [selected])

  const nudge = (dx: number, dy: number) => {
    if (!selected) return
    setParts((ps) => ps.map((p) => (p.ref === selected ? { ...p, x: snap(p.x + dx, GRID), y: snap(p.y + dy, GRID) } : p)))
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'r' || e.key === 'R') {
      if (!selected) return
      e.preventDefault()
      rotateSel()
    } else if (e.key === 'Escape') setSelected(null)
    else if (e.key.startsWith('Arrow') && selected) {
      e.preventDefault()
      const s = e.shiftKey ? 2 : GRID
      if (e.key === 'ArrowLeft') nudge(-s, 0)
      if (e.key === 'ArrowRight') nudge(s, 0)
      if (e.key === 'ArrowUp') nudge(0, -s)
      if (e.key === 'ArrowDown') nudge(0, s)
    } else if (e.key === 'Tab' && !e.shiftKey && document.activeElement === wrapRef.current) {
      // cycle selection through the parts for keyboard users
      e.preventDefault()
      const i = parts.findIndex((p) => p.ref === selected)
      setSelected(parts[(i + 1) % parts.length].ref)
    }
  }

  const reset = () => {
    setParts(stages.converted().parts)
    setSelected(null)
  }

  const fit = narrow ? { x: -1, y: -6, w: 37, h: 50 } : { x: -13, y: -1.5, w: 49, h: 43 }
  const sel = selected ? parts.find((p) => p.ref === selected) : undefined
  const selInfo = selected ? projectParts.find((p) => p.ref === selected) : undefined
  const u1 = parts.find((p) => p.ref === 'U1')!

  return (
    <div
      ref={wrapRef}
      className="l09-scene"
      tabIndex={0}
      aria-label="Placement editor. Drag parts onto the board. Space rotates the selected part, arrow keys nudge it, Tab selects the next part."
      onKeyDown={onKey}
      onPointerDown={(e) => {
        if ((e.target as Element).getAttribute?.('data-bg') === '1') bgDown.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        const b = bgDown.current
        bgDown.current = null
        if (b && Math.hypot(e.clientX - b.x, e.clientY - b.y) < 5) setSelected(null)
      }}
    >
      <PcbCanvas
        ref={canvasRef}
        fit={fit}
        theme="eda"
        grid={1}
        onPointerMove={onMove}
        onPointerUp={onUp}
        ariaLabel="Blinky PCB placement canvas"
      >
        {ghost && <Ghost />}
        <BoardView doc={doc} conn={conn} vis={{ ratsnest: false }} selectedRefs={selected ? [selected] : []} onPartPointerDown={onPartDown} />
        <Overlaps parts={parts} bad={m.overlaps} />
        <Airwires m={m} selected={selected} />
        <Decoupling m={m} />
        {!touched && <DragHint x={u1.x} y={u1.y - 4.2} />}
        <text x={15} y={-0.9} className="l09-boardlabel" textAnchor="middle">
          BOARD 30 × 26 mm
        </text>
      </PcbCanvas>

      <FloatingCard title="Placement check" subtitle={<>Drag parts onto the board. Select one and press <Kbd>Space</Kbd> to rotate.</>}>
        <Metrics m={m} />
        {sel && selInfo && (
          <div className="l09-sel">
            <div className="row" style={{ gap: 6 }}>
              <span className="l09-sel__ref mono">{sel.ref}</span>
              <span className="l09-sel__val">{selInfo.value}</span>
              <span className="grow" />
              <span className="mono l09-sel__fp">{getFootprint(sel.fp).pkg} · {sel.rot}°</span>
            </div>
            <div className="l09-sel__role">{selInfo.role}</div>
          </div>
        )}
      </FloatingCard>

      {narrow && <MiniStatus m={m} />}

      <SceneToolbar>
        <Button size="sm" variant="ghost" onClick={rotateSel} disabled={!selected} aria-label="Rotate selected part (Space)">
          <IconRotate size={15} /> Rotate{!narrow && <Kbd>Space</Kbd>}
        </Button>
        <span className="scene-toolbar__sep" />
        <Button size="sm" variant="ghost" active={ghost} onClick={() => setGhost((g) => !g)} aria-pressed={ghost}>
          {ghost ? <IconEye size={15} /> : <IconEyeOff size={15} />} Ghost
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} aria-label="Reset placement">
          <IconReset size={15} /> Reset
        </Button>
      </SceneToolbar>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Ghost() {
  return (
    <g style={{ pointerEvents: 'none' }} className="l09-ghost">
      {refPlaced.map((p) => {
        const fp = getFootprint(p.fp)
        return (
          <g key={p.ref} transform={partTransform(p)}>
            <rect
              x={-fp.courtyard.w}
              y={-fp.courtyard.h}
              width={fp.courtyard.w * 2}
              height={fp.courtyard.h * 2}
              rx={0.2}
              fill="rgba(140,220,255,0.05)"
              stroke="rgba(140,220,255,0.45)"
              strokeWidth={0.07}
              strokeDasharray="0.35 0.25"
            />
            {fp.pads.map((pad) => (
              <g key={pad.num} transform={`translate(${pad.x} ${pad.y})`}>
                <PadGlyph pad={pad} fill="rgba(140,220,255,0.16)" hole={null} />
              </g>
            ))}
          </g>
        )
      })}
      {refPlaced.map((p) => (
        <text key={p.ref} x={p.x} y={p.y} className="l09-ghost__ref" textAnchor="middle" dominantBaseline="central">
          {p.ref}
        </text>
      ))}
    </g>
  )
}

function Overlaps({ parts, bad }: { parts: PartInst[]; bad: Set<string> }) {
  if (!bad.size) return null
  return (
    <g style={{ pointerEvents: 'none' }}>
      {parts
        .filter((p) => bad.has(p.ref))
        .map((p) => {
          const fp = getFootprint(p.fp)
          return (
            <g key={p.ref} transform={partTransform(p)}>
              <rect
                x={-fp.courtyard.w}
                y={-fp.courtyard.h}
                width={fp.courtyard.w * 2}
                height={fp.courtyard.h * 2}
                rx={0.15}
                fill="rgba(255,70,70,0.14)"
                stroke="#ff4b4b"
                strokeWidth={0.12}
              />
            </g>
          )
        })}
    </g>
  )
}

function Airwires({ m, selected }: { m: PlacementMetrics; selected: string | null }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {m.airwires.map((r, i) => {
        const mine = selected && (r.a.ref === selected || r.b.ref === selected)
        return (
          <line
            key={i}
            x1={r.a.x}
            y1={r.a.y}
            x2={r.b.x}
            y2={r.b.y}
            stroke={mine ? '#ffffff' : EDA.ratsnest}
            strokeWidth={mine ? 0.11 : 0.07}
            opacity={selected && !mine ? 0.45 : 0.95}
          />
        )
      })}
      {m.crossPts.map((p, i) => (
        <g key={i} transform={`translate(${p[0]} ${p[1]})`}>
          <circle r={0.42} fill="none" stroke="#ffb02e" strokeWidth={0.1} />
          <circle r={0.14} fill="#ffb02e" />
        </g>
      ))}
    </g>
  )
}

function Decoupling({ m }: { m: PlacementMetrics }) {
  if (!m.decoupleLine || m.decouple === null) return null
  const [a, b] = m.decoupleLine
  const ok = m.decouple <= TARGETS.decouple
  const col = ok ? '#4fe0a6' : '#ffd166'
  // label sits beside the midpoint, pushed off the line along its normal
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const nx = -(b[1] - a[1]) / len
  const ny = (b[0] - a[0]) / len
  const s = nx > 0 ? 1 : -1
  const label = `${m.decouple.toFixed(1)} mm`
  const w = label.length * 0.5 + 0.7
  const mx = (a[0] + b[0]) / 2 + nx * s * (w / 2 + 0.4)
  const my = (a[1] + b[1]) / 2 + ny * s * 1.0
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth={0.09} strokeDasharray="0.4 0.25" />
      <circle cx={a[0]} cy={a[1]} r={0.22} fill={col} />
      <circle cx={b[0]} cy={b[1]} r={0.22} fill={col} />
      <g transform={`translate(${mx} ${my})`}>
        <rect x={-w / 2} y={-0.62} width={w} height={1.24} rx={0.3} fill="rgba(16,18,16,0.88)" stroke={col} strokeWidth={0.06} />
        <text className="l09-dim" textAnchor="middle" dominantBaseline="central" fill={col}>
          {label}
        </text>
      </g>
    </g>
  )
}

function DragHint({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
     <g className="l09-hint">
      <rect x={-5.2} y={-1.9} width={10.4} height={1.9} rx={0.95} fill="#e0542c" />
      <text y={-0.95} textAnchor="middle" dominantBaseline="central" className="l09-hint__t">
        Drag me onto the board
      </text>
      <path d="M -0.5 0 L 0 0.7 L 0.5 0 Z" fill="#e0542c" />
     </g>
    </g>
  )
}

/* ------------------------------------------------------------------ */

type Tone = 'good' | 'warn' | 'bad'

function Row({ label, value, target, tone, meter }: { label: string; value: string; target?: string; tone: Tone; meter?: number }) {
  return (
    <div className={`l09-row l09-row--${tone}`}>
      <span className="l09-row__dot" />
      <span className="l09-row__label">{label}</span>
      <span className="l09-row__value mono">{value}</span>
      {target && <span className="l09-row__target mono">{target}</span>}
      {meter !== undefined && (
        <div className="l09-row__meter">
          <Meter value={meter} color={tone === 'good' ? 'var(--good)' : tone === 'warn' ? 'var(--warn)' : 'var(--bad)'} />
        </div>
      )}
    </div>
  )
}

function Metrics({ m }: { m: PlacementMetrics }) {
  const lenTone: Tone = m.length <= TARGETS.length ? 'good' : m.length <= 125 ? 'warn' : 'bad'
  const crTone: Tone = m.crossings <= TARGETS.crossings ? 'good' : m.crossings <= 8 ? 'warn' : 'bad'
  const dTone: Tone = m.decouple === null ? 'bad' : m.decouple <= TARGETS.decouple ? 'good' : m.decouple <= 7 ? 'warn' : 'bad'
  const score = Math.round(m.score * 100)
  return (
    <div className="l09-metrics">
      <div className="l09-score">
        <div>
          <div className="eyebrow">Routability</div>
          <div className="l09-score__v mono">
            {score}
            <span>/100</span>
          </div>
        </div>
        <div className="grow">
          <Meter value={m.score} color={score >= 75 ? 'var(--good)' : score >= 45 ? 'var(--warn)' : 'var(--accent)'} />
          <div className="l09-score__note">{scoreNote(m)}</div>
        </div>
      </div>
      <Row label="On board" value={`${m.onBoard}/${m.total}`} tone={m.onBoard === m.total ? 'good' : m.onBoard > 0 ? 'warn' : 'bad'} />
      <Row label="Overlaps" value={String(m.overlapPairs)} tone={m.overlapPairs === 0 ? 'good' : 'bad'} />
      <Row label="Airwires" value={`${m.length.toFixed(0)} mm`} target={`< ${TARGETS.length}`} tone={lenTone} meter={clamp01((170 - m.length) / (170 - 64))} />
      <Row label="Crossings" value={String(m.crossings)} target={`≤ ${TARGETS.crossings}`} tone={crTone} meter={clamp01((17 - m.crossings) / 15)} />
      <Row label="C2 → U1 pin 8" value={m.decouple === null ? '—' : `${m.decouple.toFixed(1)} mm`} target={`≤ ${TARGETS.decouple}`} tone={dTone} />
    </div>
  )
}

function MiniStatus({ m }: { m: PlacementMetrics }) {
  const good = (b: boolean) => (b ? 'is-good' : '')
  return (
    <div className="l09-mini mono" aria-live="polite">
      <span className={good(m.onBoard === m.total && m.overlapPairs === 0)}>
        {m.onBoard}/{m.total}
        {m.overlapPairs > 0 && <b> ⚠{m.overlapPairs}</b>}
      </span>
      <span className={good(m.length <= TARGETS.length)}>{m.length.toFixed(0)} mm</span>
      <span className={good(m.crossings <= TARGETS.crossings)}>✕ {m.crossings}</span>
      <span className={good(m.decouple !== null && m.decouple <= TARGETS.decouple)}>C2 {m.decouple === null ? '—' : m.decouple.toFixed(1)}</span>
    </div>
  )
}

function scoreNote(m: PlacementMetrics) {
  if (m.onBoard === 0) return 'Start with U1, the chip everything connects to.'
  if (m.onBoard < m.total) return `${m.total - m.onBoard} part${m.total - m.onBoard > 1 ? 's' : ''} still off the board.`
  if (m.overlapPairs) return 'Red outlines overlap: give those parts room.'
  if (m.decouple !== null && m.decouple > TARGETS.decouple) return 'Tuck C2 right beside pin 8 (VCC).'
  if (m.crossings > TARGETS.crossings) return 'Orange rings mark crossings. Rotate or swap parts.'
  if (m.length > TARGETS.length) return 'Pull connected parts closer together.'
  return 'Lovely. This board will be easy to route.'
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
