/* Detailed isometric SVG illustrations of the parts in the tray (art space: viewBox -50 -42 100 84). */
import { useId, type ReactNode } from 'react'
import { box, cylSide, ellR, faceLeft, faceTop, iso, pts, type V2, type V3 } from './iso'
import type { PartId } from './data'

export const ART_VB = '-44 -36 88 72'

const P = (p: V3) => iso(p[0], p[1], p[2])
const poly = (ps: V3[]) => pts(ps.map(P))

/** Gradients & filters shared by every part illustration. Render once per page. */
export function ArtDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="l03-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7f868e" />
          <stop offset="0.38" stopColor="#f5f7f9" />
          <stop offset="0.62" stopColor="#c3c8ce" />
          <stop offset="1" stopColor="#80868d" />
        </linearGradient>
        <linearGradient id="l03-metalV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f4f6" />
          <stop offset="0.5" stopColor="#c0c5cb" />
          <stop offset="1" stopColor="#8a9097" />
        </linearGradient>
        <linearGradient id="l03-metalTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#d7dbe0" />
          <stop offset="1" stopColor="#aab0b7" />
        </linearGradient>
        <linearGradient id="l03-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9c6f16" />
          <stop offset="0.4" stopColor="#ffe39a" />
          <stop offset="0.7" stopColor="#dcae42" />
          <stop offset="1" stopColor="#8f6514" />
        </linearGradient>
        <linearGradient id="l03-plTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#47474d" />
          <stop offset="0.55" stopColor="#2c2c31" />
          <stop offset="1" stopColor="#202024" />
        </linearGradient>
        <linearGradient id="l03-plL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2a2f" />
          <stop offset="1" stopColor="#18181b" />
        </linearGradient>
        <linearGradient id="l03-plR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1d21" />
          <stop offset="1" stopColor="#0f0f11" />
        </linearGradient>
        <linearGradient id="l03-cerTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9bd92" />
          <stop offset="1" stopColor="#b08a58" />
        </linearGradient>
        <linearGradient id="l03-cerL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b48e5c" />
          <stop offset="1" stopColor="#8f6c40" />
        </linearGradient>
        <linearGradient id="l03-cerR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9c7848" />
          <stop offset="1" stopColor="#7a5a32" />
        </linearGradient>
        <linearGradient id="l03-sleeve" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#14284d" />
          <stop offset="0.3" stopColor="#3d66b0" />
          <stop offset="0.45" stopColor="#5b84cc" />
          <stop offset="0.75" stopColor="#24427d" />
          <stop offset="1" stopColor="#101f3d" />
        </linearGradient>
        <linearGradient id="l03-stripe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d9db8" />
          <stop offset="0.6" stopColor="#dfe6f2" />
          <stop offset="1" stopColor="#aab7cc" />
        </linearGradient>
        <linearGradient id="l03-cyl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.35} />
          <stop offset="0.32" stopColor="#fff" stopOpacity={0.22} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.05} />
          <stop offset="1" stopColor="#000" stopOpacity={0.45} />
        </linearGradient>
        <radialGradient id="l03-lens" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffd0c6" />
          <stop offset="0.4" stopColor="#ff5a45" />
          <stop offset="1" stopColor="#a8180e" />
        </radialGradient>
        <linearGradient id="l03-lensSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9c1a10" />
          <stop offset="0.3" stopColor="#ff6b55" />
          <stop offset="0.55" stopColor="#ff4a34" />
          <stop offset="1" stopColor="#8a140b" />
        </linearGradient>
        <filter id="l03-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id="l03-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* primitives                                                          */
/* ------------------------------------------------------------------ */

function Shadow({ ps, o = 0.28 }: { ps: V2[]; o?: number }) {
  return <polygon points={pts(ps)} fill="#2a1d0c" opacity={o} filter="url(#l03-shadow)" />
}

/** Contact shadow ellipse under a world-space point. */
function Blob({ x, y, r, o = 0.3 }: { x: number; y: number; r: number; o?: number }) {
  const [cx, cy] = iso(x, y, 0)
  const e = ellR(r)
  return <ellipse cx={cx + 1.2} cy={cy + 1.6} rx={e.rx} ry={e.ry} fill="#2a1d0c" opacity={o} filter="url(#l03-shadow)" />
}

