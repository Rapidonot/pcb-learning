import { useId, useMemo } from 'react'
import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Menu, Specs, Compare } from '@/components/content'
import { FootprintSilk, PadGlyph, PartBodyTop } from '@/pcb/render'
import { getFootprint } from '@/pcb/footprints'
import { stages } from '@/pcb/project'
import { MASKS } from '@/pcb/palette'
import { Scene } from './Scene'
import { RealSilkBoard } from './SilkArt'
import { SUGGEST, messyLabels, type Label } from './silk'
import './lesson13.css'

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

function tidyLabels(): Label[] {
  return [
    ...messyLabels().map((l) => ({ ...l, x: SUGGEST[l.ref!][0], y: SUGGEST[l.ref!][1], size: 1, line: 0.15, rot: 0 })),
    { id: 'name', kind: 'text' as const, text: 'BLINKY v1.0', x: 23.7, y: 23.9, size: 1.2, line: 0.18, rot: 0 },
    { id: 'p5', kind: 'text' as const, text: '+5V', x: 6.75, y: 11.73, size: 1, line: 0.15, rot: 0 },
    { id: 'pg', kind: 'text' as const, text: 'GND', x: 6.75, y: 14.27, size: 1, line: 0.15, rot: 0 },
  ]
}

function MessyVsClean() {
  const doc = useMemo(() => stages.finished(), [])
  return (
    <div className="l13-pair">
      <div>
        <RealSilkBoard doc={doc} labels={messyLabels()} led={null} pin1={null} />
        <div className="l13-cap is-bad">Messy: on pads, tiny, upside down</div>
      </div>
      <div>
        <RealSilkBoard doc={doc} labels={tidyLabels()} led="cathode" pin1="1" />
        <div className="l13-cap is-good">Clean: readable and helpful</div>
      </div>
    </div>
  )
}

