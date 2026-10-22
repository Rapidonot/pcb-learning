import { useMemo } from 'react'
import type { LessonContent } from '../types'
import { Callout, Keys } from '@/components/ui'
import { Figure, Menu, Specs, Compare } from '@/components/content'
import { BoardView } from '@/pcb/render'
import { stages } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { Scene } from './Scene'
import { ViaSection, ViaPlan, SectionDefs } from './ViaSection'
import './lesson11.css'

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

/** Isometric "flyover": two copper layers, one track hops under another through two vias. */
function Flyover() {
  const C = Math.cos(Math.PI / 6)
  const S = Math.sin(Math.PI / 6)
  const k = 9
  const P = (x: number, y: number, z: number) => [(x - y) * C * k + 260, (x + y) * S * k - z * k + 80] as const
  const pts = (arr: [number, number, number][]) => arr.map((p) => P(...p).join(',')).join(' ')
  const plane = (z: number) => pts([[0, 0, z], [26, 0, z], [26, 18, z], [0, 18, z]])
  const TOP = 7
  const BOT = 0
  const track = (a: [number, number, number][], color: string, key: string) => (
    <g key={key}>
      <polyline points={pts(a)} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={8} strokeLinecap="round" transform="translate(1.5 2.5)" />
      <polyline points={pts(a)} fill="none" stroke={color} strokeWidth={6.5} strokeLinecap="round" />
      <polyline points={pts(a)} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.6} strokeLinecap="round" transform="translate(-0.8 -1.2)" />
    </g>
  )
  const pad = (x: number, y: number, z: number, key: string) => {
    const [cx, cy] = P(x, y, z)
    return (
      <g key={key}>
        <ellipse cx={cx} cy={cy} rx={8} ry={4.6} fill="url(#fly-ring)" stroke="#8b8b8b" strokeWidth={0.6} />
        <ellipse cx={cx} cy={cy} rx={3.2} ry={1.9} fill="#161616" />
      </g>
    )
  }
  const barrel = (x: number, y: number) => {
    const [ax, ay] = P(x, y, TOP)
    const [, by] = P(x, y, BOT)
    return <rect key={`b${x}${y}`} x={ax - 3.4} y={ay} width={6.8} height={by - ay} fill="url(#fly-barrel)" />
  }
  const vias: [number, number][] = [
    [13, 5],
    [13, 13],
  ]
  return (
    <svg viewBox="0 0 520 330" role="img" aria-label="A red top-layer track jumps under a blue bottom-layer track using two vias">
      <defs>
        <linearGradient id="fly-bot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6c8fdc" stopOpacity={0.18} />
          <stop offset="1" stopColor="#24356a" stopOpacity={0.3} />
        </linearGradient>
        <linearGradient id="fly-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf7" stopOpacity={0.75} />
          <stop offset="1" stopColor="#e8dfcc" stopOpacity={0.55} />
        </linearGradient>
        <radialGradient id="fly-ring" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#cfcfcf" />
          <stop offset="1" stopColor="#8a8a8a" />
        </radialGradient>
        <linearGradient id="fly-barrel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b3a14" />
          <stop offset="0.35" stopColor="#f2bd85" />
          <stop offset="0.6" stopColor="#c47a3a" />
          <stop offset="1" stopColor="#5b3013" />
        </linearGradient>
        <filter id="fly-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3b2a10" floodOpacity="0.18" />
        </filter>
      </defs>
      {/* bottom plane */}
      <polygon points={plane(BOT)} fill="url(#fly-bot)" stroke="var(--ink-3)" strokeWidth={0.8} strokeDasharray="4 3" />
      {track([[13, 5, BOT], [13, 13, BOT]], EDA.bottom, 'bt')}
      {vias.map(([x, y]) => pad(x, y, BOT, `pb${x}${y}`))}
      {vias.map(([x, y]) => barrel(x, y))}
      {/* top plane */}
      <polygon points={plane(TOP)} fill="url(#fly-top)" stroke="var(--ink-3)" strokeWidth={0.8} filter="url(#fly-shadow)" />
      {track([[1, 9, TOP], [25, 9, TOP]], EDA.top, 't1')}
      {track([[13, 1, TOP], [13, 5, TOP]], EDA.top, 't2')}
      {track([[13, 13, TOP], [13, 17, TOP]], EDA.top, 't3')}
      {vias.map(([x, y]) => pad(x, y, TOP, `pt${x}${y}`))}
      <g fontFamily="var(--font-mono)" fontSize={10.5} fontWeight={600} letterSpacing={1.2} fill="var(--ink-2)">
        <text x={P(25, 9, TOP)[0] + 10} y={P(25, 9, TOP)[1] + 4}>
          TRACK B (TOP)
        </text>
        <text x={P(13, 1, TOP)[0] + 12} y={P(13, 1, TOP)[1] - 2}>
          TRACK A
        </text>
        <text x={P(13, 9, BOT)[0] + 18} y={P(13, 9, BOT)[1] + 22} fill={EDA.bottom}>
          …DIVES UNDER ON THE BOTTOM
        </text>
        <text x={P(13, 13, TOP)[0] + 14} y={P(13, 13, TOP)[1] + 18}>
          VIA
        </text>
        <text x={P(0, 18, TOP)[0] - 10} y={P(0, 18, TOP)[1] + 4} fill="var(--ink-3)" textAnchor="end">
          TOP
        </text>
        <text x={P(0, 18, BOT)[0] - 10} y={P(0, 18, BOT)[1] + 4} fill="var(--ink-3)" textAnchor="end">
          BOTTOM
        </text>
      </g>
    </svg>
  )
}