function Box({
  x, y, z, w, d, h, top, left, right, stroke = 'rgba(0,0,0,0.35)',
}: { x: number; y: number; z: number; w: number; d: number; h: number; top: string; left: string; right: string; stroke?: string }) {
  const b = box(x, y, z, w, d, h)
  return (
    <g strokeWidth={0.25} stroke={stroke} strokeLinejoin="round">
      <polygon points={b.left} fill={left} />
      <polygon points={b.right} fill={right} />
      <polygon points={b.top} fill={top} />
    </g>
  )
}

/** A horizontal cylinder (capsule) between two world points, with bands and shading. */
function Capsule({
  a, b, r, body, bands = [], round = true,
}: { a: V3; b: V3; r: number; body: string; bands?: { at: number; w: number; color: string }[]; round?: boolean }) {
  const uid = useId().replace(/:/g, '')
  const A = P(a)
  const B = P(b)
  const len = Math.hypot(B[0] - A[0], B[1] - A[1])
  const d: V2 = [(B[0] - A[0]) / len, (B[1] - A[1]) / len]
  const n: V2 = [-d[1], d[0]]
  // pick n pointing "down" on screen so the highlight sits on top
  if (n[1] < 0) {
    n[0] = -n[0]
    n[1] = -n[1]
  }
  const off = (p: V2, s: number): V2 => [p[0] + n[0] * r * s, p[1] + n[1] * r * s]
  const [a1, a2, b1, b2] = [off(A, -1), off(A, 1), off(B, -1), off(B, 1)]
  const sweepTop = n[0] * d[1] - n[1] * d[0] > 0 ? 1 : 0
  const path = round
    ? `M ${a1} L ${b1} A ${r} ${r} 0 0 ${sweepTop} ${b2} L ${a2} A ${r} ${r} 0 0 ${sweepTop} ${a1} Z`
    : `M ${a1} L ${b1} L ${b2} L ${a2} Z`
  const g1 = off(A, -1)
  const g2 = off(A, 1)
  return (
    <g>
      <defs>
        <clipPath id={`cl-${uid}`}>
          <path d={path} />
        </clipPath>
        <linearGradient id={`sh-${uid}`} gradientUnits="userSpaceOnUse" x1={g1[0]} y1={g1[1]} x2={g2[0]} y2={g2[1]}>
          <stop offset="0" stopColor="#fff" stopOpacity={0.45} />
          <stop offset="0.22" stopColor="#fff" stopOpacity={0.12} />
          <stop offset="0.55" stopColor="#000" stopOpacity={0.02} />
          <stop offset="1" stopColor="#000" stopOpacity={0.45} />
        </linearGradient>
      </defs>
      <path d={path} fill={body} />
      <g clipPath={`url(#cl-${uid})`}>
        {bands.map((bd, i) => {
          const c = [A[0] + (B[0] - A[0]) * bd.at, A[1] + (B[1] - A[1]) * bd.at]
          const hw = (bd.w / 2) * (len / Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]))
          const q = (s: number, t: number): V2 => [c[0] + d[0] * hw * s + n[0] * r * t * 1.3, c[1] + d[1] * hw * s + n[1] * r * t * 1.3]
          return <polygon key={i} points={pts([q(-1, -1), q(1, -1), q(1, 1), q(-1, 1)])} fill={bd.color} />
        })}
        <path d={path} fill={`url(#sh-${uid})`} />
        <line x1={off(A, -0.55)[0] + d[0] * r * 0.6} y1={off(A, -0.55)[1] + d[1] * r * 0.6} x2={off(B, -0.55)[0] - d[0] * r * 0.6} y2={off(B, -0.55)[1] - d[1] * r * 0.6} stroke="#fff" strokeOpacity={0.55} strokeWidth={r * 0.22} strokeLinecap="round" />
      </g>
      <path d={path} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.3} />
    </g>
  )
}

/** A metal wire (lead) along world points, with a highlight. */
function Lead({ ps, w = 1.1, gold }: { ps: V3[]; w?: number; gold?: boolean }) {
  const s = poly(ps)
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={s} stroke={gold ? '#8f6514' : '#6f757c'} strokeWidth={w + 0.5} />
      <polyline points={s} stroke={gold ? '#e2b54a' : '#c9ced4'} strokeWidth={w} />
      <polyline points={s} stroke="#fff" strokeOpacity={0.7} strokeWidth={w * 0.3} transform={`translate(${-w * 0.18} ${-w * 0.18})`} />
    </g>
  )
}

