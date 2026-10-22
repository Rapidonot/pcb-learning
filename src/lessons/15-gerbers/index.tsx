import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Menu, Steps, Compare } from '@/components/content'
import { Scene, useGerbers } from './Scene'
import { LayerArt } from './LayerArt'
import { FILE_ORDER } from './gerber'
import './lesson15.css'

function FileTiles() {
  const { doc, files } = useGerbers()
  return (
    <div className="l15-fig-files">
      {FILE_ORDER.map((id) => {
        const f = files[id]
        return (
          <div key={id} className="l15-fig-tile">
            <svg viewBox={`-1.2 -1.2 ${doc.w + 2.4} ${doc.h + 2.4}`} width="100%" style={{ display: 'block' }} role="img" aria-label={f.name}>
              <rect x={0} y={0} width={doc.w} height={doc.h} rx={1.5} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={0.1} strokeDasharray="0.5 0.4" />
              <LayerArt f={f} uid="fig" w={doc.w} h={doc.h} />
            </svg>
            <div className="l15-fig-tile__cap">
              <b style={{ color: f.color === '#f2f2f2' ? '#ddd' : f.color }}>{id}</b>
              <span>{f.title}</span>
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
        A board factory never opens your EasyEDA project. What it receives is a small zip of <strong>Gerber files</strong>:
        plain-text drawings, one per layer, that tell its machines exactly where copper stays, where the mask opens, what gets
        printed and where to drill.
      </p>
      <p>
        The name comes from Gerber Scientific, whose photoplotters once drew circuit artwork onto film, one sheet per layer.
        The machines have changed, but the idea hasn’t: each layer of your board becomes its own flat picture, and the
        factory stacks them up again.
      </p>

      <Figure label="Fig 1" caption="The Blinky export, file by file. Each tile is drawn from the same data as the scene above. The empty GBO tile is not a mistake: Blinky prints nothing on its underside." bg="eda">
        <FileTiles />
      </Figure>

      <h2>One file per layer</h2>
      <p>
        EasyEDA names each file after its layer, and the <strong>extension tells the factory which layer it is</strong>. These
        are the ones you’ll see in a Blinky export:
      </p>
      <table>
        <thead>
          <tr>
            <th>Extension</th>
            <th>Layer</th>
            <th>What it describes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GTL / GBL</td>
            <td>Top / bottom copper</td>
            <td>Tracks, pads and pours that stay after etching.</td>
          </tr>
          <tr>
            <td>GTS / GBS</td>
            <td>Top / bottom solder mask</td>
            <td>Openings in the mask, mostly over pads.</td>
          </tr>
          <tr>
            <td>GTO / GBO</td>
            <td>Top / bottom silkscreen</td>
            <td>Printed outlines, designators and text.</td>
          </tr>
          <tr>
            <td>GTP / GBP</td>
            <td>Top / bottom paste</td>
            <td>Where solder paste goes. Needed for a stencil or machine assembly.</td>
          </tr>
          <tr>
            <td>GKO</td>
            <td>Board outline</td>
            <td>The cut line. Required. (Some tools call it GML or GM.)</td>
          </tr>
          <tr>
            <td>DRL</td>
            <td>Drill</td>
            <td>
              <code>Drill_PTH_Through.DRL</code> for plated holes, <code>Drill_NPTH_Through.DRL</code> for non-plated ones.
              Required.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Inside a Gerber file</h2>
      <p>
        Open a Gerber in a text editor and it looks cryptic, but it’s a simple language for an imaginary pen plotter. Modern
        files use the <strong>RS-274X</strong> (“extended Gerber”) format, which carries its own pen definitions inside the
        file. The older RS-274-D format needed a separate aperture file, and JLCPCB no longer accepts it.
      </p>
      <pre className="l15-snippet">{`%FSLAX46Y46*%            format: 4.6 digits, so X15300000 = 15.3 mm
%MOMM*%                  units: millimetres
%ADD20C,0.250*%          aperture D20: a round 0.25 mm pen
D20*                     pick up that pen
X15300000Y12365000D02*   D02: move there with the pen up
X13600000Y12365000D01*   D01: draw a line to here
%ADD23R,1.550X0.600*%    aperture D23: a 1.55 × 0.6 mm rectangle
X15300000Y11095000D03*   D03: "flash" (stamp) it once: a pad
M02*                     end of file`}</pre>
      <p>
        Tracks are lines drawn with a round <strong>aperture</strong> (the pen tip) as wide as the track. Pads are{' '}
        <strong>flashes</strong>: a pad-shaped aperture stamped once. Copper pours are filled regions (<code>G36</code> …{' '}
        <code>G37</code>), and the clearance gaps around other nets are cut out by switching to <em>clear</em> polarity (
        <code>%LPC*%</code>), which erases what was drawn before. In the scene, click any line of a file to see a plain-English
        explanation, or click a shape in the viewer to jump to its line. One detail: Gerber’s Y axis points <em>up</em> from the
        board’s bottom-left corner, so the numbers won’t match EasyEDA’s canvas coordinates exactly.
      </p>
      <Callout kind="info" title="Text is drawn with lines">
        Gerber has no fonts. Every letter of “BLINKY” on the silkscreen is exported as a handful of short strokes. That’s why
        silkscreen text needs a minimum line width (JLCPCB asks for at least 0.15 mm).
      </Callout>

      <h2>The drill file</h2>
      <p>
        Holes aren’t in the Gerbers at all. They live in an <strong>Excellon</strong> drill file, an even simpler format: a
        header lists the drill bits (<code>T01C0.300</code> means tool 1 is a 0.3 mm bit), then come the coordinates to drill
        with each one. Blinky needs just two sizes: 0.3 mm for its two vias and 1.0 mm for the header pins of J1. Plated holes
        (with copper walls) and non-plated holes go in separate files.
      </p>

      <h2>Masks are negatives</h2>
      <p>
        This trips up nearly everyone the first time. In a solder-mask file, <strong>the shapes are where the mask is
        removed</strong>, not where it goes. The GTS file of Blinky is just 24 small rectangles and circles: one opening
        for each pad on the top. Everything else will be covered in green. The scene draws the mask as a tinted film so you
        can see the openings for what they are.
      </p>
      <p>
        The <strong>paste</strong> file is similar but only covers surface-mount pads. It is used to laser-cut a stencil for
        spreading solder paste. You don’t need it for bare boards, but if you order assembly, the factory does.
      </p>

      <h2>Always look before you order</h2>
      <p>
        Your Gerbers are what gets built, not your EasyEDA canvas. A thirty-second look in a Gerber viewer catches a missing
        outline, a forgotten layer, or text on the wrong side. JLCPCB shows a viewer after you upload the zip. Use it every
        time:
      </p>
      <Compare
        leftLabel="Check"
        rightLabel="Watch out for"
        left={
          <>
            Every layer is present, the outline is one closed shape, the copper looks like your design, mask openings sit on the
            pads, and the silkscreen reads correctly.
          </>
        }
        right={
          <>
            Renamed files (the factory identifies layers by name), an empty copper layer, an outline with gaps, or text that
            ended up mirrored or on the bottom.
          </>
        }
      />

      <h2>Getting Gerbers out of EasyEDA</h2>
      <p>There are two routes, and both start with a clean DRC:</p>
      <Steps
        items={[
          {
            title: 'Export the zip yourself',
            body: (
              <>
                <Menu path={['Export', 'PCB Fabrication File (Gerber)']} /> produces the Gerber and drill files in one zip.
                Keep it as it is, upload it to the factory and check its viewer.
              </>
            ),
          },
          {
            title: 'Or send it straight to JLCPCB',
            body: (
              <>
                <Menu path={['Order', 'PCB Order']} /> runs checks, uploads the Gerbers (plus BOM and CPL) to JLCPCB and opens
                the order page. It doesn’t save a copy on your computer, so export one as well if you want a backup.
              </>
            ),
          },
        ]}
      />
      <Callout kind="tip" title="Keep a copy of what you ordered">
        Save the exact zip you uploaded next to your project, named with the date or version. When the boards arrive and
        something is odd, that zip, not your latest edits, is what was built.
      </Callout>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'This is Blinky exported as Gerbers. Toggle the layers, read the files line by line, and explode the stack.',
  missions: [
    { id: 'solo', text: 'Hide every layer except the top copper (GTL) to see the copper on its own' },
    { id: 'mask', text: 'Open the top solder mask (GTS) and click one of its shapes: each is an opening, not mask' },
    { id: 'drill', text: 'Open the drill file and click a tool or hole line to see what it drills' },
    { id: 'explode', text: 'Switch to the Stack view and explode the layers apart' },
  ],
  Article,
  build: {
    intro: <>Export Blinky’s fabrication files. Start from a board that passes DRC.</>,
    steps: [
      {
        title: 'Run a final DRC',
        menu: ['Design', 'Check DRC'],
        body: <>Don’t export until the DRC tab shows no errors.</>,
      },
      {
        title: 'Export the Gerbers',
        menu: ['Export', 'PCB Fabrication File (Gerber)'],
        body: <>EasyEDA builds a zip with every Gerber layer and the Excellon drill files.</>,
      },
      {
        title: 'Save the zip unchanged',
        body: (
          <>
            Don’t unzip and rename the files: the factory recognises each layer by its name (<code>Gerber_TopLayer.GTL</code>…).
            Upload the zip as it is.
          </>
        ),
      },
      {
        title: 'Inspect it in a Gerber viewer',
        body: <>After uploading, check the fab’s viewer: outline closed, copper as designed, mask openings on the pads, silkscreen readable.</>,
      },
      {
        title: 'Shortcut: order directly',
        menu: ['Order', 'PCB Order'],
        body: <>Uploads the files to JLCPCB for you. Export a copy too if you want a local backup.</>,
      },
    ],
    tip: <>Keep the exact zip you ordered next to your project. If a board comes back wrong, that file shows what was actually made.</>,
  },
  quiz: [
    {
      q: 'Which file tells the factory where to drill the holes?',
      options: ['Gerber_TopLayer.GTL', 'Gerber_BoardOutlineLayer.GKO', 'Drill_PTH_Through.DRL', 'Gerber_TopPasteMaskLayer.GTP'],
      answer: 2,
      explain: 'Holes live in Excellon drill files, not in the Gerbers. PTH means plated through-hole.',
    },
    {
      q: 'In the top solder mask file (GTS), what do the shapes represent?',
      options: ['Where green mask is applied', 'Openings where the mask is removed, usually over pads', 'Copper tracks', 'Silkscreen text'],
      answer: 1,
      explain: 'Mask layers are negatives: the drawn shapes are openings. Everything else gets covered.',
    },
    {
      q: 'In a Gerber file, what does D03 do?',
      options: ['Draws a line', 'Moves without drawing', 'Flashes (stamps) the current aperture once, for example to make a pad', 'Ends the file'],
      answer: 2,
      explain: 'D01 draws, D02 moves with the pen up, D03 flashes. M02 ends the file.',
    },
    {
      q: 'Why shouldn’t you rename the files inside the Gerber zip?',
      options: ['It breaks the zip', 'The factory identifies each layer by its file name and extension', 'File names set the board colour', 'It changes the price'],
      answer: 1,
      explain: 'GTL means top copper, GTS top mask, and so on. Renamed files may be read as the wrong layer, or not at all.',
    },
  ],
  terms: [
    { term: 'Gerber file', def: 'A plain-text drawing of one board layer, in the format factories use to make PCBs.' },
    { term: 'RS-274X', def: 'Extended Gerber: the current format, with aperture definitions inside each file.' },
    { term: 'Aperture', def: 'The “pen tip” a Gerber draws or flashes with: round, rectangular or obround.' },
    { term: 'Flash', def: 'Stamping an aperture once (D03), how pads are drawn.' },
    { term: 'Excellon', def: 'The drill file format: a list of drill sizes and hole coordinates.' },
    { term: 'Paste layer', def: 'Where solder paste goes; used to cut a stencil for assembly.' },
    { term: 'Board outline', def: 'The closed shape the board is cut along (GKO). Required.' },
    { term: 'Gerber viewer', def: 'A tool that draws Gerber files so you can check them before ordering.' },
  ],
}

export default lesson
