import { useId, useMemo } from 'react'
import type { LessonContent } from '../types'
import { Callout, Keys } from '@/components/ui'
import { Figure, Menu, Specs, Compare } from '@/components/content'
import { BoardView, PadGlyph } from '@/pcb/render'
import { analyze } from '@/pcb/board'
import { stages } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import type { Vec } from '@/pcb/geom'
import { Scene } from './Scene'
import { EdaBoard12, PourArt } from './board12'
import { fillPour, type PourSpec } from './pour'
import './lesson12.css'

const FULL: Vec[] = [
  [0.5, 0.5],
  [29.5, 0.5],
  [29.5, 25.5],
  [0.5, 25.5],
]

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

function BeforeAfter() {
  const routed = useMemo(() => stages.routed(), [])
  const poured = useMemo(() => stages.poured(), [])
  return (
    <div className="l12-pair">
      {[
        { doc: routed, cap: 'Tracks only' },
        { doc: poured, cap: 'With a GND pour' },
      ].map(({ doc, cap }) => (
        <div key={cap}>
          <svg viewBox={`-1 -1 ${doc.w + 2} ${doc.h + 2}`} width="100%" style={{ display: 'block' }}>
            <BoardView doc={doc} mode="real" vis={{ bodies: true }} />
          </svg>
          <div className="l12-cap">{cap}</div>
        </div>
      ))}
    </div>
  )
}

