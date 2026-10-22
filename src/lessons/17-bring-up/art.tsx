/*
 * Hand-drawn top-view component art for the bring-up bench, in millimetres (origin = part centre).
 * Every part can show its solder joints as: none (bare pad), good (shiny concave fillet), cold (dull, grainy)
 * or lifted (lead not touching the pad).
 */
import type { FootprintDef } from '@/pcb/footprints'
import type { Joint } from './model'

/* ------------------------------------------------------------------ */
/* Shared gradients & filters (fixed ids, prefixed l17-)               */
/* ------------------------------------------------------------------ */

export function ArtDefs() {
  return (
    <defs>
      <linearGradient id="l17-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbfcfd" />
        <stop offset="0.3" stopColor="#d4d8dd" />
        <stop offset="0.55" stopColor="#f1f3f5" />
        <stop offset="1" stopColor="#8d949c" />
      </linearGradient>
      <linearGradient id="l17-metalH" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9aa1a8" />
        <stop offset="0.35" stopColor="#eef1f3" />
        <stop offset="0.7" stopColor="#c7ccd2" />
        <stop offset="1" stopColor="#f7f8fa" />
      </linearGradient>
      <linearGradient id="l17-lead" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f6f8" />
        <stop offset="0.45" stopColor="#c3c8ce" />
        <stop offset="1" stopColor="#7f868e" />
      </linearGradient>
      <linearGradient id="l17-shoulder" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#6c737b" />
        <stop offset="1" stopColor="#b9bec4" />
      </linearGradient>
      <linearGradient id="l17-plastic" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#3b3b41" />
        <stop offset="0.25" stopColor="#25252a" />
        <stop offset="1" stopColor="#121215" />
      </linearGradient>
      <linearGradient id="l17-plasticTop" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor="#34343a" />
        <stop offset="1" stopColor="#1b1b1f" />
      </linearGradient>
      <linearGradient id="l17-ceramic" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f7f4ec" />
        <stop offset="1" stopColor="#cfc9bb" />
      </linearGradient>
      <linearGradient id="l17-overglaze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#34343a" />
        <stop offset="0.5" stopColor="#1d1d21" />
        <stop offset="1" stopColor="#111114" />
      </linearGradient>
      <linearGradient id="l17-capbody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9b98d" />
        <stop offset="0.5" stopColor="#bf9a6b" />
        <stop offset="1" stopColor="#8f6e47" />
      </linearGradient>
      {/* concave fillet seen from above: bright where it climbs the termination, darker on the flat, bright rim */}
      <linearGradient id="l17-fillet" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.14" stopColor="#e8ecef" />
        <stop offset="0.5" stopColor="#80878f" />
        <stop offset="0.8" stopColor="#bfc4ca" />
        <stop offset="1" stopColor="#f2f4f6" />
      </linearGradient>
      <linearGradient id="l17-filletV" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id="l17-wet" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="0.22" stopColor="#c9ced3" stopOpacity="0.35" />
        <stop offset="0.7" stopColor="#8a9198" stopOpacity="0.25" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.8" />
      </linearGradient>
      <radialGradient id="l17-hasl" cx="0.45" cy="0.4" r="0.75">
        <stop offset="0" stopColor="#c3c7cb" />
        <stop offset="0.7" stopColor="#a4a9ae" />
        <stop offset="1" stopColor="#8c9298" />
      </radialGradient>
      <radialGradient id="l17-cold" cx="0.4" cy="0.35" r="0.8">
        <stop offset="0" stopColor="#c9c8c1" />
        <stop offset="0.6" stopColor="#a5a49d" />
        <stop offset="1" stopColor="#7c7b75" />
      </radialGradient>
      <radialGradient id="l17-blob" cx="0.38" cy="0.32" r="0.85">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.3" stopColor="#e2e6ea" />
        <stop offset="0.75" stopColor="#99a0a8" />
        <stop offset="1" stopColor="#d6dade" />
      </radialGradient>
      <radialGradient id="l17-cone" cx="0.42" cy="0.38" r="0.7">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#dfe3e7" />
        <stop offset="0.8" stopColor="#8f979f" />
        <stop offset="1" stopColor="#c8cdd2" />
      </radialGradient>
      <linearGradient id="l17-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff2c2" />
        <stop offset="0.45" stopColor="#e8b84d" />
        <stop offset="1" stopColor="#a0701c" />
      </linearGradient>
      <radialGradient id="l17-lens" cx="0.4" cy="0.35" r="0.85">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="0.5" stopColor="#fbe9df" stopOpacity="0.7" />
        <stop offset="1" stopColor="#e7cfc2" stopOpacity="0.85" />
      </radialGradient>
      <radialGradient id="l17-lensOn" cx="0.5" cy="0.5" r="0.7">
        <stop offset="0" stopColor="#fff6ea" />
        <stop offset="0.35" stopColor="#ff8a6a" />
        <stop offset="1" stopColor="#e2321f" />
      </radialGradient>
      <radialGradient id="l17-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ff5a3c" stopOpacity="0.85" />
        <stop offset="0.25" stopColor="#ff3d22" stopOpacity="0.45" />
        <stop offset="0.6" stopColor="#ff2a10" stopOpacity="0.12" />
        <stop offset="1" stopColor="#ff2a10" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="l17-dimple" cx="0.6" cy="0.65" r="0.7">
        <stop offset="0" stopColor="#2a2a2f" />
        <stop offset="1" stopColor="#0b0b0d" />
      </radialGradient>
      <filter id="l17-blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="0.14" />
      </filter>
      <filter id="l17-blur2" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="0.3" />
      </filter>
      <filter id="l17-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="9" numOctaves="2" seed="7" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.25  0 0 0 0 0.24  0 0 0 0.55 0" result="g" />
        <feComposite in="g" in2="SourceGraphic" operator="in" result="gi" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="gi" />
        </feMerge>
      </filter>
    </defs>
  )
}

