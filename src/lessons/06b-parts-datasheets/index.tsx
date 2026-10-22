import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Compare, Figure, Menu, Specs, Steps } from '@/components/content'
import { FootprintGraphic } from '@/pcb/render'
import { getFootprint, type FootprintDef } from '@/pcb/footprints'
import { MASKS } from '@/pcb/palette'
import { Scene } from './Scene'
import { VSSOP8 } from './data'
import './lesson06b.css'

/* ------------------------------------------------------------------ */
/* Figure: one chip, three packages, drawn to the same scale           */
/* ------------------------------------------------------------------ */

function PackageLineup() {
  const items: { fp: FootprintDef; label: string; note: string; x: number }[] = [
    { fp: getFootprint('DIP-8'), label: 'DIP-8', note: '2.54 mm pitch · through-hole', x: 11 },
    { fp: getFootprint('SOIC-8'), label: 'SOIC-8', note: '1.27 mm pitch · easy SMD', x: 34 },
    { fp: VSSOP8, label: 'VSSOP-8', note: '0.65 mm pitch · tricky by hand', x: 56 },
  ]
  return (
    <svg viewBox="0 0 67 22" width="100%" style={{ display: 'block', padding: '18px 14px 6px' }} role="img" aria-label="DIP-8, SOIC-8 and VSSOP-8 footprints to scale">
      <defs>
        <radialGradient id="l6b-fig-mask" cx="0.35" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#2a8358" />
          <stop offset="1" stopColor={MASKS.green.mask} />
        </radialGradient>
      </defs>
      {items.map((it) => (
        <g key={it.label} transform={`translate(${it.x} 8.5)`}>
          <rect x={-it.fp.courtyard.w - 0.8} y={-6.6} width={(it.fp.courtyard.w + 0.8) * 2} height={13.2} rx={0.8} fill="url(#l6b-fig-mask)" />
          <FootprintGraphic fp={it.fp} mode="real" showBody value={it.label === 'DIP-8' ? 'NE555P' : undefined} />
          <text y={9.4} textAnchor="middle" fontSize={1.25} fontWeight={700} fill="var(--ink)" fontFamily="IBM Plex Mono, monospace">
            {it.label}
          </text>
          <text y={11.2} textAnchor="middle" fontSize={0.95} fill="var(--ink-3)" fontFamily="IBM Plex Mono, monospace">
            {it.note}
          </text>
        </g>
      ))}
    </svg>
  )
}

