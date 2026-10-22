/* Schematic symbols in EasyEDA's colours (viewBox 0 0 100 60). */
import type { ReactNode } from 'react'
import { SCH } from '@/pcb/SchematicView'
import type { SymId } from './data'

const S = SCH.symbol
const PIN = SCH.pin

function Pins({ d }: { d: string }) {
  return <path d={d} stroke={PIN} strokeWidth={1.6} fill="none" strokeLinecap="round" />
}

const BODIES: Record<SymId, ReactNode> = {
  R: (
    <g>
      <Pins d="M 8 30 H 30 M 70 30 H 92" />
      <rect x={30} y={22} width={40} height={16} fill="none" stroke={S} strokeWidth={2.2} />
    </g>
  ),
  C: (
    <g>
      <Pins d="M 8 30 H 45 M 55 30 H 92" />
      <path d="M 45 14 V 46 M 55 14 V 46" stroke={S} strokeWidth={2.6} />
    </g>
  ),
  Cpol: (
    <g>
      <Pins d="M 8 30 H 45 M 53 30 H 92" />
      <path d="M 45 14 V 46" stroke={S} strokeWidth={2.6} />
      <path d="M 58 14 Q 51 30 58 46" stroke={S} strokeWidth={2.6} fill="none" />
      <path d="M 34 14 h 7 M 37.5 10.5 v 7" stroke={S} strokeWidth={1.6} />
    </g>
  ),
  LED: (
    <g>
      <Pins d="M 8 32 H 40 M 60 32 H 92" />
      <path d="M 40 20 L 59 32 L 40 44 Z" fill={S} fillOpacity={0.12} stroke={S} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 60 19 V 45" stroke={S} strokeWidth={2.6} />
      <path d="M 52 16 l 7 -9 M 55 7 h 4 v 4 M 60 19 l 7 -9 M 63 10 h 4 v 4" stroke={S} strokeWidth={1.5} fill="none" />
    </g>
  ),
  D: (
    <g>
      <Pins d="M 8 30 H 40 M 60 30 H 92" />
      <path d="M 40 18 L 59 30 L 40 42 Z" fill={S} fillOpacity={0.12} stroke={S} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 60 17 V 43" stroke={S} strokeWidth={2.6} />
    </g>
  ),
  IC: (
    <g>
      <Pins d="M 18 16 H 32 M 18 25 H 32 M 18 35 H 32 M 18 44 H 32 M 68 16 H 82 M 68 25 H 82 M 68 35 H 82 M 68 44 H 82" />
      <rect x={32} y={8} width={36} height={44} fill="#fffbe6" fillOpacity={0.6} stroke={S} strokeWidth={2.2} />
      <circle cx={37.5} cy={13.5} r={1.8} fill={S} />
      <text x={50} y={33} fontSize={9} fontFamily="IBM Plex Mono, monospace" fontWeight={600} fill={S} textAnchor="middle">
        555
      </text>
    </g>
  ),
  NPN: (
    <g>
      <circle cx={56} cy={30} r={19} fill="none" stroke={S} strokeWidth={2} />
      <Pins d="M 10 30 H 47 M 64 4 V 15 M 64 45 V 56" />
      <path d="M 47 18 V 42" stroke={S} strokeWidth={3} />
      <path d="M 47 25 L 64 15 M 47 35 L 64 45" stroke={S} strokeWidth={2} />
      <path d="M 64 45 l -7.5 -1 l 3.6 -5.8 Z" fill={S} />
    </g>
  ),
  HDR: (
    <g>
      <rect x={34} y={10} width={20} height={40} fill="none" stroke={S} strokeWidth={2.2} />
      <Pins d="M 54 21 H 86 M 54 39 H 86" />
      <rect x={43} y={18.5} width={6} height={5} fill={S} />
      <rect x={43} y={36.5} width={6} height={5} fill={S} />
    </g>
  ),
  SW: (
    <g>
      <Pins d="M 8 40 H 30 M 70 40 H 92" />
      <circle cx={32} cy={40} r={2.6} fill="none" stroke={S} strokeWidth={2} />
      <circle cx={68} cy={40} r={2.6} fill="none" stroke={S} strokeWidth={2} />
      <path d="M 28 29 H 72 M 50 29 V 14 M 44 14 H 56" stroke={S} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  ),
}

export function SymbolArt({ id, width = '100%', label }: { id: SymId; width?: number | string; label?: string }) {
  return (
    <svg viewBox="0 0 100 60" width={width} style={{ display: 'block' }} role="img" aria-label={label ?? `Schematic symbol`}>
      {BODIES[id]}
    </svg>
  )
}
