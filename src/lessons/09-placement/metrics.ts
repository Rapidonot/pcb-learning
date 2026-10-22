/* Placement metrics for the Blinky placement puzzle. */
import { courtyardRect, partPads, ratsnestCrossings, ratsnestLength, type BoardDoc, type Connectivity, type WorldPad } from '@/pcb/board'
import type { Vec } from '@/pcb/geom'

/**
 * Targets calibrated against the reference placement (project.placed):
 * airwires 90.9 mm, 4 crossings, C2 VCC pad 3.6 mm from U1 pin 8.
 * (Random legal placements average ~165 mm and ~17 crossings; a tuned optimum reaches ~64 mm / 2.)
 */
export const TARGETS = { length: 100, crossings: 4, decouple: 4 }

export interface PlacementMetrics {
  total: number
  onBoard: number
  allOnBoard: boolean
  /** refs whose courtyard overlaps another part's */
  overlaps: Set<string>
  overlapPairs: number
  length: number
  crossings: number
  crossPts: Vec[]
  airwires: Connectivity['ratsnest']
  /** C2's VCC pad to U1 pin 8, centre to centre (mm) */
  decouple: number | null
  decoupleLine: [Vec, Vec] | null
  /** all on board and no overlaps */
  clean: boolean
  /** 0..1 */
  score: number
}

export function measure(doc: BoardDoc, conn: Connectivity): PlacementMetrics {
  const rects = doc.parts.map((p) => ({ ref: p.ref, r: courtyardRect(p) }))
  const eps = 1e-6
  const inside = rects.filter(({ r }) => r.x0 >= -eps && r.y0 >= -eps && r.x1 <= doc.w + eps && r.y1 <= doc.h + eps)
  const overlaps = new Set<string>()
  let overlapPairs = 0
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].r
      const b = rects[j].r
      if (a.x0 < b.x1 - eps && b.x0 < a.x1 - eps && a.y0 < b.y1 - eps && b.y0 < a.y1 - eps) {
        overlaps.add(rects[i].ref)
        overlaps.add(rects[j].ref)
        overlapPairs++
      }
    }
  const length = ratsnestLength(conn)
  const crossings = ratsnestCrossings(conn)
  const crossPts = crossingPoints(conn.ratsnest)

  let decouple: number | null = null
  let decoupleLine: [Vec, Vec] | null = null
  const u1 = doc.parts.find((p) => p.ref === 'U1')
  const c2 = doc.parts.find((p) => p.ref === 'C2')
  if (u1 && c2) {
    const p8 = partPads(u1, doc.netlist).find((p) => p.num === '8')
    const cv = partPads(c2, doc.netlist).find((p) => p.net === 'VCC')
    if (p8 && cv) {
      decouple = Math.hypot(p8.x - cv.x, p8.y - cv.y)
      decoupleLine = [
        [cv.x, cv.y],
        [p8.x, p8.y],
      ]
    }
  }

  const total = doc.parts.length
  const onBoard = inside.length
  const allOnBoard = onBoard === total
  const clean = allOnBoard && overlapPairs === 0
  const c = (v: number) => Math.max(0, Math.min(1, v))
  const raw = 0.5 * c((170 - length) / (170 - 64)) + 0.5 * c((17 - crossings) / 15)
  const score = c(raw * (0.4 + 0.6 * (onBoard / total)) - 0.08 * overlapPairs)

  return {
    total,
    onBoard,
    allOnBoard,
    overlaps,
    overlapPairs,
    length,
    crossings,
    crossPts,
    airwires: conn.ratsnest,
    decouple,
    decoupleLine,
    clean,
    score,
  }
}

/** Same test as board.ts ratsnestCrossings(), but returning the crossing points so we can draw them. */
function crossingPoints(r: { a: WorldPad; b: WorldPad }[]): Vec[] {
  const out: Vec[] = []
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const p1: Vec = [r[i].a.x, r[i].a.y]
      const p2: Vec = [r[i].b.x, r[i].b.y]
      const q1: Vec = [r[j].a.x, r[j].a.y]
      const q2: Vec = [r[j].b.x, r[j].b.y]
      if (same(p1, q1) || same(p1, q2) || same(p2, q1) || same(p2, q2)) continue
      const x = intersect(p1, p2, q1, q2)
      if (x) out.push(x)
    }
  return out
}

const same = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6

function intersect(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
  const o = (p: Vec, q: Vec, r: Vec) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const d1 = o(c, d, a)
  const d2 = o(c, d, b)
  const d3 = o(a, b, c)
  const d4 = o(a, b, d)
  if (!(d1 * d2 < 0 && d3 * d4 < 0)) return null
  const t = d1 / (d1 - d2)
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}