function Article() {
  return (
    <>
      <p className="lead">
        A schematic symbol is only a drawing. Before you wire one up, you need to know which <em>real</em> part it stands for:
        the exact chip, in the exact package, that a shop can sell you and a factory can solder. The document that tells you
        everything about that part is its <strong>datasheet</strong>.
      </p>

      <h2>Why datasheets matter</h2>
      <p>
        A datasheet is the manufacturer's instruction manual for a component. It answers the questions that decide whether
        your board works: <strong>what voltage it needs, what each pin does, how much current it can handle, and what shape
        its pads should be</strong>. Guessing any of these is how chips get destroyed and boards come back unsolderable.
      </p>
      <p>
        Datasheets can run to dozens of pages, but you rarely read them cover to cover. Like a recipe book, you jump to the
        part you need. The trick is knowing what each section is for.
      </p>

      <h2>The anatomy of a datasheet</h2>
      <Steps
        items={[
          { title: 'Features & description', body: 'The headline numbers on page one. Use them for a quick yes or no ("does it run from 5 V?"), then confirm in the tables.' },
          { title: 'Pin configuration', body: 'A top-view drawing with every pin numbered and named, plus a table of what each pin does. Pin 1 is marked with a dot or notch.' },
          { title: 'Absolute maximum ratings', body: 'The survival limits. Cross one, even briefly, and the part may be damaged for good.' },
          { title: 'Recommended operating conditions', body: 'The comfortable range the part is designed for. Your circuit should sit inside it.' },
          { title: 'Electrical characteristics', body: 'Measured behaviour under stated test conditions, with min, typical and max columns.' },
          { title: 'Typical application', body: 'A working circuit from the chip designers. Often the best starting point for your schematic.' },
          { title: 'Package & land pattern', body: 'The mechanical drawing of the part, and the copper pads the maker recommends for your PCB.' },
        ]}
      />
      <p>
        The pair that trips beginners up is <strong>absolute maximum</strong> versus <strong>recommended</strong>. Think of a car engine's rev counter: the recommended range is where you drive every day, and the absolute maximum is the
        red line where the engine starts to get damaged. For the 555 in this lesson, 5 V to 15 V is the everyday range and 18 V is the red line.
      </p>
      <Compare
        leftLabel="Design for"
        rightLabel="Never reach"
        left={<p>Recommended operating conditions: 5 V to 15 V. Blinky's 5 V sits inside this window, so every number in the datasheet applies.</p>}
        right={<p>Absolute maximum: 18 V. It is a cliff edge, not a target. Above it the chip can fail instantly or slowly, and either way it is dead.</p>}
      />

      <h2>Finding the part in EasyEDA</h2>
      <p>
        In EasyEDA Pro you search for parts with <Menu path={['Place', 'Device']} /> (default shortcut <b>Shift+F</b>). The
        dialog offers two search engines:
      </p>
      <ul>
        <li>
          <strong>LCSC Electronics</strong> only shows parts that LCSC sells <em>and</em> that already have a symbol and a
          footprint. This is the beginner's best friend: everything in it can be bought and placed.
        </li>
        <li>
          <strong>EasyEDA</strong> also shows parts LCSC doesn't sell, including ones shared by other users. Useful, but check
          them more carefully.
        </li>
      </ul>
      <p>
        Results can be narrowed with filters. Typing a package size such as <code>0603</code> or <code>SOIC</code> is a quick
        way to cut a long list down.
      </p>
      <Callout kind="easyeda" title="The C-number">
        Every LCSC part has a part number that starts with C, such as C21190. JLCPCB shows the same number as the "JLCPCB
        Part #". In EasyEDA it is stored in the part's supplier part attribute, which you can see in the right-hand{' '}
        <b>Property</b> panel. Your BOM (bill of materials) and an assembly order use it to identify the exact part, so a part
        with no C-number can't be matched automatically.
      </Callout>

      <h2>Basic and Extended parts</h2>
      <p>
        If you let JLCPCB assemble your board, parts come in two classes. <strong>Basic</strong> parts stay loaded on the
        pick-and-place machines, so there is no loading fee. <strong>Extended</strong> parts have to be loaded by hand, which
        adds a fee for each unique Extended part (at the time of writing, $3 each on Economic assembly). "Preferred extended"
        parts are an exception on Economic orders. For a cheap first board, prefer Basic parts, and always check the current
        class on <b>jlcpcb.com/parts</b>.
      </p>

      <h2>Choose packages you can solder</h2>
      <p>
        The same chip often comes in several packages. If you plan to solder by hand, <strong>bigger is kinder</strong>.
      </p>
      <Figure label="Fig 1" caption="One 555 timer, three packages, drawn to the same scale. Blinky uses SOIC-8: small, but its legs stick out where your iron can reach them." bg="paper">
        <PackageLineup />
      </Figure>
      <Specs
        items={[
          { k: 'Resistors & capacitors', v: '0805', note: '2.0 × 1.25 mm. The usual hand-soldering size. 0402 is a struggle.' },
          { k: 'Chips', v: 'SOIC', note: '1.27 mm pitch, legs visible. Avoid QFN and BGA, whose pads hide underneath.' },
          { k: 'Watch out', v: 'Size codes', note: 'EasyEDA and LCSC use imperial codes. Metric "0603" is imperial 0201: tiny!' },
        ]}
      />

      <h2>Check the footprint before you trust it</h2>
      <p>
        A footprint is the copper pattern the part lands on (you met them in <em>Packages & footprints</em>). Libraries are
        usually right, but a mismatched footprint is one of the most expensive beginner mistakes, because you only find out
        when the boards arrive. A quick check takes a minute:
      </p>
      <Steps
        items={[
          { title: 'Name', body: 'The package on the LCSC or JLCPCB part page (say, SOIC-8) matches the footprint name.' },
          { title: 'Pins and pitch', body: 'Open the footprint or 3D preview. Count the pads and check the spacing against the datasheet.' },
          { title: 'Land pattern', body: 'Compare the pad layout with the datasheet\'s recommended land pattern, and check where pin 1 is.' },
          { title: 'C-number', body: 'Make sure the supplier part in the Property panel is the part you actually intend to order.' },
        ]}
      />
      <p>
        If something is off, you don't have to start again. The <Menu path={['Tools', 'Footprint Manager']} /> (or a click on
        the footprint attribute in the Property panel) lets you swap in the right footprint.
      </p>
      <Callout kind="tip" title="Pick every Blinky part now">
        While you're in the device search, find the rest of the board too: 0805 resistors (1 kΩ, 47 kΩ, 330 Ω), 0805
        capacitors (10 µF, 100 nF, 10 nF), an 0805 red LED and a 2-pin 2.54 mm header. In the next lesson you'll wire them
        all together.
      </Callout>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Read a 555 datasheet, find the right part in a mock EasyEDA search, and check that its footprint matches.',
  missions: [
    { id: 'vcc', text: 'Find the VCC (power) pin in the pinout' },
    { id: 'absmax', text: 'Find the maximum supply voltage the chip can survive' },
    { id: 'pick', text: 'Pick and place the right 555 for Blinky (SOIC-8, runs at 5 V)' },
    { id: 'footprint', text: 'Pass all four footprint checks against the datasheet' },
  ],
  Article,
  build: {
    intro: <>Find Blinky's 555 timer in the real library and make sure it's the part you want.</>,
    steps: [
      {
        title: 'Open the device search',
        menu: ['Place', 'Device'],
        keys: ['Shift+F'],
        body: <>Open the Blinky schematic first. The device dialog searches EasyEDA's online library.</>,
      },
      {
        title: 'Search with the LCSC Electronics engine',
        body: (
          <>
            Choose the <b>LCSC Electronics</b> search engine and type <b>NE555</b>. Every result can be bought from LCSC and
            already has a symbol and a footprint.
          </>
        ),
      },
      {
        title: 'Filter by package',
        body: (
          <>
            Type <b>SOIC</b> into the filter to hide the through-hole and fine-pitch versions. Later, typing <b>0805</b> does
            the same for resistors and capacitors.
          </>
        ),
      },
      {
        title: 'Inspect the previews',
        body: <>Look at the footprint and 3D previews: 8 pads, 1.27 mm pitch, pin 1 marked. Compare them with the datasheet.</>,
      },
      {
        title: 'Place it and check the supplier number',
        body: (
          <>
            Place the part, select it, and look at the right-hand <b>Property</b> panel. The supplier and supplier part
            (the C-number) should be filled in.
          </>
        ),
      },
      {
        title: 'Swap the footprint if needed',
        menu: ['Tools', 'Footprint Manager'],
        body: <>If the footprint doesn't match the datasheet, swap it here (or click the footprint attribute in the Property panel).</>,
      },
    ],
    tip: <>Check whether a part is Basic or Extended on jlcpcb.com/parts before you commit, especially if you plan to order assembly.</>,
  },
  quiz: [
    {
      q: 'A 555 datasheet lists 18 V under "Absolute maximum ratings" and 5–15 V under "Recommended operating conditions". What should you design for?',
      options: ['Anywhere up to 18 V', 'Inside 5–15 V', 'Exactly 18 V for best performance', 'Below 5 V to be safe'],
      answer: 1,
      explain: 'Design inside the recommended range. The absolute maximum is a survival limit, not a target, and the datasheet numbers are only guaranteed in the recommended range.',
    },
    {
      q: 'What is an LCSC C-number used for?',
      options: [
        'It sets the part’s footprint',
        'It identifies the exact part, so the BOM and assembly service order the right one',
        'It is the chip’s pin count',
        'It is a schematic designator like U1',
      ],
      answer: 1,
      explain: 'The C-number is LCSC’s part number (shown as the JLCPCB Part # too). It is stored as the supplier part and lets the BOM point to one specific component.',
    },
    {
      q: 'You plan to solder your first board by hand. Which package is the friendliest?',
      options: ['BGA', 'QFN', 'SOIC', 'Imperial 0201'],
      answer: 2,
      explain: 'SOIC legs stick out at a 1.27 mm pitch where your iron can reach them. QFN and BGA hide their pads underneath the body.',
    },
    {
      q: 'The datasheet shows a 1.27 mm pitch, but your footprint’s pads are 0.65 mm apart. What now?',
      options: [
        'Order anyway, solder will bridge the gap',
        'Swap to the correct footprint (or pick the part in the matching package)',
        'Rotate the part 90°',
        'Make the tracks wider',
      ],
      answer: 1,
      explain: 'The footprint must match the physical package. Use the Footprint Manager to swap it, or choose the part variant whose package matches your footprint.',
    },
  ],
  terms: [
    { term: 'Datasheet', def: 'The manufacturer’s document describing a part: pins, limits, behaviour and package.' },
    { term: 'Absolute maximum ratings', def: 'Limits that must never be exceeded, or the part may be permanently damaged.' },
    { term: 'Recommended operating conditions', def: 'The range the part is designed to work in; design your circuit inside it.' },
    { term: 'Pinout', def: 'A drawing showing each pin’s number and function, seen from the top.' },
    { term: 'Land pattern', def: 'The copper pad layout a datasheet recommends for soldering the part to a PCB.' },
    { term: 'Pitch', def: 'The centre-to-centre distance between neighbouring pins, e.g. 1.27 mm for SOIC.' },
    { term: 'C-number', def: 'LCSC’s part number (e.g. C21190), used by the BOM and assembly to pick the exact part.' },
    { term: 'Basic / Extended part', def: 'JLCPCB assembly classes: Basic parts are preloaded with no loading fee; Extended parts cost extra.' },
  ],
}

export default lesson
