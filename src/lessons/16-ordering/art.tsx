/* Hand-made illustrations for the ordering timeline (SVG, house palette, soft depth). */
import { useMemo, type CSSProperties } from 'react'
import { analyze, type BoardDoc } from '@/pcb/board'
import { BoardView, PadGlyph, PourFill } from '@/pcb/render'
import { MASKS, REAL, type FinishColor, type MaskColor } from '@/pcb/palette'

/* ------------------------------------------------------------------ */
/* Board top face at a given manufacturing stage                        */
/* ------------------------------------------------------------------ */

export type Stage = 'clad' | 'drilled' | 'plated' | 'etched' | 'masked' | 'silk' | 'assembled'
const ORDER: Stage[] = ['clad', 'drilled', 'plated', 'etched', 'masked', 'silk', 'assembled']
const atLeast = (s: Stage, t: Stage) => ORDER.indexOf(s) >= ORDER.indexOf(t)

function holesOf(doc: BoardDoc) {
  const conn = analyze(doc)
  return [...doc.vias.map((v) => ({ x: v.x, y: v.y, d: v.drill, ring: v.d })), ...conn.pads.filter((p) => p.drill).map((p) => ({ x: p.x, y: p.y, d: p.drill!, ring: p.w }))]
}

export function BoardFace({ doc, stage, mask, finish, uid, wipe }: { doc: BoardDoc; stage: Stage; mask: MaskColor; finish: FinishColor; uid: string; wipe?: boolean }) {
  const conn = useMemo(() => analyze(doc), [doc])
  const holes = useMemo(() => holesOf(doc), [doc])
  const { w, h, corner } = doc
  const cu = REAL.copper
  const clip = `face-${uid}`
  const wipeId = `wipe-${uid}`
  const copperArt = (
    <g>
      {doc.pours
        .filter((p) => p.layer === 'top')
        .map((p) => (
          <PourFill key={p.id} uid={`tl${uid}`} pour={p} doc={doc} conn={conn} fill={cu} />
        ))}
      {doc.tracks
        .filter((t) => t.layer === 'top')
        .map((t) => (
          <polyline key={t.id} points={t.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={cu} strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      {conn.pads
        .filter((p) => p.layers.includes('top'))
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill={cu} hole={null} />
          </g>
        ))}
      {doc.vias.map((v) => (
        <circle key={v.id} cx={v.x} cy={v.y} r={v.d / 2} fill={cu} />
      ))}
    </g>
  )
  const layer = (s: Stage) => {
    if (s === 'clad' || s === 'drilled' || s === 'plated')
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={`url(#cu-${uid})`} />
          {/* brushed copper streaks */}
          {Array.from({ length: 26 }, (_, i) => (
            <line key={i} x1={0} y1={i + 0.5} x2={w} y2={i + 0.5 + ((i * 7) % 3) * 0.2} stroke="#fff" strokeOpacity={0.05 + ((i * 13) % 5) * 0.012} strokeWidth={0.18} />
          ))}
        </g>
      )
    if (s === 'etched')
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={`url(#weave-${uid})`} />
          <g filter={`url(#cushade-${uid})`}>{copperArt}</g>
        </g>
      )
    return <BoardView doc={doc} mode="real" side="top" maskColor={mask} finish={finish} vis={{ silk: s !== 'masked', refs: s !== 'masked', bodies: s === 'assembled', ratsnest: false, sheen: false }} />
  }
  const prev = ORDER[Math.max(0, ORDER.indexOf(stage) - 1)]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={w} height={h} rx={corner} />
        </clipPath>
        <clipPath id={wipeId}>
          <rect className="l16-wipe" x={0} y={-1} width={w} height={h + 2} />
        </clipPath>
        <linearGradient id={`cu-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0b47a" />
          <stop offset="0.35" stopColor="#d58a44" />
          <stop offset="0.7" stopColor="#e9a565" />
          <stop offset="1" stopColor="#b9692c" />
        </linearGradient>
        <pattern id={`weave-${uid}`} width={0.9} height={0.9} patternUnits="userSpaceOnUse">
          <rect width={0.9} height={0.9} fill="#d2bd86" />
          <path d="M0 0.22 H0.9 M0 0.67 H0.9" stroke="#bea468" strokeWidth={0.14} />
          <path d="M0.22 0 V0.9 M0.67 0 V0.9" stroke="#e0cf9f" strokeWidth={0.09} />
        </pattern>
        <filter id={`cushade-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx={0.05} dy={0.08} stdDeviation={0.06} floodColor="#5a3510" floodOpacity={0.6} />
        </filter>
        <radialGradient id={`hole-${uid}`}>
          <stop offset="0" stopColor="#0b0a08" />
          <stop offset="0.75" stopColor="#1e1a14" />
          <stop offset="1" stopColor="#4a3a24" />
        </radialGradient>
        <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.22} />
          <stop offset="0.4" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.12} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {wipe && stage !== prev ? (
          <>
            {layer(prev)}
            <g clipPath={`url(#${wipeId})`}>{layer(stage)}</g>
          </>
        ) : (
          layer(stage)
        )}
        {/* drilled holes (before mask they are raw; plated gets a copper barrel ring) */}
        {atLeast(stage, 'drilled') &&
          !atLeast(stage, 'masked') &&
          holes.map((o, i) => (
            <g key={i} className={stage === 'drilled' && wipe ? 'l16-pop' : ''} style={{ animationDelay: `${i * 0.25}s` } as CSSProperties}>
              {atLeast(stage, 'plated') && <circle cx={o.x} cy={o.y} r={o.d / 2 + 0.12} fill="#f3c08a" />}
              <circle cx={o.x} cy={o.y} r={o.d / 2} fill={`url(#hole-${uid})`} />
            </g>
          ))}
        <rect x={0} y={0} width={w} height={h} fill={`url(#gloss-${uid})`} />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* An isometric slab with real edges                                    */
