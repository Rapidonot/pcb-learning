/* SVG renderers for boards & footprints. Everything is drawn in millimetres. */
import { useId, type ReactNode, type PointerEvent as RPointerEvent } from 'react'
import { getFootprint, type FootprintDef, type PadDef } from './footprints'
import {
  analyze,
  partPads,
  type BoardDoc,
  type Connectivity,
  type DrcError,
  type Layer,
  type PartInst,
  type Pour,
  type WorldPad,
} from './board'
import { EDA, MASKS, REAL, type FinishColor, type MaskColor } from './palette'
import type { Vec } from './geom'

export type RenderMode = 'eda' | 'real'

export interface LayerVis {
  top: boolean
  bottom: boolean
  silk: boolean
  outline: boolean
  ratsnest: boolean
  pours: boolean
  bodies: boolean
  refs: boolean
}

export const allLayers: LayerVis = {
  top: true,
  bottom: true,
  silk: true,
  outline: true,
  ratsnest: true,
  pours: true,
  bodies: false,
  refs: true,
}

const ptsStr = (pts: Vec[]) => pts.map((p) => `${p[0]},${p[1]}`).join(' ')
const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '')

/* ------------------------------------------------------------------ */
/* Pad                                                                 */
/* ------------------------------------------------------------------ */

