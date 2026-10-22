import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { LessonContent } from '../types'
import { useMission } from '../mission'
import { FloatingCard, Slider, Toggle, Button, Callout } from '@/components/ui'
import { Figure, Steps, Menu, Specs, SceneToolbar } from '@/components/content'
import { IconEye, IconEyeOff, IconCube } from '@/components/icons'
import { STACK, type StackLayerId } from './LayerStack'
import { BoardView } from '@/pcb/render'
import { stages } from '@/pcb/project'
import './lesson01.css'

const LayerStack3D = lazy(() => import('./LayerStack').then((m) => ({ default: m.LayerStack3D })))

function Scene() {
  const mission = useMission()
  const [explode, setExplode] = useState(0.55)
  const [selected, setSelected] = useState<StackLayerId | null>(null)
  const [showParts, setShowParts] = useState(false)
  const [labels, setLabels] = useState(true)
  const [visible, setVisible] = useState<Record<StackLayerId, boolean>>({
    silkTop: true,
    maskTop: true,
    copperTop: true,
    core: true,
    copperBottom: true,
    maskBottom: true,
  })

  useEffect(() => {
    if (explode >= 0.85) mission.complete('explode')
  }, [explode, mission])
  useEffect(() => {
    if (selected === 'copperTop' || selected === 'copperBottom') mission.complete('copper')
  }, [selected, mission])
  useEffect(() => {
    if (!visible.maskTop && !visible.silkTop) mission.complete('mask')
  }, [visible, mission])

  const sel = STACK.find((l) => l.id === selected)

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><div className="spinner" /></div>}>
        <LayerStack3D
          explode={explode}
          visible={visible}
          selected={selected}
          onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          showParts={showParts}
          showLabels={labels}
          onUnderneath={() => mission.complete('under')}
        />
      </Suspense>

      <FloatingCard title="Layer stack" subtitle="A 2-layer board, top to bottom. Click a layer to inspect it.">
        <Slider label="Explode" value={explode} min={0} max={1} step={0.01} onChange={setExplode} format={(v) => `${Math.round(v * 100)}%`} />
        <div className="stack-list">
          {STACK.map((l) => (
            <div key={l.id} className={`stack-row ${selected === l.id ? 'is-sel' : ''} ${!visible[l.id] ? 'is-off' : ''}`}>
              <button className="stack-row__main" onClick={() => setSelected((c) => (c === l.id ? null : l.id))}>
                <span className="stack-row__sw" style={{ background: l.color }} />
                <span className="stack-row__name">{l.name}</span>
              </button>
              <button
                className="stack-row__eye"
                aria-label={visible[l.id] ? `Hide ${l.name}` : `Show ${l.name}`}
                onClick={() => setVisible((v) => ({ ...v, [l.id]: !v[l.id] }))}
              >
                {visible[l.id] ? <IconEye size={15} /> : <IconEyeOff size={15} />}
              </button>
            </div>
          ))}
        </div>
        <Toggle label="Show components" checked={showParts} onChange={setShowParts} />
        <Toggle label="Labels" checked={labels} onChange={setLabels} />
      </FloatingCard>

      {sel && (
        <div className="float-card float-card--br layer-info" style={{ width: 290, bottom: 70 }}>
          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
            <span className="stack-row__sw" style={{ background: sel.color, width: 14, height: 14 }} />
            <span className="float-card__title">{sel.name}</span>
            <span className="grow" />
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{sel.thickness}</span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{sel.about}</div>
        </div>
      )}

      <SceneToolbar>
        <Button size="sm" variant="ghost" onClick={() => setExplode(0)}>
          Assembled
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setExplode(1)}>
          Exploded
        </Button>
        <span className="scene-toolbar__sep" />
        <Button size="sm" variant="ghost" active={showParts} onClick={() => setShowParts((s) => !s)}>
          <IconCube size={15} /> Parts
        </Button>
      </SceneToolbar>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function BoardSides() {
  const doc = useMemo(() => stages.finished(), [])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, padding: 22 }}>
      {(['top', 'bottom'] as const).map((side) => (
        <div key={side}>
          <svg viewBox={`-1 -1 ${doc.w + 2} ${doc.h + 2}`} width="100%">
            <BoardView doc={doc} mode="real" side={side} vis={{ bodies: side === 'top' }} />
          </svg>
          <div className="mono" style={{ textAlign: 'center', fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-3)', marginTop: 8 }}>
            {side.toUpperCase()} SIDE
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
        Open up almost any gadget (a TV remote, a game controller, a phone charger) and you'll find a flat green card covered
        in fine copper lines with tiny parts soldered on. That card is a <strong>printed circuit board</strong>, or PCB.
      </p>
      <p>
        A PCB does two jobs at once. It <strong>holds parts in place</strong> physically, and it <strong>connects them
        electrically</strong> with flat copper "wires" called <em>traces</em>. Before PCBs, electronics were wired by hand,
        point to point, with real wires. That was slow, bulky and easy to get wrong. A PCB replaces that tangle with a
        precise pattern that a factory can copy thousands of times without a single mistake.
      </p>

      <Figure label="Fig 1" caption="The same Blinky board from both sides. Copper under the green mask shows as a slightly lighter green. The silver patches are bare pads, ready for solder." bg="paper">
        <BoardSides />
      </Figure>

      <h2>A sandwich of layers</h2>
      <p>
        A circuit board is a sandwich. On the simplest useful board, the <strong>2-layer</strong> board you'll design in
        this course, there are six layers that matter, from top to bottom:
      </p>
      <Steps
        items={[
          { title: 'Silkscreen', body: 'Printed ink labels like "R1" and "+5V", part outlines and logos. It tells a human where each part goes.' },
          { title: 'Solder mask', body: 'A thin protective coat (usually green) over the copper. It stops solder from bridging between traces and protects the copper from rust.' },
          { title: 'Top copper', body: 'Copper foil etched into traces and pads. This is where the electricity flows.' },
          { title: 'FR-4 core', body: 'The rigid, non-conductive middle: fibreglass cloth set in epoxy. It is usually 1.6 mm thick.' },
          { title: 'Bottom copper', body: 'More traces on the underside. Having two copper layers lets traces cross over each other.' },
          { title: 'Bottom solder mask', body: 'And sometimes bottom silkscreen too.' },
        ]}
      />
      <Specs
        items={[
          { k: 'Board thickness', v: '1.6 mm', note: 'The industry-standard default' },
          { k: 'Copper weight', v: '1 oz', note: '≈ 35 µm thick, thinner than a hair' },
          { k: 'Core material', v: 'FR-4', note: '"Flame Retardant 4" fibreglass epoxy' },
          { k: 'Mask colour', v: 'Green', note: 'Tradition, contrast, and the cheapest option' },
        ]}
      />
      <Callout kind="tip" title="Why green?">
        Green solder mask is a convention, not a requirement. Most factories also offer black, blue, red, white, yellow and
        purple. Green stays popular because it's cheapest, it makes white labels easy to read, and inspectors are used to
        spotting defects against it.
      </Callout>

      <h2>Holes that connect layers</h2>
      <p>
        If copper is on both sides, how does electricity get from the top to the bottom? Through <strong>plated holes</strong>.
        The factory drills a hole and then coats its inside wall with copper, so it becomes a tiny copper tube.
      </p>
      <ul>
        <li>
          <strong>Vias</strong> are small plated holes whose only job is to carry a trace from one layer to another.
        </li>
        <li>
          <strong>Through-hole pads</strong> are bigger plated holes that component legs poke through to be soldered.
        </li>
      </ul>
      <p>
        In the 3D model above, turn on <em>Explode</em> and look for the copper tubes running through the core. Those are
        the plated holes.
      </p>

      <h2>How boards are made (in 60 seconds)</h2>
      <Steps
        items={[
          { title: 'Start with a copper-clad sheet', body: 'FR-4 with copper foil bonded to both sides.' },
          { title: 'Drill', body: 'Machines drill every hole: vias, through-hole pads and mounting holes.' },
          { title: 'Plate', body: 'Copper is deposited inside the holes so they connect top to bottom.' },
          { title: 'Image & etch', body: 'Your copper pattern is printed onto the board as a protective coating, and acid dissolves all the unprotected copper.' },
          { title: 'Mask & finish', body: 'Solder mask goes on, pads get a solderable finish (tin or gold), and the silkscreen is printed.' },
          { title: 'Route & test', body: 'Boards are cut to shape, and many factories electrically test every connection.' },
        ]}
      />
      <p>
        All of that is driven by the files you design. Your job as the designer is to describe <em>each layer</em>: where the
        copper goes, where the mask opens, what's printed and where holes are drilled. That's exactly what EasyEDA helps you
        do, and by Lesson 15 you'll be sending those layer files to a real factory.
      </p>
      <Callout kind="easyeda" title="You'll meet these layers in EasyEDA">
        EasyEDA's PCB editor has a <strong>Layers</strong> panel on the right with entries like <em>Top Layer</em>,{' '}
        <em>Bottom Layer</em>, <em>Top Silkscreen</em> and <em>Top Solder Mask</em>, plus <em>Board Outline</em> for the shape
        of the board. You can switch each one on or off, just like the eye icons in this lesson.
      </Callout>
      <p>
        Want a sneak peek? In any EasyEDA PCB, <Menu path={['View', '3D Preview']} /> shows your board as a 3D model, a lot
        like the one at the top of this page.
      </p>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Drag to orbit the board. Pull the layers apart, inspect them, and hide the mask to see the copper.',
  missions: [
    { id: 'explode', text: 'Explode the board all the way to pull the layers apart' },
    { id: 'copper', text: 'Click a copper layer to inspect it' },
    { id: 'mask', text: 'Hide the silkscreen and solder mask to reveal the bare copper' },
    { id: 'under', text: 'Orbit underneath the board to see its bottom side' },
  ],
  Article,
  build: {
    intro: <>Get EasyEDA ready. You'll use it from Lesson 5 onwards, so set it up now.</>,
    steps: [
      {
        title: 'Open EasyEDA Pro',
        body: (
          <>
            Go to <b>easyeda.com</b> and choose <b>EasyEDA Pro</b>, the current edition (Standard is in maintenance mode). It
            runs in your browser, and a desktop client is available for Windows, macOS and Linux.
          </>
        ),
      },
      {
        title: 'Create a project called "Blinky"',
        menu: ['File', 'New', 'Project'],
        body: <>Give it a name and click save. A new Pro project already contains a board, a schematic and a PCB.</>,
      },
      {
        title: 'Open the PCB and find the Layers panel',
        body: (
          <>
            Double-click the PCB in the left project panel. On the right you'll find the <b>Layers</b> list (Top Layer, Bottom
            Layer, silkscreen, solder mask…). Click the eye icons to hide and show layers.
          </>
        ),
      },
      {
        title: 'Peek at the 3D view',
        menu: ['View', '3D Preview'],
        body: <>The board is empty for now, just a green rectangle. You'll fill it in over the next lessons.</>,
      },
    ],
    tip: <>Prefer to work offline? The desktop client has a "half-offline" mode that keeps projects on your computer while still searching the online parts library.</>,
  },
  quiz: [
    {
      q: 'Which layer actually carries electricity between parts?',
      options: ['Silkscreen', 'Solder mask', 'Copper', 'FR-4 core'],
      answer: 2,
      explain: 'Copper traces are the "wires" of a PCB. The mask and silkscreen are coatings, and FR-4 is an insulator.',
    },
    {
      q: 'What is the green solder mask for?',
      options: [
        'It conducts electricity to the pads',
        'It protects the copper and keeps solder from bridging between traces',
        'It glues the components on',
        'It makes the board stiffer',
      ],
      answer: 1,
      explain: 'Solder mask is a protective lacquer with openings only at the pads, so solder goes where it should and nowhere else.',
    },
    {
      q: 'How does a trace get from the top copper layer to the bottom one?',
      options: ['Through a via, a small copper-plated hole', 'The FR-4 conducts it', 'Through the silkscreen', 'It can’t'],
      answer: 0,
      explain: 'A via is a drilled hole with a copper-plated wall, a tiny tube that connects the layers.',
    },
  ],
  terms: [
    { term: 'PCB', def: 'Printed circuit board: a rigid board that holds parts and connects them with copper.' },
    { term: 'Trace', def: 'A flat copper "wire" etched onto a copper layer.' },
    { term: 'Pad', def: 'A bare patch of copper where a component lead gets soldered.' },
    { term: 'FR-4', def: 'Fibreglass-reinforced epoxy, the standard non-conductive board material.' },
    { term: 'Solder mask', def: 'Protective coating over the copper, usually green, with openings at the pads.' },
    { term: 'Silkscreen', def: 'Printed labels and outlines that guide assembly.' },
    { term: 'Via', def: 'A small plated hole that connects traces on different layers.' },
    { term: '2-layer board', def: 'A board with copper on both the top and bottom sides of one core.' },
  ],
}

export default lesson
