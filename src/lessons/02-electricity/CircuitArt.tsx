/* The isometric bench: supply → R1 → D1 → back, with a "water analogy" re-skin. */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  box,
  cubic,
  cylSide,
  ellR,
  faceLeft,
  faceRight,
  faceTop,
  iso,
  isoP,
  makeTrack,
  pointAt,
  pts,
  type V2,
  type V3,
} from './iso'
import { BAND_COLORS, LEDS, RATING_W, bandsOf, fmtOhms, type LedColor, type Status } from './model'

export const VB = { x: -136, y: -50, w: 246, h: 150 }

const MASK = '#1f6b47'
const MASK_HI = '#24784f'
const COPPER = '#d58a44'
const COPPER_HI = '#f0b071'
const SILK = '#f4f1e8'
const METAL = '#c9ccd1'
const PIPE = '#8fa9bd'
const PIPE_HI = '#e2edf4'
const PIPE_DK = '#5d7a90'
const WATER = '#2f7fd8'

/* --- geometry (world units) --- */
const BW = 108
const BD = 62
const J1 = { p1: [12, 44] as [number, number], p2: [12, 52] as [number, number] }
const R1 = { a: 34, b: 66, y: 14, body0: 39, body1: 61, z: 4, r: 3.4 }
const RY = R1.y
const D1 = { x: 92, y: 30, a: 27, k: 33 }
const BOT = 52
const SUP = { x: -54, y: 56, w: 30, d: 28, z: -3, h: 22 }
const POST_P: V3 = [-39, 65, 19]
const POST_N: V3 = [-39, 75, 19]
const POST_H = 4

const tracePlus: V3[] = [[12, J1.p1[1], 0], [12, RY, 0], [R1.a, RY, 0]]
const traceMid: V3[] = [[R1.b, RY, 0], [D1.x, RY, 0], [D1.x, D1.a, 0]]
const traceMinus: V3[] = [[D1.x, D1.k, 0], [D1.x, BOT, 0], [12, BOT, 0]]

const wirePlus = cubic([POST_P[0], POST_P[1], POST_P[2] + POST_H], [-20, POST_P[1], 46], [6, J1.p1[1], 36], [12, J1.p1[1], 12])
const wireMinus = cubic([12, J1.p2[1], 12], [6, J1.p2[1], 34], [-20, POST_N[1], 42], [POST_N[0], POST_N[1], POST_N[2] + POST_H])

const lift = (ps: V3[], dz: number): V3[] => ps.map((p) => [p[0], p[1], p[2] + dz])
const PZ = 2.6 // pipe centre height in water view

function buildTrack(water: boolean) {
  const dz = water ? PZ : 0
  return makeTrack([
    { pts: wirePlus, tag: 'wire' },
    { pts: [[12, J1.p1[1], 12], [12, J1.p1[1], dz]], hidden: true },
    { pts: lift(tracePlus, dz) },
    ...(water
      ? [
          { pts: [[R1.a, RY, dz], [R1.a + 6, RY, dz]] as V3[] },
          { pts: [[R1.a + 6, RY, dz], [R1.b - 6, RY, dz]] as V3[], tag: 'narrow' },
          { pts: [[R1.b - 6, RY, dz], [R1.b, RY, dz]] as V3[] },
        ]
      : [{ pts: [[R1.a, RY, 0], [R1.a, RY, R1.z], [R1.b, RY, R1.z], [R1.b, RY, 0]] as V3[] }]),
    { pts: lift(traceMid, dz) },
    { pts: [[D1.x, D1.a, dz], [D1.x, D1.k, dz]], hidden: !water },
    { pts: lift(traceMinus, dz) },
    { pts: [[12, J1.p2[1], dz], [12, J1.p2[1], 12]], hidden: true },
    { pts: wireMinus, tag: 'wire' },
    { pts: [[POST_N[0], POST_N[1], POST_N[2] + POST_H], [POST_P[0], POST_P[1], POST_P[2] + POST_H]], hidden: true },
  ])
}

/** pipe narrowing factor for a resistance (10 Ω wide open … 10 kΩ a pinhole) */
export const pipeFactor = (R: number) => 0.92 - (0.78 * (Math.log10(R) - 1)) / 3

const poly = (ps: V3[]) => pts(ps.map(isoP))

export interface ArtProps {
  V: number
  R: number
  led: LedColor
  I: number
  status: Status
  water: boolean
  reversed: boolean
  popKey: number
  /** px per world unit (for label sizes) */
  k: number
  compact: boolean
  reducedMotion: boolean
}

