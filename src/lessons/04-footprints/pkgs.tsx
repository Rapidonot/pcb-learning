/* Package metadata + EDA-style dimension callouts for lesson 4. */
import type { ReactNode } from 'react'
import { getFootprint, type FootprintDef, type PadDef } from '@/pcb/footprints'

export interface Pkg {
  id: string
  label: string
  group: 'Chip' | 'SMD' | 'THT'
  value?: string
  about: string
  blinky?: string
  metric?: string
}

export const PKGS: Pkg[] = [
  { id: 'R0402', label: '0402', group: 'Chip', value: '330', metric: '1005', about: 'Tiny 1.0 × 0.5 mm chip. Great for dense boards, hard by hand.' },
  { id: 'R0603', label: '0603', group: 'Chip', value: '330', metric: '1608', about: '1.6 × 0.8 mm. Common in commercial products.' },
  { id: 'R0805', label: '0805', group: 'Chip', value: '330', metric: '2012', about: '2.0 × 1.25 mm. Small but friendly to hand soldering.', blinky: 'R1–R3, C1–C3 and D1' },
  { id: 'R1206', label: '1206', group: 'Chip', value: '330', metric: '3216', about: '3.2 × 1.6 mm. Big, easy, and handles more power.' },
  { id: 'SOT-23', label: 'SOT-23', group: 'SMD', about: 'Three gull-wing legs. Typical for small transistors and regulators.' },
  { id: 'SOIC-8', label: 'SOIC-8', group: 'SMD', value: 'NE555', about: 'Eight gull-wing legs on a 1.27 mm pitch.', blinky: 'U1, the 555 timer' },
  { id: 'DIP-8', label: 'DIP-8', group: 'THT', value: 'NE555', about: 'Eight legs through plated holes, 2.54 mm apart. Breadboard-friendly.' },
  { id: 'HDR-1x2', label: 'Header', group: 'THT', about: 'Pin header: square posts on a 2.54 mm pitch.', blinky: 'J1, the power input' },
  { id: 'LED-5MM', label: 'LED 5 mm', group: 'THT', about: 'Classic through-hole LED. The square pad is the cathode.' },
  { id: 'R-AXIAL-0.4', label: 'Axial', group: 'THT', value: '330', about: 'Through-hole resistor with legs bent 10.16 mm (0.4 in) apart.' },
]
export const pkgById = Object.fromEntries(PKGS.map((p) => [p.id, p])) as Record<string, Pkg>
export const CHIP_IDS = ['R0402', 'R0603', 'R0805', 'R1206']

export const mm = (v: number) => `${+v.toFixed(2)}`

/** Pitch (centre-to-centre of neighbouring pads) and row spacing for a footprint. */
export function geometry(fp: FootprintDef) {
  const p = fp.pads
  const p1 = p[0]
  let pitch: { a: PadDef; b: PadDef; v: number; axis: 'x' | 'y' } | null = null
  let row: { a: PadDef; b: PadDef; v: number; axis: 'x' | 'y' } | null = null
  if (p.length >= 2) {
    // neighbours in the same column/row as pad 1
    const sameCol = p.filter((q) => q !== p1 && Math.abs(q.x - p1.x) < 0.01).sort((a, b) => Math.abs(a.y - p1.y) - Math.abs(b.y - p1.y))
    const sameRow = p.filter((q) => q !== p1 && Math.abs(q.y - p1.y) < 0.01).sort((a, b) => Math.abs(a.x - p1.x) - Math.abs(b.x - p1.x))
    if (sameCol.length) pitch = { a: p1, b: sameCol[0], v: Math.abs(sameCol[0].y - p1.y), axis: 'y' }
    else if (fp.id === 'SOT-23') pitch = { a: p[0], b: p[1], v: Math.abs(p[1].x - p[0].x), axis: 'x' }
    if (sameRow.length && sameCol.length) row = { a: p1, b: sameRow[0], v: Math.abs(sameRow[0].x - p1.x), axis: 'x' }
    else if (sameRow.length) pitch = { a: p1, b: sameRow[0], v: Math.abs(sameRow[0].x - p1.x), axis: 'x' }
    if (fp.id === 'SOT-23') row = { a: p[0], b: p[2], v: Math.abs(p[2].y - p[0].y), axis: 'y' }
  }
  return { pitch, row }
}

export function padSize(p: PadDef) {
  return p.shape === 'round' ? `⌀${mm(p.w)}` : `${mm(p.w)} × ${mm(p.h)}`
}

/* ------------------------------------------------------------------ */
/* Dimension graphics (world mm)                                       */
/* ------------------------------------------------------------------ */

const DIM = '#7fd6ff'

