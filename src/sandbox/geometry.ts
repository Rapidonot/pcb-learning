/* Editor geometry: hit-testing, routing snaps and placement checks (all in mm). */
import { courtyardRect, padShape, type BoardDoc, type Connectivity, type Layer, type PartInst, type Pour, type Track, type Via, type WorldPad } from '@/pcb/board'
import { getFootprint } from '@/pcb/footprints'
import { add, dist, dot, pointInPoly, pointSegDist, route45, scale, shapeDist, snap, sub, type Vec } from '@/pcb/geom'
import type { CornerMode, Snap } from './types'

export const snapPt = (p: Vec, g: number): Vec => [round3(snap(p[0], g)), round3(snap(p[1], g))]
export const round3 = (v: number) => Math.round(v * 1000) / 1000

export function trackLength(t: Pick<Track, 'pts'>) {
  let s = 0
  for (let i = 0; i < t.pts.length - 1; i++) s += dist(t.pts[i], t.pts[i + 1])
  return s
}
export const totalTrackLength = (doc: BoardDoc) => doc.tracks.reduce((s, t) => s + trackLength(t), 0)

export function polyArea(pts: Vec[]) {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  return Math.abs(a / 2)
}

/** nearest point on segment ab to p */
export function projectOnSeg(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a)
  const l2 = dot(ab, ab)
  if (l2 === 0) return a
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2))
  return add(a, scale(ab, t))
}

/* ------------------------------------------------------------------ */
/* Placement checks (same rules as drc())                              */
/* ------------------------------------------------------------------ */

export function partOnBoard(p: PartInst, doc: Pick<BoardDoc, 'w' | 'h'>) {
  const r = courtyardRect(p)
  return r.x0 >= -1e-6 && r.y0 >= -1e-6 && r.x1 <= doc.w + 1e-6 && r.y1 <= doc.h + 1e-6
}

export function overlappingPairs(doc: BoardDoc): [string, string][] {
  const out: [string, string][] = []
  for (let i = 0; i < doc.parts.length; i++)
    for (let j = i + 1; j < doc.parts.length; j++) {
      const a = doc.parts[i]
      const b = doc.parts[j]
      if (a.side !== b.side && getFootprint(a.fp).mount === 'smd' && getFootprint(b.fp).mount === 'smd') continue
      const ra = courtyardRect(a)
      const rb = courtyardRect(b)
      if (ra.x0 < rb.x1 && rb.x0 < ra.x1 && ra.y0 < rb.y1 && rb.y0 < ra.y1) out.push([a.ref, b.ref])
    }
  return out
}

