import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Formula, Menu, Specs } from '@/components/content'
import { SymbolGraphic, SCH } from '@/pcb/SchematicView'
import { Scene } from './Scene'
import './lesson02.css'

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

const MONO = 'IBM Plex Mono, monospace'

function Cap({ x, y, children, anchor = 'middle' }: { x: number; y: number; children: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} fontSize={9.5} fontFamily={MONO} fontWeight={600} letterSpacing="0.12em" fill="var(--ink-3)" textAnchor={anchor}>
      {children}
    </text>
  )
}

/** Fig 1: voltage, current and resistance as water. */
function WaterFigure() {
  const pipe = (d: string, w = 14) => (
    <g>
      <path d={d} stroke="#5d7a90" strokeWidth={w + 2} fill="none" strokeLinecap="round" />
      <path d={d} stroke="#8fa9bd" strokeWidth={w} fill="none" strokeLinecap="round" />
      <path d={d} stroke="#e2edf4" strokeWidth={w * 0.2} fill="none" strokeLinecap="round" transform={`translate(0 ${-w * 0.25})`} />
    </g>
  )
  const drops = (xs: number[], y: number, r = 3) => xs.map((x, i) => <circle key={i} cx={x} cy={y} r={r} fill="#2f7fd8" stroke="#dceeff" strokeWidth={0.8} />)
  return (
    <svg viewBox="0 0 660 230" width="100%" style={{ display: 'block' }} role="img" aria-label="Water analogy: voltage is pressure, current is flow, resistance is a narrow pipe">
      {/* panel 1: voltage = height / pressure */}
      <g transform="translate(20 20)">
        <rect x={20} y={20} width={60} height={120} rx={6} fill="var(--paper-2)" stroke="var(--line-2)" />
        <rect x={22} y={40} width={56} height={98} rx={4} fill="#2f7fd8" opacity={0.75} />
        <rect x={120} y={100} width={60} height={40} rx={6} fill="var(--paper-2)" stroke="var(--line-2)" />
        <rect x={122} y={124} width={56} height={14} rx={3} fill="#2f7fd8" opacity={0.75} />
        {pipe('M 80 132 H 120', 10)}
        <path d="M 100 44 V 118" stroke="var(--accent)" strokeWidth={1.4} markerEnd="url(#l02f-arr)" />
        <text x={106} y={84} fontSize={11} fontFamily={MONO} fill="var(--accent-ink)" fontWeight={600}>
          push
        </text>
        <Cap x={100} y={172}>VOLTAGE (V)</Cap>
        <text x={100} y={190} fontSize={12} textAnchor="middle" fill="var(--ink-2)">
          the pressure difference
        </text>
      </g>
      {/* panel 2: current = flow */}
      <g transform="translate(235 20)">
        {pipe('M 10 92 H 190', 22)}
        {drops([30, 56, 82, 108, 134, 160], 92, 4)}
        <path d="M 60 60 H 140" stroke="var(--accent)" strokeWidth={1.4} markerEnd="url(#l02f-arr)" />
        <text x={100} y={52} fontSize={11} fontFamily={MONO} textAnchor="middle" fill="var(--accent-ink)" fontWeight={600}>
          litres per second
        </text>
        <Cap x={100} y={172}>CURRENT (I)</Cap>
        <text x={100} y={190} fontSize={12} textAnchor="middle" fill="var(--ink-2)">
          how much flows past a point
        </text>
      </g>
      {/* panel 3: resistance = narrow pipe */}
      <g transform="translate(450 20)">
        {pipe('M 10 92 H 64', 22)}
        {pipe('M 136 92 H 190', 22)}
        {pipe('M 60 92 H 140', 6)}
        {drops([24, 46], 92, 4)}
        {drops([78, 96, 114], 92, 1.8)}
        {drops([156, 178], 92, 4)}
        <path d="M 66 64 L 82 80 M 134 64 L 118 80" stroke="var(--accent)" strokeWidth={1.4} markerEnd="url(#l02f-arr)" />
        <text x={100} y={52} fontSize={11} fontFamily={MONO} textAnchor="middle" fill="var(--accent-ink)" fontWeight={600}>
          squeeze
        </text>
        <Cap x={100} y={172}>RESISTANCE (R)</Cap>
        <text x={100} y={190} fontSize={12} textAnchor="middle" fill="var(--ink-2)">
          how hard it is to push through
        </text>
      </g>
      <defs>
        <marker id="l02f-arr" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
      </defs>
    </svg>
  )
}