export function PadGlyph({
  pad,
  fill,
  hole = EDA.hole,
  inflate = 0,
  stroke,
  strokeWidth,
}: {
  pad: Pick<PadDef, 'w' | 'h' | 'shape' | 'drill'>
  fill: string
  hole?: string | null
  inflate?: number
  stroke?: string
  strokeWidth?: number
}) {
  const w = pad.w + inflate * 2
  const h = pad.h + inflate * 2
  let el: ReactNode
  if (pad.shape === 'round') el = <circle r={w / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  else if (pad.shape === 'oval')
    el = <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(w, h) / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  else {
    const rx = pad.shape === 'roundrect' ? Math.min(w, h) * 0.22 : inflate
    el = <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  }
  return (
    <>
      {el}
      {pad.drill && hole && <circle r={pad.drill / 2} fill={hole} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Footprint (standalone, at origin)                                   */
/* ------------------------------------------------------------------ */

/** Draws a footprint at the origin — for lesson illustrations. */
export function FootprintGraphic({
  fp,
  mode = 'eda',
  showSilk = true,
  showCourtyard = false,
  showBody = false,
  showNumbers = false,
  highlightPad,
  finish = 'hasl',
  value,
}: {
  fp: FootprintDef | string
  mode?: RenderMode
  showSilk?: boolean
  showCourtyard?: boolean
  showBody?: boolean
  showNumbers?: boolean
  highlightPad?: string
  finish?: FinishColor
  value?: string
}) {
  const def = typeof fp === 'string' ? getFootprint(fp) : fp
  const padFill = (p: PadDef) => {
    if (mode === 'real') return finish === 'enig' ? REAL.enig : REAL.hasl
    return p.drill ? EDA.multi : EDA.top
  }
  const silk = mode === 'real' ? MASKS.green.silk : EDA.silkTop
  return (
    <g>
      {showCourtyard && (
        <rect
          x={-def.courtyard.w}
          y={-def.courtyard.h}
          width={def.courtyard.w * 2}
          height={def.courtyard.h * 2}
          fill="none"
          stroke={mode === 'real' ? 'rgba(255,255,255,0.5)' : EDA.courtyard}
          strokeWidth={0.05}
          strokeDasharray="0.3 0.2"
        />
      )}
      {def.pads.map((p) => (
        <g key={p.num} transform={`translate(${p.x} ${p.y})`}>
          <PadGlyph pad={p} fill={padFill(p)} hole={mode === 'real' ? REAL.hole : EDA.hole} />
          {highlightPad === p.num && (
            <PadGlyph pad={p} fill="none" hole={null} inflate={0.15} stroke="#fff" strokeWidth={0.12} />
          )}
        </g>
      ))}
      {showSilk && <FootprintSilk def={def} color={silk} />}
      {showBody && <PartBodyTop fp={def} value={value} />}
      {showNumbers &&
        def.pads.map((p) => (
          <text
            key={p.num}
            x={p.x}
            y={p.y}
            fontSize={Math.min(p.w, p.h) * 0.55}
            textAnchor="middle"
            dominantBaseline="central"
            fill={mode === 'real' ? '#333' : '#fff'}
            fontFamily="IBM Plex Mono, monospace"
            fontWeight={600}
            style={{ pointerEvents: 'none' }}
          >
            {p.name ?? p.num}
          </text>
        ))}
    </g>
  )
}

export function FootprintSilk({ def, color }: { def: FootprintDef; color: string }) {
  return (
    <g stroke={color} strokeWidth={0.15} strokeLinecap="round" fill="none">
      {def.silk.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
      {def.pin1 && <circle cx={def.pin1[0]} cy={def.pin1[1]} r={0.2} fill={color} stroke="none" />}
      {def.polarity === 'cathode-left' && def.mount === 'smd' && (
        <line
          x1={-def.courtyard.w + 0.2}
          y1={-def.courtyard.h + 0.25}
          x2={-def.courtyard.w + 0.2}
          y2={def.courtyard.h - 0.25}
          strokeWidth={0.3}
        />
      )}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Top-down component bodies (for "assembled" real views)              */
/* ------------------------------------------------------------------ */

export function PartBodyTop({ fp, value }: { fp: FootprintDef; value?: string }) {
  const { w, h, kind, color } = fp.body
  switch (kind) {
    case 'chip': {
      const isCap = color !== undefined
      const end = Math.min(w * 0.22, 0.6)
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.08} fill={isCap ? '#b89a6a' : '#1d1d1f'} />
          <rect x={-w / 2} y={-h / 2} width={end} height={h} rx={0.06} fill="#c9ccd1" />
          <rect x={w / 2 - end} y={-h / 2} width={end} height={h} rx={0.06} fill="#c9ccd1" />
          {!isCap && (
            <text x={0} y={0.02} fontSize={h * 0.5} textAnchor="middle" dominantBaseline="central" fill="#e8e8e8" fontFamily="IBM Plex Mono, monospace">
              {resistorCode(value)}
            </text>
          )}
        </g>
      )
    }
    case 'led-chip':
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.1} fill="#f2efe6" />
          <rect x={-w / 2 + 0.35} y={-h / 2 + 0.15} width={w - 0.7} height={h - 0.3} rx={0.2} fill="#ff6b5a" opacity={0.85} />
          <rect x={-w / 2} y={-h / 2} width={0.3} height={h} fill="#3fae6a" />
        </g>
      )
    case 'soic': {
      const legs = fp.pads.map((p) => (
        <rect key={p.num} x={p.x - 0.55} y={p.y - 0.2} width={1.1} height={0.4} rx={0.05} fill="#c9ccd1" />
      ))
      return (
        <g>
          {legs}
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.15} fill="#222225" />
          <circle cx={-w / 2 + 0.6} cy={-h / 2 + 0.6} r={0.28} fill="#3a3a3e" />
          <text x={0} y={-0.3} fontSize={0.62} textAnchor="middle" dominantBaseline="central" fill="#bdbdbd" fontFamily="IBM Plex Mono, monospace" transform="rotate(90)">
            {value ?? ''}
          </text>
        </g>
      )
    }
    case 'dip':
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.3} fill="#222225" />
          <path d={`M -0.9 ${-h / 2} a 0.9 0.9 0 0 0 1.8 0`} fill="#141416" />
          <text x={0} y={0} fontSize={0.9} textAnchor="middle" dominantBaseline="central" fill="#bdbdbd" fontFamily="IBM Plex Mono, monospace" transform="rotate(90)">
            {value ?? ''}
          </text>
        </g>
      )
    case 'header':
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.15} fill="#202022" />
          {fp.pads.map((p) => (
            <g key={p.num}>
              <line x1={-w / 2} y1={p.y + 1.27} x2={w / 2} y2={p.y + 1.27} stroke="#333" strokeWidth={0.08} />
              <rect x={p.x - 0.32} y={p.y - 0.32} width={0.64} height={0.64} fill="#e2b44e" />
            </g>
          ))}
        </g>
      )
    case 'led-5mm':
      return (
        <g>
          <circle r={w / 2} fill={color ?? '#e8392f'} opacity={0.9} />
          <circle r={w / 2 - 0.4} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.2} />
          <ellipse cx={-0.8} cy={-0.9} rx={0.8} ry={0.5} fill="rgba(255,255,255,0.45)" />
          <line x1={-w / 2 + 0.3} y1={-1.8} x2={-w / 2 + 0.3} y2={1.8} stroke="rgba(0,0,0,0.3)" strokeWidth={0.25} />
        </g>
      )
    case 'axial':
      return (
        <g>
          <line x1={-5.08} y1={0} x2={5.08} y2={0} stroke="#c9ccd1" strokeWidth={0.5} strokeLinecap="round" />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={color ?? '#d9c08a'} />
          {['#8b4a1c', '#111', '#8b4a1c', '#d4a52c'].map((c, i) => (
            <rect key={i} x={-2 + i * 1.1 + (i === 3 ? 0.6 : 0)} y={-h / 2} width={0.45} height={h} fill={c} />
          ))}
        </g>
      )
    case 'sot23':
      return (
        <g>
          {fp.pads.map((p) => (
            <rect key={p.num} x={p.x - 0.22} y={p.y - 0.45} width={0.44} height={0.9} fill="#c9ccd1" />
          ))}
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.1} fill="#222225" />
        </g>
      )
    default:
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#333" />
  }
}

