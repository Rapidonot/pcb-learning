/* Handheld multimeter and bench power supply, drawn as SVG illustrations in their own design units. */
import { useRef, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react'
import type { MeterMode } from './model'

/* ------------------------------------------------------------------ */
/* Seven-segment display                                               */
/* ------------------------------------------------------------------ */

const SEGS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  O: 'abcdef',
  L: 'fed',
  E: 'afged',
  r: 'eg',
  n: 'ceg',
  ' ': '',
}

function segPolys(x: number, y: number, w: number, h: number, t: number) {
  const hh = h / 2
  const hor = (cx: number, cy: number) =>
    `${cx + t * 0.6},${cy} ${cx + t},${cy - t / 2} ${cx + w - t},${cy - t / 2} ${cx + w - t * 0.6},${cy} ${cx + w - t},${cy + t / 2} ${cx + t},${cy + t / 2}`
  const ver = (cx: number, cy: number) =>
    `${cx},${cy + t * 0.6} ${cx + t / 2},${cy + t} ${cx + t / 2},${cy + hh - t} ${cx},${cy + hh - t * 0.6} ${cx - t / 2},${cy + hh - t} ${cx - t / 2},${cy + t}`
  return {
    a: hor(x, y),
    b: ver(x + w, y),
    c: ver(x + w, y + hh),
    d: hor(x, y + h),
    e: ver(x, y + hh),
    f: ver(x, y),
    g: hor(x, y + hh),
  }
}

