/*
 * Local copies of the shared EDA / photo-real board renderers, with one change: the copper pour is drawn by
 * this lesson's own <PourArt> (adjustable spokes, solid connections and island removal) in the right place in
 * the layer stack. Everything else matches src/pcb/render.tsx.
 */
import { useId, type ReactNode, type PointerEvent as RPointerEvent } from 'react'
import { getFootprint } from '@/pcb/footprints'
import { FootprintSilk, PadGlyph, PartBodyTop, RefLabel, SilkTextEl, partTransform } from '@/pcb/render'
import type { BoardDoc, Connectivity, Layer, WorldPad } from '@/pcb/board'
import { EDA, MASKS, REAL } from '@/pcb/palette'
import type { Vec } from '@/pcb/geom'
import type { PourSpec, Rect } from './pour'

const ptsStr = (pts: Vec[]) => pts.map((p) => `${p[0]},${p[1]}`).join(' ')
const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '')

/* ------------------------------------------------------------------ */
/* The pour itself                                                     */
/* ------------------------------------------------------------------ */

export function PourArt({
  pour,
  doc,
  conn,
  fill,
  opacity = 1,
  islands,
  keepIslands,
  uid,
  sweep = 1,
}: {
  pour: PourSpec
  doc: BoardDoc
  conn: Connectivity
  fill: string
  opacity?: number
  islands: Rect[]
  keepIslands: boolean
  uid: string
  /** 0..1 reveal from left to right (fill animation) */
  sweep?: number
}) {
  const id = `p12-${uid}-${clean(pour.id)}`
  const c = pour.clearance
  const layer = pour.layer
  const net = pour.net
  const isSame = (n: string | undefined) => !!net && n === net
  const pads = conn.pads.filter((p) => p.layers.includes(layer))
  let x0 = Infinity,
    x1 = -Infinity
  for (const [x] of pour.pts) {
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
  }
  const otherClear = (
    <>
      {doc.tracks
        .filter((t) => t.layer === layer && !isSame(conn.netOf.get(`track:${t.id}`) ?? t.net))
        .map((t) => (
          <polyline key={t.id} points={ptsStr(t.pts)} fill="none" stroke="#000" strokeWidth={t.width + 2 * c} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      {doc.vias
        .filter((v) => !isSame(conn.netOf.get(`via:${v.id}`)))
        .map((v) => (
          <circle key={v.id} cx={v.x} cy={v.y} r={v.d / 2 + c} fill="#000" />
        ))}
      {pads
        .filter((p) => !isSame(p.net))
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill="#000" hole={null} inflate={c} />
          </g>
        ))}
    </>
  )
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-5} y={-5} width={doc.w + 10} height={doc.h + 10}>
          <polygon points={ptsStr(pour.pts)} fill="#fff" />
          {/* same-net pads: clearance ring with spokes, or a solid join */}
          {pads
            .filter((p) => isSame(p.net))
            .map((p) => (
              <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
                {pour.thermals ? (
                  <>
                    <PadGlyph pad={p} fill="#000" hole={null} inflate={c} />
                    <rect x={-p.w / 2 - c - 0.05} y={-pour.spoke / 2} width={p.w + 2 * c + 0.1} height={pour.spoke} fill="#fff" />
                    <rect x={-pour.spoke / 2} y={-p.h / 2 - c - 0.05} width={pour.spoke} height={p.h + 2 * c + 0.1} fill="#fff" />
                  </>
                ) : (
                  <PadGlyph pad={p} fill="#fff" hole={null} inflate={0.01} />
                )}
              </g>
            ))}
          {/* other-net copper always wins over spokes */}
          {otherClear}
          {/* same-net tracks merge into the pour */}
          {doc.tracks
            .filter((t) => t.layer === layer && isSame(conn.netOf.get(`track:${t.id}`) ?? t.net))
            .map((t) => (
              <polyline key={t.id} points={ptsStr(t.pts)} fill="none" stroke="#fff" strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          {/* islands are removed when the region is rebuilt */}
          {!keepIslands && islands.map((r, i) => <rect key={i} x={r.x - 0.06} y={r.y - 0.06} width={r.w + 0.12} height={r.h + 0.12} fill="#000" />)}
          {sweep < 1 && <rect x={x0 + (x1 - x0) * sweep} y={-5} width={doc.w + 10} height={doc.h + 10} fill="#000" />}
        </mask>
      </defs>
      <polygon points={ptsStr(pour.pts)} fill={fill} opacity={opacity} mask={`url(#${id})`} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* EDA board                                                           */
/* ------------------------------------------------------------------ */

export function EdaBoard12({
  doc,
  conn,
  activeLayer = 'top',
  pourSlot,
  showRatsnest = true,
  onPadPointerDown,
  onPadEnter,
  highlightNet,
  children,
}: {
  doc: BoardDoc
  conn: Connectivity
  activeLayer?: Layer
  pourSlot: (layer: Layer, color: string) => ReactNode
  showRatsnest?: boolean
  onPadPointerDown?: (p: WorldPad, e: RPointerEvent<SVGGElement>) => void
  onPadEnter?: (p: WorldPad | null) => void
  highlightNet?: string | null
  children?: ReactNode
}) {
  const layerOrder: Layer[] = activeLayer === 'top' ? ['bottom', 'top'] : ['top', 'bottom']
  const colorOf = (l: Layer) => (l === 'top' ? EDA.top : EDA.bottom)
  const hl = (net: string | undefined) => (highlightNet ? (net === highlightNet ? 1 : 0.3) : 1)
  return (
    <g>
      <rect x={0} y={0} width={doc.w} height={doc.h} rx={doc.corner} fill="rgba(255,255,255,0.025)" stroke={EDA.outline} strokeWidth={0.15} />
      {layerOrder.map((layer) => (
        <g key={layer} opacity={layer === activeLayer ? 1 : 0.45}>
          {pourSlot(layer, colorOf(layer))}
          {doc.tracks
            .filter((t) => t.layer === layer)
            .map((t) => (
              <polyline
                key={t.id}
                points={ptsStr(t.pts)}
                fill="none"
                stroke={colorOf(layer)}
                strokeWidth={t.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={hl(conn.netOf.get(`track:${t.id}`) ?? t.net)}
              />
            ))}
          {conn.pads
            .filter((p) => p.layers.length === 1 && p.layers[0] === layer)
            .map((p) => (
              <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} opacity={hl(p.net)}>
                <PadGlyph pad={p} fill={colorOf(layer)} />
              </g>
            ))}
        </g>
      ))}
      {conn.pads
        .filter((p) => p.layers.length === 2)
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} opacity={hl(p.net)}>
            <PadGlyph pad={p} fill={EDA.multi} hole={EDA.hole} />
          </g>
        ))}
      {doc.vias.map((v) => (
        <g key={v.id}>
          <circle cx={v.x} cy={v.y} r={v.d / 2} fill={EDA.via} />
          <circle cx={v.x} cy={v.y} r={v.drill / 2} fill={EDA.hole} />
        </g>
      ))}
      <g>
        {doc.parts.map((p) => (
          <g key={p.ref} transform={partTransform(p)}>
            <FootprintSilk def={getFootprint(p.fp)} color={EDA.silkTop} />
          </g>
        ))}
        {doc.parts.map((p) => (
          <RefLabel key={p.ref} part={p} color={EDA.silkTop} />
        ))}
      </g>
      {(onPadPointerDown || onPadEnter) &&
        conn.pads.map((p) => (
          <g
            key={p.key}
            transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}
            onPointerDown={onPadPointerDown ? (e) => onPadPointerDown(p, e) : undefined}
            onPointerEnter={onPadEnter ? () => onPadEnter(p) : undefined}
            onPointerLeave={onPadEnter ? () => onPadEnter(null) : undefined}
            style={{ cursor: 'pointer' }}
          >
            <PadGlyph pad={p} fill="transparent" hole={null} inflate={0.15} />
          </g>
        ))}
      {showRatsnest && (
        <g style={{ pointerEvents: 'none' }}>
          {conn.ratsnest.map((r, i) => (
            <line key={i} x1={r.a.x} y1={r.a.y} x2={r.b.x} y2={r.b.y} stroke={EDA.ratsnest} strokeWidth={0.08} className="l12-airwire" />
          ))}
        </g>
      )}
      {children}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Photo-real board (top side)                                         */
/* ------------------------------------------------------------------ */

export function RealBoard12({
  doc,
  conn,
  pourSlot,
  bodies = true,
}: {
  doc: BoardDoc
  conn: Connectivity
  pourSlot: (layer: Layer, color: string) => ReactNode
  bodies?: boolean
}) {
  const uid = clean(useId())
  const m = MASKS.green
  const side: Layer = 'top'
  const layerPads = conn.pads.filter((p) => p.layers.includes(side))
  return (
    <g>
      <defs>
        <clipPath id={`clip-${uid}`}>
          <rect x={0} y={0} width={doc.w} height={doc.h} rx={doc.corner} />
        </clipPath>
        <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.1} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.12} />
        </linearGradient>
        <radialGradient id={`pad-${uid}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor={REAL.hasl} />
          <stop offset="1" stopColor={REAL.haslShade} />
        </radialGradient>
        <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0" />
        </filter>
      </defs>
      <rect x={-0.12} y={-0.12} width={doc.w + 0.24} height={doc.h + 0.24} rx={doc.corner + 0.1} fill={m.edge} />
      <g clipPath={`url(#clip-${uid})`}>
        <rect x={0} y={0} width={doc.w} height={doc.h} fill={m.mask} />
        {pourSlot(side, m.maskCopper)}
        {doc.tracks
          .filter((t) => t.layer === side)
          .map((t) => (
            <polyline key={t.id} points={ptsStr(t.pts)} fill="none" stroke={m.maskCopper} strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        {layerPads.map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill={m.mask} hole={null} inflate={0.05} />
            <PadGlyph pad={p} fill={`url(#pad-${uid})`} hole={REAL.hole} />
          </g>
        ))}
        {doc.vias.map((v) => (
          <g key={v.id}>
            <circle cx={v.x} cy={v.y} r={v.d / 2} fill={m.maskCopper} />
            <circle cx={v.x} cy={v.y} r={v.drill / 2} fill={REAL.hole} />
          </g>
        ))}
        {doc.parts.map((p) => (
          <g key={p.ref} transform={partTransform(p)}>
            <FootprintSilk def={getFootprint(p.fp)} color={m.silk} />
          </g>
        ))}
        {doc.parts.map((p) => (
          <RefLabel key={p.ref} part={p} color={m.silk} />
        ))}
        {doc.texts.map((t) => (
          <SilkTextEl key={t.id} t={t} color={m.silk} />
        ))}
        <rect x={0} y={0} width={doc.w} height={doc.h} filter={`url(#grain-${uid})`} style={{ pointerEvents: 'none' }} />
        <rect x={0} y={0} width={doc.w} height={doc.h} fill={`url(#grad-${uid})`} style={{ pointerEvents: 'none' }} />
      </g>
      {bodies &&
        doc.parts.map((p) => (
          <g key={p.ref} transform={partTransform(p)} style={{ filter: 'drop-shadow(0.15px 0.25px 0.2px rgba(0,0,0,0.45))' }}>
            <PartBodyTop fp={getFootprint(p.fp)} value={p.value} />
          </g>
        ))}
    </g>
  )
}