/** Fig 2: anatomy of an LED. */
function LedFigure() {
  return (
    <svg viewBox="0 0 690 250" width="100%" style={{ display: 'block' }} role="img" aria-label="A 5 mm LED: the long leg is the anode, the short leg and flat side are the cathode">
      <defs>
        <radialGradient id="l02f-dome" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffb3a6" />
          <stop offset="0.6" stopColor="#ff3b2f" />
          <stop offset="1" stopColor="#a5241c" />
        </radialGradient>
      </defs>
      {/* side view of a 5 mm LED */}
      <g transform="translate(170 20)">
        <path d="M 40 40 A 30 30 0 0 1 100 40 L 100 108 L 40 108 Z" fill="url(#l02f-dome)" opacity={0.92} />
        <rect x={34} y={106} width={72} height={9} rx={2} fill="#c9342a" />
        <rect x={34} y={106} width={6} height={9} fill="#8f2119" />
        <path d="M 58 115 V 214" stroke="#9aa0a6" strokeWidth={3.5} />
        <path d="M 82 115 V 190" stroke="#9aa0a6" strokeWidth={3.5} />
        {/* inside: anvil and post */}
        <path d="M 52 108 V 70 L 66 64 V 108 Z" fill="#4a1a14" opacity={0.6} />
        <path d="M 76 108 V 76 H 84 V 108 Z" fill="#4a1a14" opacity={0.6} />
        <ellipse cx={58} cy={38} rx={8} ry={13} fill="#fff" opacity={0.45} transform="rotate(20 58 38)" />
        <g fontFamily={MONO} fontSize={11} fontWeight={600}>
          <line x1={92} y1={206} x2={140} y2={206} stroke="var(--ink-3)" />
          <text x={146} y={202} fill="var(--ink)">ANODE (+)</text>
          <text x={146} y={216} fill="var(--ink-3)" fontWeight={400}>long leg</text>
          <line x1={58} y1={196} x2={-6} y2={196} stroke="var(--ink-3)" />
          <text x={-10} y={192} textAnchor="end" fill="var(--ink)">CATHODE (−)</text>
          <text x={-10} y={206} textAnchor="end" fill="var(--ink-3)" fontWeight={400}>short leg</text>
          <line x1={36} y1={110} x2={-6} y2={110} stroke="var(--ink-3)" />
          <text x={-10} y={106} textAnchor="end" fill="var(--ink)">FLAT EDGE</text>
          <text x={-10} y={120} textAnchor="end" fill="var(--ink-3)" fontWeight={400}>cathode side</text>
        </g>
      </g>
      {/* schematic symbol */}
      <g transform="translate(420 70)">
        <rect x={-10} y={-40} width={260} height={130} rx={10} fill="var(--sch-bg)" stroke="var(--line)" />
        <line x1={10} y1={25} x2={92} y2={25} stroke={SCH.wire} strokeWidth={2} />
        <line x1={124} y1={25} x2={220} y2={25} stroke={SCH.wire} strokeWidth={2} />
        <path d="M 92 9 L 122 25 L 92 41 Z" fill={SCH.symbol} fillOpacity={0.12} stroke={SCH.symbol} strokeWidth={2} strokeLinejoin="round" />
        <line x1={123} y1={9} x2={123} y2={41} stroke={SCH.symbol} strokeWidth={2.2} />
        <path d="M 108 4 l 9 -12 M 112 -8 l 5 0 l 0 5 M 118 8 l 9 -12 M 122 -4 l 5 0 l 0 5" stroke={SCH.symbol} strokeWidth={1.5} fill="none" />
        <g fontFamily={MONO} fontSize={11} fontWeight={600}>
          <text x={20} y={58} fill={SCH.label}>A (+)</text>
          <text x={210} y={58} textAnchor="end" fill={SCH.label}>K (−)</text>
          <text x={115} y={80} textAnchor="middle" fill="#666" fontWeight={400}>current flows this way →</text>
        </g>
        <text x={115} y={-24} fontSize={9.5} fontFamily={MONO} fontWeight={600} letterSpacing="0.12em" fill="#888" textAnchor="middle">
          SCHEMATIC SYMBOL
        </text>
      </g>
    </svg>
  )
}

