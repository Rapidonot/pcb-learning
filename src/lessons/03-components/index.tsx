import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Formula, Menu, Specs } from '@/components/content'
import { parts as blinkyParts } from '@/pcb/project'
import { getFootprint } from '@/pcb/footprints'
import { Scene } from './Scene'
import { BANDS } from './Decoder'
import './lesson03.css'

const MONO = 'IBM Plex Mono, monospace'

/** Fig: pin numbering on DIP-8 and SOIC-8, seen from the top. */
function PinOneFigure() {
  const chip = (x: number, w: number, h: number, pitch: number, legLen: number, label: string, dip: boolean) => {
    const ys = [0, 1, 2, 3].map((i) => (i - 1.5) * pitch)
    return (
      <g transform={`translate(${x} 125)`}>
        {ys.map((y, i) => (
          <g key={i}>
            <rect x={-w / 2 - legLen} y={y - 5} width={legLen + 2} height={10} rx={2} fill="url(#l03f-metal)" />
            <rect x={w / 2 - 2} y={y - 5} width={legLen + 2} height={10} rx={2} fill="url(#l03f-metal)" />
            <text x={-w / 2 - legLen - 8} y={y + 4} fontSize={12} fontFamily={MONO} fontWeight={600} textAnchor="end" fill={i === 0 ? 'var(--accent-ink)' : 'var(--ink-2)'}>
              {i + 1}
            </text>
            <text x={w / 2 + legLen + 8} y={-y + 4} fontSize={12} fontFamily={MONO} fontWeight={600} fill="var(--ink-2)">
              {i + 5}
            </text>
          </g>
        ))}
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill="url(#l03f-plastic)" filter="url(#l03f-sh)" />
        {dip ? <path d={`M -11 ${-h / 2} A 11 11 0 0 0 11 ${-h / 2} Z`} fill="#121214" /> : <rect x={-w / 2} y={-h / 2} width={w} height={6} rx={3} fill="#fff" opacity={0.08} />}
        <circle cx={-w / 2 + 13} cy={-h / 2 + (dip ? 22 : 13)} r={dip ? 5 : 4.5} fill="#121214" stroke="#000" strokeOpacity={0.4} />
        <text x={0} y={8} fontSize={13} fontFamily={MONO} fontWeight={600} fill="#cfcfcf" textAnchor="middle">
          NE555
        </text>
        <path d={`M ${w / 2 + legLen + 34} ${-pitch * 1.5} A 30 ${pitch * 1.7} 0 0 1 ${w / 2 + legLen + 34} ${pitch * 1.5}`} fill="none" />
        <text x={0} y={h / 2 + 34} fontSize={11} fontFamily={MONO} letterSpacing="0.12em" fontWeight={600} textAnchor="middle" fill="var(--ink-3)">
          {label}
        </text>
      </g>
    )
  }
  return (
    <svg viewBox="0 0 640 260" width="100%" style={{ display: 'block' }} role="img" aria-label="Pin numbering of DIP-8 and SOIC-8 packages: pin 1 next to the notch or dot, counting anticlockwise">
      <defs>
        <linearGradient id="l03f-plastic" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4a50" />
          <stop offset="0.5" stopColor="#2a2a2e" />
          <stop offset="1" stopColor="#19191b" />
        </linearGradient>
        <linearGradient id="l03f-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.5" stopColor="#c0c5cb" />
          <stop offset="1" stopColor="#868c93" />
        </linearGradient>
        <filter id="l03f-sh" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3c2d14" floodOpacity="0.3" />
        </filter>
        <marker id="l03f-arr" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
      </defs>
      {chip(170, 92, 150, 34, 18, 'DIP-8 · TOP VIEW', true)}
      {chip(470, 70, 94, 22, 16, 'SOIC-8 · TOP VIEW', false)}
      {/* counting arrows */}
      <path d="M 92 60 C 70 110 70 150 92 196" fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="4 4" markerEnd="url(#l03f-arr)" />
      <text x={22} y={130} fontSize={11} fontFamily={MONO} fill="var(--accent-ink)" fontWeight={600}>
        1→4
      </text>
      <path d="M 248 196 C 270 150 270 110 248 60" fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="4 4" markerEnd="url(#l03f-arr)" />
      <text x={272} y={130} fontSize={11} fontFamily={MONO} fill="var(--accent-ink)" fontWeight={600}>
        5→8
      </text>
      <g fontFamily={MONO} fontSize={11} fill="var(--ink-2)">
        <text x={170} y={30} textAnchor="middle">
          notch + dot = pin 1 end
        </text>
        <text x={470} y={52} textAnchor="middle">
          dot = pin 1
        </text>
      </g>
    </svg>
  )
}

function ColourTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Colour</th>
          <th>Digit</th>
          <th>Multiplier</th>
        </tr>
      </thead>
      <tbody>
        {BANDS.slice(0, 8).map((b, i) => (
          <tr key={b.name}>
            <td>
              <span className="l03-sw" style={{ background: b.c }} /> {b.name}
            </td>
            <td className="mono">{i}</td>
            <td className="mono">×{(10 ** i).toLocaleString('en-GB')}</td>
          </tr>
        ))}
        <tr>
          <td>
            <span className="l03-sw" style={{ background: '#c9a43a' }} /> Gold (4th band)
          </td>
          <td className="mono">–</td>
          <td className="mono">±5% tolerance</td>
        </tr>
      </tbody>
    </table>
  )
}

function Article() {
  return (
    <>
      <p className="lead">
        Electronics looks intimidating until you notice that almost every board is built from the same small cast of
        characters. Learn to recognise about ten of them and you can read most hobby circuits, including all of Blinky.
      </p>

      <h2>Passive and active parts</h2>
      <p>
        <strong>Passive</strong> parts (resistors and capacitors) can't amplify or switch anything. They resist, store or
        filter. <strong>Active</strong> parts (diodes, LEDs, transistors and chips) control the flow of current in a more
        interesting way: one-way only, switched on and off, or amplified. A third family is{' '}
        <em>electromechanical</em>: connectors and switches, the bits you physically plug in or press.
      </p>
      <p>
        Every part also has a letter, its <strong>designator</strong>, which you'll see printed next to it on the board and
        in the schematic: R1, C2, U1 and so on. The letter tells you the family and the number tells parts apart.
      </p>
      <table>
        <thead>
          <tr>
            <th>Letter</th>
            <th>Part</th>
            <th>In Blinky</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className="mono">R</td><td>Resistor</td><td>R1, R2, R3</td></tr>
          <tr><td className="mono">C</td><td>Capacitor</td><td>C1, C2, C3</td></tr>
          <tr><td className="mono">D</td><td>Diode or LED</td><td>D1</td></tr>
          <tr><td className="mono">U</td><td>Integrated circuit (chip)</td><td>U1, the 555</td></tr>
          <tr><td className="mono">Q</td><td>Transistor</td><td>none</td></tr>
          <tr><td className="mono">J</td><td>Connector (jack)</td><td>J1</td></tr>
          <tr><td className="mono">SW</td><td>Switch</td><td>none</td></tr>
        </tbody>
      </table>

      <h2>Resistors and their codes</h2>
      <p>
        You met the resistor in "Volts, amps & the humble resistor": it limits current. Values run from under an ohm to
        millions of ohms, so we use prefixes: <strong>k</strong> for a thousand and <strong>M</strong> for a million. You'll
        often see the prefix used as the decimal point, as in <code>4k7</code> = 4.7 kΩ, because a printed dot is easy to
        lose.
      </p>
      <p>
        Through-hole resistors are too small to print on, so they wear <strong>colour bands</strong>. Read from the end
        with bands bunched together: two digits, then a multiplier, then a gap and a tolerance band.
      </p>
      <ColourTable />
      <p>
        Orange, orange, brown, gold is 3, 3, ×10: <strong>330 Ω ±5%</strong>, Blinky's R3. Surface-mount chip resistors use a
        printed <strong>3-digit code</strong> instead, with the same idea: two digits and then the number of zeros.
      </p>
      <Formula>331 → 33 + one zero = 330 Ω &nbsp;·&nbsp; 102 → 1 000 Ω = 1 kΩ &nbsp;·&nbsp; 473 → 47 000 Ω = 47 kΩ</Formula>
      <p>
        Some precision resistors use 4 digits or a letter code instead. When in doubt, the part's datasheet decides.
      </p>

      <h2>Capacitors: tiny charge tanks</h2>
      <p>
        A capacitor stores charge on two conductive plates separated by a thin insulator. It can't hold much, but it can
        give it back almost instantly. Capacitance is measured in farads (F), but real parts are tiny fractions of a farad:
      </p>
      <Specs
        items={[
          { k: 'µF', v: 'microfarad', note: 'a millionth of a farad. Electrolytics, big ceramics' },
          { k: 'nF', v: 'nanofarad', note: 'a thousandth of a µF: 1 µF = 1000 nF' },
          { k: 'pF', v: 'picofarad', note: 'a thousandth of a nF: 1 nF = 1000 pF' },
          { k: 'Classic', v: '100 nF', note: 'the go-to decoupling value, also written 0.1 µF' },
        ]}
      />
      <ul>
        <li>
          <strong>Ceramic capacitors</strong> (MLCCs, "multi-layer ceramic capacitors") are small, cheap, and work either way
          round. All three of Blinky's capacitors are ceramic 0805 chips. They have no markings at all, so keep them labelled.
        </li>
        <li>
          <strong>Electrolytic capacitors</strong> pack far more capacitance into a can, but they are{' '}
          <strong>polarised</strong>: the stripe marks the negative leg, and fitting one backwards can destroy it.
        </li>
      </ul>
      <Callout kind="tip" title="Decoupling: why C2 sits right next to the 555">
        When a chip switches, it gulps current in short bursts, and the supply wiring can't respond instantly. A small
        ceramic capacitor right beside the chip's power pins acts as a local reservoir and smooths those dips out. That's
        Blinky's <strong>C2</strong> (100 nF), which is why it sits right beside U1 on the finished board.
      </Callout>

      <h2>Diodes and LEDs: one-way streets</h2>
      <p>
        A diode lets current through in one direction only, from <strong>anode</strong> to <strong>cathode</strong>. On the
        part, the cathode is marked with a band (diodes), or with a flat edge and shorter leg (through-hole LEDs). In the
        schematic symbol, the bar at the tip of the triangle is the cathode, so the symbol even looks like the marking.
      </p>

      <h2>Chips: pin 1 is everything</h2>
      <p>
        An integrated circuit (IC) is a whole circuit, often thousands of transistors, sealed in a plastic package with
        metal legs. Chips have no "value"; they have a <strong>part number</strong> (NE555) and a{' '}
        <strong>datasheet</strong>, the manufacturer's document listing every pin, limit and recommended circuit. You'll dig
        into datasheets in "Choosing parts & reading datasheets".
      </p>
      <p>
        Because every pin does something different, you must know which leg is which. Every package marks{' '}
        <strong>pin 1</strong> with a notch, a dot or a bevelled edge. Looking down from the top, the pins are numbered
        anticlockwise from pin 1.
      </p>
      <Figure label="Fig 1" caption="The same 555 in two packages. Pin 1 is next to the notch or dot, and the numbers run anticlockwise when viewed from the top." bg="paper">
        <div style={{ padding: '14px 10px 0' }}>
          <PinOneFigure />
        </div>
      </Figure>
      <p>
        <strong>Transistors</strong> are the building block inside every chip, and you'll also meet them on their own in
        tiny packages like SOT-23. Like chips, they're identified by part number, and their three legs aren't
        interchangeable.
      </p>

      <h2>Connectors and switches</h2>
      <p>
        Connectors (letter <strong>J</strong>) are where the outside world plugs in. Blinky's J1 is a 2-pin header on the
        standard 2.54 mm (0.1 inch) pitch, bringing in 5 V and ground. Switches (<strong>SW</strong>) make or break a
        connection when you press or slide them.
      </p>

      <h2>Blinky's parts list</h2>
      <p>Here is the whole bill of materials (BOM) for Blinky. You now know every family on it.</p>
      <table>
        <thead>
          <tr>
            <th>Ref</th>
            <th>Value</th>
            <th>Package</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          {blinkyParts.map((p) => (
            <tr key={p.ref}>
              <td className="mono">{p.ref}</td>
              <td className="mono">{p.value}</td>
              <td className="mono">{getFootprint(p.fp).pkg}</td>
              <td>{p.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Callout kind="easyeda" title="Parts in EasyEDA come from LCSC">
        EasyEDA's parts library is linked to LCSC, an electronics distributor. Each stocked part has an{' '}
        <strong>LCSC part number</strong>, a "C-number" such as <code>C21190</code>. On jlcpcb.com the same number appears as
        the "JLCPCB Part #". It's stored in the part's supplier part attribute, so the BOM and assembly service know
        exactly which part you mean. You'll open the library with <Menu path={['Place', 'Device']} />.
      </Callout>
      <Callout kind="fab" title="Basic vs Extended parts">
        If you later have JLCPCB assemble your boards, parts are either <strong>Basic</strong> (kept loaded on the machines,
        so no loading fee) or <strong>Extended</strong> (loaded by hand, which adds a fee for each unique Extended part).
        Check a part's status on jlcpcb.com/parts. Choosing Basic parts where you can keeps small orders cheap.
      </Callout>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Click parts in the tray to inspect them. Then play the symbol game and decode a resistor value.',
  missions: [
    { id: 'inspect3', text: 'Inspect three different parts from the tray' },
    { id: 'polarity', text: 'Find the polarity mark on the LED, the diode or the electrolytic capacitor' },
    { id: 'match', text: 'Finish the symbol game: match each schematic symbol to its part' },
    { id: 'decode', text: 'In the value decoder, dial in Blinky’s R3: 330 Ω' },
  ],
  Article,
  build: {
    intro: <>Get to know EasyEDA's parts library. You don't need to place anything yet; just explore.</>,
    steps: [
      {
        title: 'Open the Library panel',
        keys: ['S'],
        body: (
          <>
            In a schematic, open the <b>Library</b> panel at the bottom (click it at the bottom left, use the View menu, or press
            S). It has System, Recent, Personal and Favorite tabs.
          </>
        ),
      },
      {
        title: 'Search the LCSC catalogue',
        menu: ['Place', 'Device'],
        keys: ['Shift+F'],
        body: (
          <>
            Choose the <b>LCSC Electronics</b> search engine and try <b>NE555</b>, then <b>100nF 0805</b>. Only parts that LCSC
            sells <i>and</i> that have a symbol and footprint appear here.
          </>
        ),
      },
      {
        title: 'Find the C-number',
        body: (
          <>
            Each result has an LCSC part number starting with <b>C</b>. After placing a part, you'll find it in the{' '}
            <b>Property</b> panel as the supplier part number, next to the designator and footprint.
          </>
        ),
      },
      {
        title: 'Check Basic or Extended',
        body: (
          <>
            Look the C-number up on <b>jlcpcb.com/parts</b>. It says whether the part is Basic or Extended, which matters if
            you order assembled boards.
          </>
        ),
      },
    ],
    tip: <>Picking the right part and reading its datasheet get a lesson of their own: "Choosing parts & reading datasheets".</>,
  },
  quiz: [
    {
      q: 'Which designator letter would you expect on the 555 timer chip?',
      options: ['C', 'Q', 'U', 'T'],
      answer: 2,
      explain: 'Integrated circuits use U (U1, U2…). Q is for single transistors.',
    },
    {
      q: 'A chip resistor is printed “472”. What is its value?',
      options: ['472 Ω', '4.7 kΩ', '47 kΩ', '4.72 Ω'],
      answer: 1,
      explain: '47 followed by two zeros: 4700 Ω, which is 4.7 kΩ.',
    },
    {
      q: 'Which of these parts must go in the right way round?',
      options: ['A ceramic capacitor', 'A resistor', 'An electrolytic capacitor', 'All of them'],
      answer: 2,
      explain: 'Electrolytic capacitors are polarised. The stripe marks the negative leg. Resistors and ceramic capacitors work either way.',
    },
    {
      q: 'Blinky’s decoupling capacitor C2 is 100 nF. How else could you write that?',
      options: ['0.1 µF', '1 µF', '100 pF', '10 µF'],
      answer: 0,
      explain: '1 µF = 1000 nF, so 100 nF = 0.1 µF.',
    },
  ],
  terms: [
    { term: 'Passive component', def: 'A part that resists, stores or filters but cannot amplify or switch: resistors, capacitors.' },
    { term: 'Active component', def: 'A part that controls current: diodes, LEDs, transistors and chips.' },
    { term: 'Designator', def: 'A part’s label on the schematic and board, like R1 or U1. The letter gives the family.' },
    { term: 'Capacitor', def: 'A part that stores a small amount of charge and releases it quickly. Measured in farads.' },
    { term: 'Decoupling capacitor', def: 'A small capacitor beside a chip’s power pins that smooths out supply dips.' },
    { term: 'Polarised', def: 'A part that only works one way round, like an LED or electrolytic capacitor.' },
    { term: 'Pin 1', def: 'The reference pin of a chip, marked by a notch, dot or bevel. The others count from it.' },
    { term: 'C-number', def: 'An LCSC part number (like C21190) that identifies the exact part to buy.' },
  ],
}

export default lesson
