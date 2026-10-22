import { useMemo } from 'react'
import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Formula, Menu, Steps, Specs } from '@/components/content'
import { BoardView } from '@/pcb/render'
import { stages } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { Scene } from './Scene'
import { traceWidth } from './ipc'
import './lesson10.css'

/* ------------------------------------------------------------------ */
/* Article figures                                                     */
/* ------------------------------------------------------------------ */

function RoutedBlinky() {
  const doc = useMemo(() => stages.routed(), [])
  return (
    <div style={{ padding: 18 }}>
      <svg viewBox={`-1 -1 ${doc.w + 2} ${doc.h + 2}`} width="100%" style={{ display: 'block', maxWidth: 560, margin: '0 auto' }} role="img" aria-label="The fully routed Blinky board">
        <BoardView doc={doc} />
      </svg>
    </div>
  )
}

/** Three ways to turn a corner. */
function Corners() {
  const pad = (x: number, y: number) => <rect x={x - 0.7} y={y - 0.7} width={1.4} height={1.4} rx={0.3} fill={EDA.top} />
  const panel = (d: string, label: string, note?: string) => (
    <div>
      <svg viewBox="0 0 10 8" role="img" aria-label={label}>
        <rect width={10} height={8} rx={0.4} fill="#101210" />
        <path d={d} fill="none" stroke={EDA.top} strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" />
        {pad(1.5, 6.3)}
        {pad(8.5, 1.7)}
        {note && (
          <text x={5} y={7.5} fontSize={0.62} textAnchor="middle" fill="#c9c9c9" className="l10-figtext">
            {note}
          </text>
        )}
      </svg>
      <div className="l10-corners__lab">{label}</div>
    </div>
  )
  return (
    <div className="l10-corners">
      {panel('M 1.5 6.3 L 1.5 1.7 L 8.5 1.7', '90°', 'longest path')}
      {panel('M 1.5 6.3 L 1.5 4.3 L 4.1 1.7 L 8.5 1.7', '45° (the norm)')}
      {panel('M 1.5 6.3 L 1.5 4.7 A 3 3 0 0 1 4.5 1.7 L 8.5 1.7', 'Arc')}
    </div>
  )
}

/** Clearance & edge distance, to scale (units: mm). */
function ClearanceFigure() {
  const dim = (x1: number, x2: number, y: number, label: string, color = '#9fe3ff') => (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={color} strokeWidth={0.02} />
      <line x1={x1} x2={x1} y1={y - 0.08} y2={y + 0.08} stroke={color} strokeWidth={0.02} />
      <line x1={x2} x2={x2} y1={y - 0.08} y2={y + 0.08} stroke={color} strokeWidth={0.02} />
      <text x={(x1 + x2) / 2} y={y - 0.1} fontSize={0.13} textAnchor="middle" fill={color} className="l10-figtext">
        {label}
      </text>
    </g>
  )
  // vertical traces: edge at x=0, trace A centre 0.6 (0.25 wide), trace B 0.25 wide with 0.2 gap, power 0.5 wide
  const a = 0.6
  const b = a + 0.25 + 0.2
  const c = b + 0.125 + 0.2 + 0.25
  return (
    <div style={{ padding: 16 }}>
      <svg viewBox="-0.3 -0.2 2.6 1.6" width="100%" style={{ display: 'block', maxWidth: 620, margin: '0 auto', background: '#101210', borderRadius: 8 }} role="img" aria-label="Clearance between traces and to the board edge">
        <rect x={-0.3} y={-0.2} width={0.3} height={1.8} fill="rgba(255,255,255,0.04)" />
        <line x1={0} x2={0} y1={-0.2} y2={1.4} stroke={EDA.outline} strokeWidth={0.03} />
        <text x={-0.15} y={1.3} fontSize={0.1} fill={EDA.outline} textAnchor="middle" className="l10-figtext" transform="rotate(-90 -0.15 1.3)">
          BOARD EDGE
        </text>
        <line x1={a} x2={a} y1={0.5} y2={1.4} stroke={EDA.top} strokeWidth={0.25} />
        <line x1={b} x2={b} y1={0.5} y2={1.4} stroke={EDA.top} strokeWidth={0.25} />
        <line x1={c} x2={c} y1={0.5} y2={1.4} stroke={EDA.top} strokeWidth={0.5} />
        {dim(0, a - 0.125, 0.4, '≥ 0.3', '#ffd166')}
        {dim(a + 0.125, b - 0.125, 0.4, '0.2 gap')}
        {dim(b + 0.125, c - 0.25, 0.4, '0.2 gap')}
        {dim(a - 0.125, a + 0.125, 0.18, '0.25', '#ffb4ae')}
        {dim(c - 0.25, c + 0.25, 0.18, '0.5 (power)', '#ffb4ae')}
      </svg>
    </div>
  )
}

