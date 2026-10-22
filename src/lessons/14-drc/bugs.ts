/* Lesson 14: the finished Blinky with six deliberate mistakes, plus small editor helpers
 * (rich DRC results, culprit finding, rubber-band part dragging, "route this airwire"). */
import {
  analyze,
  beginnerRules,
  courtyardRect,
  drc,
  newId,
  partPads,
  type BoardDoc,
  type Connectivity,
  type DrcError,
  type DrcKind,
  type Rules,
  type Track,
  type WorldPad,
} from '@/pcb/board'
import { stages, tracks as refTracks } from '@/pcb/project'
import { route45, type Vec } from '@/pcb/geom'

export function buggyBoard(): BoardDoc {
  const doc = stages.finished()
  const set = (id: string, patch: Partial<Track>) => {
    const t = doc.tracks.find((x) => x.id === id)!
    Object.assign(t, patch)
  }
  // 1. EDGE: J1 shoved against the left edge of the board
  const j1 = doc.parts.find((p) => p.ref === 'J1')!
  j1.x = 1.1
  set('vcc1', { pts: [[1.1, 11.73], [4, 11.73], [4, 7.2], [6.2, 5], [23.5, 5], [25, 6.5], [25, 9.55]] })
  set('gnd3', { pts: [[1.1, 14.27], [10.95, 14.27]] })
  // 2. OVERLAP: R2 dropped on top of R1
  const r2 = doc.parts.find((p) => p.ref === 'R2')!
  r2.y = 13.2
  set('dis2', { pts: [[25, 11.45], [25, 12.25]] })
  set('thr3', { pts: [[23.2, 14.15], [25, 14.15]] })
  // 3. CLEARANCE: the ground track squeezed right up against R3 and D1
  set('gnd2', { pts: [[15.3, 11.095], [10.95, 11.095], [10.95, 23], [23.2, 23], [23.2, 19.75]] })
  // 4. WIDTH: a hair-thin 0.1 mm track
  set('dis1', { width: 0.1 })
  // 5. UNROUTED: R3 → D1 was never drawn
  doc.tracks = doc.tracks.filter((t) => t.id !== 'led1')
  // 6. SHORT: a stray track joins C1 (THR) to C3 (CTRL)
  doc.tracks.push({ id: 'stray', layer: 'top', width: 0.25, pts: [[23.2, 17.85], [22.65, 17.3], [20.7, 17.3]] })
  return doc
}

/* ------------------------------------------------------------------ */
/* Error kinds: labels, colours and plain-English fixes                */
/* ------------------------------------------------------------------ */

export const KIND_ORDER: DrcKind[] = ['short', 'clearance', 'unrouted', 'width', 'edge', 'overlap', 'offboard', 'via']

export const KINDS: Record<DrcKind, { label: string; color: string; why: string; fix: string }> = {
  short: {
    label: 'Short circuit',
    color: '#ff4d4d',
    why: 'Copper joins two different nets. On the real board, current would take a shortcut and the circuit would not work (or would get hot).',
    fix: 'Find the stray track that touches both nets and delete it. Then re-route the connection properly if one is still needed.',
  },
  clearance: {
    label: 'Clearance',
    color: '#ff9d2e',
    why: 'Two pieces of copper on different nets are closer than the clearance rule. The factory might not etch the gap cleanly, and solder can bridge it.',
    fix: 'Give them more room: make the track narrower, delete it and route it further away, or move the part.',
  },
  unrouted: {
    label: 'Unrouted net',
    color: '#7fc3ff',
    why: 'Pads that should be connected (according to the schematic) still only have a thin airwire between them. Airwires are not copper.',
    fix: 'Use the Route tool: click the first pad, then the second. Or let the helper route this airwire for you.',
  },
  width: {
    label: 'Track width',
    color: '#f0d84a',
    why: 'This track is thinner than the minimum width rule. Very thin copper can be over-etched (broken) and carries little current.',
    fix: 'Select the track and set a wider width in the Property panel (0.25 mm is a good signal width).',
  },
  edge: {
    label: 'Board edge',
    color: '#e05ad6',
    why: 'Copper sits too close to the board outline. When the factory cuts the board out, the router can nick or expose that copper.',
    fix: 'Drag the part (or re-route the track) further in from the edge. Connected tracks follow the part.',
  },
  overlap: {
    label: 'Overlapping parts',
    color: '#b48cff',
    why: 'Two parts’ courtyards (the keep-out area around each part) overlap, so the real components would collide or be impossible to solder.',
    fix: 'Drag one of the parts to an empty spot. Its tracks stretch to follow it.',
  },
  offboard: {
    label: 'Outside board',
    color: '#e05ad6',
    why: 'Copper is outside the board outline, so it would be cut off.',
    fix: 'Move it back inside the outline.',
  },
  via: {
    label: 'Via size',
    color: '#c8c8c8',
    why: 'A via is smaller than the minimum hole or diameter rule.',
    fix: 'Use a larger via (0.3 mm drill / 0.6 mm diameter is a safe default).',
  },
}

