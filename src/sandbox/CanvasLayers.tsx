import { memo, useMemo } from 'react'
import { BoardView, type LayerVis } from '@/pcb/render'
import type { BoardDoc, Connectivity, DrcError, Layer, Track, Via } from '@/pcb/board'
import { courtyardRect } from '@/pcb/board'
import { EDA, type FinishColor, type MaskColor } from '@/pcb/palette'
import { netInfo } from '@/pcb/project'
import { dist, type Vec } from '@/pcb/geom'
import { useView } from './EditorCanvas'
import { useCursor, type CursorStore } from './store'
import { cornerPath, partOnBoard, polyArea } from './geometry'
import type { CornerMode, RouteState, Sel, Tool } from './types'

export const layerColor = (l: Layer) => (l === 'top' ? EDA.top : EDA.bottom)
export const NET_COLORS: Record<string, string> = Object.fromEntries(Object.entries(netInfo).map(([k, v]) => [k, v.color]))
const MONO = 'IBM Plex Mono, monospace'
const pts = (p: Vec[]) => p.map((q) => `${q[0]},${q[1]}`).join(' ')

/* ------------------------------------------------------------------ */
/* Board (memoised: only re-renders when the doc or display changes)   */
/* ------------------------------------------------------------------ */

export const BoardLayer = memo(function BoardLayer(props: {
  doc: BoardDoc
  conn: Connectivity
  mode: 'eda' | 'real'
  vis: Partial<LayerVis>
  activeLayer: Layer
  highlightNet: string | null
  selectedRefs: string[]
  drcErrors?: DrcError[]
  netColors?: Record<string, string>
  maskColor: MaskColor
  finish: FinishColor
  side: Layer
}) {
  return (
    <BoardView
      doc={props.doc}
      conn={props.conn}
      mode={props.mode}
      vis={props.vis}
      activeLayer={props.activeLayer}
      highlightNet={props.highlightNet}
      selectedRefs={props.selectedRefs}
      drcErrors={props.drcErrors}
      netColors={props.netColors}
      maskColor={props.maskColor}
      finish={props.finish}
      side={props.side}
    />
  )
})

/* ------------------------------------------------------------------ */
/* Static overlay: selection, pad net names, board dimensions          */
/* ------------------------------------------------------------------ */