/** bounding box of the board plus every part, for "fit all" */
export function docBounds(doc: BoardDoc) {
  let x0 = 0,
    y0 = 0,
    x1 = doc.w,
    y1 = doc.h
  for (const p of doc.parts) {
    const r = courtyardRect(p)
    x0 = Math.min(x0, r.x0)
    y0 = Math.min(y0, r.y0)
    x1 = Math.max(x1, r.x1)
    y1 = Math.max(y1, r.y1)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/* ------------------------------------------------------------------ */
/* Hit testing                                                         */
/* ------------------------------------------------------------------ */

export type Hit =
  | { kind: 'via'; via: Via; net?: string }
  | { kind: 'pad'; pad: WorldPad; part: PartInst }
  | { kind: 'track'; track: Track; net?: string; at: Vec }
  | { kind: 'part'; part: PartInst }
  | { kind: 'pour'; pour: Pour }

const ptShape = (p: Vec) => ({ pts: [p], r: 0 })

export function padAt(conn: Connectivity, p: Vec, tol: number, layer?: Layer) {
  let best = null as WorldPad | null
  let bd = Infinity
  let bc = Infinity
  for (const pad of conn.pads) {
    if (layer && !pad.layers.includes(layer)) continue
    const d = shapeDist(ptShape(p), padShape(pad))
    if (d > tol) continue
    // inside several pads' reach: prefer the one whose centre is closest
    const dc = dist(p, [pad.x, pad.y])
    if (d < bd - 1e-9 || (Math.abs(d - bd) < 1e-9 && dc < bc)) {
      best = pad
      bd = d
      bc = dc
    }
  }
  return best
}

export function viaAt(doc: BoardDoc, p: Vec, tol: number) {
  let best = null as Via | null
  let bd = Infinity
  for (const v of doc.vias) {
    const d = dist(p, [v.x, v.y]) - v.d / 2
    if (d <= tol && d < bd) {
      best = v
      bd = d
    }
  }
  return best
}

export function trackAt(doc: BoardDoc, p: Vec, tol: number, layers: Layer[]) {
  let best = null as { track: Track; at: Vec } | null
  let bd = Infinity
  for (const layer of layers) {
    for (const t of doc.tracks) {
      if (t.layer !== layer) continue
      for (let i = 0; i < t.pts.length - 1; i++) {
        const d = pointSegDist(p, t.pts[i], t.pts[i + 1]) - t.width / 2
        if (d <= tol && d < bd) {
          bd = d
          best = { track: t, at: projectOnSeg(p, t.pts[i], t.pts[i + 1]) }
        }
      }
    }
    if (best) return best // prefer the first (active) layer
  }
  return best
}

export function partAt(doc: BoardDoc, p: Vec) {
  // topmost = last drawn; prefer smaller parts when courtyards overlap
  let best = null as PartInst | null
  let area = Infinity
  for (const part of doc.parts) {
    const r = courtyardRect(part)
    if (p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1) {
      const a = (r.x1 - r.x0) * (r.y1 - r.y0)
      if (a < area) {
        area = a
        best = part
      }
    }
  }
  return best
}

export function hitTest(
  doc: BoardDoc,
  conn: Connectivity,
  p: Vec,
  tol: number,
  opts: { activeLayer: Layer; visible: { top: boolean; bottom: boolean; pours: boolean } },
): Hit | null {
  const layers = ([opts.activeLayer, opts.activeLayer === 'top' ? 'bottom' : 'top'] as Layer[]).filter((l) => opts.visible[l])
  const v = viaAt(doc, p, tol)
  if (v) return { kind: 'via', via: v, net: conn.netOf.get(`via:${v.id}`) }
  const pad = padAt(conn, p, tol)
  if (pad) return { kind: 'pad', pad, part: doc.parts.find((x) => x.ref === pad.ref)! }
  const t = trackAt(doc, p, tol, layers)
  if (t) return { kind: 'track', track: t.track, at: t.at, net: conn.netOf.get(`track:${t.track.id}`) ?? t.track.net }
  const part = partAt(doc, p)
  if (part) return { kind: 'part', part }
  if (opts.visible.pours) {
    const order = [...doc.pours].sort((a, b) => (a.layer === opts.activeLayer ? -1 : 1) - (b.layer === opts.activeLayer ? -1 : 1))
    for (const pour of order) if (opts.visible[pour.layer] && pointInPoly(p, pour.pts)) return { kind: 'pour', pour }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

const padLabel = (p: WorldPad) => `${p.ref}.${p.num}${p.name ? ` (${p.name})` : ''}`

/** Where can a route start? Pads, vias or existing tracks. */
export function routeStart(doc: BoardDoc, conn: Connectivity, p: Vec, tol: number, activeLayer: Layer, layerVisible: (l: Layer) => boolean) {
  const v = viaAt(doc, p, tol)
  if (v) return { pt: [v.x, v.y] as Vec, net: conn.netOf.get(`via:${v.id}`), layer: activeLayer, from: 'a via' }
  const pad = padAt(conn, p, tol)
  if (pad) {
    const layer = pad.layers.includes(activeLayer) ? activeLayer : pad.layers[0]
    return { pt: [pad.x, pad.y] as Vec, net: pad.net, layer, from: padLabel(pad) }
  }
  const t = trackAt(doc, p, tol, ([activeLayer, activeLayer === 'top' ? 'bottom' : 'top'] as Layer[]).filter(layerVisible))
  if (t) {
    // start from the nearest vertex when close to one, else from the projected point
    const vtx = t.track.pts.reduce((b, q) => (dist(q, p) < dist(b, p) ? q : b), t.track.pts[0])
    const pt = dist(vtx, p) < Math.max(tol * 2, t.track.width) ? vtx : ([round3(t.at[0]), round3(t.at[1])] as Vec)
    return { pt, net: conn.netOf.get(`track:${t.track.id}`) ?? t.track.net, layer: t.track.layer, from: 'a track', width: t.track.width }
  }
  return null
}

/** Snap the cursor while routing: magnet onto copper, otherwise onto the grid. */
export function routeSnap(
  doc: BoardDoc,
  conn: Connectivity,
  p: Vec,
  ctx: { net?: string; layer: Layer; tol: number; grid: number; startPt: Vec; lastPt?: Vec; pendingVias: Via[] },
): Snap {
  const pad = padAt(conn, p, ctx.tol)
  if (pad) {
    const pt: Vec = [pad.x, pad.y]
    const label = padLabel(pad)
    if (!pad.layers.includes(ctx.layer))
      return { pt, kind: 'pad', net: pad.net, ok: false, label, reason: `${label} is on the ${pad.layers[0]} layer. Press ${pad.layers[0] === 'top' ? 'T' : 'B'} to switch (a via is added).` }
    if (ctx.net && pad.net && pad.net !== ctx.net)
      return { pt, kind: 'pad', net: pad.net, ok: false, label, reason: `${label} is on net ${pad.net}, but you are routing ${ctx.net}.` }
    return { pt, kind: 'pad', net: pad.net, ok: dist(pt, ctx.startPt) > 1e-6, label }
  }
  const v = viaAt({ ...doc, vias: [...doc.vias, ...ctx.pendingVias] }, p, ctx.tol)
  if (v) {
    const net = conn.netOf.get(`via:${v.id}`)
    const pt: Vec = [v.x, v.y]
    if (ctx.net && net && net !== ctx.net) return { pt, kind: 'via', net, ok: false, label: 'via', reason: `That via is on net ${net}.` }
    return { pt, kind: 'via', net, ok: dist(pt, ctx.startPt) > 1e-6 && !ctx.pendingVias.includes(v), label: 'via' }
  }
  const t = trackAt(doc, p, ctx.tol, [ctx.layer])
  if (t) {
    const net = conn.netOf.get(`track:${t.track.id}`) ?? t.track.net
    const vtx = t.track.pts.reduce((b, q) => (dist(q, p) < dist(b, p) ? q : b), t.track.pts[0])
    const pt: Vec = dist(vtx, p) < Math.max(ctx.tol * 2, t.track.width) ? vtx : [round3(t.at[0]), round3(t.at[1])]
    if (ctx.net && net && net !== ctx.net) return { pt: alignSnap(p, ctx.grid, ctx.lastPt), kind: 'grid', net, ok: false, reason: `That track is on net ${net}.` }
    return { pt, kind: 'track', net, ok: dist(pt, ctx.startPt) > 1e-6, label: 'track' }
  }
  return { pt: alignSnap(p, ctx.grid, ctx.lastPt), kind: 'grid', ok: false }
}

/** Grid snap that also lines up with the last corner, so routes leaving an off-grid pad stay straight. */
export function alignSnap(p: Vec, grid: number, last?: Vec): Vec {
  const g = snapPt(p, grid)
  if (!last) return g
  const near = Math.max(grid * 0.6, 0.15)
  if (Math.abs(p[1] - last[1]) < near) g[1] = last[1]
  if (Math.abs(p[0] - last[0]) < near) g[0] = last[0]
  return g
}

/** The path from the last corner to the target, shaped by the corner mode. */
export function cornerPath(a: Vec, b: Vec, mode: CornerMode): Vec[] {
  if (mode === '90') {
    if (Math.abs(a[0] - b[0]) < 1e-6 || Math.abs(a[1] - b[1]) < 1e-6) return [a, b]
    return [a, [b[0], a[1]], b]
  }
  return route45(a, b, mode === '45d')
}

/** Append points, dropping zero-length steps and merging collinear runs. */
export function appendPts(pts: Vec[], add: Vec[]): Vec[] {
  const out = [...pts]
  for (const q of add) {
    const last = out[out.length - 1]
    if (last && dist(last, q) < 1e-6) continue
    if (out.length >= 2) {
      const a = out[out.length - 2]
      const b = out[out.length - 1]
      const cr = (b[0] - a[0]) * (q[1] - b[1]) - (b[1] - a[1]) * (q[0] - b[0])
      const dp = (b[0] - a[0]) * (q[0] - b[0]) + (b[1] - a[1]) * (q[1] - b[1])
      if (Math.abs(cr) < 1e-6 && dp > 0) {
        out[out.length - 1] = q
        continue
      }
    }
    out.push(q)
  }
  return out
}