function Arrow({ x, y, ang, s }: { x: number; y: number; ang: number; s: number }) {
  return <path d={`M 0 0 L ${-s} ${-s * 0.42} L ${-s} ${s * 0.42} Z`} transform={`translate(${x} ${y}) rotate(${ang})`} fill={DIM} />
}

/** A linear dimension between a and b along one axis, offset to `at` on the other axis. */
export function Dim({ a, b, axis, at, label, u, hl }: { a: number; b: number; axis: 'x' | 'y'; at: number; label: ReactNode; u: number; hl?: boolean }) {
  const [lo, hi] = a < b ? [a, b] : [b, a]
  const sw = u * 0.06
  const ah = u * 0.32
  const fs = u * 0.52
  const inside = hi - lo > ah * 2.6
  const color = hl ? '#ffd166' : DIM
  if (axis === 'x') {
    return (
      <g className="l04-dim" style={{ color }}>
        <line x1={lo} y1={at} x2={hi} y2={at} stroke={color} strokeWidth={sw} />
        {inside ? (
          <>
            <Arrow x={lo} y={at} ang={180} s={ah} />
            <Arrow x={hi} y={at} ang={0} s={ah} />
          </>
        ) : (
          <>
            <line x1={lo - ah * 2} y1={at} x2={lo} y2={at} stroke={color} strokeWidth={sw} />
            <line x1={hi} y1={at} x2={hi + ah * 2} y2={at} stroke={color} strokeWidth={sw} />
            <Arrow x={lo} y={at} ang={0} s={ah} />
            <Arrow x={hi} y={at} ang={180} s={ah} />
          </>
        )}
        <text x={(lo + hi) / 2} y={at - fs * 0.45} fontSize={fs} textAnchor="middle" className="l04-dimtext" fill={color}>
          {label}
        </text>
      </g>
    )
  }
  return (
    <g className="l04-dim">
      <line x1={at} y1={lo} x2={at} y2={hi} stroke={color} strokeWidth={sw} />
      {inside ? (
        <>
          <Arrow x={at} y={lo} ang={-90} s={ah} />
          <Arrow x={at} y={hi} ang={90} s={ah} />
        </>
      ) : (
        <>
          <line x1={at} y1={lo - ah * 2} x2={at} y2={lo} stroke={color} strokeWidth={sw} />
          <line x1={at} y1={hi} x2={at} y2={hi + ah * 2} stroke={color} strokeWidth={sw} />
          <Arrow x={at} y={lo} ang={90} s={ah} />
          <Arrow x={at} y={hi} ang={-90} s={ah} />
        </>
      )}
      <text x={at + fs * 0.5} y={(lo + hi) / 2} fontSize={fs} dominantBaseline="central" className="l04-dimtext" fill={color}>
        {label}
      </text>
    </g>
  )
}

