/* Schematic symbols, the Blinky reference schematic, and schematic connectivity. */
import type { ReactNode } from 'react'
import { add, pointSegDist, rotate, type Vec } from './geom'

export interface SymPin {
  num: string
  name: string
  /** wire attachment point (pin tip), local coords */
  x: number
  y: number
  /** where the pin line meets the body */
  bx: number
  by: number
}

export interface SymbolDef {
  id: string
  pins: SymPin[]
  body: (color: string) => ReactNode
  /** local text anchor for designator/value */
  label: { ref: Vec; value: Vec; anchor?: 'start' | 'middle' | 'end' }
}

const pin = (num: string, name: string, x: number, y: number, bx: number, by: number): SymPin => ({ num, name, x, y, bx, by })

export const symbols: Record<string, SymbolDef> = {
  R: {
    id: 'R',
    pins: [pin('1', '1', -20, 0, -12, 0), pin('2', '2', 20, 0, 12, 0)],
    body: (c) => <rect x={-12} y={-5} width={24} height={10} fill="none" stroke={c} strokeWidth={1.6} />,
    label: { ref: [0, -9], value: [0, 15] },
  },
  C: {
    id: 'C',
    pins: [pin('1', '1', -20, 0, -3, 0), pin('2', '2', 20, 0, 3, 0)],
    body: (c) => (
      <g stroke={c} strokeWidth={1.8} fill="none">
        <line x1={-3} y1={-9} x2={-3} y2={9} />
        <line x1={3} y1={-9} x2={3} y2={9} />
      </g>
    ),
    label: { ref: [0, -13], value: [0, 19] },
  },
  LED: {
    id: 'LED',
    pins: [pin('2', 'A', -20, 0, -7, 0), pin('1', 'K', 20, 0, 6, 0)],
    body: (c) => (
      <g stroke={c} strokeWidth={1.6} fill="none" strokeLinejoin="round">
        <path d="M -7 -7 L 6 0 L -7 7 Z" fill={c} fillOpacity={0.12} />
        <line x1={6} y1={-7} x2={6} y2={7} />
        <path d="M 0 -9 l 5 -6 M 3 -15 l 2 0 l 0 2" strokeWidth={1.1} />
        <path d="M 5 -8 l 5 -6 M 8 -14 l 2 0 l 0 2" strokeWidth={1.1} />
      </g>
    ),
    label: { ref: [0, -19], value: [0, 18] },
  },
  NE555: {
    id: 'NE555',
    pins: [
      pin('8', 'VCC', -20, -70, -20, -50),
      pin('4', 'RESET', 20, -70, 20, -50),
      pin('6', 'THR', -60, -20, -40, -20),
      pin('2', 'TRIG', -60, 20, -40, 20),
      pin('7', 'DIS', 60, -20, 40, -20),
      pin('3', 'OUT', 60, 20, 40, 20),
      pin('1', 'GND', -20, 70, -20, 50),
      pin('5', 'CTRL', 20, 70, 20, 50),
    ],
    body: (c) => <rect x={-40} y={-50} width={80} height={100} fill="#fffbe6" fillOpacity={0.6} stroke={c} strokeWidth={1.6} />,
    label: { ref: [44, -56], value: [44, 62], anchor: 'start' },
  },
  HDR2: {
    id: 'HDR2',
    pins: [pin('1', '1', 20, -10, 6, -10), pin('2', '2', 20, 10, 6, 10)],
    body: (c) => (
      <g>
        <rect x={-10} y={-20} width={16} height={40} fill="none" stroke={c} strokeWidth={1.6} />
      </g>
    ),
    label: { ref: [-2, -25], value: [-2, 32] },
  },
}

export interface SymInst {
  ref: string
  sym: keyof typeof symbols
  value: string
  x: number
  y: number
  rot: number
}

export interface SchWire {
  id: string
  pts: Vec[]
}

export interface SchLabel {
  id: string
  name: string
  x: number
  y: number
  /** which side the text sits on */
  side?: 'left' | 'right' | 'up'
}

export interface SchFlag {
  id: string
  kind: 'vcc' | 'gnd'
  name: string
  x: number
  y: number
}

export interface SchDoc {
  symbols: SymInst[]
  wires: SchWire[]
  labels: SchLabel[]
  flags: SchFlag[]
}

/* ------------------------------------------------------------------ */
/* Blinky reference schematic                                          */
/* ------------------------------------------------------------------ */