/* ------------------------------------------------------------------ */
/* Rich DRC results                                                     */
/* ------------------------------------------------------------------ */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface DrcItem extends DrcError {
  id: string
  /** item ids to highlight: "track:id", "pad:R1.2", "part:R2" */
  culprits: string[]
  focus: Rect
}

export function runDrc(doc: BoardDoc, rules: Rules): DrcItem[] {
  const conn = analyze(doc)
  const errs = drc(doc, rules, conn)
  return errs.map((e, i) => {
    let culprits = e.items
    let at = e.at
    if (e.kind === 'short') {
      const c = shortCulprits(doc, conn, e)
      if (c.length) {
        culprits = c
        const t = doc.tracks.find((x) => `track:${x.id}` === c[0])
        if (t) at = trackMid(t)
      } else culprits = e.items.filter((x) => !x.startsWith('pad:'))
    }
    const focus = focusRect(doc, conn, culprits, at)
    return { ...e, at, culprits, focus, id: `${e.kind}:${culprits.join(',')}:${i}` }
  })
}

/** Tracks whose removal makes this short disappear. */
function shortCulprits(doc: BoardDoc, conn: Connectivity, e: DrcError): string[] {
  const nets = [...(conn.shorts.find((s) => s.items === e.items)?.nets ?? [])].sort().join('|')
  const out: string[] = []
  for (const id of e.items) {
    if (!id.startsWith('track:')) continue
    const tid = id.slice(6)
    const d2: BoardDoc = { ...doc, tracks: doc.tracks.filter((t) => t.id !== tid) }
    const still = analyze(d2).shorts.some((s) => [...s.nets].sort().join('|') === nets)
    if (!still) out.push(id)
  }
  return out
}

export function trackMid(t: Track): Vec {
  // midpoint along the polyline's length
  let total = 0
  const segs: number[] = []
  for (let i = 0; i < t.pts.length - 1; i++) {
    const l = Math.hypot(t.pts[i + 1][0] - t.pts[i][0], t.pts[i + 1][1] - t.pts[i][1])
    segs.push(l)
    total += l
  }
  let acc = 0
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= total / 2) {
      const k = segs[i] ? (total / 2 - acc) / segs[i] : 0
      return [t.pts[i][0] + (t.pts[i + 1][0] - t.pts[i][0]) * k, t.pts[i][1] + (t.pts[i + 1][1] - t.pts[i][1]) * k]
    }
    acc += segs[i]
  }
  return t.pts[0]
}

