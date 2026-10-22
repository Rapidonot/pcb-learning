/* Step 3: compare the chosen part's footprint with the datasheet's recommended land pattern. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { FootprintGraphic } from '@/pcb/render'
import { EDA } from '@/pcb/palette'
import { IconCheck, IconX } from '@/components/icons'
import { LandDrawing } from './Datasheet'
import { LAND, type Candidate } from './data'

const LAND_PADS = [-1.905, -0.635, 0.635, 1.905].flatMap((y, i) => [
  { num: String(i + 1), x: -LAND.rowC / 2, y },
  { num: String(8 - i), x: LAND.rowC / 2, y },
])

type CheckId = 'count' | 'pitch' | 'pin1' | 'overlay'
type State = 'todo' | 'pass' | 'fail'

export function FootprintCheck({ cand, onPass, onBack }: { cand: Candidate | null; onPass: () => void; onBack: () => void }) {
  const fp = cand?.fp
  const [countN, setCountN] = useState(0)
  const [counting, setCounting] = useState(false)
  const [picks, setPicks] = useState<string[]>([])
  const [mode, setMode] = useState<'pitch' | 'pin1' | null>(null)
  const [pin1, setPin1] = useState<string | null>(null)
  const [overlay, setOverlay] = useState(false)
  const timer = useRef<number | null>(null)

  // reset when the part changes
  useEffect(() => {
    setCountN(0)
    setCounting(false)
    setPicks([])
    setPin1(null)
    setOverlay(false)
    setMode(null)
  }, [cand?.id])
  useEffect(() => () => void (timer.current && window.clearInterval(timer.current)), [])

  const startCount = () => {
    if (!fp) return
    setCountN(0)
    setCounting(true)
    let n = 0
    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      n++
      setCountN(n)
      if (n >= fp.pads.length) {
        window.clearInterval(timer.current!)
        timer.current = null
        setCounting(false)
      }
    }, 170)
  }

  const padBy = (num: string) => fp?.pads.find((p) => p.num === num)
  const dist = useMemo(() => {
    if (picks.length < 2) return null
    const a = padBy(picks[0])
    const b = padBy(picks[1])
    if (!a || !b) return null
    return Math.hypot(a.x - b.x, a.y - b.y)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, fp])

  const matchesLand = useMemo(() => {
    if (!fp || fp.pads.length !== LAND.pins) return false
    return LAND_PADS.every((lp) => {
      const p = fp.pads.find((q) => q.num === lp.num)
      return p && Math.abs(p.x - lp.x) < 0.06 && Math.abs(p.y - lp.y) < 0.06 && Math.abs(p.w - LAND.padW) < 0.06 && Math.abs(p.h - LAND.padH) < 0.06
    })
  }, [fp])

  const state: Record<CheckId, State> = {
    count: !fp || countN < fp.pads.length || counting ? 'todo' : fp.pads.length === LAND.pins ? 'pass' : 'fail',
    pitch: dist === null ? 'todo' : Math.abs(dist - LAND.pitch) < 0.02 ? 'pass' : 'fail',
    pin1: pin1 === null ? 'todo' : pin1 === '1' ? 'pass' : 'fail',
    overlay: !overlay ? 'todo' : matchesLand ? 'pass' : 'fail',
  }
  const allPass = (Object.values(state) as State[]).every((s) => s === 'pass')
  useEffect(() => {
    if (allPass) onPass()
  }, [allPass, onPass])

  if (!cand || !fp) {
    return (
      <div className="l6b-fc l6b-fc--empty">
        <div className="l6b-fc__emptycard">
          <div className="l6b-fc__kicker mono">Footprint check</div>
          <p>Pick a part in step 2 first. Then come back and check that its footprint matches the datasheet.</p>
          <button className="l6b-place" onClick={onBack}>
            Go to “Find the part”
          </button>
        </div>
      </div>
    )
  }

  const onPad = (num: string) => {
    if (mode === 'pin1') {
      setPin1(num)
      return
    }
    // default: pitch measurement
    setMode('pitch')
    setPicks((p) => (p.length >= 2 ? [num] : p.includes(num) ? p : [...p, num]))
  }

  const box = `${-fp.courtyard.w - 1.4} ${-fp.courtyard.h - 1.2} ${(fp.courtyard.w + 1.4) * 2} ${(fp.courtyard.h + 1.2) * 2}`
  const a = picks[0] ? padBy(picks[0]) : null
  const b = picks[1] ? padBy(picks[1]) : null

  const rows: { id: CheckId; title: string; detail: string; action?: { label: string; on: () => void; active?: boolean } }[] = [
    {
      id: 'count',
      title: 'Pin count',
      detail:
        state.count === 'todo'
          ? `Datasheet: ${LAND.pins} pins. Count the pads.`
          : `${fp.pads.length} pads vs ${LAND.pins} pins in the datasheet.`,
      action: { label: counting ? 'Counting…' : 'Count pads', on: startCount },
    },
    {
      id: 'pitch',
      title: 'Pitch',
      detail:
        dist === null
          ? `Datasheet: ${LAND.pitch.toFixed(2)} mm. Click two neighbouring pads to measure.`
          : `Measured ${dist.toFixed(2)} mm vs ${LAND.pitch.toFixed(2)} mm.${state.pitch === 'fail' && fp.id === 'SOIC-8' ? ' Those two are not neighbours: try two pads side by side.' : ''}`,
      action: { label: 'Measure', on: () => (setMode('pitch'), setPicks([])), active: mode === 'pitch' },
    },
    {
      id: 'pin1',
      title: 'Pin 1 location',
      detail:
        pin1 === null
          ? 'Datasheet: top left, by the dot. Click the footprint’s pin 1.'
          : pin1 === '1'
            ? 'Pin 1 is top left, marked by the silkscreen dot. Matches.'
            : `That’s pin ${pin1}. Look for the dot (or the square pad).`,
      action: { label: 'Find pin 1', on: () => (setMode('pin1'), setPin1(null)), active: mode === 'pin1' },
    },
    {
      id: 'overlay',
      title: 'Land pattern',
      detail: !overlay
        ? 'Overlay the datasheet pads on the footprint.'
        : matchesLand
          ? 'Every pad lines up with the recommended land pattern.'
          : 'The pads do not line up with the datasheet land pattern.',
      action: { label: overlay ? 'Hide overlay' : 'Overlay', on: () => setOverlay((o) => !o), active: overlay },
    },
  ]

  return (
    <div className="l6b-fc">
      <div className="l6b-fc__panes">
        <div className="l6b-fc__pane l6b-fc__pane--sheet">
          <div className="l6b-fc__label mono">
            <span>Datasheet</span> Recommended land pattern · SOIC-8
          </div>
          <div className="l6b-fc__sheet">
            <LandDrawing compact />
          </div>
        </div>
        <div className="l6b-fc__pane l6b-fc__pane--eda">
          <div className="l6b-fc__label mono">
            <span>EasyEDA</span> {fp.name}
          </div>
          <svg viewBox={box} className={`l6b-fc__svg ${mode ? `is-${mode}` : ''}`} aria-label="Footprint, click pads to check">
            <defs>
              <pattern id="l6b-grid" width="1.27" height="1.27" patternUnits="userSpaceOnUse">
                <path d="M 1.27 0 L 0 0 0 1.27" fill="none" stroke={EDA.grid} strokeWidth={0.03} />
              </pattern>
            </defs>
            <rect x={-50} y={-50} width={100} height={100} fill="url(#l6b-grid)" />
            <FootprintGraphic fp={fp} mode="eda" showNumbers={false} />
            {/* count numbers */}
            {fp.pads.slice(0, countN).map((p) => (
              <g key={`n${p.num}`} className="l6b-fc__num">
                <text x={p.x} y={p.y} fontSize={Math.min(0.55, Math.min(p.w, p.h) * 0.7)} textAnchor="middle" dominantBaseline="central" fill="#fff" fontFamily="IBM Plex Mono, monospace" fontWeight={700}>
                  {p.num}
                </text>
              </g>
            ))}
            {/* pin 1 answer */}
            {pin1 &&
              (() => {
                const p = padBy(pin1)!
                const ok = pin1 === '1'
                return <rect x={p.x - p.w / 2 - 0.18} y={p.y - p.h / 2 - 0.18} width={p.w + 0.36} height={p.h + 0.36} rx={0.2} fill="none" stroke={ok ? '#4ade80' : '#ff6b5a'} strokeWidth={0.14} />
              })()}
            {/* pitch measurement */}
            {picks.map((n) => {
              const p = padBy(n)!
              return <rect key={`pk${n}`} x={p.x - p.w / 2 - 0.12} y={p.y - p.h / 2 - 0.12} width={p.w + 0.24} height={p.h + 0.24} rx={0.16} fill="none" stroke="#ffd166" strokeWidth={0.1} />
            })}
            {a && b && (
              <g className="l6b-fc__dim">
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffd166" strokeWidth={0.07} strokeDasharray="0.2 0.12" />
                <circle cx={a.x} cy={a.y} r={0.12} fill="#ffd166" />
                <circle cx={b.x} cy={b.y} r={0.12} fill="#ffd166" />
                <g transform={`translate(${(a.x + b.x) / 2 + (Math.abs(a.x - b.x) < 0.1 ? (a.x < 0 ? 2.05 : -2.05) : 0)} ${(a.y + b.y) / 2 - (Math.abs(a.x - b.x) < 0.1 ? 0 : 0.6)})`}>
                  <rect x={-1.05} y={-0.36} width={2.1} height={0.72} rx={0.18} fill="#ffd166" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={0.46} fontWeight={700} fill="#1b1a17" fontFamily="IBM Plex Mono, monospace">
                    {dist!.toFixed(2)} mm
                  </text>
                </g>
              </g>
            )}
            {/* land pattern overlay */}
            {overlay && (
              <g className="l6b-fc__overlay" style={{ pointerEvents: 'none' }}>
                {LAND_PADS.map((lp) => (
                  <rect
                    key={lp.num}
                    x={lp.x - LAND.padW / 2}
                    y={lp.y - LAND.padH / 2}
                    width={LAND.padW}
                    height={LAND.padH}
                    rx={0.08}
                    fill="rgba(255,170,90,0.18)"
                    stroke="#ffb36b"
                    strokeWidth={0.07}
                    strokeDasharray="0.22 0.12"
                  />
                ))}
              </g>
            )}
            {/* hit areas */}
            {fp.pads.map((p) => (
              <rect
                key={`hit${p.num}`}
                x={p.x - p.w / 2 - 0.15}
                y={p.y - p.h / 2 - 0.15}
                width={p.w + 0.3}
                height={p.h + 0.3}
                fill="transparent"
                className="l6b-fc__hit"
                role="button"
                aria-label={`Pad ${p.num}`}
                onClick={() => onPad(p.num)}
              />
            ))}
          </svg>
          <div className="l6b-fc__hint mono">
            {mode === 'pin1' ? 'Click the pad you think is pin 1' : 'Click two neighbouring pads to measure the pitch'}
          </div>
        </div>
      </div>

      <div className="l6b-fc__list">
        {rows.map((r) => (
          <div key={r.id} className={`l6b-check is-${state[r.id]}`}>
            <span className="l6b-check__tick" aria-hidden>
              {state[r.id] === 'pass' ? <IconCheck size={14} /> : state[r.id] === 'fail' ? <IconX size={14} /> : null}
            </span>
            <div className="l6b-check__text">
              <b>{r.title}</b>
              <span>{r.detail}</span>
            </div>
            {r.action && (
              <button className={`l6b-check__btn ${r.action.active ? 'is-on' : ''}`} onClick={r.action.on} disabled={r.id === 'count' && counting}>
                {r.action.label}
              </button>
            )}
          </div>
        ))}
        {allPass && (
          <div className="l6b-verdict is-good" role="status">
            <b>Footprint check passed</b>
            <span>
              Name, pin count, pitch, pin 1 and pad layout all match the datasheet. You can wire this part into the schematic with
              confidence.
            </span>
          </div>
        )}
        {!allPass && (state.count === 'fail' || state.overlay === 'fail' || (state.pitch === 'fail' && fp.id !== 'SOIC-8')) && (
          <div className="l6b-verdict is-bad" role="status">
            <b>Mismatch</b>
            <span>
              This footprint is {fp.pkg}, but the datasheet land pattern is SOIC-8. Go back and pick the SOIC-8 part, or swap the
              footprint (Tools › Footprint Manager).
            </span>
            <button className="l6b-check__btn" onClick={onBack} style={{ marginTop: 6 }}>
              Back to search
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
