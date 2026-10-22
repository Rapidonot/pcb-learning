/* Content for the EasyEDA tour. Every EasyEDA fact here is backed by docs/easyeda-reference.md. */

export type RegionId = 'menu' | 'toolbar' | 'project' | 'canvas' | 'property' | 'layers' | 'bottom'
export type DocKind = 'sch' | 'pcb'
export type ShortcutTheme = 'pro' | 'std'

export interface RegionInfo {
  id: RegionId
  name: string
  short: string
  body: string
  tip?: string
}

export const REGIONS: RegionInfo[] = [
  {
    id: 'menu',
    name: 'Top menu',
    short: 'Menu',
    body: 'Every command lives up here: File, Edit, View, Place, Design, Export, Order, Settings. Menu paths never change with your shortcut theme, so they are the most reliable way to find things.',
    tip: 'Settings › Shortcuts lists every key, and lets you change them.',
  },
  {
    id: 'toolbar',
    name: 'Toolbar',
    short: 'Toolbar',
    body: 'One-click buttons for the tools you use most. The buttons differ between the schematic and PCB editors, and can move between versions, so hover a button to see its name.',
  },
  {
    id: 'project',
    name: 'Project panel',
    short: 'Project',
    body: 'Your projects live on the left. A Pro project holds a board, and a board pairs one schematic with one PCB. Double-click a document to open it. The Common Library tab holds ready-made everyday parts.',
    tip: 'The schematic and PCB must belong to the same board, or converting and updating will not work.',
  },
  {
    id: 'canvas',
    name: 'Canvas',
    short: 'Canvas',
    body: 'Where you actually draw. The schematic canvas is light; the PCB canvas is dark, with red top copper, blue bottom copper and yellow silkscreen. The mouse wheel zooms, and K fits everything on screen.',
    tip: 'Try it: click a part, then press Shift+X to jump to the same part in the other document.',
  },
  {
    id: 'property',
    name: 'Property panel',
    short: 'Property',
    body: 'Shows whatever you have selected: designator, value, footprint, supplier and part numbers. Change a value here and the canvas updates. Select several objects to edit them all at once.',
  },
  {
    id: 'layers',
    name: 'Layers panel',
    short: 'Layers',
    body: 'PCB only. Each copper, silkscreen and outline layer has an eye icon to show or hide it. Click a layer to make it the active one you draw on; T and B jump to the top and bottom copper.',
  },
  {
    id: 'bottom',
    name: 'Bottom panel',
    short: 'Library',
    body: 'The Library lives here, with System, Recent, Personal and Favorite tabs. Open it with S or by clicking it. Design checks (DRC) also report their results down here.',
  },
]
export const regionById = (id: RegionId) => REGIONS.find((r) => r.id === id)!
export const TOUR: RegionId[] = ['menu', 'toolbar', 'project', 'canvas', 'property', 'layers', 'bottom']

export interface Challenge {
  q: string
  answer: RegionId
  why: string
  needsPcb?: boolean
}

export const CHALLENGES: Challenge[] = [
  { q: "Where do you change a resistor's value?", answer: 'property', why: 'Select the part, then edit its value in the Property panel on the right.' },
  { q: 'Where would you search for an NE555 to place it?', answer: 'bottom', why: 'The Library panel at the bottom (shortcut S) searches the parts library.' },
  { q: 'Where do you open the PCB document?', answer: 'project', why: 'Double-click it in the project tree on the left.' },
  { q: 'Where do you hide the bottom copper layer?', answer: 'layers', why: 'Click its eye icon in the Layers panel. That panel only exists in the PCB editor.', needsPcb: true },
  { q: 'Where would you find Check DRC?', answer: 'menu', why: 'In the top menu: Design › Check DRC. The results then appear in the bottom panel.' },
  { q: 'Where do you draw wires and move parts around?', answer: 'canvas', why: 'On the canvas, the big drawing area in the middle.' },
]

export interface MenuItem {
  label: string
  keys?: string
  sub?: string[]
  action?: 'drc' | 'shortcuts' | 'convert' | 'library' | 'import'
}