function resistorCode(value?: string) {
  if (!value) return ''
  const m = value.match(/([\d.]+)\s*([kKmM]?)/)
  if (!m) return ''
  let ohms = parseFloat(m[1])
  if (m[2].toLowerCase() === 'k') ohms *= 1e3
  if (m[2] === 'M') ohms *= 1e6
  if (ohms < 10) return `${ohms}R`.replace('.', 'R')
  const exp = Math.floor(Math.log10(ohms)) - 1
  const sig = Math.round(ohms / 10 ** exp)
  return `${sig}${exp}`
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

export interface BoardViewProps {
  doc: BoardDoc
  mode?: RenderMode
  vis?: Partial<LayerVis>
  /** EDA mode: which layer is active (other layer is dimmed) */
  activeLayer?: Layer
  /** real mode: look at which side */
  side?: Layer
  maskColor?: MaskColor
  finish?: FinishColor
  conn?: Connectivity
  highlightNet?: string | null
  selectedRefs?: string[]
  drcErrors?: DrcError[]
  /** draw ratsnest coloured by net */
  netColors?: Record<string, string>
  onPartPointerDown?: (ref: string, e: RPointerEvent<SVGGElement>) => void
  onPadPointerDown?: (pad: WorldPad, e: RPointerEvent<SVGGElement>) => void
  onPadEnter?: (pad: WorldPad | null) => void
  children?: ReactNode
}

/**
 * Renders a full board (outline, pours, tracks, vias, pads, silkscreen, ratsnest) in mm units.
 * Place inside an <svg> whose viewBox is in mm (see <PcbCanvas>).
 */
export function BoardView(props: BoardViewProps) {
  const { doc, mode = 'eda' } = props
  const vis = { ...allLayers, ...props.vis }
  const conn = props.conn ?? analyze(doc)
  return mode === 'eda' ? <EdaBoard {...props} vis={vis} conn={conn} /> : <RealBoard {...props} vis={vis} conn={conn} />
}

type Resolved = BoardViewProps & { vis: LayerVis; conn: Connectivity }

function trackNet(conn: Connectivity, id: string) {
  return conn.netOf.get(`track:${id}`)
}

function EdaBoard({
  doc,
  vis,
  conn,
  activeLayer = 'top',
  highlightNet,
  selectedRefs = [],
  drcErrors,
  netColors,
  onPartPointerDown,
  onPadPointerDown,
  onPadEnter,
  children,
}: Resolved) {
  const uid = cleanId(useId())
  const layerOrder: Layer[] = activeLayer === 'top' ? ['bottom', 'top'] : ['top', 'bottom']
  const dimOf = (l: Layer) => (l === activeLayer ? 1 : 0.45)
  const colorOf = (l: Layer) => (l === 'top' ? EDA.top : EDA.bottom)
  const hl = (net: string | undefined) => (highlightNet ? (net === highlightNet ? 1 : 0.3) : 1)

  return (
    <g>
      {vis.outline && (
        <rect
          x={0}
          y={0}
          width={doc.w}
          height={doc.h}
          rx={doc.corner}
          fill="rgba(255,255,255,0.025)"
          stroke={EDA.outline}
          strokeWidth={0.15}
        />
      )}

      {layerOrder.map((layer) => {
        if (!vis[layer]) return null
        const op = dimOf(layer)
        return (
          <g key={layer} opacity={op}>
            {vis.pours &&
              doc.pours
                .filter((p) => p.layer === layer)
                .map((p) => <PourFill key={p.id} uid={uid} pour={p} doc={doc} conn={conn} fill={colorOf(layer)} opacity={0.42} />)}
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
                  opacity={hl(trackNet(conn, t.id) ?? t.net)}
                />
              ))}
            {/* SMD pads on this layer */}
            {conn.pads
              .filter((p) => p.layers.length === 1 && p.layers[0] === layer)
              .map((p) => (
                <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} opacity={hl(p.net)}>
                  <PadGlyph pad={p} fill={colorOf(layer)} />
                </g>
              ))}
          </g>
        )
      })}

      {/* multi-layer pads and vias are always on top */}
      {conn.pads
        .filter((p) => p.layers.length === 2)
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} opacity={hl(p.net)}>
            <PadGlyph pad={p} fill={EDA.multi} hole={EDA.hole} />
          </g>
        ))}
      {doc.vias.map((v) => (
        <g key={v.id} opacity={hl(conn.netOf.get(`via:${v.id}`))}>
          <circle cx={v.x} cy={v.y} r={v.d / 2} fill={EDA.via} />
          <circle cx={v.x} cy={v.y} r={v.drill / 2} fill={EDA.hole} />
        </g>
      ))}

      {/* silkscreen */}
      {vis.silk && (
        <g>
          {doc.parts.map((p) => (
            <g key={p.ref} transform={partTransform(p)}>
              <FootprintSilk def={getFootprint(p.fp)} color={p.side === 'top' ? EDA.silkTop : EDA.silkBottom} />
            </g>
          ))}
          {vis.refs && doc.parts.map((p) => <RefLabel key={p.ref} part={p} color={p.side === 'top' ? EDA.silkTop : EDA.silkBottom} />)}
          {doc.texts.map((t) => (
            <SilkTextEl key={t.id} t={t} color={t.layer === 'top' ? EDA.silkTop : EDA.silkBottom} />
          ))}
        </g>
      )}

      {/* hit areas & selection */}
      {doc.parts.map((p) => {
        const fp = getFootprint(p.fp)
        const sel = selectedRefs.includes(p.ref)
        return (
          <g
            key={p.ref}
            transform={partTransform(p)}
            onPointerDown={onPartPointerDown ? (e) => onPartPointerDown(p.ref, e) : undefined}
            style={{ cursor: onPartPointerDown ? 'grab' : undefined }}
          >
            <rect
              x={-fp.courtyard.w}
              y={-fp.courtyard.h}
              width={fp.courtyard.w * 2}
              height={fp.courtyard.h * 2}
              fill={sel ? 'rgba(255,255,255,0.08)' : 'transparent'}
              stroke={sel ? EDA.select : 'none'}
              strokeWidth={0.08}
              strokeDasharray="0.3 0.2"
            />
          </g>
        )
      })}
      {(onPadPointerDown || onPadEnter) &&
        conn.pads.map((p) => (
          <g
            key={p.key}
            transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}
            onPointerDown={onPadPointerDown ? (e) => onPadPointerDown(p, e) : undefined}
            onPointerEnter={onPadEnter ? () => onPadEnter(p) : undefined}
            onPointerLeave={onPadEnter ? () => onPadEnter(null) : undefined}
            style={{ cursor: 'crosshair' }}
          >
            <PadGlyph pad={p} fill="transparent" hole={null} inflate={0.1} />
          </g>
        ))}

      {vis.ratsnest && (
        <g style={{ pointerEvents: 'none' }}>
          {conn.ratsnest.map((r, i) => (
            <line
              key={i}
              x1={r.a.x}
              y1={r.a.y}
              x2={r.b.x}
              y2={r.b.y}
              stroke={netColors?.[r.net] ?? EDA.ratsnest}
              strokeWidth={0.07}
              opacity={highlightNet ? (r.net === highlightNet ? 1 : 0.25) : 0.9}
            />
          ))}
        </g>
      )}

      {drcErrors && <DrcMarkers errors={drcErrors} />}
      {children}
    </g>
  )
}