export const StaticOverlay = memo(function StaticOverlay({
  doc,
  conn,
  sel,
  showNetLabels,
  highlightNet,
  focus,
  showEmptyHint,
  visible,
}: {
  doc: BoardDoc
  conn: Connectivity
  sel: Sel[]
  showNetLabels: boolean
  highlightNet: string | null
  focus: Vec | null
  showEmptyHint: boolean
  visible: { top: boolean; bottom: boolean }
}) {
  const { px } = useView()
  const selTracks = doc.tracks.filter((t) => sel.some((s) => s.kind === 'track' && s.id === t.id))
  const selVias = doc.vias.filter((v) => sel.some((s) => s.kind === 'via' && s.id === v.id))
  const selPours = doc.pours.filter((p) => sel.some((s) => s.kind === 'pour' && s.id === p.id))
  const labelsOn = showNetLabels && px < 0.045
  const dimC = 'rgba(255,255,255,0.32)'
  const tick = 0.8
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* board dimensions, notebook style */}
      <g stroke={dimC} strokeWidth={px} fill={dimC} fontFamily={MONO}>
        <line x1={0} y1={-1.6} x2={doc.w} y2={-1.6} />
        <line x1={0} y1={-1.6 - tick / 2} x2={0} y2={-1.6 + tick / 2} />
        <line x1={doc.w} y1={-1.6 - tick / 2} x2={doc.w} y2={-1.6 + tick / 2} />
        <text x={doc.w / 2} y={-2.1} fontSize={Math.max(0.8, 10 * px)} textAnchor="middle" stroke="none">
          {doc.w.toFixed(1)} mm
        </text>
        <line x1={-1.6} y1={0} x2={-1.6} y2={doc.h} />
        <line x1={-1.6 - tick / 2} y1={0} x2={-1.6 + tick / 2} y2={0} />
        <line x1={-1.6 - tick / 2} y1={doc.h} x2={-1.6 + tick / 2} y2={doc.h} />
        <text x={-2.1} y={doc.h / 2} fontSize={Math.max(0.8, 10 * px)} textAnchor="middle" stroke="none" transform={`rotate(-90 ${-2.1} ${doc.h / 2})`}>
          {doc.h.toFixed(1)} mm
        </text>
      </g>

      {showEmptyHint && (
        <g>
          <rect x={3} y={3} width={doc.w - 6} height={doc.h - 6} rx={1.2} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.22)" strokeWidth={px * 1.2} strokeDasharray={`${px * 6} ${px * 5}`} />
          <text x={doc.w / 2} y={doc.h / 2 - 0.4} fontSize={1.6} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontFamily={MONO} letterSpacing={0.2}>
            DRAG PARTS HERE
          </text>
          <text x={doc.w / 2} y={doc.h / 2 + 1.6} fontSize={0.95} textAnchor="middle" fill="rgba(255,255,255,0.32)" fontFamily={MONO}>
            start with U1 in the middle
          </text>
        </g>
      )}

      {/* selection */}
      {selPours.map((p) => (
        <g key={p.id}>
          <polygon points={pts(p.pts)} fill="rgba(255,255,255,0.05)" stroke="#fff" strokeWidth={px * 1.5} strokeDasharray={`${px * 6} ${px * 4}`} className="sbx-march" />
          {p.pts.map((q, i) => (
            <rect key={i} x={q[0] - px * 4} y={q[1] - px * 4} width={px * 8} height={px * 8} fill="#fff" />
          ))}
        </g>
      ))}
      {selTracks.map((t) => (
        <g key={t.id}>
          <polyline points={pts(t.pts)} fill="none" stroke="#fff" strokeWidth={t.width + px * 5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          <polyline points={pts(t.pts)} fill="none" stroke={layerColor(t.layer)} strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={pts(t.pts)} fill="none" stroke="#fff" strokeWidth={px * 1.2} strokeDasharray={`${px * 5} ${px * 5}`} className="sbx-march" />
          {t.pts.map((q, i) => (
            <circle key={i} cx={q[0]} cy={q[1]} r={px * 3} fill="#fff" />
          ))}
        </g>
      ))}
      {selVias.map((v) => (
        <circle key={v.id} cx={v.x} cy={v.y} r={v.d / 2 + px * 4} fill="none" stroke="#fff" strokeWidth={px * 2} />
      ))}

      {/* net names on pads when zoomed in, like EasyEDA */}
      {labelsOn &&
        conn.pads
          .filter((p) => p.net && p.layers.some((l) => visible[l]))
          .map((p) => {
            const r = ((p.rot % 180) + 180) % 180
            const w = r === 90 ? p.h : p.w
            const h = r === 90 ? p.w : p.h
            const fs = Math.min(h * 0.5, (w / Math.max(2.6, p.net!.length)) * 1.55, 0.7)
            return (
              <text
                key={p.key}
                x={p.x}
                y={p.y}
                fontSize={fs}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                opacity={highlightNet && highlightNet !== p.net ? 0.25 : 0.85}
                fontFamily={MONO}
                fontWeight={600}
              >
                {p.net}
              </text>
            )
          })}

      {focus && (
        <g transform={`translate(${focus[0]} ${focus[1]})`}>
          <circle r={1.6} fill="none" stroke={EDA.drc} strokeWidth={px * 2} className="sbx-ping" />
          <circle r={1.2} fill="none" stroke={EDA.drc} strokeWidth={px * 1.5} />
        </g>
      )}
    </g>
  )
})

/* ------------------------------------------------------------------ */
/* Cursor overlay: crosshair, snap marker, live route/pour/measure      */
/* ------------------------------------------------------------------ */

export interface DraftRect {
  a: Vec
  b: Vec
}

