/* Board document model + connectivity, ratsnest and design-rule checking. */
import { getFootprint, type PadDef } from './footprints'
import { add, dist, pointInPoly, rotate, shapeBBox, shapeDist, type Shape, type Vec } from './geom'

export type Layer = 'top' | 'bottom'

export interface PartInst {
  ref: string
  fp: string
  value: string
  x: number
  y: number
  rot: number
  side: Layer
}

export interface Track {
  id: string
  layer: Layer
  width: number
  pts: Vec[]
  /** optional — the net this track was drawn for (derived from connectivity when absent) */
  net?: string
}

export interface Via {
  id: string
  x: number
  y: number
  d: number
  drill: number
}

export interface Pour {
  id: string
  net: string
  layer: Layer
  /** polygon outline */
  pts: Vec[]
  clearance: number
}

export interface SilkText {
  id: string
  text: string
  x: number
  y: number
  size: number
  rot?: number
  layer: Layer
  anchor?: 'start' | 'middle' | 'end'
}

export interface BoardDoc {
  w: number
  h: number
  corner: number
  parts: PartInst[]
  tracks: Track[]
  vias: Via[]
  pours: Pour[]
  texts: SilkText[]
  /** pin -> net name, keyed "REF.pin" */
  netlist: Record<string, string>
}

export interface Rules {
  minTrack: number
  clearance: number
  edgeClearance: number
  minDrill: number
  minVia: number
}

export const beginnerRules: Rules = {
  minTrack: 0.2,
  clearance: 0.2,
  edgeClearance: 0.3,
  minDrill: 0.3,
  minVia: 0.6,
}

/* ------------------------------------------------------------------ */
/* World-space pads                                                    */
/* ------------------------------------------------------------------ */

export interface WorldPad {
  key: string // "U1.8"
  ref: string
  num: string
  name?: string
  net: string | undefined
  x: number
  y: number
  w: number
  h: number
  rot: number
  shape: PadDef['shape']
  drill?: number
  layers: Layer[]
}

export function partPads(p: PartInst, netlist: Record<string, string>): WorldPad[] {
  const fp = getFootprint(p.fp)
  return fp.pads.map((pad) => {
    // bottom-side parts are mirrored in X
    const local: Vec = [p.side === 'bottom' ? -pad.x : pad.x, pad.y]
    const [x, y] = add([p.x, p.y], rotate(local, p.rot))
    const key = `${p.ref}.${pad.num}`
    return {
      key,
      ref: p.ref,
      num: pad.num,
      name: pad.name,
      net: netlist[key],
      x,
      y,
      w: pad.w,
      h: pad.h,
      rot: p.rot,
      shape: pad.shape,
      drill: pad.drill,
      layers: fp.mount === 'tht' ? ['top', 'bottom'] : [p.side],
    }
  })
}

export function allPads(doc: Pick<BoardDoc, 'parts' | 'netlist'>): WorldPad[] {
  return doc.parts.flatMap((p) => partPads(p, doc.netlist))
}

export function padShape(p: WorldPad): Shape {
  if (p.shape === 'round') return { pts: [[p.x, p.y]], r: p.w / 2 }
  if (p.shape === 'oval') {
    const long = Math.max(p.w, p.h)
    const short = Math.min(p.w, p.h)
    const half = (long - short) / 2
    const dir: Vec = p.w > p.h ? [1, 0] : [0, 1]
    const a = add([p.x, p.y], rotate([dir[0] * -half, dir[1] * -half], p.rot))
    const b = add([p.x, p.y], rotate([dir[0] * half, dir[1] * half], p.rot))
    return { pts: [a, b], r: short / 2 }
  }
  const hw = p.w / 2
  const hh = p.h / 2
  const corners: Vec[] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]
  return { pts: corners.map((c) => add([p.x, p.y], rotate(c, p.rot))), r: 0 }
}

export function trackSegments(t: Track): Shape[] {
  const out: Shape[] = []
  for (let i = 0; i < t.pts.length - 1; i++) out.push({ pts: [t.pts[i], t.pts[i + 1]], r: t.width / 2 })
  return out
}

export const viaShape = (v: Via): Shape => ({ pts: [[v.x, v.y]], r: v.d / 2 })

/* ------------------------------------------------------------------ */
/* Connectivity                                                        */
/* ------------------------------------------------------------------ */

type ItemKind = 'pad' | 'track' | 'via' | 'pour'
interface CopperItem {
  id: string
  kind: ItemKind
  layers: Layer[]
  shapes: Shape[]
  net?: string // known net (pads)
  ref?: string
}