export function DrcMarkers({ errors }: { errors: DrcError[] }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {errors.map((e, i) => (
        <g key={i} transform={`translate(${e.at[0]} ${e.at[1]})`}>
          <circle r={0.9} fill="none" stroke={EDA.drc} strokeWidth={0.12} />
          <line x1={-0.55} y1={-0.55} x2={0.55} y2={0.55} stroke={EDA.drc} strokeWidth={0.14} />
          <line x1={0.55} y1={-0.55} x2={-0.55} y2={0.55} stroke={EDA.drc} strokeWidth={0.14} />
        </g>
      ))}
    </g>
  )
}

export function partTransform(p: PartInst) {
  return `translate(${p.x} ${p.y}) rotate(${p.rot})${p.side === 'bottom' ? ' scale(-1 1)' : ''}`
}

export function RefLabel({ part, color }: { part: PartInst; color: string }) {
  const fp = getFootprint(part.fp)
  const r = ((part.rot % 180) + 180) % 180
  // place the designator just outside the courtyard, above for horizontal parts, left for vertical
  const off = r === 90 ? { x: part.x - fp.courtyard.h - 0.25, y: part.y, anchor: 'end' as const } : { x: part.x, y: part.y - fp.courtyard.h - 0.35, anchor: 'middle' as const }
  return (
    <text
      x={off.x}
      y={off.y}
      fontSize={0.9}
      textAnchor={off.anchor}
      dominantBaseline={r === 90 ? 'central' : 'auto'}
      fill={color}
      fontFamily="IBM Plex Mono, monospace"
      fontWeight={600}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      transform={part.side === 'bottom' ? `scale(-1 1) translate(${-2 * off.x} 0)` : undefined}
    >
      {part.ref}
    </text>
  )
}