/** Menus per editor. Only verified menu paths and shortcuts. */
export function menus(doc: DocKind, theme: ShortcutTheme): Record<string, MenuItem[]> {
  const common = {
    File: [{ label: 'New', sub: ['Project', 'Schematic', 'PCB'] }],
    Edit: [
      { label: 'Undo', keys: 'Ctrl+Z' },
      { label: 'Redo', keys: 'Ctrl+Y' },
    ],
  }
  if (doc === 'sch')
    return {
      ...common,
      View: [{ label: 'Grid' }],
      Place: [
        { label: 'Device', keys: 'Shift+F', action: 'library' },
        { label: 'Wire', keys: theme === 'pro' ? 'Alt+W' : 'W' },
        { label: 'Net Label', keys: 'N' },
        { label: 'Net Flag', sub: ['Power', 'Ground', 'Analog Ground', 'Protect Ground'] },
        { label: 'Net Port' },
        { label: 'Bus', keys: 'Alt+B' },
        { label: 'No Connect' },
      ],
      Design: [
        { label: 'Annotate Designator' },
        { label: 'Check DRC', action: 'drc' },
        { label: 'Update/Convert Schematic to PCB', action: 'convert' },
      ],
      Tools: [{ label: 'Footprint Manager' }],
      Export: [{ label: 'Bill of Materials (BOM)' }],
      Settings: [{ label: 'Shortcuts', action: 'shortcuts' }],
    }
  return {
    ...common,
    View: [{ label: '3D Preview' }, { label: '2D Preview' }, { label: 'Grid' }, { label: 'Ratline' }],
    Place: [{ label: 'Board Outline' }, { label: 'Copper Region' }],
    Route: [{ label: 'Routing Corner', keys: 'L' }],
    Design: [
      { label: 'Design Rules' },
      { label: 'Check DRC', action: 'drc' },
      { label: 'Import Changes from Schematic', action: 'import' },
      { label: 'DFM Check' },
    ],
    Tools: [{ label: 'Layer Manager' }, { label: 'Footprint Manager' }],
    Export: [{ label: 'PCB Fabrication File (Gerber)' }, { label: 'Bill of Materials (BOM)' }, { label: 'Pick and Place File' }],
    Order: [{ label: 'PCB Order' }],
    Settings: [{ label: 'Shortcuts', action: 'shortcuts' }],
  }
}

/** Library search results for the demo. Illustrative only: real results, stock and part numbers differ. */
export interface LibPart {
  name: string
  pkg: string
  fp: string
  sym: 'NE555' | 'R' | 'C' | 'LED'
  desc: string
}
export const LIBRARY: LibPart[] = [
  { name: 'NE555DR', pkg: 'SOIC-8', fp: 'SOIC-8', sym: 'NE555', desc: '555 timer, surface-mount SOIC-8' },
  { name: 'NE555P', pkg: 'DIP-8', fp: 'DIP-8', sym: 'NE555', desc: '555 timer, through-hole DIP-8' },
  { name: 'NE555DT', pkg: 'SOIC-8', fp: 'SOIC-8', sym: 'NE555', desc: '555 timer, SOIC-8 (another maker)' },
  { name: '1kΩ ±1% 0805', pkg: '0805', fp: 'R0805', sym: 'R', desc: 'Chip resistor, 1 kΩ' },
  { name: '47kΩ ±1% 0805', pkg: '0805', fp: 'R0805', sym: 'R', desc: 'Chip resistor, 47 kΩ' },
  { name: '330Ω ±1% 0805', pkg: '0805', fp: 'R0805', sym: 'R', desc: 'Chip resistor, 330 Ω' },
  { name: '10µF 0805', pkg: '0805', fp: 'C0805', sym: 'C', desc: 'Ceramic capacitor, 10 µF' },
  { name: '100nF 0805', pkg: '0805', fp: 'C0805', sym: 'C', desc: 'Ceramic capacitor, 100 nF' },
  { name: 'Red LED 0805', pkg: '0805', fp: 'LED0805', sym: 'LED', desc: 'Red chip LED' },
]

export function searchLibrary(q: string): LibPart[] {
  const s = q.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!s) return []
  if (s.includes('555')) return LIBRARY.filter((p) => p.sym === 'NE555')
  const words = s.split(' ')
  return LIBRARY.filter((p) => {
    const hay = `${p.name} ${p.pkg} ${p.desc}`.toLowerCase().replace(/ω/g, 'ohm')
    return words.every((w) => hay.includes(w.replace(/ω/g, 'ohm')) || (w === 'resistor' && p.sym === 'R') || (w === 'capacitor' && p.sym === 'C') || (w === 'led' && p.sym === 'LED'))
  })
}