/* ------------------------------------------------------------------ */
/* Solder fillets                                                      */
/* ------------------------------------------------------------------ */

/**
 * A fillet from a termination face (x0) out to the pad edge (x1), drawn for the +x side.
 * Mirror with side = -1.
 */
export function ChipFillet({ x0, x1, hh, side, state, anim }: { x0: number; x1: number; hh: number; side: 1 | -1; state: Joint; anim?: boolean }) {
  if (state === 'none')
    // no solder: a thin dark gap where the termination just rests on the bare pad
    return <rect x={side > 0 ? x0 - 0.02 : -x0 - 0.06} y={-hh} width={0.08} height={hh * 2} fill="#000" opacity={0.35} filter="url(#l17-blur)" />
  const t = `scale(${side} 1)`
  if (state === 'cold' || state === 'lifted') {
    return (
      <g transform={t}>
        <path
          d={`M ${x0 + 0.02} ${-hh * 0.85} Q ${x1 + 0.08} ${-hh} ${x1} 0 Q ${x1 + 0.08} ${hh} ${x0 + 0.02} ${hh * 0.85} Q ${x0 + 0.1} 0 ${x0 + 0.02} ${-hh * 0.85} Z`}
          fill="url(#l17-cold)"
          filter="url(#l17-grain)"
        />
        <line x1={x0 + 0.03} y1={-hh * 0.8} x2={x0 + 0.03} y2={hh * 0.8} stroke="#2e2e2c" strokeWidth={0.05} opacity={0.75} />
      </g>
    )
  }
  const r = Math.min(0.16, (x1 - x0) * 0.4)
  return (
    <g transform={t} className={anim ? 'l17-grow' : undefined}>
      <path
        d={`M ${x0 - 0.06} ${-hh} L ${x1 - r} ${-hh} Q ${x1} ${-hh} ${x1} ${-hh + r} L ${x1} ${hh - r} Q ${x1} ${hh} ${x1 - r} ${hh} L ${x0 - 0.06} ${hh} Z`}
        fill="url(#l17-fillet)"
      />
      <path
        d={`M ${x0 - 0.06} ${-hh} L ${x1 - r} ${-hh} Q ${x1} ${-hh} ${x1} ${-hh + r} L ${x1} ${hh - r} Q ${x1} ${hh} ${x1 - r} ${hh} L ${x0 - 0.06} ${hh} Z`}
        fill="url(#l17-filletV)"
      />
      <ellipse cx={x0 + 0.09} cy={-hh * 0.42} rx={0.05} ry={hh * 0.38} fill="#fff" opacity={0.9} />
      <ellipse cx={x1 - 0.07} cy={hh * 0.35} rx={0.03} ry={hh * 0.3} fill="#fff" opacity={0.55} />
      {anim && <rect className="l17-shine" x={x0} y={-hh} width={x1 - x0} height={hh * 2} fill="#fff" />}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* 0805 resistor / capacitor                                           */
/* ------------------------------------------------------------------ */

export function ChipTop({ fp, value, isCap, joints, fresh }: { fp: FootprintDef; value: string; isCap: boolean; joints: Record<string, Joint>; fresh?: string[] }) {
  const { w, h } = fp.body
  const end = 0.42
  const code = isCap ? '' : resistorCode(value)
  return (
    <g>
      <rect x={-w / 2 + 0.06} y={-h / 2 + 0.14} width={w} height={h} rx={0.14} fill="#000" opacity={0.42} filter="url(#l17-blur)" />
      {/* body */}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.1} fill={isCap ? 'url(#l17-capbody)' : 'url(#l17-ceramic)'} />
      {!isCap && <rect x={-w / 2 + end} y={-h / 2 + 0.07} width={w - end * 2} height={h - 0.14} rx={0.04} fill="url(#l17-overglaze)" />}
      {isCap && (
        <>
          <rect x={-w / 2 + end} y={-h / 2} width={w - end * 2} height={0.12} fill="#fff" opacity={0.18} />
          <rect x={-w / 2 + end} y={h / 2 - 0.1} width={w - end * 2} height={0.1} fill="#000" opacity={0.15} />
        </>
      )}
      {/* terminations */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect x={s < 0 ? -w / 2 : w / 2 - end} y={-h / 2} width={end} height={h} rx={0.08} fill="url(#l17-metal)" />
          <rect x={s < 0 ? -w / 2 + 0.04 : w / 2 - end + 0.04} y={-h / 2 + 0.06} width={end - 0.08} height={0.08} rx={0.04} fill="#fff" opacity={0.7} />
        </g>
      ))}
      <rect x={-w / 2 + 0.03} y={-h / 2 + 0.02} width={w - 0.06} height={0.05} rx={0.02} fill="#fff" opacity={0.28} />
      {code && (
        <text x={0} y={0.04} fontSize={0.56} textAnchor="middle" dominantBaseline="central" fill="#e4e4e4" fontFamily="IBM Plex Mono, monospace" fontWeight={500} letterSpacing="0.02">
          {code}
        </text>
      )}
      {fp.pads.map((p) => {
        const s = (Math.sign(p.x) || 1) as 1 | -1
        return <ChipFillet key={p.num} x0={w / 2} x1={Math.abs(p.x) + p.w / 2} hh={Math.min(p.h, h) / 2 - 0.02} side={s} state={joints[p.num]} anim={fresh?.includes(p.num)} />
      })}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* 0805 LED                                                            */
/* ------------------------------------------------------------------ */

export function LedTop({ fp, joints, on, fresh }: { fp: FootprintDef; joints: Record<string, Joint>; on: boolean; fresh?: string[] }) {
  const { w, h } = fp.body
  const end = 0.42
  return (
    <g>
      <rect x={-w / 2 + 0.06} y={-h / 2 + 0.16} width={w} height={h} rx={0.16} fill="#000" opacity={0.42} filter="url(#l17-blur)" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.12} fill="url(#l17-ceramic)" />
      {[-1, 1].map((s) => (
        <rect key={s} x={s < 0 ? -w / 2 : w / 2 - end} y={-h / 2} width={end} height={h} rx={0.08} fill="url(#l17-metal)" />
      ))}
      {/* reflector cup + lens */}
      <rect x={-w / 2 + 0.5} y={-h / 2 + 0.13} width={w - 1} height={h - 0.26} rx={0.24} fill={on ? 'url(#l17-lensOn)' : '#f3e9df'} />
      <rect x={-w / 2 + 0.5} y={-h / 2 + 0.13} width={w - 1} height={h - 0.26} rx={0.24} fill="url(#l17-lens)" opacity={on ? 0.35 : 1} />
      {/* die + bond wire */}
      <rect x={-0.16} y={-0.16} width={0.32} height={0.32} rx={0.03} fill={on ? '#fff3e6' : '#b8382c'} />
      <rect x={-0.08} y={-0.08} width={0.16} height={0.16} rx={0.02} fill={on ? '#ffffff' : '#d9574a'} />
      <path d="M 0 -0.05 Q 0.3 -0.45 0.42 -0.12" fill="none" stroke="#e4c060" strokeWidth={0.025} />
      {/* cathode mark (pad 1 side) */}
      <rect x={-w / 2 + 0.46} y={-h / 2 + 0.1} width={0.11} height={h - 0.2} rx={0.03} fill="#2f9f5f" />
      <ellipse cx={-0.22} cy={-0.3} rx={0.28} ry={0.09} fill="#fff" opacity={on ? 0.35 : 0.65} />
      {fp.pads.map((p) => {
        const s = (Math.sign(p.x) || 1) as 1 | -1
        return <ChipFillet key={p.num} x0={w / 2} x1={Math.abs(p.x) + p.w / 2} hh={Math.min(p.h, h) / 2 - 0.04} side={s} state={joints[p.num]} anim={fresh?.includes(p.num)} />
      })}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* SOIC-8                                                              */
/* ------------------------------------------------------------------ */

export function SoicTop({ fp, value, joints, fresh }: { fp: FootprintDef; value: string; joints: Record<string, Joint>; fresh?: string[] }) {
  const { w, h } = fp.body
  const bodyEdge = w / 2
  const footStart = 2.35
  const footEnd = 3.12
  const lw = 0.42
  return (
    <g>
      <rect x={-w / 2 + 0.1} y={-h / 2 + 0.24} width={w} height={h} rx={0.2} fill="#000" opacity={0.45} filter="url(#l17-blur2)" />
      {fp.pads.map((p) => {
        const s = (Math.sign(p.x) || 1) as 1 | -1
        const j = joints[p.num]
        const isFresh = fresh?.includes(p.num)
        return (
          <g key={p.num} transform={`translate(0 ${p.y}) scale(${s} 1)`}>
            {/* solder under & around the foot */}
            {j === 'good' && (
              <g className={isFresh ? 'l17-grow' : undefined}>
                <rect x={footStart - 0.2} y={-0.33} width={footEnd - footStart + 0.52} height={0.66} rx={0.26} fill="url(#l17-fillet)" />
                <rect x={footStart - 0.2} y={-0.33} width={footEnd - footStart + 0.52} height={0.66} rx={0.26} fill="url(#l17-filletV)" />
                <rect x={footStart - 0.2} y={-0.33} width={footEnd - footStart + 0.52} height={0.66} rx={0.26} fill="none" stroke="#000" strokeOpacity={0.22} strokeWidth={0.03} />
              </g>
            )}
            {j === 'none' && <rect x={footStart + 0.04} y={-lw / 2 + 0.06} width={footEnd - footStart} height={lw} rx={0.05} fill="#000" opacity={0.45} filter="url(#l17-blur)" />}
            {(j === 'cold' || j === 'lifted') && (
              <ellipse cx={(footStart + footEnd) / 2 + 0.12} cy={0} rx={(footEnd - footStart) / 2 + 0.12} ry={0.3} fill="url(#l17-cold)" filter="url(#l17-grain)" />
            )}
            {/* lifted lead casts a visible shadow gap */}
            {j === 'lifted' && <rect x={footStart + 0.1} y={-lw / 2 + 0.12} width={footEnd - footStart} height={lw} rx={0.06} fill="#000" opacity={0.55} filter="url(#l17-blur)" />}
            <g transform={j === 'lifted' ? 'translate(-0.08 -0.1)' : undefined}>
              {/* shoulder (bends down out of the body) */}
              <rect x={bodyEdge - 0.05} y={-lw / 2} width={footStart - bodyEdge + 0.08} height={lw} fill="url(#l17-shoulder)" />
              {/* foot */}
              <rect x={footStart} y={-lw / 2} width={footEnd - footStart} height={lw} rx={0.05} fill="url(#l17-lead)" />
              <rect x={footStart + 0.04} y={-lw / 2 + 0.05} width={footEnd - footStart - 0.1} height={0.07} rx={0.03} fill="#fff" opacity={0.75} />
            </g>
            {j === 'good' && (
              <g className={isFresh ? 'l17-grow' : undefined}>
                {/* solder wets the foot: sheen at heel and toe, meniscus past the toe */}
                <rect x={footStart - 0.06} y={-lw / 2 - 0.03} width={footEnd - footStart + 0.08} height={lw + 0.06} rx={0.08} fill="url(#l17-wet)" />
                <path d={`M ${footEnd - 0.03} ${-lw / 2 - 0.05} Q ${footEnd + 0.34} 0 ${footEnd - 0.03} ${lw / 2 + 0.05} Z`} fill="url(#l17-blob)" />
                <ellipse cx={footEnd + 0.08} cy={-0.06} rx={0.04} ry={0.12} fill="#fff" opacity={0.95} />
                <ellipse cx={footStart - 0.02} cy={0} rx={0.06} ry={lw / 2 - 0.02} fill="#fff" opacity={0.75} />
                {isFresh && <rect className="l17-shine" x={footStart - 0.2} y={-0.33} width={footEnd - footStart + 0.52} height={0.66} fill="#fff" />}
              </g>
            )}
          </g>
        )
      })}
      {/* moulded body with a bevelled top */}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.18} fill="url(#l17-plastic)" />
      <rect x={-w / 2 + 0.17} y={-h / 2 + 0.17} width={w - 0.34} height={h - 0.34} rx={0.1} fill="url(#l17-plasticTop)" />
      <rect x={-w / 2 + 0.17} y={-h / 2 + 0.17} width={w - 0.34} height={h - 0.34} rx={0.1} fill="none" stroke="#fff" strokeOpacity={0.07} strokeWidth={0.04} />
      <line x1={-w / 2 + 0.2} y1={-h / 2 + 0.06} x2={w / 2 - 0.2} y2={-h / 2 + 0.06} stroke="#fff" strokeOpacity={0.22} strokeWidth={0.04} strokeLinecap="round" />
      {/* pin-1 dimple */}
      <circle cx={-w / 2 + 0.68} cy={-h / 2 + 0.68} r={0.3} fill="url(#l17-dimple)" />
      <circle cx={-w / 2 + 0.68} cy={-h / 2 + 0.68} r={0.3} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={0.03} />
      {/* laser marking */}
      <g fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fill="#a9a9ad" opacity={0.9}>
        <text x={0.15} y={-0.15} fontSize={0.66} fontWeight={600} letterSpacing="0.03">
          {value}
        </text>
        <text x={0.15} y={0.65} fontSize={0.42} fill="#86868b">
          L26 A4
        </text>
      </g>
    </g>
  )
}

/** A solder bridge between two neighbouring SOIC leads on the +x side, in U1-local coordinates. */
export function Bridge({ y1, y2, fading }: { y1: number; y2: number; fading?: boolean }) {
  const top = Math.min(y1, y2) - 0.28
  const bot = Math.max(y1, y2) + 0.28
  const mid = (top + bot) / 2
  return (
    <g className={fading ? 'l17-fadeout' : 'l17-bridge'}>
      <path
        d={`M 2.3 ${top + 0.15} Q 2.3 ${top} 2.55 ${top} L 3.2 ${top} Q 3.45 ${top} 3.45 ${top + 0.25} L 3.38 ${mid - 0.2} Q 3.3 ${mid} 3.38 ${mid + 0.2} L 3.45 ${bot - 0.25} Q 3.45 ${bot} 3.2 ${bot} L 2.55 ${bot} Q 2.3 ${bot} 2.3 ${bot - 0.15} Q 2.42 ${mid} 2.3 ${top + 0.15} Z`}
        fill="url(#l17-blob)"
      />
      <ellipse cx={2.62} cy={mid - 0.25} rx={0.08} ry={0.42} fill="#fff" opacity={0.9} />
      <ellipse cx={3.2} cy={mid + 0.3} rx={0.05} ry={0.25} fill="#fff" opacity={0.55} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* 2-pin header                                                        */
/* ------------------------------------------------------------------ */

export function HeaderTop({ fp }: { fp: FootprintDef }) {
  const { w } = fp.body
  return (
    <g>
      <rect x={-w / 2 + 0.25} y={-2.54 + 0.45} width={w} height={5.08} rx={0.3} fill="#000" opacity={0.5} filter="url(#l17-blur2)" />
      {fp.pads.map((p) => (
        <g key={p.num} transform={`translate(${p.x} ${p.y})`}>
          <rect x={-w / 2 + 0.02} y={-1.25} width={w - 0.04} height={2.5} rx={0.3} fill="url(#l17-plastic)" />
          <rect x={-w / 2 + 0.22} y={-1.05} width={w - 0.44} height={2.1} rx={0.18} fill="url(#l17-plasticTop)" />
          <line x1={-w / 2 + 0.3} y1={-1.18} x2={w / 2 - 0.3} y2={-1.18} stroke="#fff" strokeOpacity={0.18} strokeWidth={0.05} />
          {/* square gold pin with a pyramid tip */}
          <rect x={-0.34} y={-0.34} width={0.68} height={0.68} fill="url(#l17-gold)" />
          <path d="M -0.34 -0.34 L 0 0 L 0.34 -0.34 Z" fill="#fff6d2" opacity={0.75} />
          <path d="M -0.34 -0.34 L 0 0 L -0.34 0.34 Z" fill="#f2cf72" opacity={0.6} />
          <path d="M -0.34 0.34 L 0 0 L 0.34 0.34 Z" fill="#8a5e14" opacity={0.6} />
          <path d="M 0.34 -0.34 L 0 0 L 0.34 0.34 Z" fill="#b07d22" opacity={0.5} />
        </g>
      ))}
    </g>
  )
}

/** The header seen from the solder side: pin tips poking through the plated holes, plus solder cones. */
export function HeaderBottom({ fp, joints, fresh }: { fp: FootprintDef; joints: Record<string, Joint>; fresh?: string[] }) {
  return (
    <g>
      {fp.pads.map((p) => {
        const j = joints[p.num]
        return (
          <g key={p.num} transform={`translate(${p.x} ${p.y})`}>
            {j === 'good' ? (
              <g className={fresh?.includes(p.num) ? 'l17-grow' : undefined}>
                <circle r={0.92} fill="#000" opacity={0.25} filter="url(#l17-blur)" />
                <circle r={0.86} fill="url(#l17-cone)" />
                <circle r={0.86} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.04} />
                <ellipse cx={-0.3} cy={-0.36} rx={0.22} ry={0.1} fill="#fff" opacity={0.9} transform="rotate(-35 -0.3 -0.36)" />
              </g>
            ) : (
              <circle r={0.5} fill="#0e0d0b" />
            )}
            <rect x={-0.32} y={-0.32} width={0.64} height={0.64} rx={0.06} fill="url(#l17-gold)" opacity={j === 'good' ? 0.85 : 1} />
            <rect x={-0.2} y={-0.2} width={0.4} height={0.4} rx={0.04} fill="#f6dc8e" opacity={0.6} />
          </g>
        )
      })}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Bare HASL pads look matte next to fresh, shiny solder               */
/* ------------------------------------------------------------------ */

export function BarePads({ pads }: { pads: { key: string; x: number; y: number; w: number; h: number; rot: number }[] }) {
  return (
    <g filter="url(#l17-grain)" style={{ pointerEvents: 'none' }}>
      {pads.map((p) => (
        <rect
          key={p.key}
          x={-p.w / 2}
          y={-p.h / 2}
          width={p.w}
          height={p.h}
          rx={Math.min(p.w, p.h) * 0.22}
          fill="url(#l17-hasl)"
          transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}
        />
      ))}
    </g>
  )
}

/* ------------------------------------------------------------------ */

export function resistorCode(value?: string) {
  if (!value) return ''
  const m = value.match(/([\d.]+)\s*([kKmM]?)/)
  if (!m) return ''
  let ohms = parseFloat(m[1])
  if (m[2].toLowerCase() === 'k') ohms *= 1e3
  if (m[2] === 'M') ohms *= 1e6
  if (ohms < 10) return `${ohms}`.replace('.', 'R')
  const exp = Math.floor(Math.log10(ohms)) - 1
  const sig = Math.round(ohms / 10 ** exp)
  return `${sig}${exp}`
}
