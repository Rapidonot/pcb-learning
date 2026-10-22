import { useEffect, useRef, useState } from 'react'
import { useMission } from '../mission'
import { Button, Chip, FloatingCard, Segmented, Slider, Toggle } from '@/components/ui'
import { IconFlip, IconReset } from '@/components/icons'
import { CircuitArt, VB } from './CircuitArt'
import { useSize, usePrefersReducedMotion } from './iso'
import {
  BAND_COLORS,
  BURN_AT,
  LEDS,
  RATING_W,
  R_VALUES,
  STATUS_TEXT,
  bandsOf,
  current,
  fmtOhms,
  fmtmA,
  statusOf,
  type LedColor,
} from './model'

const R_START = R_VALUES.indexOf(1000)

export function Scene() {
  const mission = useMission()
  const [stageRef, stage] = useSize<HTMLDivElement>()
  const [artRef, art] = useSize<HTMLDivElement>()
  const [dockRef, dock] = useSize<HTMLDivElement>()
  const reduced = usePrefersReducedMotion()

  const [V, setV] = useState(5)
  const [rIdx, setRIdx] = useState(R_START)
  const [led, setLed] = useState<LedColor>('red')
  const [water, setWater] = useState(false)
  const [reversed, setReversed] = useState(false)
  const [burnt, setBurnt] = useState<null | number>(null)
  const [popKey, setPopKey] = useState(0)
  const [fixNote, setFixNote] = useState<number | null>(null)

  const R = R_VALUES[rIdx]
  const Iraw = current(V, R, led)
  const I = burnt !== null || reversed ? 0 : Iraw
  const status = statusOf(I, burnt !== null, reversed)

  // burn out
  useEffect(() => {
    if (burnt === null && !reversed && Iraw > BURN_AT) {
      setBurnt(Iraw)
      setPopKey((k) => k + 1)
      mission.complete('burn')
    }
  }, [Iraw, burnt, reversed, mission])

  // missions
  useEffect(() => {
    if (status === 'safe' && I >= 0.005) mission.complete('safe')
    if (status !== 'burnt' && !reversed && led === 'red' && Math.abs(V - 5) < 0.01 && Math.abs(I - 0.009) < 0.0005) mission.complete('blinky')
  }, [status, I, V, led, reversed, mission])

  const prevR = useRef(R)
  useEffect(() => {
    if (water && R > prevR.current) mission.complete('water')
    prevR.current = R
  }, [water, R, mission])

  const replace = () => {
    let idx = rIdx
    if (current(V, R_VALUES[idx], led) > 0.02) {
      idx = R_VALUES.findIndex((r) => current(V, r, led) <= 0.015)
      setRIdx(idx)
      setFixNote(R_VALUES[idx])
    } else setFixNote(null)
    setBurnt(null)
  }

  const compact = stage.w > 0 && stage.w < 640
  const k = art.w > 0 ? Math.min(art.w / VB.w, art.h / VB.h) : 2.5
  const s = STATUS_TEXT[status]
  const L = LEDS[led]
  const PR = I * I * R

  const controls = (
    <>
      <Slider label="Supply voltage" value={V} min={3} max={12} step={0.5} onChange={setV} format={(v) => `${v.toFixed(1)} V`} />
      <div className="l02-rfield">
        <Slider label="Resistor R1" value={rIdx} min={0} max={R_VALUES.length - 1} step={1} onChange={(v) => setRIdx(Math.round(v))} format={(i) => fmtOhms(R_VALUES[i])} />
        <div className="l02-rnudge">
          <button className="l02-nudge" aria-label="Smaller resistor" onClick={() => setRIdx((i) => Math.max(0, i - 1))}>
            −
          </button>
          <Bands r={R} />
          <button className="l02-nudge" aria-label="Bigger resistor" onClick={() => setRIdx((i) => Math.min(R_VALUES.length - 1, i + 1))}>
            +
          </button>
        </div>
      </div>
      <Segmented
        label={compact ? undefined : 'LED colour'}
        value={led}
        onChange={setLed}
        options={(Object.keys(LEDS) as LedColor[]).map((c) => ({
          value: c,
          label: (
            <span className="l02-ledopt">
              <i style={{ background: LEDS[c].color }} />
              {LEDS[c].name}
              {!compact && <small>{LEDS[c].vf.toFixed(1)} V</small>}
            </span>
          ),
        }))}
      />
      <div className="l02-toggles">
        <Toggle label="Water analogy" checked={water} onChange={setWater} />
        <Button size="sm" variant="ghost" active={reversed} onClick={() => setReversed((r) => !r)} aria-pressed={reversed}>
          <IconFlip size={14} /> Flip LED
        </Button>
      </div>
    </>
  )

  const formula = (
    <div className="l02-formula" aria-live="polite">
      <span className="l02-f__lhs">I</span>
      <span className="l02-f__op">=</span>
      <span className="l02-f__frac">
        (<b style={{ color: 'var(--accent-ink)' }}>{V.toFixed(1)} V</b> − <b style={{ color: shadeCss(L.color) }}>{L.vf.toFixed(1)} V</b>) ÷ <b style={{ color: 'var(--copper)' }}>{fmtOhms(R)}</b>
      </span>
      <span className="l02-f__op">=</span>
      <b className={`l02-f__res l02-tone-${s.tone ?? 'none'}`}>
        {fmtmA(I)} mA
      </b>
      {I === 0 && <span className="l02-f__note">{status === 'off' ? '(V below Vf)' : status === 'reverse' ? '(LED backwards)' : status === 'burnt' ? '(open circuit)' : ''}</span>}
    </div>
  )

  return (
    <div ref={stageRef} className={`l02-scene ${compact ? 'is-compact' : ''}`}>
      <div ref={artRef} className="l02-art" style={compact ? { left: 4, right: 4, top: 50, bottom: (dock.h || 230) + 14 } : undefined}>
        <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} width="100%" height="100%" role="img" aria-label={`Circuit: ${V.toFixed(1)} volt supply, ${fmtOhms(R)} resistor and a ${L.name.toLowerCase()} LED. Current ${fmtmA(I)} milliamps.`}>
          <CircuitArt V={V} R={R} led={led} I={I} status={status} water={water} reversed={reversed} popKey={popKey} k={k} compact={compact} reducedMotion={reduced} />
        </svg>
      </div>

      {!compact && (
        <FloatingCard title="Bench controls" subtitle="Change the push (volts) and the squeeze (ohms). Watch the current.">
          {controls}
        </FloatingCard>
      )}

      {!compact ? (
        <Ammeter I={I} status={status} PR={PR} />
      ) : (
        <div className="l02-mini">
          <span className="l02-mini__i">
            {fmtmA(I)}
            <small>mA</small>
          </span>
          <Chip tone={s.tone} dot>
            {s.chip}
          </Chip>
          <span className="grow" />
          <span className="l02-mini__p mono">R1 {(PR * 1000).toFixed(PR * 1000 >= 100 ? 0 : 1)} mW</span>
        </div>
      )}

      {compact ? (
        <div ref={dockRef} className="l02-dock" onPointerDown={(e) => e.stopPropagation()}>
          {formula}
          {controls}
        </div>
      ) : (
        <div className="l02-formula-wrap">{formula}</div>
      )}

      {burnt !== null && (
        <div className={`l02-burnt ${compact ? 'is-compact' : ''}`} role="alert">
          <div className="l02-burnt__title">
            <span className="l02-burnt__dot" /> D1 burnt out at {fmtmA(burnt)} mA
          </div>
          <p>
            That's {(burnt / 0.02).toFixed(1)}× the 20 mA an LED like this is rated for.
            {compact ? ' It overheated and broke, so no current flows.' : ' The tiny chip inside overheated and broke, so the circuit is now open and no current flows. This is exactly what R1 is there to prevent.'}
          </p>
          <Button size="sm" variant="primary" onClick={replace}>
            <IconReset size={14} /> Fit a new LED
          </Button>
        </div>
      )}
      {burnt === null && fixNote !== null && (
        <div className={`l02-toast ${compact ? 'is-compact' : ''}`} onAnimationEnd={() => setFixNote(null)}>
          New LED fitted. R1 was bumped up to {fmtOhms(fixNote)} so it survives.
        </div>
      )}
    </div>
  )
}