/** Fig 3: Blinky's LED branch with the numbers worked out. */
function BlinkyBranch() {
  return (
    <svg viewBox="10 0 450 170" width="100%" style={{ display: 'block' }} role="img" aria-label="Blinky's LED branch: 5 V from the 555 output, through R3 330 ohms, through the red LED to ground">
      <g transform="translate(20 10)">
        {/* net label OUT */}
        <rect x={10} y={68} width={64} height={22} rx={4} fill="none" stroke={SCH.label} strokeWidth={1.4} />
        <text x={42} y={83} fontSize={11} fontFamily={MONO} fontWeight={600} textAnchor="middle" fill={SCH.label}>
          OUT ≈5V
        </text>
        <line x1={74} y1={79} x2={150} y2={79} stroke={SCH.wire} strokeWidth={1.8} />
        <SymbolGraphic inst={{ ref: 'R3', sym: 'R', value: '330Ω', x: 170, y: 79, rot: 0 }} showPinNumbers={false} />
        <line x1={190} y1={79} x2={280} y2={79} stroke={SCH.wire} strokeWidth={1.8} />
        <SymbolGraphic inst={{ ref: 'D1', sym: 'LED', value: 'red', x: 300, y: 79, rot: 0 }} showPinNumbers={false} />
        <line x1={320} y1={79} x2={400} y2={79} stroke={SCH.wire} strokeWidth={1.8} />
        <line x1={400} y1={79} x2={400} y2={110} stroke={SCH.wire} strokeWidth={1.8} />
        <g stroke={SCH.symbol} strokeWidth={1.8}>
          <line x1={386} y1={110} x2={414} y2={110} />
          <line x1={391} y1={116} x2={409} y2={116} />
          <line x1={396} y1={122} x2={404} y2={122} />
        </g>
        <text x={400} y={140} fontSize={10} fontFamily={MONO} textAnchor="middle" fill={SCH.label} fontWeight={600}>
          GND 0V
        </text>
        {/* drops */}
        <g fontFamily={MONO} fontSize={11} fontWeight={600}>
          <path d="M 148 32 H 192" stroke="var(--copper)" strokeWidth={1.4} />
          <path d="M 148 28 V 36 M 192 28 V 36" stroke="var(--copper)" strokeWidth={1.4} />
          <text x={170} y={22} textAnchor="middle" fill="var(--copper)">3.0 V</text>
          <path d="M 280 32 H 320" stroke="#d8342a" strokeWidth={1.4} />
          <path d="M 280 28 V 36 M 320 28 V 36" stroke="#d8342a" strokeWidth={1.4} />
          <text x={300} y={22} textAnchor="middle" fill="#d8342a">2.0 V</text>
          <path d="M 210 126 H 262" stroke="var(--accent)" strokeWidth={1.4} markerEnd="url(#l02f-arr2)" />
          <text x={236} y={146} textAnchor="middle" fill="var(--accent-ink)">I ≈ 9.1 mA</text>
        </g>
      </g>
      <defs>
        <marker id="l02f-arr2" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
      </defs>
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
        Before you draw a single trace, it helps to know what is actually travelling along it. Electricity in a circuit comes
        down to three quantities (voltage, current and resistance) and one tidy rule that links them.
      </p>
      <p>
        Every working circuit is a <strong>closed loop</strong>. Charge leaves the supply, flows through the parts and comes
        back to the supply's other terminal. Break the loop anywhere (a cut trace, a loose wire, a burnt-out LED) and
        everything stops. That's why every part on Blinky eventually connects back to <em>GND</em>, the return path.
      </p>

      <h2>Volts, amps and ohms, with water</h2>
      <p>
        Electricity is invisible, so engineers borrow a picture: water in pipes. It isn't perfect, but it gets you a long
        way.
      </p>
      <Figure label="Fig 1" caption="The water analogy. Voltage is the push, current is the flow, and resistance is how narrow the pipe is." bg="paper">
        <div style={{ padding: '14px 10px 4px' }}>
          <WaterFigure />
        </div>
      </Figure>
      <ul>
        <li>
          <strong>Voltage</strong> (V, measured in <em>volts</em>) is the electrical "pressure" between two points. A USB
          supply pushes with 5 V; a car battery with about 12 V.
        </li>
        <li>
          <strong>Current</strong> (I, measured in <em>amps</em>, A) is how much charge flows past a point each second. Small
          circuits use thousandths of an amp, so you'll mostly see <em>milliamps</em> (mA): 1 A = 1000 mA.
        </li>
        <li>
          <strong>Resistance</strong> (R, measured in <em>ohms</em>, Ω) is how hard a part makes it for current to flow, like a
          narrow section of pipe. Big resistance, small current.
        </li>
      </ul>
      <Callout kind="info" title="Which way does it flow?">
        By convention we draw current flowing from + to −, which is what the dots in the scene show. The electrons themselves
        actually drift the other way. It makes no difference to any of the maths in this course.
      </Callout>

      <h2>Ohm's law</h2>
      <p>
        The three quantities are tied together by <strong>Ohm's law</strong>: the voltage across a resistor equals the current
        through it times its resistance.
      </p>
      <Formula>V = I × R &nbsp;&nbsp;·&nbsp;&nbsp; I = V ÷ R &nbsp;&nbsp;·&nbsp;&nbsp; R = V ÷ I</Formula>
      <p>
        Put 5 V across a 1 kΩ (1000 Ω) resistor and 5 ÷ 1000 = 0.005 A, or 5 mA, flows. Double the voltage and the current
        doubles. Double the resistance and it halves. That's all there is to it, and you just played with it in the scene.
      </p>

      <h2>LEDs are special: forward voltage</h2>
      <p>
        An LED (light-emitting diode) is not a resistor. It's a <em>diode</em>: a one-way valve for current. Below a certain
        voltage, called the <strong>forward voltage</strong> (V<sub>f</sub>), almost nothing flows and it stays dark. Once you
        reach V<sub>f</sub>, it opens up and lights. A red LED needs roughly 2 V; blue and white LEDs need about 3 V. The
        exact figure is in the LED's datasheet.
      </p>
      <p>
        The catch is that once it's open, the LED hardly resists at all. Connect it straight to 5 V and the current shoots up
        until the LED overheats and dies, which is what happened in the scene when you turned the resistor right down. Most
        small indicator LEDs are happy at about 5–20 mA.
      </p>
      <p>
        So we add a <strong>current-limiting resistor</strong> in series. The LED takes its V<sub>f</sub>, the resistor takes
        whatever voltage is left over, and Ohm's law on the resistor sets the current:
      </p>
      <Formula>I = (V<sub>supply</sub> − V<sub>f</sub>) ÷ R</Formula>

      <h3>Polarity: anode and cathode</h3>
      <p>
        Because an LED is one-way, it has to go in the right way round. Current enters at the <strong>anode</strong> (+) and
        leaves at the <strong>cathode</strong> (−). Put it in backwards and it stays dark, as the <em>Flip LED</em> button
        showed.
      </p>
      <Figure label="Fig 2" caption="On a through-hole LED, the cathode has the shorter leg and a flat edge on the rim. In a schematic, the bar at the arrow's tip is the cathode." bg="card">
        <div style={{ padding: '18px 10px 6px' }}>
          <LedFigure />
        </div>
      </Figure>
      <p>
        Surface-mount LEDs like Blinky's 0805 LED are too small for legs, so they usually carry a small mark on the cathode
        side, such as a coloured line or a notch. Marks differ between manufacturers, so check the datasheet. Your PCB's
        silkscreen should show the cathode too, as the flat edge of the outline on the board in the scene does.
      </p>

      <h2>Power: how hot does it get?</h2>
      <p>
        Whenever current flows through resistance, energy turns into heat. The rate is <strong>power</strong>, measured in
        watts (W) or milliwatts (mW):
      </p>
      <Formula>P = V × I &nbsp;&nbsp;=&nbsp;&nbsp; I² × R</Formula>
      <p>
        Every resistor has a power rating. Exceed it and it runs hot, drifts or fails. Small surface-mount resistors are rated
        for less than you might expect, and bigger packages can handle more. Typical ratings (check the datasheet of the exact
        part):
      </p>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Typical rating</th>
            <th>In milliwatts</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0402</td>
            <td>1/16 W</td>
            <td>62.5 mW</td>
          </tr>
          <tr>
            <td>0603</td>
            <td>1/10 W</td>
            <td>100 mW</td>
          </tr>
          <tr>
            <td>0805 (Blinky)</td>
            <td>1/8 W</td>
            <td>125 mW</td>
          </tr>
          <tr>
            <td>1206</td>
            <td>1/4 W</td>
            <td>250 mW</td>
          </tr>
          <tr>
            <td>Through-hole (axial)</td>
            <td>1/4 W is common</td>
            <td>250 mW</td>
          </tr>
        </tbody>
      </table>
      <p>
        A good habit is to keep a resistor below about half its rating. You'll learn what those package names mean in “Packages & footprints”.
      </p>

      <h2>Why Blinky's R3 is 330 Ω</h2>
      <p>
        In Blinky, the 555 chip's output pin switches between 0 V and close to 5 V. When it's high, current flows from the
        output, through <strong>R3</strong>, through the red LED <strong>D1</strong>, to ground.
      </p>
      <Figure label="Fig 3" caption="Blinky's LED branch. The LED takes about 2 V, so R3 is left with the other 3 V." bg="schematic">
        <div style={{ padding: '10px 10px 0' }}>
          <BlinkyBranch />
        </div>
      </Figure>
      <Specs
        items={[
          { k: 'Voltage across R3', v: '3.0 V', note: '5 V supply − 2.0 V for the red LED' },
          { k: 'Current', v: '9.1 mA', note: '3.0 V ÷ 330 Ω: bright but gentle' },
          { k: 'R3 power', v: '27 mW', note: '3.0 V × 9.1 mA, about ⅕ of an 0805’s 125 mW' },
          { k: 'LED power', v: '18 mW', note: '2.0 V × 9.1 mA' },
        ]}
      />
      <p>
        330 Ω is a standard value, and it puts the LED comfortably inside its happy range with plenty of safety margin. A
        smaller resistor would make it brighter (220 Ω gives about 14 mA). A bigger one would make it dimmer, which is handy
        for LEDs that are uncomfortably bright at night.
      </p>
      <Callout kind="tip" title="Standard values">
        Resistors come in standard series rather than every possible number. The <strong>E12</strong> series has 12 values per
        decade: 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68 and 82, then the same again ×10, ×100 and so on. That's why the
        slider in the scene jumps from 270 Ω to 330 Ω to 390 Ω. When your sum lands between two values, pick the next one
        up so the current errs on the safe side.
      </Callout>
      <Callout kind="easyeda" title="In EasyEDA, the value is just an attribute">
        The schematic symbol doesn't know or care what the resistance is. The value (330Ω), the footprint (0805) and the
        supplier part number are attributes you see and edit in the <strong>Property</strong> panel on the right when the
        part is selected. You'll place R3 yourself in the steps on this page, and the menu path is{' '}
        <Menu path={['Place', 'Device']} />.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

const lesson: LessonContent = {
  Scene,
  goal: 'Change the supply voltage, the resistor and the LED colour. Watch the current, the glow, and what happens when you overdo it.',
  missions: [
    { id: 'safe', text: 'Light the LED at a safe current, between 5 and 20 mA' },
    { id: 'burn', text: 'Burn out an LED by letting far too much current through (learning by breaking!)' },
    { id: 'blinky', text: 'Recreate Blinky: 5 V and a red LED. Find the resistor that gives about 9 mA' },
    { id: 'water', text: 'Switch on the water analogy, then raise the resistance to squeeze the pipe' },
  ],
  Article,
  build: {
    intro: <>Place Blinky's current-limiting resistor, R3, and check its value. Use the schematic of the Blinky project you created in “What is a PCB?”.</>,
    steps: [
      {
        title: 'Open the device dialog',
        menu: ['Place', 'Device'],
        keys: ['Shift+F'],
        body: <>This is where you search EasyEDA's parts library. Choose the <b>LCSC Electronics</b> search engine at the top of the dialog.</>,
      },
      {
        title: 'Search for a 330 Ω 0805 resistor',
        body: (
          <>
            Type something like <b>330Ω 0805</b>. Keywords such as <b>0805</b> narrow the results down to that package size. Pick a
            330 Ω resistor in the 0805 package.
          </>
        ),
      },
      {
        title: 'Place it on the sheet',
        keys: ['Space'],
        body: <>Click on the schematic to drop it. Space rotates it (the default shortcut).</>,
      },
      {
        title: 'Check it in the Property panel',
        body: (
          <>
            Select the resistor. The <b>Property</b> panel on the right shows its designator, value, footprint and supplier part
            number. Set the designator to <b>R3</b> and confirm the value reads 330Ω and the footprint is 0805. Tick the value so it
            shows on the canvas.
          </>
        ),
      },
      {
        title: 'Optional: browse the Library panel',
        keys: ['S'],
        body: <>The Library panel at the bottom (System, Recent, Personal and Favorite tabs) is another way to find and reuse parts.</>,
      },
    ],
    tip: <>The LCSC Electronics engine only lists parts that LCSC sells and that have both a symbol and a footprint, so anything you pick there can actually be bought and assembled.</>,
  },
  quiz: [
    {
      q: 'A 9 V battery is connected across a 1 kΩ resistor. How much current flows?',
      options: ['0.9 mA', '9 mA', '90 mA', '9 A'],
      answer: 1,
      explain: 'I = V ÷ R = 9 V ÷ 1000 Ω = 0.009 A, which is 9 mA.',
    },
    {
      q: 'Why does an LED need a resistor in series?',
      options: [
        'To make it change colour',
        'Because once past its forward voltage the LED barely limits current, so something else must',
        'To store charge for when the power is off',
        'It doesn’t; the resistor is only decoration',
      ],
      answer: 1,
      explain: 'Above Vf the LED behaves almost like a closed switch. The resistor takes the leftover voltage and sets the current with Ohm’s law.',
    },
    {
      q: 'Blinky runs a red LED (Vf ≈ 2 V) from 5 V through R3 = 330 Ω. Roughly what current flows?',
      options: ['About 1 mA', 'About 9 mA', 'About 15 mA', 'About 150 mA'],
      answer: 1,
      explain: '(5 − 2) V ÷ 330 Ω ≈ 0.0091 A ≈ 9.1 mA. Comfortably inside the 5–20 mA sweet spot.',
    },
    {
      q: 'On a through-hole LED, how do you find the cathode (−)?',
      options: ['The longer leg', 'The shorter leg, next to the flat edge of the rim', 'The leg nearest the dome', 'Either leg works'],
      answer: 1,
      explain: 'The cathode has the shorter leg and sits by the flat on the rim. The longer leg is the anode (+).',
    },
  ],
  terms: [
    { term: 'Voltage (V)', def: 'Electrical pressure between two points, measured in volts.' },
    { term: 'Current (I)', def: 'How much charge flows per second, measured in amps (A) or milliamps (mA).' },
    { term: 'Resistance (R)', def: 'How strongly something opposes current, measured in ohms (Ω).' },
    { term: "Ohm's law", def: 'V = I × R. Know any two and you can work out the third.' },
    { term: 'Forward voltage (Vf)', def: 'The voltage an LED or diode needs before it conducts: about 2 V for red, 3 V for blue.' },
    { term: 'Anode / cathode', def: 'The + and − terminals of a diode or LED. Current flows from anode to cathode.' },
    { term: 'Current-limiting resistor', def: 'A resistor in series with an LED that sets a safe current.' },
    { term: 'Power rating', def: 'The most heat a part can safely get rid of, in watts. P = V × I.' },
  ],
}

export default lesson
