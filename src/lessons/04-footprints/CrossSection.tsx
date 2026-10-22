/* Side-view cross-sections: a through-hole lead in a plated hole vs a gull-wing lead on a pad. */
import type { ReactNode } from 'react'

const Y0 = 250 // board top
const Y1 = 362 // board bottom
const CU = 6 // exaggerated copper thickness
const MASK = 4

function Label({ x, y, tx, ty, children, anchor = 'start' }: { x: number; y: number; tx: number; ty: number; children: ReactNode; anchor?: 'start' | 'end' | 'middle' }) {
  return (
    <g className="l04-xs-label">
      <polyline points={`${x},${y} ${tx},${ty}`} fill="none" stroke="var(--ink-3)" strokeWidth={1} />
      <circle cx={x} cy={y} r={2.6} fill="var(--card)" stroke="var(--ink-2)" strokeWidth={1.2} />
      <text x={tx + (anchor === 'start' ? 5 : anchor === 'end' ? -5 : 0)} y={ty + 4} textAnchor={anchor}>
        {children}
      </text>
    </g>
  )
}

function Board({ x0, x1, openings }: { x0: number; x1: number; openings: [number, number][] }) {
  // mask segments between openings, top and bottom
  const segs: [number, number][] = []
  let cur = x0
  for (const [a, b] of openings) {
    if (a > cur) segs.push([cur, a])
    cur = b
  }
  if (cur < x1) segs.push([cur, x1])
  return (
    <g>
      <rect x={x0} y={Y0} width={x1 - x0} height={Y1 - Y0} fill="url(#l04x-fr4)" />
      <rect x={x0} y={Y0} width={x1 - x0} height={Y1 - Y0} fill="url(#l04x-weave)" opacity={0.5} />
      {segs.map(([a, b], i) => (
        <g key={i}>
          <rect x={a} y={Y0 - MASK} width={b - a} height={MASK + 1} rx={1.5} fill="url(#l04x-mask)" />
          <rect x={a} y={Y1 - 1} width={b - a} height={MASK + 1} rx={1.5} fill="url(#l04x-mask)" />
        </g>
      ))}
    </g>
  )
}