function shadeCss(c: string) {
  return `color-mix(in srgb, ${c} 75%, var(--ink))`
}

function Bands({ r }: { r: number }) {
  const [a, b, m] = bandsOf(r)
  return (
    <span className="l02-bands" aria-label={`Colour bands for ${fmtOhms(r)}`}>
      <svg viewBox="0 0 64 16" width={64} height={16} aria-hidden>
        <line x1={2} y1={8} x2={62} y2={8} stroke="var(--ink-4)" strokeWidth={1.4} />
        <rect x={12} y={2} width={40} height={12} rx={6} fill="#dcc493" />
        {[a, b, m].map((c, i) => (
          <rect key={i} x={18 + i * 6} y={2} width={3.4} height={12} fill={BAND_COLORS[c]} />
        ))}
        <rect x={42} y={2} width={3.4} height={12} fill="#c9a43a" />
      </svg>
    </span>
  )
}

/** Analog ammeter card. */
function Ammeter({ I, status, PR }: { I: number; status: ReturnType<typeof statusOf>; PR: number }) {
  const s = STATUS_TEXT[status]
  const mA = I * 1000
  const ang = -90 + Math.min(1.04, mA / 50) * 180
  const arc = (a0: number, a1: number) => {
    const r = 46
    const p = (a: number) => {
      const t = ((a / 50) * 180 - 180) * (Math.PI / 180)
      return [60 + Math.cos(t) * r, 58 + Math.sin(t) * r]
    }
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`
  }
  return (
    <div className="float-card float-card--tr l02-meter" onPointerDown={(e) => e.stopPropagation()}>
      <div className="float-card__title">Ammeter</div>
      <div className="l02-meter__top">
  <svg viewBox="0 0 120 66" width={118} aria-hidden>
        <path d={arc(0, 5)} stroke="var(--line-2)" strokeWidth={7} fill="none" />
        <path d={arc(5, 20)} stroke="var(--good)" strokeWidth={7} fill="none" opacity={0.85} />
        <path d={arc(20, 40)} stroke="var(--warn)" strokeWidth={7} fill="none" opacity={0.85} />
        <path d={arc(40, 50)} stroke="var(--bad)" strokeWidth={7} fill="none" opacity={0.85} />
        {[0, 10, 20, 30, 40, 50].map((v) => {
          const t = ((v / 50) * 180 - 180) * (Math.PI / 180)
          return (
            <g key={v}>
              <line x1={60 + Math.cos(t) * 38} y1={58 + Math.sin(t) * 38} x2={60 + Math.cos(t) * 41.5} y2={58 + Math.sin(t) * 41.5} stroke="var(--ink-3)" strokeWidth={1} />
              <text x={60 + Math.cos(t) * 31} y={58 + Math.sin(t) * 31 + 2.5} fontSize={7} textAnchor="middle" fill="var(--ink-3)" fontFamily="IBM Plex Mono, monospace">
                {v}
              </text>
            </g>
          )
        })}
        <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: '60px 58px', transition: 'transform .45s cubic-bezier(.3,1.4,.5,1)' }}>
          <line x1={60} y1={60} x2={60} y2={16} stroke="var(--ink)" strokeWidth={1.6} strokeLinecap="round" />
        </g>
        <circle cx={60} cy={58} r={3.6} fill="var(--ink)" />
        <circle cx={60} cy={58} r={1.3} fill="var(--accent)" />
      </svg>
        <div className="l02-meter__num">
          <span className={`l02-meter__big l02-tone-${s.tone ?? 'none'}`}>
            {fmtmA(I)}
            <small>mA</small>
          </span>
          <Chip tone={s.tone} dot>
            {s.chip}
          </Chip>
        </div>
      </div>
      <div className="l02-meter__text">{s.text}</div>
      <div className="l02-meter__pw">
        <span>R1 power · max ¼ W</span>
        <b style={{ color: PR > RATING_W ? 'var(--bad)' : undefined }}>{(PR * 1000).toFixed(PR * 1000 >= 100 ? 0 : 1)} mW</b>
      </div>
      <div className="l02-pwbar">
        <i style={{ width: `${Math.min(100, (PR / RATING_W) * 100)}%`, background: PR > RATING_W ? 'var(--bad)' : PR > RATING_W * 0.6 ? 'var(--warn)' : 'var(--copper)' }} />
      </div>
    </div>
  )
}