/** One footprint on a little square of green board, with its silkscreen mark. */
function MarkTile({ fp, body, rot = 0, children }: { fp: string; body?: boolean; rot?: number; children?: React.ReactNode }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const def = getFootprint(fp)
  const s = Math.max(def.courtyard.w, def.courtyard.h) + 1.2
  const m = MASKS.green
  return (
    <svg viewBox={`${-s} ${-s} ${s * 2} ${s * 2}`} role="img" aria-label={`${def.pkg} footprint with its polarity mark`}>
      <defs>
        <radialGradient id={`g-${uid}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#2b8a5d" />
          <stop offset="1" stopColor="#174f35" />
        </radialGradient>
        <radialGradient id={`p-${uid}`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#d3d6da" />
          <stop offset="1" stopColor="#8f949a" />
        </radialGradient>
        <filter id={`n-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="3" numOctaves={2} seed={7} result="t" />
          <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.1 0" />
        </filter>
      </defs>
      <rect x={-s} y={-s} width={s * 2} height={s * 2} fill={`url(#g-${uid})`} />
      <rect x={-s} y={-s} width={s * 2} height={s * 2} filter={`url(#n-${uid})`} />
      <g transform={`rotate(${rot})`}>
        {def.pads.map((p) => (
          <g key={p.num} transform={`translate(${p.x} ${p.y})`}>
            <PadGlyph pad={p} fill="#14432c" hole={null} inflate={0.06} />
            <PadGlyph pad={p} fill={`url(#p-${uid})`} hole="#141414" />
          </g>
        ))}
        <g style={{ filter: 'drop-shadow(0.02px 0.04px 0.03px rgba(0,0,0,0.45))' }}>
          <FootprintSilk def={def} color={m.silk} />
        </g>
        {body && (
          <g opacity={0.92} style={{ filter: 'drop-shadow(0.1px 0.18px 0.15px rgba(0,0,0,0.5))' }}>
            <PartBodyTop fp={def} />
          </g>
        )}
      </g>
      <g fill={m.silk} fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
        {children}
      </g>
    </svg>
  )
}

function PolarityMarks() {
  return (
    <div className="l13-marks">
      <div>
        <MarkTile fp="LED0805">
          <text x={-1.65} y={-1.45} fontSize={0.55} textAnchor="middle">
            K
          </text>
        </MarkTile>
        <div className="l13-cap">LED: cathode bar</div>
      </div>
      <div>
        <MarkTile fp="SOIC-8" />
        <div className="l13-cap">Chip: pin-1 dot</div>
      </div>
      <div>
        <MarkTile fp="LED-5MM" />
        <div className="l13-cap">5 mm LED: flat side</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Article                                                             */
/* ------------------------------------------------------------------ */

function Article() {
  return (
    <>
      <p className="lead">
        The <strong>silkscreen</strong> is the printed ink on top of the solder mask: the little white letters and outlines.
        It carries no electricity at all. It's there for people, and a good one makes your board far easier to build and
        fix.
      </p>

      <h2>What silkscreen is for</h2>
      <ul>
        <li>
          <strong>Assembly.</strong> Outlines show where each part goes, and polarity marks show which way round.
        </li>
        <li>
          <strong>Debugging.</strong> When the schematic says "check R3", you can find R3 in seconds.
        </li>
        <li>
          <strong>Identity.</strong> A name and version tell you which board you're holding, months later.
        </li>
      </ul>
      <Figure label="Fig 1" caption="The same Blinky board with a careless silkscreen (left) and a tidy one (right), as the factory would print them. Silk that lands on pads is clipped off, so labels end up broken or missing." bg="paper">
        <MessyVsClean />
      </Figure>

      <h2>Designators</h2>
      <p>
        Every part has a <strong>designator</strong>: R1, C2, U1, D1, J1. The letters say what kind of part it is (R for
        resistor, C for capacitor, U for chip, D for diode or LED, J for connector) and the number tells parts apart. The
        same designators appear in the schematic and on the BOM, so the silkscreen is what ties all three together.
      </p>
      <p>Place each designator:</p>
      <ul>
        <li>
          <strong>next to its own part</strong>, closer to it than to anything else,
        </li>
        <li>
          <strong>off the pads</strong>, and not under the part's body, where it would be hidden once the part is
          soldered on,
        </li>
        <li>
          in a <strong>consistent spot</strong> (for example always above or to the left), so your eye knows where to look.
        </li>
      </ul>

      <h2>Polarity and pin-1 marks</h2>
      <p>
        Some parts only work one way round. An LED fitted backwards stays dark. A chip rotated 180° can be destroyed the
        moment you power it. Silkscreen marks make the right orientation obvious:
      </p>
      <Figure label="Fig 2" caption="Common orientation marks. The bar marks an LED's cathode (K, the end that goes towards ground); the dot marks a chip's pin 1; a round LED's outline has a flat side at the cathode." bg="paper">
        <PolarityMarks />
      </Figure>
      <p>
        On Blinky, the LED's cathode connects to GND, and pin 1 of the NE555 is its GND pin, in the corner beside the notch
        or dot on the chip's body. Check these marks against the part's datasheet: the footprint and the real part must
        agree.
      </p>

      <h2>Label the connectors</h2>
      <p>
        Write <strong>+5V</strong> and <strong>GND</strong> next to the power header. It takes ten seconds and saves you from
        plugging the supply in backwards at midnight. For bigger boards, label every connector pin you'll probe or wire.
      </p>

      <h2>Name, version and date</h2>
      <p>
        Put the board's name and a version number somewhere clear, like <code>BLINKY v1.0</code>. When you change the
        design, bump the version (v1.1, v2.0) so you can tell revisions apart on your desk. Some people add a date or
        their own name too. Simple logos work as well; keep them away from pads and keep their lines thick enough to print.
      </p>

      <h2>The rules that matter</h2>
      <Specs
        items={[
          { k: 'Text height', v: '≥ 1.0 mm', note: 'JLCPCB minimum; bigger is easier to read' },
          { k: 'Line width', v: '≥ 0.15 mm', note: 'Thinner lines may be widened to 0.15 mm' },
          { k: 'Silk on pads', v: 'Never', note: 'It gets clipped off pads at the factory' },
          { k: 'Orientation', v: '0° or 90°', note: 'Read from the bottom or the right' },
        ]}
      />
      <Compare
        left={<>Keep all text reading from one or two directions: left to right, or bottom to top. Then you only ever need to turn the board once.</>}
        right={<>Text at random angles or upside down. Every label makes you twist your head or the board.</>}
        leftLabel="Readable"
        rightLabel="Hard to read"
      />
      <p>
        Most silkscreen goes on the <strong>top</strong>. If you put parts or notes on the bottom, they go on the bottom
        silkscreen layer, which is printed on the underside, so its text appears mirrored when you look through the board from the top. The silkscreen also exports
        as its own Gerber file (Top Silkscreen, <code>.GTO</code>) that you'll meet in the Gerbers lesson.
      </p>

      <h2>A note on order numbers</h2>
      <Callout kind="fab" title="JLCPCB prints an order number">
        By default, JLCPCB prints a small order number somewhere on the silkscreen. If you care where it goes, the order
        form lets you specify a location (you put a placeholder text on your silkscreen and they print the number there),
        or remove it for a small fee. Check the current options and the exact placeholder text on JLCPCB's help pages
        when you order.
      </Callout>

      <Callout kind="easyeda" title="See it before you order">
        <Menu path={['View', '2D Preview']} /> shows the board as the factory will make it, top or bottom, with the board
        colour and silkscreen you choose. It's the quickest way to spot a label hiding under a part or sitting on a pad.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

const lesson: LessonContent = {
  Scene,
  goal: 'Blinky’s silkscreen is a mess. Drag the labels into place, fix their size and direction, add the polarity marks and sign the board.',
  missions: [
    { id: 'place', text: 'Move every designator off the pads and next to its own part' },
    { id: 'size', text: 'Make every label at least 1 mm tall with 0.15 mm lines, reading the right way' },
    { id: 'polarity', text: 'Mark the LED’s cathode and the chip’s pin 1' },
    { id: 'name', text: 'Give the board a name and a version number' },
  ],
  Article,
  build: {
    intro: <>Tidy Blinky's silkscreen in EasyEDA Pro. Shortcuts are defaults and may differ in your shortcut theme.</>,
    steps: [
      {
        title: 'Move each designator',
        body: <>Click a designator (R1, C2…) on the PCB and drag it next to its part, clear of the pads. Rotate it with <b>Space</b> if it reads the wrong way.</>,
        keys: ['Space'],
      },
      {
        title: 'Set text height and line width',
        body: (
          <>
            With the text selected, set its height (at least <b>1.0 mm</b>) and line width (at least <b>0.15 mm</b>) in the
            right-hand <b>Property</b> panel. Select several designators at once to change them all together.
          </>
        ),
      },
      {
        title: 'Check the polarity marks',
        body: <>Make sure the LED's footprint shows which end is the cathode and the chip's footprint has a pin-1 dot. If one is missing, draw it on the Top Silkscreen layer.</>,
      },
      {
        title: 'Add your own text',
        body: <>Use the text tool in the <b>Place</b> menu to add "+5V" and "GND" beside J1, and a name and version like "BLINKY v1.0". Put them on the Top Silkscreen layer.</>,
      },
      {
        title: 'Preview it',
        menu: ['View', '2D Preview'],
        body: <>Look at the top side as the factory will print it. Every label should be readable and none should touch a pad.</>,
      },
    ],
    tip: <>JLCPCB prints an order number on the silkscreen unless you choose a location for it or pay to remove it. You'll see the option on the order form.</>,
  },
  quiz: [
    {
      q: 'A designator is sitting on top of a pad. What will happen at the factory?',
      options: ['It is printed on the pad and blocks soldering', 'The part of the text over the pad gets clipped off', 'The order is rejected', 'Nothing, silk on pads is fine'],
      answer: 1,
      explain: 'Silk on pads gets clipped off, so the label comes out broken. Move designators clear of the pads.',
    },
    {
      q: 'What is the minimum silkscreen text height JLCPCB asks for?',
      options: ['0.5 mm', '0.8 mm', '1.0 mm', '2.5 mm'],
      answer: 2,
      explain: 'Text at least 1.0 mm tall, with lines at least 0.15 mm wide, prints clearly.',
    },
    {
      q: 'Which mark tells you which way round to solder an LED?',
      options: ['A pin-1 dot', 'A cathode bar or flat side', 'The designator', 'The board name'],
      answer: 1,
      explain: 'The bar (or the flat side of a round LED) marks the cathode, the end that goes towards ground.',
    },
    {
      q: 'Why print +5V and GND next to the power header?',
      options: ['The factory requires it', 'So you connect the supply the right way round', 'It improves the ground pour', 'It sets the net names'],
      answer: 1,
      explain: 'Connector labels stop you plugging power in backwards, one of the easiest ways to destroy a board.',
    },
  ],
  terms: [
    { term: 'Silkscreen', def: 'The printed ink layer (usually white) with labels and outlines. It carries no current.' },
    { term: 'Designator', def: 'A part’s short name, like R1 or U1, shared by the schematic, the PCB and the BOM.' },
    { term: 'Polarity mark', def: 'A silkscreen bar, flat or "+" that shows which way round a part goes.' },
    { term: 'Pin-1 indicator', def: 'A dot or notch marking pin 1 of a chip or connector.' },
    { term: 'Text height', def: 'How tall the characters are. At least 1.0 mm for JLCPCB.' },
    { term: 'Line width', def: 'The stroke thickness of silkscreen text and lines. At least 0.15 mm.' },
    { term: 'Order number', def: 'A number the fab prints on your board unless you choose where it goes or pay to remove it.' },
  ],
}

export default lesson