function focusRect(doc: BoardDoc, conn: Connectivity, items: string[], at: Vec): Rect {
  let x0 = at[0],
    y0 = at[1],
    x1 = at[0],
    y1 = at[1]
  const grow = (a: number, b: number, c: number, d: number) => {
    x0 = Math.min(x0, a)
    y0 = Math.min(y0, b)
    x1 = Math.max(x1, c)
    y1 = Math.max(y1, d)
  }
  for (const id of items) {
    if (id.startsWith('pad:')) {
      const p = conn.pads.find((q) => q.key === id.slice(4))
      if (p) grow(p.x - p.w / 2, p.y - p.h / 2, p.x + p.w / 2, p.y + p.h / 2)
    } else if (id.startsWith('track:')) {
      const t = doc.tracks.find((q) => q.id === id.slice(6))
      // long tracks: only frame the error spot, not the whole track
      if (t) for (const [x, y] of t.pts) if (Math.abs(x - at[0]) < 6 && Math.abs(y - at[1]) < 6) grow(x, y, x, y)
    } else if (id.startsWith('part:')) {
      const p = doc.parts.find((q) => q.ref === id.slice(5))
      if (p) {
        const r = courtyardRect(p)
        grow(r.x0, r.y0, r.x1, r.y1)
      }
    }
  }
  const minW = 14
  const minH = 10
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const w = Math.max(minW, x1 - x0 + 2)
  const h = Math.max(minH, y1 - y0 + 2)
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

export const rulesAtLeast = (r: Rules, base: Rules = beginnerRules) =>
  r.minTrack >= base.minTrack - 1e-6 && r.clearance >= base.clearance - 1e-6 && r.edgeClearance >= base.edgeClearance - 1e-6

export const rulesKey = (r: Rules) => `${r.minTrack}|${r.clearance}|${r.edgeClearance}`

/* ------------------------------------------------------------------ */
/* Editing helpers                                                      */
/* ------------------------------------------------------------------ */

export interface Anchor {
  trackId: string
  end: 0 | 1
  pad: string
}

const near = (a: Vec, b: [number, number], eps = 0.02) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps

/** Track ends sitting on a part's pad centres — they follow the part while it's dragged. */
export function anchorsFor(doc: BoardDoc, ref: string): Anchor[] {
  const part = doc.parts.find((p) => p.ref === ref)
  if (!part) return []
  const pads = partPads(part, doc.netlist)
  const out: Anchor[] = []
  for (const t of doc.tracks)
    for (const pad of pads) {
      if (near(t.pts[0], [pad.x, pad.y])) out.push({ trackId: t.id, end: 0, pad: pad.num })
      if (near(t.pts[t.pts.length - 1], [pad.x, pad.y])) out.push({ trackId: t.id, end: 1, pad: pad.num })
    }
  return out
}

export function movePart(doc: BoardDoc, ref: string, x: number, y: number, anchors: Anchor[]): BoardDoc {
  const parts = doc.parts.map((p) => (p.ref === ref ? { ...p, x, y } : p))
  const part = parts.find((p) => p.ref === ref)!
  const pads = partPads(part, doc.netlist)
  const tracks = doc.tracks.map((t) => {
    const mine = anchors.filter((a) => a.trackId === t.id)
    if (!mine.length) return t
    const pts = t.pts.map((p) => [...p] as Vec)
    for (const a of mine) {
      const pad = pads.find((q) => q.num === a.pad)!
      pts[a.end === 0 ? 0 : pts.length - 1] = [pad.x, pad.y]
    }
    return { ...t, pts: dedupe(pts) }
  })
  return { ...doc, parts, tracks }
}

function dedupe(pts: Vec[]): Vec[] {
  const out: Vec[] = []
  for (const p of pts) if (!out.length || !near(p, out[out.length - 1], 1e-4)) out.push(p)
  return out.length >= 2 ? out : [pts[0], pts[pts.length - 1]]
}

/** "Route this airwire": restore the known-good Blinky route for the net, or fall back to a 45° route. */
export function autoRoute(doc: BoardDoc, net: string, a: WorldPad, b: WorldPad): BoardDoc {
  const missing = refTracks.filter((t) => t.net === net && !doc.tracks.some((x) => x.id === t.id))
  if (missing.length) {
    const next = { ...doc, tracks: [...doc.tracks, ...missing.map((t) => ({ ...t, pts: t.pts.map((p) => [...p] as Vec) }))] }
    const before = analyze(doc).ratsnest.filter((r) => r.net === net).length
    const after = analyze(next).ratsnest.filter((r) => r.net === net).length
    if (after < before) return next
  }
  const pts = route45([a.x, a.y], [b.x, b.y])
  return { ...doc, tracks: [...doc.tracks, { id: newId('rt'), layer: 'top', width: net === 'VCC' || net === 'GND' ? 0.5 : 0.25, net, pts }] }
}

export function trackLength(t: Track) {
  let l = 0
  for (let i = 0; i < t.pts.length - 1; i++) l += Math.hypot(t.pts[i + 1][0] - t.pts[i][0], t.pts[i + 1][1] - t.pts[i][1])
  return l
}
