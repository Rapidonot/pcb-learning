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
const RUN = 4.5 // seconds
const ptsStr = (pts: Vec[]) => pts.map((p) => `${p[0]},${p[1]}`).join(' ')

export interface HeatRun {
  thermals: boolean
  melted: boolean
  at: number | null
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
  const [t, setT] = useState(0) // seconds into the run
  const [running, setRunning] = useState(false)
  const sim = useRef({ T: 0, P: 0, meltAt: null as number | null })
  const [, force] = useState(0)
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])

  // reset when the setup changes
  useEffect(() => {
    sim.current = { T: 0, P: 0, meltAt: null }
    setT(0)
    setRunning(false)
  }, [pour.thermals, padKey, pour.clearance])

  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const k = pour.thermals ? 0.32 + pour.spoke * 0.3 : 1.6 // heat lost into the plane
    const a = 1.15 // heat from the iron
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) * (reduce ? 4 : 1)
      last = now
      const s = sim.current
      s.T += (a * (1 - s.T) - k * s.T) * dt
      s.P += (k * s.T * 0.55 - 0.25 * s.P) * dt
      setT((prev) => {
        const nt = prev + dt
        if (s.meltAt === null && s.T >= MELT) s.meltAt = nt
        if (nt >= RUN) {
          setRunning(false)
          onRun({ thermals: pour.thermals, melted: s.meltAt !== null, at: s.meltAt })
          return RUN
        }
        return nt
      })
      force((x) => x + 1)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [running, pour.thermals, pour.spoke, onRun, reduce])

  const start = () => {
    sim.current = { T: 0, P: 0, meltAt: null }
    setT(0)
    setRunning(true)
  }

  if (!pad) return null
  const { T, P, meltAt } = sim.current
  const melted = meltAt !== null
  const done = !running && t >= RUN
  const W = 6.4
  const H = 4.6
  const vb = { x: pad.x - W / 2, y: pad.y - H / 2, w: W, h: H }
  const padR = Math.max(pad.w, pad.h) / 2
  const solder = melted ? Math.min(1, (T - MELT) / 0.12 + 0.35) : 0
  const ironOn = running || done

  const copperMask = `cm-${uid}`
  return (
    <div className="l12-ti">
      <div className="l12-ti__view">
        <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Zoomed view of pad ${pad.ref} pin ${pad.num} in the ground pour`}>
          <defs>
            <pattern id={`fr4-${uid}`} width={0.36} height={0.2} patternUnits="userSpaceOnUse">
              <rect width={0.36} height={0.2} fill="#c9b27a" />
              <path d="M0 0.1 Q0.09 0.04 0.18 0.1 T0.36 0.1" fill="none" stroke="#b39c63" strokeWidth={0.03} opacity={0.6} />
              <path d="M0 0.0 Q0.09 0.06 0.18 0.0 T0.36 0.0" fill="none" stroke="#d8c48f" strokeWidth={0.02} opacity={0.5} />
            </pattern>
            <linearGradient id={`cu-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2b67a" />
              <stop offset="0.45" stopColor="#d88b45" />
              <stop offset="1" stopColor="#b4692d" />
            </linearGradient>
            <radialGradient id={`pad-${uid}`} cx="0.38" cy="0.32" r="0.8">
              <stop offset="0" stopColor="#ffd8a6" />
              <stop offset="0.55" stopColor="#e09550" />
              <stop offset="1" stopColor="#a8622a" />
            </radialGradient>
            <radialGradient id={`heat-${uid}`}>
              <stop offset="0" stopColor="#fff3b0" stopOpacity={1} />
              <stop offset="0.35" stopColor="#ffb347" stopOpacity={0.9} />
              <stop offset="0.7" stopColor="#ff5a1f" stopOpacity={0.45} />
              <stop offset="1" stopColor="#ff3d00" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`sol-${uid}`} cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.4" stopColor="#d9dde2" />
              <stop offset="1" stopColor="#8d949c" />
            </radialGradient>
            <linearGradient id={`iron-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6d7278" />
              <stop offset="0.35" stopColor="#e9edf1" />
              <stop offset="0.6" stopColor="#aeb4bb" />
              <stop offset="1" stopColor="#5d6268" />
            </linearGradient>
            <linearGradient id={`grip-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#1d1d20" />
              <stop offset="0.4" stopColor="#4a4a50" />
              <stop offset="1" stopColor="#151517" />
            </linearGradient>
            <filter id={`soft-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={0.04} dy={0.06} stdDeviation={0.05} floodColor="#2a1a08" floodOpacity={0.45} />
            </filter>
            <mask id={copperMask} maskUnits="userSpaceOnUse" x={vb.x - 1} y={vb.y - 1} width={vb.w + 2} height={vb.h + 2}>
              <PourArt pour={pour} doc={doc} conn={conn} fill="#fff" islands={[]} keepIslands uid={`${uid}m`} />
              {doc.tracks
                .filter((tr) => tr.layer === pour.layer)
                .map((tr) => (
                  <polyline key={tr.id} points={ptsStr(tr.pts)} fill="none" stroke="#fff" strokeWidth={tr.width} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              <g transform={`translate(${pad.x} ${pad.y}) rotate(${pad.rot})`}>
                <PadGlyph pad={pad} fill="#fff" hole={null} />
              </g>
            </mask>
          </defs>

          {/* bare board: FR-4 with copper on top */}
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={`url(#fr4-${uid})`} />
          <g filter={`url(#soft-${uid})`}>
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
          {/* sheen */}
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#fff" opacity={0.06} mask={`url(#${copperMask})`} />

          {/* heat: strong on the pad, and whatever leaks into the plane */}
          <g mask={`url(#${copperMask})`} style={{ mixBlendMode: 'screen' }}>
            <circle cx={pad.x} cy={pad.y} r={0.4 + P * 4.5} fill={`url(#heat-${uid})`} opacity={Math.min(0.9, P * 1.4)} />
            <circle cx={pad.x} cy={pad.y} r={padR + 0.35} fill={`url(#heat-${uid})`} opacity={Math.min(1, T * 1.35)} />
          </g>

          {/* heat-flow arrows */}
          {ironOn && (
            <g className="l12-ti__arrows" opacity={0.9} style={{ pointerEvents: 'none' }}>
              {(pour.thermals ? [0, 90, 180, 270] : [0, 45, 90, 135, 180, 225, 270, 315]).map((a) => (
                <g key={a} transform={`translate(${pad.x} ${pad.y}) rotate(${a + pad.rot})`}>
                  <path
                    d={`M ${padR + 0.25} 0 L ${padR + (pour.thermals ? 0.9 : 1.5)} 0`}
                    stroke="#ffe08a"
                    strokeWidth={pour.thermals ? 0.06 : 0.1}
                    strokeDasharray="0.12 0.1"
                    className="l12-flow"
                  />
                </g>
              ))}
            </g>
          )}

          {/* solder */}
          {solder > 0 && (
            <g transform={`translate(${pad.x} ${pad.y}) rotate(${pad.rot})`} filter={`url(#soft-${uid})`}>
              <rect x={(-pad.w / 2) * solder} y={(-pad.h / 2) * solder} width={pad.w * solder} height={pad.h * solder} rx={Math.min(pad.w, pad.h) * 0.45 * solder} fill={`url(#sol-${uid})`} />
              {pad.drill && <circle r={pad.drill * 0.32} fill="#a7adb4" />}
            </g>
          )}

          {/* soldering iron */}
          <g
            transform={`translate(${pad.x + (ironOn ? 0.12 : 1.2)} ${pad.y - (ironOn ? 0.1 : 1.0)}) rotate(-40)`}
            style={{ transition: 'transform 0.4s cubic-bezier(0.2,0.7,0.2,1)' }}
            filter={`url(#soft-${uid})`}
          >
            <path d="M -0.12 0 L 0.12 0 L 0.32 -1.6 L -0.32 -1.6 Z" fill={`url(#iron-${uid})`} transform="scale(1,-1) translate(0 0)" />
            <rect x={-0.42} y={1.6} width={0.84} height={3} rx={0.18} fill={`url(#grip-${uid})`} />
            <ellipse cx={0} cy={0.02} rx={0.14} ry={0.06} fill={ironOn ? '#ffcf6b' : '#c9ced4'} opacity={0.9} />
          </g>
        </svg>
        <div className="l12-ti__label mono">
          {pad.ref} PIN {pad.num} · {pour.thermals ? 'THERMAL RELIEF' : 'SOLID CONNECTION'}
        </div>
      </div>

      <div className="l12-ti__ctl">
        <Segmented
          label="GND pad"
          value={pad.key}
          onChange={onPad}
          options={pads.map((p) => ({ value: p.key, label: `${p.ref}.${p.num}` }))}
        />
        <Segmented
          label="Connection"
          value={pour.thermals ? 'th' : 'solid'}
          onChange={(v) => onThermals(v === 'th')}
          options={[
            { value: 'th', label: 'Thermal relief' },
            { value: 'solid', label: 'Solid' },
          ]}
        />
        <div className="l12-thermo" aria-label="Pad temperature">
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
          <Button size="sm" variant="ghost" onClick={() => { sim.current = { T: 0, P: 0, meltAt: null }; setT(0); setRunning(false) }} aria-label="Reset">
            <IconReset size={14} />
          </Button>
        </div>
        <div className={`l12-verdict ${done ? (melted ? 'is-good' : 'is-bad') : ''}`}>
          {!done && !running && <>Heat the pad with a soldering iron and watch where the heat goes.</>}
          {running && (melted ? <>Solder is flowing.</> : pour.thermals ? <>The spokes keep most of the heat in the pad…</> : <>The plane is soaking up the heat…</>)}
          {done && melted && <>Solder flowed after {meltAt!.toFixed(1)} s. The thin spokes slow heat escaping into the plane.</>}
          {done && !melted && <>After {RUN} s the pad still isn't hot enough. The whole plane is draining the heat away: a recipe for a cold joint.</>}
        </div>
      </div>
    </div>
  )
}
