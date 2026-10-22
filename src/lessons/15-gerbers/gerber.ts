/* Lesson 15: turn the finished Blinky BoardDoc into Gerber (RS-274X) + Excellon files.
 *
 * Everything is built as a list of primitives first (board coordinates, mm, y down). The SVG viewer
 * draws those primitives and the text generator serialises the very same list, so what you see in
 * the viewer is exactly what is in the file. Gerber Y points up, so y is flipped on output.
 */
import { analyze, partPads, type BoardDoc, type Connectivity, type PartInst, type WorldPad } from '@/pcb/board'
import { getFootprint } from '@/pcb/footprints'
import { add, rotate, type Vec } from '@/pcb/geom'

export type ApShape = 'C' | 'R' | 'O'
export interface Ap {
  id: number
  shape: ApShape
  w: number
  h: number
}
type ApSpec = Omit<Ap, 'id'>

export type Prim =
  | { kind: 'path'; ap: ApSpec; pts: Vec[]; dark: boolean; label: string }
  | { kind: 'arc'; ap: ApSpec; a: Vec; b: Vec; c: Vec; dark: boolean; label: string }
  | { kind: 'flash'; ap: ApSpec; at: Vec; dark: boolean; label: string; open?: boolean }
  | { kind: 'region'; pts: Vec[]; dark: boolean; label: string }
  | { kind: 'hole'; at: Vec; d: number; label: string }

export type LineKind = 'comment' | 'format' | 'unit' | 'aperture' | 'select' | 'move' | 'draw' | 'arc' | 'flash' | 'region' | 'polarity' | 'mode' | 'end' | 'tool' | 'hole' | 'header'

export interface GLine {
  t: string
  k: LineKind
  prim?: number
  note: string
}

export type FileId = 'GTL' | 'GBL' | 'GTS' | 'GBS' | 'GTO' | 'GBO' | 'GTP' | 'GKO' | 'DRL'

export interface GFile {
  id: FileId
  name: string
  title: string
  about: string
  color: string
  kind: 'copper' | 'mask' | 'silk' | 'paste' | 'outline' | 'drill'
  prims: Prim[]
  lines: GLine[]
  text: string
}

/* ------------------------------------------------------------------ */
/* A tiny monospaced stroke font (Gerber has no fonts: text is lines)   */
/* ------------------------------------------------------------------ */