class DSU {
  parent = new Map<string, string>()
  find(a: string): string {
    let p = this.parent.get(a) ?? a
    if (p !== a) {
      p = this.find(p)
      this.parent.set(a, p)
    }
    return p
  }
  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

function copperItems(doc: BoardDoc, pads: WorldPad[]): CopperItem[] {
  const items: CopperItem[] = []
  for (const p of pads) items.push({ id: `pad:${p.key}`, kind: 'pad', layers: p.layers, shapes: [padShape(p)], net: p.net, ref: p.ref })
  for (const t of doc.tracks) items.push({ id: `track:${t.id}`, kind: 'track', layers: [t.layer], shapes: trackSegments(t) })
  for (const v of doc.vias) items.push({ id: `via:${v.id}`, kind: 'via', layers: ['top', 'bottom'], shapes: [viaShape(v)] })
  return items
}

function itemsTouch(a: CopperItem, b: CopperItem, eps = 0.001) {
  if (!a.layers.some((l) => b.layers.includes(l))) return false
  for (const sa of a.shapes) for (const sb of b.shapes) if (shapeDist(sa, sb) <= eps) return true
  return false
}

export interface Connectivity {
  pads: WorldPad[]
  /** item id -> root id */
  root: (id: string) => string
  /** item id -> resolved net (from the pads it touches) */
  netOf: Map<string, string | undefined>
  /** groups of pads per net that are not yet connected (islands) */
  islands: Map<string, WorldPad[][]>
  /** copper islands that join two or more different nets */
  shorts: { nets: string[]; items: string[] }[]
  /** remaining connections to make, as straight "airwires" */
  ratsnest: { net: string; a: WorldPad; b: WorldPad }[]
  /** nets fully connected */
  complete: Set<string>
}

function pourContains(pour: Pour, s: Shape) {
  return s.pts.every((p) => pointInPoly(p, pour.pts))
}

export function analyze(doc: BoardDoc): Connectivity {
  const pads = allPads(doc)
  const items = copperItems(doc, pads)
  const dsu = new DSU()
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      if (a.kind === 'pad' && b.kind === 'pad') continue // pads never touch by design
      if (itemsTouch(a, b)) dsu.union(a.id, b.id)
    }
  }
  // pours: join every same-net pad / via / track inside the pour on that layer
  for (const pour of doc.pours) {
    const pid = `pour:${pour.id}`
    for (const it of items) {
      if (!it.layers.includes(pour.layer)) continue
      if (it.kind === 'pad' && it.net === pour.net && it.shapes.every((s) => pourContains(pour, s))) dsu.union(pid, it.id)
    }
  }
  // second pass for vias/tracks that touch pour-connected items is handled by the DSU already.
  // Also connect vias/tracks of the pour net sitting inside the pour (stitching vias).
  const rootNet = new Map<string, Set<string>>()
  for (const it of items) {
    if (it.kind !== 'pad' || !it.net) continue
    const r = dsu.find(it.id)
    if (!rootNet.has(r)) rootNet.set(r, new Set())
    rootNet.get(r)!.add(it.net)
  }
  for (const pour of doc.pours) {
    const pid = `pour:${pour.id}`
    for (const it of items) {
      if (it.kind === 'pad' || !it.layers.includes(pour.layer)) continue
      if (!it.shapes.every((s) => pourContains(pour, s))) continue
      const nets = rootNet.get(dsu.find(it.id))
      // a via/track that belongs to the pour's net (or is floating) gets stitched in
      if (it.kind === 'via' && (!nets || (nets.size === 1 && nets.has(pour.net)))) dsu.union(pid, it.id)
    }
  }

  // resolve nets per root
  const netsByRoot = new Map<string, Set<string>>()
  const itemsByRoot = new Map<string, string[]>()
  for (const it of items) {
    const r = dsu.find(it.id)
    if (!itemsByRoot.has(r)) itemsByRoot.set(r, [])
    itemsByRoot.get(r)!.push(it.id)
    if (it.kind === 'pad' && it.net) {
      if (!netsByRoot.has(r)) netsByRoot.set(r, new Set())
      netsByRoot.get(r)!.add(it.net)
    }
  }
  const netOf = new Map<string, string | undefined>()
  for (const it of items) {
    const nets = netsByRoot.get(dsu.find(it.id))
    netOf.set(it.id, nets && nets.size === 1 ? [...nets][0] : undefined)
  }
  const shorts: Connectivity['shorts'] = []
  for (const [r, nets] of netsByRoot) if (nets.size > 1) shorts.push({ nets: [...nets], items: itemsByRoot.get(r)! })

  // islands per net
  const islands = new Map<string, WorldPad[][]>()
  const byNet = new Map<string, WorldPad[]>()
  for (const p of pads) {
    if (!p.net) continue
    if (!byNet.has(p.net)) byNet.set(p.net, [])
    byNet.get(p.net)!.push(p)
  }
  const ratsnest: Connectivity['ratsnest'] = []
  const complete = new Set<string>()
  for (const [net, ps] of byNet) {
    const groups = new Map<string, WorldPad[]>()
    for (const p of ps) {
      const r = dsu.find(`pad:${p.key}`)
      if (!groups.has(r)) groups.set(r, [])
      groups.get(r)!.push(p)
    }
    const gl = [...groups.values()]
    islands.set(net, gl)
    if (gl.length <= 1) {
      complete.add(net)
      continue
    }
    // Prim's MST across islands, using the closest pad pair between islands
    const inTree = [gl[0]]
    const rest = gl.slice(1)
    while (rest.length) {
      let best = { d: Infinity, i: -1, a: gl[0][0], b: gl[0][0] }
      for (let i = 0; i < rest.length; i++) {
        for (const t of inTree)
          for (const a of t)
            for (const b of rest[i]) {
              const d = dist([a.x, a.y], [b.x, b.y])
              if (d < best.d) best = { d, i, a, b }
            }
      }
      ratsnest.push({ net, a: best.a, b: best.b })
      inTree.push(rest[best.i])
      rest.splice(best.i, 1)
    }
  }

  return { pads, root: (id) => dsu.find(id), netOf, islands, shorts, ratsnest, complete }
}