export function CircuitArt(p: ArtProps) {
  const { V, R, led, I, status, water, reversed, k } = p
  const L = LEDS[led]
  const burnt = status === 'burnt'
  const bright = burnt || reversed ? 0 : Math.min(1.35, (I * 1000) / 20)
  const PR = I * I * R
  const hot = PR > RATING_W
  const px = (n: number) => n / k // screen px → user units

  /* ------------ dots animation (DOM-driven for performance) ------------ */
  const tracks = useMemo(() => ({ circuit: buildTrack(false), water: buildTrack(true) }), [])
  const live = useRef({ I, water, R, reduced: p.reducedMotion })
  live.current = { I, water, R, reduced: p.reducedMotion }
  const lowRef = useRef<SVGGElement>(null)
  const topRef = useRef<SVGGElement>(null)
  const impRef = useRef<SVGGElement>(null)
  const N = 54

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let phase = 0
    let ang = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { I: cur, water: w, R: res, reduced } = live.current
      const speed = reduced ? 0 : Math.min(150, cur * 1000 * 4.2)
      phase += speed * dt
      ang = (ang + speed * dt * 4) % 360
      const t = w ? tracks.water : tracks.circuit
      const gap = t.len / N
      const low = lowRef.current?.children
      const top = topRef.current?.children
      if (low && top) {
        const pf = pipeFactor(res)
        for (let i = 0; i < N; i++) {
          const s = phase + i * gap
          const q = pointAt(t, s)
          const onWire = q.tag === 'wire'
          const el = (onWire ? top[i] : low[i]) as SVGCircleElement
          const other = (onWire ? low[i] : top[i]) as SVGCircleElement
          other.setAttribute('visibility', 'hidden')
          el.setAttribute('visibility', q.hidden ? 'hidden' : 'visible')
          el.setAttribute('cx', q.x.toFixed(2))
          el.setAttribute('cy', q.y.toFixed(2))
          el.setAttribute('r', w ? (q.tag === 'narrow' ? Math.max(0.55, 1.6 * pf).toFixed(2) : '1.6') : '1.25')
        }
      }
      if (impRef.current) impRef.current.setAttribute('transform', `rotate(${ang.toFixed(1)} 14 11)`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tracks])

  /* ------------ pieces ------------ */
  const board = box(0, 0, -3, BW, BD, 3)
  const sup = box(SUP.x, SUP.y, SUP.z, SUP.w, SUP.d, SUP.h)
  const ledTop: V2 = iso(D1.x, D1.y, 11)
  const domeR = 5 * 1.2247

  const [b1, b2, mult] = bandsOf(R)
  const bandXs: [number, string][] = [
    [R1.body0 + 4, BAND_COLORS[b1]],
    [R1.body0 + 7.4, BAND_COLORS[b2]],
    [R1.body0 + 10.8, BAND_COLORS[mult]],
    [R1.body1 - 3.5, '#c9a43a'],
  ]
  const rA = iso(R1.body0, R1.y, R1.z)
  const rB = iso(R1.body1, R1.y, R1.z)
  const rw = R1.r * 2 * 1.04

  const pf = pipeFactor(R)
  const narrowW = 6.4 * pf

  const flap = Math.min(1, bright) * 62 // degrees
  const gaugeAng = -120 + (240 * (V - 0)) / 12

  return (
    <g>
      <defs>
        <radialGradient id="l02-glow">
          <stop offset="0" stopColor={L.glow} stopOpacity={0.75} />
          <stop offset="0.35" stopColor={L.glow} stopOpacity={0.3} />
          <stop offset="1" stopColor={L.glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="l02-dome" cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor={burnt ? '#6d5a4c' : mixWhite(L.color, 0.25 + bright * 0.55)} />
          <stop offset="0.55" stopColor={burnt ? '#4a3d34' : bright > 0.02 ? L.color : L.off} />
          <stop offset="1" stopColor={burnt ? '#2e2620' : shade(bright > 0.02 ? L.color : L.off, 0.65)} />
        </radialGradient>
        <linearGradient id="l02-cyl" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.28} />
          <stop offset="0.35" stopColor="#fff" stopOpacity={0.18} />
          <stop offset="1" stopColor="#000" stopOpacity={0.35} />
        </linearGradient>
        <linearGradient id="l02-mask" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={MASK_HI} />
          <stop offset="1" stopColor={MASK} />
        </linearGradient>
        <linearGradient id="l02-supL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={water ? '#4d88ba' : '#41454b'} />
          <stop offset="1" stopColor={water ? '#356c9b' : '#2b2e33'} />
        </linearGradient>
        <linearGradient id="l02-supR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={water ? '#3a6f9c' : '#2f3237'} />
          <stop offset="1" stopColor={water ? '#285680' : '#1d1f23'} />
        </linearGradient>
        <linearGradient id="l02-supT" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={water ? '#78acd6' : '#5a5f66'} />
          <stop offset="1" stopColor={water ? '#5590c0' : '#40444a'} />
        </linearGradient>
        <linearGradient id="l02-plT" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4a50" />
          <stop offset="1" stopColor="#2a2a2e" />
        </linearGradient>
        <linearGradient id="l02-plL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#303035" />
          <stop offset="1" stopColor="#1c1c1f" />
        </linearGradient>
        <radialGradient id="l02-solder" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#dfe3e8" />
          <stop offset="0.8" stopColor="#9aa1a9" />
          <stop offset="1" stopColor="#7c838b" />
        </radialGradient>
        <linearGradient id="l02-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9c6f16" />
          <stop offset="0.45" stopColor="#ffe39a" />
          <stop offset="1" stopColor="#a87a1e" />
        </linearGradient>
        <filter id="l02-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id="l02-blur1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* soft shadows on the bench */}
      <g opacity={0.22} filter="url(#l02-soft)">
        <polygon points={pts([iso(0, 0, -3), iso(BW + 4, 0, -3), iso(BW + 4, BD + 6, -3), iso(4, BD + 6, -3)].map(([x, y]) => [x + 3, y + 4] as V2))} fill="#3c2d14" />
        <polygon points={pts([iso(SUP.x, SUP.y, -3), iso(SUP.x + SUP.w + 4, SUP.y, -3), iso(SUP.x + SUP.w + 4, SUP.y + SUP.d + 5, -3), iso(SUP.x, SUP.y + SUP.d + 5, -3)])} fill="#3c2d14" />
      </g>

      {/* ---------- board ---------- */}
      <polygon points={board.left} fill="#cbb781" />
      <polygon points={board.right} fill="#a38d58" />
      <polygon points={board.top} fill="url(#l02-mask)" />
      {/* mounting holes */}
      {[[5, 5], [BW - 5, 5], [BW - 5, BD - 5], [5, BD - 5]].map(([x, y], i) => {
        const [cx, cy] = iso(x, y)
        const e = ellR(2.2)
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={e.rx} ry={e.ry} fill="#d3d6da" />
            <ellipse cx={cx} cy={cy} rx={e.rx * 0.55} ry={e.ry * 0.55} fill="#2a241a" />
          </g>
        )
      })}

      {/* light pool */}
      {bright > 0.02 && (
        <ellipse
          cx={iso(D1.x, D1.y)[0]}
          cy={iso(D1.x, D1.y)[1]}
          {...ellRxy(16 + 14 * bright)}
          fill="url(#l02-glow)"
          opacity={Math.min(1, bright * 0.9)}
          className="l02-fade"
        />
      )}
      {burnt && <ellipse cx={iso(D1.x, D1.y)[0]} cy={iso(D1.x, D1.y)[1]} {...ellRxy(9)} fill="#120c06" opacity={0.45} filter="url(#l02-blur1)" />}

      {/* ---------- copper (circuit view) ---------- */}
      <g className="l02-fade" opacity={water ? 0.25 : 1}>
        {[tracePlus, traceMid, traceMinus].map((t, i) => (
          <g key={i}>
            <polyline points={poly(t)} fill="none" stroke={COPPER} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={poly(t)} fill="none" stroke={COPPER_HI} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} transform="translate(-0.4 -0.6)" />
          </g>
        ))}
        {[[R1.a, RY], [R1.b, RY], [D1.x, D1.a], [D1.x, D1.k], J1.p1, J1.p2].map(([x, y], i) => {
          const [cx, cy] = iso(x, y)
          const e = ellR(2.9)
          return (
            <g key={i}>
              <ellipse cx={cx} cy={cy} rx={e.rx} ry={e.ry} fill="#d3d6da" />
              <ellipse cx={cx} cy={cy} rx={e.rx * 0.42} ry={e.ry * 0.42} fill="#1b1a17" />
            </g>
          )
        })}
      </g>

      {/* solder joints around the through-hole leads */}
      <g className="l02-fade" opacity={water ? 0 : 1}>
        {[[R1.a, RY], [R1.b, RY], [D1.x, D1.a], [D1.x, D1.k]].map(([x, y], i) => {
          const [cx, cy] = iso(x, y)
          const e = ellR(2.5)
          return (
            <g key={i}>
              <ellipse cx={cx} cy={cy - 0.4} rx={e.rx} ry={e.ry + 0.6} fill="url(#l02-solder)" />
              <ellipse cx={cx - 0.8} cy={cy - 0.9} rx={0.9} ry={0.45} fill="#fff" opacity={0.8} />
            </g>
          )
        })}
      </g>

      {/* silkscreen */}
      <g fill={SILK} fontFamily="IBM Plex Mono, monospace" fontWeight={600} opacity={water ? 0.35 : 0.95} className="l02-fade">
        <g transform={faceTop(R1.body0 + 2, RY + 7, 0)}>
          <text fontSize={4.2}>R1</text>
          <text x={11} fontSize={3.4} opacity={0.85}>{fmtOhms(R).replace(' ', '')}</text>
        </g>
        <g transform={faceTop(D1.x - 17, D1.y + 1.5, 0)}>
          <text fontSize={4.2}>D1</text>
        </g>
        <g transform={faceTop(D1.x - 9.5, D1.a + 1.5, 0)}>
          <text fontSize={4} fontWeight={700}>+</text>
        </g>
        <g transform={faceTop(20, J1.p1[1] - 5, 0)}>
          <text fontSize={4.2}>J1</text>
        </g>
        <g transform={faceTop(21, J1.p1[1] + 1.6, 0)}>
          <text fontSize={3.2}>+V</text>
        </g>
        <g transform={faceTop(19, J1.p2[1] + 4.4, 0)}>
          <text fontSize={3.2}>GND</text>
        </g>
        <g transform={faceTop(58, BD - 2.6, 0)}>
          <text fontSize={3.4} opacity={0.75}>
            LEARN PCB · L02
          </text>
        </g>
        {/* the circuit's own schematic, printed on the silkscreen */}
        <g transform={faceTop(26, 21, 0)} stroke={SILK} strokeWidth={0.55} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
          <path d="M 4 9 V 2 H 15 M 29 2 H 44 V 9 M 44 15.5 V 24 H 4 V 14" />
          <line x1={0} y1={9} x2={8} y2={9} strokeWidth={0.8} />
          <line x1={1.8} y1={11.6} x2={6.2} y2={11.6} strokeWidth={1.3} />
          <path d="M 4 11.6 V 14" />
          <rect x={15} y={0.4} width={14} height={3.2} />
          <path d="M 40.5 9 H 47.5 L 44 15 Z" />
          <line x1={40.5} y1={15.5} x2={47.5} y2={15.5} />
          <path d="M 48.5 10 l 3 -1.6 M 49 12.6 l 3 -1.6" strokeWidth={0.45} />
          <path d="M 19 24 h 8 m -2 -1.4 l 2 1.4 l -2 1.4" stroke={COPPER_HI} />
          <g stroke="none" fill={SILK} fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
            <text x={9} y={8.6} fontSize={2.6}>+</text>
            <text x={19.4} y={8.2} fontSize={2.6}>R1</text>
            <text x={34} y={13.2} fontSize={2.6}>D1</text>
            <text x={20.2} y={21.8} fontSize={2.4} fill={COPPER_HI}>I</text>
          </g>
        </g>
        {/* LED outline with cathode flat */}
        <path
          d={silkCircle(D1.x, D1.y, 7.2, 'k')}
          fill="none"
          stroke={SILK}
          strokeWidth={0.6}
          opacity={0.9}
        />
      </g>

      {/* ---------- pipes (water view) ---------- */}
      <g className="l02-fade" opacity={water ? 1 : 0} style={{ pointerEvents: 'none' }}>
        {[tracePlus, traceMid, traceMinus].map((t, i) => (
          <g key={i}>
            <polyline points={poly(t)} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" transform="translate(1 1.5)" />
            <Pipe ps={lift(t, PZ)} w={6.4} />
          </g>
        ))}
        {/* narrow section */}
        <polyline points={poly([[R1.a, RY, 0], [R1.b, RY, 0]])} fill="none" stroke="#000" strokeOpacity={0.15} strokeWidth={6.5} transform="translate(1 1.5)" />
        <Pipe ps={[[R1.a, RY, PZ], [R1.a + 6, RY, PZ]]} w={6.4} cap="butt" />
        <Pipe ps={[[R1.b - 6, RY, PZ], [R1.b, RY, PZ]]} w={6.4} cap="butt" />
        <Pipe ps={[[R1.a + 5.5, RY, PZ], [R1.b - 5.5, RY, PZ]]} w={narrowW} cap="butt" />
        {[R1.a + 6, R1.b - 6].map((x) => (
          <line key={x} {...seg([x - 0.8, RY, PZ], [x + 0.8, RY, PZ])} stroke={PIPE_DK} strokeWidth={8.4} />
        ))}
      </g>

      {/* ---------- moving charges / droplets (board layer) ---------- */}
      <g ref={lowRef} style={{ filter: water ? undefined : 'drop-shadow(0 0 1.2px #ffb347)' }}>
        {Array.from({ length: N }, (_, i) => (
          <circle key={i} r={1.25} fill={water ? WATER : '#fff3c4'} stroke={water ? '#dceeff' : '#ff9d2e'} strokeWidth={0.45} visibility="hidden" />
        ))}
      </g>

      {/* contact shadows */}
      <g opacity={0.35} filter="url(#l02-blur1)" style={{ pointerEvents: 'none' }}>
        <polyline points={poly([[R1.body0, RY + 1.5, 0], [R1.body1, RY + 1.5, 0]])} stroke="#0c2416" strokeWidth={4} strokeLinecap="round" fill="none" />
        {!water && <ellipse cx={iso(D1.x + 1, D1.y + 1)[0]} cy={iso(D1.x + 1, D1.y + 1)[1]} {...ellRxy(6)} fill="#0c2416" />}
      </g>

      {/* ---------- R1 ---------- */}
      <g className="l02-fade" opacity={water ? 0 : 1}>
        <polyline points={poly([[R1.a, RY, 0], [R1.a, RY, R1.z], [R1.body0, RY, R1.z]])} fill="none" stroke={METAL} strokeWidth={1.1} strokeLinejoin="round" />
        <polyline points={poly([[R1.body1, RY, R1.z], [R1.b, RY, R1.z], [R1.b, RY, 0]])} fill="none" stroke={METAL} strokeWidth={1.1} strokeLinejoin="round" />
        <line x1={rA[0]} y1={rA[1] + 3} x2={rB[0]} y2={rB[1] + 3} stroke="#000" strokeOpacity={0.25} strokeWidth={rw * 0.8} strokeLinecap="round" filter="url(#l02-blur1)" />
        <line x1={rA[0]} y1={rA[1]} x2={rB[0]} y2={rB[1]} stroke="#dcc493" strokeWidth={rw} strokeLinecap="round" />
        {bandXs.map(([x, c], i) => (
          <line key={i} {...seg([x - 0.75, RY, R1.z], [x + 0.75, RY, R1.z])} stroke={c} strokeWidth={rw} />
        ))}
        {hot && <line x1={rA[0]} y1={rA[1]} x2={rB[0]} y2={rB[1]} stroke="#ff4a1c" strokeWidth={rw} strokeLinecap="round" opacity={Math.min(0.55, (PR - RATING_W) * 2 + 0.2)} className="l02-hot" />}
        <line x1={rA[0]} y1={rA[1] + 1.9} x2={rB[0]} y2={rB[1] + 1.9} stroke="#000" strokeOpacity={0.16} strokeWidth={2.4} strokeLinecap="round" />
        <line x1={rA[0] + 1} y1={rA[1] - 1.9} x2={rB[0] - 1} y2={rB[1] - 1.9} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />
        {hot && (
          <g className="l02-heat" stroke="#e0542c" strokeWidth={0.8} fill="none" strokeLinecap="round" opacity={0.8}>
            {[0, 1, 2].map((i) => {
              const [hx, hy] = iso(R1.body0 + 4 + i * 7, RY, 9)
              return <path key={i} d={`M ${hx} ${hy} q -1.5 -2.5 0 -5 q 1.5 -2.5 0 -5`} style={{ animationDelay: `${i * 0.35}s` }} />
            })}
          </g>
        )}
      </g>

      {/* ---------- J1 connector ---------- */}
      <IsoBox x={8} y={J1.p1[1] - 4} z={0} w={8} d={16} h={3} top="#3a3a3e" left="url(#l02-plL)" right="#1b1b1d" />
      {/* gold pins visible between base and plug */}
      {[J1.p1[1], J1.p2[1]].map((y) => (
        <line key={y} {...seg([12.6, y + 0.6, 3], [12.6, y + 0.6, 4.2])} stroke="url(#l02-gold)" strokeWidth={1.4} />
      ))}
      <IsoBox x={8.6} y={J1.p1[1] - 3.4} z={4} w={6.8} d={14.8} h={7.5} top="url(#l02-plT)" left="url(#l02-plL)" right="#1d1d20" />
      {/* plug latch + slot detail */}
      <g transform={faceLeft(8.6, J1.p1[1] + 11.4, 11.5)}>
        <rect x={1.6} y={1.4} width={3.6} height={2.2} rx={0.4} fill="#141416" />
        <line x1={0.4} y1={0.3} x2={6.4} y2={0.3} stroke="#fff" strokeOpacity={0.15} strokeWidth={0.3} />
      </g>
      <g transform={faceTop(8.6, J1.p1[1] - 3.4, 11.5)}>
        {[J1.p1[1], J1.p2[1]].map((y) => (
          <rect key={y} x={2.1} y={y - J1.p1[1] + 1.9} width={2.6} height={3} rx={0.5} fill="#121214" />
        ))}
      </g>

      {/* ---------- D1 (LED) or valve ---------- */}
      <g className="l02-fade" opacity={water ? 0 : 1}>
        <Led reversed={reversed} burnt={burnt} bright={bright} />
      </g>
      <g className="l02-fade" opacity={water ? 1 : 0}>
        <Valve flap={flap} closed={bright <= 0.001} />
      </g>

      {/* ---------- supply / pump ---------- */}
      <g>
        {/* rubber feet */}
        {[[SUP.x + 3, SUP.y + SUP.d - 3], [SUP.x + SUP.w - 3, SUP.y + SUP.d - 3], [SUP.x + SUP.w - 3, SUP.y + 3]].map(([fx, fy], i) => {
          const [cx, cy] = iso(fx, fy, SUP.z)
          return <ellipse key={i} cx={cx} cy={cy + 0.6} rx={2.4} ry={1.2} fill="#141416" />
        })}
        <polygon points={sup.left} fill="url(#l02-supL)" stroke="rgba(0,0,0,0.35)" strokeWidth={0.3} strokeLinejoin="round" />
        <polygon points={sup.right} fill="url(#l02-supR)" stroke="rgba(0,0,0,0.35)" strokeWidth={0.3} strokeLinejoin="round" />
        <polygon points={sup.top} fill="url(#l02-supT)" stroke="rgba(0,0,0,0.25)" strokeWidth={0.3} strokeLinejoin="round" />
        {/* vent slots on the lid */}
        <g transform={faceTop(SUP.x + 4, SUP.y + 3, SUP.z + SUP.h)} opacity={0.55}>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={i * 2.6} y={0} width={1.2} height={9} rx={0.6} fill="#1a1b1e" />
          ))}
        </g>
        {/* front bezel */}
        <g transform={faceLeft(SUP.x, SUP.y + SUP.d, SUP.z + SUP.h)}>
          <rect x={1} y={1} width={SUP.w - 2} height={SUP.h - 2} rx={1.2} fill="none" stroke="#fff" strokeOpacity={0.08} strokeWidth={0.5} />
        </g>
        {/* edge highlight */}
        <polyline points={pts([iso(SUP.x, SUP.y + SUP.d, SUP.z + SUP.h), iso(SUP.x + SUP.w, SUP.y + SUP.d, SUP.z + SUP.h), iso(SUP.x + SUP.w, SUP.y, SUP.z + SUP.h)])} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={0.6} />
        {/* front-left face: display or gauge */}
        <g transform={faceLeft(SUP.x, SUP.y + SUP.d, SUP.z + SUP.h)}>
          {!water ? (
            <g>
              <rect x={3} y={3.5} width={19} height={9.5} rx={1.2} fill="#0f1a13" stroke="#000" strokeWidth={0.4} />
              <text x={19.5} y={11.2} fontSize={7.2} textAnchor="end" fill="#8affb8" fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
                {V.toFixed(1)}
              </text>
              <text x={20.6} y={11.2} fontSize={3} fill="#8affb8" fontFamily="IBM Plex Mono, monospace">
                V
              </text>
              <text x={3} y={18} fontSize={2.6} fill="#e3a361" fontFamily="IBM Plex Mono, monospace" fontWeight={600} letterSpacing={0.4}>
                DC SUPPLY
              </text>
              <rect x={3} y={19.4} width={11} height={0.5} fill="#e0542c" />
            </g>
          ) : (
            <g>
              <circle cx={10} cy={10} r={7.2} fill="#f4f1e8" stroke="#1e3d58" strokeWidth={0.8} />
              {Array.from({ length: 13 }, (_, i) => {
                const a = ((-120 + i * 20) * Math.PI) / 180
                return <line key={i} x1={10 + Math.sin(a) * 5.6} y1={10 - Math.cos(a) * 5.6} x2={10 + Math.sin(a) * 6.6} y2={10 - Math.cos(a) * 6.6} stroke="#1e3d58" strokeWidth={0.35} />
              })}
              <line x1={10} y1={10} x2={10 + Math.sin((gaugeAng * Math.PI) / 180) * 5.2} y2={10 - Math.cos((gaugeAng * Math.PI) / 180) * 5.2} stroke="#e0542c" strokeWidth={0.7} strokeLinecap="round" />
              <circle cx={10} cy={10} r={0.9} fill="#1e3d58" />
              <text x={20} y={9} fontSize={2.6} fill="#e8f2fb" fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
                PUMP
              </text>
              <text x={20} y={13} fontSize={2.4} fill="#cfe2f2" fontFamily="IBM Plex Mono, monospace">
                {V.toFixed(1)}
              </text>
            </g>
          )}
        </g>
        {/* front-right face: knob or impeller window */}
        <g transform={faceRight(SUP.x + SUP.w, SUP.y + SUP.d, SUP.z + SUP.h)}>
          {!water ? (
            <g>
              <circle cx={14} cy={10} r={5.4} fill="#1d1e21" />
              <circle cx={14} cy={10} r={4.4} fill="#4a4e55" />
              <g transform={`rotate(${-135 + ((V - 3) / 9) * 270} 14 10)`}>
                <line x1={14} y1={10} x2={14} y2={6.2} stroke="#e3a361" strokeWidth={0.8} strokeLinecap="round" />
              </g>
              <text x={14} y={19} fontSize={2.4} textAnchor="middle" fill="#9a9a9a" fontFamily="IBM Plex Mono, monospace" letterSpacing={0.3}>
                VOLTS
              </text>
            </g>
          ) : (
            <g>
              <circle cx={14} cy={11} r={6.6} fill="#163a5c" stroke="#9cc3e4" strokeWidth={0.6} />
              <g ref={impRef}>
                {[0, 90, 180, 270].map((a) => (
                  <path key={a} d="M 14 11 Q 16.5 8.5 14.6 5" stroke="#cfe6fa" strokeWidth={1.1} fill="none" strokeLinecap="round" transform={`rotate(${a} 14 11)`} />
                ))}
              </g>
              <circle cx={14} cy={11} r={1.1} fill="#cfe6fa" />
            </g>
          )}
        </g>
        {/* binding posts / outlets */}
        {[POST_P, POST_N].map((q, i) => (
          <g key={i}>
            <path d={cylSide(q[0], q[1], q[2], q[2] + POST_H, 2.1)} fill={water ? PIPE : i === 0 ? '#c62f25' : '#18181a'} />
            <ellipse cx={iso(q[0], q[1], q[2] + POST_H)[0]} cy={iso(q[0], q[1], q[2] + POST_H)[1]} {...ellRxy(2.1)} fill={water ? PIPE_HI : i === 0 ? '#e5493d' : '#3a3a3e'} />
          </g>
        ))}
        {!water && (
          <g fontFamily="IBM Plex Mono, monospace" fontWeight={700} fill="#e9e5db">
            <g transform={faceTop(-56, 74.2, 19)}>
              <text fontSize={3.6}>+</text>
            </g>
            <g transform={faceTop(-56, 85.2, 19)}>
              <text fontSize={3.6}>−</text>
            </g>
          </g>
        )}
      </g>

      {/* ---------- wires / hoses ---------- */}
      {[wirePlus, wireMinus].map((w, i) => (
        <g key={i}>
          {water ? (
            <Pipe ps={w} w={5.2} />
          ) : (
            <g>
              <polyline points={poly(w)} fill="none" stroke={i === 0 ? '#c62f25' : '#1f1f22'} strokeWidth={2.6} strokeLinecap="round" />
              <polyline points={poly(w)} fill="none" stroke="#fff" strokeOpacity={i === 0 ? 0.35 : 0.22} strokeWidth={0.7} strokeLinecap="round" transform="translate(-0.5 -0.6)" />
            </g>
          )}
        </g>
      ))}

      {/* ---------- dots on wires (top layer) ---------- */}
      <g ref={topRef} style={{ filter: water ? undefined : 'drop-shadow(0 0 1.2px #ffb347)' }}>
        {Array.from({ length: N }, (_, i) => (
          <circle key={i} r={1.25} fill={water ? WATER : '#fff3c4'} stroke={water ? '#dceeff' : '#ff9d2e'} strokeWidth={0.45} visibility="hidden" />
        ))}
      </g>

      {/* ---------- LED glow (over everything) ---------- */}
      {!water && bright > 0.02 && (
        <circle cx={ledTop[0]} cy={ledTop[1]} r={domeR * (2.2 + 2.2 * bright)} fill="url(#l02-glow)" opacity={Math.min(1, 0.25 + bright * 0.8)} style={{ pointerEvents: 'none' }} className="l02-fade" />
      )}
      {status === 'over' && !water && (
        <circle cx={ledTop[0]} cy={ledTop[1]} r={domeR * 1.6} fill="none" stroke="#e0542c" strokeWidth={px(1.5)} className="l02-warnring" />
      )}

      {/* ---------- pop & smoke ---------- */}
      {burnt && p.popKey > 0 && (
        <g key={p.popKey} style={{ pointerEvents: 'none' }}>
          <circle cx={ledTop[0]} cy={ledTop[1]} r={domeR * 3} fill="#fffbe8" className="l02-flash" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={ledTop[0] + (i - 2) * 2.2}
              cy={ledTop[1] - 2}
              r={2.6 + (i % 2) * 1.2}
              fill="#8b8579"
              className="l02-smoke"
              style={{ animationDelay: `${0.15 + i * 0.22}s` }}
            />
          ))}
        </g>
      )}

      {/* ---------- labels ---------- */}
      <Labels {...p} PR={PR} />
    </g>
  )
}