export const schSymbols: SymInst[] = [
  { ref: 'J1', sym: 'HDR2', value: 'Header 2-pin', x: 40, y: 140, rot: 0 },
  { ref: 'C2', sym: 'C', value: '100nF', x: 120, y: 80, rot: 90 },
  { ref: 'U1', sym: 'NE555', value: 'NE555', x: 210, y: 130, rot: 0 },
  { ref: 'C3', sym: 'C', value: '10nF', x: 230, y: 240, rot: 90 },
  { ref: 'R3', sym: 'R', value: '330Ω', x: 290, y: 180, rot: 90 },
  { ref: 'D1', sym: 'LED', value: 'LED red', x: 290, y: 230, rot: 90 },
  { ref: 'R1', sym: 'R', value: '1kΩ', x: 360, y: 80, rot: 90 },
  { ref: 'R2', sym: 'R', value: '47kΩ', x: 360, y: 140, rot: 90 },
  { ref: 'C1', sym: 'C', value: '10µF', x: 360, y: 200, rot: 90 },
]

export const schFlags: SchFlag[] = [
  { id: 'f-vcc', kind: 'vcc', name: 'VCC', x: 80, y: 40 },
  { id: 'g1', kind: 'gnd', name: 'GND', x: 80, y: 170 },
  { id: 'g2', kind: 'gnd', name: 'GND', x: 120, y: 110 },
  { id: 'g3', kind: 'gnd', name: 'GND', x: 190, y: 210 },
  { id: 'g4', kind: 'gnd', name: 'GND', x: 230, y: 270 },
  { id: 'g5', kind: 'gnd', name: 'GND', x: 290, y: 260 },
  { id: 'g6', kind: 'gnd', name: 'GND', x: 360, y: 230 },
]

export const schLabels: SchLabel[] = [
  { id: 'l-thr-a', name: 'THR', x: 130, y: 130, side: 'left' },
  { id: 'l-thr-b', name: 'THR', x: 360, y: 170, side: 'right' },
]

export const schWires: SchWire[] = [
  // VCC rail
  { id: 'w1', pts: [[60, 130], [80, 130], [80, 40], [360, 40]] },
  { id: 'w2', pts: [[120, 40], [120, 60]] },
  { id: 'w3', pts: [[190, 40], [190, 60]] },
  { id: 'w4', pts: [[230, 40], [230, 60]] },
  { id: 'w5', pts: [[360, 40], [360, 60]] },
  // GND drops
  { id: 'w6', pts: [[60, 150], [80, 150], [80, 170]] },
  { id: 'w7', pts: [[120, 100], [120, 110]] },
  { id: 'w8', pts: [[190, 200], [190, 210]] },
  { id: 'w9', pts: [[230, 260], [230, 270]] },
  { id: 'w10', pts: [[290, 250], [290, 260]] },
  { id: 'w11', pts: [[360, 220], [360, 230]] },
  // THR/TRIG tie
  { id: 'w12', pts: [[150, 110], [130, 110], [130, 150], [150, 150]] },
  // DIS
  { id: 'w13', pts: [[270, 110], [360, 110]] },
  { id: 'w14', pts: [[360, 100], [360, 120]] },
  // THR to C1
  { id: 'w15', pts: [[360, 160], [360, 180]] },
  // OUT -> R3 -> LED
  { id: 'w16', pts: [[270, 150], [290, 150], [290, 160]] },
  { id: 'w17', pts: [[290, 200], [290, 210]] },
  // CTRL -> C3
  { id: 'w18', pts: [[230, 200], [230, 220]] },
]

export const blinkySchematic = (): SchDoc => ({
  symbols: schSymbols.map((s) => ({ ...s })),
  wires: schWires.map((w) => ({ ...w, pts: w.pts.map((p) => [...p] as Vec) })),
  labels: schLabels.map((l) => ({ ...l })),
  flags: schFlags.map((f) => ({ ...f })),
})

export const SCH_BOUNDS = { x: 20, y: 20, w: 390, h: 265 }

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

export interface WorldPin {
  key: string // "U1.8"
  ref: string
  num: string
  name: string
  x: number
  y: number
}

export function symPins(s: SymInst): WorldPin[] {
  return symbols[s.sym].pins.map((p) => {
    const [x, y] = add([s.x, s.y], rotate([p.x, p.y], s.rot))
    return { key: `${s.ref}.${p.num}`, ref: s.ref, num: p.num, name: p.name, x, y }
  })
}

export const allPins = (doc: SchDoc) => doc.symbols.flatMap(symPins)

const near = (a: Vec, b: Vec) => Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5

/**
 * Schematic connectivity: returns groups of pin keys that are electrically joined.
 * Joins happen where wire ends land on pins, other wire ends, wire bodies (T-junctions),
 * net labels with the same name, and net flags with the same name.
 */
