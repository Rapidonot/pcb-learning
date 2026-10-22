/* Resistor decoder: colour bands ⇄ value ⇄ SMD 3-digit code, all linked. */
import { useEffect, useState } from 'react'
import { IconCheck } from '@/components/icons'

export const BANDS = [
  { name: 'Black', c: '#1a1a1a', ink: '#fff' },
  { name: 'Brown', c: '#7a4316', ink: '#fff' },
  { name: 'Red', c: '#d8342a', ink: '#fff' },
  { name: 'Orange', c: '#ee7d1f', ink: '#1a1a1a' },
  { name: 'Yellow', c: '#f2cf26', ink: '#1a1a1a' },
  { name: 'Green', c: '#2e9a4e', ink: '#fff' },
  { name: 'Blue', c: '#2f67d6', ink: '#fff' },
  { name: 'Violet', c: '#7d47c4', ink: '#fff' },
  { name: 'Grey', c: '#8c8c8c', ink: '#fff' },
  { name: 'White', c: '#f5f5f0', ink: '#1a1a1a' },
]
const GOLD = '#c9a43a'
const MAX_MULT = 7

export function fmtR(v: number) {
  const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0).replace(/\.0$/, ''))
  if (v >= 1e6) return `${f(v / 1e6)} MΩ`
  if (v >= 1e3) return `${f(v / 1e3)} kΩ`
  return `${v} Ω`
}

const CHALLENGES = [
  { v: 330, label: 'Blinky R3', id: 'r3' },
  { v: 1000, label: 'Blinky R1', id: 'r1' },
  { v: 47000, label: 'Blinky R2', id: 'r2' },
  { v: 10000, label: 'Pull-up classic', id: 'pu' },
]

