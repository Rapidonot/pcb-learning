import { useMemo } from 'react'
import type { LessonContent } from '../types'
import { Callout, Chip } from '@/components/ui'
import { Figure, Steps, Menu, Compare } from '@/components/content'
import { BoardView, FootprintGraphic } from '@/pcb/render'
import { analyze, partPads, type BoardDoc, type PartInst } from '@/pcb/board'
import { stages } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { Scene } from './Scene'
import { measure } from './metrics'
import './lesson09.css'

/* ------------------------------------------------------------------ */
/* Article figures                                                     */
/* ------------------------------------------------------------------ */

const messy: Record<string, [number, number, number]> = {
  J1: [26.5, 19, 0],
  U1: [8, 7.5, 0],
  C2: [24, 4, 0],
  R1: [6, 21.5, 0],
  R2: [15, 21, 90],
  C1: [17, 3.5, 0],
  C3: [3.5, 14.5, 90],
  R3: [21, 12.5, 0],
  D1: [12, 15, 90],
}

function PlacementBoard({ doc }: { doc: BoardDoc }) {
  const conn = useMemo(() => analyze(doc), [doc])
  const m = useMemo(() => measure(doc, conn), [doc, conn])
  return (
    <>
      <svg viewBox={`-2 -2 ${doc.w + 4} ${doc.h + 4}`} role="img" aria-label="Blinky board with airwires">
        <BoardView doc={doc} conn={conn} />
        {m.crossPts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={0.4} fill="none" stroke="#ffb02e" strokeWidth={0.1} />
        ))}
      </svg>
      <div className="l09-fig2__cap" style={{ marginBottom: 6 }}>
        <Chip>{m.length.toFixed(0)} mm of airwire</Chip>
        <Chip>{m.crossings} crossings</Chip>
        <Chip>C2 {m.decouple?.toFixed(1)} mm from pin 8</Chip>
      </div>
    </>
  )
}

function GoodVsBad() {
  const good = useMemo(() => stages.placed(), [])
  const bad = useMemo<BoardDoc>(() => {
    const d = stages.placed()
    return { ...d, parts: d.parts.map((p) => ({ ...p, x: messy[p.ref][0], y: messy[p.ref][1], rot: messy[p.ref][2] })) }
  }, [])
  return (
    <Compare
      leftLabel="Thought-through"
      rightLabel="Wherever it landed"
      left={
        <div className="l09-cmp">
          <PlacementBoard doc={good} />
          The chip sits in the middle, the connector at the edge, the timing parts in a tidy column next to the pins they
          serve, and the LED pair in a line. Airwires are short and mostly parallel.
        </div>
      }
      right={
        <div className="l09-cmp">
          <PlacementBoard doc={bad} />
          Every part is on the board and nothing overlaps, so the DRC would be happy. But the airwires criss-cross the whole
          board. Each crossing is a place where one trace will have to dodge another.
        </div>
      }
    />
  )
}

