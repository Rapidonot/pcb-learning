import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Menu, Steps, Specs } from '@/components/content'
import { BoardView } from '@/pcb/render'
import { stages } from '@/pcb/project'
import type { FinishColor, MaskColor } from '@/pcb/palette'
import { Scene } from './Scene'
import './lesson16.css'

function Looks() {
  const doc = useMemo(() => stages.finished(), [])
  const looks: { mask: MaskColor; finish: FinishColor; label: string }[] = [
    { mask: 'green', finish: 'hasl', label: 'Green · HASL' },
    { mask: 'black', finish: 'enig', label: 'Black · ENIG' },
    { mask: 'purple', finish: 'enig', label: 'Purple · ENIG' },
    { mask: 'white', finish: 'hasl', label: 'White · HASL' },
  ]
  return (
    <div className="l16-fig-boards">
      {looks.map((l) => (
        <figure key={l.label}>
          <svg viewBox={`-0.6 -0.6 ${doc.w + 1.2} ${doc.h + 1.2}`} width="100%" role="img" aria-label={l.label}>
            <BoardView doc={doc} mode="real" maskColor={l.mask} finish={l.finish} />
          </svg>
          <figcaption>{l.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function Article() {
  return (
    <>
      <p className="lead">
        This is the moment the course has been building towards: turning your files into a real board you can hold. The order
        form looks intimidating the first time, but for a board like Blinky <strong>almost every field should stay at its
        default</strong>. This lesson explains each one so you know why.
      </p>

      <h2>Two ways to order</h2>
      <Steps
        items={[
          {
            title: 'One click from EasyEDA',
            body: (
              <>
                With the PCB open, choose <Menu path={['Order', 'PCB Order']} />. EasyEDA checks the board (unrouted ratlines,
                the board outline and DRC), uploads the Gerbers, plus the BOM and CPL for assembly, to JLCPCB, and{' '}
                <b>Confirm</b> opens the order page. It doesn’t save the files on your computer, so export a copy too if you want
                a backup.
              </>
            ),
          },
          {
            title: 'Export and upload',
            body: (
              <>
                <Menu path={['Export', 'PCB Fabrication File (Gerber)']} /> saves the zip. Upload it on the fab’s website. It
                detects the size and layer count, you pick the options, check the Gerber viewer, add it to the cart and check
                out. This works with any manufacturer.
              </>
            ),
          },
        ]}
      />

      <h2>The form, field by field</h2>
      <p>These are the beginner choices for Blinky. Each one is the “do nothing special” option, which is usually the cheapest and quickest too.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Choose</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Base material</td>
            <td>FR-4</td>
            <td>The standard glass-epoxy board.</td>
          </tr>
          <tr>
            <td>Layers / size</td>
            <td>2 · 30 × 26 mm</td>
            <td>Detected from your Gerbers. If they look wrong, check your outline and files.</td>
          </tr>
          <tr>
            <td>Quantity</td>
            <td>5</td>
            <td>The smallest order. Only the listed quantities can be chosen.</td>
          </tr>
          <tr>
            <td>Thickness</td>
            <td>1.6 mm</td>
            <td>The standard. Thinner options limit other choices (0.4 mm is ENIG-only).</td>
          </tr>
          <tr>
            <td>Solder mask</td>
            <td>Green</td>
            <td>The default. Other colours (purple, red, yellow, blue, white, black) work just as well.</td>
          </tr>
          <tr>
            <td>Silkscreen</td>
            <td>White</td>
            <td>Follows the mask colour for contrast.</td>
          </tr>
          <tr>
            <td>Surface finish</td>
            <td>LeadFree HASL</td>
            <td>The recommended standard and RoHS compliant.</td>
          </tr>
          <tr>
            <td>Copper weight</td>
            <td>1 oz</td>
            <td>About 35 µm. Plenty for a few milliamps.</td>
          </tr>
          <tr>
            <td>Gold fingers</td>
            <td>No</td>
            <td>Only for edge connectors, and only on boards 50 mm or larger.</td>
          </tr>
          <tr>
            <td>Remarks</td>
            <td>(empty)</td>
            <td>For genuinely unusual requests only.</td>
          </tr>
        </tbody>
      </table>
      <Figure label="Fig 1" caption="Same Blinky, different looks. Mask colour is cosmetic. ENIG gives flat gold pads; HASL gives silver tin." bg="paper">
        <Looks />
      </Figure>
      <h3>HASL or ENIG?</h3>
      <p>
        Bare copper would oxidise, so pads get a <strong>surface finish</strong>. <strong>HASL</strong> (hot air solder levelling)
        dips the board in molten solder and blows off the excess: cheap, easy to solder, slightly bumpy. The leaded version
        contains lead; <em>LeadFree HASL</em> is the recommended standard. <strong>ENIG</strong> is a thin layer of gold over
        nickel: perfectly flat, which matters for very fine-pitch chips and BGAs, but it costs more. For 0805 parts and an
        SOIC-8, HASL is perfect.
      </p>
      <h3>The order number</h3>
      <p>
        Many factories print a small tracking number on your silkscreen by default. You can choose where it goes, by placing a
        placeholder on your silkscreen layer, or pay a small fee to remove it. For a first board, leave the default.
      </p>

      <h2>Assembly: letting the factory solder</h2>
      <p>
        Tick assembly (PCBA) and the factory solders the surface-mount parts for you. It needs two extra files that EasyEDA
        exports for you:
      </p>
      <ul>
        <li>
          <strong>BOM</strong> (bill of materials): which part goes where. <Menu path={['Export', 'Bill of Materials (BOM)']} />.
          Each line needs the part’s <strong>LCSC C-number</strong> (like <code>C21190</code>), the exact part the factory will
          use. In EasyEDA it lives in the part’s supplier part attribute.
        </li>
        <li>
          <strong>CPL</strong> (component placement list, or pick-and-place file): the centre, rotation and side of every part.{' '}
          <Menu path={['Export', 'Pick and Place File']} />, from the PCB. For JLCPCB, don’t tick the bottom-side mirror option.
        </li>
      </ul>
      <Specs
        items={[
          { k: 'Basic part', v: 'No loading fee', note: 'Kept loaded on the machines' },
          { k: 'Extended part', v: '$3 each', note: 'Per unique part, Economic assembly, at the time of writing' },
          { k: 'Preferred extended', v: 'Exempt', note: 'On Economic orders' },
        ]}
      />
      <p>
        Fees and part lists change, so check the live prices on the order page and look up each C-number on the JLCPCB parts
        page, which says whether it is Basic or Extended. Choosing Basic parts where you can keeps small orders cheap.
      </p>
      <Callout kind="warn" title="Check the rotation of every polarised part">
        Different tools disagree about what “0°” means for a footprint. Before you pay, check the placement preview on the order
        page: is U1’s pin-1 dot where your silkscreen says, and does D1’s cathode face the right way? A rotated LED won’t light.
      </Callout>

      <h2>What arrives in the box</h2>
      <p>
        Some days later, depending on the build time and shipping you chose, a small box arrives: your boards, usually sealed in a bag, maybe with the
        order number printed somewhere on each. If you didn’t order assembly, the parts come separately. EasyEDA’s{' '}
        <Menu path={['Export', 'Order Parts']} /> sends your BOM to LCSC so you can buy them in one go. Order a few spares of
        the tiny ones: 0805 parts love to disappear.
      </p>

      <h2>Soldering and first power-up, in brief</h2>
      <p>
        The next lesson, <em>Solder it &amp; bring it to life</em>, covers this properly. The short version:
      </p>
      <ul>
        <li>
          <strong>0805 parts:</strong> tin one pad, hold the part with tweezers, reheat that pad to tack it down, then solder the
          other end.
        </li>
        <li>
          <strong>SOIC-8 (U1):</strong> line up pin 1 with the dot, tack two opposite corner pins, check alignment, then do the
          rest. Flux helps; solder wick removes bridges.
        </li>
        <li>
          <strong>Before you power it:</strong> look closely for bridges, then use a multimeter to check that there is{' '}
          <strong>no short between 5 V and GND</strong>. Only then connect power.
        </li>
      </ul>

      <h2>Where next</h2>
      <p>
        You’ve gone from an empty screen to a board a factory can build. There’s one more step: soldering it and seeing that
        LED blink, in <em>Solder it &amp; bring it to life</em>. After that, put it all together in the{' '}
        <Link to="/sandbox">capstone sandbox</Link>, where you build Blinky from scratch. Further down the road: 4-layer
        boards (with solid ground and power planes inside), and other tools like KiCad, which use the same ideas you’ve learnt
        here.
      </p>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'A practice order form for your Blinky board. Pick sensible options, peek at assembly files, then place a simulated order.',
  missions: [
    { id: 'defaults', text: 'Reset the form to the beginner defaults (one button does it all)' },
    { id: 'look', text: 'Try a different mask colour and the ENIG finish, and watch the 3D preview change' },
    { id: 'assembly', text: 'Turn on assembly and look at both the BOM and the CPL (pick-and-place) tables' },
    { id: 'order', text: 'Place the simulated order and follow your board all the way to a blinking LED' },
  ],
  Article,
  build: {
    intro: <>Order real Blinky boards. Make sure the board passes DRC first.</>,
    steps: [
      {
        title: 'Final check',
        menu: ['Design', 'Check DRC'],
        body: <>No errors, and a closed board outline.</>,
      },
      {
        title: 'Send it to the fab',
        menu: ['Order', 'PCB Order'],
        body: (
          <>
            EasyEDA checks the board and uploads the files to JLCPCB. Click <b>Confirm</b> to open the order page. (Or export
            the Gerbers and upload the zip yourself.)
          </>
        ),
      },
      {
        title: 'Fill in the form',
        body: <>FR-4, 2 layers, qty 5, 1.6 mm, green, LeadFree HASL, 1 oz, no gold fingers. Leave the rest at the defaults.</>,
      },
      {
        title: 'Optional: assembly',
        menu: ['Export', 'Pick and Place File'],
        body: (
          <>
            Also export the BOM (<b>Export › Bill of Materials (BOM)</b>). Check every part’s C-number and the rotation preview
            before paying.
          </>
        ),
      },
      {
        title: 'Check the viewer, then check out',
        body: <>Look through the Gerber viewer on the order page, save to cart and pay. Keep a copy of the exact files you ordered.</>,
      },
    ],
    tip: <>Order the parts at the same time (Export › Order Parts sends your BOM to LCSC) so everything arrives around the same week.</>,
  },
  quiz: [
    {
      q: 'What is the smallest quantity you can order on the form?',
      options: ['1', '3', '5', '10'],
      answer: 2,
      explain: 'Five is the smallest tier, and only the listed quantities can be chosen.',
    },
    {
      q: 'When is ENIG worth its extra cost?',
      options: ['Always, gold conducts better', 'For very fine-pitch parts and BGAs that need perfectly flat pads', 'For green boards only', 'When you want a thicker board'],
      answer: 1,
      explain: 'ENIG is flat and solders well at tiny pitches. For 0805 and SOIC parts, LeadFree HASL is fine.',
    },
    {
      q: 'For assembly, which two files go with your Gerbers?',
      options: ['BOM and CPL (pick-and-place)', 'Schematic and DRC report', 'GTL and GBL', 'The 3D model and a photo'],
      answer: 0,
      explain: 'The BOM says which parts (by C-number), the CPL says where each one goes and how it is rotated.',
    },
    {
      q: 'Your boards arrived and you’ve soldered everything. What do you check before connecting power?',
      options: [
        'That the LED is the right colour',
        'With a multimeter, that 5 V and GND are not shorted, after a close visual inspection',
        'Nothing, just plug it in',
        'That the board is the right colour',
      ],
      answer: 1,
      explain: 'A solder bridge between the supply and ground is the classic first-board mistake. Check before you power up.',
    },
  ],
  terms: [
    { term: 'PCBA', def: 'PCB assembly: the factory solders the parts onto the boards for you.' },
    { term: 'BOM', def: 'Bill of materials: the list of parts, values, footprints and supplier part numbers.' },
    { term: 'CPL', def: 'Component placement list (pick-and-place file): each part’s position, rotation and side.' },
    { term: 'C-number', def: 'The LCSC part number (e.g. C21190) that identifies the exact part to use.' },
    { term: 'Basic / Extended part', def: 'Basic parts are always loaded on the machines; Extended ones cost a loading fee.' },
    { term: 'Surface finish', def: 'The coating on bare pads (HASL or ENIG) that keeps them solderable.' },
    { term: 'HASL', def: 'Hot air solder levelling: a tin-based finish. LeadFree HASL is the recommended standard.' },
    { term: 'ENIG', def: 'A flat gold-over-nickel finish, best for fine-pitch parts.' },
  ],
}

export default lesson
