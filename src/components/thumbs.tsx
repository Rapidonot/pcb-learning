/* Lesson thumbnails: pre-rendered 3D images (public/thumbs), with tiny isometric SVG sketches as the fallback. */
import { useState, type ReactNode } from 'react'

const C = {
  mask: '#1f6b47',
  maskD: '#134a30',
  maskL: '#2b8a5d',
  cu: '#e3a361',
  cuD: '#b8742f',
  fr4: '#cbb781',
  silk: '#f6f3ea',
  ink: '#2a2a2c',
  inkL: '#45454a',
  red: '#e8453c',
  blue: '#3f6fe0',
  gold: '#e0b24a',
  metal: '#c9ccd1',
  paper: '#fbf9f4',
  accent: '#e0542c',
}

function T({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 48" width="100%" height="100%" aria-hidden>
      {children}
    </svg>
  )
}

/** an isometric slab centred at (cx, cy) */
function Slab({ cx = 32, cy = 26, w = 22, h = 13, t = 3, top = C.mask, side = C.maskD }: { cx?: number; cy?: number; w?: number; h?: number; t?: number; top?: string; side?: string }) {
  const p = (x: number, y: number) => `${cx + x},${cy + y}`
  return (
    <g>
      <path d={`M${p(-w, 0)} L${p(0, h)} L${p(w, 0)} L${p(w, t)} L${p(0, h + t)} L${p(-w, t)} Z`} fill={side} />
      <path d={`M${p(-w, 0)} L${p(0, -h)} L${p(w, 0)} L${p(0, h)} Z`} fill={top} />
    </g>
  )
}

