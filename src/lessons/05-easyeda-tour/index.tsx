import type { LessonContent } from '../types'
import { Callout } from '@/components/ui'
import { Figure, Menu, Specs, Steps } from '@/components/content'
import { Scene } from './Scene'
import './lesson05.css'

/* ------------------------------------------------------------------ */
/* Article figure: anatomy of the editor                               */
/* ------------------------------------------------------------------ */

function Anatomy() {
  const tag = (n: number, x: number, y: number) => (
    <g transform={`translate(${x} ${y})`}>
      <circle r="11" fill="#e0542c" stroke="#fff" strokeWidth="2.5" />
      <text y="4" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff" fontFamily="IBM Plex Mono, monospace">
        {n}
      </text>
    </g>
  )
  const legend = ['Top menu', 'Toolbar', 'Project panel', 'Canvas', 'Property / Layers', 'Library & DRC']
  return (
    <div className="l05-anatomy">
      <svg viewBox="0 0 640 390" width="100%" role="img" aria-label="The parts of the EasyEDA Pro editor">
        <defs>
          <linearGradient id="an-title" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3f4f6" />
            <stop offset="1" stopColor="#e3e6ea" />
          </linearGradient>
          <linearGradient id="an-tool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbfbfc" />
            <stop offset="1" stopColor="#eef0f3" />
          </linearGradient>
          <pattern id="an-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M12 0H0V12" fill="none" stroke="#e8e3d6" strokeWidth="0.7" />
          </pattern>
          <filter id="an-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#3a2a10" floodOpacity="0.25" />
          </filter>
        </defs>
        <g filter="url(#an-shadow)">
          <rect x="20" y="16" width="600" height="356" rx="12" fill="#f5f6f8" stroke="#c9ced6" />
        </g>
        <path d="M20 28a12 12 0 0 1 12-12h576a12 12 0 0 1 12 12v8H20z" fill="url(#an-title)" />
        {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
          <circle key={c} cx={36 + i * 14} cy={26} r={4.5} fill={c} />
        ))}
        {/* 1 menu */}
        <rect x="20" y="36" width="600" height="20" fill="#fff" stroke="#e1e4e8" />
        {['File', 'Edit', 'View', 'Place', 'Design', 'Tools', 'Export', 'Settings'].map((m, i) => (
          <text key={m} x={48 + i * 52} y={50} fontSize="10" fill="#3b4048" fontFamily="Inter Tight, sans-serif">
            {m}
          </text>
        ))}
        {/* 2 toolbar */}
        <rect x="20" y="56" width="600" height="22" fill="url(#an-tool)" stroke="#e1e4e8" />
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={i} x={30 + i * 22 + (i > 3 ? 8 : 0) + (i > 10 ? 8 : 0)} y={61} width="14" height="12" rx="3" fill={i === 5 ? '#d9e8fb' : '#e3e6ea'} />
        ))}
        {/* 3 left */}
        <rect x="20" y="78" width="120" height="208" fill="#fbfbfc" stroke="#e1e4e8" />
        {[['Blinky', 0], ['Board1', 10], ['Schematic1', 20], ['PCB1', 20]].map(([t, ind], i) => (
          <g key={i} transform={`translate(${30 + (ind as number)} ${100 + i * 19})`}>
            <rect width="9" height="9" rx="2" y="-8" fill={i === 3 ? '#1f6b47' : i === 2 ? '#fff' : '#cfd6df'} stroke={i === 2 ? '#8a1c1c' : 'none'} strokeWidth="0.8" />
            <text x="14" fontSize="9.5" fill="#2b2f36" fontFamily="Inter Tight, sans-serif" fontWeight={i === 0 ? 600 : 400}>
              {t}
            </text>
          </g>
        ))}
        {/* 4 canvas */}
        <rect x="140" y="78" width="356" height="208" fill="url(#an-grid)" />
        <rect x="140" y="78" width="356" height="208" fill="#fbfaf6" opacity="0.5" />
        <g stroke="#1f7a3f" strokeWidth="1.6" fill="none">
          <path d="M210 130H260V170M300 130H360M400 130H430V200H380" />
        </g>
        <rect x="260" y="150" width="40" height="50" fill="#fffbe6" stroke="#8a1c1c" strokeWidth="1.6" />
        <rect x="340" y="124" width="22" height="12" fill="none" stroke="#8a1c1c" strokeWidth="1.6" />
        <path d="M370 192l12 8-12 8z" fill="none" stroke="#8a1c1c" strokeWidth="1.6" />
        <text x="267" y="146" fontSize="8" fill="#1b4fbf" fontFamily="IBM Plex Mono, monospace" fontWeight="600">
          U1
        </text>
        {/* 5 right */}
        <rect x="496" y="78" width="124" height="208" fill="#fbfbfc" stroke="#e1e4e8" />
        {['Designator', 'Name', 'Footprint', 'Supplier'].map((t, i) => (
          <g key={t} transform={`translate(504 ${100 + i * 22})`}>
            <text fontSize="8.5" fill="#8b919c" fontFamily="Inter Tight, sans-serif">
              {t}
            </text>
            <rect x="52" y="-9" width="56" height="12" rx="2.5" fill="#f1f3f6" stroke="#e1e4e8" />
          </g>
        ))}
        {/* 6 bottom */}
        <rect x="20" y="286" width="600" height="72" fill="#fbfbfc" stroke="#e1e4e8" />
        <rect x="150" y="296" width="200" height="14" rx="4" fill="#fff" stroke="#c8ced7" />
        <text x="160" y="306" fontSize="8.5" fill="#2b2f36" fontFamily="IBM Plex Mono, monospace">
          NE555
        </text>
        {['System', 'Recent', 'Personal', 'Favorite'].map((t, i) => (
          <text key={t} x="30" y={302 + i * 14} fontSize="8.5" fill={i === 0 ? '#1f74d4' : '#5b6270'} fontFamily="Inter Tight, sans-serif" fontWeight={i === 0 ? 600 : 400}>
            {t}
          </text>
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={i} x="150" y={316 + i * 12} width="300" height="10" rx="2" fill={i === 0 ? '#1f74d4' : '#f3f5f8'} opacity={i === 0 ? 0.85 : 1} />
        ))}
        <path d="M20 358h600v2a12 12 0 0 1-12 12H32a12 12 0 0 1-12-12z" fill="#eceef1" />
        {tag(1, 600, 46)}
        {tag(2, 600, 67)}
        {tag(3, 124, 270)}
        {tag(4, 478, 268)}
        {tag(5, 604, 270)}
        {tag(6, 600, 342)}
      </svg>
      <div className="l05-anatomy__legend">
        {legend.map((l, i) => (
          <span key={l}>
            <b className="mono">{i + 1}</b> {l}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Article() {
  return (
    <>
      <p className="lead">
        EasyEDA is the design tool you'll use for the rest of this course. It runs in your web browser, its parts library is linked
        to a huge real-world parts catalogue, and when you're done it can send your board straight to a factory. This lesson is the
        map, so the editor never feels like a maze.
      </p>

      <h2>Pro or Standard? Browser or app?</h2>
      <p>
        EasyEDA comes in two editions. <strong>Standard</strong> is the older one and is in maintenance mode: it no longer gets new
        features, and EasyEDA recommends moving to Pro (it can even migrate old projects in bulk). <strong>Use EasyEDA Pro</strong>;
        everything in this course targets it.
      </p>
      <p>Both editions come as a web editor, with nothing to install, and as a desktop client for Windows, macOS and Linux. The Pro desktop client offers three ways to work:</p>
      <Specs
        items={[
          { k: 'Full online', v: 'Log in', note: 'Projects in the cloud, team collaboration' },
          { k: 'Half-offline', v: 'Recommended', note: 'No login, projects on your computer, online library still searchable' },
          { k: 'Full offline', v: 'No internet', note: 'No cloud system library, so no online part search' },
        ]}
      />
      <Callout kind="info" title="Desktop client">
        The Pro desktop client only runs on 64-bit systems. If yours can't run it, the web editor works the same way.
      </Callout>

      <h2>How a project is organised</h2>
      <p>
        Create one with <Menu path={['File', 'New', 'Project']} />. A new Pro project already contains three things: a{' '}
        <strong>board</strong>, a <strong>schematic</strong> and a <strong>PCB</strong>. The board is the folder that ties a schematic
        to its PCB. That pairing matters: the schematic and PCB must belong to the same board, or EasyEDA can't turn one into the
        other or keep them in sync. Should you ever need extra pages, <Menu path={['File', 'New', 'Schematic']} /> and{' '}
        <Menu path={['File', 'New', 'PCB']} /> add them.
      </p>

      <h2>The six areas of the editor</h2>
      <Figure label="Fig 1" caption="Every editor screen has the same layout. Learn these six areas once and you can find anything." bg="paper">
        <Anatomy />
      </Figure>
      <Steps
        items={[
          { title: 'Top menu', body: 'File, Edit, View, Place, Design, Export, Order, Settings. Every command lives in a menu, so a menu path always works, whatever your keyboard settings.' },
          { title: 'Toolbar', body: 'One-click buttons for the common tools. They differ between the schematic and PCB editors.' },
          { title: 'Project panel (left)', body: 'Your projects, plus the Common Library tab of everyday parts. Double-click a schematic or PCB to open it.' },
          { title: 'Canvas (middle)', body: 'Where you draw. Light for schematics, dark for PCBs. The mouse wheel zooms and K fits everything on screen.' },
          { title: 'Property panel (right)', body: 'Edits whatever is selected. Select several objects to edit them together. In the PCB editor, the Layers panel sits here too, with an eye icon per layer.' },
          { title: 'Bottom panel', body: 'The Library, with System, Recent, Personal and Favorite tabs (shortcut S), and the results of design checks.' },
        ]}
      />

      <h2>Finding parts: the library and LCSC</h2>
      <p>
        To place a part, use <Menu path={['Place', 'Device']} /> (or Shift+F). The search can use two engines.{' '}
        <strong>LCSC Electronics</strong> shows only parts that LCSC, a big component distributor, actually sells and that already
        have a symbol and a footprint. The <strong>EasyEDA</strong> engine also shows parts nobody is selling. Start with LCSC: if a
        part is there, you can buy it, and the factory can fit it for you later.
      </p>
      <p>
        Every LCSC part has a <strong>C-number</strong>, its catalogue number, such as C21190. It's stored with the part and later
        tells the factory exactly which part to fit. Filters help narrow a search: typing a size such as 0603 keeps only parts in
        that package. One catch: in full-offline mode there's no online library to search.
      </p>

      <h2>Keys worth knowing on day one</h2>
      <p>
        EasyEDA Pro has <strong>shortcut themes</strong>. Since version 1.9 you can pick a "Professional Edition" or a "Standard
        Edition" theme, and many keys differ between them. The wire tool, for example, is <b>Alt+W</b> in the Professional theme and{' '}
        <b>W</b> in the Standard theme. There's an Altium Designer theme too. Every shortcut can be looked up and remapped in{' '}
        <Menu path={['Settings', 'Shortcuts']} />, which is why this course always gives you the menu path first.
      </p>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Mouse wheel</td>
            <td>Zoom in and out (the old A and Z keys have no default binding since v1.8)</td>
          </tr>
          <tr>
            <td>K</td>
            <td>Fit everything on screen</td>
          </tr>
          <tr>
            <td>S</td>
            <td>Open the Library panel</td>
          </tr>
          <tr>
            <td>Q</td>
            <td>PCB editor: switch units between mm and mil (1 mil = 0.0254 mm)</td>
          </tr>
          <tr>
            <td>Shift+X</td>
            <td>Cross-probe: jump to the same part, pad or net in the other document</td>
          </tr>
          <tr>
            <td>Ctrl+Z / Ctrl+Y</td>
            <td>Undo / redo</td>
          </tr>
        </tbody>
      </table>
      <Callout kind="tip" title="Cross-probing is a superpower">
        Select R3 in the schematic and press Shift+X: EasyEDA jumps to R3 on the PCB. It works the other way too. When a board gets
        busy, it's the fastest way to answer "which one is that?". Its cousin, Place Transfer (Ctrl+Shift+X), highlights the
        selected schematic parts on the PCB so you can place them together.
      </Callout>
      <Callout kind="easyeda" title="Mil, not millimetre">
        Electronics still uses imperial units a lot. A <b>mil</b> is a thousandth of an inch, not a millimetre: 10 mil is about
        0.25 mm. If a number in the PCB editor looks forty times too big, press Q.
      </Callout>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Click around a mock of the EasyEDA Pro editor, take the guided tour, then test yourself with "Where is it?".',
  missions: [
    { id: 'regions', text: 'Visit all seven areas of the editor (explore or take the tour)' },
    { id: 'pcb', text: 'Open the PCB document from the project panel' },
    { id: 'layer', text: 'Hide a layer with an eye icon in the PCB Layers panel' },
    { id: 'challenge', text: 'Answer every "Where is it?" challenge' },
  ],
  Article,
  build: {
    intro: <>Open the Blinky project you created in "What is a PCB?" and get your bearings in the real editor.</>,
    steps: [
      {
        title: 'Open the schematic',
        body: <>In the left project panel, double-click the schematic inside your board. It opens on the light canvas.</>,
      },
      {
        title: 'Check your shortcut theme',
        menu: ['Settings', 'Shortcuts'],
        body: <>See whether you are on the Professional or Standard theme, and look up the Wire key. Change anything you like.</>,
      },
      {
        title: 'Search the library',
        keys: ['S'],
        body: <>Open the Library panel at the bottom and search for NE555. Click a result to preview its symbol and footprint.</>,
      },
      {
        title: 'Open the PCB and try the Layers panel',
        body: <>Double-click the PCB in the project panel. On the right, click the eye icons in the Layers panel, and press Q to switch between mm and mil.</>,
      },
      {
        title: 'Learn two navigation keys',
        keys: ['K', 'Shift+X'],
        body: <>K fits everything on screen. Once you have parts, select one and press Shift+X to jump to it in the other document.</>,
      },
    ],
    tip: <>Prefer to keep projects on your own computer? Use the desktop client in half-offline mode: no login needed, and you can still search the online library.</>,
  },
  quiz: [
    {
      q: 'Which edition of EasyEDA should you start new projects in?',
      options: ['Standard, because it is simpler', 'Pro, because Standard is in maintenance mode', 'Either; they get the same new features', 'Neither; use the desktop client'],
      answer: 1,
      explain: 'Standard no longer gets new features and EasyEDA recommends Pro. Both editions have a web editor and a desktop client.',
    },
    {
      q: 'What does a brand-new EasyEDA Pro project contain?',
      options: ['Nothing until you add pages', 'Only a schematic', 'A board, a schematic and a PCB', 'A PCB and a Gerber file'],
      answer: 2,
      explain: 'A new Pro project comes with a board that pairs a schematic with a PCB.',
    },
    {
      q: 'You press W and the wire tool does not start. What is the most likely reason?',
      options: ['Wires are only for PCBs', 'Your shortcut theme uses Alt+W for Wire', 'You need the desktop client', 'W only works in full-offline mode'],
      answer: 1,
      explain: 'In the Professional shortcut theme the wire tool is Alt+W. Check Settings › Shortcuts to see or change your keys.',
    },
    {
      q: 'What does Shift+X do?',
      options: ['Deletes the selected part', 'Cross-probes: jumps to the same item in the other document', 'Switches units between mm and mil', 'Opens the Library'],
      answer: 1,
      explain: 'Cross-probing links the schematic and PCB views of the same part, pad or net. Q switches units and S opens the Library.',
    },
  ],
  terms: [
    { term: 'EasyEDA Pro', def: 'The current edition of EasyEDA, available in the browser and as a desktop app.' },
    { term: 'Board (in EasyEDA)', def: 'The part of a project that pairs one schematic with one PCB so they stay in sync.' },
    { term: 'Property panel', def: 'The right-hand panel that shows and edits whatever is selected.' },
    { term: 'Library panel', def: 'The bottom panel for searching and placing parts, with System, Recent, Personal and Favorite tabs.' },
    { term: 'LCSC', def: 'A component distributor whose catalogue is built into EasyEDA’s part search.' },
    { term: 'Shortcut theme', def: 'A set of keyboard shortcuts, such as Professional or Standard. Many keys differ between themes.' },
    { term: 'Cross-probe', def: 'Jumping from an item in the schematic to the same item on the PCB, or back (Shift+X).' },
    { term: 'mil', def: 'A thousandth of an inch (0.0254 mm), a common unit in PCB design.' },
  ],
}

export default lesson