/* ------------------------------------------------------------------ */

export function IsoBoard({ doc, stage, mask, finish, uid, wipe, width }: { doc: BoardDoc; stage: Stage; mask: MaskColor; finish: FinishColor; uid: string; wipe?: boolean; width: number }) {
  const h = (width * doc.h) / doc.w
  const masked = atLeast(stage, 'masked')
  const m = MASKS[mask]
  const topSkin = masked ? m.mask : atLeast(stage, 'etched') ? '#cbb27a' : '#c98140'
  return (
    <div className="l16-iso" style={{ width, height: h }}>
      <div className="l16-iso__shadow" />
      <div className="l16-iso__slab">
        <div className="l16-iso__top">
          <BoardFace doc={doc} stage={stage} mask={mask} finish={finish} uid={uid} wipe={wipe} />
        </div>
        <div className="l16-iso__edge l16-iso__edge--front" style={{ ['--skin' as string]: topSkin } as CSSProperties} />
        <div className="l16-iso__edge l16-iso__edge--side" style={{ ['--skin' as string]: topSkin } as CSSProperties} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Props: drill bit, bubbles, probes, iron, box                         */
/* ------------------------------------------------------------------ */

export function DrillBit() {
  return (
    <svg className="l16-drill" viewBox="0 0 60 220" width={46} height={168} aria-hidden>
      <defs>
        <linearGradient id="dr-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#6f747b" />
          <stop offset="0.35" stopColor="#f3f5f7" />
          <stop offset="0.6" stopColor="#b9bec5" />
          <stop offset="1" stopColor="#5a5f66" />
        </linearGradient>
        <linearGradient id="dr-chuck" x1="0" x2="1">
          <stop offset="0" stopColor="#24262a" />
          <stop offset="0.4" stopColor="#5b6068" />
          <stop offset="1" stopColor="#1a1b1e" />
        </linearGradient>
        <linearGradient id="dr-collar" x1="0" x2="1">
          <stop offset="0" stopColor="#b2312a" />
          <stop offset="0.45" stopColor="#ff6b57" />
          <stop offset="1" stopColor="#8e221c" />
        </linearGradient>
        <clipPath id="dr-flute">
          <path d="M22 120 H38 V200 L30 216 L22 200 Z" />
        </clipPath>
      </defs>
      <rect x={8} y={0} width={44} height={56} rx={6} fill="url(#dr-chuck)" />
      <rect x={8} y={50} width={44} height={6} fill="#000" opacity={0.25} />
      <rect x={14} y={56} width={32} height={22} rx={3} fill="url(#dr-collar)" />
      <rect x={21} y={78} width={18} height={44} fill="url(#dr-steel)" />
      <path d="M22 120 H38 V200 L30 216 L22 200 Z" fill="url(#dr-steel)" />
      <g clipPath="url(#dr-flute)">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M18 ${118 + i * 11} L42 ${128 + i * 11}`} stroke="#3f444a" strokeWidth={3.2} strokeLinecap="round" opacity={0.75} />
        ))}
      </g>
      <ellipse cx={27} cy={150} rx={1.5} ry={30} fill="#fff" opacity={0.35} />
    </svg>
  )
}

export function Bubbles() {
  return (
    <div className="l16-bubbles" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.37) % 2.4}s`, width: 6 + ((i * 5) % 9), height: 6 + ((i * 5) % 9) }} />
      ))}
    </div>
  )
}

