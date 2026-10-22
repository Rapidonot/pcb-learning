/*
 * Extra artwork used to build physically-based materials for the 3D board:
 *  - BumpArt: copper (and silkscreen) as light-on-dark height, so traces look raised under the mask
 *  - OrmArt:  roughness in G, metalness in B (three.js convention), so pads shine and mask is glossy
 * Both are rendered into hidden SVGs and rasterised into textures.
 */
import type { BoardDoc, Connectivity, Layer } from './board'
import { getFootprint } from './footprints'
import { FootprintSilk, PadGlyph, PourFill, RefLabel, SilkTextEl, partTransform } from './render'

const pts = (p: [number, number][]) => p.map((q) => q.join(',')).join(' ')

function Copper({ doc, conn, side, color, uid }: { doc: BoardDoc; conn: Connectivity; side: Layer; color: string; uid: string }) {
  return (
    <g>
      {doc.pours
        .filter((p) => p.layer === side)
        .map((p) => (
          <PourFill key={p.id} uid={uid} pour={p} doc={doc} conn={conn} fill={color} />
        ))}
      {doc.tracks
        .filter((t) => t.layer === side)
        .map((t) => (
          <polyline key={t.id} points={pts(t.pts)} fill="none" stroke={color} strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      {conn.pads
        .filter((p) => p.layers.includes(side))
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill={color} hole={null} />
          </g>
        ))}
      {doc.vias.map((v) => (
        <circle key={v.id} cx={v.x} cy={v.y} r={v.d / 2} fill={color} />
      ))}
    </g>
  )
}

function Silk({ doc, side, color }: { doc: BoardDoc; side: Layer; color: string }) {
  return (
    <g>
      {doc.parts
        .filter((p) => p.side === side)
        .map((p) => (
          <g key={p.ref} transform={partTransform(p)}>
            <FootprintSilk def={getFootprint(p.fp)} color={color} />
          </g>
        ))}
      {doc.parts
        .filter((p) => p.side === side)
        .map((p) => (
          <RefLabel key={p.ref} part={p} color={color} />
        ))}
      {doc.texts
        .filter((t) => t.layer === side)
        .map((t) => (
          <SilkTextEl key={t.id} t={t} color={color} />
        ))}
    </g>
  )
}

function Holes({ doc, conn, color }: { doc: BoardDoc; conn: Connectivity; color: string }) {
  return (
    <g>
      {conn.pads
        .filter((p) => p.drill)
        .map((p) => (
          <circle key={p.key} cx={p.x} cy={p.y} r={p.drill! / 2} fill={color} />
        ))}
      {doc.vias.map((v) => (
        <circle key={v.id} cx={v.x} cy={v.y} r={v.drill / 2} fill={color} />
      ))}
    </g>
  )
}

/** Height map: mask = dark, copper under mask = mid, silkscreen = light. Blurred slightly for soft edges. */
export function BumpArt({ doc, conn, side }: { doc: BoardDoc; conn: Connectivity; side: Layer }) {
  const flip = side === 'bottom' ? `translate(${doc.w} 0) scale(-1 1)` : undefined
  return (
    <g transform={flip}>
      <defs>
        <filter id={`bump-blur-${side}`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.035" />
        </filter>
      </defs>
      <rect x={-1} y={-1} width={doc.w + 2} height={doc.h + 2} fill="#000" />
      <g filter={`url(#bump-blur-${side})`}>
        <Copper doc={doc} conn={conn} side={side} color="#8a8a8a" uid={`bump${side}`} />
        <Silk doc={doc} side={side} color="#d0d0d0" />
        <Holes doc={doc} conn={conn} color="#000" />
      </g>
    </g>
  )
}

/**
 * Occlusion/Roughness/Metalness map (glTF convention): R unused, G = roughness, B = metalness.
 * Mask: semi-gloss; exposed pads: shiny metal; silkscreen: matte ink.
 */
export function OrmArt({ doc, conn, side }: { doc: BoardDoc; conn: Connectivity; side: Layer }) {
  const flip = side === 'bottom' ? `translate(${doc.w} 0) scale(-1 1)` : undefined
  return (
    <g transform={flip}>
      <rect x={-1} y={-1} width={doc.w + 2} height={doc.h + 2} fill="rgb(255,92,0)" />
      {/* exposed pads (mask openings) */}
      {conn.pads
        .filter((p) => p.layers.includes(side))
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill="rgb(255,70,255)" hole={null} />
          </g>
        ))}
      <Silk doc={doc} side={side} color="rgb(255,215,0)" />
      <Holes doc={doc} conn={conn} color="rgb(255,255,0)" />
    </g>
  )
}
