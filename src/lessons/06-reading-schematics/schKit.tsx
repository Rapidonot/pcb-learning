/*
 * Schematic toolkit shared by lessons 6 and 7 (both owned by the same author).
 *  - netGraph(): element-level connectivity (which wires / pins / flags / labels form each net)
 *  - <SchDrawing>: a schematic renderer with net highlighting, glow and per-wire styling
 *  - fitInsets(): a PcbCanvas fit rect that keeps the drawing clear of floating cards
 *  - useElementSize(): ResizeObserver hook
 */
import { useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react'
import { pointSegDist, type Vec } from '@/pcb/geom'
import { allPins, schNets, symPins, symbols, type SchDoc, type SchWire, type WorldPin } from '@/pcb/schematic'
import { FlagGraphic, NetLabelGraphic, SCH, SymbolGraphic } from '@/pcb/SchematicView'
import { netInfo } from '@/pcb/project'

/* ------------------------------------------------------------------ */
/* Connectivity                                                        */
/* ------------------------------------------------------------------ */

export interface NetGroup {
  idx: number
  /** element ids: "wire:w1", "pin:U1.8", "flag:g1", "label:l-thr-a" */
  members: string[]
  pins: string[]
  /** resolved net name (expected-netlist majority, else flag/label name) */
  name: string | null
}

export interface NetGraph {
  groupOf: Map<string, number>
  groups: NetGroup[]
  junctions: Vec[]
  /** element id → net name (or null) */
  netOf: (id: string) => string | null
}

export function netGraph(doc: SchDoc, expected?: Record<string, string>): NetGraph {
  const parent = new Map<string, string>()
  const find = (a: string): string => {
    const p = parent.get(a) ?? a
    if (p === a) return a
    const r = find(p)
    parent.set(a, r)
    return r
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  const pins = allPins(doc)
  const pois: { id: string; p: Vec }[] = [
    ...pins.map((p) => ({ id: `pin:${p.key}`, p: [p.x, p.y] as Vec })),
    ...doc.flags.map((f) => ({ id: `flag:${f.id}`, p: [f.x, f.y] as Vec })),
    ...doc.labels.map((l) => ({ id: `label:${l.id}`, p: [l.x, l.y] as Vec })),
  ]
  const ids = [...pois.map((p) => p.id), ...doc.wires.map((w) => `wire:${w.id}`)]
  for (const id of ids) parent.set(id, id)

  for (const w of doc.wires) {
    const wid = `wire:${w.id}`
    const on = (p: Vec) => onWire(w, p)
    for (const poi of pois) if (on(poi.p)) union(wid, poi.id)
    for (const o of doc.wires) {
      if (o.id === w.id) continue
      if (on(o.pts[0]) || on(o.pts[o.pts.length - 1])) union(wid, `wire:${o.id}`)
    }
  }
  const byName = new Map<string, string>()
  for (const x of [...doc.labels.map((l) => ({ id: `label:${l.id}`, name: l.name })), ...doc.flags.map((f) => ({ id: `flag:${f.id}`, name: f.name }))]) {
    if (byName.has(x.name)) union(x.id, byName.get(x.name)!)
    else byName.set(x.name, x.id)
  }

  const roots = new Map<string, NetGroup>()
  const groups: NetGroup[] = []
  const groupOf = new Map<string, number>()
  for (const id of ids) {
    const r = find(id)
    let g = roots.get(r)
    if (!g) {
      g = { idx: groups.length, members: [], pins: [], name: null }
      roots.set(r, g)
      groups.push(g)
    }
    g.members.push(id)
    if (id.startsWith('pin:')) g.pins.push(id.slice(4))
    groupOf.set(id, g.idx)
  }
  for (const g of groups) {
    if (expected) {
      const count = new Map<string, number>()
      for (const k of g.pins) {
        const n = expected[k]
        if (n) count.set(n, (count.get(n) ?? 0) + 1)
      }
      let best: string | null = null
      let bc = 0
      for (const [n, c] of count) if (c > bc) ((best = n), (bc = c))
      g.name = best
    }
    if (!g.name) {
      const named = g.members.find((m) => m.startsWith('flag:') || m.startsWith('label:'))
      if (named) {
        const id = named.split(':')[1]
        g.name = doc.flags.find((f) => f.id === id)?.name ?? doc.labels.find((l) => l.id === id)?.name ?? null
      }
    }
  }
  const junctions = schNets(doc).junctions
  return {
    groupOf,
    groups,
    junctions,
    netOf: (id) => {
      const i = groupOf.get(id)
      return i === undefined ? null : groups[i].name
    },
  }
}

export function onWire(w: SchWire, p: Vec, tol = 0.5) {
  for (let i = 0; i < w.pts.length - 1; i++) if (pointSegDist(p, w.pts[i], w.pts[i + 1]) < tol) return true
  return false
}

/** Direction a pin sticks out of its symbol (unit-ish vector, from body to tip). */
export function pinDir(doc: SchDoc, key: string): Vec {
  const [ref, num] = key.split('.')
  const s = doc.symbols.find((x) => x.ref === ref)
  if (!s) return [1, 0]
  const p = symbols[s.sym].pins.find((q) => q.num === num)!
  const d: Vec = [p.x - p.bx, p.y - p.by]
  const r = (s.rot * Math.PI) / 180
  const v: Vec = [d[0] * Math.cos(r) - d[1] * Math.sin(r), d[0] * Math.sin(r) + d[1] * Math.cos(r)]
  return [Math.round(Math.sign(v[0])), Math.round(Math.sign(v[1]))]
}

export const netColor = (net: string | null | undefined) => (net && netInfo[net]?.color) || SCH.hl

export function pinByKey(doc: SchDoc, key: string): WorldPin | undefined {
  return allPins(doc).find((p) => p.key === key)
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

export interface WireStyle {
  color?: string
  width?: number
  opacity?: number
  className?: string
  glow?: string
}

export function SchDrawing({
  doc,
  graph,
  active,
  wireStyle,
  selectedRefs = [],
  showPinNumbers = true,
  showPinNames = true,
  dimInactive = true,
  litRefs = [],
  under,
  children,
}: {
  doc: SchDoc
  graph: NetGraph
  /** highlight this net (name) */
  active?: string | null
  wireStyle?: (w: SchWire) => WireStyle | undefined
  selectedRefs?: string[]
  showPinNumbers?: boolean
  showPinNames?: boolean
  dimInactive?: boolean
  /** refs drawn with a warm "lit" glow (e.g. the LED) */
  litRefs?: string[]
  under?: ReactNode
  children?: ReactNode
}) {
  const col = netColor(active)
  const inActive = (id: string) => active != null && graph.netOf(id) === active
  const dim = active != null && dimInactive
  return (
    <g>
      {under}
      {/* glow under the active net */}
      {active && (
        <g style={{ pointerEvents: 'none' }} className="sk-glow">
          {doc.wires
            .filter((w) => inActive(`wire:${w.id}`))
            .map((w) => (
              <polyline key={w.id} points={w.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={col} strokeOpacity={0.22} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          {allPins(doc)
            .filter((p) => inActive(`pin:${p.key}`))
            .map((p) => (
              <circle key={p.key} cx={p.x} cy={p.y} r={6} fill={col} fillOpacity={0.25} />
            ))}
        </g>
      )}
      {doc.wires.map((w) => {
        const st = wireStyle?.(w)
        const on = inActive(`wire:${w.id}`)
        return (
          <g key={w.id}>
            {st?.glow && (
              <polyline points={w.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={st.glow} strokeOpacity={0.3} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            )}
            <polyline
              className={st?.className}
              points={w.pts.map((p) => p.join(',')).join(' ')}
              pathLength={st?.className ? 1 : undefined}
              fill="none"
              stroke={st?.color ?? (on ? col : SCH.wire)}
              strokeWidth={st?.width ?? (on ? 2.2 : 1.4)}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={st?.opacity ?? (dim && !on ? 0.35 : 1)}
              style={{ transition: 'stroke 0.2s, opacity 0.2s' }}
            />
          </g>
        )
      })}
      {graph.junctions.map((j, i) => {
        const g = doc.wires.find((w) => onWire(w, j))
        const on = g ? inActive(`wire:${g.id}`) : false
        return <circle key={i} cx={j[0]} cy={j[1]} r={on ? 3 : 2.6} fill={on ? col : SCH.wire} opacity={dim && !on ? 0.35 : 1} />
      })}
      {litRefs.length > 0 &&
        doc.symbols
          .filter((s) => litRefs.includes(s.ref))
          .map((s) => (
            <circle key={s.ref} cx={s.x} cy={s.y} r={22} fill="url(#sk-led-glow)" style={{ pointerEvents: 'none' }} />
          ))}
      <defs>
        <radialGradient id="sk-led-glow">
          <stop offset="0" stopColor="#ff5a3c" stopOpacity={0.75} />
          <stop offset="0.45" stopColor="#ff7a4a" stopOpacity={0.35} />
          <stop offset="1" stopColor="#ff7a4a" stopOpacity={0} />
        </radialGradient>
      </defs>
      {doc.symbols.map((s) => {
        const hlPins = active ? symPins(s).filter((p) => inActive(`pin:${p.key}`)).map((p) => p.num) : []
        const sel = selectedRefs.includes(s.ref)
        return (
          <g key={s.ref} opacity={dim && hlPins.length === 0 && !sel ? 0.55 : 1} style={{ transition: 'opacity 0.2s' }}>
            <SymbolGraphic
              inst={s}
              showPinNumbers={showPinNumbers}
              showPinNames={showPinNames}
              highlightPins={hlPins}
              color={sel ? SCH.hl : SCH.symbol}
            />
          </g>
        )
      })}
      {doc.flags.map((f) => (
        <g key={f.id} opacity={dim && !inActive(`flag:${f.id}`) ? 0.4 : 1}>
          <FlagGraphic {...f} highlight={inActive(`flag:${f.id}`)} />
        </g>
      ))}
      {doc.labels.map((l) => (
        <g key={l.id} opacity={dim && !inActive(`label:${l.id}`) ? 0.4 : 1}>
          {inActive(`label:${l.id}`) && <LabelPlate name={l.name} x={l.x} y={l.y} side={l.side} color={col} />}
          <LabelText name={l.name} x={l.x} y={l.y} side={l.side} color={inActive(`label:${l.id}`) ? SCH.hl : SCH.label} />
        </g>
      ))}
      {children}
    </g>
  )
}

/**
 * Net label text. Unlike the shared NetLabelGraphic (text above the point), side labels are
 * centred vertically on their anchor so they read as sitting beside a vertical wire.
 */
export function LabelText({ name, x, y, side = 'right', color = SCH.label }: { name: string; x: number; y: number; side?: 'left' | 'right' | 'up'; color?: string }) {
  if (side === 'up') return <NetLabelGraphic name={name} x={x} y={y} side="up" />
  return (
    <g>
      <line x1={x} y1={y} x2={side === 'left' ? x - 3 : x + 3} y2={y} stroke={color} strokeWidth={1} />
      <text
        x={side === 'left' ? x - 4.5 : x + 4.5}
        y={y + 0.3}
        fontSize={7.5}
        fontWeight={600}
        fill={color}
        textAnchor={side === 'left' ? 'end' : 'start'}
        dominantBaseline="central"
        fontFamily="IBM Plex Mono, monospace"
      >
        {name}
      </text>
    </g>
  )
}

/** A soft rounded plate behind a highlighted net label. */
function LabelPlate({ name, x, y, side = 'right', color }: { name: string; x: number; y: number; side?: 'left' | 'right' | 'up'; color: string }) {
  const w = name.length * 4.6 + 7
  const x0 = side === 'left' ? x - 3 - w : side === 'right' ? x + 3 : x - w / 2
  const y0 = side === 'up' ? y - 12 : y - 5.5
  return <rect x={x0} y={y0} width={w} height={11} rx={3} fill={color} fillOpacity={0.18} stroke={color} strokeOpacity={0.6} strokeWidth={0.8} />
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Returns a fit rect with the same aspect ratio as the canvas, so that `bounds` lands inside the
 * canvas area left free by `insets` (px). Pass the result to <PcbCanvas fit pad={0}>.
 */
export function fitInsets(bounds: Box, size: { w: number; h: number }, insets: { l?: number; t?: number; r?: number; b?: number }, pad = 8): Box {
  const l = insets.l ?? 0
  const t = insets.t ?? 0
  const r = insets.r ?? 0
  const b = insets.b ?? 0
  const aw = Math.max(80, size.w - l - r)
  const ah = Math.max(80, size.h - t - b)
  const bw = bounds.w + pad * 2
  const bh = bounds.h + pad * 2
  const s = Math.min(aw / bw, ah / bh)
  const cx = bounds.x + bounds.w / 2
  const cy = bounds.y + bounds.h / 2
  // centre of the free area in px → world
  const fx = l + aw / 2
  const fy = t + ah / 2
  return { x: cx - fx / s, y: cy - fy / s, w: size.w / s, h: size.h / s }
}

export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setSize({ w: r.width, h: r.height })
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

/** World units per screen pixel of a PcbCanvas svg (tracks zoom via its viewBox attribute). */
export function useUnitsPerPx(getSvg: () => SVGSVGElement | null | undefined, deps: unknown[] = []) {
  const [upp, setUpp] = useState(0.5)
  useEffect(() => {
    let mo: MutationObserver | null = null
    let ro: ResizeObserver | null = null
    let raf = 0
    const attach = () => {
      const svg = getSvg()
      if (!svg) {
        raf = requestAnimationFrame(attach)
        return
      }
      const read = () => {
        const vb = svg.viewBox.baseVal
        const w = svg.clientWidth
        if (vb && w > 0) setUpp(vb.width / w)
      }
      read()
      mo = new MutationObserver(read)
      mo.observe(svg, { attributes: true, attributeFilter: ['viewBox'] })
      ro = new ResizeObserver(read)
      ro.observe(svg)
    }
    attach()
    return () => {
      cancelAnimationFrame(raf)
      mo?.disconnect()
      ro?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return upp
}

export function usePrefersReducedMotion() {
  const [r, setR] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!m) return
    const on = () => setR(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return !!r
}