/** Right-aligned seven-segment text. `cells` = number of digit positions. */
export function Seg7({ text, x, y, h, cells, color, ghost, glow }: { text: string; x: number; y: number; h: number; cells: number; color: string; ghost: string; glow?: boolean }) {
  const w = h * 0.5
  const t = h * 0.13
  const pitch = w + h * 0.3
  // parse into digits with decimal points
  const chars: { c: string; dp: boolean }[] = []
  for (const ch of text) {
    if (ch === '.' && chars.length) chars[chars.length - 1].dp = true
    else chars.push({ c: ch, dp: false })
  }
  while (chars.length < cells) chars.unshift({ c: ' ', dp: false })
  const shown = chars.slice(-cells)
  return (
    <g transform={`translate(${x} ${y}) skewX(-7)`} style={glow ? { filter: `drop-shadow(0 0 ${h * 0.12}px ${color})` } : undefined}>
      {shown.map((d, i) => {
        const p = segPolys(i * pitch, 0, w, h, t)
        const on = SEGS[d.c] ?? ''
        return (
          <g key={i}>
            {(Object.keys(p) as (keyof typeof p)[]).map((k) => (
              <polygon key={k} points={p[k]} fill={on.includes(k) ? color : ghost} />
            ))}
            <circle cx={i * pitch + w + h * 0.16} cy={h} r={t * 0.55} fill={d.dp ? color : ghost} />
          </g>
        )
      })}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Multimeter (210 × 350)                                              */
/* ------------------------------------------------------------------ */

export const METER_W = 210
export const METER_H = 350
export const METER_JACKS = { com: [70, 318] as [number, number], v: [140, 318] as [number, number] }

const DIAL: { mode: MeterMode; label: string; ang: number }[] = [
  { mode: 'off', label: 'OFF', ang: -105 },
  { mode: 'v', label: 'V⎓', ang: -38 },
  { mode: 'ohm', label: 'Ω', ang: 38 },
  { mode: 'beep', label: '•)))', ang: 105 },
]

export function Meter({
  mode,
  onMode,
  text,
  unit,
  beep,
  tag,
}: {
  mode: MeterMode
  onMode: (m: MeterMode) => void
  text: string
  unit: string
  beep: boolean
  tag?: string
}) {
  const cx = 105
  const cy = 210
  const cur = DIAL.find((d) => d.mode === mode)!
  const on = mode !== 'off'
  return (
    <svg viewBox={`0 0 ${METER_W} ${METER_H}`} width="100%" height="100%" className="l17-meter" role="group" aria-label="Multimeter">
      <defs>
        <linearGradient id="l17m-holster" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd34d" />
          <stop offset="0.5" stopColor="#f2b705" />
          <stop offset="1" stopColor="#c98f00" />
        </linearGradient>
        <linearGradient id="l17m-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3d43" />
          <stop offset="1" stopColor="#1f2125" />
        </linearGradient>
        <linearGradient id="l17m-lcd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d3dccb" />
          <stop offset="1" stopColor="#b3bfa8" />
        </linearGradient>
        <radialGradient id="l17m-knob" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#5b5e66" />
          <stop offset="0.7" stopColor="#2a2c31" />
          <stop offset="1" stopColor="#141518" />
        </radialGradient>
        <filter id="l17m-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1a1208" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x={2} y={2} width={METER_W - 4} height={METER_H - 4} rx={28} fill="url(#l17m-holster)" filter="url(#l17m-sh)" />
      <rect x={6} y={6} width={METER_W - 12} height={METER_H - 12} rx={25} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} />
      <rect x={16} y={16} width={METER_W - 32} height={METER_H - 32} rx={18} fill="url(#l17m-face)" />
      <rect x={16} y={16} width={METER_W - 32} height={METER_H - 32} rx={18} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={1.5} />
      <text x={30} y={34} fontSize={8.5} fontWeight={700} fill="#f2b705" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.14em">
        LEARN·DMM
      </text>
      <text x={180} y={34} fontSize={7.5} textAnchor="end" fill="#8c9098" fontFamily="IBM Plex Mono, monospace">
        LP-17
      </text>
      {/* LCD */}
      <rect x={26} y={42} width={158} height={80} rx={7} fill="#15171a" />
      <rect x={30} y={46} width={150} height={72} rx={5} fill="url(#l17m-lcd)" />
      <rect x={30} y={46} width={150} height={10} rx={5} fill="#000" opacity={0.08} />
      {on && (
        <>
          <Seg7 text={text} x={44} y={64} h={36} cells={4} color="#1b2316" ghost="rgba(27,35,22,0.07)" />
          <text x={174} y={112} fontSize={11} fontWeight={700} textAnchor="end" fill="#1b2316" fontFamily="IBM Plex Mono, monospace">
            {unit}
          </text>
          <text x={36} y={58} fontSize={7} fontWeight={700} fill="#1b2316" fontFamily="IBM Plex Mono, monospace">
            {mode === 'v' ? 'DC' : mode === 'beep' ? '•)))' : 'AUTO'}
          </text>
          {beep && (
            <g className="l17-beepicon">
              <path d="M 150 52 l 4 0 l 5 -4 l 0 12 l -5 -4 l -4 0 z" fill="#1b2316" />
              <path d="M 162 50 q 4 4 0 8 M 165 47 q 7 7 0 14" fill="none" stroke="#1b2316" strokeWidth={1.4} />
            </g>
          )}
        </>
      )}
      {tag && on && (
        <text x={105} y={140} fontSize={8} textAnchor="middle" fill="#b9bdc4" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.06em">
          {tag}
        </text>
      )}
      {/* dial */}
      <circle cx={cx} cy={cy} r={60} fill="#17181b" />
      <circle cx={cx} cy={cy} r={60} fill="none" stroke="#4a4d54" strokeWidth={1} />
      {DIAL.map((d) => {
        const a = (d.ang * Math.PI) / 180
        const lx = cx + Math.sin(a) * 75
        const ly = cy - Math.cos(a) * 75 + 4
        const tx = cx + Math.sin(a) * 54
        const ty = cy - Math.cos(a) * 54
        const sel = d.mode === mode
        return (
          <g
            key={d.mode}
            className="l17-dialopt"
            role="radio"
            aria-checked={sel}
            aria-label={`Meter mode ${d.mode === 'v' ? 'DC volts' : d.mode === 'ohm' ? 'resistance' : d.mode === 'beep' ? 'continuity' : 'off'}`}
            tabIndex={0}
            onClick={() => onMode(d.mode)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onMode(d.mode)}
          >
            <circle cx={lx} cy={ly - 4} r={15} fill="transparent" />
            <line x1={tx} y1={ty} x2={cx + Math.sin(a) * 61} y2={cy - Math.cos(a) * 61} stroke={sel ? '#f2b705' : '#6d7179'} strokeWidth={2} />
            <text x={lx} y={ly} fontSize={d.mode === 'beep' ? 10 : 12} fontWeight={700} textAnchor="middle" fill={sel ? '#f2b705' : '#d6d8dc'} fontFamily="IBM Plex Mono, monospace">
              {d.label}
            </text>
          </g>
        )
      })}
      <g style={{ transform: `rotate(${cur.ang}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 0.35s cubic-bezier(.3,1.4,.5,1)' }} pointerEvents="none">
        <circle cx={cx} cy={cy} r={40} fill="url(#l17m-knob)" />
        <circle cx={cx} cy={cy} r={40} fill="none" stroke="#000" strokeOpacity={0.6} strokeWidth={1.2} />
        <rect x={cx - 9} y={cy - 40} width={18} height={80} rx={8} fill="#3a3c43" />
        <rect x={cx - 9} y={cy - 40} width={18} height={80} rx={8} fill="none" stroke="#fff" strokeOpacity={0.12} />
        <path d={`M ${cx} ${cy - 37} l -4.5 9 l 9 0 z`} fill="#f2b705" />
      </g>
      {/* jacks */}
      {(
        [
          ['com', 'COM', '#1b1b1d'],
          ['v', 'VΩ', '#c62d1f'],
        ] as const
      ).map(([k, l, c]) => {
        const [x, y] = METER_JACKS[k]
        return (
          <g key={k}>
            <text x={x} y={y - 17} fontSize={8} fontWeight={700} textAnchor="middle" fill="#c9ccd2" fontFamily="IBM Plex Mono, monospace">
              {l}
            </text>
            <circle cx={x} cy={y} r={11} fill={c} />
            <circle cx={x} cy={y} r={11} fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={1.2} />
            <circle cx={x} cy={y} r={4.5} fill="#0a0a0b" />
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Bench supply (270 × 190)                                            */
/* ------------------------------------------------------------------ */

export const SUPPLY_W = 270
export const SUPPLY_H = 190
export const SUPPLY_POSTS = { pos: [196, 160] as [number, number], neg: [238, 160] as [number, number] }

function Knob({
  cx,
  cy,
  value,
  min,
  max,
  step,
  perPx,
  onChange,
  label,
  aria,
}: {
  cx: number
  cy: number
  value: number
  min: number
  max: number
  step: number
  perPx: number
  onChange: (v: number) => void
  label: string
  aria: string
}) {
  const drag = useRef<{ y: number; v: number } | null>(null)
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const ang = -135 + ((value - min) / (max - min)) * 270
  const down = (e: RPointerEvent<SVGGElement>) => {
    ;(e.currentTarget as SVGGElement).setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, v: value }
  }
  const move = (e: RPointerEvent<SVGGElement>) => {
    if (!drag.current) return
    onChange(clamp(drag.current.v + (drag.current.y - e.clientY) * perPx))
  }
  const up = () => {
    drag.current = null
  }
  const key = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      onChange(clamp(value + step))
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      onChange(clamp(value - step))
    }
  }
  return (
    <g
      className="l17-knob"
      role="slider"
      tabIndex={0}
      aria-label={aria}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      onWheel={(e) => onChange(clamp(value + (e.deltaY < 0 ? step : -step)))}
    >
      {/* tick ring */}
      {Array.from({ length: 11 }, (_, i) => {
        const a = ((-135 + i * 27) * Math.PI) / 180
        return <line key={i} x1={cx + Math.sin(a) * 27} y1={cy - Math.cos(a) * 27} x2={cx + Math.sin(a) * 31} y2={cy - Math.cos(a) * 31} stroke="#7b7f87" strokeWidth={1.2} />
      })}
      <circle cx={cx} cy={cy + 2} r={23} fill="#000" opacity={0.45} />
      <circle cx={cx} cy={cy} r={23} fill="url(#l17s-knob)" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        return <line key={i} x1={cx + Math.cos(a) * 20} y1={cy + Math.sin(a) * 20} x2={cx + Math.cos(a) * 23} y2={cy + Math.sin(a) * 23} stroke="#000" strokeOpacity={0.35} strokeWidth={1.4} />
      })}
      <circle cx={cx} cy={cy} r={15} fill="url(#l17s-cap)" />
      <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        <rect x={cx - 1.4} y={cy - 19} width={2.8} height={9} rx={1.4} fill="#f6f2e8" />
      </g>
      <text x={cx} y={cy + 42} fontSize={7.5} fontWeight={700} textAnchor="middle" fill="#c9ccd2" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.12em">
        {label}
      </text>
    </g>
  )
}

export function Supply({
  on,
  vset,
  ilim,
  vout,
  iout,
  cc,
  onV,
  onI,
  onToggle,
  locked,
}: {
  on: boolean
  vset: number
  ilim: number
  vout: number
  iout: number
  cc: boolean
  onV: (v: number) => void
  onI: (v: number) => void
  onToggle: () => void
  locked: boolean
}) {
  // like a real supply: with the output off, the displays show the set values
  const vText = (on ? vout : vset).toFixed(2)
  const iText = (on ? iout : ilim).toFixed(3)
  return (
    <svg viewBox={`0 0 ${SUPPLY_W} ${SUPPLY_H}`} width="100%" height="100%" className="l17-supply" role="group" aria-label="Bench power supply">
      <defs>
        <linearGradient id="l17s-case" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1efe9" />
          <stop offset="1" stopColor="#c9c6be" />
        </linearGradient>
        <linearGradient id="l17s-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#33363c" />
          <stop offset="1" stopColor="#1d1f23" />
        </linearGradient>
        <radialGradient id="l17s-knob" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#5c6068" />
          <stop offset="1" stopColor="#17181b" />
        </radialGradient>
        <radialGradient id="l17s-cap" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#d9dce0" />
          <stop offset="0.6" stopColor="#9da2a9" />
          <stop offset="1" stopColor="#6c7178" />
        </radialGradient>
        <radialGradient id="l17s-post-r" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ff8576" />
          <stop offset="1" stopColor="#9b1a10" />
        </radialGradient>
        <radialGradient id="l17s-post-k" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#6d6e74" />
          <stop offset="1" stopColor="#0f0f11" />
        </radialGradient>
        <filter id="l17s-sh" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#1a1208" floodOpacity="0.32" />
        </filter>
      </defs>
      <rect x={3} y={3} width={SUPPLY_W - 6} height={SUPPLY_H - 8} rx={14} fill="url(#l17s-case)" filter="url(#l17s-sh)" />
      <rect x={3} y={3} width={SUPPLY_W - 6} height={6} rx={3} fill="#fff" opacity={0.6} />
      <rect x={12} y={14} width={SUPPLY_W - 24} height={SUPPLY_H - 30} rx={9} fill="url(#l17s-panel)" />
      <text x={22} y={28} fontSize={7.5} fontWeight={700} fill="#9da2aa" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.14em">
        DC POWER SUPPLY · 0–15 V
      </text>
      {/* displays */}
      {[
        { x: 22, text: vText, unit: 'V', color: '#ff5a3c', ghost: 'rgba(255,90,60,0.08)' },
        { x: 142, text: iText, unit: 'A', color: '#46f08a', ghost: 'rgba(70,240,138,0.07)' },
      ].map((d) => (
        <g key={d.unit}>
          <rect x={d.x} y={36} width={106} height={46} rx={5} fill="#0b0b0c" />
          <rect x={d.x} y={36} width={106} height={46} rx={5} fill="none" stroke="#000" strokeWidth={1.5} />
          <Seg7 text={d.text} x={d.x + 10} y={44} h={28} cells={4} color={d.color} ghost={d.ghost} glow />
          <text x={d.x + 99} y={76} fontSize={9} fontWeight={700} textAnchor="end" fill={d.color} fontFamily="IBM Plex Mono, monospace">
            {d.unit}
          </text>
        </g>
      ))}
      {/* CV / CC */}
      {[
        { x: 32, label: 'CV', lit: on && !cc, color: '#46f08a' },
        { x: 70, label: 'CC', lit: on && cc, color: '#ff5a3c' },
      ].map((l) => (
        <g key={l.label}>
          <circle cx={l.x} cy={96} r={3.6} fill={l.lit ? l.color : '#3b3d42'} style={l.lit ? { filter: `drop-shadow(0 0 3px ${l.color})` } : undefined} />
          <text x={l.x + 7} y={99} fontSize={7.5} fontWeight={700} fill="#9da2aa" fontFamily="IBM Plex Mono, monospace">
            {l.label}
          </text>
        </g>
      ))}
      <Knob cx={52} cy={130} value={vset} min={0} max={15} step={0.1} perPx={0.04} onChange={onV} label="VOLTAGE" aria="Voltage" />
      <Knob cx={122} cy={130} value={ilim} min={0.02} max={1} step={0.01} perPx={0.004} onChange={onI} label="CURRENT" aria="Current limit" />
      {/* output button */}
      <g
        className={`l17-outbtn ${locked ? 'is-locked' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label="Output"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      >
        <circle cx={204} cy={96} r={3.6} fill={on ? '#46f08a' : '#3b3d42'} style={on ? { filter: 'drop-shadow(0 0 3px #46f08a)' } : undefined} />
        <rect x={182} y={104} width={64} height={26} rx={6} fill={on ? '#3a3d44' : '#4a4e56'} stroke="#000" strokeOpacity={0.6} />
        <rect x={184} y={106} width={60} height={9} rx={4} fill="#fff" opacity={0.12} />
        <text x={214} y={121} fontSize={8.5} fontWeight={700} textAnchor="middle" fill="#e9eaee" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.1em">
          OUTPUT
        </text>
      </g>
      {/* binding posts */}
      {(
        [
          ['pos', '+', 'url(#l17s-post-r)'],
          ['neg', '−', 'url(#l17s-post-k)'],
        ] as const
      ).map(([k, l, f]) => {
        const [x, y] = SUPPLY_POSTS[k]
        return (
          <g key={k}>
            <circle cx={x} cy={y} r={10} fill={f} />
            <circle cx={x} cy={y} r={10} fill="none" stroke="#000" strokeOpacity={0.5} />
            <circle cx={x - 3} cy={y - 3} r={2.5} fill="#fff" opacity={0.35} />
            <text x={x + 14} y={y + 4} fontSize={11} fontWeight={700} fill="#c9ccd2" fontFamily="IBM Plex Mono, monospace">
              {l}
            </text>
          </g>
        )
      })}
      {/* feet */}
      <rect x={24} y={SUPPLY_H - 7} width={30} height={5} rx={2} fill="#2a2a2c" />
      <rect x={SUPPLY_W - 54} y={SUPPLY_H - 7} width={30} height={5} rx={2} fill="#2a2a2c" />
    </svg>
  )
}
