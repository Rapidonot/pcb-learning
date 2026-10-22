/* Zoomed look at one GND pad in the pour: thermal spokes vs a solid join, with a soldering-iron heat simulation. */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button, Segmented } from '@/components/ui'
import { IconPlay, IconReset } from '@/components/icons'
import { PadGlyph } from '@/pcb/render'
import type { BoardDoc, Connectivity, WorldPad } from '@/pcb/board'
import type { Vec } from '@/pcb/geom'
import { PourArt } from './board12'
import type { PourSpec } from './pour'

const MELT = 0.62
const RUN = 4.5 // simulated seconds
const ptsStr = (pts: Vec[]) => pts.map((p) => `${p[0]},${p[1]}`).join(' ')

export interface HeatRun {
  thermals: boolean
  melted: boolean
  at: number | null
}

/** The static copper artwork (memoised: only the heat overlay animates). */
function CopperArt({ uid, doc, conn, pour, vb }: { uid: string; doc: BoardDoc; conn: Connectivity; pour: PourSpec; vb: { x: number; y: number; w: number; h: number } }) {
  return useMemo(
    () => (
      <g>
        <defs>
          <pattern id={`fr4-${uid}`} width={0.36} height={0.2} patternUnits="userSpaceOnUse">
            <rect width={0.36} height={0.2} fill="#c6ae76" />
            <path d="M-0.02 0.07 C0.06 0.07 0.1 0.13 0.18 0.13 S0.3 0.07 0.38 0.07 L0.38 0.1 C0.3 0.1 0.26 0.16 0.18 0.16 S0.06 0.1 -0.02 0.1 Z" fill="#dccb98" opacity={0.75} />
            <ellipse cx={0.06} cy={0.1} rx={0.055} ry={0.026} fill="#e9dbb2" stroke="#a89260" strokeWidth={0.004} />
            <ellipse cx={0.3} cy={0.1} rx={0.055} ry={0.026} fill="#e9dbb2" stroke="#a89260" strokeWidth={0.004} />
          </pattern>
          <linearGradient id={`cu-${uid}`} gradientUnits="userSpaceOnUse" x1={vb.x} y1={vb.y} x2={vb.x + vb.w} y2={vb.y + vb.h}>
            <stop offset="0" stopColor="#f0b47a" />
            <stop offset="0.35" stopColor="#dc9050" />
            <stop offset="0.65" stopColor="#e6a066" />
            <stop offset="1" stopColor="#b46a2e" />
          </linearGradient>
          <radialGradient id={`pad-${uid}`} cx="0.36" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#ffe1bb" />
            <stop offset="0.5" stopColor="#e39a57" />
            <stop offset="1" stopColor="#9e5a24" />
          </radialGradient>
          <filter id={`cuF-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            {/* raised foil: soft drop shadow plus a faint brushed-metal grain */}
            <feDropShadow dx={0.035} dy={0.05} stdDeviation={0.035} floodColor="#3a2008" floodOpacity={0.55} result="sh" />
            <feTurbulence type="fractalNoise" baseFrequency="9" numOctaves={2} seed={4} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 0.85  0 0 0 0 0.7  0 0 0 0.07 0" result="g" />
            <feComposite in="g" in2="SourceGraphic" operator="in" result="gg" />
            <feMerge>
              <feMergeNode in="sh" />
              <feMergeNode in="gg" />
            </feMerge>
          </filter>
        </defs>
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={`url(#fr4-${uid})`} />
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#000" opacity={0.08} />
        <g filter={`url(#cuF-${uid})`}>
          <PourArt pour={pour} doc={doc} conn={conn} fill={`url(#cu-${uid})`} islands={[]} keepIslands uid={`${uid}v`} />
          {doc.tracks
            .filter((tr) => tr.layer === pour.layer)
            .map((tr) => (
              <polyline key={tr.id} points={ptsStr(tr.pts)} fill="none" stroke={`url(#cu-${uid})`} strokeWidth={tr.width} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          {conn.pads
            .filter((p) => p.layers.includes(pour.layer))
            .map((p) => (
              <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
                <PadGlyph pad={p} fill={`url(#pad-${uid})`} hole="#1b1a17" />
              </g>
            ))}
        </g>
      </g>
    ),
    [uid, doc, conn, pour, vb.x, vb.y, vb.w, vb.h],
  )
}

/** White = copper. Used to keep the heat glow on the metal. */
function CopperMask({ id, doc, conn, pour, pad, vb }: { id: string; doc: BoardDoc; conn: Connectivity; pour: PourSpec; pad: WorldPad; vb: { x: number; y: number; w: number; h: number } }) {
  return useMemo(
    () => (
      <mask id={id} maskUnits="userSpaceOnUse" x={vb.x - 1} y={vb.y - 1} width={vb.w + 2} height={vb.h + 2}>
        <PourArt pour={pour} doc={doc} conn={conn} fill="#fff" islands={[]} keepIslands uid={`${id}m`} />
        {doc.tracks
          .filter((tr) => tr.layer === pour.layer && conn.netOf.get(`track:${tr.id}`) === pour.net)
          .map((tr) => (
            <polyline key={tr.id} points={ptsStr(tr.pts)} fill="none" stroke="#fff" strokeWidth={tr.width} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        <g transform={`translate(${pad.x} ${pad.y}) rotate(${pad.rot})`}>
          <PadGlyph pad={pad} fill="#fff" hole={null} />
        </g>
      </mask>
    ),
    [id, doc, conn, pour, pad, vb.x, vb.y, vb.w, vb.h],
  )
}

export function ThermalInspector({
  doc,
  conn,
  pour,
  pads,
  padKey,
  onPad,
  onThermals,
  onRun,
}: {
  doc: BoardDoc
  conn: Connectivity
  pour: PourSpec
  pads: WorldPad[]
  padKey: string
  onPad: (key: string) => void
  onThermals: (v: boolean) => void
  onRun: (r: HeatRun) => void
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const pad = pads.find((p) => p.key === padKey) ?? pads[0]
  const [running, setRunning] = useState(false)
  const sim = useRef({ T: 0, P: 0, t: 0, meltAt: null as number | null })
  const [, force] = useState(0)
  const onRunRef = useRef(onRun)
  onRunRef.current = onRun

  const reset = () => {
    sim.current = { T: 0, P: 0, t: 0, meltAt: null }
    setRunning(false)
    force((x) => x + 1)
  }
  // reset when the setup changes
  useEffect(reset, [pour.thermals, padKey, pour.clearance, pour.spoke])

  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const k = pour.thermals ? 0.2 + pour.spoke * 0.45 : 1.6 // heat lost into the plane
    const a = 1.15 // heat from the iron
    const step = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      const s = sim.current
      s.T += (a * (1 - s.T) - k * s.T) * dt
      s.P += (k * s.T * 0.55 - 0.25 * s.P) * dt
      s.t = Math.min(RUN, s.t + dt)
      if (s.meltAt === null && s.T >= MELT) s.meltAt = s.t
      force((x) => x + 1)
      if (s.t >= RUN) {
        setRunning(false)
        onRunRef.current({ thermals: pour.thermals, melted: s.meltAt !== null, at: s.meltAt })
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [running, pour.thermals, pour.spoke])

  const start = () => {
    sim.current = { T: 0, P: 0, t: 0, meltAt: null }
    setRunning(true)
  }

  const W = 8
  const H = 5.4
  const vb = useMemo(() => (pad ? { x: pad.x - W * 0.42, y: pad.y - H / 2, w: W, h: H } : { x: 0, y: 0, w: W, h: H }), [pad])
  if (!pad) return null
  const { T, P, t, meltAt } = sim.current
  const melted = meltAt !== null
  const done = !running && t >= RUN
  const padR = Math.max(pad.w, pad.h) / 2
  const solder = melted ? Math.min(1, 0.45 + (T - MELT) / 0.1) : 0
  const ironOn = running || done
  const maskId = `cm-${uid}`

  return (
    <div className="l12-ti">
      <div className="l12-ti__view">
        <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Zoomed view of pad ${pad.ref} pin ${pad.num} in the ground pour`}>
          <defs>
            <radialGradient id={`heat-${uid}`}>
              <stop offset="0" stopColor="#fffbe6" stopOpacity={1} />
              <stop offset="0.25" stopColor="#ffd25a" stopOpacity={0.95} />
              <stop offset="0.55" stopColor="#ff6a1a" stopOpacity={0.7} />
              <stop offset="1" stopColor="#c81e00" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`warm-${uid}`}>
              <stop offset="0" stopColor="#ff7a2a" stopOpacity={0.75} />
              <stop offset="0.6" stopColor="#e2380f" stopOpacity={0.35} />
              <stop offset="1" stopColor="#a01800" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`sol-${uid}`} cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.35" stopColor="#e3e6ea" />
              <stop offset="0.8" stopColor="#9aa1a9" />
              <stop offset="1" stopColor="#6c737b" />
            </radialGradient>
            <linearGradient id={`iron-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5e6369" />
              <stop offset="0.3" stopColor="#f3f6f8" />
              <stop offset="0.55" stopColor="#b5bbc2" />
              <stop offset="1" stopColor="#4f545a" />
            </linearGradient>
            <linearGradient id={`grip-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#141416" />
              <stop offset="0.35" stopColor="#55555c" />
              <stop offset="0.6" stopColor="#2a2a2e" />
              <stop offset="1" stopColor="#0f0f11" />
            </linearGradient>
            <filter id={`soft-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx={0.12} dy={0.18} stdDeviation={0.12} floodColor="#1d1206" floodOpacity={0.45} />
            </filter>
            <filter id={`blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={0.08} />
            </filter>
            <CopperMask id={maskId} doc={doc} conn={conn} pour={pour} pad={pad} vb={vb} />
          </defs>

          <CopperArt uid={uid} doc={doc} conn={conn} pour={pour} vb={vb} />

          {/* heat: glowing on the copper only */}
          <g mask={`url(#${maskId})`} style={{ pointerEvents: 'none' }}>
            <circle cx={pad.x} cy={pad.y} r={0.6 + P * 5} fill={`url(#warm-${uid})`} opacity={Math.min(0.85, P * 1.6)} />
            <circle cx={pad.x} cy={pad.y} r={padR + 0.25 + T * 0.4} fill={`url(#heat-${uid})`} opacity={Math.min(1, T * 1.4)} />
          </g>

          {/* heat-flow arrows: few narrow paths vs everywhere */}
          {ironOn && (
            <g style={{ pointerEvents: 'none' }}>
              {(pour.thermals ? [0, 90, 180, 270] : [0, 45, 90, 135, 180, 225, 270, 315]).map((a) => (
                <g key={a} transform={`translate(${pad.x} ${pad.y}) rotate(${a + pad.rot})`}>
                  <line x1={padR + 0.2} y1={0} x2={padR + (pour.thermals ? 0.75 : 1.4)} y2={0} stroke="#fff4c2" strokeWidth={pour.thermals ? 0.05 : 0.09} strokeDasharray="0.12 0.1" className="l12-flow" opacity={0.95} />
                  <path d={`M ${padR + (pour.thermals ? 0.75 : 1.4)} 0 l -0.14 -0.09 l 0 0.18 z`} fill="#fff4c2" />
                </g>
              ))}
            </g>
          )}

          {/* solder: a domed, shiny blob that grows once it melts */}
          {solder > 0 && (
            <g transform={`translate(${pad.x} ${pad.y}) rotate(${pad.rot})`}>
              <ellipse cx={0.05} cy={0.08} rx={(pad.w / 2) * solder} ry={(pad.h / 2) * solder} fill="#000" opacity={0.25} filter={`url(#blur-${uid})`} />
              <rect x={(-pad.w / 2) * solder} y={(-pad.h / 2) * solder} width={pad.w * solder} height={pad.h * solder} rx={Math.min(pad.w, pad.h) * 0.48 * solder} fill={`url(#sol-${uid})`} />
              <ellipse cx={-pad.w * 0.14} cy={-pad.h * 0.16} rx={pad.w * 0.12 * solder} ry={pad.h * 0.07 * solder} fill="#fff" opacity={0.85} />
            </g>
          )}

          {/* soldering iron, coming in from the top right */}
          <g
            transform={`translate(${pad.x + (ironOn ? padR * 0.35 : padR + 1.4)} ${pad.y - (ironOn ? padR * 0.35 : padR + 1.4)}) rotate(-135)`}
            style={{ transition: 'transform 0.45s cubic-bezier(0.2,0.7,0.2,1)' }}
            filter={`url(#soft-${uid})`}
          >
            <path d="M -0.07 0 Q 0 -0.05 0.07 0 L 0.26 1.7 L -0.26 1.7 Z" fill={`url(#iron-${uid})`} />
            <rect x={-0.3} y={1.62} width={0.6} height={0.35} rx={0.06} fill="#8d939a" />
            <rect x={-0.42} y={1.95} width={0.84} height={4} rx={0.3} fill={`url(#grip-${uid})`} />
            {[2.4, 2.75, 3.1].map((y) => (
              <rect key={y} x={-0.42} y={y} width={0.84} height={0.08} fill="#000" opacity={0.35} />
            ))}
            {ironOn && <circle cx={0} cy={0.04} r={0.12} fill="#ffd36b" opacity={0.85} filter={`url(#blur-${uid})`} />}
          </g>
        </svg>
        <div className="l12-ti__label mono">
          {pad.ref} PIN {pad.num} · {pour.thermals ? 'THERMAL RELIEF' : 'SOLID CONNECTION'}
        </div>
      </div>

      <div className="l12-ti__ctl">
        <Segmented label="GND pad" value={pad.key} onChange={onPad} options={pads.map((p) => ({ value: p.key, label: `${p.ref}.${p.num}` }))} />
        <Segmented
          label="Connection"
          value={pour.thermals ? 'th' : 'solid'}
          onChange={(v) => onThermals(v === 'th')}
          options={[
            { value: 'th', label: 'Thermal relief' },
            { value: 'solid', label: 'Solid' },
          ]}
        />
        <div className="l12-thermo" role="meter" aria-label="Pad temperature" aria-valuemin={0} aria-valuemax={1} aria-valuenow={Math.round(T * 100) / 100}>
          <div className="l12-thermo__bar">
            <div className="l12-thermo__fill" style={{ width: `${Math.min(1, T / 0.85) * 100}%` }} />
            <div className="l12-thermo__melt" style={{ left: `${(MELT / 0.85) * 100}%` }}>
              <span>solder melts</span>
            </div>
          </div>
          <div className="l12-thermo__row mono">
            <span>PAD TEMP</span>
            <span>{t.toFixed(1)} s</span>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant="primary" onClick={start} disabled={running}>
            <IconPlay size={14} /> {done ? 'Heat again' : 'Touch the iron'}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} aria-label="Reset">
            <IconReset size={14} />
          </Button>
        </div>
        <div className={`l12-verdict ${done ? (melted ? 'is-good' : 'is-bad') : ''}`}>
          {!done && !running && <>Heat the pad with a soldering iron and watch where the heat goes.</>}
          {running && (melted ? <>Solder is flowing.</> : pour.thermals ? <>The spokes keep most of the heat in the pad…</> : <>The plane is soaking up the heat…</>)}
          {done && melted && <>Solder flowed after {meltAt!.toFixed(1)} s. The thin spokes slow the heat escaping into the plane.</>}
          {done && !melted && <>After {RUN} s the pad still isn't hot enough: the whole plane drains the heat away. That's how cold joints happen.</>}
        </div>
      </div>
    </div>
  )
}
