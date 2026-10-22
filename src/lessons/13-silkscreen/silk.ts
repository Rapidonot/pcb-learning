/* Silkscreen model for the "fix the silkscreen" game, plus the live checks. */
import { getFootprint } from '@/pcb/footprints'
import { courtyardRect, padShape, type BoardDoc, type PartInst, type WorldPad } from '@/pcb/board'
import { add, rotate, shapeDist, type Shape, type Vec } from '@/pcb/geom'

export interface Label {
  id: string
  kind: 'ref' | 'text'
  /** for designators: the part it belongs to */
  ref?: string
  text: string
  /** centre of the text, mm */
  x: number
  y: number
  /** character (cap) height, mm */
  size: number
  /** stroke / line width, mm */
  line: number
  /** reading direction, degrees counter-clockwise: 0 = left→right, 90 = bottom→top */
  rot: number
}

export const MIN_SIZE = 1.0
export const MIN_LINE = 0.15
/** monospace advance per character, relative to cap height */
export const ADV = 0.86
/** cap height relative to font size (IBM Plex Mono) */
export const CAP = 0.7

export function labelSize(l: Pick<Label, 'text' | 'size' | 'line'>) {
  return { w: Math.max(1, l.text.length) * ADV * l.size + l.line, h: l.size + l.line }
}

/** The label's footprint as a rotated rectangle (polygon). */
export function labelPoly(l: Label, pad = 0): Vec[] {
  const { w, h } = labelSize(l)
  const hw = w / 2 + pad
  const hh = h / 2 + pad
  const corners: Vec[] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]
  return corners.map((c) => add([l.x, l.y], rotate(c, -l.rot)))
}

export const labelShape = (l: Label, pad = 0): Shape => ({ pts: labelPoly(l, pad), r: 0 })

const norm = (a: number) => ((Math.round(a) % 360) + 360) % 360

export type Severity = 'error' | 'warn'
export type IssueKind = 'pad' | 'hidden' | 'overlap' | 'offboard' | 'small' | 'thin' | 'orient' | 'far' | 'wrongpart'
export interface Issue {
  id: string
  label: string
  kind: IssueKind
  severity: Severity
  text: string
}

/** Part body rectangle in world space (what will sit on the board after assembly). */
export function bodyShape(p: PartInst): Shape {
  const fp = getFootprint(p.fp)
  const { w, h } = fp.body
  const c: Vec[] = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ]
  return { pts: c.map((v) => add([p.x, p.y], rotate(v, p.rot))), r: 0 }
}

function rectDist(pt: Vec, r: { x0: number; y0: number; x1: number; y1: number }) {
  const dx = Math.max(r.x0 - pt[0], 0, pt[0] - r.x1)
  const dy = Math.max(r.y0 - pt[1], 0, pt[1] - r.y1)
  return Math.hypot(dx, dy)
}

/** Distance from a label's nearest edge to a part's courtyard. */
function labelToPart(l: Label, p: PartInst) {
  const r = courtyardRect(p)
  const poly = labelPoly(l)
  const shape: Shape = { pts: [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]], r: 0 }
  return Math.min(shapeDist({ pts: poly, r: 0 }, shape), ...poly.map((v) => rectDist(v, r)))
}

