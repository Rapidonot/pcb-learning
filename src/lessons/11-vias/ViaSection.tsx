/* A side-on cut through a via: top trace → annular ring → plated barrel → bottom ring → bottom trace. */
import { useEffect, useId, useRef, useState } from 'react'

const CU = 0.035 * 2 // 1 oz copper, drawn 2× thicker so it reads at small sizes
const MASK = 0.025 * 2
const CORE = 1.6
const PLATE = 0.03

export const COLORS = {
  fr4: '#cbb781',
  fr4Weave: '#b49f66',
  copper: '#d58a44',
  copperHi: '#f3be82',
  copperDark: '#9a5a24',
  mask: '#1f6b47',
  air: '#ffffff',
}

/** Shared <defs> for detailed copper / FR-4 / mask fills. */
export function SectionDefs({ p }: { p: string }) {
  return (
    <defs>
      {/* FR-4: epoxy resin with glass-fibre bundles. Weft bundles cut end-on show as ellipses; warp bundles weave over and under them. */}
      <radialGradient id={`${p}-fib`} cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#fbf3dc" />
        <stop offset="0.6" stopColor="#e6d6aa" />
        <stop offset="1" stopColor="#bba571" />
      </radialGradient>
      <linearGradient id={`${p}-warp`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#efe2bb" />
        <stop offset="0.5" stopColor="#dcc995" />
        <stop offset="1" stopColor="#b9a26b" />
      </linearGradient>
      <pattern id={`${p}-weave`} width={0.36} height={0.2} patternUnits="userSpaceOnUse">
        <rect width={0.36} height={0.2} fill="#c7b17a" />
        <path d="M-0.02 0.07 C0.06 0.07 0.1 0.13 0.18 0.13 S0.3 0.07 0.38 0.07 L0.38 0.1 C0.3 0.1 0.26 0.16 0.18 0.16 S0.06 0.1 -0.02 0.1 Z" fill={`url(#${p}-warp)`} opacity={0.9} />
        <ellipse cx={0.06} cy={0.1} rx={0.055} ry={0.026} fill={`url(#${p}-fib)`} stroke="#a89260" strokeWidth={0.004} />
        <ellipse cx={0.3} cy={0.1} rx={0.055} ry={0.026} fill={`url(#${p}-fib)`} stroke="#a89260" strokeWidth={0.004} />
        <circle cx={0.18} cy={0.035} r={0.008} fill="#b49f66" opacity={0.6} />
        <circle cx={0.24} cy={0.18} r={0.006} fill="#b49f66" opacity={0.5} />
      </pattern>
      <linearGradient id={`${p}-resin`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity={0.12} />
        <stop offset="0.12" stopColor="#000" stopOpacity={0} />
        <stop offset="0.88" stopColor="#000" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.16} />
      </linearGradient>
      {/* copper foil: bright top edge, darker underside */}
      <linearGradient id={`${p}-cu`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbd3a2" />
        <stop offset="0.3" stopColor="#e9a565" />
        <stop offset="0.75" stopColor="#c87c3a" />
        <stop offset="1" stopColor="#8f5121" />
      </linearGradient>
      {/* plating on the hole wall */}
      <linearGradient id={`${p}-plateL`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8f5121" />
        <stop offset="0.5" stopColor="#d9955a" />
        <stop offset="1" stopColor="#f0b77c" />
      </linearGradient>
      <linearGradient id={`${p}-plateR`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f0b77c" />
        <stop offset="0.5" stopColor="#d9955a" />
        <stop offset="1" stopColor="#8f5121" />
      </linearGradient>
      {/* the far half of the barrel, seen through the hole: a shaded copper tube interior */}
      <linearGradient id={`${p}-tube`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5b3013" />
        <stop offset="0.18" stopColor="#a8622a" />
        <stop offset="0.38" stopColor="#f6c48e" />
        <stop offset="0.5" stopColor="#e2a062" />
        <stop offset="0.8" stopColor="#9a5824" />
        <stop offset="1" stopColor="#4e2810" />
      </linearGradient>
      <linearGradient id={`${p}-tubeV`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity={0.35} />
        <stop offset="0.15" stopColor="#000" stopOpacity={0} />
        <stop offset="0.85" stopColor="#000" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.35} />
      </linearGradient>
      {/* glossy solder mask */}
      <linearGradient id={`${p}-mask`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4fa57a" />
        <stop offset="0.35" stopColor="#24774f" />
        <stop offset="1" stopColor="#164f34" />
      </linearGradient>
      <linearGradient id={`${p}-flow`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff6c8" />
        <stop offset="1" stopColor="#ffd34a" />
      </linearGradient>
      <filter id={`${p}-shadow`} x="-10%" y="-10%" width="120%" height="140%">
        <feDropShadow dx={0} dy={0.05} stdDeviation={0.05} floodColor="#3b2a10" floodOpacity={0.28} />
      </filter>
      <filter id={`${p}-glow`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={0.02} />
      </filter>
    </defs>
  )
}

export function ViaSection({
  d,
  drill,
  explode = 0,
  flow = false,
  labels = true,
  idPrefix,
}: {
  d: number
  drill: number
  explode?: number
  flow?: boolean
  labels?: boolean
  idPrefix?: string
}) {
  const auto = useId().replace(/[^a-zA-Z0-9]/g, '')
  const p = idPrefix ?? `vs${auto}`
  const wrap = useRef<HTMLDivElement>(null)
  const [px, setPx] = useState({ w: 700, h: 280 })
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setPx({ w: Math.max(200, e.contentRect.width), h: Math.max(120, e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const e = explode
  const gapCu = e * 0.32
  const gapMask = e * 0.62
  // vertical positions (y down, core top = 0)
  const topCuY = -CU - gapCu
  const topMaskY = -CU - MASK - gapMask
  const botCuY = CORE + gapCu
  const botMaskY = CORE + CU + gapMask
  const r = drill / 2
  const R = d / 2

  const vbY = topMaskY - (labels ? 0.75 : 0.2)
  const vbH = botMaskY + MASK + (labels ? 0.62 : 0.25) - vbY
  const right = labels ? 1.35 : 0.3
  // widen the slice of board to fill the panel's aspect ratio
  const HALF_W = Math.max(1.5, Math.min(3.2, ((px.w / px.h) * vbH - right - 0.15) / 2))
  const vbX = -HALF_W - 0.15
  const vbW = HALF_W * 2 + right + 0.15
  const pxPerMm = Math.min(px.w / vbW, px.h / vbH)
  const fs = Math.max(9.5, Math.min(12, px.w / 60)) / pxPerMm
  const sw = 1 / pxPerMm

  const barrelTop = topCuY
  const barrelH = botCuY + CU - topCuY
  const flowPath = `M ${-HALF_W} ${topCuY + CU / 2} L ${-r - PLATE / 2} ${topCuY + CU / 2} L ${-r - PLATE / 2} ${botCuY + CU / 2} L ${HALF_W} ${botCuY + CU / 2}`
  const sh = e > 0.05 ? `url(#${p}-shadow)` : undefined

  const dim = 'var(--ink-2)'
  const lab = {
    fontFamily: 'var(--font-mono)',
    fontSize: fs,
    fontWeight: 600,
    letterSpacing: fs * 0.08,
    fill: 'var(--ink-2)',
  } as const

  /** A copper slab with a specular top edge. */
  const cu = (x: number, w: number, y: number, key: string) =>
    w <= 0 ? null : (
      <g key={key}>
        <rect x={x} y={y} width={w} height={CU} fill={`url(#${p}-cu)`} />
        <rect x={x} y={y} width={w} height={CU * 0.16} fill="#fff" opacity={0.35} />
      </g>
    )

  /** A solder-mask film with gloss. */
  const mask = (y: number) => (
    <g filter={sh}>
      <rect x={-HALF_W} y={y} width={HALF_W * 2} height={MASK} fill={`url(#${p}-mask)`} opacity={0.92} />
      <rect x={-HALF_W} y={y} width={HALF_W * 2} height={MASK * 0.22} fill="#fff" opacity={0.28} />
    </g>
  )

  /** Callout: dot on the subject, leader line and a pill label. */
  const callout = (ax: number, ay: number, lx: number, ly: number, text: string, anchor: 'start' | 'end' | 'middle' = 'start', color?: string, dot = true) => {
    const w = text.length * fs * 0.66 + fs * 0.9
    const h = fs * 1.65
    const bx = anchor === 'start' ? lx : anchor === 'end' ? lx - w : lx - w / 2
    return (
      <g>
        {dot && <line x1={ax} y1={ay} x2={lx} y2={ly} stroke={dim} strokeWidth={sw} />}
        {dot && <circle cx={ax} cy={ay} r={sw * 2.6} fill="var(--card)" stroke={dim} strokeWidth={sw} />}
        <rect x={bx} y={ly - h / 2} width={w} height={h} rx={h * 0.3} fill="var(--card)" fillOpacity={0.92} stroke="var(--line-2)" strokeWidth={sw} />
        <text {...lab} x={bx + fs * 0.45} y={ly + fs * 0.36} style={{ fill: color ?? 'var(--ink-2)' }}>
          {text}
        </text>
      </g>
    )
  }

  const corePath = `M ${-HALF_W} 0 H ${-r - PLATE} V ${CORE} H ${-HALF_W} Z M ${r + PLATE} 0 H ${HALF_W} V ${CORE} H ${r + PLATE} Z`

  return (
    <div ref={wrap} className="l11-section">
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Cross-section of a via: ${d} mm diameter, ${drill} mm drill, through a ${CORE} mm board`}>
        <SectionDefs p={p} />

        {/* FR-4 core, drilled, with soft shadow */}
        <path d={corePath} fill={`url(#${p}-weave)`} filter={`url(#${p}-shadow)`} />
        <path d={corePath} fill={`url(#${p}-resin)`} />
        {/* drill-wall roughness */}
        {[-1, 1].map((s) => (
          <rect key={s} x={s < 0 ? -r - PLATE - 0.03 : r + PLATE} y={0} width={0.03} height={CORE} fill="#7d6a3c" opacity={0.35} />
        ))}

        {/* barrel interior: the far half of the plated tube, shaded like a cylinder */}
        <rect x={-r} y={barrelTop} width={r * 2} height={barrelH} fill={`url(#${p}-tube)`} />
        <rect x={-r} y={barrelTop} width={r * 2} height={barrelH} fill={`url(#${p}-tubeV)`} />

        {mask(topMaskY)}
        {mask(botMaskY)}

        {/* top copper: trace from the left + ring; bottom copper: ring + trace to the right */}
        <g filter={sh}>
          {cu(-HALF_W, HALF_W - r - PLATE, topCuY, 'tl')}
          {cu(r + PLATE, R - r - PLATE, topCuY, 'tr')}
        </g>
        <g filter={sh}>
          {cu(-R, R - r - PLATE, botCuY, 'bl')}
          {cu(r + PLATE, HALF_W - r - PLATE, botCuY, 'br')}
        </g>
        {/* ring zones: a subtle tint and a hairline where the pad ends */}
        {[topCuY, botCuY].map((y, i) => (
          <g key={i}>
            <rect x={-R} y={y} width={R - r - PLATE} height={CU} fill="#7a3f12" opacity={0.18} />
            <rect x={r + PLATE} y={y} width={R - r - PLATE} height={CU} fill="#7a3f12" opacity={0.18} />
            <line x1={i === 0 ? R : -R} y1={y} x2={i === 0 ? R : -R} y2={y + CU} stroke="#7a3f12" strokeWidth={sw * 0.8} opacity={0.6} />
          </g>
        ))}

        {/* plated barrel walls (cut faces), stretching between the rings */}
        <rect x={-r - PLATE} y={barrelTop} width={PLATE} height={barrelH} fill={`url(#${p}-plateL)`} />
        <rect x={r} y={barrelTop} width={PLATE} height={barrelH} fill={`url(#${p}-plateR)`} />

        {/* current flow */}
        {flow && (
          <g style={{ pointerEvents: 'none' }}>
            <path d={flowPath} fill="none" stroke="#ffe9a0" strokeWidth={CU * 0.9} strokeLinejoin="round" opacity={0.35} filter={`url(#${p}-glow)`} />
            <path d={flowPath} fill="none" stroke="#ffd34a" strokeWidth={CU * 0.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.05 0.22" className="l11-flow__dash" />
          </g>
        )}

        {labels && (
          <g style={{ pointerEvents: 'none' }}>
            {/* via diameter */}
            <Dim x1={-R} x2={R} y={topMaskY - 0.2} sw={sw} color={dim} />
            <text {...lab} x={0} y={topMaskY - 0.3} textAnchor="middle">
              VIA Ø {d.toFixed(2)} MM
            </text>
            {/* drill */}
            <Dim x1={-r} x2={r} y={CORE * 0.5} sw={sw} color="#fff" />
            {callout(r * 0.55, CORE * 0.5, R + 0.35, CORE * 0.28, `DRILL Ø ${drill.toFixed(2)}`)}
            {/* annular ring */}
            <Dim x1={r} x2={R} y={botMaskY + MASK + 0.18} sw={sw} color={dim} />
            <text {...lab} x={R + 0.1} y={botMaskY + MASK + 0.18 + fs * 0.35}>
              RING {((d - drill) / 2).toFixed(2)}
            </text>
            {/* board thickness */}
            <line x1={HALF_W + 0.2} y1={0} x2={HALF_W + 0.2} y2={CORE} stroke={dim} strokeWidth={sw} />
            <line x1={HALF_W + 0.12} y1={0} x2={HALF_W + 0.28} y2={0} stroke={dim} strokeWidth={sw} />
            <line x1={HALF_W + 0.12} y1={CORE} x2={HALF_W + 0.28} y2={CORE} stroke={dim} strokeWidth={sw} />
            <text {...lab} x={HALF_W + 0.36} y={CORE / 2 - fs * 0.2}>
              1.6 MM
            </text>
            <text {...lab} x={HALF_W + 0.36} y={CORE / 2 + fs * 1.0} style={{ fill: 'var(--ink-3)' }}>
              FR-4
            </text>
            {/* layer names appear as the layers separate */}
            <g opacity={e > 0.3 ? 1 : 0} style={{ transition: 'opacity .3s' }}>
              <text {...lab} x={-HALF_W + 0.05} y={topCuY - 0.06} style={{ fill: '#a8622a' }}>
                TOP COPPER
              </text>
              <text {...lab} x={-HALF_W + 0.05} y={botCuY + CU + fs * 1.1} style={{ fill: '#a8622a' }}>
                BOTTOM COPPER
              </text>
              <text {...lab} x={-HALF_W + 0.05} y={topMaskY - 0.06} style={{ fill: 'var(--good)' }}>
                SOLDER MASK
              </text>
            </g>
            {callout(-r - PLATE / 2, CORE * 0.78, -R - 0.4, CORE * 0.9, 'PLATED BARREL', 'end', '#a8622a')}
            {HALF_W > 2 && callout(0, 0, -HALF_W * 0.62, CORE * 0.35, 'GLASS + EPOXY', 'middle', undefined, false)}
          </g>
        )}
      </svg>
    </div>
  )
}

function Dim({ x1, x2, y, sw, color }: { x1: number; x2: number; y: number; sw: number; color: string }) {
  const t = 0.06
  return (
    <g stroke={color} strokeWidth={sw}>
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - t} x2={x1} y2={y + t} />
      <line x1={x2} y1={y - t} x2={x2} y2={y + t} />
    </g>
  )
}

/** Top-down view of a via: domed copper ring, dark hole and an incoming trace. */
export function ViaPlan({ d, drill, size = 120, trace = true }: { d: number; drill: number; size?: number; trace?: boolean }) {
  const s = 1.2
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox={`${-s} ${-s} ${s * 2} ${s * 2}`} width={size} height={size} role="img" aria-label="Via seen from above">
      <defs>
        <radialGradient id={`${id}-ring`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffe1b8" />
          <stop offset="0.45" stopColor="#e19a57" />
          <stop offset="1" stopColor="#9a5824" />
        </radialGradient>
        <radialGradient id={`${id}-hole`} cx="0.6" cy="0.65" r="0.7">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.7" stopColor="#2b1a0d" />
          <stop offset="1" stopColor="#8a4f1e" />
        </radialGradient>
        <linearGradient id={`${id}-tr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3be82" />
          <stop offset="1" stopColor="#b56f31" />
        </linearGradient>
      </defs>
      {trace && <rect x={-s} y={-0.125} width={s} height={0.25} fill={`url(#${id}-tr)`} />}
      <circle r={d / 2 + 0.02} fill="#000" opacity={0.25} transform="translate(0.02 0.03)" />
      <circle r={d / 2} fill={`url(#${id}-ring)`} />
      <circle r={drill / 2} fill={`url(#${id}-hole)`} />
      <circle r={drill / 2} fill="none" stroke="#f6c48e" strokeWidth={0.015} opacity={0.8} />
    </svg>
  )
}