/** Zoomed copper view of J1 pin 2, with a thermal relief or a solid join. */
function ReliefZoom({ thermals }: { thermals: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const doc = useMemo(() => stages.routed(), [])
  const conn = useMemo(() => analyze(doc), [doc])
  const pad = conn.pads.find((p) => p.key === 'J1.2')!
  const pour: PourSpec = { id: 'z', net: 'GND', layer: 'top', pts: FULL, clearance: 0.4, thermals, spoke: 0.4 }
  const W = 5.4
  const H = 4
  return (
    <svg viewBox={`${pad.x - W / 2} ${pad.y - H / 2} ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: 10 }}>
      <defs>
        <pattern id={`fr-${uid}`} width={0.36} height={0.2} patternUnits="userSpaceOnUse">
          <rect width={0.36} height={0.2} fill="#c9b27a" />
          <path d="M0 0.1 Q0.09 0.04 0.18 0.1 T0.36 0.1" fill="none" stroke="#b39c63" strokeWidth={0.03} opacity={0.6} />
        </pattern>
        <linearGradient id={`cu-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2b67a" />
          <stop offset="0.45" stopColor="#d88b45" />
          <stop offset="1" stopColor="#b4692d" />
        </linearGradient>
        <radialGradient id={`pad-${uid}`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffd8a6" />
          <stop offset="0.55" stopColor="#e09550" />
          <stop offset="1" stopColor="#a8622a" />
        </radialGradient>
        <filter id={`sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0.03} dy={0.05} stdDeviation={0.04} floodColor="#2a1a08" floodOpacity={0.45} />
        </filter>
      </defs>
      <rect x={pad.x - W / 2} y={pad.y - H / 2} width={W} height={H} fill={`url(#fr-${uid})`} />
      <g filter={`url(#sh-${uid})`}>
        <PourArt pour={pour} doc={doc} conn={conn} fill={`url(#cu-${uid})`} islands={[]} keepIslands uid={uid} />
        {doc.tracks
          .filter((t) => t.layer === 'top')
          .map((t) => (
            <polyline key={t.id} points={t.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={`url(#cu-${uid})`} strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        {conn.pads
          .filter((p) => p.layers.includes('top'))
          .map((p) => (
            <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              <PadGlyph pad={p} fill={`url(#pad-${uid})`} hole="#1b1a17" />
            </g>
          ))}
      </g>
      <rect x={pad.x - W / 2} y={pad.y - H / 2} width={W} height={H} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={0.04} />
    </svg>
  )
}

function IslandFig() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const doc = useMemo(() => stages.routed(), [])
  const conn = useMemo(() => analyze(doc), [doc])
  const pour: PourSpec = { id: 'i', net: 'GND', layer: 'top', pts: FULL, clearance: 0.6, thermals: true, spoke: 0.35 }
  const fill = useMemo(() => fillPour(doc, conn, pour), [doc, conn]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <svg viewBox="-1.5 -1.5 33 29" width="100%" style={{ display: 'block' }}>
      <defs>
        <pattern id={`ih-${uid}`} width={0.4} height={0.4} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1={0} y1={0} x2={0} y2={0.4} stroke={EDA.drc} strokeWidth={0.12} />
        </pattern>
      </defs>
      <EdaBoard12
        doc={doc}
        conn={conn}
        showRatsnest={false}
        pourSlot={(layer, color) =>
          layer === 'top' ? <PourArt pour={pour} doc={doc} conn={conn} fill={color} opacity={0.5} islands={fill.islands} keepIslands={false} uid={uid} /> : null
        }
      >
        {fill.islands.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={`url(#ih-${uid})`} />
        ))}
      </EdaBoard12>
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
        Once the tracks are in, most of a board is empty. A <strong>copper pour</strong> fills that empty space with
        copper connected to one net, almost always ground. It's quick to add and makes the board work better.
      </p>

      <h2>What a pour is</h2>
      <p>
        You draw an outline, called a <em>copper region</em> in EasyEDA, and give it a net. EasyEDA then floods the
        outline with copper, but it's polite about it: it keeps a <strong>clearance gap</strong> around every track
        and pad of another net, and it joins every pad of its own net. You never draw the shape by hand. Change the
        board and the pour reshapes itself around your changes when it is rebuilt.
      </p>
      <Figure label="Fig 1" caption="Blinky before and after a ground pour, as it will look from the factory. The pour shows as lighter green under the solder mask." bg="paper">
        <BeforeAfter />
      </Figure>

      <h2>Why ground pours help</h2>
      <p>
        Every current that leaves the battery has to come back to it. On a circuit board, the way back is
        ground. Think of the GND tracks as narrow country lanes, and a ground pour as a ten-lane motorway: there's always
        a short, wide road home, whichever part the current started from.
      </p>
      <ul>
        <li>
          <strong>A low-impedance return path.</strong> Wide copper has very little resistance and inductance, so ground
          stays at the same 0 V everywhere and the chip sees a cleaner supply.
        </li>
        <li>
          <strong>Less copper to etch away.</strong> Boards start fully coated in copper. With a pour, the factory
          removes less of it, which tends to give a more even result.
        </li>
        <li>
          <strong>Some shielding.</strong> A sheet of ground around and under your tracks soaks up some interference
          before it reaches them, and keeps your own signals from spreading.
        </li>
        <li>
          <strong>Heat spreading.</strong> Copper conducts heat well, so a warm part shares its heat with the whole
          plane.
        </li>
      </ul>

      <h2>Thermal reliefs</h2>
      <p>
        That last point has a catch. When you solder a ground pad by hand, the plane pulls heat away from the pad as
        fast as your iron puts it in. The solder struggles to melt, and you can end up with a dull, lumpy{' '}
        <em>cold joint</em> that barely holds. The fix is a <strong>thermal relief</strong>: instead of joining the pad
        on all sides, the pour connects through a few thin <em>spokes</em>. Electrically it's still well connected, but
        the heat stays in the pad long enough to solder it.
      </p>
      <Figure label="Fig 2" caption="J1's ground pin with a thermal relief (left) and a solid connection (right). Try the heat test in the scene's Thermals inspector." bg="paper">
        <div className="l12-pair">
          <div>
            <ReliefZoom thermals />
            <div className="l12-cap">Thermal relief: 4 spokes</div>
          </div>
          <div>
            <ReliefZoom thermals={false} />
            <div className="l12-cap">Solid connection</div>
          </div>
        </div>
      </Figure>
      <Compare
        leftLabel="Thermal relief"
        rightLabel="Solid"
        left={<>Easy to hand-solder. The usual choice for pads, especially through-hole pins and anything you'll solder with an iron.</>}
        right={<>Lowest resistance and best heat sinking, but hard to solder by hand. Used where a part needs to dump heat into the plane.</>}
      />

      <h2>Clearance</h2>
      <p>
        Clearance is the gap the pour leaves between itself and copper of other nets. The beginner design rule is{' '}
        <strong>0.2 mm</strong>; many people give pours a little more (Blinky's pour uses 0.3 mm) so the copper never
        crowds a track. Too much clearance has a cost: the pour can no longer squeeze through narrow gaps between pads,
        and parts of it get cut off.
      </p>
      <Specs
        items={[
          { k: 'Pour net', v: 'GND', note: 'Almost always ground' },
          { k: 'Clearance', v: '0.3 mm', note: 'Blinky’s pour; 0.2 mm is the minimum rule' },
          { k: 'Pad connection', v: 'Thermal', note: 'Spokes make hand soldering easier' },
          { k: 'Keep islands', v: 'Off', note: 'Let EasyEDA delete orphan copper' },
        ]}
      />

      <h2>Islands</h2>
      <p>
        An <strong>island</strong> is a piece of pour that ends up connected to nothing on its net, for example a pocket
        walled in by tracks. A floating patch of copper does no good and can pick up noise like a tiny antenna, so pour
        tools generally clear it away. EasyEDA removes copper that has <strong>no net</strong> as an island unless you
        turn on <em>Keep Islands</em>. That is also why a brand-new region with no net seems to vanish: give it a net
        first.
      </p>
      <Figure label="Fig 3" caption="Blinky's top pour with the clearance raised to 0.6 mm. The pour can no longer slip between R1's pads, so the pocket inside the VCC track (hatched) is cut off from every GND pad. In the scene, islands like this are removed when the copper is rebuilt." bg="eda">
        <div className="l12-fig">
          <IslandFig />
        </div>
      </Figure>

      <h2>Both layers, stitched together</h2>
      <p>
        On a 2-layer board it's common to pour GND on <strong>both</strong> sides. A bottom pour on its own can only
        reach pads that go through the board, like J1's header pins, because surface-mount pads sit on the top layer.
        So designers scatter <strong>stitching vias</strong>: plain vias on GND that join the top and bottom pours at many
        points. Blinky's finished board has a GND pour on each side.
      </p>
      <Callout kind="tip" title="Try it in the scene">
        Switch the region to the <b>Bottom</b> layer, then delete the GND tracks. The ratsnest reappears for the
        surface-mount ground pads: the bottom pour can't reach them without vias.
      </Callout>

      <h2>Rebuild after changes</h2>
      <p>
        A pour is calculated, not drawn, so it has to be <strong>rebuilt</strong> when things around it change. If you
        move a part and the copper looks wrong, rebuild it. EasyEDA can also do this for you.
      </p>
      <ul>
        <li>
          <Keys combo="Shift+B" /> rebuilds all copper regions.
        </li>
        <li>
          <Keys combo="Shift+M" /> shows or hides copper regions, handy when the pour hides the tracks you're working on.
        </li>
        <li>
          <Menu path={['Settings', 'PCB/Footprint', 'General']} /> has <em>Rebuild Copper Region automatically</em>.
        </li>
      </ul>
      <Callout kind="easyeda" title="No shortcut for the region tool in Pro">
        In EasyEDA Pro you start a pour from <Menu path={['Place', 'Copper Region']} />, as a rectangle or a polygon.
        There's no default shortcut for it. (The older Standard Edition used <b>E</b>.)
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

const lesson: LessonContent = {
  Scene,
  goal: 'Draw a copper region over Blinky, connect it to GND, and see whether the board still works without its ground tracks.',
  missions: [
    { id: 'draw', text: 'Draw a copper region over the board' },
    { id: 'gnd', text: 'Set the region’s net to GND so it floods around everything' },
    { id: 'delete', text: 'Delete the GND tracks and keep every net connected through the pour' },
    { id: 'thermal', text: 'In the Thermals inspector, solder a pad with a thermal relief and with a solid connection' },
  ],
  Article,
  build: {
    intro: <>Add a ground pour to your Blinky PCB in EasyEDA Pro. Shortcuts are defaults and may differ in your shortcut theme.</>,
    steps: [
      {
        title: 'Draw a copper region',
        menu: ['Place', 'Copper Region'],
        body: <>Draw a rectangle (or polygon) around the whole board on the Top Layer. There's no default shortcut in Pro.</>,
      },
      {
        title: 'Set its net to GND',
        body: (
          <>
            Select the region and set <b>Net</b> to <b>GND</b> in the right-hand <b>Property</b> panel. A region with no net
            is removed as an island unless "Keep Islands" is on.
          </>
        ),
      },
      {
        title: 'Rebuild the copper',
        keys: ['Shift+B'],
        body: <>Rebuild all copper regions so the pour reflows around tracks and pads. Do this again after any change to the board.</>,
      },
      {
        title: 'Show or hide the pour',
        keys: ['Shift+M'],
        body: <>Hide copper regions while you edit tracks underneath, then show them again.</>,
      },
      {
        title: 'Optional: rebuild automatically',
        menu: ['Settings', 'PCB/Footprint', 'General'],
        body: <>Turn on <b>Rebuild Copper Region automatically</b> so you don't have to remember Shift+B.</>,
      },
      {
        title: 'Repeat on the bottom layer',
        body: <>Draw a second GND region on the Bottom Layer, then add a few vias on GND (check each via's net in the Property panel) to stitch the two pours together.</>,
      },
    ],
    tip: <>Run <Menu path={['Design', 'Check DRC']} /> after pouring. A pour can hide a mistake, such as a pad that only looks connected.</>,
  },
  quiz: [
    {
      q: 'You draw a copper region but never set its net. What happens when it is rebuilt?',
      options: ['It joins every net', 'It is removed as an island, unless Keep Islands is on', 'It becomes GND automatically', 'It shorts the board'],
      answer: 1,
      explain: 'Copper with no net isn’t connected to anything. EasyEDA removes it as an island unless you turn on Keep Islands.',
    },
    {
      q: 'Why do pours connect to pads through thin spokes (thermal reliefs)?',
      options: ['To save copper', 'So the pad doesn’t lose its heat to the plane while you solder it', 'To lower resistance', 'Because the factory requires it'],
      answer: 1,
      explain: 'A solid join lets the plane suck heat away from the iron. Spokes keep the pad hot enough for the solder to flow.',
    },
    {
      q: 'You raise the pour clearance from 0.3 mm to 1.0 mm. What can go wrong?',
      options: ['Nothing, bigger is always safer', 'The pour can no longer fit through narrow gaps, leaving islands or cut-off pads', 'The tracks get thinner', 'The board gets thicker'],
      answer: 1,
      explain: 'A wide gap around every track closes off narrow channels. Pockets become islands and some pads may lose their connection.',
    },
    {
      q: 'Which shortcut rebuilds all copper regions in EasyEDA Pro (default)?',
      options: ['Shift+M', 'Shift+B', 'Ctrl+R', 'E'],
      answer: 1,
      explain: 'Shift+B rebuilds all copper. Shift+M shows or hides copper regions.',
    },
  ],
  terms: [
    { term: 'Copper pour', def: 'A region flooded with copper on one net, usually GND, that flows around other copper. EasyEDA calls it a Copper Region.' },
    { term: 'Ground plane', def: 'A large area of ground copper that gives every current a short, wide path back.' },
    { term: 'Return path', def: 'The route current takes back to the supply. On most boards it is ground.' },
    { term: 'Thermal relief', def: 'A pad joined to a pour by a few thin spokes so it can be soldered easily.' },
    { term: 'Clearance', def: 'The gap kept between copper of different nets, including around a pour.' },
    { term: 'Island', def: 'A piece of copper connected to nothing on its net. EasyEDA removes no-net islands unless Keep Islands is on.' },
    { term: 'Stitching via', def: 'A via on GND that ties the top and bottom ground pours together.' },
    { term: 'Rebuild', def: 'Recalculating a pour after the board changes. Shift+B in EasyEDA Pro by default.' },
  ],
}

export default lesson
