import { useId } from 'react'
import { Slider, Segmented, Button } from '@/components/ui'
import { IconX } from '@/components/icons'
import { REAL } from '@/pcb/palette'
import { traceWidth, tempRise, ROUTER_WIDTHS } from './ipc'

export interface CalcState {
  amps: number
  rise: number
  oz: number
}

export function Calculator({
  value,
  onChange,
  routerWidth,
  onUse,
  onClose,
  narrow,
}: {
  value: CalcState
  onChange: (v: CalcState) => void
  routerWidth: number
  onUse: (w: number) => void
  onClose: () => void
  narrow: boolean
}) {
  const r = traceWidth(value.amps, value.rise, value.oz)
  const pick = ROUTER_WIDTHS.find((w) => w >= r.widthMm - 1e-9)
  const heat = tempRise(value.amps, routerWidth, value.oz)
  return (
    <div className={`l10-calc ${narrow ? 'is-narrow' : ''}`} onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label="Trace width calculator">
      <div className="l10-calc__head">
        <div>
          <div className="float-card__title">Trace width calculator</div>
          <div className="l10-calc__sub">IPC-2221, outer layer</div>
        </div>
        <button className="l10-calc__x" onClick={onClose} aria-label="Close calculator">
          <IconX size={16} />
        </button>
      </div>

      <div className="l10-calc__body">
        <div className="l10-calc__inputs">
          <Slider label="Current" value={value.amps} min={0.1} max={5} step={0.1} onChange={(amps) => onChange({ ...value, amps: Math.round(amps * 10) / 10 })} format={(v) => v.toFixed(1)} unit="A" />
          <Slider label="Allowed temperature rise" value={value.rise} min={5} max={60} step={5} onChange={(rise) => onChange({ ...value, rise })} unit="°C" />
          <Segmented
            label="Copper weight"
            options={[
              { value: 1, label: '1 oz (35 µm)' },
              { value: 2, label: '2 oz (70 µm)' },
            ]}
            value={value.oz}
            onChange={(oz) => onChange({ ...value, oz })}
          />
        </div>

        <div className="l10-calc__result">
          <div className="eyebrow">Minimum width</div>
          <div className="l10-calc__big mono">
            {fmt(r.widthMm)}
            <span>mm</span>
          </div>
          <div className="l10-calc__alt mono">
            {r.widthMil.toFixed(1)} mil · area {r.areaMil2.toFixed(1)} mil²
          </div>
        </div>

        <CrossSection widthMm={r.widthMm} thickMm={r.thickMm} oz={value.oz} />

        <div className="l10-calc__heat">
          Your router’s <b className="mono">{routerWidth} mm</b> track at {value.amps.toFixed(1)} A would warm up by about{' '}
          <b className={`mono ${heat > value.rise + 1e-6 ? 'is-bad' : 'is-good'}`}>{heat < 0.1 ? '<0.1' : heat.toFixed(1)} °C</b>
          {heat > value.rise + 1e-6 ? ', more than you allowed.' : '. Fine.'}
        </div>

        {pick ? (
          <Button size="sm" variant="accent" onClick={() => onUse(pick)} style={{ width: '100%' }}>
            Route with {pick} mm
          </Button>
        ) : (
          <div className="l10-calc__note">Wider than this playground’s 1.0 mm tracks. Use a wider track or a copper pour (Lesson 12).</div>
        )}
      </div>
    </div>
  )
}

const fmt = (mm: number) => (mm < 0.1 ? mm.toFixed(3) : mm.toFixed(2))

/** A true-to-scale slice through the board: FR-4 core with the copper trace on top. */
function CrossSection({ widthMm, thickMm, oz }: { widthMm: number; thickMm: number; oz: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const V = Math.max(2.2, Math.min(9, widthMm * 1.9 + 0.8))
  const top = V * 0.2
  const core = 1.6
  const H = top + core * 0.62
  const fs = V * 0.045
  const x0 = (V - widthMm) / 2
  const hairR = 0.035
  return (
    <figure className="l10-xs">
      <svg viewBox={`0 0 ${V} ${H}`} role="img" aria-label={`Scale cross-section: a ${fmt(widthMm)} mm wide, ${Math.round(thickMm * 1000)} micrometre thick copper trace on 1.6 mm FR-4`}>
        <defs>
          <linearGradient id={`fr-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={REAL.fr4} />
            <stop offset="0.75" stopColor={REAL.fr4Dark} />
            <stop offset="1" stopColor={REAL.fr4Dark} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* FR-4 core (the bottom is cut away; the full core is 1.6 mm thick) */}
        <rect x={0} y={top} width={V} height={core * 0.62} fill={`url(#fr-${uid})`} />
        {/* glass-fibre bundles, faintly */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={V} y1={top + core * 0.62 * f * 0.8} y2={top + core * 0.62 * f * 0.8} stroke="rgba(90,70,30,0.18)" strokeWidth={fs * 0.05} strokeDasharray={`${fs * 0.6} ${fs * 0.3}`} />
        ))}
        {/* the trace */}
        <rect x={x0} y={top - thickMm} width={widthMm} height={thickMm} fill={REAL.copper} className="l10-xs__cu" />
        <rect x={x0} y={top - thickMm} width={widthMm} height={thickMm} fill="none" stroke="#a35a1c" strokeWidth={Math.min(thickMm * 0.25, fs * 0.05)} />
        {/* width dimension */}
        <g stroke="var(--ink-2)" strokeWidth={fs * 0.08}>
          <line x1={x0} x2={x0 + widthMm} y1={top - thickMm - fs * 1.4} y2={top - thickMm - fs * 1.4} />
          <line x1={x0} x2={x0} y1={top - thickMm - fs * 2} y2={top - thickMm - fs * 0.4} />
          <line x1={x0 + widthMm} x2={x0 + widthMm} y1={top - thickMm - fs * 2} y2={top - thickMm - fs * 0.4} />
        </g>
        <text x={V / 2} y={top - thickMm - fs * 2.1} fontSize={fs * 1.05} textAnchor="middle" className="l10-xs__t" fontWeight={600}>
          {fmt(widthMm)} mm
        </text>
        {/* thickness callout */}
        <line x1={x0 + widthMm} y1={top - thickMm / 2} x2={Math.min(V - fs * 0.5, x0 + widthMm + fs * 3)} y2={top + fs * 2} stroke="rgba(60,45,15,0.6)" strokeWidth={fs * 0.06} />
        <text x={Math.min(V - fs * 0.5, x0 + widthMm + fs * 3)} y={top + fs * 3.1} fontSize={fs * 0.85} textAnchor="end" className="l10-xs__t l10-xs__t--dark">
          {oz === 1 ? '35' : '70'} µm copper
        </text>
        <text x={fs * 0.6} y={top + core * 0.38} fontSize={fs * 0.85} className="l10-xs__t l10-xs__t--dark">
          FR-4 core, 1.6 mm thick
        </text>
        {/* a human hair for scale */}
        <circle cx={fs * 1.2} cy={top - hairR} r={hairR} fill="var(--ink-2)" />
        <text x={fs * 0.7} y={top - fs * 0.9} fontSize={fs * 0.75} className="l10-xs__t">
          hair ≈ 0.07 mm
        </text>
      </svg>
      <figcaption>
        Drawn to scale: copper is thinner than a hair, which is why width matters so much.
      </figcaption>
    </figure>
  )
}