export function CursorOverlay({
  store,
  tool,
  route,
  corner,
  pourDraft,
  measure,
  activeLayer,
  doc,
  hoverRef,
  clearance,
}: {
  store: CursorStore
  tool: Tool
  route: RouteState | null
  corner: CornerMode
  pourDraft: DraftRect | null
  measure: { a: Vec; b: Vec } | null
  activeLayer: Layer
  doc: BoardDoc
  hoverRef: string | null
  clearance: number
}) {
  const { view, px } = useView()
  const cur = useCursor(store)
  const snap = cur.snap
  const p = snap?.pt ?? cur.world

  const hoverPart = hoverRef && tool === 'select' ? doc.parts.find((q) => q.ref === hoverRef) : null
  const hoverRect = hoverPart ? courtyardRect(hoverPart) : null

  const live = useMemo(() => {
    if (!route || !snap) return null
    const last = route.pts[route.pts.length - 1]
    return cornerPath(last, snap.pt, corner)
  }, [route, snap, corner])

  const fs = 11 * px
  const chip = (x: number, y: number, text: string, color: string) => {
    const w = text.length * fs * 0.62 + fs * 1.2
    return (
      <g transform={`translate(${x + 14 * px} ${y + 14 * px})`}>
        <rect width={w} height={fs * 1.8} rx={fs * 0.4} fill="rgba(16,18,16,0.88)" stroke={color} strokeWidth={px} />
        <text x={fs * 0.6} y={fs * 0.9} fontSize={fs} fill="#f3efe4" fontFamily={MONO} dominantBaseline="central">
          {text}
        </text>
      </g>
    )
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      {hoverRect && (
        <rect
          x={hoverRect.x0}
          y={hoverRect.y0}
          width={hoverRect.x1 - hoverRect.x0}
          height={hoverRect.y1 - hoverRect.y0}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={px}
          rx={px * 2}
        />
      )}

      {/* routing */}
      {route && (
        <g>
          {route.done.map((t) => (
            <RouteTrack key={t.id} t={t} active={t.layer === activeLayer} />
          ))}
          {route.pts.length > 1 && <RouteTrack t={{ id: 'cur', layer: route.layer, width: route.width, pts: route.pts }} active />}
          {live && live.length > 1 && (
            <g>
              <polyline points={pts(live)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={route.width + clearance * 2} strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={pts(live)} fill="none" stroke={layerColor(route.layer)} strokeWidth={route.width} strokeLinecap="round" strokeLinejoin="round" opacity={0.78} />
              <polyline points={pts(live)} fill="none" stroke="#fff" strokeWidth={px} strokeDasharray={`${px * 4} ${px * 4}`} className="sbx-march" />
            </g>
          )}
          {route.vias.map((v) => (
            <ViaGlyph key={v.id} v={v} />
          ))}
          {route.pts.map((q, i) => (
            <circle key={i} cx={q[0]} cy={q[1]} r={px * 2.5} fill="#fff" opacity={0.85} />
          ))}
        </g>
      )}

      {/* via ghost */}
      {tool === 'via' && p && <ViaGlyph v={{ id: 'ghost', x: p[0], y: p[1], d: 0.6, drill: 0.3 }} ghost />}

      {/* pour draft */}
      {pourDraft && <PourDraft r={pourDraft} layer={activeLayer} px={px} board={doc} />}

      {/* measure */}
      {measure && <Measure a={measure.a} b={measure.b} px={px} />}

      {/* crosshair */}
      {p && (
        <g>
          <line x1={view.x} y1={p[1]} x2={view.x + view.w} y2={p[1]} stroke="rgba(255,255,255,0.2)" strokeWidth={px} />
          <line x1={p[0]} y1={view.y} x2={p[0]} y2={view.y + view.h} stroke="rgba(255,255,255,0.2)" strokeWidth={px} />
        </g>
      )}

      {/* snap marker */}
      {p && snap && snap.kind !== 'grid' && (
        <g transform={`translate(${p[0]} ${p[1]})`}>
          <rect
            x={-px * 7}
            y={-px * 7}
            width={px * 14}
            height={px * 14}
            fill="none"
            stroke={snap.ok || !route ? '#5fe08a' : '#ff6a5a'}
            strokeWidth={px * 1.6}
            transform="rotate(45)"
          />
        </g>
      )}
      {p && (!snap || snap.kind === 'grid') && tool !== 'select' && (
        <g stroke="#fff" strokeWidth={px * 1.2} opacity={0.9}>
          <line x1={p[0] - px * 5} y1={p[1]} x2={p[0] + px * 5} y2={p[1]} />
          <line x1={p[0]} y1={p[1] - px * 5} x2={p[0]} y2={p[1] + px * 5} />
        </g>
      )}

      {/* cursor label */}
      {route && p && chip(p[0], p[1], `${route.net ?? 'no net'} · ${route.width.toFixed(2)} mm · ${route.layer.toUpperCase()}`, layerColor(route.layer))}
      {route && p && snap && !snap.ok && snap.reason && snap.kind !== 'grid' && chip(p[0], p[1] + fs * 2.2, snap.reason.split('.')[0], '#ff6a5a')}
      {!route && tool === 'route' && p && cur.hover?.net && chip(p[0], p[1], `${cur.hover.label} · ${cur.hover.net}`, '#5fe08a')}
      {tool === 'highlight' && p && cur.hover?.net && chip(p[0], p[1], `Highlight ${cur.hover.net}`, NET_COLORS[cur.hover.net] ?? '#fff')}
    </g>
  )
}

function RouteTrack({ t, active }: { t: Pick<Track, 'id' | 'layer' | 'width' | 'pts'>; active: boolean }) {
  return <polyline points={pts(t.pts)} fill="none" stroke={layerColor(t.layer)} strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.5} />
}