function Mono({ children, size, fill = '#d8d8d8', x = 0, y = 0, anchor = 'middle', weight = 600 }: { children: ReactNode; size: number; fill?: string; x?: number; y?: number; anchor?: 'start' | 'middle' | 'end'; weight?: number }) {
  return (
    <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontFamily="IBM Plex Mono, monospace" fontWeight={weight} dominantBaseline="central">
      {children}
    </text>
  )
}

/* ------------------------------------------------------------------ */
/* parts                                                               */
/* ------------------------------------------------------------------ */

function AxialResistor() {
  return (
    <g transform="translate(0 4)">
      <Shadow ps={[iso(-34, -2, 0), iso(34, -2, 0), iso(34, 4, 0), iso(-34, 4, 0)]} o={0.18} />
      <Blob x={0} y={0} r={8} o={0.25} />
      <Lead ps={[[-36, 0, 3.6], [-14, 0, 3.6]]} />
      <Lead ps={[[14, 0, 3.6], [36, 0, 3.6]]} />
      <Capsule
        a={[-14, 0, 3.6]}
        b={[14, 0, 3.6]}
        r={4.2}
        body="#dcc493"
        bands={[
          { at: 0.2, w: 2.4, color: '#ee7d1f' },
          { at: 0.34, w: 2.4, color: '#ee7d1f' },
          { at: 0.48, w: 2.4, color: '#7a4316' },
          { at: 0.8, w: 2.4, color: '#c9a43a' },
        ]}
      />
    </g>
  )
}

function Diode() {
  return (
    <g transform="translate(0 4)">
      <Shadow ps={[iso(-34, -2, 0), iso(34, -2, 0), iso(34, 4, 0), iso(-34, 4, 0)]} o={0.18} />
      <Blob x={0} y={0} r={7} o={0.25} />
      <Lead ps={[[-36, 0, 3.4], [-10, 0, 3.4]]} />
      <Lead ps={[[10, 0, 3.4], [36, 0, 3.4]]} />
      <Capsule a={[-11, 0, 3.4]} b={[11, 0, 3.4]} r={4} body="#2a2a2e" round={false} bands={[{ at: 0.84, w: 3, color: '#cfd3d8' }]} />
      {/* rounded end caps */}
      <g transform={faceTop(-4, -1.2, 7.6)}>
        <Mono size={2.2} x={4} y={0} fill="#9a9a9a">
          1N4007
        </Mono>
      </g>
    </g>
  )
}

/** SMD chip (resistor or MLCC), drawn magnified. */
function Chip({ cap }: { cap?: boolean }) {
  const L = 26
  const W = 14
  const H = 6
  const T = 5
  const x0 = -L / 2
  const y0 = -W / 2
  return (
    <g transform="translate(0 3)">
      <Shadow ps={[iso(x0 - 1, y0 - 1, 0), iso(x0 + L + 2, y0 - 1, 0), iso(x0 + L + 2, y0 + W + 2, 0), iso(x0 - 1, y0 + W + 2, 0)]} o={0.32} />
      {/* back termination */}
      <Box x={x0} y={y0} z={0} w={T} d={W} h={H} top="url(#l03-metalTop)" left="url(#l03-metalV)" right="#9da3aa" />
      {cap ? (
        <Box x={x0 + T} y={y0 + 0.2} z={0.1} w={L - 2 * T} d={W - 0.4} h={H - 0.2} top="url(#l03-cerTop)" left="url(#l03-cerL)" right="url(#l03-cerR)" />
      ) : (
        <>
          <Box x={x0 + T} y={y0 + 0.2} z={0.1} w={L - 2 * T} d={W - 0.4} h={H - 0.5} top="#eceae3" left="#d6d3ca" right="#bdb9ae" />
          {/* black resistive overglaze on top */}
          <polygon points={pts([iso(x0 + T + 0.3, y0 + 1, H - 0.38), iso(x0 + L - T - 0.3, y0 + 1, H - 0.38), iso(x0 + L - T - 0.3, y0 + W - 1, H - 0.38), iso(x0 + T + 0.3, y0 + W - 1, H - 0.38)])} fill="url(#l03-plTop)" />
          <g transform={faceTop(0, 0, H - 0.3)}>
            <g transform="translate(-6 -3.6)">
              <Mono size={5.6} x={6} y={3.8} fill="#f0f0f0">
                331
              </Mono>
            </g>
          </g>
        </>
      )}
      <Box x={x0 + L - T} y={y0} z={0} w={T} d={W} h={H} top="url(#l03-metalTop)" left="url(#l03-metalV)" right="#9da3aa" />
      {/* specular edge */}
      <polyline points={pts([iso(x0, y0 + W, H), iso(x0 + L, y0 + W, H)])} stroke="#fff" strokeOpacity={0.4} strokeWidth={0.4} />
    </g>
  )
}

