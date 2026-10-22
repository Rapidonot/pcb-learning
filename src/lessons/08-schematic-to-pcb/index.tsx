import { useMemo } from 'react'
import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Menu } from '@/components/content'
import { BoardView, FootprintGraphic } from '@/pcb/render'
import { SymbolGraphic } from '@/pcb/SchematicView'
import { stages, netInfo } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { Scene } from './Scene'
import './lesson08.css'

/* ------------------------------------------------------------------ */
/* Article figures                                                     */
/* ------------------------------------------------------------------ */

/** Symbol + netlist + footprint: what crosses over during conversion. */
function WhatTravels() {
  const rows: [string, string][] = [
    ['U1.8', 'VCC'],
    ['U1.4', 'VCC'],
    ['U1.1', 'GND'],
    ['U1.3', 'OUT'],
    ['U1.7', 'DIS'],
    ['U1.6', 'THR'],
  ]
  return (
    <div className="l08-travel">
      <div className="l08-travel__card l08-travel__card--sch">
        <div className="l08-travel__lab mono">Schematic symbol</div>
        <svg viewBox="-80 -88 170 176" role="img" aria-label="NE555 schematic symbol">
          <SymbolGraphic inst={{ ref: 'U1', sym: 'NE555', value: 'NE555', x: 0, y: 0, rot: 0 }} showPinNumbers />
        </svg>
      </div>
      <div className="l08-travel__mid">
        <div className="l08-travel__arrow" aria-hidden>
          <span />
        </div>
        <div className="l08-travel__card l08-travel__card--net">
          <div className="l08-travel__lab mono">Netlist</div>
          <div className="l08-travel__rows mono">
            {rows.map(([k, n]) => (
              <div key={k}>
                <span>{k}</span>
                <i />
                <b style={{ color: netInfo[n].color }}>{n}</b>
              </div>
            ))}
            <div className="l08-travel__more">…24 pins, 7 nets</div>
          </div>
        </div>
        <div className="l08-travel__arrow" aria-hidden>
          <span />
        </div>
      </div>
      <div className="l08-travel__card l08-travel__card--pcb">
        <div className="l08-travel__lab mono">PCB footprint</div>
        <svg viewBox="-5.2 -4.4 10.4 8.8" role="img" aria-label="SOIC-8 footprint">
          <defs>
            <filter id="l08-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.18" floodColor="#ff5a4e" floodOpacity="0.55" />
            </filter>
          </defs>
          <g filter="url(#l08-glow)">
            <FootprintGraphic fp="SOIC-8" showNumbers />
          </g>
          <text x={0} y={0.3} textAnchor="middle" fill={EDA.silkTop} fontSize={0.9} fontWeight={700} fontFamily="IBM Plex Mono, monospace">
            U1
          </text>
        </svg>
      </div>
    </div>
  )
}

function ConvertedBoard() {
  const doc = useMemo(() => stages.converted(), [])
  return (
    <div className="l08-fig">
      <svg viewBox="-2 -2 38 41" style={{ maxWidth: 380, margin: '0 auto' }} role="img" aria-label="Freshly converted Blinky: parts in a row beside the board, joined by airwires">
        <BoardView doc={doc} />
        <text x={15} y={13} textAnchor="middle" fill="rgba(224,90,214,0.6)" fontSize={1.3} fontFamily="IBM Plex Mono, monospace" letterSpacing={0.15}>
          EMPTY BOARD · 30 × 26 mm
        </text>
      </svg>
    </div>
  )
}

