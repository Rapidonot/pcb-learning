/* All the chips at the same scale, next to a grain of rice and a fingertip. */
import { PcbCanvas } from '@/pcb/PcbCanvas'
import { PartBodyTop } from '@/pcb/render'
import { getFootprint } from '@/pcb/footprints'
import { pkgById } from './pkgs'

const ITEMS: { id: string; x: number }[] = [
  { id: 'R0402', x: 0 },
  { id: 'R0603', x: 4.2 },
  { id: 'R0805', x: 8.8 },
  { id: 'R1206', x: 14 },
  { id: 'SOT-23', x: 20 },
  { id: 'SOIC-8', x: 27 },
]

const FIT = { x: -3, y: -9.5, w: 54, h: 24 }
const FIT_C = { x: -2, y: -12, w: 33, h: 30 }

export function TrueSize({ sel, onPick, top, bottom, compact }: { sel: string; onPick: (id: string) => void; top: number; bottom: number; compact?: boolean }) {
  return (
    <div className="l04-canvas l04-paper" style={{ left: 0, right: 0, top, bottom }}>
      <PcbCanvas fit={compact ? FIT_C : FIT} theme="paper" grid={1} majorEvery={5} pad={1} zoomControls ariaLabel="Chip packages drawn to the same scale as a grain of rice and a fingertip">
        <defs>
          <radialGradient id="l04-rice" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#fffdf6" />
            <stop offset="0.7" stopColor="#f1e9d6" />
            <stop offset="1" stopColor="#d9ccaf" />
          </radialGradient>
          <linearGradient id="l04-skin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1c7a8" />
            <stop offset="1" stopColor="#d79b78" />
          </linearGradient>
          <clipPath id="l04-finger">
            <path d={FINGER} />
          </clipPath>
          <filter id="l04-ds" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0.12" dy="0.22" stdDeviation="0.18" floodColor="#3c2d14" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* fingertip */}
        <g opacity={0.9}>
          <path d={FINGER} fill="url(#l04-skin)" opacity={0.42} />
          <g clipPath="url(#l04-finger)" fill="none" stroke="#a8684a" strokeWidth={0.09} opacity={0.6}>
            {Array.from({ length: 16 }, (_, i) => (
              <ellipse key={i} cx={41.5} cy={3} rx={0.8 + i * 0.75} ry={1.1 + i * 0.9} />
            ))}
          </g>
          <path d={FINGER} fill="none" stroke="#a8684a" strokeWidth={0.12} />
          <text x={41.5} y={-10.2} fontSize={0.8} textAnchor="middle" className="l04-ts-name">
            FINGERTIP ≈ 16 MM
          </text>
        </g>

        {/* grain of rice */}
        <g transform="rotate(-6 6 9.6)" filter="url(#l04-ds)">
          <ellipse cx={6} cy={9.6} rx={3.3} ry={1.05} fill="url(#l04-rice)" />
          <path d="M 3.4 9.5 Q 6 9.1 8.7 9.6" stroke="#d6c9ab" strokeWidth={0.06} fill="none" />
        </g>
        <text x={6} y={12.4} fontSize={0.62} textAnchor="middle" className="l04-ts-size">
          grain of rice ≈ 6–7 mm
        </text>

        {/* parts */}
        {ITEMS.map((it) => {
          const fp = getFootprint(it.id)
          const isSel = sel === it.id
          const half = Math.max(fp.body.w / 2, ...fp.pads.map((p) => Math.abs(p.x) + 0.3))
          return (
            <g key={it.id} transform={`translate(${it.x} 0)`} onPointerDown={() => onPick(it.id)} style={{ cursor: 'pointer' }} role="button" aria-label={`${pkgById[it.id].label}, ${fp.body.w} by ${fp.body.h} millimetres`}>
              <rect x={-half - 0.5} y={-3.2} width={half * 2 + 1} height={8.6} rx={0.5} fill={isSel ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent'} stroke={isSel ? 'var(--accent)' : 'transparent'} strokeWidth={0.08} />
              <g filter="url(#l04-ds)">
                <PartBodyTop fp={fp} value={pkgById[it.id].value} />
              </g>
              <text y={3.6} fontSize={0.78} textAnchor="middle" className="l04-ts-name">
                {pkgById[it.id].label}
              </text>
              <text y={4.5} fontSize={0.46} textAnchor="middle" className="l04-ts-size">
                {fp.body.w}×{fp.body.h}
              </text>
            </g>
          )
        })}
      </PcbCanvas>
    </div>
  )
}

const FINGER = 'M 33.5 15 L 33.5 2.5 C 33.5 -5.5 37.5 -9 41.5 -9 C 45.5 -9 49.5 -5.5 49.5 2.5 L 49.5 15'
