import { useMemo } from 'react'
import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Compare, Figure, Menu, Steps } from '@/components/content'
import { BoardView, FootprintGraphic } from '@/pcb/render'
import { stages, netlist } from '@/pcb/project'
import { blinkySchematic, SCH_BOUNDS, type SymInst } from '@/pcb/schematic'
import { SymbolGraphic } from '@/pcb/SchematicView'
import { netGraph, SchDrawing } from './schKit'
import { Scene } from './Scene'
import './lesson06.css'

/* ------------------------------------------------------------------ */
/* Article figures                                                     */
/* ------------------------------------------------------------------ */

function MapVsTerritory() {
  const doc = useMemo(() => blinkySchematic(), [])
  const graph = useMemo(() => netGraph(doc, netlist), [doc])
  const board = useMemo(() => stages.finished(), [])
  const b = SCH_BOUNDS
  return (
    <div className="l06-map">
      <div>
        <svg viewBox={`${b.x - 16} ${b.y - 4} ${b.w + 20} ${b.h + 8}`} width="100%" style={{ background: 'var(--sch-bg)', borderRadius: 8 }}>
          <SchDrawing doc={doc} graph={graph} showPinNumbers={false} />
        </svg>
        <div className="l06-map__cap">The map · schematic</div>
      </div>
      <div>
        <svg viewBox={`-1 -1 ${board.w + 2} ${board.h + 2}`} width="100%">
          <BoardView doc={board} mode="real" vis={{ bodies: true }} />
        </svg>
        <div className="l06-map__cap">The territory · PCB</div>
      </div>
    </div>
  )
}