function ViaTypes() {
  // 4-layer stack in mm, side view
  const p = 'vtypes'
  const L = [0.25, 0.75, 1.25, 1.75] // copper layer y positions
  const x0 = 0.25
  const x1 = 4.75
  const cu = 0.07
  const hole = 0.2
  const plate = 0.035
  const barrel = (x: number, yA: number, yB: number, key: string) => (
    <g key={key}>
      <rect x={x - hole / 2 - plate} y={yA} width={hole + plate * 2} height={yB - yA} fill="var(--paper-2)" />
      <rect x={x - hole / 2} y={yA} width={hole} height={yB - yA} fill={`url(#${p}-tube)`} />
      <rect x={x - hole / 2 - plate} y={yA} width={plate} height={yB - yA} fill={`url(#${p}-plateL)`} />
      <rect x={x + hole / 2} y={yA} width={plate} height={yB - yA} fill={`url(#${p}-plateR)`} />
      {[yA, yB - cu].map((y, i) => (
        <g key={i}>
          <rect x={x - 0.25} y={y} width={0.25 - hole / 2 - plate} height={cu} fill={`url(#${p}-cu)`} />
          <rect x={x + hole / 2 + plate} y={y} width={0.25 - hole / 2 - plate} height={cu} fill={`url(#${p}-cu)`} />
        </g>
      ))}
    </g>
  )
  const holes = [
    { x: 1.1, a: L[0] - cu, b: L[3] + cu },
    { x: 2.5, a: L[0] - cu, b: L[1] + cu },
    { x: 3.9, a: L[1] - cu, b: L[2] + cu },
  ]
  const lab = { fontFamily: 'var(--font-mono)', fontSize: 0.115, fontWeight: 600, letterSpacing: 0.012 } as const
  return (
    <svg viewBox="0 0 5.1 2.45" role="img" aria-label="Through, blind and buried vias in a four-layer board">
      <SectionDefs p={p} />
      <g filter={`url(#${p}-shadow)`}>
        <rect x={x0} y={L[0]} width={x1 - x0} height={L[3] - L[0]} fill={`url(#${p}-weave)`} />
      </g>
      <rect x={x0} y={L[0]} width={x1 - x0} height={L[3] - L[0]} fill={`url(#${p}-resin)`} />
      {/* prepreg between inner layers is a slightly darker band */}
      <rect x={x0} y={L[1]} width={x1 - x0} height={L[2] - L[1]} fill="#000" opacity={0.07} />
      {L.map((y, i) => (
        <g key={i}>
          <rect x={x0} y={y - cu / 2} width={x1 - x0} height={cu} fill={`url(#${p}-cu)`} />
          <rect x={x0} y={y - cu / 2} width={x1 - x0} height={cu * 0.18} fill="#fff" opacity={0.3} />
        </g>
      ))}
      {holes.map((h, i) => barrel(h.x, h.a, h.b, `h${i}`))}
      <g {...lab} textAnchor="middle" fill="var(--ink)">
        <text x={1.1} y={2.08}>THROUGH</text>
        <text x={2.5} y={2.08}>BLIND</text>
        <text x={3.9} y={2.08}>BURIED</text>
      </g>
      <g fontFamily="var(--font-sans)" fontSize={0.1} textAnchor="middle" fill="var(--ink-3)">
        <text x={1.1} y={2.26}>top to bottom: every layer</text>
        <text x={2.5} y={2.26}>outer layer to an inner one</text>
        <text x={3.9} y={2.26}>inner layers only, hidden</text>
      </g>
      <g {...lab} fontSize={0.095} fill="var(--ink-3)">
        {L.map((y, i) => (
          <text key={i} x={x1 + 0.08} y={y + 0.035}>
            L{i + 1}
          </text>
        ))}
      </g>
    </svg>
  )
}