function WidthTable() {
  const rows = [0.5, 1, 2].map((amps) => ({ amps, ...traceWidth(amps, 10, 1) }))
  return (
    <table className="l10-wtable">
      <thead>
        <tr>
          <th>Current</th>
          <th>Area</th>
          <th>Min. width</th>
          <th>In mm</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.amps}>
            <td className="mono">{r.amps} A</td>
            <td className="mono">{r.areaMil2.toFixed(1)} mil²</td>
            <td className="mono">{r.widthMil.toFixed(1)} mil</td>
            <td className="mono">{r.widthMm.toFixed(2)} mm</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ------------------------------------------------------------------ */

function Article() {
  return (
    <>
      <p className="lead">
        Routing is where the board comes alive: each airwire becomes a real copper <strong>trace</strong> (EasyEDA calls it
        a <em>track</em>). A trace is a flat ribbon of copper foil, usually just 35 µm thick, glued to the board. It does
        the job of a wire, so it has to be wide enough for its current and far enough from its neighbours.
      </p>

      <Figure label="Fig 1" caption="Blinky fully routed. Power (VCC and GND) runs in 0.5 mm tracks and signals in 0.25 mm. One VCC connection hops to the bottom layer (blue) through two vias; that's Lesson 11." bg="eda">
        <RoutedBlinky />
      </Figure>

      <h2>How wide should a trace be?</h2>
      <p>
        Current warms a trace, just as it warms the element in a toaster. A thin trace carrying a lot of current gets hot,
        and in the worst case it lifts off or burns through like a fuse. <strong>Width is how you control heat.</strong> The
        industry rule of thumb comes from a standard called IPC-2221. It relates the current <em>I</em> (amps), the
        temperature rise you allow <em>ΔT</em> (°C), and the copper's cross-section area <em>A</em> (in square mils; 1 mil is
        a thousandth of an inch, 0.0254 mm):
      </p>
      <Formula>I = k · ΔT^0.44 · A^0.725 &nbsp;&nbsp;→&nbsp;&nbsp; A = ( I ÷ (k · ΔT^0.44) )^(1/0.725)</Formula>
      <p>
        Here <em>k</em> = 0.048 for outer layers (the top and bottom of a 2-layer board). Then divide the area by the copper
        thickness to get the width: <em>W</em> = <em>A</em> ÷ (<em>T</em> × 1.378) mils, where <em>T</em> is the copper weight
        in ounces. With the usual 1 oz copper and a gentle 10 °C rise:
      </p>
      <WidthTable />
      <p>
        So a 1 A trace needs about 0.3 mm. Blinky draws only a few tens of milliamps, so even its 0.25 mm signal tracks are
        far more than enough. We still route VCC and GND at 0.5 mm because{' '}
        <strong>wider power tracks cost nothing and keep the supply voltage steady</strong>.
      </p>
      <Callout kind="info" title="IPC-2221 is conservative">
        It's a deliberately cautious estimate, which is what you want as a beginner. A newer standard, IPC-2152, uses
        better data and often allows narrower traces. Try the calculator in the scene above: drag the current to 1 A and
        watch the cross-section.
      </Callout>
      <Specs
        items={[
          { k: 'Signal track', v: '0.25 mm', note: '≈ 10 mil. A safe beginner default.' },
          { k: 'Power track', v: '0.5 mm +', note: '≈ 20 mil. Check with the formula.' },
          { k: 'Clearance', v: '0.2 mm', note: 'Between copper of different nets.' },
          { k: 'To board edge', v: '≥ 0.3 mm', note: '0.5 mm is safer.' },
        ]}
      />

      <h2>Clearance: leave a gap</h2>
      <p>
        <strong>Clearance</strong> is the minimum gap between copper on different nets. Too small and the factory may
        leave a sliver of copper bridging the gap, shorting the two nets together. JLCPCB can make gaps as small as
        0.1 mm, but 0.2 mm keeps you comfortably inside their limits and is easy to solder. Keep copper away from the
        board edge too: the board is cut out of a larger panel, and copper too close to the cut can be exposed or torn.
      </p>
      <Figure label="Fig 2" caption="Clearance to scale, in millimetres. Two 0.25 mm signal tracks and a 0.5 mm power track, each 0.2 mm apart, with at least 0.3 mm to the board edge." bg="eda">
        <ClearanceFigure />
      </Figure>

      <h2>Corners: why 45°?</h2>
      <p>
        Most boards turn corners in two 45° steps instead of one sharp 90° bend. A 45° path is shorter, takes up less
        room, and makes it easier to squeeze traces side by side. It's also the convention, so it simply looks right to
        anyone who reviews your board.
      </p>
      <Figure label="Fig 3" caption="Three ways to join the same two pads. EasyEDA's L key cycles between corner styles while you route." bg="eda">
        <Corners />
      </Figure>
      <Callout kind="tip" title="The “acid trap” myth">
        You'll read that 90° corners are bad because etching acid pools in the sharp inside corner and eats the copper.
        That was a real worry with old etching processes, but modern factories handle 90° corners fine. Prefer 45° for
        neatness and shorter traces, not out of fear. (Very fast signals, far beyond Blinky, are a different story.)
      </Callout>

      <h2>A routing order that works</h2>
      <Steps
        items={[
          { title: 'Power and critical nets first', body: 'Route VCC and GND while the board is empty, short and wide. Then the decoupling capacitor links, then everything else.' },
          { title: 'Shortest, simplest connections next', body: 'On Blinky: OUT to R3, R3 to the LED, the DIS pair beside the chip. Each one clears an airwire and frees up space.' },
          { title: 'Leave the awkward ones for last', body: 'If two connections must cross, one of them will need to hop to the bottom layer through a via. You’ll learn that in the next lesson.' },
          { title: 'Check as you go', body: 'Watch for DRC markers. Fixing one clearance problem now is much easier than untangling ten at the end.' },
        ]}
      />
      <Callout kind="easyeda" title="EasyEDA routing tips">
        <b>Shift+W</b> cycles through common track widths while you route, and <b>L</b> switches the corner style (45°,
        90°, arcs or free angle). If you start a route from an existing track, the new route takes that track's width. Set
        the default width for new tracks in <Menu path={['Design', 'Design Rules']} />. <b>H</b> highlights a whole net, and{' '}
        <b>Q</b> toggles between mm and mil.
      </Callout>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Turn the last airwires into copper. Click a pad, click to add corners, click a matching pad to finish. Keep it free of magenta DRC errors.',
  missions: [
    { id: 'first', text: 'Route your first connection from pad to pad' },
    { id: 'power', text: 'Route the VCC link from U1 pin 8 to C2 with a 0.5 mm track' },
    { id: 'all', text: 'Route every remaining net with zero DRC errors' },
    { id: 'calc', text: 'Use the width calculator to find the width for 1 A' },
  ],
  Article,
  build: {
    intro: <>Your parts are placed. Set the default widths, then route power first and signals after.</>,
    steps: [
      {
        title: 'Set your default track width',
        menu: ['Design', 'Design Rules'],
        body: <>Set the track width (min / default / max) and the clearance. Good starting values are a 0.25 mm default width and 0.2 mm clearance.</>,
      },
      {
        title: 'Start routing',
        keys: ['W', 'Alt+W'],
        body: (
          <>
            The track tool is <b>W</b> on the hotkey page but <b>Alt+W</b> in the Pro shortcut theme, so check{' '}
            <Menu path={['Settings', 'Shortcuts']} />. Double-clicking a pad also starts a route. Then click to drop corners.
          </>
        ),
      },
      {
        title: 'Change width on the fly',
        keys: ['Shift+W'],
        body: <>Shift+W cycles through common widths mid-route. Use 0.5 mm or more for VCC and GND. You can also right-click while routing.</>,
      },
      {
        title: 'Pick a corner style',
        keys: ['L'],
        menu: ['Route', 'Routing Corner'],
        body: <>45° is the usual choice. L cycles 45°, 90°, arcs and free angle.</>,
      },
      {
        title: 'Finish on the target pad, then check',
        menu: ['Design', 'Check DRC'],
        body: <>Click the destination pad to complete the connection and its ratline disappears. Run the DRC (or turn on real-time DRC) and fix anything it flags.</>,
      },
    ],
    tip: <>Route VCC and GND first, while there’s still plenty of room. Power likes wide, short paths.</>,
  },
  quiz: [
    {
      q: 'Why are power traces usually made wider than signal traces?',
      options: ['They look more important', 'They carry more current, and a wider trace heats up less', 'The factory requires it', 'Wider traces are cheaper'],
      answer: 1,
      explain: 'Current heats copper. More width means more cross-section, so less heating and a steadier supply voltage.',
    },
    {
      q: 'Using IPC-2221 (1 oz copper, 10 °C rise), roughly how wide should a 1 A trace be?',
      options: ['0.05 mm', '0.3 mm', '3 mm', '10 mm'],
      answer: 1,
      explain: 'About 16 mil² of copper, which is roughly 12 mil or 0.30 mm wide on 1 oz copper.',
    },
    {
      q: 'What is clearance?',
      options: [
        'The height of a component',
        'The minimum gap between copper on different nets',
        'The width of a trace',
        'The distance between two vias on the same net',
      ],
      answer: 1,
      explain: 'Clearance keeps different nets from shorting. 0.2 mm is a comfortable beginner value.',
    },
    {
      q: 'Why do most designers route corners at 45°?',
      options: ['Acid traps make 90° corners fail on every board', 'Shorter, neater traces that pack together well, and it’s the convention', 'EasyEDA can’t draw 90°', 'Electricity can’t turn 90°'],
      answer: 1,
      explain: 'The acid-trap problem is mostly historical. 45° wins on length, space and tidiness.',
    },
  ],
  terms: [
    { term: 'Trace / track', def: 'A copper path on a layer that connects pads. EasyEDA calls it a track.' },
    { term: 'Track width', def: 'How wide a trace is. It sets how much current the trace can carry.' },
    { term: 'Clearance', def: 'The minimum gap between copper of different nets.' },
    { term: 'IPC-2221', def: 'An industry standard whose formula estimates trace width from current and temperature rise.' },
    { term: 'mil', def: 'A thousandth of an inch: 0.0254 mm. Common in PCB dimensions.' },
    { term: 'Copper weight', def: 'Copper thickness given in ounces per square foot. 1 oz is about 35 µm.' },
    { term: 'Short circuit', def: 'Copper that accidentally joins two different nets.' },
    { term: 'Real-time DRC', def: 'Design-rule checking that flags errors while you draw instead of afterwards.' },
  ],
}

export default lesson
