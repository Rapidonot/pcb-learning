/* A side-on cut through a via: top trace → annular ring → plated barrel → bottom ring → bottom trace. */
import { useEffect, useRef, useState } from 'react'

const CU = 0.035 * 2 // 1 oz copper, drawn 2× thicker so it reads at small sizes
const MASK = 0.025 * 2
const CORE = 1.6
const PLATE = 0.03

export const COLORS = {
  fr4: '#cbb781',
  fr4Weave: '#b49f66',
  copper: '#d58a44',
  copperHi: '#eaa865',
  copperDark: '#a8662c',
  mask: '#1f6b47',
  air: '#ffffff',
}

export function ViaSection({
  d,
  drill,
  explode = 0,
  flow = false,
  labels = true,
  idPrefix = 'vs',
}: {
  d: number
  drill: number
  explode?: number
  flow?: boolean
  labels?: boolean
  idPrefix?: string
}) {
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
  const vbH = botMaskY + MASK + (labels ? 0.62 : 0.2) - vbY
  const right = labels ? 1.35 : 0.3
  // widen the slice of board to fill the panel's aspect ratio
  const HALF_W = Math.max(1.5, Math.min(3.2, ((px.w / px.h) * vbH - right - 0.15) / 2))
  const vbX = -HALF_W - 0.15
  const vbW = HALF_W * 2 + right + 0.15
  const pxPerMm = Math.min(px.w / vbW, px.h / vbH)
  const fs = Math.max(9.5, Math.min(12, px.w / 60)) / pxPerMm
  const sw = 1 / pxPerMm

  const weave = `${idPrefix}-weave`
  const hole = `${idPrefix}-hole`
  const cuGrad = `${idPrefix}-cug`
  const flowPath = `M ${-HALF_W} ${topCuY + CU / 2} L ${-r - PLATE / 2} ${topCuY + CU / 2} L ${-r - PLATE / 2} ${botCuY + CU / 2} L ${HALF_W} ${botCuY + CU / 2}`

  const dim = 'var(--ink-2)'
  const lab = {
    fontFamily: 'var(--font-mono)',
    fontSize: fs,
    fontWeight: 600,
    letterSpacing: fs * 0.08,
    fill: 'var(--ink-2)',
  } as const

  return (
    <div ref={wrap} className="l11-section">
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Cross-section of a via: ${d} mm diameter, ${drill} mm drill, through a ${CORE} mm board`}>
        <defs>
          <pattern id={weave} width={0.24} height={0.16} patternUnits="userSpaceOnUse">
            <rect width={0.24} height={0.16} fill={COLORS.fr4} />
            <path d="M0 0.04 Q0.06 0 0.12 0.04 T0.24 0.04" fill="none" stroke={COLORS.fr4Weave} strokeWidth={0.012} />
            <path d="M0 0.12 Q0.06 0.16 0.12 0.12 T0.24 0.12" fill="none" stroke={COLORS.fr4Weave} strokeWidth={0.012} opacity={0.7} />
          </pattern>
          <linearGradient id={cuGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLORS.copperHi} />
            <stop offset="1" stopColor={COLORS.copper} />
          </linearGradient>
          <clipPath id={hole}>
            <rect x={vbX} y={vbY} width={-r - PLATE - vbX} height={vbH} />
            <rect x={r + PLATE} y={vbY} width={vbW} height={vbH} />
          </clipPath>
        </defs>

        {/* FR-4 core with the drilled hole */}
        <g clipPath={`url(#${hole})`}>
          <rect x={-HALF_W} y={0} width={HALF_W * 2} height={CORE} fill={`url(#${weave})`} />
          <rect x={-HALF_W} y={0} width={HALF_W * 2} height={CORE} fill="none" stroke={COLORS.fr4Weave} strokeWidth={sw} />
        </g>

        {/* solder mask, top and bottom (covers the copper; drawn translucent) */}
        <rect x={-HALF_W} y={topMaskY} width={HALF_W * 2} height={MASK} fill={COLORS.mask} opacity={0.85} rx={0.01} />
        <rect x={-HALF_W} y={botMaskY} width={HALF_W * 2} height={MASK} fill={COLORS.mask} opacity={0.85} rx={0.01} />

        {/* top copper: trace from the left + annular ring */}
        <rect x={-HALF_W} y={topCuY} width={HALF_W - r - PLATE} height={CU} fill={`url(#${cuGrad})`} />
        <rect x={r + PLATE} y={topCuY} width={R - r - PLATE} height={CU} fill={`url(#${cuGrad})`} />
        {/* bottom copper: annular ring + trace to the right */}
        <rect x={-R} y={botCuY} width={R - r - PLATE} height={CU} fill={`url(#${cuGrad})`} />
        <rect x={r + PLATE} y={botCuY} width={HALF_W - r - PLATE} height={CU} fill={`url(#${cuGrad})`} />

        {/* ring zones highlighted */}
        {[topCuY, botCuY].map((y, i) => (
          <g key={i} opacity={0.35}>
            <rect x={-R} y={y} width={R - r - PLATE} height={CU} fill={COLORS.copperDark} />
            <rect x={r + PLATE} y={y} width={R - r - PLATE} height={CU} fill={COLORS.copperDark} />
          </g>
        ))}

        {/* plated barrel walls, stretching between the two rings */}
        {[-1, 1].map((s) => (
          <rect
            key={s}
            x={s < 0 ? -r - PLATE : r}
            y={topCuY}
            width={PLATE}
            height={botCuY + CU - topCuY}
            fill={COLORS.copperDark}
          />
        ))}
        {/* barrel back wall (seen through the hole) */}
        <rect x={-r} y={topCuY} width={r * 2} height={botCuY + CU - topCuY} fill={COLORS.copper} opacity={0.32} />
        <rect x={-r} y={topCuY} width={r * 0.55} height={botCuY + CU - topCuY} fill="#000" opacity={0.12} />

        {/* current flow */}
        {flow && (
          <g className="l11-flow">
            <path d={flowPath} fill="none" stroke="#fff3c4" strokeWidth={CU * 0.55} strokeLinejoin="round" opacity={0.35} />
            <path d={flowPath} fill="none" stroke="#ffe27a" strokeWidth={CU * 0.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.05 0.22" className="l11-flow__dash" />
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
            <Dim x1={-r} x2={r} y={CORE * 0.5} sw={sw} color={dim} />
            <line x1={r} y1={CORE * 0.5} x2={R + 0.35} y2={CORE * 0.32} stroke={dim} strokeWidth={sw} />
            <text {...lab} x={R + 0.4} y={CORE * 0.32 + fs * 0.35}>
              DRILL Ø {drill.toFixed(2)}
            </text>
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
            {/* layer names on the left */}
            <text {...lab} x={-HALF_W + 0.05} y={topCuY - 0.08 - (e > 0.3 ? 0 : MASK)} style={{ fill: e > 0.3 ? COLORS.copperDark : 'var(--ink-3)' }} opacity={e > 0.3 ? 1 : 0.0}>
              TOP COPPER
            </text>
            <text {...lab} x={-HALF_W + 0.05} y={botCuY + CU + fs * 1.1} style={{ fill: COLORS.copperDark }} opacity={e > 0.3 ? 1 : 0}>
              BOTTOM COPPER
            </text>
            <text {...lab} x={-HALF_W + 0.05} y={topMaskY - 0.08} style={{ fill: 'var(--good)' }} opacity={e > 0.3 ? 1 : 0}>
              SOLDER MASK
            </text>
            <g opacity={e > 0.3 ? 1 : 0}>
              <line x1={-r - PLATE / 2} y1={CORE * 0.78} x2={-R - 0.45} y2={CORE * 0.9} stroke={dim} strokeWidth={sw} />
              <text {...lab} x={-R - 0.5} y={CORE * 0.9 + fs * 0.35} textAnchor="end">
                PLATED BARREL
              </text>
            </g>
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

/** Top-down view of a via: ring, hole and an incoming trace. */
export function ViaPlan({ d, drill, size = 120, trace = true }: { d: number; drill: number; size?: number; trace?: boolean }) {
  const s = 1.2
  return (
    <svg viewBox={`${-s} ${-s} ${s * 2} ${s * 2}`} width={size} height={size} role="img" aria-label="Via seen from above">
      {trace && <rect x={-s} y={-0.125} width={s} height={0.25} fill={COLORS.copper} />}
      <circle r={d / 2} fill={COLORS.copper} />
      <circle r={d / 2} fill="none" stroke={COLORS.copperDark} strokeWidth={0.02} />
      <circle r={drill / 2} fill="#1b1a17" />
      <circle r={(d / 2 + drill / 2) / 2} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={0.012} strokeDasharray="0.04 0.04" />
    </svg>
  )
}