export function Probe({ flip = false }: { flip?: boolean }) {
  return (
    <svg className={`l16-probe ${flip ? 'is-flip' : ''}`} viewBox="0 0 120 150" width={96} height={120} aria-hidden>
      <defs>
        <linearGradient id="pr-arm" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4a4f57" />
          <stop offset="1" stopColor="#23262b" />
        </linearGradient>
        <linearGradient id="pr-pin" x1="0" x2="1">
          <stop offset="0" stopColor="#8d9299" />
          <stop offset="0.45" stopColor="#f4f5f7" />
          <stop offset="1" stopColor="#7b8087" />
        </linearGradient>
      </defs>
      <rect x={0} y={8} width={92} height={22} rx={5} fill="url(#pr-arm)" />
      <rect x={4} y={10} width={84} height={4} rx={2} fill="#fff" opacity={0.12} />
      <rect x={78} y={24} width={22} height={34} rx={4} fill="#2b2e33" />
      <circle cx={89} cy={34} r={3} fill="#3fd17a" />
      <rect x={85} y={58} width={8} height={56} fill="url(#pr-pin)" />
      <path d="M85 114 H93 L89 146 Z" fill="url(#pr-pin)" />
      <path d="M86 70 h6 M86 76 h6 M86 82 h6" stroke="#666" strokeWidth={1} />
    </svg>
  )
}

export function Iron() {
  return (
    <svg className="l16-ironsvg" viewBox="0 0 260 120" width={250} height={115} aria-hidden>
      <defs>
        <linearGradient id="ir-grip" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3a6fd8" />
          <stop offset="0.45" stopColor="#1d3f8f" />
          <stop offset="1" stopColor="#10224d" />
        </linearGradient>
        <linearGradient id="ir-steel" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7a7f86" />
          <stop offset="0.4" stopColor="#eef0f3" />
          <stop offset="1" stopColor="#62676e" />
        </linearGradient>
        <linearGradient id="ir-tip" x1="0" x2="1">
          <stop offset="0" stopColor="#c9ccd1" />
          <stop offset="1" stopColor="#8a5a2b" />
        </linearGradient>
        <radialGradient id="ir-glow">
          <stop offset="0" stopColor="#ffb25c" stopOpacity={0.9} />
          <stop offset="1" stopColor="#ff7a2c" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform="rotate(-24 130 60)">
        <rect x={150} y={42} width={104} height={30} rx={14} fill="url(#ir-grip)" />
        {[168, 182, 196, 210, 224].map((x) => (
          <rect key={x} x={x} y={42} width={5} height={30} fill="#000" opacity={0.18} />
        ))}
        <rect x={154} y={45} width={96} height={6} rx={3} fill="#fff" opacity={0.18} />
        <rect x={136} y={47} width={18} height={20} rx={3} fill="#1b1c1f" />
        <rect x={64} y={51} width={74} height={12} fill="url(#ir-steel)" />
        <path d="M64 51 L22 56 Q16 57 22 58 L64 63 Z" fill="url(#ir-tip)" />
        <circle cx={22} cy={57} r={14} fill="url(#ir-glow)" />
      </g>
      <g className="l16-smoke" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round">
        <path d="M30 70 q-8 -12 2 -22 q8 -10 -2 -22" />
        <path d="M40 66 q-6 -10 3 -18 q6 -8 -1 -18" />
      </g>
    </svg>
  )
}

