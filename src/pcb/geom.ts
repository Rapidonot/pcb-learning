/* Small 2D geometry kit (units: mm, SVG coordinate system: +y is down). */

export type Vec = [number, number]

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]]
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]]
export const scale = (a: Vec, s: number): Vec => [a[0] * s, a[1] * s]
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1]
export const cross = (a: Vec, b: Vec) => a[0] * b[1] - a[1] * b[0]
export const len = (a: Vec) => Math.hypot(a[0], a[1])
export const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Rotate a point by `deg` degrees (clockwise on screen because +y is down). */
export function rotate(p: Vec, deg: number): Vec {
  if (!deg) return p
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]
}

export function snap(v: number, grid: number) {
  return Math.round(v / grid) * grid
}

export const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d

/** Distance from point p to segment ab. */
export function pointSegDist(p: Vec, a: Vec, b: Vec) {
  const ab = sub(b, a)
  const l2 = dot(ab, ab)
  if (l2 === 0) return dist(p, a)
  let t = dot(sub(p, a), ab) / l2
  t = Math.max(0, Math.min(1, t))
  return dist(p, add(a, scale(ab, t)))
}

function orient(a: Vec, b: Vec, c: Vec) {
  return cross(sub(b, a), sub(c, a))
}

export function segsIntersect(a: Vec, b: Vec, c: Vec, d: Vec) {
  const d1 = orient(c, d, a)
  const d2 = orient(c, d, b)
  const d3 = orient(a, b, c)
  const d4 = orient(a, b, d)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true
  return false
}

export function segSegDist(a: Vec, b: Vec, c: Vec, d: Vec) {
  if (segsIntersect(a, b, c, d)) return 0
  return Math.min(pointSegDist(a, c, d), pointSegDist(b, c, d), pointSegDist(c, a, b), pointSegDist(d, a, b))
}

export function pointInPoly(p: Vec, poly: Vec[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Copper shapes are modelled as "rounded convex polygons":
 *  - a polygon (possibly degenerate: 1 point = circle, 2 points = capsule/track)
 *  - plus a radius that inflates it.
 * The distance between two shapes is the distance between their skeletons minus both radii.
 */
export interface Shape {
  pts: Vec[]
  r: number
}

function skeletonDist(a: Vec[], b: Vec[]) {
  // containment checks for polygons
  if (a.length >= 3 && b.some((p) => pointInPoly(p, a))) return 0
  if (b.length >= 3 && a.some((p) => pointInPoly(p, b))) return 0
  const edges = (pts: Vec[]): [Vec, Vec][] => {
    if (pts.length === 1) return [[pts[0], pts[0]]]
    if (pts.length === 2) return [[pts[0], pts[1]]]
    return pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Vec, Vec])
  }
  let best = Infinity
  for (const [p1, p2] of edges(a)) {
    for (const [q1, q2] of edges(b)) {
      const d = segSegDist(p1, p2, q1, q2)
      if (d < best) best = d
      if (best === 0) return 0
    }
  }
  return best
}

export function shapeDist(a: Shape, b: Shape) {
  return Math.max(0, skeletonDist(a.pts, b.pts) - a.r - b.r)
}

export function shapeBBox(s: Shape) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity
  for (const [x, y] of s.pts) {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  return { x0: x0 - s.r, y0: y0 - s.r, x1: x1 + s.r, y1: y1 + s.r }
}

/** Snap a direction to the nearest multiple of 45°, returning the projected end point. */
export function snap45(from: Vec, to: Vec): Vec {
  const d = sub(to, from)
  const ang = Math.atan2(d[1], d[0])
  const step = Math.PI / 4
  const a = Math.round(ang / step) * step
  const l = len(d)
  const dir: Vec = [Math.cos(a), Math.sin(a)]
  const proj = dot(d, dir)
  return add(from, scale(dir, Math.max(0, Math.min(l * 1.5, proj))))
}

/**
 * EasyEDA-style 45° routing: from `a` to `b` as two segments — a straight run then a 45° diagonal
 * (or diagonal first when `diagFirst`). Returns the intermediate corner (or none if already aligned).
 */
export function route45(a: Vec, b: Vec, diagFirst = false): Vec[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  if (adx < 1e-6 || ady < 1e-6 || Math.abs(adx - ady) < 1e-6) return [a, b]
  const sx = Math.sign(dx)
  const sy = Math.sign(dy)
  const diag = Math.min(adx, ady)
  if (!diagFirst) {
    const corner: Vec = adx > ady ? [b[0] - sx * diag, a[1]] : [a[0], b[1] - sy * diag]
    return [a, corner, b]
  }
  const corner: Vec = [a[0] + sx * diag, a[1] + sy * diag]
  return [a, corner, b]
}