/** Extension line from a feature to a dimension line. */
export function Ext({ x1, y1, x2, y2, u }: { x1: number; y1: number; x2: number; y2: number; u: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={DIM} strokeWidth={u * 0.035} strokeDasharray={`${u * 0.12} ${u * 0.1}`} opacity={0.7} />
}

/** Full set of callouts for a footprint: pad 1 size, pitch, row spacing, drill. */
export function Dimensions({ fp, u, hlPitch }: { fp: FootprintDef; u: number; hlPitch?: boolean }) {
  const pads = fp.pads
  const minX = Math.min(...pads.map((p) => p.x - p.w / 2))
  const maxX = Math.max(...pads.map((p) => p.x + p.w / 2))
  const minY = Math.min(...pads.map((p) => p.y - p.h / 2))
  const maxY = Math.max(...pads.map((p) => p.y + p.h / 2))
  const p1 = pads[0]
  const { pitch, row } = geometry(fp)
  const g = u * 1.1
  const out: ReactNode[] = []
  // pad 1 width (above) and height (left)
  const topY = Math.min(minY, -fp.courtyard.h) - g
  const leftX = Math.min(minX, -fp.courtyard.w) - g
  out.push(<Ext key="e1" x1={p1.x - p1.w / 2} y1={p1.y - p1.h / 2} x2={p1.x - p1.w / 2} y2={topY} u={u} />)
  out.push(<Ext key="e2" x1={p1.x + p1.w / 2} y1={p1.y - p1.h / 2} x2={p1.x + p1.w / 2} y2={topY} u={u} />)
  out.push(<Dim key="pw" a={p1.x - p1.w / 2} b={p1.x + p1.w / 2} axis="x" at={topY} label={p1.shape === 'round' ? `⌀${mm(p1.w)}` : mm(p1.w)} u={u} />)
  if (p1.shape !== 'round') {
    out.push(<Ext key="e3" x1={p1.x - p1.w / 2} y1={p1.y - p1.h / 2} x2={leftX} y2={p1.y - p1.h / 2} u={u} />)
    out.push(<Ext key="e4" x1={p1.x - p1.w / 2} y1={p1.y + p1.h / 2} x2={leftX} y2={p1.y + p1.h / 2} u={u} />)
    out.push(<Dim key="ph" a={p1.y - p1.h / 2} b={p1.y + p1.h / 2} axis="y" at={leftX} label={mm(p1.h)} u={u} />)
  }
  if (pitch) {
    if (pitch.axis === 'y') {
      const x = Math.max(maxX, fp.courtyard.w) + g
      out.push(<Ext key="e5" x1={pitch.a.x} y1={pitch.a.y} x2={x} y2={pitch.a.y} u={u} />)
      out.push(<Ext key="e6" x1={pitch.b.x} y1={pitch.b.y} x2={x} y2={pitch.b.y} u={u} />)
      out.push(<Dim key="pi" a={pitch.a.y} b={pitch.b.y} axis="y" at={x} label={`pitch ${mm(pitch.v)}`} u={u} hl={hlPitch} />)
    } else {
      const y = Math.max(maxY, fp.courtyard.h) + g
      out.push(<Ext key="e5" x1={pitch.a.x} y1={pitch.a.y} x2={pitch.a.x} y2={y} u={u} />)
      out.push(<Ext key="e6" x1={pitch.b.x} y1={pitch.b.y} x2={pitch.b.x} y2={y} u={u} />)
      out.push(<Dim key="pi" a={pitch.a.x} b={pitch.b.x} axis="x" at={y} label={fp.pads.length === 2 ? `${mm(pitch.v)} c–c` : `pitch ${mm(pitch.v)}`} u={u} hl={hlPitch} />)
    }
  }
  if (row) {
    if (row.axis === 'x') {
      const y = Math.max(maxY, fp.courtyard.h) + g
      out.push(<Ext key="e7" x1={row.a.x} y1={row.a.y} x2={row.a.x} y2={y} u={u} />)
      out.push(<Ext key="e8" x1={row.b.x} y1={row.b.y} x2={row.b.x} y2={y} u={u} />)
      out.push(<Dim key="ro" a={row.a.x} b={row.b.x} axis="x" at={y} label={`rows ${mm(row.v)}`} u={u} />)
    } else {
      const x = Math.max(maxX, fp.courtyard.w) + g
      out.push(<Ext key="e7" x1={row.a.x} y1={row.a.y} x2={x} y2={row.a.y} u={u} />)
      out.push(<Ext key="e8" x1={row.b.x} y1={row.b.y} x2={x} y2={row.b.y} u={u} />)
      out.push(<Dim key="ro" a={row.a.y} b={row.b.y} axis="y" at={x} label={`rows ${mm(row.v)}`} u={u} />)
    }
  }
  if (p1.drill) {
    out.push(
      <g key="dr">
        <line x1={p1.x} y1={p1.y} x2={p1.x - u * 1.2} y2={p1.y + u * 1.6} stroke="#ffd166" strokeWidth={u * 0.05} />
        <text x={p1.x - u * 1.3} y={p1.y + u * 2.15} fontSize={u * 0.5} textAnchor="end" className="l04-dimtext" fill="#ffd166">
          drill ⌀{mm(p1.drill)}
        </text>
      </g>,
    )
  }
  return <g style={{ pointerEvents: 'none' }}>{out}</g>
}

/** Bounding box (mm) that includes the footprint and its dimension callouts. */
export function footprintBounds(fp: FootprintDef, u: number) {
  const pads = fp.pads
  const minX = Math.min(...pads.map((p) => p.x - p.w / 2), -fp.courtyard.w, -fp.body.w / 2)
  const maxX = Math.max(...pads.map((p) => p.x + p.w / 2), fp.courtyard.w, fp.body.w / 2)
  const minY = Math.min(...pads.map((p) => p.y - p.h / 2), -fp.courtyard.h, -fp.body.h / 2)
  const maxY = Math.max(...pads.map((p) => p.y + p.h / 2), fp.courtyard.h, fp.body.h / 2)
  const m = u * 2.4
  const extraL = pads[0].drill ? u * 2.6 : 0
  return { x: minX - m - extraL, y: minY - m, w: maxX - minX + 2 * m + u * 2.2 + extraL, h: maxY - minY + 2 * m }
}

/** A comfortable dimension unit for a footprint (mm). */
export function unitFor(fp: FootprintDef) {
  const s = Math.max(fp.courtyard.w, fp.courtyard.h) * 2
  return Math.max(0.42, s / 11)
}

export { getFootprint }
