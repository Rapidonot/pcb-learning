/* Silkscreen artwork shared by the scene and the article figures. */
import { useId } from 'react'
import { BoardView, PadGlyph, PartBodyTop, partTransform } from '@/pcb/render'
import { allPads, type BoardDoc, type WorldPad } from '@/pcb/board'
import { getFootprint } from '@/pcb/footprints'
import { MASKS, type MaskColor } from '@/pcb/palette'
import type { Vec } from '@/pcb/geom'
import { CAP, LED_BAR, MIN_LINE, PIN1_DOT, type Label } from './silk'

/** A silkscreen text drawn with a weight that follows its line width. */
export function SilkText({ l, color, minLine = 0 }: { l: Label; color: string; minLine?: number }) {
  const line = Math.max(minLine, l.line)
  const ratio = line / l.size
  const weight = ratio < 0.12 ? 400 : ratio < 0.17 ? 500 : 600
  const extra = Math.max(0, line - 0.17 * l.size)
  return (
    <text
      x={l.x}
      y={l.y + l.size / 2}
      fontSize={l.size / CAP}
      textAnchor="middle"
      fontFamily="IBM Plex Mono, monospace"
      fontWeight={weight}
      fill={color}
      stroke={extra > 0 ? color : undefined}
      strokeWidth={extra || undefined}
      strokeLinejoin="round"
      transform={l.rot ? `rotate(${-l.rot} ${l.x} ${l.y})` : undefined}
      style={{ userSelect: 'none' }}
    >
      {l.text}
    </text>
  )
}

/** Part outlines from the footprints, minus the built-in polarity marks (the learner adds those). */
export function Outlines({ doc, color }: { doc: BoardDoc; color: string }) {
  return (
    <g stroke={color} strokeWidth={0.15} strokeLinecap="round" fill="none">
      {doc.parts.map((p) => {
        const fp = getFootprint(p.fp)
        const segs = fp.body.kind === 'led-chip' ? fp.silk.slice(0, 2) : fp.silk
        return (
          <g key={p.ref} transform={partTransform(p)}>
            {segs.map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </g>
        )
      })}
    </g>
  )
}

export function Marks({ led, pin1, color, bad, pads }: { led: 'cathode' | 'anode' | null; pin1: string | null; color: string; bad?: string; pads: WorldPad[] }) {
  const u1 = pads.filter((p) => p.ref === 'U1')
  const pin = pin1 ? u1.find((p) => p.num === pin1) : null
  const pinPos: Vec | null = pin ? (pin1 === '1' ? PIN1_DOT : [pin.x + (pin.x < 18 ? -1.25 : 1.25), pin.y]) : null
  return (
    <g>
      {led && <line {...LED_BAR[led]} stroke={led === 'cathode' ? color : bad ?? color} strokeWidth={0.3} strokeLinecap="round" />}
      {pinPos && <circle cx={pinPos[0]} cy={pinPos[1]} r={0.25} fill={pin1 === '1' ? color : bad ?? color} />}
    </g>
  )
}


/** A static photo-real render of the board with a given silkscreen (for figures). */
export function RealSilkBoard({ doc, labels, led, pin1, mask = 'green', bodies = true }: { doc: BoardDoc; labels: Label[]; led: 'cathode' | 'anode' | null; pin1: string | null; mask?: MaskColor; bodies?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const pads = allPads(doc)
  const m = MASKS[mask]
  return (
    <svg viewBox={`-0.6 -0.6 ${doc.w + 1.2} ${doc.h + 1.2}`} width="100%" style={{ display: 'block' }}>
      <BoardView doc={{ ...doc, texts: [] }} mode="real" maskColor={mask} vis={{ silk: false, refs: false, bodies: false }} />
      <defs>
        <mask id={`np-${uid}`} maskUnits="userSpaceOnUse" x={-5} y={-5} width={doc.w + 10} height={doc.h + 10}>
          <rect x={-5} y={-5} width={doc.w + 10} height={doc.h + 10} fill="#fff" />
          {pads.map((p) => (
            <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              <PadGlyph pad={p} fill="#000" hole={null} inflate={0.08} />
            </g>
          ))}
        </mask>
      </defs>
      <g mask={`url(#np-${uid})`}>
        <Outlines doc={doc} color={m.silk} />
        <Marks led={led} pin1={pin1} color={m.silk} pads={pads} />
        {labels.map((l) => (
          <SilkText key={l.id} l={l} color={m.silk} minLine={MIN_LINE} />
        ))}
      </g>
      {bodies &&
        doc.parts.map((p) => (
          <g key={p.ref} transform={partTransform(p)} style={{ filter: 'drop-shadow(0.15px 0.25px 0.2px rgba(0,0,0,0.45))' }}>
            <PartBodyTop fp={getFootprint(p.fp)} value={p.value} />
          </g>
        ))}
    </svg>
  )
}