export function Decoder({ onValue, compact }: { onValue: (v: number) => void; compact: boolean }) {
  const [d, setD] = useState<[number, number, number]>([4, 7, 2]) // 4.7 kΩ to start
  const [sel, setSel] = useState<0 | 1 | 2>(0)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const value = (d[0] * 10 + d[1]) * 10 ** d[2]

  useEffect(() => {
    onValue(value)
    const hit = CHALLENGES.find((c) => c.v === value)
    if (hit) setDone((s) => (s[hit.id] ? s : { ...s, [hit.id]: true }))
  }, [value, onValue])

  const set = (i: 0 | 1 | 2, v: number) => setD((cur) => {
    const n = [...cur] as [number, number, number]
    n[i] = i === 2 ? Math.max(0, Math.min(MAX_MULT, v)) : ((v % 10) + 10) % 10
    return n
  })

  const bandX = [118, 148, 184]
  return (
    <div className={`l03-dec ${compact ? 'is-compact' : ''}`}>
      <div className="l03-dec__value" aria-live="polite">
        <div className="l03-dec__big">{fmtR(value)}</div>
        <div className="l03-dec__sum mono">
          <b style={{ background: BANDS[d[0]].c, color: BANDS[d[0]].ink }}>{d[0]}</b>
          <b style={{ background: BANDS[d[1]].c, color: BANDS[d[1]].ink }}>{d[1]}</b>
          <span>× 10</span>
          <sup style={{ background: BANDS[d[2]].c, color: BANDS[d[2]].ink }}>{d[2]}</sup>
          <span>=</span>
          <span>{(d[0] * 10 + d[1]).toString()}</span>
          <span>×</span>
          <span>{(10 ** d[2]).toLocaleString('en-GB')}</span>
          <span>=</span>
          <span>{value.toLocaleString('en-GB')} Ω</span>
        </div>
      </div>

      <div className="l03-dec__row">
        {/* colour bands */}
        <div className="l03-dec__card">
          <div className="l03-dec__lbl">Colour bands · through-hole</div>
          <svg viewBox="0 0 400 110" width="100%" className="l03-dec__res" role="group" aria-label="Resistor colour bands. Pick a band, then a colour.">
            <defs>
              <linearGradient id="l03d-lead" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f4f6f8" />
                <stop offset="0.5" stopColor="#b9bec5" />
                <stop offset="1" stopColor="#7c828a" />
              </linearGradient>
              <linearGradient id="l03d-body" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#efdcb3" />
                <stop offset="0.5" stopColor="#d9bf8a" />
                <stop offset="1" stopColor="#b3965f" />
              </linearGradient>
              <linearGradient id="l03d-shade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity={0.55} />
                <stop offset="0.18" stopColor="#fff" stopOpacity={0.12} />
                <stop offset="0.55" stopColor="#000" stopOpacity={0} />
                <stop offset="1" stopColor="#000" stopOpacity={0.42} />
              </linearGradient>
              <clipPath id="l03d-clip">
                <path d={BODY} />
              </clipPath>
              <filter id="l03d-sh" x="-10%" y="-30%" width="120%" height="180%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#3c2d14" floodOpacity="0.28" />
              </filter>
            </defs>
            <rect x={0} y={52} width={400} height={6} rx={3} fill="url(#l03d-lead)" />
            <g filter="url(#l03d-sh)">
              <path d={BODY} fill="url(#l03d-body)" />
            </g>
            <g clipPath="url(#l03d-clip)">
              {bandX.map((x, i) => (
                <rect key={i} x={x} y={20} width={16} height={70} fill={BANDS[d[i]].c} />
              ))}
              <rect x={266} y={20} width={14} height={70} fill={GOLD} />
              <path d={BODY} fill="url(#l03d-shade)" />
              <path d="M 104 36 L 296 36" stroke="#fff" strokeOpacity={0.5} strokeWidth={2.4} strokeLinecap="round" />
            </g>
            <path d={BODY} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={0.8} />
            {bandX.map((x, i) => (
              <g key={i} className={`l03-dec__hit ${sel === i ? 'is-sel' : ''}`} onClick={() => setSel(i as 0 | 1 | 2)} role="button" tabIndex={0} aria-label={`Band ${i + 1}: ${BANDS[d[i]].name}`} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(i as 0 | 1 | 2)}>
                <rect x={x - 6} y={10} width={28} height={90} fill="transparent" />
                <path d={`M ${x + 8} 98 l -6 8 h 12 z`} className="l03-dec__arrow" />
              </g>
            ))}
            <text x={273} y={104} fontSize={10} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fill="var(--ink-3)">
              ±5%
            </text>
          </svg>
          <div className="l03-dec__bandtabs">
            {['1st digit', '2nd digit', 'Multiplier'].map((t, i) => (
              <button key={t} className={sel === i ? 'is-on' : ''} onClick={() => setSel(i as 0 | 1 | 2)}>
                {t}
              </button>
            ))}
          </div>
          <div className="l03-dec__palette" role="radiogroup" aria-label="Band colour">
            {BANDS.map((b, i) => {
              const disabled = sel === 2 && i > MAX_MULT
              return (
                <button
                  key={b.name}
                  role="radio"
                  aria-checked={d[sel] === i}
                  aria-label={`${b.name} (${sel === 2 ? `×${(10 ** i).toLocaleString('en-GB')}` : i})`}
                  disabled={disabled}
                  className={d[sel] === i ? 'is-on' : ''}
                  style={{ background: b.c, color: b.ink }}
                  onClick={() => set(sel, i)}
                >
                  {i}
                </button>
              )
            })}
          </div>
        </div>

        {/* SMD code */}
        <div className="l03-dec__card l03-dec__card--smd">
          <div className="l03-dec__lbl">3-digit code · SMD chip</div>
          <div className="l03-chip" aria-label={`SMD code ${d.join('')}`}>
            <div className="l03-chip__cap" />
            <div className="l03-chip__body">
              {d.map((n, i) => (
                <div key={i} className="l03-chip__digit">
                  <button aria-label={`Increase digit ${i + 1}`} onClick={() => set(i as 0 | 1 | 2, n + 1)}>
                    ▲
                  </button>
                  <span>{n}</span>
                  <button aria-label={`Decrease digit ${i + 1}`} onClick={() => set(i as 0 | 1 | 2, n - 1)}>
                    ▼
                  </button>
                </div>
              ))}
            </div>
            <div className="l03-chip__cap" />
          </div>
          <div className="l03-dec__hint">
            First two digits, then <b>how many zeros</b>.<br />
            {d.join('')} = {d[0]}
            {d[1]}
            {'0'.repeat(d[2])} Ω
          </div>
        </div>
      </div>

      <div className="l03-dec__goals">
        <span className="l03-dec__lbl">Try making</span>
        {CHALLENGES.map((c) => (
          <span key={c.id} className={`l03-goal ${done[c.id] ? 'is-done' : ''} ${c.v === value ? 'is-now' : ''}`}>
            {done[c.id] && <IconCheck size={12} />}
            {c.label} · {fmtR(c.v)}
          </span>
        ))}
      </div>
    </div>
  )
}

const BODY =
  'M 100 26 C 88 26 86 40 86 55 C 86 70 88 84 100 84 L 152 84 C 162 84 164 77 174 77 L 226 77 C 236 77 238 84 248 84 L 300 84 C 312 84 314 70 314 55 C 314 40 312 26 300 26 L 248 26 C 238 26 236 33 226 33 L 174 33 C 164 33 162 26 152 26 Z'