export function ViaGlyph({ v, ghost }: { v: Via; ghost?: boolean }) {
  return (
    <g opacity={ghost ? 0.55 : 1}>
      <circle cx={v.x} cy={v.y} r={v.d / 2} fill={EDA.via} />
      <circle cx={v.x} cy={v.y} r={v.drill / 2} fill={EDA.hole} />
    </g>
  )
}

function PourDraft({ r, layer, px, board }: { r: DraftRect; layer: Layer; px: number; board: BoardDoc }) {
  const x0 = Math.min(r.a[0], r.b[0])
  const y0 = Math.min(r.a[1], r.b[1])
  const w = Math.abs(r.a[0] - r.b[0])
  const h = Math.abs(r.a[1] - r.b[1])
  const c = layerColor(layer)
  const area = polyArea([
    [x0, y0],
    [x0 + w, y0],
    [x0 + w, y0 + h],
    [x0, y0 + h],
  ])
  const pct = Math.min(100, Math.round((area / (board.w * board.h)) * 100))
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} fill={c} opacity={0.22} />
      <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={c} strokeWidth={px * 1.6} strokeDasharray={`${px * 6} ${px * 4}`} className="sbx-march" />
      <text x={x0 + w / 2} y={y0 + h / 2} fontSize={12 * px} textAnchor="middle" dominantBaseline="central" fill="#fff" fontFamily={MONO}>
        {w.toFixed(1)} × {h.toFixed(1)} mm · {pct}% of board
      </text>
    </g>
  )
}

function Measure({ a, b, px }: { a: Vec; b: Vec; px: number }) {
  const d = dist(a, b)
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const c = '#ffd75e'
  const fs = 11 * px
  const text = `${d.toFixed(2)} mm  Δx ${Math.abs(b[0] - a[0]).toFixed(2)}  Δy ${Math.abs(b[1] - a[1]).toFixed(2)}`
  const w = text.length * fs * 0.62 + fs
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={px * 1.5} />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={a[1]} stroke={c} strokeWidth={px} strokeDasharray={`${px * 3} ${px * 3}`} opacity={0.5} />
      <line x1={b[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={px} strokeDasharray={`${px * 3} ${px * 3}`} opacity={0.5} />
      <circle cx={a[0]} cy={a[1]} r={px * 3} fill={c} />
      <circle cx={b[0]} cy={b[1]} r={px * 3} fill={c} />
      <g transform={`translate(${mx + 8 * px} ${my - 22 * px})`}>
        <rect width={w} height={fs * 1.8} rx={fs * 0.4} fill="rgba(16,18,16,0.9)" stroke={c} strokeWidth={px} />
        <text x={fs * 0.5} y={fs * 0.9} fontSize={fs} fill={c} fontFamily={MONO} dominantBaseline="central">
          {text}
        </text>
      </g>
    </g>
  )
}

/** While dragging, pours are drawn as light outlines (cheap) and refilled on release, like EasyEDA's rebuild. */
export const PourOutlines = memo(function PourOutlines({ doc, activeLayer }: { doc: BoardDoc; activeLayer: Layer }) {
  const { px } = useView()
  return (
    <g style={{ pointerEvents: 'none' }}>
      {doc.pours.map((p) => (
        <polygon
          key={p.id}
          points={pts(p.pts)}
          fill={layerColor(p.layer)}
          fillOpacity={p.layer === activeLayer ? 0.12 : 0.06}
          stroke={layerColor(p.layer)}
          strokeOpacity={0.6}
          strokeWidth={px * 1.2}
          strokeDasharray={`${px * 6} ${px * 4}`}
        />
      ))}
    </g>
  )
})

/** Small helper for the photo view: draw nothing on top but keep a stable child. */
export function PartsBinLabel({ doc }: { doc: BoardDoc }) {
  const { px } = useView()
  const off = doc.parts.filter((p) => !partOnBoard(p, doc))
  if (!off.length) return null
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity
  for (const p of off) {
    const r = courtyardRect(p)
    x0 = Math.min(x0, r.x0)
    y0 = Math.min(y0, r.y0)
    x1 = Math.max(x1, r.x1)
    y1 = Math.max(y1, r.y1)
  }
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={x0 - 1} y={y0 - 1} width={x1 - x0 + 2} height={y1 - y0 + 2} rx={1} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={px} strokeDasharray={`${px * 4} ${px * 4}`} />
      <text x={x0 - 0.6} y={y1 + 1 + 12 * px} fontSize={9.5 * px} fill="rgba(255,255,255,0.4)" fontFamily={MONO} letterSpacing={px * 1.5}>
        NOT PLACED YET · {off.length} PART{off.length === 1 ? '' : 'S'}
      </text>
    </g>
  )
}