export function SilkTextEl({ t, color }: { t: BoardDoc['texts'][number]; color: string }) {
  return (
    <text
      x={t.x}
      y={t.y}
      fontSize={t.size}
      textAnchor={t.anchor ?? 'start'}
      fill={color}
      fontFamily="IBM Plex Mono, monospace"
      fontWeight={600}
      transform={t.rot ? `rotate(${t.rot} ${t.x} ${t.y})` : undefined}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {t.text}
    </text>
  )
}

/* ------------------------------------------------------------------ */
/* Copper pour with clearance cut-outs and thermal reliefs             */
/* ------------------------------------------------------------------ */

export function PourFill({
  pour,
  doc,
  conn,
  fill,
  opacity = 1,
  uid,
  thermals = true,
}: {
  pour: Pour
  doc: BoardDoc
  conn: Connectivity
  fill: string
  opacity?: number
  uid: string
  thermals?: boolean
}) {
  const id = `pour-${uid}-${cleanId(pour.id)}`
  const c = pour.clearance
  const layer = pour.layer
  const spoke = 0.35
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-5} y={-5} width={doc.w + 10} height={doc.h + 10}>
          <polygon points={ptsStr(pour.pts)} fill="#fff" />
          {/* other-net tracks */}
          {doc.tracks
            .filter((t) => t.layer === layer && (conn.netOf.get(`track:${t.id}`) ?? t.net) !== pour.net)
            .map((t) => (
              <polyline
                key={t.id}
                points={ptsStr(t.pts)}
                fill="none"
                stroke="#000"
                strokeWidth={t.width + 2 * c}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          {/* vias of other nets */}
          {doc.vias
            .filter((v) => conn.netOf.get(`via:${v.id}`) !== pour.net)
            .map((v) => (
              <circle key={v.id} cx={v.x} cy={v.y} r={v.d / 2 + c} fill="#000" />
            ))}
          {/* pads: other nets get clearance; same net gets thermal relief */}
          {conn.pads
            .filter((p) => p.layers.includes(layer))
            .map((p) => {
              const same = p.net === pour.net
              return (
                <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
                  <PadGlyph pad={p} fill="#000" hole={null} inflate={c} />
                  {same && thermals && (
                    <>
                      <rect x={-p.w / 2 - c - 0.05} y={-spoke / 2} width={p.w + 2 * c + 0.1} height={spoke} fill="#fff" />
                      <rect x={-spoke / 2} y={-p.h / 2 - c - 0.05} width={spoke} height={p.h + 2 * c + 0.1} fill="#fff" />
                    </>
                  )}
                  {same && !thermals && <PadGlyph pad={p} fill="#fff" hole={null} inflate={c + 0.01} />}
                </g>
              )
            })}
          {/* same-net tracks merge into the pour */}
          {doc.tracks
            .filter((t) => t.layer === layer && (conn.netOf.get(`track:${t.id}`) ?? t.net) === pour.net)
            .map((t) => (
              <polyline key={t.id} points={ptsStr(t.pts)} fill="none" stroke="#fff" strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
            ))}
        </mask>
      </defs>
      <polygon points={ptsStr(pour.pts)} fill={fill} opacity={opacity} mask={`url(#${id})`} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Photo-real board                                                    */
/* ------------------------------------------------------------------ */

function RealBoard({ doc, vis, conn, side = 'top', maskColor = 'green', finish = 'hasl', children }: Resolved) {
  const uid = cleanId(useId())
  const m = MASKS[maskColor]
  const padColor = finish === 'enig' ? REAL.enig : REAL.hasl
  const flip = side === 'bottom'
  const clipId = `clip-${uid}`
  const gradId = `grad-${uid}`
  const layerPads = conn.pads.filter((p) => p.layers.includes(side))
  return (
    <g transform={flip ? `translate(${doc.w} 0) scale(-1 1)` : undefined}>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={doc.w} height={doc.h} rx={doc.corner} />
        </clipPath>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.1} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.12} />
        </linearGradient>
      </defs>
      {/* board edge (FR4 core shows as a thin rim) */}
      <rect x={-0.12} y={-0.12} width={doc.w + 0.24} height={doc.h + 0.24} rx={doc.corner + 0.1} fill={m.edge} />
      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={0} width={doc.w} height={doc.h} fill={m.mask} />
        {/* copper under the mask shows as a lighter tint */}
        {vis.pours &&
          doc.pours
            .filter((p) => p.layer === side)
            .map((p) => <PourFill key={p.id} uid={uid} pour={p} doc={doc} conn={conn} fill={m.maskCopper} />)}
        {doc.tracks
          .filter((t) => t.layer === side)
          .map((t) => (
            <polyline
              key={t.id}
              points={ptsStr(t.pts)}
              fill="none"
              stroke={m.maskCopper}
              strokeWidth={t.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        {/* exposed pads (mask opening) */}
        {layerPads.map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill={m.mask} hole={null} inflate={0.05} />
            <PadGlyph pad={p} fill={padColor} hole={REAL.hole} />
          </g>
        ))}
        {doc.vias.map((v) => (
          <g key={v.id}>
            <circle cx={v.x} cy={v.y} r={v.d / 2} fill={m.maskCopper} />
            <circle cx={v.x} cy={v.y} r={v.drill / 2} fill={REAL.hole} />
          </g>
        ))}
        {/* silkscreen */}
        {vis.silk && (
          <g>
            {doc.parts
              .filter((p) => p.side === side)
              .map((p) => (
                <g key={p.ref} transform={partTransform(p)}>
                  <FootprintSilk def={getFootprint(p.fp)} color={m.silk} />
                </g>
              ))}
            {vis.refs &&
              doc.parts.filter((p) => p.side === side).map((p) => <RefLabel key={p.ref} part={p} color={m.silk} />)}
            {doc.texts
              .filter((t) => t.layer === side)
              .map((t) => (
                <SilkTextEl key={t.id} t={t} color={m.silk} />
              ))}
          </g>
        )}
        <rect x={0} y={0} width={doc.w} height={doc.h} fill={`url(#${gradId})`} style={{ pointerEvents: 'none' }} />
      </g>
      {/* assembled parts */}
      {vis.bodies &&
        doc.parts
          .filter((p) => p.side === side || getFootprint(p.fp).mount === 'tht')
          .map((p) => (
            <g key={p.ref} transform={partTransform(p)} style={{ filter: 'drop-shadow(0.15px 0.25px 0.2px rgba(0,0,0,0.45))' }}>
              <PartBodyTop fp={getFootprint(p.fp)} value={p.value} />
            </g>
          ))}
      {children}
    </g>
  )
}

/** Pads of a single part in world space — convenience re-export for scenes. */
export { partPads }