/** Anatomy of a board outline: rounded corners, one closed shape, slots. */
function OutlineAnatomy() {
  const W = 30
  const H = 18
  return (
    <div className="l08-fig">
      <svg viewBox="-6 -5 51 28" style={{ maxWidth: 680, margin: '0 auto' }} role="img" aria-label="A board outline with rounded corners and a slot">
        <defs>
          <pattern id="l08-g" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M1 0H0V1" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.04} />
          </pattern>
          <linearGradient id="l08-boardfill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.06} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={0.015} />
          </linearGradient>
          <filter id="l08-oglow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.25" floodColor={EDA.outline} floodOpacity="0.8" />
          </filter>
          <pattern id="l08-hatch" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={0.6} stroke="rgba(224,90,214,0.35)" strokeWidth={0.12} />
          </pattern>
        </defs>
        <rect x={-6} y={-5} width={51} height={28} fill="#101210" />
        <rect x={-6} y={-5} width={51} height={28} fill="url(#l08-g)" />
        <g filter="url(#l08-oglow)">
          <rect x={0} y={0} width={W} height={H} rx={1.5} fill="url(#l08-boardfill)" stroke={EDA.outline} strokeWidth={0.18} />
          <rect x={21} y={6} width={6} height={1.6} rx={0.8} fill="#050605" stroke={EDA.outline} strokeWidth={0.18} />
        </g>
        <rect x={21} y={6} width={6} height={1.6} rx={0.8} fill="url(#l08-hatch)" />
        {/* corner radius callout */}
        <g stroke="#ffd166" strokeWidth={0.07} fill="none">
          <path d="M 0 1.5 A 1.5 1.5 0 0 1 1.5 0" strokeWidth={0.2} />
          <line x1={1.0} y1={1.0} x2={-2.6} y2={-2.6} />
        </g>
        <text x={-2.8} y={-3} fill="#ffd166" fontSize={0.95} fontFamily="IBM Plex Mono, monospace" textAnchor="middle">
          r 1.5 mm
        </text>
        {/* dimension */}
        <g stroke="rgba(255,255,255,0.65)" strokeWidth={0.06}>
          <line x1={0} x2={W} y1={H + 1.6} y2={H + 1.6} />
          <line x1={0} x2={0} y1={H + 1.1} y2={H + 2.1} />
          <line x1={W} x2={W} y1={H + 1.1} y2={H + 2.1} />
        </g>
        <text x={W / 2} y={H + 3.2} fill="rgba(255,255,255,0.8)" fontSize={0.95} fontFamily="IBM Plex Mono, monospace" textAnchor="middle">
          board size drives price
        </text>
        {/* callouts */}
        <g fontFamily="IBM Plex Mono, monospace" fontSize={0.95}>
          <line x1={27} y1={6.8} x2={33} y2={3} stroke="#e05ad6" strokeWidth={0.07} />
          <text x={33.3} y={2.4} fill="#e05ad6">
            2nd closed shape
          </text>
          <text x={33.3} y={3.7} fill="#e05ad6">
            = slot (cut out)
          </text>
          <line x1={W} y1={12} x2={33} y2={12} stroke="#9fe3ff" strokeWidth={0.07} />
          <text x={33.3} y={11.6} fill="#9fe3ff">
            one closed
          </text>
          <text x={33.3} y={12.9} fill="#9fe3ff">
            outline
          </text>
        </g>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Article() {
  return (
    <>
      <p className="lead">
        A schematic says <em>what</em> connects to what. A PCB says <em>where</em> everything physically goes. Converting
        is the moment the two meet: one command takes your Blinky schematic and builds the start of a real board from it.
      </p>

      <h2>What the conversion actually moves</h2>
      <p>
        Every symbol in your schematic is linked to a <strong>footprint</strong>, the pattern of copper pads the real part
        gets soldered to (you met them in Packages & footprints). Conversion places one footprint for each symbol. With them comes the{' '}
        <strong>netlist</strong>: a list that says which pin belongs to which net. U1 pin 8 is on VCC, pin 1 is on GND,
        and so on for all 24 pins.
      </p>
      <Figure label="Fig 1" caption="Conversion carries two things across: a footprint for every symbol, and the netlist that remembers every connection. The wires themselves are not copied; you'll draw copper for them yourself." bg="paper">
        <WhatTravels />
      </Figure>
      <p>
        The schematic's drawing (where you put the wires, how the symbols are arranged) doesn't carry over. The PCB doesn't
        care how the schematic looks, only <em>which pins are connected</em>.
      </p>
      <Callout kind="easyeda" title="Before you convert">
        Run <Menu path={['Design', 'Check DRC']} /> on the schematic first and fix what it reports. If a symbol or footprint
        is broken, the conversion stops with an error. The schematic and the PCB must also belong to the same board in your
        project; a new Pro project sets this up for you.
      </Callout>

      <h2>The ratsnest: rubber bands, not wires</h2>
      <p>
        Right after converting, the footprints sit in a heap beside the board, joined by thin straight lines. EasyEDA calls
        them <em>ratlines</em> (or flying lines); together they're the <strong>ratsnest</strong>, and each line is an{' '}
        <em>airwire</em>. Think of them as rubber bands stretched between pads that need connecting.{' '}
        <strong>They are not copper.</strong> A board made right now would have no connections at all. Your job over the
        next lessons is to turn every airwire into a real copper trace.
      </p>
      <Figure label="Fig 2" caption="Blinky straight after conversion: nine footprints beside an empty board, with 17 airwires. The airwires redraw themselves as you move parts, always taking the shortest path between pads." bg="eda">
        <ConvertedBoard />
      </Figure>
      <p>
        Airwires are also your best guide. When you move a part, its airwires stretch and shrink, so you can see at a
        glance whether the new spot makes connections shorter or longer. That's what the next lesson is all about. When you
        need a clear view, turn them off and on with <Menu path={['View', 'Ratline']} />.
      </p>

      <h2>Drawing the board outline</h2>
      <p>
        The <strong>board outline</strong> tells the factory where to cut your board out of their big panel. Draw it with{' '}
        <Menu path={['Place', 'Board Outline']} />, which offers a rectangle, a circle or a polygon. A few rules:
      </p>
      <ul>
        <li>
          <strong>One outline per board.</strong> It has to be a single closed shape with no overlaps, or the 3D preview
          can't build the board.
        </li>
        <li>
          <strong>Extra closed shapes become slots.</strong> Draw a second closed shape inside the outline and it's cut out
          as a hole, which is handy for cable slots, but surprising if you didn't mean it.
        </li>
        <li>
          <strong>Rounded corners are kind.</strong> A small radius such as Blinky's 1.5 mm makes the board nicer to hold
          and less likely to snag.
        </li>
        <li>
          <strong>Size drives price.</strong> Factories charge by area, so leave room for the parts and traces but don't be
          generous for the sake of it. Blinky fits on 30 × 26 mm.
        </li>
      </ul>
      <Figure label="Fig 3" caption="One closed outline defines the board. A second closed shape inside it becomes a slot." bg="eda">
        <OutlineAnatomy />
      </Figure>
      <Callout kind="info" title="Does EasyEDA draw an outline for me?">
        The older Standard Edition tries to create one when it converts. In Pro, depending on your version and settings, you
        may get none, so check after converting. If it's missing or the wrong size, draw your own.
      </Callout>

      <h2>Changing your mind later</h2>
      <p>
        You'll almost certainly edit the schematic again: a forgotten capacitor, a different resistor value. Push the change
        across with the <strong>same command</strong>, <Menu path={['Design', 'Update/Convert Schematic to PCB']} />. This
        time the Confirm Import Information dialog lists only what changed, and{' '}
        <strong>parts you've already placed stay where they are</strong>. If you change a net that already has copper on it,
        those tracks may need fixing by hand. Some import changes can't be undone, so save first.
      </p>
      <p>
        You can also start from the PCB side with <Menu path={['Design', 'Import Changes from Schematic']} />.
      </p>

      <h2>Cross-probing: jump between the two views</h2>
      <p>
        With a big board it's easy to lose track of which footprint is which. <strong>Cross-probing</strong> links the two
        documents: select something in one, press <b>Shift+X</b>, and EasyEDA jumps to the matching part, pin or net in the
        other. In the scene above, hovering a pad lights up the same net in the schematic, which is the same idea.
      </p>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Convert the Blinky schematic into a PCB, explore the ratsnest, and draw the board outline.',
  missions: [
    { id: 'convert', text: 'Run Design › Update/Convert Schematic to PCB and apply the changes' },
    { id: 'inspect', text: 'Hover or tap a pad to inspect its net and airwires' },
    { id: 'outline', text: 'Draw a board outline big enough for the parts (about 30 × 26 mm)' },
    { id: 'ratline', text: 'Hide the ratlines, then show them again (View › Ratline)' },
  ],
  Article,
  build: {
    intro: <>Open the Blinky schematic you drew in Drawing your first schematic. The project already contains an empty PCB on the same board.</>,
    steps: [
      {
        title: 'Check the schematic first',
        menu: ['Design', 'Check DRC'],
        body: <>Fix every error in the DRC tab of the bottom panel. Conversion stops if a symbol or footprint is broken.</>,
      },
      {
        title: 'Convert to PCB',
        menu: ['Design', 'Update/Convert Schematic to PCB'],
        body: <>The Confirm Import Information dialog lists every change, all ticked. Apply them and the PCB opens with the parts beside the board.</>,
      },
      {
        title: 'Draw the board outline',
        menu: ['Place', 'Board Outline'],
        body: <>Choose a rectangle and draw about 30 × 26 mm. Keep it to one closed shape; extra closed shapes become slots.</>,
      },
      {
        title: 'Inspect the ratlines',
        menu: ['View', 'Ratline'],
        body: <>The thin lines show connections still to be routed. Toggle them here when you need a clear view.</>,
      },
      {
        title: 'Cross-probe between schematic and PCB',
        keys: ['Shift+X'],
        body: <>Select a part or net in one document and press Shift+X to jump to it in the other.</>,
      },
    ],
    tip: <>Edited the schematic later? Run the same Update/Convert command again. Only the changes are imported, and your placement stays put.</>,
  },
  quiz: [
    {
      q: 'What does converting the schematic to a PCB bring across?',
      options: ['The wires, drawn as copper traces', 'A footprint for each symbol, plus the netlist of connections', 'Only the part labels', 'A finished, routed board'],
      answer: 1,
      explain: 'Footprints and the netlist travel together. The copper traces are yours to draw.',
    },
    {
      q: 'What are the thin straight lines between pads after converting?',
      options: ['Copper traces', 'Silkscreen', 'Airwires (ratlines): connections still to be made', 'The board outline'],
      answer: 2,
      explain: 'The ratsnest shows what needs connecting. It is a guide, not copper. View › Ratline toggles it.',
    },
    {
      q: 'You draw a second closed rectangle inside your board outline. What happens?',
      options: ['Nothing', 'It becomes a slot cut through the board', 'The board gets bigger', 'EasyEDA merges the two outlines'],
      answer: 1,
      explain: 'A board has one outline. Additional closed shapes are treated as slots.',
    },
    {
      q: 'You add a capacitor to the schematic after placing parts. How do you get it onto the PCB?',
      options: [
        'Start a new PCB',
        'Run Design › Update/Convert Schematic to PCB again: only the change is imported and placement is kept',
        'Copy and paste it',
        'You can’t',
      ],
      answer: 1,
      explain: 'The same command updates the PCB and lists only what changed.',
    },
  ],
  terms: [
    { term: 'Footprint', def: 'The pad pattern on the PCB that a real part is soldered to. Every symbol has one.' },
    { term: 'Netlist', def: 'The list of which pins connect to which nets, carried from the schematic to the PCB.' },
    { term: 'Ratsnest', def: 'All the airwires on a board: a map of connections still to be routed.' },
    { term: 'Airwire / ratline', def: 'A thin straight line between pads of the same net that aren’t joined by copper yet.' },
    { term: 'Board outline', def: 'The closed shape that defines where the board is cut out.' },
    { term: 'Slot', def: 'A hole cut through the board, made by an extra closed shape inside the outline.' },
    { term: 'Cross-probe', def: 'Jumping between a part or net in the schematic and the same thing in the PCB (Shift+X).' },
  ],
}

export default lesson
