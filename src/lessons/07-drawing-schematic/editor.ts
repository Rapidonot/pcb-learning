/* Pure helpers for the lesson 7 wiring editor (no React). */
import { pointSegDist, type Vec } from '@/pcb/geom'
import { allPins, checkAgainst, schNets, schWires, type SchDoc, type SchWire } from '@/pcb/schematic'
import { netlist } from '@/pcb/project'
import { pinDir } from '../06-reading-schematics/schKit'

export const GRID = 10
export const NET_ORDER = ['VCC', 'GND', 'THR', 'DIS', 'OUT', 'LED', 'CTRL'] as const
export type NetName = (typeof NET_ORDER)[number]

/** Which reference wires (from the shared Blinky schematic) make up each net, for "Show me". */
export const REF_WIRES: Record<NetName, string[]> = {
  VCC: ['w1', 'w2', 'w3', 'w4', 'w5'],
  GND: ['w6', 'w7', 'w8', 'w9', 'w10', 'w11'],
  THR: ['w12', 'w15'],
  DIS: ['w13', 'w14'],
  OUT: ['w16'],
  LED: ['w17'],
  CTRL: ['w18'],
}
export const refWire = (id: string) => schWires.find((w) => w.id === id)!

export type Axis = 'h' | 'v'

export interface Target {
  kind: 'pin' | 'flag' | 'label' | 'end' | 'wire'
  id: string
  p: Vec
  axis: Axis
}

export const same = (a: Vec, b: Vec) => Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5
export const snapV = (p: Vec): Vec => [Math.round(p[0] / GRID) * GRID, Math.round(p[1] / GRID) * GRID]

export function pointTargets(doc: SchDoc): Target[] {
  const out: Target[] = []
  for (const p of allPins(doc)) {
    const d = pinDir(doc, p.key)
    out.push({ kind: 'pin', id: p.key, p: [p.x, p.y], axis: d[0] !== 0 ? 'h' : 'v' })
  }
  for (const f of doc.flags) out.push({ kind: 'flag', id: f.id, p: [f.x, f.y], axis: 'v' })
  for (const l of doc.labels) out.push({ kind: 'label', id: l.id, p: [l.x, l.y], axis: 'v' })
  for (const w of doc.wires) {
    const n = w.pts.length
    const ends: [Vec, Vec][] = [
      [w.pts[0], w.pts[1]],
      [w.pts[n - 1], w.pts[n - 2]],
    ]
    for (const [e, nb] of ends) {
      if (out.some((t) => same(t.p, e))) continue
      out.push({ kind: 'end', id: w.id, p: e, axis: e[0] === nb[0] ? 'v' : 'h' })
    }
  }
  return out
}

/** Nearest connectable thing to `world` within radius r (world units). Point targets win over wire bodies. */
export function pick(doc: SchDoc, world: Vec, r: number, targets = pointTargets(doc)): Target | null {
  let best: Target | null = null
  let bd = r
  for (const t of targets) {
    const d = Math.hypot(t.p[0] - world[0], t.p[1] - world[1])
    if (d <= bd) ((bd = d), (best = t))
  }
  if (best) return best
  bd = r * 0.8
  for (const w of doc.wires) {
    for (let i = 0; i < w.pts.length - 1; i++) {
      const a = w.pts[i]
      const b = w.pts[i + 1]
      const d = pointSegDist(world, a, b)
      if (d > bd) continue
      // project and snap along the segment
      const horiz = a[1] === b[1]
      let p: Vec = horiz ? [Math.round(world[0] / GRID) * GRID, a[1]] : [a[0], Math.round(world[1] / GRID) * GRID]
      const lo = horiz ? Math.min(a[0], b[0]) : Math.min(a[1], b[1])
      const hi = horiz ? Math.max(a[0], b[0]) : Math.max(a[1], b[1])
      const c = Math.max(lo, Math.min(hi, horiz ? p[0] : p[1]))
      p = horiz ? [c, a[1]] : [a[0], c]
      bd = d
      best = { kind: 'wire', id: w.id, p, axis: horiz ? 'h' : 'v' }
    }
  }
  return best
}

/** Orthogonal L route from a to b. Returns the points after `a`. */
export function lRoute(a: Vec, b: Vec, first: Axis): Vec[] {
  if (same(a, b)) return []
  if (Math.abs(a[0] - b[0]) < 0.5 || Math.abs(a[1] - b[1]) < 0.5) return [b]
  return first === 'h' ? [[b[0], a[1]], b] : [[a[0], b[1]], b]
}

/** Remove duplicate and collinear points. */
export function simplify(pts: Vec[]): Vec[] {
  const a: Vec[] = []
  for (const p of pts) if (!a.length || !same(a[a.length - 1], p)) a.push(p)
  const out: Vec[] = []
  for (let i = 0; i < a.length; i++) {
    if (i > 0 && i < a.length - 1) {
      const [p, q, r] = [a[i - 1], a[i], a[i + 1]]
      const col = (p[0] === q[0] && q[0] === r[0]) || (p[1] === q[1] && q[1] === r[1])
      if (col) continue
    }
    out.push(a[i])
  }
  return out
}

export interface NetStatus {
  net: NetName
  pins: string[]
  pieces: number
  status: 'done' | 'partial' | 'todo' | 'short'
  shortWith: string[]
  progress: number
}

export function netStatus(doc: SchDoc) {
  const check = checkAgainst(doc, netlist)
  const { groups } = schNets(doc)
  const groupOf = new Map<string, number>()
  groups.forEach((g, i) => g.forEach((k) => groupOf.set(k, i)))
  const wrong = new Set(check.wrong)
  const rows: NetStatus[] = NET_ORDER.map((net) => {
    const pins = Object.keys(netlist).filter((k) => netlist[k] === net)
    const gs = new Set(pins.map((k) => groupOf.get(k)))
    const pieces = gs.size
    const shorted = pins.some((k) => wrong.has(k))
    const shortWith = new Set<string>()
    if (shorted)
      for (const gi of gs) for (const k of groups[gi!] ?? []) if (netlist[k] && netlist[k] !== net) shortWith.add(netlist[k])
    const done = check.complete.includes(net)
    return {
      net,
      pins,
      pieces,
      shortWith: [...shortWith],
      status: done ? 'done' : shorted ? 'short' : pieces === pins.length ? 'todo' : 'partial',
      progress: pins.length > 1 ? (pins.length - pieces) / (pins.length - 1) : 1,
    }
  })
  const clean = check.complete.length === NET_ORDER.length && check.wrong.length === 0
  return { rows, clean, wrong }
}

export const cloneWires = (ws: SchWire[]) => ws.map((w) => ({ id: w.id, pts: w.pts.map((p) => [...p] as Vec) }))

/** Human-readable list of the pins on a net, e.g. "U1 pin 8 (VCC)". */
export function describePins(net: string) {
  return Object.keys(netlist)
    .filter((k) => netlist[k] === net)
    .map((k) => {
      const [ref, num] = k.split('.')
      const name = ref === 'U1' ? { '1': 'GND', '2': 'TRIG', '3': 'OUT', '4': 'RESET', '5': 'CTRL', '6': 'THR', '7': 'DIS', '8': 'VCC' }[num] : ref === 'D1' ? (num === '2' ? 'A' : 'K') : null
      return `${ref}.${num}${name ? ` ${name}` : ''}`
    })
}