// glyphs on a 4 × 6 grid, y down from the cap line
const G: Record<string, Vec[][]> = {
  A: [[[0, 6], [0, 2], [2, 0], [4, 2], [4, 6]], [[0, 3.6], [4, 3.6]]],
  B: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [0, 6], [2.6, 6], [4, 4.6], [4, 1.4], [2.6, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.2], [2.2, 3.2]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[1, 0], [3, 0]], [[2, 0], [2, 6]], [[1, 6], [3, 6]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 4]], [[1.4, 2.6], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[2, 3], [4, 6]]],
  S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  v: [[[0.4, 2.4], [2, 6], [3.6, 2.4]]],
  '0': [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  '1': [[[0.8, 1.2], [2, 0], [2, 6]], [[0.8, 6], [3.2, 6]]],
  '2': [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  '3': [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]], [[1.6, 3], [3, 3]]],
  '4': [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  '5': [[[4, 0], [0, 0], [0, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  '+': [[[2, 1.4], [2, 5.4]], [[0, 3.4], [4, 3.4]]],
  '.': [[[1.7, 5.9], [2.3, 5.9]]],
  '-': [[[0.6, 3.4], [3.4, 3.4]]],
}
const ADV = 5.2 // advance in grid units (monospaced, like the board's mono font)

/** Stroke a string. `size` is the font size (em); cap height ≈ 0.7 em. Returns world polylines and stroke width. */
export function strokeText(
  text: string,
  x: number,
  y: number,
  size: number,
  anchor: 'start' | 'middle' | 'end',
  baseline: 'alphabetic' | 'central' = 'alphabetic',
  rot = 0,
): { lines: Vec[][]; width: number } {
  const cap = size * 0.7
  const u = cap / 6
  const total = (text.length - 1) * ADV * u + 4 * u
  const x0 = anchor === 'start' ? 0 : anchor === 'middle' ? -total / 2 : -total
  const yTop = baseline === 'alphabetic' ? -cap : -cap / 2
  const out: Vec[][] = []
  ;[...text].forEach((ch, i) => {
    const g = G[ch] ?? G[ch.toUpperCase()]
    if (!g) return
    for (const pl of g)
      out.push(
        pl.map(([gx, gy]) => {
          const local: Vec = [x0 + i * ADV * u + gx * u, yTop + gy * u]
          return add([x, y], rotate(local, rot))
        }),
      )
  })
  return { lines: out, width: Math.max(0.15, Math.round(size * 0.12 * 100) / 100) }
}

/* ------------------------------------------------------------------ */
/* Layer builders                                                       */
/* ------------------------------------------------------------------ */

const isQuarter = (rot: number) => ((((rot % 180) + 180) % 180) === 90)

function padAp(p: WorldPad, inflate = 0): ApSpec {
  const [w, h] = isQuarter(p.rot) ? [p.h, p.w] : [p.w, p.h]
  const W = w + inflate * 2
  const H = h + inflate * 2
  if (p.shape === 'round') return { shape: 'C', w: W, h: W }
  if (p.shape === 'oval') return { shape: 'O', w: W, h: H }
  return { shape: 'R', w: W, h: H }
}

const SPOKE = 0.35

function copperPrims(doc: BoardDoc, conn: Connectivity, layer: 'top' | 'bottom'): Prim[] {
  const out: Prim[] = []
  const trackNet = (id: string) => conn.netOf.get(`track:${id}`)
  const pads = conn.pads.filter((p) => p.layers.includes(layer))
  for (const pour of doc.pours.filter((p) => p.layer === layer)) {
    const c = pour.clearance
    out.push({ kind: 'region', pts: pour.pts, dark: true, label: `${pour.net} copper pour` })
    for (const t of doc.tracks.filter((t) => t.layer === layer && (trackNet(t.id) ?? t.net) !== pour.net))
      out.push({ kind: 'path', ap: { shape: 'C', w: t.width + 2 * c, h: 0 }, pts: t.pts, dark: false, label: `Clearance around ${trackNet(t.id) ?? t.net ?? ''} track` })
    for (const v of doc.vias.filter((v) => conn.netOf.get(`via:${v.id}`) !== pour.net))
      out.push({ kind: 'flash', ap: { shape: 'C', w: v.d + 2 * c, h: 0 }, at: [v.x, v.y], dark: false, label: 'Clearance around via' })
    for (const p of pads) out.push({ kind: 'flash', ap: padAp(p, c), at: [p.x, p.y], dark: false, label: `Clearance around pad ${p.key}` })
    for (const p of pads.filter((p) => p.net === pour.net)) {
      const [w, h] = isQuarter(p.rot) ? [p.h, p.w] : [p.w, p.h]
      const ex = w / 2 + c - SPOKE / 2
      const ey = h / 2 + c - SPOKE / 2
      out.push({ kind: 'path', ap: { shape: 'C', w: SPOKE, h: 0 }, pts: [[p.x - ex, p.y], [p.x + ex, p.y]], dark: true, label: `Thermal spoke for ${p.key}` })
      out.push({ kind: 'path', ap: { shape: 'C', w: SPOKE, h: 0 }, pts: [[p.x, p.y - ey], [p.x, p.y + ey]], dark: true, label: `Thermal spoke for ${p.key}` })
    }
  }
  for (const t of doc.tracks.filter((t) => t.layer === layer))
    out.push({ kind: 'path', ap: { shape: 'C', w: t.width, h: 0 }, pts: t.pts, dark: true, label: `${trackNet(t.id) ?? t.net ?? ''} track, ${t.width} mm` })
  for (const p of pads) out.push({ kind: 'flash', ap: padAp(p), at: [p.x, p.y], dark: true, label: `Pad ${p.key}${p.net ? ` (${p.net})` : ''}` })
  for (const v of doc.vias) out.push({ kind: 'flash', ap: { shape: 'C', w: v.d, h: 0 }, at: [v.x, v.y], dark: true, label: `Via ${v.d} mm` })
  return out
}

const MASK_EXP = 0.05
function maskPrims(conn: Connectivity, layer: 'top' | 'bottom'): Prim[] {
  return conn.pads
    .filter((p) => p.layers.includes(layer))
    .map((p) => ({ kind: 'flash' as const, ap: padAp(p, MASK_EXP), at: [p.x, p.y] as Vec, dark: true, open: true, label: `Mask opening for pad ${p.key}` }))
}

function pastePrims(conn: Connectivity, layer: 'top' | 'bottom'): Prim[] {
  return conn.pads
    .filter((p) => p.layers.length === 1 && p.layers[0] === layer)
    .map((p) => ({ kind: 'flash' as const, ap: padAp(p), at: [p.x, p.y] as Vec, dark: true, label: `Solder paste for pad ${p.key}` }))
}

function partXf(p: PartInst) {
  return (v: Vec): Vec => add([p.x, p.y], rotate(p.side === 'bottom' ? [-v[0], v[1]] : v, p.rot))
}

function silkPrims(doc: BoardDoc, layer: 'top' | 'bottom'): Prim[] {
  const out: Prim[] = []
  for (const p of doc.parts.filter((q) => q.side === layer)) {
    const fp = getFootprint(p.fp)
    const xf = partXf(p)
    for (const [x1, y1, x2, y2] of fp.silk) out.push({ kind: 'path', ap: { shape: 'C', w: 0.15, h: 0 }, pts: [xf([x1, y1]), xf([x2, y2])], dark: true, label: `${p.ref} outline` })
    if (fp.pin1) out.push({ kind: 'flash', ap: { shape: 'C', w: 0.4, h: 0 }, at: xf(fp.pin1), dark: true, label: `${p.ref} pin-1 dot` })
    if (fp.polarity === 'cathode-left' && fp.mount === 'smd')
      out.push({
        kind: 'path',
        ap: { shape: 'C', w: 0.3, h: 0 },
        pts: [xf([-fp.courtyard.w + 0.2, -fp.courtyard.h + 0.25]), xf([-fp.courtyard.w + 0.2, fp.courtyard.h - 0.25])],
        dark: true,
        label: `${p.ref} cathode bar`,
      })
    // designator, placed like RefLabel in render.tsx
    const r = ((p.rot % 180) + 180) % 180
    const st =
      r === 90
        ? strokeText(p.ref, p.x - fp.courtyard.h - 0.25, p.y, 0.9, 'end', 'central')
        : strokeText(p.ref, p.x, p.y - fp.courtyard.h - 0.35, 0.9, 'middle')
    for (const pl of st.lines) out.push({ kind: 'path', ap: { shape: 'C', w: st.width, h: 0 }, pts: pl, dark: true, label: `Designator “${p.ref}”` })
  }
  for (const t of doc.texts.filter((q) => q.layer === layer)) {
    const st = strokeText(t.text, t.x, t.y, t.size, t.anchor ?? 'start', 'alphabetic', t.rot ?? 0)
    for (const pl of st.lines) out.push({ kind: 'path', ap: { shape: 'C', w: st.width, h: 0 }, pts: pl, dark: true, label: `Text “${t.text}”` })
  }
  return out
}

function outlinePrims(doc: BoardDoc): Prim[] {
  const { w, h, corner: r } = doc
  const ap: ApSpec = { shape: 'C', w: 0.1, h: 0 }
  const L = (a: Vec, b: Vec): Prim => ({ kind: 'path', ap, pts: [a, b], dark: true, label: 'Board edge' })
  const A = (a: Vec, b: Vec, c: Vec): Prim => ({ kind: 'arc', ap, a, b, c, dark: true, label: 'Rounded corner' })
  // y down here; traced counter-clockwise as seen in Gerber (y up) = clockwise on screen? We go
  // bottom edge left→right, so on screen: bottom-left → bottom-right → up the right side…
  return [
    L([r, h], [w - r, h]),
    A([w - r, h], [w, h - r], [w - r, h - r]),
    L([w, h - r], [w, r]),
    A([w, r], [w - r, 0], [w - r, r]),
    L([w - r, 0], [r, 0]),
    A([r, 0], [0, r], [r, r]),
    L([0, r], [0, h - r]),
    A([0, h - r], [r, h], [r, h - r]),
  ]
}

function drillPrims(doc: BoardDoc, conn: Connectivity): Prim[] {
  const out: Prim[] = []
  for (const v of doc.vias) out.push({ kind: 'hole', at: [v.x, v.y], d: v.drill, label: `Via hole ${v.drill} mm` })
  for (const p of conn.pads) if (p.drill) out.push({ kind: 'hole', at: [p.x, p.y], d: p.drill, label: `Plated hole for ${p.key}` })
  return out
}

/* ------------------------------------------------------------------ */
/* Serialisers                                                          */
/* ------------------------------------------------------------------ */

const n3 = (v: number) => v.toFixed(3)
const shapeName = { C: 'round', R: 'rectangle', O: 'obround (stadium)' }

function gerberText(id: FileId, title: string, prims: Prim[], doc: BoardDoc): GLine[] {
  const H = doc.h
  const X = (v: number) => String(Math.round(v * 1e6))
  const xy = (p: Vec) => `X${X(p[0])}Y${X(H - p[1])}`
  const mm = (p: Vec) => `(${n3(p[0])}, ${n3(H - p[1])}) mm`
  const lines: GLine[] = []
  const push = (t: string, k: LineKind, note: string, prim?: number) => lines.push({ t, k, note, prim })

  push(`G04 Learn PCB educational Gerber: Blinky*`, 'comment', 'G04 starts a comment. Machines ignore it; it is for humans.')
  push(`G04 Layer: ${title} (${id})*`, 'comment', 'Another comment: which layer this file describes.')
  push(`%FSLAX46Y46*%`, 'format', 'Format: leading zeros omitted (L), absolute coordinates (A), 4 integer and 6 decimal digits. So X15300000 means 15.300000 mm.')
  push(`%MOMM*%`, 'unit', 'Mode: millimetres.')

  // aperture table
  const aps: Ap[] = []
  const key = (a: ApSpec) => `${a.shape}${n3(a.w)}x${n3(a.h)}`
  const apOf = (a: ApSpec) => {
    let f = aps.find((x) => key(x) === key(a))
    if (!f) {
      f = { ...a, id: 10 + aps.length }
      aps.push(f)
    }
    return f
  }
  for (const p of prims) if (p.kind !== 'region' && p.kind !== 'hole') apOf(p.ap)
  for (const a of aps) {
    const def = a.shape === 'C' ? `C,${n3(a.w)}` : `${a.shape},${n3(a.w)}X${n3(a.h)}`
    push(
      `%ADD${a.id}${def}*%`,
      'aperture',
      `Aperture D${a.id}: a ${shapeName[a.shape]} “pen” ${a.shape === 'C' ? `${n3(a.w)} mm across` : `${n3(a.w)} × ${n3(a.h)} mm`}. Tracks are drawn with round pens, pads are “flashed” (stamped) with pad-shaped ones.`,
    )
  }
  push(`G01*`, 'mode', 'G01: draw straight lines (linear interpolation).')
  if (prims.some((p) => p.kind === 'arc')) push(`G75*`, 'mode', 'G75: arcs may span more than one quadrant (needed before any arc).')
  push(`%LPD*%`, 'polarity', 'Load polarity Dark: what follows adds material.')

  let cur = -1
  let dark = true
  let lastLabel = ''
  prims.forEach((p, i) => {
    if (p.kind === 'hole') return
    if (p.dark !== dark) {
      dark = p.dark
      push(dark ? `%LPD*%` : `%LPC*%`, 'polarity', dark ? 'Polarity Dark: back to adding copper.' : 'Polarity Clear: what follows ERASES what was drawn before. Used to cut clearance gaps into the copper pour.')
    }
    const head = p.label.replace(/ [\d.]+ mm$/, '').replace(/[“”]/g, '"')
    if (head !== lastLabel && (p.kind === 'region' || !lastLabel.startsWith(head.split(' ')[0]))) {
      push(`G04 ${head.replace(/[^\x20-\x7e]/g, '')}*`, 'comment', 'A comment the exporter adds so humans can follow along.')
    }
    lastLabel = head
    if (p.kind === 'region') {
      push(`G36*`, 'region', 'G36: start a filled region (used for copper pours).', i)
      p.pts.forEach((q, j) => push(`${xy(q)}${j === 0 ? 'D02' : 'D01'}*`, j === 0 ? 'move' : 'draw', j === 0 ? `Move to the first corner ${mm(q)}.` : `Outline edge to ${mm(q)}.`, i))
      push(`${xy(p.pts[0])}D01*`, 'draw', 'Close the outline back at the first corner.', i)
      push(`G37*`, 'region', 'G37: end of region. Everything inside is filled.', i)
      return
    }
    const ap = apOf(p.ap)
    if (ap.id !== cur) {
      cur = ap.id
      push(`D${ap.id}*`, 'select', `Pick aperture D${ap.id} (${shapeName[ap.shape]}, ${n3(ap.w)}${ap.shape === 'C' ? '' : ` × ${n3(ap.h)}`} mm).`)
    }
    if (p.kind === 'flash') {
      push(`${xy(p.at)}D03*`, 'flash', `D03 = flash: stamp the aperture once at ${mm(p.at)}. ${p.label}.`, i)
    } else if (p.kind === 'path') {
      p.pts.forEach((q, j) =>
        push(`${xy(q)}${j === 0 ? 'D02' : 'D01'}*`, j === 0 ? 'move' : 'draw', j === 0 ? `D02 = move with the pen up to ${mm(q)}. ${p.label}.` : `D01 = draw a line with the pen down to ${mm(q)}.`, i),
      )
    } else if (p.kind === 'arc') {
      push(`${xy(p.a)}D02*`, 'move', `Move to ${mm(p.a)}, the start of a rounded corner.`, i)
      push(`G03*`, 'mode', 'G03: counter-clockwise arcs from here.', i)
      const I = p.c[0] - p.a[0]
      const J = -(p.c[1] - p.a[1])
      push(`${xy(p.b)}I${X(I)}J${X(J)}D01*`, 'arc', `Draw an arc to ${mm(p.b)}. I and J give the centre relative to the start.`, i)
      push(`G01*`, 'mode', 'Back to straight lines.', i)
    }
  })
  if (!prims.length) push(`G04 This layer is empty on this board*`, 'comment', 'Nothing on this layer, but the file is still exported so the set is complete.')
  push(`M02*`, 'end', 'M02: end of file.')
  return lines
}

function drillText(prims: Prim[], doc: BoardDoc): GLine[] {
  const H = doc.h
  const lines: GLine[] = []
  const push = (t: string, k: LineKind, note: string, prim?: number) => lines.push({ t, k, note, prim })
  const holes = prims.filter((p): p is Extract<Prim, { kind: 'hole' }> => p.kind === 'hole')
  const sizes = [...new Set(holes.map((h) => h.d))].sort((a, b) => a - b)
  push('M48', 'header', 'M48: start of the Excellon header.')
  push('; Learn PCB educational drill file: Blinky', 'comment', 'Lines starting with ; are comments.')
  push('; Plated through holes (PTH)', 'comment', 'These holes get copper-plated walls.')
  push('METRIC,LZ', 'unit', 'Units are millimetres.')
  sizes.forEach((d, i) => push(`T${String(i + 1).padStart(2, '0')}C${n3(d)}`, 'tool', `Tool T${String(i + 1).padStart(2, '0')}: a ${n3(d)} mm drill bit.`))
  push('%', 'header', 'End of header.')
  push('G90', 'mode', 'G90: absolute coordinates.')
  push('G05', 'mode', 'G05: drill mode (as opposed to routing).')
  sizes.forEach((d, i) => {
    const t = `T${String(i + 1).padStart(2, '0')}`
    push(t, 'tool', `Load tool ${t} (${n3(d)} mm). Every hole below is drilled with it.`)
    prims.forEach((p, j) => {
      if (p.kind !== 'hole' || p.d !== d) return
      push(`X${n3(p.at[0])}Y${n3(H - p.at[1])}`, 'hole', `Drill a hole at (${n3(p.at[0])}, ${n3(H - p.at[1])}) mm. ${p.label}.`, j)
    })
  })
  push('M30', 'end', 'M30: end of program.')
  return lines
}

/* ------------------------------------------------------------------ */

export const FILE_META: Record<FileId, Omit<GFile, 'prims' | 'lines' | 'text' | 'id'>> = {
  GTL: { name: 'Gerber_TopLayer.GTL', title: 'Top copper', about: 'Where copper stays on the top side: tracks, pads and the ground pour.', color: '#e8453c', kind: 'copper' },
  GBL: { name: 'Gerber_BottomLayer.GBL', title: 'Bottom copper', about: 'Copper on the underside: the ground pour and the RESET jumper track.', color: '#3f6fe0', kind: 'copper' },
  GTS: { name: 'Gerber_TopSolderMaskLayer.GTS', title: 'Top solder mask', about: 'Openings in the green mask. Every shape here is a hole in the mask where a pad shows through.', color: '#2fbf7a', kind: 'mask' },
  GBS: { name: 'Gerber_BottomSolderMaskLayer.GBS', title: 'Bottom solder mask', about: 'Mask openings on the underside. Only the through-hole pads of J1 need one.', color: '#1f8f5a', kind: 'mask' },
  GTO: { name: 'Gerber_TopSilkscreenLayer.GTO', title: 'Top silkscreen', about: 'The printed ink: outlines, designators and text, all drawn as lines.', color: '#f4f1e8', kind: 'silk' },
  GBO: { name: 'Gerber_BottomSilkscreenLayer.GBO', title: 'Bottom silkscreen', about: 'Blinky prints nothing on the bottom, so this file is empty but still part of the set.', color: '#c9a0ff', kind: 'silk' },
  GTP: { name: 'Gerber_TopPasteMaskLayer.GTP', title: 'Top paste', about: 'Where solder paste goes. Used to cut a stencil for machine assembly. SMD pads only.', color: '#b9bdc2', kind: 'paste' },
  GKO: { name: 'Gerber_BoardOutlineLayer.GKO', title: 'Board outline', about: 'The shape the factory cuts the board out along. Required.', color: '#e05ad6', kind: 'outline' },
  DRL: { name: 'Drill_PTH_Through.DRL', title: 'Drill (plated)', about: 'An Excellon file: drill sizes and hole positions. Required.', color: '#f2f2f2', kind: 'drill' },
}

export const FILE_ORDER: FileId[] = ['GTL', 'GBL', 'GTS', 'GBS', 'GTO', 'GBO', 'GTP', 'GKO', 'DRL']

export function buildFiles(doc: BoardDoc): Record<FileId, GFile> {
  const conn = analyze(doc)
  const prims: Record<FileId, Prim[]> = {
    GTL: copperPrims(doc, conn, 'top'),
    GBL: copperPrims(doc, conn, 'bottom'),
    GTS: maskPrims(conn, 'top'),
    GBS: maskPrims(conn, 'bottom'),
    GTO: silkPrims(doc, 'top'),
    GBO: silkPrims(doc, 'bottom'),
    GTP: pastePrims(conn, 'top'),
    GKO: outlinePrims(doc),
    DRL: drillPrims(doc, conn),
  }
  const out = {} as Record<FileId, GFile>
  for (const id of FILE_ORDER) {
    const meta = FILE_META[id]
    const lines = id === 'DRL' ? drillText(prims[id], doc) : gerberText(id, meta.title, prims[id], doc)
    out[id] = { id, ...meta, prims: prims[id], lines, text: lines.map((l) => l.t).join('\n') + '\n' }
  }
  return out
}

/** Pads in world space for a part (re-export so the scene can label things). */
export { partPads }