/* ------------------------------------------------------------------ */
/* Design rule check                                                   */
/* ------------------------------------------------------------------ */

export type DrcKind = 'clearance' | 'short' | 'width' | 'edge' | 'unrouted' | 'overlap' | 'offboard' | 'via'

export interface DrcError {
  kind: DrcKind
  message: string
  at: Vec
  items: string[]
}

export function drc(doc: BoardDoc, rules: Rules = beginnerRules, conn = analyze(doc)): DrcError[] {
  const errors: DrcError[] = []
  const pads = conn.pads
  const items = copperItems(doc, pads)
  const netOf = (id: string) => conn.netOf.get(id)

  // width
  for (const t of doc.tracks) {
    if (t.width + 1e-6 < rules.minTrack)
      errors.push({
        kind: 'width',
        message: `Track is ${t.width.toFixed(2)} mm wide (minimum ${rules.minTrack} mm)`,
        at: mid(t.pts),
        items: [`track:${t.id}`],
      })
  }
  for (const v of doc.vias) {
    if (v.d + 1e-6 < rules.minVia || v.drill + 1e-6 < rules.minDrill)
      errors.push({ kind: 'via', message: `Via ${v.d}/${v.drill} mm is below ${rules.minVia}/${rules.minDrill} mm`, at: [v.x, v.y], items: [`via:${v.id}`] })
  }

  // clearance between items of different nets
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      if (!a.layers.some((l) => b.layers.includes(l))) continue
      if (a.kind === 'pad' && b.kind === 'pad' && a.ref === b.ref) continue
      const na = a.kind === 'pad' ? a.net : netOf(a.id)
      const nb = b.kind === 'pad' ? b.net : netOf(b.id)
      if (conn.root(a.id) === conn.root(b.id)) continue // connected => same copper
      if (na && nb && na === nb) continue
      let d = Infinity
      let at: Vec = [0, 0]
      for (const sa of a.shapes)
        for (const sb of b.shapes) {
          const bbA = shapeBBox(sa)
          const bbB = shapeBBox(sb)
          if (bbA.x0 - rules.clearance > bbB.x1 || bbB.x0 - rules.clearance > bbA.x1 || bbA.y0 - rules.clearance > bbB.y1 || bbB.y0 - rules.clearance > bbA.y1) continue
          const dd = shapeDist(sa, sb)
          if (dd < d) {
            d = dd
            at = midpoint(sa, sb)
          }
        }
      if (d + 1e-6 < rules.clearance) {
        errors.push({
          kind: 'clearance',
          message: `Clearance ${d.toFixed(2)} mm between ${label(a, na)} and ${label(b, nb)} (needs ${rules.clearance} mm)`,
          at,
          items: [a.id, b.id],
        })
      }
    }
  }

  // shorts
  for (const s of conn.shorts) {
    const first = s.items.find((x) => !x.startsWith('pad:')) ?? s.items[0]
    const it = items.find((x) => x.id === first)
    errors.push({
      kind: 'short',
      message: `Short circuit: nets ${s.nets.join(' and ')} are joined by copper`,
      at: it ? centroid(it.shapes) : [0, 0],
      items: s.items,
    })
  }

  // board edge
  const inset = rules.edgeClearance
  for (const it of items) {
    for (const s of it.shapes) {
      const bb = shapeBBox(s)
      if (bb.x0 < -1e-6 || bb.y0 < -1e-6 || bb.x1 > doc.w + 1e-6 || bb.y1 > doc.h + 1e-6) {
        errors.push({ kind: 'offboard', message: `${label(it)} is outside the board outline`, at: centroid([s]), items: [it.id] })
        break
      }
      if (bb.x0 < inset || bb.y0 < inset || bb.x1 > doc.w - inset || bb.y1 > doc.h - inset) {
        errors.push({ kind: 'edge', message: `${label(it)} is closer than ${inset} mm to the board edge`, at: centroid([s]), items: [it.id] })
        break
      }
    }
  }

  // overlapping parts (courtyards)
  for (let i = 0; i < doc.parts.length; i++) {
    for (let j = i + 1; j < doc.parts.length; j++) {
      const a = doc.parts[i]
      const b = doc.parts[j]
      if (a.side !== b.side && getFootprint(a.fp).mount === 'smd' && getFootprint(b.fp).mount === 'smd') continue
      if (courtyardsOverlap(a, b))
        errors.push({ kind: 'overlap', message: `${a.ref} and ${b.ref} overlap`, at: [(a.x + b.x) / 2, (a.y + b.y) / 2], items: [`part:${a.ref}`, `part:${b.ref}`] })
    }
  }

  // unrouted
  for (const r of conn.ratsnest) {
    errors.push({
      kind: 'unrouted',
      message: `Unrouted connection on net ${r.net} (${r.a.key} → ${r.b.key})`,
      at: [(r.a.x + r.b.x) / 2, (r.a.y + r.b.y) / 2],
      items: [`pad:${r.a.key}`, `pad:${r.b.key}`],
    })
  }

  return errors
}