function PinsFigure() {
  const u1: SymInst = { ref: 'U1', sym: 'NE555', value: 'NE555', x: 0, y: 0, rot: 0 }
  return (
    <div className="l06-pins-fig">
      <div>
        <svg viewBox="-84 -86 170 172" width="100%" style={{ background: 'var(--sch-bg)', borderRadius: 8, maxHeight: 260 }}>
          <SymbolGraphic inst={u1} highlightPins={['8']} />
        </svg>
        <div className="l06-map__cap">Symbol: pins grouped by job</div>
      </div>
      <div>
        <svg viewBox="-4.4 -3.6 8.8 7.2" width="100%" style={{ background: '#1f6b47', borderRadius: 8, maxHeight: 260 }}>
          <FootprintGraphic fp="SOIC-8" mode="real" showSilk showNumbers highlightPad="8" />
        </svg>
        <div className="l06-map__cap">Footprint: pins by position</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Article() {
  return (
    <>
      <p className="lead">
        A schematic is a circuit drawn as a diagram. It doesn't show where anything sits on the board or how big it is. It
        shows one thing only: <strong>what is connected to what</strong>. Learn to read it and every circuit you meet becomes
        a story you can follow.
      </p>

      <h2>The map, not the territory</h2>
      <p>
        Think of a metro map. The lines are straight and evenly spaced, and stations that are far apart in real life sit
        side by side. Nobody minds, because the map's only job is to show which stations connect. A schematic is the same:
        it is the <strong>map</strong>, and the PCB layout is the <strong>territory</strong>.
      </p>
      <Figure label="Fig 1" caption="Blinky twice. The schematic arranges parts so the circuit is easy to understand; the board arranges them so they fit in 30 × 26 mm. They describe exactly the same connections." bg="paper">
        <MapVsTerritory />
      </Figure>
      <p>
        You'll always draw the schematic first. EasyEDA then uses it to know which pads on the board must be joined, so the
        schematic is the single source of truth for your design.
      </p>

      <h2>Symbols, designators and values</h2>
      <p>
        Each part is drawn as a <strong>symbol</strong>: a resistor is a small rectangle, a capacitor is two parallel
        plates, an LED is a triangle with a bar and little arrows for the light, and a chip is a box with pins sticking
        out. Next to every symbol are two pieces of text:
      </p>
      <ul>
        <li>
          The <strong>designator</strong> is the part's unique name. The letter says what kind of part it is (R for
          resistor, C for capacitor, D for diode or LED, U for an IC, J for a connector) and the number tells parts
          apart: R1, R2, R3.
        </li>
        <li>
          The <strong>value</strong> says which exact part it is: 330Ω, 10µF, NE555. Two parts can share a value, but
          never a designator.
        </li>
      </ul>
      <p>The designator is how you'll find the same part later on the board, in the bill of materials and on the silkscreen.</p>

      <h2>Wires and nets</h2>
      <p>
        The green lines are <strong>wires</strong>. Wires that touch form a <strong>net</strong>: a group of pins that are all
        electrically the same point. A net might be one short wire between two pins, or a whole tree of branches. Blinky has
        seven nets, and the scene above lets you light each one up.
      </p>
      <p>
        On the finished board, each net becomes copper. The wires on the schematic don't have to look anything like the
        copper traces; they only promise that those pins will end up joined.
      </p>

      <h2>Dots and crossings</h2>
      <p>
        When wires meet in a T, a <strong>junction dot</strong> marks the join. When two wires simply cross with no dot,
        they are <strong>not connected</strong>, like a road bridge passing over another road.
      </p>
      <Compare
        leftLabel="Joined"
        rightLabel="Not joined"
        left={<p>A T-junction with a dot. All three branches are one net.</p>}
        right={<p>A plain crossing with no dot. Two separate nets pass over each other.</p>}
      />
      <p>
        Good schematics avoid four wires meeting at a single dot, because a smudged print could make it look like a crossing.
        Two T-junctions a little apart say the same thing with no doubt at all.
      </p>

      <h2>Net labels and flags: connections without lines</h2>
      <p>
        Drawing a wire to every pin would turn a big schematic into spaghetti. So there's a shortcut: <strong>net labels</strong>.
        Put a label with the same name on two wires and they're connected, even if no line joins them. Blinky's two
        <em> THR</em> labels do exactly that: one sits next to the 555 and one next to R2 and C1, and together they form a single net.
      </p>
      <p>
        <strong>Net flags</strong> are the same idea for power. The little T-shaped VCC symbol and the stack of lines for GND
        are flags, and every GND flag on the page is the same net. That's why Blinky can drop a ground symbol beside each
        part instead of running a wire back to the connector.
      </p>
      <Callout kind="easyeda" title="How EasyEDA Pro thinks about labels">
        In EasyEDA Pro, a net label isn't a separate object floating on the page. Placing one sets the <b>name of the wire</b>, and
        the wire's name is the net's name. Select any wire and its net name shows in the <b>Property</b> panel on the right.
        Flags come from <Menu path={['Place', 'Net Flag']} />, which offers Power, Ground, Analog Ground and Protect Ground.
      </Callout>

      <h2>Pin numbers vs pin names</h2>
      <p>
        A chip's symbol shows two things at each pin: a <strong>number</strong> outside the box and a <strong>name</strong> inside.
        The number is the physical leg on the real package. The name is the pin's job. The symbol is free to arrange pins by
        job (power at the top, ground at the bottom, inputs on the left) while the package numbers them in order round the chip.
      </p>
      <Figure label="Fig 2" caption="Pin 8 of the NE555 is VCC, highlighted on both. On the symbol it sits at the top because it's a power pin. On the SOIC-8 package it's the top-right leg, counting anticlockwise from the dot that marks pin 1." bg="paper">
        <PinsFigure />
      </Figure>

      <h2>Reading Blinky, in plain English</h2>
      <Steps
        items={[
          { title: 'Power comes in', body: 'J1 is a two-pin header. Pin 1 feeds +5 V into the VCC net and pin 2 is ground.' },
          { title: 'The chip gets fed', body: 'VCC reaches the 555 on pin 8 and also pin 4 (RESET), which must be held high for the chip to run. C2, 100 nF, sits right across the supply as a tiny local reservoir.' },
          { title: 'The timing network', body: 'R1, R2 and C1 form the clock. C1 charges through R1 and R2, then the 555 empties it through R2 into pin 7 (DIS). Pins 2 and 6 watch the capacitor voltage on the THR net.' },
          { title: 'The output drives the LED', body: 'Pin 3 (OUT) flips high and low about one and a half times a second. Through R3 (330 Ω) it lights D1, and current returns to ground.' },
          { title: 'A quiet control pin', body: 'C3 (10 nF) ties pin 5 (CTRL) to ground so electrical noise doesn’t nudge the timing.' },
        ]}
      />
      <Callout kind="tip" title="A net with one pin is a warning sign">
        If a net touches only one pin, it connects to nothing. EasyEDA reports this as a single-pin net, and it usually means a
        wire stops just short of the pin it was meant to reach.
      </Callout>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Hover or tap wires and pins to light up whole nets. Click a part to inspect it, then follow the current through the LED.',
  missions: [
    { id: 'gnd', text: 'Highlight the GND net and watch every ground flag light up' },
    { id: 'thr', text: 'Discover that the two THR labels are one net' },
    { id: 'vcc-pin', text: 'Find which pin of the 555 (U1) is its VCC power pin, and tap it' },
    { id: 'current', text: 'Follow the current from the connector, through the LED, and back to ground' },
  ],
  Article,
  build: {
    intro: <>Open your Blinky project (or any example project) and practise reading the schematic in EasyEDA Pro.</>,
    steps: [
      {
        title: 'Open the schematic',
        body: <>Double-click the schematic in the left project panel. It opens on a light canvas, with the Property panel on the right.</>,
      },
      {
        title: 'Select a wire and read its net',
        body: <>Click any wire. The Property panel shows its name, which is the net's name. Wires without a label get an automatic name.</>,
      },
      {
        title: 'Place a net label',
        keys: ['N'],
        body: <>Press N, click on a wire and type a name such as THR. Any wire with the same name is now the same net.</>,
      },
      {
        title: 'Add power and ground flags',
        menu: ['Place', 'Net Flag'],
        body: <>Choose Power for VCC or Ground for GND and click it onto a wire end. Every flag with the same name is one net.</>,
      },
      {
        title: 'Cross-probe to the PCB',
        keys: ['Shift+X'],
        body: <>Select a part or net and press Shift+X to jump to the matching item in the PCB document. Handy once you start laying out.</>,
      },
    ],
    tip: <>Lost on a big sheet? Press K to fit everything on screen, then zoom with the mouse wheel.</>,
  },
  quiz: [
    {
      q: 'Two wires cross on a schematic and there is no dot where they meet. Are they connected?',
      options: ['Yes, touching wires are always connected', 'No, a crossing without a dot is not a connection', 'Only if they are the same colour', 'Only on the PCB'],
      answer: 1,
      explain: 'A dot marks a junction. Without one, the wires just pass over each other, like a bridge over a road.',
    },
    {
      q: 'Two net labels, both named THR, sit at opposite ends of the sheet with no wire between them. What does that mean?',
      options: ['Nothing; labels are only comments', 'They are the same net, so those wires are connected', 'It is an error that must be fixed', 'They connect only on the bottom layer'],
      answer: 1,
      explain: 'Same name, same net. Labels let you connect things without drawing long wires across the page.',
    },
    {
      q: "On Blinky's NE555 symbol, which pin number is VCC?",
      options: ['1', '3', '4', '8'],
      answer: 3,
      explain: 'Pin 8 is VCC and pin 1 is GND. Pin 4 (RESET) is also tied to VCC in Blinky, but it is not the power pin.',
    },
    {
      q: 'What does the designator "R3" tell you?',
      options: ['The resistor is 3 Ω', 'It is the third resistor, a unique name for that part', 'It is on layer 3', 'It has 3 pins'],
      answer: 1,
      explain: 'R means resistor and 3 makes the name unique. The value (330 Ω) is a separate piece of text.',
    },
  ],
  terms: [
    { term: 'Schematic', def: 'A diagram of a circuit that shows what connects to what, but not where parts sit physically.' },
    { term: 'Symbol', def: 'The drawing that stands for a part on a schematic, with a pin for each connection.' },
    { term: 'Designator', def: 'A part’s unique name, such as R1 or U1. The letter gives the type of part.' },
    { term: 'Value', def: 'Which exact part it is, for example 330Ω, 10µF or NE555.' },
    { term: 'Net', def: 'A group of pins and wires that are all electrically connected.' },
    { term: 'Junction', def: 'A dot where wires meet and join. Crossing wires without a dot are not connected.' },
    { term: 'Net label', def: 'A name placed on a wire. Wires with the same name are connected.' },
    { term: 'Net flag', def: 'A power or ground symbol such as VCC or GND. All flags with the same name are one net.' },
  ],
}

export default lesson
