/* SVG renderers for generated Gerber primitives (board coordinates, mm). */
import type { Vec } from '@/pcb/geom'
import type { GFile, Prim } from './gerber'

const ptsStr = (pts: Vec[]) => pts.map((p) => `${p[0]},${p[1]}`).join(' ')

export function PrimShape({ p, fill, stroke, extra = 0, hit = false }: { p: Prim; fill: string; stroke?: string; extra?: number; hit?: boolean }) {
  const common = hit ? { style: { cursor: 'pointer' } } : {}
  switch (p.kind) {
    case 'path':
      return (
        <polyline
          points={ptsStr(p.pts)}
          fill="none"
          stroke={stroke ?? fill}
          strokeWidth={p.ap.w + extra}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...common}
        />
      )
    case 'arc': {
      const r = Math.hypot(p.a[0] - p.c[0], p.a[1] - p.c[1])
      return <path d={`M ${p.a[0]} ${p.a[1]} A ${r} ${r} 0 0 0 ${p.b[0]} ${p.b[1]}`} fill="none" stroke={stroke ?? fill} strokeWidth={p.ap.w + extra} strokeLinecap="round" {...common} />
    }
    case 'flash': {
      const { shape, w, h } = p.ap
      const W = w + extra
      const Hh = (shape === 'C' ? w : h) + extra
      if (shape === 'C') return <circle cx={p.at[0]} cy={p.at[1]} r={W / 2} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.06 : undefined} {...common} />
      return (
        <rect
          x={p.at[0] - W / 2}
          y={p.at[1] - Hh / 2}
          width={W}
          height={Hh}
          rx={shape === 'O' ? Math.min(W, Hh) / 2 : 0}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? 0.06 : undefined}
          {...common}
        />
      )
    }
    case 'region':
      return <polygon points={ptsStr(p.pts)} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.08 : undefined} {...common} />
    case 'hole':
      return <circle cx={p.at[0]} cy={p.at[1]} r={p.d / 2 + extra / 2} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.06 : undefined} {...common} />
  }
}

/**
 * Draw one Gerber file as a viewer would: dark polarity adds, clear polarity erases (via an SVG mask).
 * Mask layers are drawn as a tinted film with the openings cut out, which is what they really are.
 */
export function LayerArt({ f, uid, w, h, film = false }: { f: GFile; uid: string; w: number; h: number; film?: boolean }) {
  const id = `l15m-${uid}-${f.id}`
  const box = { x: -2, y: -2, width: w + 4, height: h + 4 }
  if (f.kind === 'drill') {
    return (
      <g>
        {f.prims.map((p, i) =>
          p.kind === 'hole' ? (
            <g key={i}>
              <circle cx={p.at[0]} cy={p.at[1]} r={p.d / 2 + 0.06} fill="#0b0c0b" />
              <circle cx={p.at[0]} cy={p.at[1]} r={p.d / 2} fill={f.color} />
              <path d={`M ${p.at[0] - p.d * 0.3} ${p.at[1]} h ${p.d * 0.6} M ${p.at[0]} ${p.at[1] - p.d * 0.3} v ${p.d * 0.6}`} stroke="#555" strokeWidth={0.04} />
            </g>
          ) : null,
        )}
      </g>
    )
  }
  if (f.kind === 'mask') {
    return (
      <g>
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" {...box}>
            <rect x={0} y={0} width={w} height={h} rx={1.5} fill="#fff" />
            {f.prims.map((p, i) => (
              <PrimShape key={i} p={p} fill="#000" />
            ))}
          </mask>
        </defs>
        <rect x={0} y={0} width={w} height={h} rx={1.5} fill={f.color} opacity={film ? 0.55 : 0.32} mask={`url(#${id})`} />
        {f.prims.map((p, i) => (
          <PrimShape key={i} p={p} fill="none" stroke={f.color} />
        ))}
      </g>
    )
  }
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" {...box}>
          {f.prims.map((p, i) => (
            <PrimShape key={i} p={p} fill={'dark' in p && !p.dark ? '#000' : '#fff'} />
          ))}
        </mask>
      </defs>
      <rect {...box} fill={f.color} mask={`url(#${id})`} />
    </g>
  )
}
