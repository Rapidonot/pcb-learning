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

/** Shared SVG defs for the premium EDA-style article art. */
function CopperDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-cu`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff7a6e" />
        <stop offset="0.45" stopColor="#e8453c" />
        <stop offset="1" stopColor="#b8302a" />
      </linearGradient>
      <linearGradient id={`${id}-cuh`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ff7a6e" />
        <stop offset="0.5" stopColor="#e8453c" />
        <stop offset="1" stopColor="#b8302a" />
      </linearGradient>
      <radialGradient id={`${id}-bg`} cx="40%" cy="30%" r="90%">
        <stop offset="0" stopColor="#1c201c" />
        <stop offset="1" stopColor="#0b0c0b" />
      </radialGradient>
      <pattern id={`${id}-grid`} width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M10 0H0V10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
      </pattern>
      <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="#000" floodOpacity="0.6" />
        <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#ff4b3e" floodOpacity="0.18" />
      </filter>
    </defs>
  )
}

/** Three ways to turn a corner (units: 0.1 mm). */
function Corners() {
  const pad = (x: number, y: number, id: string) => (
    <g>
      <rect x={x - 7} y={y - 7} width={14} height={14} rx={3} fill={`url(#${id}-cu)`} />
      <rect x={x - 5.5} y={y - 5.8} width={11} height={3} rx={1.5} fill="#fff" opacity={0.18} />
    </g>
  )
  const panel = (d: string, label: string, len: string, best?: boolean) => {
    const id = `l10c-${label.replace(/[^a-z0-9]/gi, '')}`
    return (
      <div>
        <svg viewBox="0 0 100 80" role="img" aria-label={`${label} corner, ${len}`}>
          <CopperDefs id={id} />
          <rect width={100} height={80} rx={4} fill={`url(#${id}-bg)`} />
          <rect width={100} height={80} rx={4} fill={`url(#${id}-grid)`} />
          <g filter={`url(#${id}-sh)`}>
            <path d={d} fill="none" stroke={`url(#${id}-cuh)`} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke="#fff" strokeOpacity={0.16} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" transform="translate(-0.8 -0.8)" />
            {pad(15, 63, id)}
            {pad(85, 17, id)}
          </g>
          <g transform="translate(50 73)">
            <rect x={-17} y={-6} width={34} height={11} rx={5.5} fill={best ? 'rgba(79,224,166,0.14)' : 'rgba(255,255,255,0.07)'} stroke={best ? 'rgba(79,224,166,0.5)' : 'rgba(255,255,255,0.18)'} strokeWidth={0.6} />
            <text y={0.4} fontSize={6.2} textAnchor="middle" dominantBaseline="central" fill={best ? '#4fe0a6' : '#cfcfcf'} className="l10-figtext">
              {len}
            </text>
          </g>
        </svg>
        <div className="l10-corners__lab">{label}</div>
      </div>
    )
  }
  return (
    <div className="l10-corners">
      {panel('M 15 63 L 15 17 L 85 17', '90°', '11.6 mm')}
      {panel('M 15 63 L 15 43 L 41 17 L 85 17', '45° (the norm)', '10.1 mm', true)}
      {panel('M 15 63 L 15 47 A 30 30 0 0 1 45 17 L 85 17', 'Arc', '10.3 mm')}
    </div>
  )
}