function Electrolytic() {
  const r = 11
  const z0 = 0
  const z1 = 30
  const [cx, ctop] = iso(0, 0, z1)
  const [, cbot] = iso(0, 0, z0)
  const e = ellR(r)
  // stripe: band on the left-facing part of the can
  const xs0 = cx - e.rx * 0.92
  const xs1 = cx - e.rx * 0.5
  const yOn = (x: number, yc: number, s: number) => yc + s * e.ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / e.rx) ** 2))
  const stripe = `M ${xs0} ${yOn(xs0, ctop, 1)} L ${xs0} ${yOn(xs0, cbot, 1)} Q ${(xs0 + xs1) / 2} ${yOn((xs0 + xs1) / 2, cbot, 1) + 0.6} ${xs1} ${yOn(xs1, cbot, 1)} L ${xs1} ${yOn(xs1, ctop, 1)} Q ${(xs0 + xs1) / 2} ${yOn((xs0 + xs1) / 2, ctop, 1) + 0.6} ${xs0} ${yOn(xs0, ctop, 1)} Z`
  return (
    <g transform="translate(0 4)">
      <Blob x={0} y={0} r={13} o={0.35} />
      {/* legs: short (−) on the stripe side, long (+) */}
      <Lead ps={[[0, 3.6, 0], [0, 3.6, -9]]} w={1} />
      <Lead ps={[[0, -3.6, 0], [0, -3.6, -14]]} w={1} />
      <path d={cylSide(0, 0, z0, z1, r)} fill="url(#l03-sleeve)" />
      <path d={stripe} fill="url(#l03-stripe)" />
      {[0.2, 0.42, 0.64].map((t, i) => (
        <rect key={i} x={(xs0 + xs1) / 2 - 1.4} y={ctop + 6 + t * (cbot - ctop - 8)} width={2.8} height={0.9} rx={0.3} fill="#1b2f57" />
      ))}
      {/* printed text */}
      <g fill="#dbe4f3" fontFamily="IBM Plex Mono, monospace" fontWeight={600} textAnchor="middle">
        <text x={cx + 3.5} y={ctop + 11} fontSize={3.4}>
          10µF
        </text>
        <text x={cx + 3.5} y={ctop + 15.5} fontSize={2.8} opacity={0.85}>
          25V
        </text>
      </g>
      {/* rolled top edge + aluminium top with vent */}
      <ellipse cx={cx} cy={ctop} rx={e.rx} ry={e.ry} fill="#1c3566" />
      <ellipse cx={cx} cy={ctop + 0.4} rx={e.rx * 0.88} ry={e.ry * 0.88} fill="url(#l03-metalTop)" />
      <g stroke="#8e959d" strokeWidth={0.45} fill="none">
        <path d={`M ${cx - e.rx * 0.5} ${ctop + 0.4} L ${cx + e.rx * 0.5} ${ctop + 0.4}`} />
        <path d={`M ${cx} ${ctop + 0.4 - e.ry * 0.5} L ${cx} ${ctop + 0.4 + e.ry * 0.5}`} />
      </g>
      <ellipse cx={cx} cy={ctop + 0.4} rx={e.rx * 0.88} ry={e.ry * 0.88} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.4} />
    </g>
  )
}