export function courtyardRect(p: PartInst) {
  const fp = getFootprint(p.fp)
  const { w, h } = fp.courtyard
  const r = ((p.rot % 180) + 180) % 180
  const [cw, ch] = r === 90 ? [h, w] : [w, h]
  return { x0: p.x - cw, y0: p.y - ch, x1: p.x + cw, y1: p.y + ch }
}

function courtyardsOverlap(a: PartInst, b: PartInst) {
  const ra = courtyardRect(a)
  const rb = courtyardRect(b)
  return ra.x0 < rb.x1 && rb.x0 < ra.x1 && ra.y0 < rb.y1 && rb.y0 < ra.y1
}

function label(it: CopperItem, net?: string) {
  const n = net ? ` (${net})` : ''
  if (it.kind === 'pad') return `pad ${it.id.slice(4)}${n}`
  if (it.kind === 'via') return `via${n}`
  return `track${n}`
}

function mid(pts: Vec[]): Vec {
  if (pts.length === 1) return pts[0]
  const i = Math.floor((pts.length - 1) / 2)
  return [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]
}

function centroid(shapes: Shape[]): Vec {
  let x = 0,
    y = 0,
    n = 0
  for (const s of shapes)
    for (const p of s.pts) {
      x += p[0]
      y += p[1]
      n++
    }
  return [x / n, y / n]
}

function midpoint(a: Shape, b: Shape): Vec {
  const ca = centroid([a])
  const cb = centroid([b])
  return [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2]
}

/** Total straight-line length of the ratsnest — a handy "how tangled is it" score. */
export function ratsnestLength(conn: Connectivity) {
  return conn.ratsnest.reduce((s, r) => s + dist([r.a.x, r.a.y], [r.b.x, r.b.y]), 0)
}

/** Count airwire crossings — fewer crossings usually means easier routing. */
export function ratsnestCrossings(conn: Connectivity) {
  let n = 0
  const r = conn.ratsnest
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const a1: Vec = [r[i].a.x, r[i].a.y]
      const a2: Vec = [r[i].b.x, r[i].b.y]
      const b1: Vec = [r[j].a.x, r[j].a.y]
      const b2: Vec = [r[j].b.x, r[j].b.y]
      if (sharesEnd(a1, a2, b1, b2)) continue
      if (segsCross(a1, a2, b1, b2)) n++
    }
  return n
}

function sharesEnd(a1: Vec, a2: Vec, b1: Vec, b2: Vec) {
  const e = 1e-6
  return dist(a1, b1) < e || dist(a1, b2) < e || dist(a2, b1) < e || dist(a2, b2) < e
}

function segsCross(a: Vec, b: Vec, c: Vec, d: Vec) {
  const o = (p: Vec, q: Vec, r: Vec) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const d1 = o(c, d, a)
  const d2 = o(c, d, b)
  const d3 = o(a, b, c)
  const d4 = o(a, b, d)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** Unique id helper for tracks/vias created in the editor. */
let uid = 0
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(uid++).toString(36)}`
