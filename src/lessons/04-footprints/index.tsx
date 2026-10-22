import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Menu } from '@/components/content'
import { FootprintGraphic, PartBodyTop } from '@/pcb/render'
import { getFootprint } from '@/pcb/footprints'
import { Scene } from './Scene'
import { CrossSection } from './CrossSection'
import './lesson04.css'

const MONO = 'IBM Plex Mono, monospace'

/** Fig 1: anatomy of the SOIC-8 footprint, EDA colours. */
function AnatomyFigure() {
  const fp = getFootprint('SOIC-8')
  const label = (x: number, y: number, tx: number, ty: number, text: string, anchor: 'start' | 'end' = 'start') => (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke="#cfcbbf" strokeWidth={0.04} />
      <circle cx={x} cy={y} r={0.1} fill="#cfcbbf" />
      <text x={tx + (anchor === 'start' ? 0.2 : -0.2)} y={ty + 0.15} fontSize={0.42} fontFamily={MONO} fontWeight={600} letterSpacing="0.05" fill="#ece6d8" textAnchor={anchor}>
        {text}
      </text>
    </g>
  )
  return (
    <svg viewBox="-16.2 -4.4 29.6 8.8" width="100%" style={{ display: 'block', background: '#101210' }} role="img" aria-label="Anatomy of an SOIC-8 footprint: pads, silkscreen outline, pin-1 dot and courtyard, next to the real chip">
      <g transform="translate(-5.2 0)">
        <FootprintGraphic fp={fp} showCourtyard showNumbers />
        {label(-2.7, -1.905, -6.6, -3.2, 'PAD 1', 'end')}
        {label(-3.75, -2.6, -6.6, -2.2, 'PIN-1 DOT', 'end')}
        {label(1.95, 2.56, -6.6, 3.5, 'SILKSCREEN', 'end')}
        {label(-3.7, 1.2, -6.6, 1.0, 'COURTYARD', 'end')}
        {label(2.7, 0.635, 4.6, -3.6, 'PITCH 1.27 MM', 'start')}
      </g>
      <g transform="translate(7.6 0)">
        <PartBodyTop fp={fp} value="NE555" />
        <text x={0} y={3.9} fontSize={0.42} fontFamily={MONO} fontWeight={600} fill="#a9a596" textAnchor="middle">
          THE PACKAGE
        </text>
      </g>
      <text x={-5.2} y={4.1} fontSize={0.42} fontFamily={MONO} fontWeight={600} fill="#a9a596" textAnchor="middle">
        THE FOOTPRINT
      </text>
      <path d="M 1.6 0 L 3.4 0 M 3.0 -0.35 L 3.4 0 L 3.0 0.35" stroke="#e0542c" strokeWidth={0.08} fill="none" />
    </svg>
  )
}