/** Clearance & edge distance, to scale (units: 0.01 mm, so 100 = 1 mm). */
function ClearanceFigure() {
  const id = 'l10clr'
  const edge = 30
  const A = [edge + 30, edge + 55] // 0.25 mm track, 0.3 mm from the edge
  const B = [A[1] + 20, A[1] + 45] // 0.2 mm gap, 0.25 mm track
  const C = [B[1] + 20, B[1] + 70] // 0.2 mm gap, 0.5 mm power track
  const padX = C[1] + 20 + 40 // round pad of another net, 0.2 mm away
  const dim = (x1: number, x2: number, y: number, label: string, color: string) => (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={color} strokeWidth={0.8} />
      <line x1={x1} x2={x1} y1={y - 4} y2={y + 4} stroke={color} strokeWidth={0.8} />
      <line x1={x2} x2={x2} y1={y - 4} y2={y + 4} stroke={color} strokeWidth={0.8} />
      <text x={(x1 + x2) / 2} y={y - 6} fontSize={8.5} textAnchor="middle" fill={color} className="l10-figtext">
        {label}
      </text>
    </g>
  )
  const track = ([x0, x1]: number[]) => (
    <g>
      <rect x={x0} y={90} width={x1 - x0} height={160} rx={(x1 - x0) / 2} fill={`url(#${id}-cuh)`} />
      <rect x={x0 + (x1 - x0) * 0.18} y={96} width={(x1 - x0) * 0.16} height={150} rx={2} fill="#fff" opacity={0.15} />
    </g>
  )
  return (
    <div style={{ padding: 16 }}>
      <svg viewBox="0 0 300 200" width="100%" style={{ display: 'block', maxWidth: 640, margin: '0 auto', borderRadius: 10 }} role="img" aria-label="Clearance between traces, a pad and the board edge, to scale">
        <CopperDefs id={id} />
        <rect width={300} height={200} fill={`url(#${id}-bg)`} />
        <rect width={300} height={200} fill={`url(#${id}-grid)`} />
        {/* outside the board */}
        <rect x={0} y={0} width={edge} height={200} fill="#050605" />
        <line x1={edge} x2={edge} y1={0} y2={200} stroke={EDA.outline} strokeWidth={1.6} style={{ filter: 'drop-shadow(0 0 2px rgba(224,90,214,0.8))' }} />
        <text x={edge / 2} y={150} fontSize={8} textAnchor="middle" fill={EDA.outline} className="l10-figtext" transform={`rotate(-90 ${edge / 2} 150)`}>
          BOARD EDGE
        </text>
        <g filter={`url(#${id}-sh)`}>
          {track(A)}
          {track(B)}
          {track(C)}
          <circle cx={padX} cy={150} r={40} fill="#b9b9b9" />
          <circle cx={padX} cy={150} r={20} fill="#0b0c0b" />
          <circle cx={padX - 12} cy={136} r={9} fill="#fff" opacity={0.18} />
        </g>
        {/* clearance halos */}
        {[A, B, C].map((t, i) => (
          <rect key={i} x={t[0] - 20} y={70} width={t[1] - t[0] + 40} height={180} rx={(t[1] - t[0]) / 2 + 20} fill="none" stroke="rgba(159,227,255,0.25)" strokeWidth={0.8} strokeDasharray="3 2" />
        ))}
        {dim(A[0], A[1], 34, '0.25', '#ffb4ae')}
        {dim(B[0], B[1], 34, '0.25', '#ffb4ae')}
        {dim(C[0], C[1], 34, '0.5 power', '#ffb4ae')}
        {dim(edge, A[0], 66, '≥0.3', '#ffd166')}
        {dim(A[1], B[0], 66, '0.2', '#9fe3ff')}
        {dim(B[1], C[0], 66, '0.2', '#9fe3ff')}
        {dim(C[1], padX - 40, 100, '0.2', '#9fe3ff')}
        <text x={padX} y={196} fontSize={7.5} textAnchor="middle" fill="#cfcfcf" className="l10-figtext">
          pad, another net
        </text>
        <text x={292} y={14} fontSize={7.5} textAnchor="end" fill="rgba(255,255,255,0.5)" className="l10-figtext">
          mm · to scale
        </text>
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

      <Figure label="Fig 1" caption="Blinky fully routed. Power (VCC and GND) runs in 0.5 mm tracks and signals in 0.25 mm. One VCC connection hops to the bottom layer (blue) through two vias. That's the next lesson, Two layers & vias." bg="eda">
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
      <Figure label="Fig 2" caption="Clearance to scale, in millimetres. Two 0.25 mm signal tracks, a 0.5 mm power track and a through-hole pad, each 0.2 mm from its neighbour (dashed halos), with at least 0.3 mm to the board edge." bg="eda">
        <ClearanceFigure />
      </Figure>

      <h2>Corners: why 45°?</h2>
      <p>
        Most boards turn corners in two 45° steps instead of one sharp 90° bend. A 45° path is shorter, takes up less
        room, and makes it easier to squeeze traces side by side. It's also the convention, so it simply looks right to
        anyone who reviews your board.
      </p>
      <Figure label="Fig 3" caption="Three ways to join the same two pads, with the length of each path. EasyEDA's L key cycles between corner styles while you route." bg="eda">
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
