import type { PointerEvent as RPointerEvent, ReactNode } from 'react'
import { rotate, type Vec } from './geom'
import { symbols, schNets, symPins, type SchDoc, type SymInst, type WorldPin } from './schematic'

export const SCH = {
  symbol: '#8a1c1c',
  pin: '#6a6a6a',
  wire: '#1f7a3f',
  label: '#1b4fbf',
  text: '#333',
  ref: '#1b4fbf',
  value: '#555',
  flag: '#8a1c1c',
  hl: '#e0542c',
}

export function SymbolGraphic({
  inst,
  showPinNames = true,
  showPinNumbers = true,
  highlightPins = [],
  dim = false,
  color = SCH.symbol,
}: {
  inst: SymInst
  showPinNames?: boolean
  showPinNumbers?: boolean
  highlightPins?: string[]
  dim?: boolean
  color?: string
}) {
  const def = symbols[inst.sym]
  const isIC = inst.sym === 'NE555'
  const lab = def.label
  const refPos = rotLabel(lab.ref, inst.rot)
  const valPos = rotLabel(lab.value, inst.rot)
  return (
    <g opacity={dim ? 0.35 : 1}>
      <g transform={`translate(${inst.x} ${inst.y}) rotate(${inst.rot})`}>
        {def.pins.map((p) => {
          const hl = highlightPins.includes(p.num)
          return (
            <g key={p.num}>
              <line x1={p.bx} y1={p.by} x2={p.x} y2={p.y} stroke={hl ? SCH.hl : SCH.pin} strokeWidth={hl ? 2 : 1.2} />
              {showPinNumbers && (
                <PinText x={(p.bx + p.x) / 2} y={(p.by + p.y) / 2} rot={inst.rot} dx={p.x === p.bx ? 4 : 0} dy={p.y === p.by ? -2.5 : 0} size={6} color={SCH.pin}>
                  {p.num}
                </PinText>
              )}
              {isIC && showPinNames && <PinName p={p} rot={inst.rot} />}
            </g>
          )
        })}
        {def.body(color)}
      </g>
      <text
        x={inst.x + refPos[0]}
        y={inst.y + refPos[1]}
        fontSize={8}
        fontWeight={600}
        fill={SCH.ref}
        textAnchor={inst.rot === 90 ? 'start' : (lab.anchor ?? 'middle')}
        dominantBaseline="central"
        fontFamily="IBM Plex Mono, monospace"
      >
        {inst.ref}
      </text>
      <text
        x={inst.x + valPos[0]}
        y={inst.y + valPos[1]}
        fontSize={7}
        fill={SCH.value}
        textAnchor={inst.rot === 90 ? 'start' : (lab.anchor ?? 'middle')}
        dominantBaseline="central"
        fontFamily="IBM Plex Mono, monospace"
      >
        {inst.value}
      </text>
    </g>
  )
}

function rotLabel(p: Vec, rot: number): Vec {
  // keep labels readable: for vertical parts, put them to the right of the body
  if (rot === 90 || rot === 270) return [14, p[1] < 0 ? -5 : 5]
  return p
}

function PinText({ x, y, rot, dx, dy, size, color, children }: { x: number; y: number; rot: number; dx: number; dy: number; size: number; color: string; children: ReactNode }) {
  return (
    <text
      x={x + dx}
      y={y + dy}
      fontSize={size}
      fill={color}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="IBM Plex Mono, monospace"
      transform={rot ? `rotate(${-rot} ${x + dx} ${y + dy})` : undefined}
    >
      {children}
    </text>
  )
}

function PinName({ p, rot }: { p: { bx: number; by: number; x: number; y: number; name: string }; rot: number }) {
  // inside the body, next to where the pin meets it
  const dir: Vec = [Math.sign(p.x - p.bx), Math.sign(p.y - p.by)]
  const ix = p.bx - dir[0] * 4
  const iy = p.by - dir[1] * 6
  const anchor = dir[0] > 0 ? 'end' : dir[0] < 0 ? 'start' : 'middle'
  return (
    <text
      x={ix}
      y={iy}
      fontSize={6.5}
      fill={SCH.text}
      textAnchor={anchor}
      dominantBaseline="central"
      fontFamily="IBM Plex Mono, monospace"
      transform={rot ? `rotate(${-rot} ${ix} ${iy})` : undefined}
    >
      {p.name}
    </text>
  )
}

export function FlagGraphic({ kind, name, x, y, highlight }: { kind: 'vcc' | 'gnd'; name: string; x: number; y: number; highlight?: boolean }) {
  const c = highlight ? SCH.hl : SCH.flag
  if (kind === 'gnd')
    return (
      <g transform={`translate(${x} ${y})`} stroke={c} strokeWidth={1.4} fill="none">
        <line x1={0} y1={0} x2={0} y2={6} />
        <line x1={-8} y1={6} x2={8} y2={6} />
        <line x1={-5} y1={9.5} x2={5} y2={9.5} />
        <line x1={-2} y1={13} x2={2} y2={13} />
      </g>
    )
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1={0} y1={0} x2={0} y2={-6} stroke={c} strokeWidth={1.4} />
      <line x1={-8} y1={-6} x2={8} y2={-6} stroke={c} strokeWidth={1.8} />
      <text x={0} y={-11} fontSize={7.5} fontWeight={600} fill={c} textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
        {name}
      </text>
    </g>
  )
}