/** Isometric projection for the box art. */
const P = (x: number, y: number, z: number) => [130 + (x - y) * 0.866, 120 + (x + y) * 0.5 - z] as const
const poly = (...pts: (readonly [number, number])[]) => pts.map((p) => p.join(',')).join(' ')

export function ShippingBox({ open = false, mask = 'green' as MaskColor }: { open?: boolean; mask?: MaskColor }) {
  const W = 120
  const D = 86
  const H = 64
  const m = MASKS[mask]
  return (
    <svg className="l16-box" viewBox="0 0 260 250" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="bx-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9c58f" />
          <stop offset="1" stopColor="#d6aa6b" />
        </linearGradient>
        <linearGradient id="bx-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c99a5c" />
          <stop offset="1" stopColor="#d9ad70" />
        </linearGradient>
        <linearGradient id="bx-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b2834a" />
          <stop offset="1" stopColor="#9c713c" />
        </linearGradient>
        <linearGradient id="bx-tape" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e6c4" stopOpacity={0.85} />
          <stop offset="0.5" stopColor="#fff8e6" stopOpacity={0.95} />
          <stop offset="1" stopColor="#e9d3a6" stopOpacity={0.85} />
        </linearGradient>
        <linearGradient id="bx-inside" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a5427" />
          <stop offset="1" stopColor="#a87a43" />
        </linearGradient>
        <linearGradient id="bx-bag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9dde3" stopOpacity={0.95} />
          <stop offset="0.5" stopColor="#9aa1ab" stopOpacity={0.9} />
          <stop offset="1" stopColor="#e5e8ec" stopOpacity={0.95} />
        </linearGradient>
        <radialGradient id="bx-shadow">
          <stop offset="0" stopColor="#000" stopOpacity={0.35} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={130} cy={214} rx={118} ry={30} fill="url(#bx-shadow)" />
      {/* left-front face (y = D) */}
      <polygon points={poly(P(0, D, 0), P(W, D, 0), P(W, D, H), P(0, D, H))} fill="url(#bx-left)" />
      {/* right-front face (x = W) */}
      <polygon points={poly(P(W, 0, 0), P(W, D, 0), P(W, D, H), P(W, 0, H))} fill="url(#bx-right)" />
      {/* corrugation hint along the edges */}
      <polyline points={poly(P(W, D, 0), P(W, D, H))} stroke="#8a6332" strokeWidth={1.2} />
      {!open ? (
        <>
          <polygon points={poly(P(0, 0, H), P(W, 0, H), P(W, D, H), P(0, D, H))} fill="url(#bx-top)" />
          {/* flap seam + tape over the top and down the front */}
          <polyline points={poly(P(0, D / 2, H), P(W, D / 2, H))} stroke="#b88a52" strokeWidth={1} />
          <polygon points={poly(P(-2, D / 2 - 9, H + 0.4), P(W + 2, D / 2 - 9, H + 0.4), P(W + 2, D / 2 + 9, H + 0.4), P(-2, D / 2 + 9, H + 0.4))} fill="url(#bx-tape)" />
          <polygon points={poly(P(W + 0.4, D / 2 - 9, H), P(W + 0.4, D / 2 + 9, H), P(W + 0.4, D / 2 + 9, H - 26), P(W + 0.4, D / 2 - 9, H - 26))} fill="url(#bx-tape)" opacity={0.9} />
          {/* shipping label on the left face */}
          <g>
            <polygon points={poly(P(16, D + 0.4, 50), P(70, D + 0.4, 50), P(70, D + 0.4, 14), P(16, D + 0.4, 14))} fill="#fbfaf6" stroke="#d8d2c4" strokeWidth={0.6} />
            {Array.from({ length: 16 }, (_, i) => {
              const x = 20 + i * 2.2
              return <polyline key={i} points={poly(P(x, D + 0.6, 28), P(x, D + 0.6, 18))} stroke="#222" strokeWidth={i % 3 === 0 ? 1.4 : 0.7} />
            })}
            {[44, 40, 36].map((z, i) => (
              <polyline key={z} points={poly(P(20, D + 0.6, z), P(i === 0 ? 56 : 62 - i * 6, D + 0.6, z))} stroke="#8a8476" strokeWidth={1.3} strokeLinecap="round" />
            ))}
            <polygon points={poly(P(58, D + 0.6, 30), P(66, D + 0.6, 30), P(66, D + 0.6, 18), P(58, D + 0.6, 18))} fill="#e0542c" />
          </g>
          {/* "this way up" arrows on the right face */}
          {[0, 1].map((i) => {
            const y = 26 + i * 14
            return (
              <g key={i} stroke="#5a3d1c" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points={poly(P(W + 0.5, y, 22), P(W + 0.5, y, 42))} />
                <polyline points={poly(P(W + 0.5, y - 4, 37), P(W + 0.5, y, 43), P(W + 0.5, y + 4, 37))} />
              </g>
            )
          })}
          <polyline points={poly(P(W + 0.5, 22, 18), P(W + 0.5, 50, 18))} stroke="#5a3d1c" strokeWidth={1.6} />
        </>
      ) : (
        <>
          {/* inside */}
          <polygon points={poly(P(0, 0, H), P(W, 0, H), P(W, D, H), P(0, D, H))} fill="url(#bx-inside)" />
          <polygon points={poly(P(0, 0, H), P(W, 0, H), P(W, 0, 6), P(0, 0, 6))} fill="#6a4820" opacity={0.6} />
          {/* anti-static bag with boards */}
          <g>
            <polygon points={poly(P(14, 12, 36), P(W - 12, 12, 36), P(W - 12, D - 12, 36), P(14, D - 12, 36))} fill="url(#bx-bag)" />
            <polygon points={poly(P(30, 24, 38), P(80, 24, 38), P(80, 66, 38), P(30, 66, 38))} fill={m.mask} opacity={0.75} />
            <polygon points={poly(P(36, 20, 42), P(86, 20, 42), P(86, 62, 42), P(36, 62, 42))} fill={m.mask} />
            <polygon points={poly(P(36, 20, 42), P(86, 20, 42), P(86, 62, 42), P(36, 62, 42))} fill="#fff" opacity={0.12} />
            {[
              [48, 34],
              [58, 40],
              [70, 30],
              [64, 50],
            ].map(([x, y], i) => (
              <polygon key={i} points={poly(P(x, y, 42.2), P(x + 4, y, 42.2), P(x + 4, y + 2.5, 42.2), P(x, y + 2.5, 42.2))} fill={REAL.hasl} />
            ))}
            <polyline points={poly(P(20, 18, 37), P(W - 18, 18, 37))} stroke="#fff" strokeOpacity={0.7} strokeWidth={1.6} />
            <polygon points={poly(P(14, 12, 36), P(W - 12, 12, 36), P(W - 12, D - 12, 36), P(14, D - 12, 36))} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.8} />
          </g>
          {/* flaps */}
          <polygon points={poly(P(0, D, H), P(W, D, H), P(W, D + 30, H + 22), P(0, D + 30, H + 22))} fill="#dfb57a" />
          <polygon points={poly(P(W, 0, H), P(W, D, H), P(W + 30, D, H + 22), P(W + 30, 0, H + 22))} fill="#c99a5c" />
          <polygon points={poly(P(0, 0, H), P(W, 0, H), P(W, -26, H + 26), P(0, -26, H + 26))} fill="#e8c48e" />
          <polygon points={poly(P(0, 0, H), P(0, D, H), P(-26, D, H + 26), P(-26, 0, H + 26))} fill="#d2a86c" />
        </>
      )}
    </svg>
  )
}

export function Clipboard({ items }: { items: string[] }) {
  return (
    <div className="l16-clip" aria-hidden>
      <div className="l16-clip__clamp" />
      <div className="l16-clip__title mono">Engineering check</div>
      {items.map((t, i) => (
        <div key={t} className="l16-clip__row" style={{ animationDelay: `${0.25 + i * 0.32}s` }}>
          <span className="l16-clip__tick">✓</span>
          {t}
        </div>
      ))}
    </div>
  )
}