/** Side cut of an SMD pad with a part on it: via beside the pad (good) or inside it (solder drains away). */
function ViaInPad({ inPad }: { inPad: boolean }) {
  const p = inPad ? 'vip1' : 'vip0'
  const W = 4.4
  const top = 1.05 // top of the FR-4
  const core = 1.6
  const cu = 0.07
  const padTop = top - cu
  const padX0 = 1.2
  const padX1 = 2.9
  const viaX = inPad ? 2.35 : 3.7
  const hole = 0.3
  const plate = 0.035
  const ring = 0.6
  const capX0 = 1.0
  const capX1 = 1.85
  const capTop = padTop - 0.62
  const capBot = padTop - (inPad ? 0.03 : 0.07)
  const hx0 = viaX - hole / 2 - plate
  const hx1 = viaX + hole / 2 + plate
  return (
    <svg viewBox={`0 0 ${W} 2.9`} role="img" aria-label={inPad ? 'A via inside a pad: solder drains down the hole' : 'A via beside the pad, joined by a short track'} style={{ display: 'block', width: '100%', height: 'auto', marginBottom: 10 }}>
      <SectionDefs p={p} />
      <defs>
        <linearGradient id={`${p}-sol`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#cfd4da" />
          <stop offset="1" stopColor="#8a9199" />
        </linearGradient>
        <linearGradient id={`${p}-cap`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f5f7" />
          <stop offset="0.5" stopColor="#c3c8ce" />
          <stop offset="1" stopColor="#8d939a" />
        </linearGradient>
        <linearGradient id={`${p}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4a50" />
          <stop offset="1" stopColor="#1c1c1f" />
        </linearGradient>
      </defs>
      {/* FR-4, drilled */}
      <path d={`M 0 ${top} H ${hx0} V ${top + core} H 0 Z M ${hx1} ${top} H ${W} V ${top + core} H ${hx1} Z`} fill={`url(#${p}-weave)`} filter={`url(#${p}-shadow)`} />
      <path d={`M 0 ${top} H ${hx0} V ${top + core} H 0 Z M ${hx1} ${top} H ${W} V ${top + core} H ${hx1} Z`} fill={`url(#${p}-resin)`} />
      {/* barrel + rings */}
      <rect x={viaX - hole / 2} y={padTop} width={hole} height={core + cu * 2} fill={`url(#${p}-tube)`} />
      <rect x={hx0} y={padTop} width={plate} height={core + cu * 2} fill={`url(#${p}-plateL)`} />
      <rect x={viaX + hole / 2} y={padTop} width={plate} height={core + cu * 2} fill={`url(#${p}-plateR)`} />
      <rect x={viaX - ring / 2} y={top + core} width={(ring - hole) / 2 - plate} height={cu} fill={`url(#${p}-cu)`} />
      <rect x={hx1} y={top + core} width={(ring - hole) / 2 - plate} height={cu} fill={`url(#${p}-cu)`} />
      {/* top copper: pad (+ track + ring when the via is beside it) */}
      {inPad ? (
        <>
          <rect x={padX0} y={padTop} width={hx0 - padX0} height={cu} fill={`url(#${p}-cu)`} />
          <rect x={hx1} y={padTop} width={padX1 - hx1} height={cu} fill={`url(#${p}-cu)`} />
        </>
      ) : (
        <>
          <rect x={padX0} y={padTop} width={hx0 - padX0} height={cu} fill={`url(#${p}-cu)`} />
          <rect x={hx1} y={padTop} width={(ring - hole) / 2 - plate} height={cu} fill={`url(#${p}-cu)`} />
          {/* solder mask over the short track, stopping at the pad */}
          <rect x={padX1 + 0.06} y={padTop - 0.045} width={viaX - ring / 2 - padX1 - 0.12} height={0.045} rx={0.01} fill={`url(#${p}-mask)`} />
          <rect x={viaX + ring / 2 + 0.06} y={padTop - 0.045} width={W - viaX - ring / 2 - 0.06} height={0.045} fill={`url(#${p}-mask)`} />
        </>
      )}
      <rect x={0} y={padTop - 0.045} width={padX0 - 0.06} height={0.045 + cu} fill={`url(#${p}-mask)`} />
      {/* solder */}
      {inPad ? (
        <>
          <path d={`M ${capX1} ${capBot - 0.12} Q ${capX1 + 0.08} ${padTop - 0.02} ${hx0 - 0.02} ${padTop} L ${capX1} ${padTop} Z`} fill={`url(#${p}-sol)`} />
          <rect x={capX0 + 0.2} y={capBot} width={capX1 - capX0 - 0.2} height={padTop - capBot} fill={`url(#${p}-sol)`} />
          <rect x={viaX - hole / 2} y={padTop} width={hole} height={0.85} fill={`url(#${p}-sol)`} />
          <path d={`M ${viaX - hole / 2} ${padTop + 0.85} q ${hole / 2} 0.1 ${hole} 0 Z`} fill={`url(#${p}-sol)`} />
        </>
      ) : (
        <>
          <rect x={capX0 + 0.2} y={capBot} width={capX1 - capX0 - 0.2} height={padTop - capBot} fill={`url(#${p}-sol)`} />
          <path d={`M ${capX1} ${capTop + 0.08} Q ${capX1 + 0.12} ${padTop - 0.08} ${padX1 - 0.02} ${padTop} L ${capX1} ${padTop} Z`} fill={`url(#${p}-sol)`} />
        </>
      )}
      {/* the part: body off to the left, metal end cap on the pad */}
      <g filter={`url(#${p}-shadow)`}>
        <rect x={-0.2} y={capTop + 0.02} width={capX0 + 0.22} height={capBot - capTop - 0.02} fill={`url(#${p}-body)`} />
        <rect x={capX0} y={capTop} width={capX1 - capX0} height={capBot - capTop} rx={0.04} fill={`url(#${p}-cap)`} />
      </g>
      <g fontFamily="var(--font-mono)" fontSize={0.135} fontWeight={600} letterSpacing={0.015} fill="var(--ink-2)">
        {inPad ? (
          <>
            <line x1={viaX + 0.05} y1={padTop + 0.55} x2={viaX + 0.45} y2={padTop + 0.75} stroke="var(--ink-2)" strokeWidth={0.012} />
            <text x={viaX + 0.48} y={padTop + 0.8}>SOLDER WICKS</text>
            <text x={viaX + 0.48} y={padTop + 0.98}>DOWN THE HOLE</text>
            <text x={capX1 + 0.1} y={capTop - 0.12}>STARVED JOINT</text>
          </>
        ) : (
          <>
            <text x={viaX} y={padTop - 0.3} textAnchor="middle">VIA</text>
            <text x={capX1 + 0.1} y={capTop - 0.12}>FULL FILLET</text>
          </>
        )}
      </g>
    </svg>
  )
}

function RoutedBoard() {
  const doc = useMemo(() => stages.routed(), [])
  return (
    <svg viewBox={`-1.5 -1.5 ${doc.w + 3} ${doc.h + 3}`} style={{ display: 'block', width: '100%', maxHeight: 360 }}>
      <BoardView doc={doc} mode="eda" vis={{ ratsnest: false }} activeLayer="bottom" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Article                                                             */
/* ------------------------------------------------------------------ */

function Article() {
  return (
    <>
      <p className="lead">
        On one layer, two tracks can never cross: if they touch, their nets short together. Real boards are full of
        connections that need to cross, so we use <strong>both sides of the board</strong> and hop between them through
        tiny plated holes called <em>vias</em>.
      </p>

      <h2>Why two layers?</h2>
      <p>
        Think of a road map. Two roads on the same level that cross need a junction, and on a circuit board a junction
        means the two nets become one. That's a short circuit. The fix is the same one city planners use: a{' '}
        <strong>flyover bridge</strong>. One road dives under the other on a separate level and comes back up on the far side.
      </p>
      <Figure label="Fig 1" caption="Track A needs to get past track B. It drops through a via to the bottom layer, passes underneath, and comes back up through a second via." bg="paper">
        <div className="l11-fig">
          <Flyover />
        </div>
      </Figure>
      <p>
        In Blinky, the 555's RESET pin (pin 4) has to reach VCC. Look at the board in the scene: the GND track loops
        around it, the THR and OUT tracks hem it in, and the chip itself is in the way. Every top-layer path either crosses
        another net or squeezes between a capacitor's two pads. With the bottom layer, the problem goes away: the bottom is
        nearly empty, so RESET can drop down, run under everything and come back up.
      </p>

      <h2>What a via is</h2>
      <p>
        A <strong>via</strong> is a small hole drilled right through the board whose wall is plated with copper, a tiny
        copper tube. A copper pad around the hole on each side, the <em>annular ring</em>, gives the tracks something
        to join. Current flows along the top track, down the plated <em>barrel</em>, and out along the bottom track.
      </p>
      <Figure label="Fig 2" caption="A cut through Blinky's via. The barrel is only as thick as the plating, but it joins the top and bottom copper into one conductor. (Copper and mask are drawn twice their real thickness so you can see them.)" bg="paper">
        <div className="l11-figsec">
          <ViaSection d={0.6} drill={0.3} flow idPrefix="fig2" />
        </div>
      </Figure>

      <h2>Size, drill and annular ring</h2>
      <p>A via is described by two numbers, and EasyEDA asks for both:</p>
      <ul>
        <li>
          <strong>Diameter</strong>: the outside size of the copper ring, for example 0.6 mm.
        </li>
        <li>
          <strong>Drill</strong>: the hole size, for example 0.3 mm.
        </li>
        <li>
          The <strong>annular ring</strong> is what's left: (0.6 − 0.3) ÷ 2 = <strong>0.15 mm</strong> of copper all
          the way round. If the drill wanders a little, that ring is what keeps the hole connected.
        </li>
      </ul>
      <Specs
        items={[
          { k: 'Via diameter', v: '0.6 mm', note: 'Beginner default' },
          { k: 'Drill', v: '0.3 mm', note: 'Beginner default' },
          { k: 'Annular ring', v: '0.15 mm', note: '(0.6 − 0.3) ÷ 2' },
          { k: 'Board', v: '1.6 mm FR-4', note: 'The barrel is this long' },
        ]}
      />
      <Figure label="Fig 3" caption="Three via sizes, drawn to the same scale. Smaller vias save space but cost more to make." bg="paper">
        <div className="l11-sizes">
          <div>
            <ViaPlan d={0.8} drill={0.4} size={104} />
            <b>0.8 / 0.4</b>
            Roomy
          </div>
          <div>
            <ViaPlan d={0.6} drill={0.3} size={104} />
            <b>0.6 / 0.3</b>
            Beginner default
          </div>
          <div>
            <ViaPlan d={0.4} drill={0.2} size={104} />
            <b>0.4 / 0.2</b>
            Tiny: extra cost
          </div>
        </div>
      </Figure>
      <Callout kind="fab" title="Tiny vias cost extra">
        JLCPCB can drill very small holes, but very small ones cost more: a 0.1–0.15 mm hole, or a 0.2–0.25 mm hole with a
        via diameter under 0.45 mm, adds to the price. <strong>0.3 mm drill / 0.6 mm diameter</strong> is comfortably
        outside that zone. Fab limits change, so check your manufacturer's capabilities page before you shrink anything.
      </Callout>

      <h2>Through, blind and buried</h2>
      <p>
        The via in Blinky is a <strong>through via</strong>: it goes all the way from the top to the bottom. Boards with
        four or more layers can also use <em>blind</em> vias (from an outer layer to an inner one) and <em>buried</em> vias
        (between inner layers only). These need extra manufacturing steps and cost more. On a 2-layer board every via is a
        through via, and that's all you need for your first designs.
      </p>
      <Figure label="Fig 4" caption="The three kinds of via in a 4-layer board. Beginner boards use through vias only." bg="paper">
        <div className="l11-fig">
          <ViaTypes />
        </div>
      </Figure>

      <h2>A simple layer strategy</h2>
      <p>
        With two layers you can easily end up with a tangle of vias. Two habits keep things tidy:
      </p>
      <ul>
        <li>
          <strong>Give each layer a direction.</strong> Run tracks mostly horizontally on the top and mostly vertically on
          the bottom. Crossings then happen naturally at right angles, one via each side.
        </li>
        <li>
          <strong>Or keep the bottom mostly ground.</strong> Route nearly everything on top and only borrow the bottom
          for short hops, like Blinky's RESET. The rest of the bottom can then become one big ground plane, which is
          the topic of the next lesson.
        </li>
      </ul>
      <Figure label="Fig 5" caption="Blinky as routed in this course: everything on top (red) except one short bottom-layer hop (blue) for RESET, with a via at each end." bg="eda">
        <div style={{ padding: 16 }}>
          <RoutedBoard />
        </div>
      </Figure>
      <p>
        Every via adds a little resistance and takes up space on both layers, so use as many as you need and no more.
      </p>

      <h2>Don't put vias in SMD pads</h2>
      <Compare
        left={
          <>
            <ViaInPad inPad={false} />
            Put the via next to the pad and join it with a short track. Solder stays on the pad where it belongs.
          </>
        }
        right={
          <>
            <ViaInPad inPad />
            A via inside a surface-mount pad is an open hole. Molten solder can wick down the barrel and leave a weak or dry
            joint.
          </>
        }
        leftLabel="Do"
        rightLabel="Avoid as a beginner"
      />
      <p>
        Professional boards do sometimes use "via-in-pad", but the holes have to be filled and plated over first, which
        adds manufacturing steps. Until you need it, keep vias beside pads.
      </p>

      <h2>A preview: stitching vias</h2>
      <p>
        Vias aren't only for single signals. When both layers have a ground copper area, designers sprinkle extra
        ground vias across the board to tie the two together. These <strong>stitching vias</strong> give current a short
        path between layers and stop either side becoming an isolated island. You'll meet them properly with copper pours
        in the next lesson.
      </p>

      <Callout kind="easyeda" title="Flip the board to check the bottom">
        Routing on the bottom is easy to forget about. EasyEDA's <em>Flip Board</em> view (default key <Keys combo="F" />)
        mirrors the board so you see it from underneath, the way you'd hold it to solder. The text looks backwards,
        exactly as it would on the real board.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

const lesson: LessonContent = {
  Scene,
  goal: 'RESET is boxed in on the top layer. Start a track at U1 pin 4, drop a via, and finish the connection on the bottom layer.',
  missions: [
    { id: 'bottom', text: 'Switch to the bottom layer and watch the top layer dim' },
    { id: 'route', text: 'Route RESET (U1 pin 4) to VCC through a via, with no DRC errors' },
    { id: 'flip', text: 'Flip the board to look at your bottom track from underneath' },
    { id: 'explode', text: 'Open the via cross-section and explode it to see the plated barrel' },
  ],
  Article,
  build: {
    intro: <>Route Blinky's RESET pin the same way in EasyEDA Pro. Shortcuts below are the defaults and may differ in your shortcut theme.</>,
    steps: [
      {
        title: 'Set the default via size',
        menu: ['Design', 'Design Rules'],
        body: (
          <>
            Find the via size rule and set the default to <b>0.6 mm</b> diameter with a <b>0.3 mm</b> drill. New vias will
            use it. Leave the minimums alone unless you know your fab's limits.
          </>
        ),
      },
      {
        title: 'Pick the active layer',
        keys: ['T', 'B'],
        body: (
          <>
            <b>T</b> makes the top layer active and <b>B</b> the bottom. You can also click a layer in the right-hand{' '}
            <b>Layers</b> panel. New tracks go on the active layer, and the other layers are drawn dimmer.
          </>
        ),
      },
      {
        title: 'Change layer while routing',
        body: (
          <>
            Start a track from U1 pin 4 (<b>W</b>, or <b>Alt+W</b> in the Professional shortcut theme). Mid-route, press the
            layer key and EasyEDA drops a via and carries on on the other layer. The docs disagree on the key (<b>T</b>/<b>B</b>{' '}
            or <b>Alt+T</b>/<b>Alt+B</b>), so check <Menu path={['Settings', 'Shortcuts']} />. The behaviour is controlled by
            the "Auto Change Layer While Routing Vias" option in the PCB settings.
          </>
        ),
      },
      {
        title: 'Or place vias yourself',
        keys: ['V', 'Shift+V'],
        body: (
          <>
            Press <b>V</b> to place a via, then route to it from each side. <b>Shift+V</b> cycles through common via sizes
            while you're placing or routing.
          </>
        ),
      },
      {
        title: 'Flip the board view',
        keys: ['F'],
        body: (
          <>
            <b>Flip Board</b> shows the board from underneath so you can check your bottom-layer work. One help page lists{' '}
            <b>Shift+F</b> instead, so if <b>F</b> does nothing, look in Settings › Shortcuts.
          </>
        ),
      },
      {
        title: 'Check it',
        menu: ['Design', 'Check DRC'],
        body: <>The RESET ratline should be gone and DRC should report no errors.</>,
      },
    ],
    tip: <>Keep vias out of SMD pads and at least a clearance away from other copper. A via is a pad on every layer it passes through.</>,
  },
  quiz: [
    {
      q: 'Why can’t Blinky’s RESET pin be routed easily on the top layer alone?',
      options: [
        'Top-layer tracks can’t carry VCC',
        'Every top-layer path would cross or crowd tracks of other nets',
        'RESET pins must always be on the bottom',
        'The track would be too long',
      ],
      answer: 1,
      explain: 'Two tracks on the same layer that cross are shorted together. The bottom layer is free, so a via lets RESET pass underneath.',
    },
    {
      q: 'A via has a 0.6 mm diameter and a 0.3 mm drill. How wide is its annular ring?',
      options: ['0.3 mm', '0.15 mm', '0.6 mm', '0.9 mm'],
      answer: 1,
      explain: 'The ring is the copper left around the hole on each side: (0.6 − 0.3) ÷ 2 = 0.15 mm.',
    },
    {
      q: 'Which via is the safe beginner choice at JLCPCB?',
      options: ['0.4 mm diameter, 0.2 mm drill', '0.25 mm diameter, 0.15 mm drill', '0.6 mm diameter, 0.3 mm drill', 'Any size, they all cost the same'],
      answer: 2,
      explain: '0.6/0.3 mm is easy to make and outside JLCPCB’s extra-cost zone. Tiny holes and rings add to the price.',
    },
    {
      q: 'What kind of via does a normal 2-layer board use?',
      options: ['Blind', 'Buried', 'Through', 'Via-in-pad'],
      answer: 2,
      explain: 'With only two layers, every via goes from top to bottom: a through via. Blind and buried vias only exist in boards with inner layers.',
    },
  ],
  terms: [
    { term: 'Via', def: 'A small drilled hole with a copper-plated wall that connects copper on different layers.' },
    { term: 'Annular ring', def: 'The ring of copper left around a drilled hole: (diameter − drill) ÷ 2.' },
    { term: 'Drill size', def: 'The diameter of the hole the factory drills for a via or pad.' },
    { term: 'Barrel', def: 'The plated inside wall of a via, a thin copper tube through the board.' },
    { term: 'Active layer', def: 'The copper layer new tracks are drawn on. In EasyEDA, T and B switch it by default.' },
    { term: 'Through via', def: 'A via that runs from the top layer all the way to the bottom. The only kind on 2-layer boards.' },
    { term: 'Blind / buried via', def: 'Vias that reach only some layers of a multilayer board. They cost extra.' },
    { term: 'Stitching via', def: 'An extra ground via that ties ground copper on different layers together.' },
  ],
}

export default lesson