function seg(a: V3, b: V3) {
  const [x1, y1] = isoP(a)
  const [x2, y2] = isoP(b)
  return { x1, y1, x2, y2 }
}

function ellRxy(r: number) {
  return ellR(r)
}

function silkCircle(cx: number, cy: number, r: number, flatSide: 'k') {
  // a circle with a flat on the cathode (+y) side, drawn in world space
  void flatSide
  const ps: V2[] = []
  const flatY = cy + r * 0.78
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2
    let x = cx + Math.cos(a) * r
    let y = cy + Math.sin(a) * r
    if (y > flatY) {
      y = flatY
      x = cx + Math.cos(a) * r
    }
    ps.push(iso(x, y))
  }
  return 'M ' + ps.map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' L ')
}

function IsoBox({ x, y, z, w, d, h, top, left, right }: { x: number; y: number; z: number; w: number; d: number; h: number; top: string; left: string; right: string }) {
  const b = box(x, y, z, w, d, h)
  return (
    <g stroke="rgba(0,0,0,0.4)" strokeWidth={0.25} strokeLinejoin="round">
      <polygon points={b.left} fill={left} />
      <polygon points={b.right} fill={right} />
      <polygon points={b.top} fill={top} />
      <polyline points={pts([iso(x, y + d, z + h), iso(x + w, y + d, z + h), iso(x + w, y, z + h)])} fill="none" stroke="#fff" strokeOpacity={0.16} strokeWidth={0.35} />
    </g>
  )
}

