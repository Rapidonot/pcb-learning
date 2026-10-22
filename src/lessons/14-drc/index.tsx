import { useMemo } from 'react'
import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Menu, Steps, Compare } from '@/components/content'
import { BoardView } from '@/pcb/render'
import { analyze, beginnerRules } from '@/pcb/board'
import { Scene, KindIcon, Culprits } from './Scene'
import { KINDS, buggyBoard, runDrc } from './bugs'
import './lesson14.css'

/* A "rogues' gallery": each error kind cropped from the buggy board. */
function ErrorGallery() {
  const doc = useMemo(() => buggyBoard(), [])
  const errs = useMemo(() => runDrc(doc, beginnerRules), [doc])
  const conn = useMemo(() => analyze(doc), [doc])
  const picks = (['short', 'clearance', 'unrouted', 'width', 'edge', 'overlap'] as const).map((k) => errs.find((e) => e.kind === k)!)
  return (
    <div className="l14-gallery">
      {picks.map((e) => {
        const w = 8
        const h = 5.8
        const x = Math.max(-1, Math.min(31 - w, e.at[0] - w / 2))
        const y = Math.max(-1, Math.min(27 - h, e.at[1] - h / 2))
        return (
          <div key={e.kind} className="l14-gallery__item">
            <svg viewBox={`${x} ${y} ${w} ${h}`} width="100%" style={{ display: 'block', aspectRatio: `${w} / ${h}` }} role="img" aria-label={KINDS[e.kind].label}>
              <BoardView doc={doc} conn={conn} mode="eda" vis={{ pours: false }} drcErrors={[e]} />
              <Culprits doc={doc} pads={conn.pads} ids={new Set(e.culprits)} at={e.at} stale={false} />
            </svg>
            <div className="l14-gallery__cap">
              <KindIcon kind={e.kind} size={12} />
              {KINDS[e.kind].label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Article() {
  return (
    <>
      <p className="lead">
        A factory doesn’t know what you <em>meant</em>. It makes exactly what is in your files, down to the last hair-thin
        track and the stray bit of copper you forgot about. A <strong>design rule check</strong> (DRC) is the safety net: it
        measures every piece of copper on your board against a list of rules and lists every place you broke one.
      </p>
      <p>
        Think of it as a spell-checker for circuit boards. It can’t tell whether your circuit is a good idea, but it is
        relentless about the boring, measurable things: gaps, widths, distances and missing connections. Those are exactly
        the things that turn a new board into a dud.
      </p>

      <h2>What DRC checks</h2>
      <p>
        Every check compares the geometry of your board with a <strong>design rule</strong>: a minimum width, a minimum gap or
        a minimum distance. The board in the scene above hides one of each of the most common problems:
      </p>
      <Figure label="Fig 1" caption="The six mistakes from the scene, cropped from the buggy board. The pink circle-and-cross is where EasyEDA-style DRC markers land." bg="eda">
        <ErrorGallery />
      </Figure>
      <ul>
        <li>
          <strong>Clearance:</strong> copper of two different nets is closer than the allowed gap. Etching may not separate
          them cleanly and solder can bridge them.
        </li>
        <li>
          <strong>Short circuit:</strong> copper actually touches between two nets. In the scene, a stray track joins C1
          (the THR net) to C3 (the CTRL net).
        </li>
        <li>
          <strong>Unrouted connection:</strong> the schematic says two pads belong together, but only an airwire joins them.
          Airwires are reminders, not copper.
        </li>
        <li>
          <strong>Track width:</strong> a track thinner than the minimum. It may be etched away (an open circuit) and it
          can’t carry much current.
        </li>
        <li>
          <strong>Board edge:</strong> copper too close to the outline, where the router that cuts the board out can nick it.
        </li>
        <li>
          <strong>Overlapping parts:</strong> two parts’ courtyards (the keep-out zone around each part) collide, so the real
          components wouldn’t fit.
        </li>
      </ul>

      <h2>Two kinds of DRC in EasyEDA</h2>
      <p>
        EasyEDA uses the name DRC in both editors, and they check different things. In the <strong>schematic</strong>,{' '}
        <Menu path={['Design', 'Check DRC']} /> checks the drawing: for example, a net connected to only one pin produces a
        “single-pin net” error. Other tools call this an ERC (electrical rule check), but EasyEDA calls it DRC. Run it before you
        convert the schematic to a PCB.
      </p>
      <p>
        In the <strong>PCB editor</strong>, the same menu item checks the physical board against your design rules. In both
        cases the results appear in the <strong>DRC tab of the bottom panel</strong>. If you only want some checks,{' '}
        <Menu path={['Design', 'Check DRC (Custom)']} /> lets you pick which ones run.
      </p>

      <h2>Design rules vs what the factory can do</h2>
      <p>
        Your <strong>design rules</strong> live in <Menu path={['Design', 'Design Rules']} />. Rules are named sets: the one
        called <em>Default</em> applies to every net that has no special rule. That’s where you set the minimum, default and
        maximum track width, the clearance between objects, via sizes and more. EasyEDA ships with its own starting values;
        read them in that dialog rather than assuming.
      </p>
      <p>
        A factory has its own limits, called its <strong>capabilities</strong>. Your rules should sit comfortably{' '}
        <em>inside</em> them, not right on the edge. Here are the conservative beginner values used in this course next to the
        current JLCPCB minimums for a standard 2-layer FR-4 board:
      </p>
      <table className="l14-table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Beginner value</th>
            <th>JLCPCB minimum</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Signal track width</td>
            <td>0.25 mm (power 0.5 mm)</td>
            <td>0.10 mm</td>
          </tr>
          <tr>
            <td>Clearance</td>
            <td>0.2 mm</td>
            <td>0.10 mm</td>
          </tr>
          <tr>
            <td>Copper to board edge</td>
            <td>0.3 mm (0.5 mm is safer)</td>
            <td>0.2 mm</td>
          </tr>
          <tr>
            <td>Via drill / diameter</td>
            <td>0.3 / 0.6 mm</td>
            <td>0.15 / 0.25 mm (small vias cost extra)</td>
          </tr>
        </tbody>
      </table>
      <Callout kind="fab" title="Numbers change, so check them">
        Factories update their capabilities over time, and blog posts often quote older figures. Before you order, look at
        your manufacturer’s current capabilities page. Staying well inside the limits also keeps you out of the price tiers
        for “advanced” features.
      </Callout>
      <p>
        One more thing the scene shows: <strong>DRC only knows the rules you give it.</strong> Tighten the minimum track width
        to 0.3 mm and every 0.25 mm signal track suddenly fails. Loosen the clearance to 0.1 mm and the clearance errors
        vanish. The board hasn’t changed, only the rules have. Never loosen a rule just to make an error go away.
      </p>

      <h2>Common errors and how to fix them</h2>
      <table className="l14-table">
        <thead>
          <tr>
            <th>Error</th>
            <th>Usual fix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Clearance</td>
            <td>Re-route the track further away, make it narrower, or move the part.</td>
          </tr>
          <tr>
            <td>Short circuit</td>
            <td>Find the piece of copper touching both nets (often a stray track or a track dragged over a pad) and delete it.</td>
          </tr>
          <tr>
            <td>Unrouted</td>
            <td>Route the airwire with a track. If it’s a ground pin, check that your pour really reaches it.</td>
          </tr>
          <tr>
            <td>Track width</td>
            <td>Select the track and set a wider width in the Property panel.</td>
          </tr>
          <tr>
            <td>Board edge</td>
            <td>Move the part or track inwards. Keep 0.3 mm or more.</td>
          </tr>
          <tr>
            <td>Overlap</td>
            <td>Move one part to free space. Courtyards are allowed to touch, not overlap.</td>
          </tr>
        </tbody>
      </table>
      <Compare
        left={<>Fix the copper, re-run DRC, repeat until the list is empty. One mistake (like the squeezed ground track) can cause several errors at once.</>}
        right={<>Loosen a rule until the errors disappear, or ignore an error because “it’s probably fine”. The factory works to its limits, not your hopes.</>}
      />

      <h2>Real-time DRC and the DFM check</h2>
      <p>
        You don’t have to wait until the end. EasyEDA can run <strong>real-time DRC</strong> while you route, flagging a
        problem as soon as you create it. Turn on <em>Real-time</em> in the scene’s DRC panel to feel the difference. It’s
        cheap insurance on a busy board.
      </p>
      <p>
        DRC checks <em>your</em> rules. A <strong>DFM check</strong> (design for manufacturing) checks the board against the
        factory’s knowledge of what is hard to build. In EasyEDA Pro, <Menu path={['Design', 'DFM Check']} /> opens JLCPCB’s
        DFM tool for that second opinion.
      </p>

      <h2>Always run DRC before ordering</h2>
      <p>
        Make it a habit: <strong>the last thing you do before exporting Gerbers is a clean DRC.</strong> EasyEDA’s one-click
        order also runs checks (unrouted ratlines, the board outline and DRC) before uploading, but don’t rely on that
        alone. A five-second check saves weeks of waiting for boards that can’t work.
      </p>
      <Steps
        items={[
          { title: 'Set the rules', body: 'Design › Design Rules. Beginner values are fine for boards like Blinky.' },
          { title: 'Run DRC', body: 'Design › Check DRC. Results appear in the DRC tab of the bottom panel.' },
          { title: 'Work through the list', body: 'Click an error to find it, fix it, and move on to the next.' },
          { title: 'Re-run until it’s empty', body: 'Fixes can create new errors. Only “0 errors” means done.' },
        ]}
      />
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Six mistakes are hiding on this Blinky board. Run Design › Check DRC, click each error to find it, then fix them all.',
  missions: [
    { id: 'run', text: 'Run Design › Check DRC to reveal the hidden mistakes' },
    { id: 'locate', text: 'Click an error in the DRC panel to zoom to it and see the culprit' },
    { id: 'fixall', text: 'Fix every error until DRC reports 0 errors (with the beginner rules or stricter)' },
    { id: 'rules', text: 'Change a design rule (try min track 0.3 mm) and re-check to see the results change' },
  ],
  Article,
  build: {
    intro: <>Check your own Blinky PCB the same way. Open the PCB document first.</>,
    steps: [
      {
        title: 'Set your design rules',
        menu: ['Design', 'Design Rules'],
        body: (
          <>
            Open the <b>Default</b> rule. Check the track width and clearance values. Beginner-safe numbers: tracks 0.25 mm
            (power 0.5 mm), clearance 0.2 mm, copper 0.3 mm from the edge.
          </>
        ),
      },
      {
        title: 'Run the check',
        menu: ['Design', 'Check DRC'],
        body: <>EasyEDA measures every track, pad and via against your rules.</>,
      },
      {
        title: 'Read the results',
        body: (
          <>
            Open the <b>DRC</b> tab in the bottom panel. Errors are grouped by type. Click an entry to locate it on the
            board.
          </>
        ),
      },
      {
        title: 'Fix, then re-run',
        body: (
          <>
            Delete stray tracks, widen thin ones, move crowded parts and route any remaining ratlines. Run{' '}
            <b>Design › Check DRC</b> again until it reports no errors.
          </>
        ),
      },
      {
        title: 'Optional: DFM check',
        menu: ['Design', 'DFM Check'],
        body: <>Opens JLCPCB’s DFM tool for a manufacturability second opinion.</>,
      },
    ],
    tip: <>EasyEDA Pro can also run DRC in real time while you route, so problems show up the moment you create them instead of at the end.</>,
  },
  quiz: [
    {
      q: 'DRC reports “Clearance 0.15 mm between a GND track and pad R3.1 (needs 0.2 mm)”. What is the best fix?',
      options: [
        'Lower the clearance rule to 0.15 mm',
        'Move or narrow the track so the gap is at least 0.2 mm',
        'Delete pad R3.1',
        'Ignore it: 0.05 mm is tiny',
      ],
      answer: 1,
      explain: 'Fix the copper, not the rule. Loosening a rule only hides the problem from DRC, not from the factory.',
    },
    {
      q: 'Which of these can PCB DRC NOT catch?',
      options: ['Two nets touching', 'A track that is too thin', 'R2 having the wrong resistance value', 'A pad too close to the board edge'],
      answer: 2,
      explain: 'DRC checks geometry and connectivity against rules. It has no idea whether 47 kΩ is the right value. That is a design decision.',
    },
    {
      q: 'JLCPCB can make 0.10 mm gaps. Why set your clearance rule to 0.2 mm?',
      options: [
        'EasyEDA won’t accept smaller numbers',
        'It leaves a safety margin, stays out of advanced price tiers and is easy to route on a simple board',
        'Smaller gaps are illegal',
        'It makes the board lighter',
      ],
      answer: 1,
      explain: 'Rules should sit comfortably inside the fab’s limits. Limits also change, so margin protects you.',
    },
    {
      q: 'You fixed every DRC error, then nudged a part to make room for a label. What should you do next?',
      options: ['Order the boards', 'Run DRC again', 'Export the BOM', 'Nothing, DRC already passed'],
      answer: 1,
      explain: 'Any change can create new errors. Re-run DRC (or use real-time DRC) after every edit, and always right before ordering.',
    },
  ],
  terms: [
    { term: 'DRC', def: 'Design rule check: an automatic check of the board against your rules for widths, gaps and connections.' },
    { term: 'Design rule', def: 'A limit you set, such as minimum track width or minimum clearance, that DRC enforces.' },
    { term: 'Clearance', def: 'The minimum gap between copper objects that belong to different nets.' },
    { term: 'Short circuit', def: 'Copper that joins two nets that should be separate.' },
    { term: 'Airwire', def: 'A thin line (ratline) showing a connection that still needs to be routed with copper.' },
    { term: 'Courtyard', def: 'The keep-out rectangle around a part. Courtyards must not overlap.' },
    { term: 'Capabilities', def: 'The smallest features a factory can reliably make. Your rules should stay well inside them.' },
    { term: 'DFM', def: 'Design for manufacturing: checking that a board is easy and reliable for a factory to build.' },
  ],
}

export default lesson
