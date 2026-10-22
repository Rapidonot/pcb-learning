import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Compare, Figure, Specs, Steps } from '@/components/content'
import { getFootprint } from '@/pcb/footprints'
import { MASKS } from '@/pcb/palette'
import { ArtDefs, Bridge, ChipTop, SoicTop } from './art'
import type { Joint } from './model'
import { Scene } from './Scene'
import './lesson17.css'

/* ------------------------------------------------------------------ */
/* Figure: a gallery of joints, good and bad                           */
/* ------------------------------------------------------------------ */

function PadsUnder({ fp }: { fp: ReturnType<typeof getFootprint> }) {
  return (
    <>
      {fp.pads.map((p) => (
        <rect key={p.num} x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h} rx={Math.min(p.w, p.h) * 0.22} fill="url(#l17-hasl)" />
      ))}
    </>
  )
}

function JointGallery() {
  const r = getFootprint('R0805')
  const soic = getFootprint('SOIC-8')
  const tiles: { label: string; note: string; good: boolean; art: ReactNode; vb: string }[] = [
    {
      label: 'Good joint',
      note: 'Shiny, smooth, a concave ramp up the end',
      good: true,
      vb: '-2.4 -1.44 4.8 2.88',
      art: <ChipTop fp={r} value="1kΩ" isCap={false} joints={{ '1': 'good', '2': 'good' }} />,
    },
    {
      label: 'Cold joint',
      note: 'Dull, grainy and lumpy (right end): reflow it',
      good: false,
      vb: '-2.4 -1.44 4.8 2.88',
      art: <ChipTop fp={r} value="1kΩ" isCap={false} joints={{ '1': 'good', '2': 'cold' }} />,
    },
    {
      label: 'Not soldered',
      note: 'The right end only sits on a bare, matte pad',
      good: false,
      vb: '-2.4 -1.44 4.8 2.88',
      art: <ChipTop fp={r} value="1kΩ" isCap={false} joints={{ '1': 'good', '2': 'none' }} />,
    },
    {
      label: 'Solder bridge',
      note: 'Two pins joined by a blob: wick it away',
      good: false,
      vb: '0.9 -2.6 4 2.4',
      art: (
        <>
          <SoicTop fp={soic} value="NE555" joints={Object.fromEntries(soic.pads.map((p) => [p.num, 'good' as Joint]))} />
          <Bridge y1={-1.905} y2={-0.635} />
        </>
      ),
    },
  ]
  return (
    <div className="l17-gallery">
      {tiles.map((t) => (
        <div key={t.label} className="l17-gallery__tile">
          <svg viewBox={t.vb} role="img" aria-label={t.label}>
            <ArtDefs />
            <rect x={-10} y={-10} width={20} height={20} fill={MASKS.green.mask} />
            <PadsUnder fp={t.label === 'Solder bridge' ? soic : r} />
            {t.art}
          </svg>
          <div className={`l17-gallery__cap ${t.good ? 'is-good' : 'is-bad'}`}>
            <b className="mono">
              {t.good ? '✓' : '✕'} {t.label}
            </b>
            <span>{t.note}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Article() {
  return (
    <>
      <p className="lead">
        The envelope from the factory is on your desk: five shiny green Blinky boards and a bag of tiny parts. This last step
        turns a bare board into a working gadget. Take it slowly, check as you go, and the LED will blink the first time.
      </p>

      <h2>What you need on the bench</h2>
      <Specs
        items={[
          { k: 'Soldering iron', v: 'Fine tip', note: 'Temperature-controlled, with a fine conical or small chisel tip' },
          { k: 'Solder', v: '0.5–0.8 mm', note: 'Thin wire with a flux core' },
          { k: 'Flux', v: 'Pen or gel', note: 'Helps solder flow. Use plenty on SMD parts' },
          { k: 'Solder wick', v: 'Braid', note: 'Copper braid that soaks up extra solder' },
          { k: 'Tweezers', v: 'Fine tip', note: 'For placing and holding tiny parts' },
          { k: 'Magnifier', v: 'Loupe', note: 'Or your phone camera zoomed in' },
          { k: 'Multimeter', v: 'With beep', note: 'Continuity, resistance and DC volts' },
          { k: 'Power', v: '5 V', note: 'Ideally a bench supply with a current limit' },
        ]}
      />
      <Callout kind="danger" title="Stay safe">
        The iron's tip is hot enough to burn you instantly, so always put it back in its stand and switch it off when you
        finish. Work somewhere ventilated and keep your face out of the flux smoke; a small fan pulling the fumes away
        helps. Leaded solder is easier to use but contains lead, so wash your hands afterwards and keep food and drink off the
        bench. Lead-free solder is the safer default and needs a little more heat. Wear glasses when clipping wires.
      </Callout>

      <h2>Lowest and smallest first</h2>
      <p>
        Solder parts in order of height: <strong>the small, flat parts first, the tall ones last</strong>. Once a chip or a
        header is in place, it gets in the way of your iron. For Blinky that means the six 0805 resistors and capacitors,
        then the SOIC chip and the LED, and finally the 2-pin header.
      </p>

      <h2>Soldering an 0805 part</h2>
      <Steps
        items={[
          { title: 'Tin one pad', body: 'Add a dab of flux and melt a small blob of solder onto one pad only.' },
          { title: 'Place the part', body: 'Hold it with tweezers, reheat the blob and slide the part in until it sits flat.' },
          { title: 'Check it', body: 'Is it centred and flat? Re-melt and nudge it now; it is much harder later.' },
          { title: 'Solder the other end', body: 'Touch the iron to pad and part together, then feed in a little solder.' },
          { title: 'Touch up', body: 'Reflow the first end with a touch of fresh solder so it looks as good as the second.' },
        ]}
      />
      <Figure label="Fig 1" caption="What to look for under the magnifier. A good joint is a smooth, shiny ramp from the pad up the end of the part." bg="paper">
        <JointGallery />
      </Figure>

      <h2>Soldering the SOIC chip</h2>
      <p>
        Line up the chip so its <strong>pin-1 dot</strong> matches the dot on the silkscreen. Tack two opposite corner pins
        (pin 1 and pin 5), then check that every leg sits on its pad. Flux the rows generously and drag the iron along each row
        with a small bead of solder on the tip: the flux pulls solder onto each leg. Bridges between pins are normal at first.
        To remove one, add flux, lay solder wick across the bridge, press the iron on top for a couple of seconds and lift both
        together. The braid soaks the extra solder away.
      </p>

      <h2>Polarity and the header</h2>
      <Compare
        leftLabel="Check"
        rightLabel="Common mistake"
        left={<p>The LED's cathode mark (often a green line on 0805 LEDs, but check its datasheet) lines up with the bar on the silkscreen.</p>}
        right={<p>Soldering the LED backwards. It won't light, and nothing else looks wrong. The same goes for the chip turned 180°.</p>}
      />
      <p>
        The header goes in last. It is a through-hole part: push it in from the top, flip the board over, and solder each pin
        from underneath until the solder forms a small, shiny cone.
      </p>

      <h2>Inspect before you power up</h2>
      <p>
        Look at every joint under magnification. You are hunting for bridges, dull or lumpy joints, pads with no solder, and
        parts the wrong way round. Fixing a bridge now costs ten seconds; finding it after power-up can cost a chip.
      </p>

      <h2>The first power-up</h2>
      <Steps
        items={[
          { title: 'Check for shorts', body: 'Meter on continuity, probes on +5V and GND. It should not beep. The reading may climb for a moment as the capacitors charge; a steady low reading means a short.' },
          { title: 'Set the voltage', body: 'With the output off, set the supply to 5.0 V.' },
          { title: 'Set a current limit', body: 'Blinky draws about 10 mA, so a limit of about 50 mA is plenty and keeps a mistake from cooking anything.' },
          { title: 'Switch on and watch', body: 'If the supply jumps into current limit (CC), or anything gets hot or smells, switch off at once.' },
        ]}
      />
      <Callout kind="tip" title="No bench supply?">
        A USB charger gives 5 V but no current limit, so the short-circuit check matters even more. A cheap USB power meter
        between the charger and the board lets you see how much current it draws.
      </Callout>

      <h2>When the LED stays dark: measure, don't guess</h2>
      <p>
        Debugging is a calm walk from the power input towards the LED, <strong>measuring at each step</strong> rather than
        changing things at random. Put the meter on DC volts with the black probe on GND, then:
      </p>
      <ul>
        <li>Is the LED the right way round? Compare its mark with the silkscreen.</li>
        <li>Is there 5 V at J1? If not, check the supply and the header joints.</li>
        <li>Is there 5 V on U1 pin 8? If J1 has 5 V but pin 8 doesn't, that joint is bad: reflow it.</li>
        <li>Is RESET (pin 4) at 5 V? If it's low, the chip is held in reset and won't run.</li>
        <li>Is OUT (pin 3) switching? A reading that keeps changing means the timer works, so check R3 and the LED.</li>
      </ul>
      <p>Change one thing at a time, then measure again.</p>

      <h2>You built a circuit board</h2>
      <p>
        Look at it blink. You read a datasheet, drew a schematic, laid out copper, ordered boards from a factory, soldered them
        and brought one to life. That is the whole journey every electronics product takes. Next, try the{' '}
        <Link to="/sandbox">capstone sandbox</Link> and build Blinky from scratch without the guide rails. Then design your own
        board: a different blink rate, two LEDs that alternate, or a small sensor board. The steps are the same.
      </p>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Solder Blinky smallest parts first, fix what goes wrong, check for shorts, then power it up and watch it blink.',
  missions: [
    { id: 'order', text: 'Solder every part, smallest and lowest first' },
    { id: 'bridge', text: 'Find and remove a solder bridge with solder wick' },
    { id: 'short', text: 'Pass the short-circuit check (+5 V to GND) before powering' },
    { id: 'blink', text: 'Power up at 5 V with a current limit and see it blink' },
  ],
  Article,
  build: {
    intro: <>This lesson happens at the bench. Use EasyEDA as your assembly map, then work through the checklist before power touches the board.</>,
    steps: [
      {
        title: 'Open a picture of the real board',
        menu: ['View', '2D Preview'],
        body: <>Choose the top side. Keep it on screen while you solder: it shows exactly where each part goes and which way round.</>,
      },
      {
        title: 'Export the BOM as a parts list',
        menu: ['Export', 'Bill of Materials (BOM)'],
        body: <>Tick off each designator (R1, C2, U1…) and value as you place it. Sort the parts by height before you start.</>,
      },
      {
        title: 'Inspect every joint',
        body: <>Under a magnifier: no bridges, no dull joints, LED mark matching the silkscreen bar, U1's pin-1 dot matching the board.</>,
      },
      {
        title: 'Check for a short',
        body: <>Meter on continuity, probes on +5V and GND. No beep, and the reading climbs to over-range (OL).</>,
      },
      {
        title: 'Power up gently',
        body: <>5.0 V, current limit about 50 mA, then switch on. Watch the current reading and switch off if CC lights up.</>,
      },
    ],
    tip: (
      <>
        Debugging? Keep the schematic open next to the PCB. Cross-probing (default <b>Shift+X</b>; check Settings › Shortcuts)
        jumps from a part or net in one to the same thing in the other.
      </>
    ),
  },
  quiz: [
    {
      q: 'In which order should you solder Blinky’s parts?',
      options: ['Header first, so you can power it while you work', 'Smallest and lowest first, header last', 'The chip first, it’s the most important', 'Any order, it doesn’t matter'],
      answer: 1,
      explain: 'Tall parts get in the way of the iron. Start with the flat 0805 parts, then the SOIC and LED, and finish with the header.',
    },
    {
      q: 'Before the first power-up, the meter beeps steadily between +5V and GND. What does that mean?',
      options: ['All good, the board is connected', 'There is a short: find it before you apply power', 'The LED is backwards', 'The battery in the meter is low'],
      answer: 1,
      explain: 'A steady beep or a low reading means +5 V and GND are joined somewhere, often by a solder bridge. Powering it would push a lot of current through that short.',
    },
    {
      q: 'You switch on and the supply’s CC light comes on while its voltage drops. What should you do?',
      options: ['Turn the current limit up', 'Switch off and look for a short or bridge', 'Turn the voltage up', 'Wait for it to settle'],
      answer: 1,
      explain: 'CC means the supply is limiting the current: the board is trying to draw far more than it should. The limit just saved your parts; now find out why.',
    },
    {
      q: 'Two SOIC pins are joined by a blob of solder. What’s the best fix?',
      options: ['Scrape it with a knife', 'Add flux, press solder wick onto it with the iron', 'Add more solder', 'Leave it, it’ll be fine'],
      answer: 1,
      explain: 'Flux plus solder wick soaks the extra solder into the copper braid, leaving neat separate joints.',
    },
  ],
  terms: [
    { term: 'Solder fillet', def: 'The smooth, shiny ramp of solder joining a part’s end or leg to its pad.' },
    { term: 'Cold joint', def: 'A dull, grainy joint that didn’t melt and flow properly; it may not conduct. Reflow it.' },
    { term: 'Solder bridge', def: 'Solder accidentally joining two pins or pads that should be separate.' },
    { term: 'Flux', def: 'A chemical that cleans metal surfaces so molten solder flows and wets them.' },
    { term: 'Solder wick', def: 'Copper braid that soaks up excess solder when heated.' },
    { term: 'Continuity test', def: 'A multimeter mode that beeps when two points are connected.' },
    { term: 'Current limit', def: 'A bench-supply setting that caps the current, protecting a board with a fault.' },
    { term: 'Bring-up', def: 'Powering and testing a newly built board for the first time, step by step.' },
  ],
}

export default lesson