function Led5mm() {
  const r = 7
  const [cx, flTop] = iso(0, 0, 7)
  const [, bodyTop] = iso(0, 0, 20)
  const ef = ellR(r + 0.9)
  const et = ellR(r)
  const R = r * 1.2247
  return (
    <g transform="translate(0 0)">
      <Blob x={0} y={0} r={10} o={0.3} />
      <Lead ps={[[0, 3.2, 6], [0, 3.2, -8]]} w={1} />
      <Lead ps={[[0, -3.2, 6], [0, -3.2, -15]]} w={1} />
      {/* flange with the flat (cathode) on the left */}
      <path d={cylSide(0, 0, 5.4, 7, r + 0.9)} fill="url(#l03-lensSide)" />
      <ellipse cx={cx} cy={flTop} rx={ef.rx} ry={ef.ry} fill="#e64532" />
      <line x1={cx - ef.rx * 0.98} y1={flTop - 1.8} x2={cx - ef.rx * 0.62} y2={flTop + 2.4} stroke="#ffd6cc" strokeWidth={0.7} />
      {/* body */}
      <path d={cylSide(0, 0, 7, 20, r)} fill="url(#l03-lensSide)" opacity={0.95} />
      {/* internals visible through the epoxy */}
      <g opacity={0.5}>
        <path d={`M ${cx - 4} ${flTop} V ${bodyTop + 6} l 4 -2.2 V ${flTop} Z`} fill="#5a0f08" />
        <path d={`M ${cx + 1.2} ${flTop} V ${bodyTop + 9} h 2 V ${flTop} Z`} fill="#5a0f08" />
        <path d={`M ${cx - 0.2} ${bodyTop + 4.6} q 1.6 -2 2.4 1`} stroke="#ffd9b0" strokeWidth={0.3} fill="none" />
      </g>
      <ellipse cx={cx} cy={bodyTop} rx={et.rx} ry={et.ry} fill="#ff5a45" opacity={0.5} />
      {/* dome */}
      <path d={`M ${cx - R} ${bodyTop} A ${R} ${R} 0 0 1 ${cx + R} ${bodyTop} A ${R} ${et.ry} 0 0 1 ${cx - R} ${bodyTop} Z`} fill="url(#l03-lens)" />
      <ellipse cx={cx - 3.2} cy={bodyTop - 4} rx={1.8} ry={3.4} fill="#fff" opacity={0.6} transform={`rotate(28 ${cx - 3.2} ${bodyTop - 4})`} />
      <path d={`M ${cx + R * 0.82} ${bodyTop - 2} A ${R} ${R} 0 0 1 ${cx + R * 0.95} ${bodyTop + 8}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={0.6} fill="none" />
    </g>
  )
}

/** DIP-8: pin 1 sits at the notch end on the near (front-left) row. */
function Dip8() {
  const L = 28
  const W = 18
  const H = 7
  const z = 4
  const xs = [-10.5, -3.5, 3.5, 10.5]
  const leg = (x: number, y: number) => (
    <g key={`${x}${y}`} transform={faceLeft(x - 1.6, y, z + 3.4)}>
      <path d="M 0 0 H 3.2 V 2.6 L 2.4 3.6 V 11 L 1.6 12.4 L 0.8 11 V 3.6 L 0 2.6 Z" fill="url(#l03-metal)" stroke="#5e646b" strokeWidth={0.2} />
    </g>
  )
  return (
    <g transform="translate(0 -2)">
      <Shadow ps={[iso(-L / 2, -W / 2 - 2, -8), iso(L / 2 + 2, -W / 2 - 2, -8), iso(L / 2 + 2, W / 2 + 3, -8), iso(-L / 2, W / 2 + 3, -8)]} o={0.25} />
      {xs.map((x) => leg(x, -W / 2 + 0.6))}
      <Box x={-L / 2} y={-W / 2} z={z} w={L} d={W} h={H} top="url(#l03-plTop)" left="url(#l03-plL)" right="url(#l03-plR)" />
      {/* parting line */}
      <polyline points={poly([[-L / 2, W / 2, z + 3.4], [L / 2, W / 2, z + 3.4], [L / 2, -W / 2, z + 3.4]])} fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={0.3} />
      {xs.map((x) => leg(x, W / 2))}
      <g transform={faceTop(-L / 2, -W / 2, z + H)}>
        {/* notch, dot and marking */}
        <path d={`M 0 ${W / 2 - 2.6} A 2.6 2.6 0 0 1 0 ${W / 2 + 2.6} Z`} fill="#141416" />
        <circle cx={3.6} cy={W - 3.4} r={1.3} fill="#1a1a1d" stroke="#000" strokeOpacity={0.3} strokeWidth={0.2} />
        <g transform={`translate(${L / 2 + 1} ${W / 2})`}>
          <Mono size={3.8} y={-2.2} fill="#cfcfcf">
            NE555P
          </Mono>
          <Mono size={2.4} y={2} fill="#9a9a9a" weight={500}>
            TI 26A G4
          </Mono>
        </g>
      </g>
      <polyline points={poly([[-L / 2, W / 2, z + H], [L / 2, W / 2, z + H], [L / 2, -W / 2, z + H]])} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={0.4} />
    </g>
  )
}

function Soic8() {
  const L = 19.6
  const W = 15.6
  const H = 5.6
  const z = 0.8
  const xs = [-7.6, -2.54, 2.54, 7.6]
  const wing = (x: number, s: 1 | -1) => (
    <Lead key={`${x}${s}`} ps={[[x, (s * W) / 2, z + 2.2], [x, s * (W / 2 + 1.6), z + 2.2], [x, s * (W / 2 + 2.8), 0.4], [x, s * (W / 2 + 5), 0.4]]} w={1.7} />
  )
  return (
    <g transform="translate(0 -2)">
      <Shadow ps={[iso(-L / 2 - 1, -W / 2 - 5, 0), iso(L / 2 + 2, -W / 2 - 5, 0), iso(L / 2 + 2, W / 2 + 6, 0), iso(-L / 2 - 1, W / 2 + 6, 0)]} o={0.3} />
      {xs.map((x) => wing(x, -1))}
      <Box x={-L / 2} y={-W / 2} z={z} w={L} d={W} h={H} top="url(#l03-plTop)" left="url(#l03-plL)" right="url(#l03-plR)" />
      {xs.map((x) => wing(x, 1))}
      <g transform={faceTop(-L / 2, -W / 2, z + H)}>
        <circle cx={3} cy={W - 3} r={1.4} fill="#18181b" stroke="#000" strokeOpacity={0.35} strokeWidth={0.2} />
        <g transform={`translate(${L / 2 + 1} ${W / 2})`}>
          <Mono size={3.2} y={-1.6} fill="#cfcfcf">
            NE555
          </Mono>
          <Mono size={2} y={1.8} fill="#9a9a9a" weight={500}>
            26A G4
          </Mono>
        </g>
      </g>
      {/* bevel on the pin-1 long edge */}
      <polyline points={poly([[-L / 2, W / 2, z + H - 0.6], [L / 2, W / 2, z + H - 0.6]])} stroke="#fff" strokeOpacity={0.16} strokeWidth={0.5} fill="none" />
    </g>
  )
}

function Sot23() {
  const L = 17
  const W = 8
  const H = 5
  const z = 0.8
  const wing = (x: number, s: 1 | -1) => (
    <Lead key={`${x}${s}`} ps={[[x, (s * W) / 2, z + 2], [x, s * (W / 2 + 1.4), z + 2], [x, s * (W / 2 + 2.6), 0.4], [x, s * (W / 2 + 5), 0.4]]} w={2.4} />
  )
  return (
    <g transform="translate(0 0)">
      <Shadow ps={[iso(-L / 2 - 1, -W / 2 - 5, 0), iso(L / 2 + 2, -W / 2 - 5, 0), iso(L / 2 + 2, W / 2 + 6, 0), iso(-L / 2 - 1, W / 2 + 6, 0)]} o={0.3} />
      {wing(0, -1)}
      <Box x={-L / 2} y={-W / 2} z={z} w={L} d={W} h={H} top="url(#l03-plTop)" left="url(#l03-plL)" right="url(#l03-plR)" />
      {wing(-5.5, 1)}
      {wing(5.5, 1)}
      <g transform={faceTop(-L / 2, -W / 2, z + H)}>
        <Mono size={3.4} x={L / 2} y={W / 2} fill="#bdbdbd">
          1AM
        </Mono>
      </g>
    </g>
  )
}

function Header2() {
  const p = 9
  const pin = (x: number) => (
    <g key={x}>
      <Box x={x - 1.1} y={-1.1} z={5.5} w={2.2} d={2.2} h={17} top="#ffe39a" left="url(#l03-gold)" right="#b8891f" stroke="rgba(90,60,10,0.4)" />
      {/* pyramid tip */}
      <polygon points={pts([iso(x - 1.1, 1.1, 22.5), iso(x + 1.1, 1.1, 22.5), iso(x, 0, 24)])} fill="#d9a93a" />
      <polygon points={pts([iso(x + 1.1, 1.1, 22.5), iso(x + 1.1, -1.1, 22.5), iso(x, 0, 24)])} fill="#a77d1c" />
    </g>
  )
  const tail = (x: number) => <Box key={`t${x}`} x={x - 1.1} y={-1.1} z={-9} w={2.2} d={2.2} h={10} top="#ffe39a" left="url(#l03-gold)" right="#b8891f" stroke="rgba(90,60,10,0.4)" />
  return (
    <g transform="translate(0 2)">
      <Blob x={0} y={0} r={11} o={0.32} />
      {[-p / 2, p / 2].map(tail)}
      {[-p / 2, p / 2].map((x) => (
        <Box key={x} x={x - p / 2 + 0.15} y={-p / 2 + 0.6} z={0} w={p - 0.3} d={p - 1.2} h={5.5} top="url(#l03-plTop)" left="url(#l03-plL)" right="url(#l03-plR)" />
      ))}
      {[-p / 2, p / 2].map(pin)}
    </g>
  )
}

function Button() {
  const S = 22
  const h = 6
  const legs = (s: 1 | -1) =>
    [-6, 6].map((y) => (
      <g key={`${s}${y}`}>
        <Lead ps={[[(s * S) / 2, y, 2.5], [(s * S) / 2 + 1.6, y, 2.5], [(s * S) / 2 + 1.6, y, -7]]} w={1.8} />
      </g>
    ))
  const [cx, cy] = iso(0, 0, h + 1.2)
  const [, cy2] = iso(0, 0, h + 7)
  const e = ellR(5.6)
  return (
    <g transform="translate(0 2)">
      <Shadow ps={[iso(-S / 2 - 2, -S / 2 - 2, -2), iso(S / 2 + 4, -S / 2 - 2, -2), iso(S / 2 + 4, S / 2 + 4, -2), iso(-S / 2 - 2, S / 2 + 4, -2)]} o={0.3} />
      {legs(-1)}
      <Box x={-S / 2} y={-S / 2} z={0} w={S} d={S} h={h} top="url(#l03-plTop)" left="url(#l03-plL)" right="url(#l03-plR)" />
      {/* steel cover plate */}
      <Box x={-S / 2 - 0.2} y={-S / 2 - 0.2} z={h} w={S + 0.4} d={S + 0.4} h={1.2} top="url(#l03-metalTop)" left="url(#l03-metalV)" right="#8f959c" />
      {[[-S / 2 + 3, -S / 2 + 3], [S / 2 - 3, -S / 2 + 3], [S / 2 - 3, S / 2 - 3], [-S / 2 + 3, S / 2 - 3]].map(([x, y], i) => {
        const [px, py] = iso(x, y, h + 1.2)
        return <ellipse key={i} cx={px} cy={py} rx={1.3} ry={0.75} fill="#8d939a" />
      })}
      {legs(1)}
      {/* round plunger */}
      <path d={cylSide(0, 0, h + 1.2, h + 7, 5.6)} fill="#1e1e22" />
      <path d={cylSide(0, 0, h + 1.2, h + 7, 5.6)} fill="url(#l03-cyl)" />
      <ellipse cx={cx} cy={cy2} rx={e.rx} ry={e.ry} fill="url(#l03-plTop)" />
      <ellipse cx={cx} cy={cy2} rx={e.rx} ry={e.ry} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={0.4} />
      <ellipse cx={cx} cy={cy} rx={e.rx + 0.6} ry={e.ry + 0.4} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={0.5} />
    </g>
  )
}

const ARTS: Record<PartId, () => ReactNode> = {
  'res-tht': AxialResistor,
  'res-smd': () => (
    <g transform="scale(1.25)">
      <Chip />
    </g>
  ),
  'cap-cer': () => (
    <g transform="scale(1.25)">
      <Chip cap />
    </g>
  ),
  'cap-elec': Electrolytic,
  led: Led5mm,
  diode: Diode,
  'ic-dip': Dip8,
  'ic-soic': () => (
    <g transform="scale(1.15)">
      <Soic8 />
    </g>
  ),
  transistor: () => (
    <g transform="scale(1.3)">
      <Sot23 />
    </g>
  ),
  header: Header2,
  button: Button,
}

export function PartArt({ id, size, title }: { id: PartId; size?: number | string; title?: string }) {
  const A = ARTS[id]
  return (
    <svg viewBox={ART_VB} width={size ?? '100%'} height={size ?? '100%'} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={{ display: 'block', overflow: 'visible' }}>
      <A />
    </svg>
  )
}