export function CrossSection({ solder, part = 'both' }: { solder: boolean; part?: 'both' | 'tht' | 'smd' }) {
  const vb = part === 'tht' ? '0 0 470 440' : part === 'smd' ? '490 0 470 440' : '0 0 950 440'
  return (
    <svg viewBox={vb} style={{ overflow: 'hidden' }} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cross-sections: a through-hole lead soldered in a plated hole, and a surface-mount gull-wing lead soldered on a pad">
      <defs>
        <linearGradient id="l04x-fr4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8c48e" />
          <stop offset="1" stopColor="#b9a26a" />
        </linearGradient>
        <pattern id="l04x-weave" width="14" height="10" patternUnits="userSpaceOnUse">
          <path d="M 0 5 Q 3.5 2 7 5 T 14 5" stroke="#9c8650" strokeWidth={0.8} fill="none" />
        </pattern>
        <linearGradient id="l04x-mask" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f8a5d" />
          <stop offset="1" stopColor="#1a5a3b" />
        </linearGradient>
        <linearGradient id="l04x-cu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2b27a" />
          <stop offset="1" stopColor="#b8692c" />
        </linearGradient>
        <linearGradient id="l04x-cuV" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b8692c" />
          <stop offset="0.5" stopColor="#f0ac72" />
          <stop offset="1" stopColor="#b8692c" />
        </linearGradient>
        <linearGradient id="l04x-lead" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#80878f" />
          <stop offset="0.35" stopColor="#f4f6f8" />
          <stop offset="0.6" stopColor="#c6cbd1" />
          <stop offset="1" stopColor="#7b828a" />
        </linearGradient>
        <linearGradient id="l04x-leadH" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.55" stopColor="#c0c5cb" />
          <stop offset="1" stopColor="#7b828a" />
        </linearGradient>
        <linearGradient id="l04x-solder" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d5d9de" />
          <stop offset="0.7" stopColor="#a9afb6" />
          <stop offset="1" stopColor="#e9ecef" />
        </linearGradient>
        <linearGradient id="l04x-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efdcb3" />
          <stop offset="0.5" stopColor="#d9bf8a" />
          <stop offset="1" stopColor="#a88b55" />
        </linearGradient>
        <linearGradient id="l04x-ic" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4a50" />
          <stop offset="0.3" stopColor="#2a2a2e" />
          <stop offset="1" stopColor="#151517" />
        </linearGradient>
        <filter id="l04x-sh" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3c2d14" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* ================= THT ================= */}
      <g>
        <text x={225} y={34} textAnchor="middle" className="l04-xs-title">
          THROUGH-HOLE (THT)
        </text>
        <Board x0={20} x1={430} openings={[[150, 300]]} />
        {/* pads and plated barrel */}
        <rect x={158} y={Y0 - CU} width={134} height={CU} rx={1} fill="url(#l04x-cu)" />
        <rect x={158} y={Y1} width={134} height={CU} rx={1} fill="url(#l04x-cu)" />
        <rect x={188} y={Y0} width={74} height={Y1 - Y0} fill="#2a2420" />
        <rect x={188} y={Y0 - CU} width={6} height={Y1 - Y0 + 2 * CU} fill="url(#l04x-cuV)" />
        <rect x={256} y={Y0 - CU} width={6} height={Y1 - Y0 + 2 * CU} fill="url(#l04x-cuV)" />
        {/* solder inside the barrel and fillets */}
        <g className={`l04-solder ${solder ? 'is-on' : ''}`}>
          <rect x={194} y={Y0} width={62} height={Y1 - Y0} fill="url(#l04x-solder)" />
          <path d={`M 160 ${Y0 - CU} Q 205 ${Y0 - CU} 205 ${Y0 - 52} L 245 ${Y0 - 52} Q 245 ${Y0 - CU} 290 ${Y0 - CU} Z`} fill="url(#l04x-solder)" stroke="#8e959c" strokeWidth={0.8} />
          <path d={`M 165 ${Y1 + CU} Q 205 ${Y1 + CU} 205 ${Y1 + 30} L 245 ${Y1 + 30} Q 245 ${Y1 + CU} 285 ${Y1 + CU} Z`} fill="url(#l04x-solder)" stroke="#8e959c" strokeWidth={0.8} />
          <path d={`M 176 ${Y0 - CU - 3} Q 200 ${Y0 - CU - 6} 202 ${Y0 - 40}`} stroke="#fff" strokeWidth={2} fill="none" opacity={0.8} />
        </g>
        {/* lead */}
        <path d={`M 150 108 L 196 108 Q 225 108 225 137 L 225 ${Y1 + 44}`} fill="none" stroke="#6e757c" strokeWidth={24} strokeLinejoin="round" />
        <path d={`M 150 108 L 196 108 Q 225 108 225 137 L 225 ${Y1 + 44}`} fill="none" stroke="url(#l04x-lead)" strokeWidth={22} strokeLinejoin="round" />
        <path d={`M 150 101 L 196 101`} stroke="#fff" strokeOpacity={0.7} strokeWidth={3} />
        <rect x={214} y={Y1 + 44} width={22} height={3} fill="#9aa1a8" />
        {/* component body (axial resistor end) */}
        <g filter="url(#l04x-sh)">
          <path d="M 30 66 L 132 66 C 152 66 158 82 158 108 C 158 134 152 150 132 150 L 30 150 Z" fill="url(#l04x-body)" />
          <rect x={70} y={66} width={16} height={84} fill="#ee7d1f" />
          <rect x={104} y={66} width={16} height={84} fill="#7a4316" />
          <path d="M 30 66 L 132 66 C 152 66 158 82 158 108 C 158 134 152 150 132 150 L 30 150 Z" fill="url(#l04x-solder)" opacity={0.12} />
          <path d="M 34 78 L 132 78" stroke="#fff" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
        </g>
        <Label x={225} y={180} tx={300} ty={150}>
          COMPONENT LEAD
        </Label>
        {solder && (
          <Label x={252} y={Y0 - 20} tx={330} ty={196}>
            SOLDER FILLET
          </Label>
        )}
        <Label x={259} y={310} tx={330} ty={300}>
          PLATED HOLE
        </Label>
        <Label x={286} y={Y0 - 3} tx={360} ty={232}>
          PAD
        </Label>
        <Label x={120} y={300} tx={70} ty={330} anchor="end">
          FR-4
        </Label>
        <Label x={60} y={Y0 - 2} tx={40} ty={220} anchor="end">
          MASK
        </Label>
        <Label x={232} y={Y1 + 22} tx={280} ty={416}>
          BOTTOM JOINT
        </Label>
      </g>

      {/* ================= SMD ================= */}
      <g transform="translate(490 0)">
        <text x={225} y={34} textAnchor="middle" className="l04-xs-title">
          SURFACE-MOUNT (SMD)
        </text>
        <Board x0={20} x1={430} openings={[[226, 336]]} />
        <rect x={232} y={Y0 - CU} width={98} height={CU} rx={1} fill="url(#l04x-cu)" />
        <g className={`l04-solder ${solder ? 'is-on' : ''}`}>
          <path d={`M 232 ${Y0 - CU} Q 244 ${Y0 - CU} 246 ${Y0 - 34} L 262 ${Y0 - 20} L 310 ${Y0 - 20} Q 324 ${Y0 - 14} 330 ${Y0 - CU} Z`} fill="url(#l04x-solder)" stroke="#8e959c" strokeWidth={0.8} />
          <path d={`M 238 ${Y0 - CU - 2} Q 244 ${Y0 - 14} 245 ${Y0 - 26}`} stroke="#fff" strokeWidth={1.8} fill="none" opacity={0.8} />
        </g>
        {/* gull-wing lead */}
        <path d={`M 186 184 L 214 184 Q 224 184 228 196 L 240 ${Y0 - 22} Q 243 ${Y0 - 13} 256 ${Y0 - 13} L 314 ${Y0 - 13}`} fill="none" stroke="#6e757c" strokeWidth={13} strokeLinejoin="round" />
        <path d={`M 186 184 L 214 184 Q 224 184 228 196 L 240 ${Y0 - 22} Q 243 ${Y0 - 13} 256 ${Y0 - 13} L 314 ${Y0 - 13}`} fill="none" stroke="url(#l04x-leadH)" strokeWidth={11} strokeLinejoin="round" />
        {/* IC body */}
        <g filter="url(#l04x-sh)">
          <path d="M 30 150 L 186 150 L 192 160 L 192 210 L 186 222 L 30 222 Z" fill="url(#l04x-ic)" />
          <path d="M 34 156 L 184 156" stroke="#fff" strokeOpacity={0.14} strokeWidth={3} />
          <text x={110} y={194} textAnchor="middle" fontSize={14} fontFamily="IBM Plex Mono, monospace" fill="#9b9b9b" fontWeight={600}>
            SOIC-8
          </text>
        </g>
        <Label x={208} y={184} tx={210} ty={110}>
          GULL-WING LEAD
        </Label>
        {solder && (
          <Label x={322} y={Y0 - 12} tx={345} ty={170}>
            SOLDER FILLET
          </Label>
        )}
        <Label x={300} y={Y0 - 3} tx={380} ty={226}>
          PAD
        </Label>
        <Label x={150} y={312} tx={40} ty={420}>
          NO HOLES NEEDED
        </Label>
        <Label x={330} y={Y1 + 2} tx={300} ty={392}>
          BOTTOM STAYS FREE
        </Label>
      </g>
    </svg>
  )
}