export function schNets(doc: SchDoc): { groups: string[][]; netName: Map<string, string>; junctions: Vec[] } {
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
  // points of interest: pin tips, flag points, label points
  const pois: { id: string; p: Vec }[] = [
    ...pins.map((p) => ({ id: `pin:${p.key}`, p: [p.x, p.y] as Vec })),
    ...doc.flags.map((f) => ({ id: `flag:${f.id}`, p: [f.x, f.y] as Vec })),
    ...doc.labels.map((l) => ({ id: `label:${l.id}`, p: [l.x, l.y] as Vec })),
  ]

  const junctionCount = new Map<string, { p: Vec; n: number }>()
  const bump = (p: Vec, n = 1) => {
    const k = `${Math.round(p[0])},${Math.round(p[1])}`
    const cur = junctionCount.get(k) ?? { p, n: 0 }
    cur.n += n
    junctionCount.set(k, cur)
  }

  for (const w of doc.wires) {
    const wid = `wire:${w.id}`
    const segs: [Vec, Vec][] = []
    for (let i = 0; i < w.pts.length - 1; i++) segs.push([w.pts[i], w.pts[i + 1]])
    const onWire = (p: Vec) => segs.some(([a, b]) => pointSegDist(p, a, b) < 0.5)
    // pois touching the wire anywhere
    for (const poi of pois) if (onWire(poi.p)) union(wid, poi.id)
    // other wires whose ends land on this wire (or vice versa)
    for (const o of doc.wires) {
      if (o.id === w.id) continue
      const ends = [o.pts[0], o.pts[o.pts.length - 1]]
      if (ends.some((e) => onWire(e))) union(wid, `wire:${o.id}`)
    }
    // junction bookkeeping: ends count once, interior hits count twice
    bump(w.pts[0])
    bump(w.pts[w.pts.length - 1])
    for (const o of doc.wires) {
      if (o.id === w.id) continue
      for (const e of [o.pts[0], o.pts[o.pts.length - 1]]) {
        const interior = segs.some(([a, b]) => pointSegDist(e, a, b) < 0.5) && !near(e, w.pts[0]) && !near(e, w.pts[w.pts.length - 1])
        if (interior) bump(e, 2)
      }
    }
  }
  for (const p of pins) bump([p.x, p.y])

  // labels/flags by name
  const byName = new Map<string, string>()
  for (const l of doc.labels) {
    const id = `label:${l.id}`
    if (byName.has(l.name)) union(id, byName.get(l.name)!)
    else byName.set(l.name, id)
  }
  for (const f of doc.flags) {
    const id = `flag:${f.id}`
    if (byName.has(f.name)) union(id, byName.get(f.name)!)
    else byName.set(f.name, id)
  }

  const groupsMap = new Map<string, string[]>()
  for (const p of pins) {
    const r = find(`pin:${p.key}`)
    if (!groupsMap.has(r)) groupsMap.set(r, [])
    groupsMap.get(r)!.push(p.key)
  }
  const netName = new Map<string, string>()
  for (const [name, id] of byName) {
    const r = find(id)
    for (const k of groupsMap.get(r) ?? []) netName.set(k, name)
  }
  const junctions = [...junctionCount.values()].filter((j) => j.n >= 3).map((j) => j.p)
  return { groups: [...groupsMap.values()], netName, junctions }
}

/**
 * Compare a schematic's connectivity to an expected netlist ("REF.pin" → net).
 * Returns which expected nets are complete, and any pins wrongly joined.
 */
export function checkAgainst(doc: SchDoc, expected: Record<string, string>) {
  const { groups } = schNets(doc)
  const groupOf = new Map<string, number>()
  groups.forEach((g, i) => g.forEach((k) => groupOf.set(k, i)))
  const nets = new Map<string, string[]>()
  for (const [k, n] of Object.entries(expected)) {
    if (!nets.has(n)) nets.set(n, [])
    nets.get(n)!.push(k)
  }
  const complete: string[] = []
  const wrong: string[] = []
  for (const [net, keys] of nets) {
    const gs = new Set(keys.map((k) => groupOf.get(k)))
    if (gs.size === 1) {
      // also make sure nothing foreign is in the group
      const g = groups[[...gs][0]!]
      if (g.every((k) => expected[k] === net)) complete.push(net)
    }
  }
  for (const g of groups) {
    const ns = new Set(g.map((k) => expected[k]).filter(Boolean))
    if (ns.size > 1) wrong.push(...g)
  }
  return { complete, wrong, total: nets.size }
}