function Article() {
  return (
    <>
      <p className="lead">
        A schematic says <em>what</em> connects to what. A circuit board also needs to know <em>where</em> each metal contact
        of every real part will touch down. That information is the part's <strong>footprint</strong>.
      </p>

      <h2>Package vs footprint</h2>
      <p>
        The <strong>package</strong> is the physical part you hold: its plastic body and metal legs, like the SOIC-8 that
        houses Blinky's 555 chip. The <strong>footprint</strong> (also called a <em>land pattern</em>) is the matching drawing
        on the PCB: copper pads where the legs land, holes if the legs go through, a silkscreen outline and pin-1 mark for
        the person assembling it, and a courtyard that keeps neighbours at a polite distance.
      </p>
      <Figure label="Fig 1" caption="Left: the SOIC-8 footprint in EasyEDA’s colours (red pads, yellow silkscreen). Right: the package that will sit on it." bg="eda">
        <div style={{ padding: '6px 4px' }}>
          <AnatomyFigure />
        </div>
      </Figure>
      <ul>
        <li>
          <strong>Pads</strong>: bare copper where solder joins the leg to the board.
        </li>
        <li>
          <strong>Pitch</strong>: the centre-to-centre distance between neighbouring pads. An SOIC-8 has a 1.27 mm (0.05 inch)
          pitch; through-hole DIP chips and pin headers usually use 2.54 mm (0.1 inch).
        </li>
        <li>
          <strong>Pin-1 marker</strong>: a silkscreen dot, a notch in the outline, or a square pad, so the chip goes on the
          right way round.
        </li>
        <li>
          <strong>Courtyard</strong>: an invisible keep-out rectangle around the part. Other parts shouldn't overlap it, so
          there's room to place, solder and inspect.
        </li>
      </ul>

      <h2>Through-hole or surface-mount?</h2>
      <p>
        <strong>Through-hole (THT)</strong> parts have wire legs that pass through plated holes and are soldered on the far
        side. <strong>Surface-mount (SMD)</strong> parts sit flat on pads on one side of the board, with no holes at all.
      </p>
      <Figure label="Fig 2" caption="Cross-sections, exaggerated in thickness. A through-hole joint fills the plated barrel; a surface-mount joint wets the pad and the lead’s heel and toe." bg="card">
        <div style={{ padding: '10px 6px 0' }}>
          <CrossSection solder />
        </div>
      </Figure>
      <div className="l04-pc">
        <div>
          <b>Through-hole</b>
          <span className="is-pro">Very strong: good for connectors and things that get pulled</span>
          <span className="is-pro">Easy to solder by hand and to use on breadboards</span>
          <span className="is-con">Needs drilled holes and takes room on both sides</span>
        </div>
        <div>
          <b>Surface-mount</b>
          <span className="is-pro">Much smaller and cheaper; machines place them fast</span>
          <span className="is-pro">Parts can go on both sides of the board</span>
          <span className="is-con">The tiniest sizes are fiddly to solder by hand</span>
        </div>
      </div>
      <p>
        Most modern boards are mostly SMD, with a few through-hole connectors. Blinky follows the same pattern: SMD parts
        everywhere except the J1 power header.
      </p>

      <h2>What "0805" means</h2>
      <p>
        Chip resistors, capacitors and LEDs are named by a 4-digit <strong>size code</strong>: length then width. EasyEDA and
        LCSC use the <strong>imperial</strong> code, in hundredths of an inch, so 0805 is 0.08 × 0.05 inch.
      </p>
      <table className="l04-sizes">
        <thead>
          <tr>
            <th>Imperial</th>
            <th>Metric</th>
            <th>Size (L × W)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>0402</td><td>1005</td><td>1.0 × 0.5 mm</td></tr>
          <tr><td>0603</td><td>1608</td><td>1.6 × 0.8 mm</td></tr>
          <tr><td>0805</td><td>2012</td><td>2.0 × 1.25 mm</td></tr>
          <tr><td>1206</td><td>3216</td><td>3.2 × 1.6 mm</td></tr>
        </tbody>
      </table>
      <Callout kind="danger" title="The 0603 trap">
        Some datasheets use the <strong>metric</strong> code instead. Metric "0603" means 0.6 × 0.3 mm, which is imperial{' '}
        <strong>0201</strong>: under half the length of an imperial 0603 and very hard to hand-solder. When you see a
        size code, check which system it's in, and check the actual millimetres.
      </Callout>

      <h2>Why the footprint must match the datasheet</h2>
      <p>
        A footprint is a promise: "a part with exactly these leads will land here". If the promise is wrong (pads too far
        apart, the wrong pitch, pins numbered in a different order), the factory will build the board perfectly and the part
        still won't fit. You found that out in the <em>Fit test</em>. The usual fix is a new board revision, so it's worth a
        minute of checking up front.
      </p>
      <p>
        Every datasheet has a drawing of the package and usually a <strong>recommended land pattern</strong>, the
        manufacturer's suggested pad sizes and spacing. Library footprints are normally right, but always compare the
        package name, pin count, pitch and pin-1 position with the datasheet of the exact part you're buying.
      </p>

      <h2>Blinky's choices</h2>
      <ul>
        <li>
          <strong>0805</strong> for every resistor, capacitor and the LED: small, cheap, and still big enough to solder by
          hand with a fine iron.
        </li>
        <li>
          <strong>SOIC-8</strong> for the 555: surface-mount with a comfortable 1.27 mm pitch.
        </li>
        <li>
          <strong>2.54 mm pin header</strong> for J1, because power wires get tugged, and through-hole joints are strong.
        </li>
      </ul>
      <Callout kind="easyeda" title="In EasyEDA, the footprint is an attribute of the part">
        Select a part and its footprint appears in the <strong>Property</strong> panel next to the designator and supplier
        part number. To check or swap it, open the <strong>Footprint Manager</strong> (
        <Menu path={['Tools', 'Footprint Manager']} />, or click the footprint attribute). You'll do exactly that in the steps
        on this page.
      </Callout>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Explore real footprints: measure pads, find pin 1, compare sizes, and see what happens with the wrong footprint.',
  missions: [
    { id: 'sizes', text: 'Compare all four chip sizes: 0402, 0603, 0805 and 1206' },
    { id: 'pitch', text: 'Turn on Dimensions and read the pitch of the SOIC-8' },
    { id: 'pin1', text: 'Find pin 1 on the SOIC-8 or the DIP-8 and click it' },
    { id: 'mismatch', text: 'In the Fit test, put a part on the wrong footprint and see why it fails' },
  ],
  Article,
  build: {
    intro: <>Check that a part's footprint matches the real thing before you lay out a board. Use any part in your Blinky schematic.</>,
    steps: [
      {
        title: 'Select a part and look at its footprint',
        body: (
          <>
            Click a part (say R3). In the <b>Property</b> panel on the right, find its <b>footprint</b> attribute. For R3 it
            should be an 0805 resistor footprint.
          </>
        ),
      },
      {
        title: 'Open the Footprint Manager',
        menu: ['Tools', 'Footprint Manager'],
        body: <>You can also click the footprint attribute in the Property panel. The manager shows each part's footprint and lets you swap it.</>,
      },
      {
        title: 'Run the four checks',
        body: (
          <>
            1. The package name on the LCSC/JLCPCB part page (e.g. SOIC-8, 0805) matches the footprint name. 2. The preview has
            the right pin count and pitch. 3. The pads match the datasheet's recommended land pattern. 4. The C-number in the
            Property panel is the part you mean to order.
          </>
        ),
      },
      {
        title: 'Measure in millimetres',
        keys: ['Q'],
        body: <>In the PCB editor, Q switches the units between mm and mil (also in the View menu), handy when comparing with a datasheet.</>,
      },
    ],
    tip: <>Prefer through-hole for connectors that get plugged and unplugged, and 0805 or larger for parts you'll hand-solder.</>,
  },
  quiz: [
    {
      q: 'What does the code “0805” describe?',
      options: ['A resistor value of 805 Ω', 'A chip about 0.08 × 0.05 inch (2.0 × 1.25 mm)', 'The pitch of a connector', 'A tolerance of 0.805%'],
      answer: 1,
      explain: 'It is an imperial size code: 0.08 × 0.05 inch, which is 2.0 × 1.25 mm. The metric code for the same size is 2012.',
    },
    {
      q: 'What is the pin pitch of an SOIC-8 package?',
      options: ['0.5 mm', '1.27 mm', '2.54 mm', '7.62 mm'],
      answer: 1,
      explain: 'SOIC parts use a 1.27 mm (0.05 inch) pitch, half the 2.54 mm of a DIP.',
    },
    {
      q: 'A datasheet lists a capacitor as size “0603 (metric)”. Which imperial size is that?',
      options: ['0603', '0402', '0201', '1206'],
      answer: 2,
      explain: 'Metric 0603 is 0.6 × 0.3 mm, which is imperial 0201: a much smaller part.',
    },
    {
      q: 'You put an SOIC-8 footprint on your board but bought the DIP-8 version of the chip. What happens?',
      options: ['It fits; the chip is the same', 'The factory adjusts the pads for you', 'The legs don’t line up with the pads, so the part can’t be fitted properly', 'Only pin 1 is affected'],
      answer: 2,
      explain: 'Same chip, different package: a DIP has 2.54 mm-pitch legs for holes, while the SOIC footprint has 1.27 mm-pitch pads.',
    },
  ],
  terms: [
    { term: 'Footprint', def: 'The pattern of pads, holes and markings on a PCB that a specific package is soldered to. Also called a land pattern.' },
    { term: 'Package', def: 'The physical body and leads of a part, such as SOIC-8 or 0805.' },
    { term: 'THT', def: 'Through-hole technology: leads pass through plated holes.' },
    { term: 'SMD', def: 'Surface-mount device: sits on pads on the board surface.' },
    { term: 'Pitch', def: 'Centre-to-centre distance between neighbouring pins or pads.' },
    { term: 'Courtyard', def: 'A keep-out outline around a footprint that other parts must not overlap.' },
    { term: 'Pin-1 marker', def: 'A dot, notch or square pad that shows which pin is number 1.' },
    { term: 'Land pattern', def: 'The manufacturer’s recommended pad layout, found in the datasheet.' },
  ],
}

export default lesson