function Pipe({ ps, w, cap = 'round' }: { ps: V3[]; w: number; cap?: 'round' | 'butt' }) {
  const s = poly(ps)
  return (
    <g>
      <polyline points={s} fill="none" stroke={PIPE_DK} strokeWidth={w + 0.9} strokeLinecap={cap} strokeLinejoin="round" />
      <polyline points={s} fill="none" stroke={PIPE} strokeWidth={w} strokeLinecap={cap} strokeLinejoin="round" />
      <polyline points={s} fill="none" stroke={PIPE_HI} strokeWidth={Math.max(0.5, w * 0.22)} strokeLinecap={cap} strokeLinejoin="round" transform={`translate(0 ${-w * 0.25})`} opacity={0.9} />
    </g>
  )
}

function Led({ reversed, burnt, bright }: { reversed: boolean; burnt: boolean; bright: number }) {
  const { x, y } = D1
  const legs: [number, number][] = [
    [x, D1.a],
    [x, D1.k],
  ]
  const fl = iso(x, y, 5.4)
  const top = iso(x, y, 11)
  const ef = ellR(5.7)
  const et = ellR(5)
  // the flat on the flange marks the cathode; when reversed it sits on the anode side
  const flatY = reversed ? y - 5.2 : y + 5.2
  const flatA = iso(x - 2.6, flatY, 5.4)
  const flatB = iso(x + 2.6, flatY, 5.4)
  return (
    <g>
      {legs.map(([lx, ly], i) => (
        <line key={i} {...seg([lx, ly, 0], [lx, ly, 4.2])} stroke={METAL} strokeWidth={1} />
      ))}
      {/* flange */}
      <path d={cylSide(x, y, 4.2, 5.4, 5.7)} fill="url(#l02-dome)" />
      <path d={cylSide(x, y, 4.2, 5.4, 5.7)} fill="url(#l02-cyl)" />
      <ellipse cx={fl[0]} cy={fl[1]} rx={ef.rx} ry={ef.ry} fill="url(#l02-dome)" />
      {/* body */}
      <path d={cylSide(x, y, 5.4, 11, 5)} fill="url(#l02-dome)" opacity={0.96} />
      <path d={cylSide(x, y, 5.4, 11, 5)} fill="url(#l02-cyl)" />
      <ellipse cx={top[0]} cy={top[1]} rx={et.rx} ry={et.ry} fill="url(#l02-dome)" />
      {/* dome */}
      <path d={`M ${top[0] - et.rx} ${top[1]} A ${et.rx} ${et.rx} 0 0 1 ${top[0] + et.rx} ${top[1]} A ${et.rx} ${et.ry} 0 0 1 ${top[0] - et.rx} ${top[1]} Z`} fill="url(#l02-dome)" />
      {/* the die inside */}
      <g opacity={burnt ? 0.8 : 0.55}>
        <path d={`M ${top[0] - 2.2} ${top[1] + 6.5} l 0 -6 l 2.4 -1 l 0 7 Z`} fill="#2a1d18" />
        <path d={`M ${top[0] + 0.8} ${top[1] + 6.5} l 0 -4.5 l 1.4 0 l 0 4.5 Z`} fill="#2a1d18" />
      </g>
      {burnt && <path d={`M ${top[0] - 1} ${top[1] - 5} l 1.6 2.2 l -1.2 1.4 l 1.8 2`} stroke="#1b130e" strokeWidth={0.5} fill="none" />}
      {/* flat (cathode) */}
      <line x1={flatA[0]} y1={flatA[1]} x2={flatB[0]} y2={flatB[1]} stroke="#fff" strokeOpacity={0.55} strokeWidth={0.6} />
      {/* specular */}
      <ellipse cx={top[0] - 2.4} cy={top[1] - 3.2} rx={1.5} ry={2.4} fill="#fff" opacity={0.55} transform={`rotate(25 ${top[0] - 2.4} ${top[1] - 3.2})`} />
      {bright > 0.02 && <circle cx={top[0]} cy={top[1] - 0.5} r={3 + bright * 2} fill="#fff" opacity={Math.min(0.75, bright * 0.6)} filter="url(#l02-blur1)" />}
    </g>
  )
}