export const thumbs: Record<string, () => ReactNode> = {
  'what-is-a-pcb': () => (
    <T>
      <Slab cy={34} top={C.mask} side={C.maskD} t={2} />
      <Slab cy={27} top={C.cu} side={C.cuD} t={1.5} />
      <Slab cy={20} top={C.fr4} side="#a8925c" t={3} />
      <Slab cy={12} top={C.silk} side="#cfcab9" t={1} />
    </T>
  ),
  electricity: () => (
    <T>
      <path d="M10 36 L22 30 L34 36 L46 30" fill="none" stroke={C.cu} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={18} y={17} width={14} height={7} rx={2} fill="#d9c08a" transform="rotate(-27 25 20)" />
      <circle cx={46} cy={20} r={7} fill={C.red} opacity={0.9} />
      <circle cx={46} cy={20} r={12} fill={C.red} opacity={0.18} />
      <path d="M42 30 v6 M50 30 v6" stroke={C.metal} strokeWidth={1.6} />
    </T>
  ),
  components: () => (
    <T>
      <rect x={8} y={18} width={14} height={8} rx={3} fill="#d9c08a" />
      <rect x={11} y={18} width={2} height={8} fill="#8b4a1c" />
      <rect x={15} y={18} width={2} height={8} fill="#111" />
      <rect x={27} y={14} width={12} height={18} rx={2} fill={C.ink} />
      <circle cx={30} cy={17} r={1.2} fill={C.inkL} />
      {[17, 21, 25, 29].map((y) => (
        <g key={y}>
          <rect x={24} y={y - 0.8} width={3} height={1.6} fill={C.metal} />
          <rect x={39} y={y - 0.8} width={3} height={1.6} fill={C.metal} />
        </g>
      ))}
      <circle cx={52} cy={20} r={6} fill={C.red} opacity={0.9} />
      <rect x={45} y={30} width={14} height={5} rx={1} fill="#c9a776" />
    </T>
  ),
  footprints: () => (
    <T>
      <Slab cy={28} w={24} h={14} />
      {[-8, -3, 2, 7].map((d, i) => (
        <g key={i}>
          <path d={`M${20 + d * 1},${24 + d * 0.55} l4,-2 l3,1.6 l-4,2 z`} fill={C.metal} />
          <path d={`M${34 + d * 1},${31 + d * 0.55} l4,-2 l3,1.6 l-4,2 z`} fill={C.metal} />
        </g>
      ))}
      <circle cx={19} cy={20} r={1.4} fill={C.silk} />
    </T>
  ),
  'easyeda-tour': () => (
    <T>
      <rect x={6} y={8} width={52} height={34} rx={4} fill={C.paper} stroke="#cfc6b2" />
      <rect x={6} y={8} width={52} height={6} rx={3} fill="#1e78c8" />
      <rect x={9} y={17} width={9} height={22} rx={1.5} fill="#e9e3d6" />
      <rect x={21} y={17} width={25} height={22} rx={1.5} fill="#111" />
      <path d="M25 33 h6 l4 -6 h6" stroke={C.red} strokeWidth={1.6} fill="none" />
      <rect x={48} y={17} width={7} height={22} rx={1.5} fill="#e9e3d6" />
    </T>
  ),
  'reading-schematics': () => (
    <T>
      <rect x={6} y={8} width={52} height={34} rx={4} fill={C.paper} stroke="#cfc6b2" />
      <path d="M12 25 h8 M32 25 h6 M44 25 h8 M52 25 v8 M48 33 h8" stroke="#1f7a3f" strokeWidth={1.4} fill="none" />
      <rect x={20} y={21.5} width={12} height={7} fill="none" stroke="#8a1c1c" strokeWidth={1.4} />
      <path d="M38 19 v12 M44 19 v12" stroke="#8a1c1c" strokeWidth={1.6} />
      <path d="M49 36 h6 M50.5 38.5 h3" stroke="#8a1c1c" strokeWidth={1.2} />
    </T>
  ),
  'drawing-schematic': () => (
    <T>
      <rect x={6} y={8} width={52} height={34} rx={4} fill={C.paper} stroke="#cfc6b2" />
      <rect x={24} y={16} width={16} height={20} fill="#fffbe6" stroke="#8a1c1c" strokeWidth={1.4} />
      <path d="M12 22 h12 M40 22 h10 v-6" stroke="#1f7a3f" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d="M40 30 h6" stroke="#1f7a3f" strokeWidth={1.6} strokeDasharray="2 2" />
      <path d="M46 30 l6 4 l-2 1 l2 3 l-1.5 1 l-2 -3 l-1.5 1.5 z" fill={C.ink} />
    </T>
  ),
  'schematic-to-pcb': () => (
    <T>
      <rect x={4} y={12} width={22} height={24} rx={3} fill={C.paper} stroke="#cfc6b2" />
      <path d="M8 20 h14 M8 28 h14" stroke="#1f7a3f" strokeWidth={1.4} />
      <path d="M28 24 h6 l-2 -2 M34 24 l-2 2" stroke={C.accent} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <rect x={38} y={12} width={22} height={24} rx={3} fill="#121411" />
      <rect x={42} y={16} width={4} height={3} fill={C.red} />
      <rect x={53} y={28} width={4} height={3} fill={C.red} />
      <path d="M44 19 L55 28" stroke="#7fc3ff" strokeWidth={0.9} />
      <path d="M43 30 L54 18" stroke="#7fc3ff" strokeWidth={0.9} />
    </T>
  ),
  placement: () => (
    <T>
      <Slab cy={28} w={26} h={15} />
      <path d="M22 26 l5 -3 l5 3 l-5 3 z" fill={C.ink} />
      <path d="M34 30 l3 -1.7 l3 1.7 l-3 1.7 z" fill="#c9a776" />
      <path d="M38 22 l3 -1.7 l3 1.7 l-3 1.7 z" fill="#c9a776" />
      <path d="M44 13 l3 -2 v4 M47 11 l-3 2" stroke={C.accent} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <path d="M41 23 l2 -8" stroke={C.accent} strokeWidth={1.2} strokeDasharray="2 1.5" />
    </T>
  ),
  routing: () => (
    <T>
      <Slab cy={28} w={26} h={15} />
      <path d="M14 28 l8 -4.5 h10 l6 3.5 l10 -5.5" stroke={C.cu} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={14} cy={28} r={2} fill={C.metal} />
      <circle cx={48} cy={21.5} r={2} fill={C.metal} />
    </T>
  ),
  vias: () => (
    <T>
      <Slab cy={30} w={24} h={14} t={6} />
      <path d="M14 30 l10 -5" stroke={C.red} strokeWidth={2.2} strokeLinecap="round" />
      <ellipse cx={26} cy={24.2} rx={3} ry={1.7} fill={C.metal} />
      <ellipse cx={26} cy={24.2} rx={1.2} ry={0.7} fill="#222" />
      <path d="M26 26 v6" stroke="#999" strokeWidth={1.4} strokeDasharray="1.5 1" />
      <path d="M26 32 l14 6" stroke={C.blue} strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
    </T>
  ),
  'ground-pour': () => (
    <T>
      <Slab cy={28} w={26} h={15} top={C.maskL} />
      <path d="M22 28 l6 -3.5 l6 3.5 l-6 3.5 z" fill={C.mask} />
      <path d="M24 28 l4 -2.3 l4 2.3 l-4 2.3 z" fill={C.metal} />
      <path d="M28 25.7 v-2 M28 30.3 v2 M24 28 h-2.5 M32 28 h2.5" stroke={C.maskL} strokeWidth={1.4} />
    </T>
  ),
  silkscreen: () => (
    <T>
      <Slab cy={28} w={26} h={15} />
      <text x={32} y={30} fontSize={8} fontWeight={700} fill={C.silk} textAnchor="middle" fontFamily="monospace" transform="skewY(-28) translate(0 17)">
        R1
      </text>
      <path d="M40 22 l5 -2.8 M42 25 l5 -2.8" stroke={C.silk} strokeWidth={1} />
      <circle cx={19} cy={27} r={1.4} fill={C.silk} />
    </T>
  ),
  drc: () => (
    <T>
      <rect x={6} y={8} width={52} height={34} rx={4} fill="#121411" />
      <path d="M12 20 h22 M12 26 h18 l6 6 h16" stroke={C.red} strokeWidth={2} fill="none" />
      <circle cx={33} cy={23} r={6} fill="none" stroke="#ff2bd1" strokeWidth={1.4} />
      <path d="M30 20 l6 6 M36 20 l-6 6" stroke="#ff2bd1" strokeWidth={1.4} />
    </T>
  ),
  gerbers: () => (
    <T>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${12 + i * 7} ${10 + i * 5})`}>
          <rect width={26} height={20} rx={2} fill={['#121411', '#1d3b2b', C.paper][i]} stroke="#9a917d" strokeWidth={0.6} />
          <path d={['M4 6 h10 l4 4 h5', 'M4 14 h18', 'M4 5 h8 M4 9 h12'][i]} stroke={[C.red, C.cu, '#555'][i]} strokeWidth={1.3} fill="none" />
        </g>
      ))}
    </T>
  ),
  ordering: () => (
    <T>
      <path d="M14 18 L32 9 L50 18 L32 27 Z" fill="#d6b98a" />
      <path d="M14 18 V34 L32 43 V27 Z" fill="#b8996a" />
      <path d="M50 18 V34 L32 43 V27 Z" fill="#c7a878" />
      <path d="M23 13.5 L41 22.5" stroke="#8a6d43" strokeWidth={2} />
      <path d="M36 32 l4 -2 l6 4 l-4 2 z" fill={C.mask} />
    </T>
  ),
  sandbox: () => (
    <T>
      <Slab cy={30} w={26} h={15} />
      <path d="M24 28 l5 -3 l5 3 l-5 3 z" fill={C.ink} />
      <circle cx={42} cy={24} r={3} fill={C.red} />
      <circle cx={42} cy={24} r={6} fill={C.red} opacity={0.2} />
      <path d="M14 30 l6 -3.5 M34 32 l6 -3.5" stroke={C.cu} strokeWidth={1.6} />
      <path d="M50 10 l1.5 3 l3 0.4 l-2.2 2.1 l0.6 3 l-2.9 -1.5 l-2.9 1.5 l0.6 -3 l-2.2 -2.1 l3 -0.4 z" fill={C.gold} />
    </T>
  ),
}

/**
 * Lesson thumbnail: a pre-rendered 3D still life from /thumbs/<id>.webp (made by the dev-only
 * thumbnail studio, see scripts/render-thumbs.mjs), falling back to the SVG sketch above when an
 * id has no image yet.
 */
export function Thumb({ id }: { id: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const f = thumbs[id]
  if (failed !== id) {
    return (
      <img
        className="thumb-img"
        src={`/thumbs/${id}.webp`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailed(id)}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
      />
    )
  }
  return f ? <>{f()}</> : null
}