export function checkSilk(doc: BoardDoc, pads: WorldPad[], labels: Label[]): Issue[] {
  const issues: Issue[] = []
  const padShapes = pads.map((p) => ({ p, s: padShape(p) }))
  for (const l of labels) {
    const name = l.kind === 'ref' ? l.text : `"${l.text}"`
    const shape = labelShape(l)
    // silk on pads
    const onPads = padShapes.filter(({ s }) => shapeDist(shape, s) < 0.05).map(({ p }) => `${p.ref}.${p.num}`)
    if (onPads.length)
      issues.push({ id: `${l.id}:pad`, label: l.id, kind: 'pad', severity: 'error', text: `${name} sits on pad ${onPads[0]}${onPads.length > 1 ? ` (+${onPads.length - 1})` : ''}. The fab clips silk off pads.` })
    // hidden under a part body
    if (!onPads.length) {
      const under = doc.parts.find((p) => shapeDist(shape, bodyShape(p)) < 0.01)
      if (under) issues.push({ id: `${l.id}:hidden`, label: l.id, kind: 'hidden', severity: 'error', text: `${name} is under ${under.ref}'s body: hidden once it's soldered on.` })
    }
    // off the board
    const poly = labelPoly(l)
    if (poly.some(([x, y]) => x < 0.3 || y < 0.3 || x > doc.w - 0.3 || y > doc.h - 0.3))
      issues.push({ id: `${l.id}:off`, label: l.id, kind: 'offboard', severity: 'error', text: `${name} runs off the edge of the board.` })
    // size
    if (l.size + 1e-6 < MIN_SIZE) issues.push({ id: `${l.id}:small`, label: l.id, kind: 'small', severity: 'warn', text: `${name} is ${l.size.toFixed(1)} mm tall. Use at least ${MIN_SIZE} mm.` })
    if (l.line + 1e-6 < MIN_LINE) issues.push({ id: `${l.id}:thin`, label: l.id, kind: 'thin', severity: 'warn', text: `${name}'s lines are ${l.line.toFixed(2)} mm. Use at least ${MIN_LINE} mm.` })
    const r = norm(l.rot)
    if (r !== 0 && r !== 90)
      issues.push({ id: `${l.id}:orient`, label: l.id, kind: 'orient', severity: 'warn', text: r === 180 ? `${name} is upside down.` : r === 270 ? `${name} reads top to bottom. Make it read from the bottom or the right.` : `${name} is at an odd angle (${r}°).` })
    // designator near its own part, and nearer to it than to any other part
    if (l.kind === 'ref' && l.ref) {
      const own = doc.parts.find((p) => p.ref === l.ref)
      if (own) {
        const dOwn = labelToPart(l, own)
        const nearest = doc.parts.filter((p) => p.ref !== l.ref).map((p) => ({ p, d: labelToPart(l, p) })).sort((a, b) => a.d - b.d)[0]
        if (dOwn > 1.6) issues.push({ id: `${l.id}:far`, label: l.id, kind: 'far', severity: 'warn', text: `${name} is ${dOwn.toFixed(1)} mm from its part. Keep it right next to ${l.ref}.` })
        else if (nearest && nearest.d + 0.15 < dOwn && nearest.d < 0.8)
          issues.push({ id: `${l.id}:wrong`, label: l.id, kind: 'wrongpart', severity: 'warn', text: `${name} looks like it labels ${nearest.p.ref}. Move it closer to ${l.ref}.` })
      }
    }
  }
  // overlapping labels
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++)
      if (shapeDist(labelShape(labels[i]), labelShape(labels[j])) < 0.05)
        issues.push({ id: `${labels[i].id}:${labels[j].id}:ov`, label: labels[i].id, kind: 'overlap', severity: 'error', text: `${labels[i].text} and ${labels[j].text} overlap.` })
  return issues
}

/* ------------------------------------------------------------------ */
/* Blinky: the messy starting point and the suggested tidy spots       */
/* ------------------------------------------------------------------ */

const ref = (r: string, x: number, y: number, size: number, rot = 0, line = 0.15): Label => ({ id: `ref-${r}`, kind: 'ref', ref: r, text: r, x, y, size, line, rot })

export function messyLabels(): Label[] {
  return [
    ref('U1', 15.3, 13.0, 1.2, 180),
    ref('C2', 18.95, 8, 0.5, 0, 0.1),
    ref('R1', 25, 9.6, 0.5, 0, 0.1),
    ref('R2', 27.2, 15, 0.8, 45),
    ref('C1', 23.2, 19.75, 1.0),
    ref('C3', 18.6, 18.6, 1.0, 180),
    ref('R3', 4.6, 22, 1.0),
    ref('D1', 12, 21.95, 1.0, 270),
    ref('J1', 4, 11.73, 0.5, 0, 0.1),
  ]
}

/** Good positions (centre of text) used for hints and magnetic snapping. */
export const SUGGEST: Record<string, Vec> = {
  U1: [18, 16.4],
  C2: [18, 6.5],
  R1: [26.95, 10.5],
  R2: [26.95, 15],
  C1: [25.25, 18.8],
  C3: [18.85, 18],
  R3: [10.05, 17],
  D1: [10.05, 21],
  J1: [4, 9.75],
}

/** Where polarity marks go. */
export const LED_BAR = { cathode: { x1: 11.25, y1: 22.75, x2: 12.75, y2: 22.75 }, anode: { x1: 11.25, y1: 19.25, x2: 12.75, y2: 19.25 } }
export const PIN1_DOT: Vec = [14.25, 10.4]