/** U1 with C2 close to pin 8 vs far away. The copper path and the loop it encloses are drawn. */
function DecouplingFigure() {
  // U1 sits at (9, 9) in both panels; pin 8 is at (11.7, 7.095), pin 1 at (6.3, 7.095)
  const u1: PartInst = { ref: 'U1', fp: 'SOIC-8', value: 'NE555', x: 9, y: 9.5, rot: 0, side: 'top' }
  const p8 = partPads(u1, stages.placed().netlist).find((p) => p.num === '8')!
  const p1 = partPads(u1, stages.placed().netlist).find((p) => p.num === '1')!
  const near = {
    c2: { x: 9, y: 4.6, rot: 180 },
    vcc: [[9.95, 4.6], [p8.x, 4.6 + (p8.x - 9.95)], [p8.x, p8.y]] as [number, number][],
    gnd: [[p1.x, p1.y], [p1.x, 4.6 + (8.05 - p1.x)], [8.05, 4.6]] as [number, number][],
  }
  const far = {
    c2: { x: 16.5, y: 16.2, rot: 90 },
    vcc: [[16.5, 15.25], [16.5, p8.y], [p8.x, p8.y]] as [number, number][],
    gnd: [[p1.x, p1.y], [3.5, p1.y], [3.5, 18.6], [16.5, 18.6], [16.5, 17.15]] as [number, number][],
  }
  const pts = (l: [number, number][]) => l.map((p) => p.join(',')).join(' ')
  const panel = (d: typeof near, label: string, color: string, area: string) => {
    const id = `l09d-${label.replace(/\W/g, '')}`
    const loop = [...d.vcc, ...d.gnd]
    return (
      <div>
        <svg viewBox="0 0 20 21" role="img" aria-label={`${label}: ${area}`}>
          <defs>
            <radialGradient id={`${id}-bg`} cx="40%" cy="30%" r="90%">
              <stop offset="0" stopColor="#1c201c" />
              <stop offset="1" stopColor="#0b0c0b" />
            </radialGradient>
            <radialGradient id={`${id}-loop`} cx="50%" cy="50%" r="60%">
              <stop offset="0" stopColor={color} stopOpacity={0.38} />
              <stop offset="1" stopColor={color} stopOpacity={0.12} />
            </radialGradient>
            <filter id={`${id}-sh`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0.12" stdDeviation="0.15" floodColor="#000" floodOpacity="0.7" />
            </filter>
            <marker id={`${id}-arr`} viewBox="0 0 4 4" refX="2" refY="2" markerWidth="3.2" markerHeight="3.2" orient="auto">
              <path d="M0 0 L4 2 L0 4 Z" fill={color} />
            </marker>
          </defs>
          <rect width={20} height={21} rx={0.6} fill={`url(#${id}-bg)`} />
          <polygon points={pts(loop)} fill={`url(#${id}-loop)`} stroke={color} strokeOpacity={0.5} strokeWidth={0.06} strokeDasharray="0.3 0.2" />
          <g filter={`url(#${id}-sh)`}>
            <polyline points={pts(d.vcc)} fill="none" stroke={EDA.top} strokeWidth={0.5} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={pts(d.gnd)} fill="none" stroke={EDA.top} strokeWidth={0.5} strokeLinejoin="round" strokeLinecap="round" />
            <g transform={`translate(${u1.x} ${u1.y})`}>
              <FootprintGraphic fp="SOIC-8" showNumbers />
            </g>
            <g transform={`translate(${d.c2.x} ${d.c2.y}) rotate(${d.c2.rot})`}>
              <FootprintGraphic fp="C0805" />
            </g>
          </g>
          {/* current direction */}
          <polyline points={pts(d.vcc)} fill="none" stroke={color} strokeWidth={0.09} strokeDasharray="0.35 0.35" markerEnd={`url(#${id}-arr)`} className="l09-flow" />
          <polyline points={pts(d.gnd)} fill="none" stroke={color} strokeWidth={0.09} strokeDasharray="0.35 0.35" markerEnd={`url(#${id}-arr)`} className="l09-flow" />
          <line x1={p8.x} y1={p8.y + 0.2} x2={p1.x} y2={p1.y + 0.2} stroke={color} strokeWidth={0.09} strokeDasharray="0.15 0.25" opacity={0.7} />
          <text x={u1.x} y={u1.y + 0.3} textAnchor="middle" fill={EDA.silkTop} className="l09-figlabel">
            U1
          </text>
          <text x={d.c2.x + (d.c2.rot === 90 ? 1.6 : 0)} y={d.c2.y - (d.c2.rot === 90 ? 0 : 1.6)} textAnchor="middle" dominantBaseline="central" fill={EDA.silkTop} className="l09-figlabel">
            C2
          </text>
          <text x={1} y={20} fill={color} className="l09-figlabel">
            {label}
          </text>
          <text x={19} y={20} fill="rgba(255,255,255,0.55)" textAnchor="end" className="l09-figlabel">
            {area}
          </text>
        </svg>
      </div>
    )
  }
  return (
    <div className="l09-fig2">
      {panel(near, 'SMALL LOOP', '#4fe0a6', '≈ 13 mm²')}
      {panel(far, 'BIG LOOP', '#ffb02e', '≈ 143 mm²')}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Article() {
  return (
    <>
      <p className="lead">
        After converting, all nine Blinky parts sit in a row beside an empty board, tied together by a web of airwires.
        Your next job is to arrange them. It feels like tidying a desk, but <strong>placement decides how easy (or how
        painful) the routing will be</strong>. Experienced designers often spend more time placing than routing.
      </p>
      <p>
        Think of the airwires as rubber bands. Every band you stretch long, or cross over another, becomes a copper trace
        that has to travel that far or find a way around. Get the parts in the right spots and most traces turn into short,
        straight hops.
      </p>

      <Figure
        label="Fig 1"
        caption="Two legal placements of the same nine parts. Orange rings mark airwire crossings. The left board will take minutes to route; the right one could take an hour and still look tangled."
        bg="paper"
      >
        <div style={{ padding: 16 }}>
          <GoodVsBad />
        </div>
      </Figure>

      <h2>A placement strategy that works</h2>
      <p>You don't need talent for this, just an order of operations. Here is one that suits most small boards:</p>
      <Steps
        items={[
          {
            title: 'Fix the things that must go in a certain place',
            body: 'Connectors, buttons, LEDs that must show through a case, and mounting holes. A power connector belongs at an edge where a cable can reach it, so Blinky’s J1 goes on the left edge.',
          },
          {
            title: 'Place the main chip next',
            body: 'U1, the 555 timer, connects to almost everything. Put it roughly in the middle of the parts that talk to it.',
          },
          {
            title: 'Decoupling capacitors right beside their power pins',
            body: 'C2 goes as close as possible to U1 pin 8 (VCC), with its other end heading to pin 1 (GND). More on why below.',
          },
          {
            title: 'Group the rest by job',
            body: 'The timing parts (R1, R2, C1) form a little team next to pins 6 and 7. C3 sits by pin 5. R3 and the LED D1 make a short chain from pin 3.',
          },
          {
            title: 'Rotate until the airwires untangle',
            body: 'Spin each part so its pads face the pins they connect to. Two crossing airwires often straighten out with a single 90° turn or by swapping two parts.',
          },
        ]}
      />

      <h2>Reading the airwires</h2>
      <p>
        Airwires redraw themselves as you move parts. EasyEDA always shows the shortest way to join each net, so they are a
        live map of how well you are doing. Two quick checks:
      </p>
      <ul>
        <li>
          <strong>Total length.</strong> Shorter is almost always better. Blinky’s reference placement needs about 91 mm of
          airwire; parts left in a random heap need closer to 165 mm.
        </li>
        <li>
          <strong>Crossings.</strong> On a single layer, two traces can't cross without a via to the other side of the board.
          Fewer crossings means fewer detours. The reference has four, and each of those is easy to solve.
        </li>
      </ul>

      <h2>Why the decoupling capacitor goes first</h2>
      <p>
        A chip doesn't draw current smoothly. Each time the 555 switches, it gulps a burst of current in a few billionths of a
        second. The supply is centimetres away at the end of a long trace, too far to respond that quickly. A{' '}
        <em>decoupling capacitor</em> is a tiny local energy tank that feeds those gulps. It only works if it is close: the
        current flows out of C2, through the chip, and back to C2. That path forms a loop, and{' '}
        <strong>the smaller the loop, the cleaner the power</strong> and the less electrical noise the board radiates.
      </p>
      <Figure
        label="Fig 2"
        caption="The shaded area is the loop the switching current travels around: from C2 into pin 8 (VCC), through the chip, out of pin 1 (GND) and back. Keep it small."
        bg="eda"
      >
        <DecouplingFigure />
      </Figure>
      <Callout kind="tip" title="Rule of thumb">
        Put every decoupling capacitor within a few millimetres of the power pin it serves, before you place anything else
        around the chip. On Blinky, C2 sits just above U1, between pin 8 (VCC) and pin 1 (GND).
      </Callout>

      <h2>Little things that save trouble later</h2>
      <ul>
        <li>
          <strong>Keep a margin from the board edge.</strong> The factory cuts boards out of a bigger panel, and copper
          too close to the edge can be damaged. Keep pads and traces at least 0.3 mm from the edge (0.5 mm is safer).
        </li>
        <li>
          <strong>Use consistent orientations.</strong> Rows of resistors all facing the same way are easier to solder and
          inspect, whether by you or an assembly machine.
        </li>
        <li>
          <strong>Mind polarity.</strong> LEDs, diodes and electrolytic capacitors only work one way round. Make sure their
          silkscreen marks stay visible.
        </li>
        <li>
          <strong>Think about how the board is held.</strong> If it needs screws, leave room for mounting holes in the
          corners before the space fills up.
        </li>
        <li>
          <strong>Overlapping courtyards are an error.</strong> The courtyard is the keep-out box around each part. If two
          courtyards overlap, the parts may physically collide.
        </li>
      </ul>
      <Callout kind="easyeda" title="Find a part fast with cross-probing">
        Not sure which footprint is which? Select a symbol in the schematic and press <b>Shift+X</b> (cross-probe): EasyEDA
        jumps to the matching footprint in the PCB. To place a whole group at once, select those symbols in the schematic and
        use <b>Ctrl+Shift+X</b> (place transfer) to highlight them in the PCB.
      </Callout>
      <p>
        When the airwires look calm (short, mostly parallel, few crossings), you are ready for the satisfying part: turning
        each one into copper. That's the next lesson.
      </p>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Drag the Blinky parts onto the board, rotate them with Space, and untangle the airwires.',
  missions: [
    { id: 'onboard', text: 'Get all 9 parts onto the board with no overlapping courtyards' },
    { id: 'decouple', text: 'Put decoupling cap C2 within 4 mm of U1 pin 8 (VCC)' },
    { id: 'untangle', text: 'Untangle the airwires down to 4 crossings or fewer' },
    { id: 'short', text: 'Bring the total airwire length under 100 mm' },
  ],
  Article,
  build: {
    intro: <>Open the PCB you created by converting the schematic. The parts sit beside the board outline, joined by ratlines.</>,
    steps: [
      {
        title: 'Drag the main parts onto the board',
        body: (
          <>
            Click a footprint and drag it inside the outline. Start with the connector at an edge, then the chip, then its
            decoupling capacitor.
          </>
        ),
      },
      {
        title: 'Rotate and mirror',
        keys: ['Space', 'X', 'Y'],
        body: <>With a part selected, Space rotates it. X mirrors it left-right and Y mirrors it top-bottom.</>,
      },
      {
        title: 'Find parts from the schematic',
        keys: ['Shift+X', 'Ctrl+Shift+X'],
        body: (
          <>
            Shift+X cross-probes: it jumps between a symbol and its footprint. Ctrl+Shift+X (place transfer) highlights the
            schematic parts you selected in the PCB, which is handy for placing a functional group together.
          </>
        ),
      },
      {
        title: 'Need a part on the bottom side?',
        body: (
          <>
            Select it and change its layer from top to bottom in the <b>Property</b> panel on the right. We couldn't confirm a
            dedicated shortcut for this, so check <Menu path={['Settings', 'Shortcuts']} /> if you want one.
          </>
        ),
      },
      {
        title: 'Watch the ratlines shrink',
        menu: ['View', 'Ratline'],
        body: <>Keep the ratlines visible while you work. Shorter and fewer crossings means easier routing.</>,
      },
    ],
    tip: <>Place, then step back. Zoom out with the mouse wheel and look at the whole board. Most tangles are obvious from a distance.</>,
  },
  quiz: [
    {
      q: 'Which part should usually be placed first on a board like Blinky?',
      options: ['The smallest resistor', 'Fixed-position parts like connectors, then the main chip', 'The LED, because it looks nice', 'It doesn’t matter'],
      answer: 1,
      explain: 'Parts whose position is dictated by the outside world (connectors, mounting holes) come first, then the chip that most nets connect to.',
    },
    {
      q: 'Why should the decoupling capacitor C2 sit right next to U1’s VCC pin?',
      options: [
        'To make the board look symmetrical',
        'So the switching current travels around a small loop, giving clean power',
        'Because the DRC requires it',
        'So it is easier to read its label',
      ],
      answer: 1,
      explain: 'A decoupling cap feeds sudden current demands. A short path means a small current loop: less noise and a steadier supply.',
    },
    {
      q: 'Two airwires cross. What does that tell you?',
      options: [
        'There is a short circuit',
        'The schematic is wrong',
        'Routing those two connections on one layer will need a detour or a via',
        'Nothing: airwires are just decoration',
      ],
      answer: 2,
      explain: 'Airwires show connections still to be made. Crossing ones can’t both be straight traces on the same layer. Rotating or swapping parts often removes the crossing.',
    },
    {
      q: 'In EasyEDA, which key rotates the selected part?',
      options: ['R', 'Space', 'Tab', 'Ctrl+R'],
      answer: 1,
      explain: 'Space rotates. X and Y mirror. Shortcuts can be changed under Settings › Shortcuts.',
    },
  ],
  terms: [
    { term: 'Placement', def: 'Arranging footprints on the board before routing. It decides how easy routing will be.' },
    { term: 'Airwire', def: 'A thin straight line showing a connection that still needs a copper trace (also ratline or rubber band).' },
    { term: 'Courtyard', def: 'The keep-out box around a part. Courtyards of neighbouring parts must not overlap.' },
    { term: 'Decoupling capacitor', def: 'A small capacitor beside a chip’s power pin that supplies sudden bursts of current.' },
    { term: 'Current loop', def: 'The round-trip path current takes. Smaller loops mean less noise.' },
    { term: 'Cross-probe', def: 'Jumping between a schematic symbol and its PCB footprint (Shift+X in EasyEDA).' },
    { term: 'Place transfer', def: 'Highlighting selected schematic parts in the PCB so you can place them as a group (Ctrl+Shift+X).' },
  ],
}

export default lesson