function Valve({ flap, closed }: { flap: number; closed: boolean }) {
  const X = D1.x - 6
  const Y = D1.y - 6
  const b = box(X, Y, 0, 12, 12, 11)
  const a = (flap * Math.PI) / 180
  return (
    <g>
      <polygon points={b.left} fill="#9fb3c2" />
      <polygon points={b.right} fill="#7f97aa" />
      <polygon points={b.top} fill="#c2d2de" />
      {/* one-way arrow on the lid, pointing along +y (direction of flow) */}
      <g transform={faceTop(X, Y, 11)}>
        <path d="M 6 2.4 L 6 8.6 M 3.6 6.4 L 6 9 L 8.4 6.4" stroke="#2c4a62" strokeWidth={0.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={3.6} y1={9.8} x2={8.4} y2={9.8} stroke="#2c4a62" strokeWidth={0.9} strokeLinecap="round" />
      </g>
      {/* window with the flap (front-right face) */}
      <g transform={faceRight(X + 12, Y + 12, 11)}>
        <circle cx={6} cy={5.6} r={4.4} fill="#163a5c" stroke="#e2edf4" strokeWidth={0.5} />
        <line x1={6} y1={1.8} x2={6 - Math.sin(a) * 7.2} y2={1.8 + Math.cos(a) * 7.2} stroke={closed ? '#e0542c' : '#ffd9a8'} strokeWidth={1.1} strokeLinecap="round" style={{ transition: 'all .4s' }} />
        <circle cx={6} cy={1.8} r={0.7} fill="#e2edf4" />
      </g>
    </g>
  )
}

/* ---------------- labels ---------------- */
function Labels({ V, R, led, I, water, reversed, status, k, compact, PR }: ArtProps & { PR: number }) {
  const L = LEDS[led]
  const u = 1 / k
  const mW = PR * 1000 >= 100 ? (PR * 1000).toFixed(0) : (PR * 1000).toFixed(1)
  const ledBad = reversed || status === 'burnt'
  const supAt = iso(SUP.x + 4, SUP.y + SUP.d, SUP.z)
  const items: { at: V2; dx: number; dy: number; title: string; value: ReactNode; tone?: string }[] = water
    ? [
        { at: supAt, dx: compact ? 4 : 0, dy: 26, title: compact ? 'Pump' : 'Pump = supply', value: `${V.toFixed(1)} V${compact ? '' : ' of push'}` },
        { at: iso(50, RY, PZ + 3), dx: compact ? -6 : 6, dy: -46, title: compact ? 'Narrow pipe' : 'Narrow pipe = resistor', value: compact ? fmtOhms(R) : `${fmtOhms(R)} squeeze` },
        { at: iso(D1.x, D1.y - 4, 11), dx: compact ? 6 : 30, dy: compact ? -56 : -40, title: compact ? 'Valve' : 'Valve = LED', value: `opens at ${L.vf.toFixed(1)} V` },
        { at: iso(30, BOT, PZ + 2), dx: compact ? 6 : -34, dy: compact ? 46 : 58, title: compact ? 'Flow' : 'Flow = current', value: `${(I * 1000).toFixed(1)} mA` },
      ]
    : [
        { at: supAt, dx: compact ? 4 : 0, dy: 26, title: 'Supply', value: `${V.toFixed(1)} V` },
        {
          at: iso(50, RY, 8),
          dx: compact ? -6 : 6,
          dy: -46,
          title: compact ? 'R1' : 'R1 · resistor',
          value: compact ? `${fmtOhms(R)}` : `${fmtOhms(R)} · ${mW} mW`,
          tone: PR > RATING_W ? 'var(--bad)' : undefined,
        },
        {
          at: iso(D1.x, D1.y, 17),
          dx: compact ? 6 : 30,
          dy: compact ? -50 : -40,
          title: compact ? 'D1' : `D1 · ${L.name} LED`,
          value: reversed ? 'backwards!' : status === 'burnt' ? 'burnt out' : `Vf ≈ ${L.vf.toFixed(1)} V`,
          tone: ledBad ? 'var(--bad)' : undefined,
        },
      ]
  const fs1 = (compact ? 9 : 10) * u
  const fs2 = (compact ? 11.5 : 13) * u
  return (
    <g style={{ pointerEvents: 'none' }}>
      {items.map((it, i) => {
        const ex = it.at[0] + it.dx * u
        const ey = it.at[1] + it.dy * u
        const anchor = it.dx > 2 ? 'start' : it.dx < -2 ? 'end' : 'middle'
        const tx = ex + (anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0) * u
        const below = it.dy > 0
        return (
          <g key={i} className="l02-label">
            <line x1={it.at[0]} y1={it.at[1]} x2={ex} y2={ey} stroke="var(--ink-3)" strokeWidth={u} />
            <circle cx={it.at[0]} cy={it.at[1]} r={2.2 * u} fill="var(--card)" stroke="var(--ink-2)" strokeWidth={u * 1.2} />
            <text x={tx} y={below ? ey + 11 * u : ey - 3 * u} fontSize={fs1} textAnchor={anchor} className="l02-label__t">
              {it.title.toUpperCase()}
            </text>
            <text x={tx} y={below ? ey + 25 * u : ey + 11 * u} fontSize={fs2} textAnchor={anchor} className="l02-label__v" style={{ fill: it.tone }}>
              {it.value}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/* ---------------- colour utils ---------------- */
function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}
export function mixWhite(h: string, t: number) {
  const [r, g, b] = hexToRgb(h)
  t = Math.max(0, Math.min(1, t))
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
}
function shade(h: string, f: number) {
  const [r, g, b] = hexToRgb(h)
  return rgbToHex(r * f, g * f, b * f)
}
