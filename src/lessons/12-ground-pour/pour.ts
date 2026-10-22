/*
 * Copper-pour fill on a fine grid, so the lesson can do what EasyEDA does when it rebuilds a region:
 *   - cut clearance around other-net copper,
 *   - connect same-net pads with thermal spokes (or solidly),
 *   - find islands (pieces of copper that touch nothing on the pour's net) and remove them,
 *   - and work out which pads the pour really joins together.
 */
import { analyze, padShape, trackSegments, viaShape, type BoardDoc, type Connectivity, type Layer, type WorldPad } from '@/pcb/board'
import { dist, pointInPoly, rotate, shapeDist, type Shape, type Vec } from '@/pcb/geom'

export interface PourSpec {
  id: string
  /** '' = no net */
  net: string
  layer: Layer
  pts: Vec[]
  clearance: number
  thermals: boolean
  spoke: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface PourFillResult {
  /** groups of copper item ids ("pad:U1.1", "track:gnd2", "via:v1") joined through the pour, one per copper piece */
  joins: string[][]
  /** island rectangles (grid runs) */
  islands: Rect[]
  islandCount: number
  /** cells of copper kept vs removed, for readouts */
  keptArea: number
  islandArea: number
}

const CELL = 0.1

const FREE = 1
const OTHER = 2
const RING = 3

function itemNet(conn: Connectivity, id: string, fallback?: string) {
  return conn.netOf.get(id) ?? fallback
}

export function fillPour(doc: BoardDoc, conn: Connectivity, pour: PourSpec): PourFillResult {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity
  for (const [x, y] of pour.pts) {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  const nx = Math.max(1, Math.ceil((x1 - x0) / CELL))
  const ny = Math.max(1, Math.ceil((y1 - y0) / CELL))
  const state = new Uint8Array(nx * ny)
  const seed = new Int32Array(nx * ny).fill(-1)
  const roots: string[] = []
  const rootIdx = new Map<string, number>()
  const idxOf = (r: string) => {
    let i = rootIdx.get(r)
    if (i === undefined) {
      i = roots.length
      roots.push(r)
      rootIdx.set(r, i)
    }
    return i
  }
  const cx = (i: number) => x0 + (i + 0.5) * CELL
  const cy = (j: number) => y0 + (j + 0.5) * CELL

  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (pointInPoly([cx(i), cy(j)], pour.pts)) state[j * nx + i] = FREE

  /** visit cells whose centre is within `reach` of a shape */
  const forCells = (s: Shape, reach: number, fn: (k: number, d: number, p: Vec) => void) => {
    let bx0 = Infinity,
      by0 = Infinity,
      bx1 = -Infinity,
      by1 = -Infinity
    for (const [x, y] of s.pts) {
      bx0 = Math.min(bx0, x)
      by0 = Math.min(by0, y)
      bx1 = Math.max(bx1, x)
      by1 = Math.max(by1, y)
    }
    const pad = s.r + reach + CELL
    const i0 = Math.max(0, Math.floor((bx0 - pad - x0) / CELL))
    const i1 = Math.min(nx - 1, Math.ceil((bx1 + pad - x0) / CELL))
    const j0 = Math.max(0, Math.floor((by0 - pad - y0) / CELL))
    const j1 = Math.min(ny - 1, Math.ceil((by1 + pad - y0) / CELL))
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const p: Vec = [cx(i), cy(j)]
        const d = shapeDist({ pts: [p], r: 0 }, s)
        if (d < reach) fn(j * nx + i, d, p)
      }
  }

  const c = pour.clearance
  const hasNet = !!pour.net
  const pads = conn.pads.filter((p) => p.layers.includes(pour.layer))
  const tracks = doc.tracks.filter((t) => t.layer === pour.layer)

  // 1) same-net pads: thermal ring (spokes stay copper)
  const samePads: WorldPad[] = []
  for (const p of pads) {
    if (!hasNet || p.net !== pour.net) continue
    samePads.push(p)
    if (!pour.thermals) continue
    const half = pour.spoke / 2
    forCells(padShape(p), c, (k, d, pt) => {
      if (d <= 0 || state[k] !== FREE) return
      const [u, v] = rotate([pt[0] - p.x, pt[1] - p.y], -p.rot)
      const spoke = Math.abs(v) <= half || Math.abs(u) <= half
      if (!spoke) state[k] = RING
    })
  }
  // 2) other-net copper: clearance cut-outs (always win over spokes)
  const block = (s: Shape) =>
    forCells(s, c, (k) => {
      if (state[k]) state[k] = OTHER
    })
  for (const p of pads) if (!hasNet || p.net !== pour.net) block(padShape(p))
  for (const t of tracks) if (!hasNet || itemNet(conn, `track:${t.id}`, t.net) !== pour.net) for (const s of trackSegments(t)) block(s)
  for (const v of doc.vias) if (!hasNet || conn.netOf.get(`via:${v.id}`) !== pour.net) block(viaShape(v))

  // 3) same-net copper is part of the pour: seed cells
  if (hasNet) {
    const mark = (s: Shape, root: string) => {
      const ri = idxOf(root)
      forCells(s, 0.001, (k) => {
        if (!state[k]) return
        state[k] = FREE
        seed[k] = ri
      })
    }
    for (const p of samePads) mark(padShape(p), `pad:${p.key}`)
    for (const t of tracks) if (itemNet(conn, `track:${t.id}`, t.net) === pour.net) for (const s of trackSegments(t)) mark(s, `track:${t.id}`)
    for (const v of doc.vias) if (conn.netOf.get(`via:${v.id}`) === pour.net) mark(viaShape(v), `via:${v.id}`)
  }

  // 4) flood fill
  const comp = new Int32Array(nx * ny).fill(-1)
  const joins: string[][] = []
  const islandCells: number[] = []
  let kept = 0
  let compN = 0
  const stack: number[] = []
  for (let k0 = 0; k0 < state.length; k0++) {
    if (state[k0] !== FREE || comp[k0] >= 0) continue
    const cells: number[] = []
    const rs = new Set<number>()
    comp[k0] = compN
    stack.push(k0)
    while (stack.length) {
      const k = stack.pop()!
      cells.push(k)
      if (seed[k] >= 0) rs.add(seed[k])
      const i = k % nx
      const j = (k - i) / nx
      const nb = [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1]
      for (const n of nb) if (n >= 0 && state[n] === FREE && comp[n] < 0) {
        comp[n] = compN
        stack.push(n)
      }
    }
    compN++
    if (rs.size) {
      kept += cells.length
      joins.push([...rs].map((r) => roots[r]))
    } else islandCells.push(...cells)
  }

  // islands → merged rects (row runs, then stack identical runs)
  const isl = new Uint8Array(nx * ny)
  for (const k of islandCells) isl[k] = 1
  const islands: Rect[] = []
  let prev = new Map<string, Rect>()
  for (let j = 0; j < ny; j++) {
    const cur = new Map<string, Rect>()
    let i = 0
    while (i < nx) {
      if (!isl[j * nx + i]) {
        i++
        continue
      }
      const s = i
      while (i < nx && isl[j * nx + i]) i++
      const key = `${s}-${i}`
      const above = prev.get(key)
      if (above) {
        above.h += CELL
        cur.set(key, above)
      } else {
        const r = { x: x0 + s * CELL, y: y0 + j * CELL, w: (i - s) * CELL, h: CELL }
        islands.push(r)
        cur.set(key, r)
      }
    }
    prev = cur
  }

  // count separate island pieces
  let islandCount = 0
  {
    const sizes = new Map<number, number>()
    for (const k of islandCells) sizes.set(comp[k], (sizes.get(comp[k]) ?? 0) + 1)
    // ignore specks smaller than ~0.05 mm² (grid noise)
    for (const n of sizes.values()) if (n >= 5) islandCount++
  }

  const area = CELL * CELL
  return { joins, islands, islandCount, keptArea: kept * area, islandArea: islandCells.length * area }
}

/** Connectivity with the pours joining things the way they really are filled. */
export function connectWithPours(doc: BoardDoc, fills: PourFillResult[]): Connectivity {
  const base = analyze({ ...doc, pours: [] })
  const parent = new Map<string, string>()
  const find = (a: string): string => {
    let p = parent.get(a) ?? a
    if (p !== a) {
      p = find(p)
      parent.set(a, p)
    }
    return p
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  // items that no longer exist (e.g. deleted tracks in a stale fill) are skipped
  const exists = new Set<string>([
    ...base.pads.map((p) => `pad:${p.key}`),
    ...doc.tracks.map((t) => `track:${t.id}`),
    ...doc.vias.map((v) => `via:${v.id}`),
  ])
  for (const f of fills) {
    for (const g of f.joins) {
      const live = g.filter((id) => exists.has(id)).map((id) => base.root(id))
      for (let i = 1; i < live.length; i++) union(live[0], live[i])
    }
  }
  const groupOf = (p: WorldPad) => find(base.root(`pad:${p.key}`))

  const byNet = new Map<string, WorldPad[]>()
  for (const p of base.pads) {
    if (!p.net) continue
    if (!byNet.has(p.net)) byNet.set(p.net, [])
    byNet.get(p.net)!.push(p)
  }
  const ratsnest: Connectivity['ratsnest'] = []
  const complete = new Set<string>()
  const islands = new Map<string, WorldPad[][]>()
  for (const [net, ps] of byNet) {
    const groups = new Map<string, WorldPad[]>()
    for (const p of ps) {
      const g = groupOf(p)
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(p)
    }
    const gl = [...groups.values()]
    islands.set(net, gl)
    if (gl.length <= 1) {
      complete.add(net)
      continue
    }
    const inTree = [gl[0]]
    const rest = gl.slice(1)
    while (rest.length) {
      let best = { d: Infinity, i: 0, a: gl[0][0], b: gl[0][0] }
      for (let i = 0; i < rest.length; i++)
        for (const t of inTree)
          for (const a of t)
            for (const b of rest[i]) {
              const d = dist([a.x, a.y], [b.x, b.y])
              if (d < best.d) best = { d, i, a, b }
            }
      ratsnest.push({ net, a: best.a, b: best.b })
      inTree.push(rest[best.i])
      rest.splice(best.i, 1)
    }
  }
  return { ...base, root: (id) => find(base.root(id)), islands, ratsnest, complete }
}