export function NetLabelGraphic({ name, x, y, side = 'right', highlight }: { name: string; x: number; y: number; side?: 'left' | 'right' | 'up'; highlight?: boolean }) {
  const c = highlight ? SCH.hl : SCH.label
  const tx = side === 'left' ? x - 3 : side === 'right' ? x + 3 : x
  const ty = side === 'up' ? y - 4 : y - 3
  return (
    <g>
      <text
        x={tx}
        y={ty}
        fontSize={7.5}
        fontWeight={600}
        fill={c}
        textAnchor={side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle'}
        fontFamily="IBM Plex Mono, monospace"
      >
        {name}
      </text>
    </g>
  )
}

export interface SchematicViewProps {
  doc: SchDoc
  highlightNet?: string | null
  /** pins of these refs are drawn highlighted */
  highlightRefs?: string[]
  dimOthers?: boolean
  showPinNumbers?: boolean
  showPinNames?: boolean
  showJunctions?: boolean
  onSymbolPointerDown?: (ref: string, e: RPointerEvent<SVGGElement>) => void
  onPinPointerDown?: (pin: WorldPin, e: RPointerEvent<SVGGElement>) => void
  onPinEnter?: (pin: WorldPin | null) => void
  pinHitRadius?: number
  /** pins that should show a pulsing "connect me" hint */
  hintPins?: string[]
  children?: ReactNode
}

export function SchematicView({
  doc,
  highlightNet,
  highlightRefs = [],
  dimOthers,
  showPinNumbers = true,
  showPinNames = true,
  showJunctions = true,
  onSymbolPointerDown,
  onPinPointerDown,
  onPinEnter,
  pinHitRadius = 5,
  hintPins = [],
  children,
}: SchematicViewProps) {
  const nets = schNets(doc)
  const pinNet = nets.netName
  // which wires belong to highlighted net: approximate by checking wire touching a pin of that net
  return (
    <g>
      {doc.wires.map((w) => (
        <polyline
          key={w.id}
          points={w.pts.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke={SCH.wire}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {showJunctions && nets.junctions.map((j, i) => <circle key={i} cx={j[0]} cy={j[1]} r={2.6} fill={SCH.wire} />)}
      {doc.symbols.map((s) => {
        const highlighted = highlightRefs.includes(s.ref)
        const hlPins =
          highlightNet != null
            ? symPins(s)
                .filter((p) => pinNet.get(p.key) === highlightNet)
                .map((p) => p.num)
            : []
        return (
          <g
            key={s.ref}
            onPointerDown={onSymbolPointerDown ? (e) => onSymbolPointerDown(s.ref, e) : undefined}
            style={{ cursor: onSymbolPointerDown ? 'grab' : undefined }}
          >
            <SymbolGraphic
              inst={s}
              showPinNumbers={showPinNumbers}
              showPinNames={showPinNames}
              highlightPins={hlPins}
              dim={dimOthers && highlightRefs.length > 0 && !highlighted}
              color={highlighted ? SCH.hl : SCH.symbol}
            />
          </g>
        )
      })}
      {doc.flags.map((f) => (
        <FlagGraphic key={f.id} {...f} highlight={highlightNet === f.name} />
      ))}
      {doc.labels.map((l) => (
        <NetLabelGraphic key={l.id} {...l} highlight={highlightNet === l.name} />
      ))}
      {hintPins.length > 0 &&
        doc.symbols.flatMap(symPins).filter((p) => hintPins.includes(p.key)).map((p) => (
          <circle key={p.key} cx={p.x} cy={p.y} r={4} fill="none" stroke={SCH.hl} strokeWidth={1.2} className="pin-hint" />
        ))}
      {(onPinPointerDown || onPinEnter) &&
        doc.symbols.flatMap(symPins).map((p) => (
          <g
            key={p.key}
            onPointerDown={onPinPointerDown ? (e) => onPinPointerDown(p, e) : undefined}
            onPointerEnter={onPinEnter ? () => onPinEnter(p) : undefined}
            onPointerLeave={onPinEnter ? () => onPinEnter(null) : undefined}
            style={{ cursor: 'crosshair' }}
          >
            <circle cx={p.x} cy={p.y} r={pinHitRadius} fill="transparent" />
          </g>
        ))}
      {children}
    </g>
  )
}

/** Small helper for scenes: rotate a local symbol point into world space. */
export const symPoint = (s: SymInst, p: Vec): Vec => {
  const r = rotate(p, s.rot)
  return [s.x + r[0], s.y + r[1]]
}
