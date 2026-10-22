/*
 * EasyEDA Pro cheat-sheet data. Every row comes from docs/easyeda-reference.md.
 * `note` flags anything that varies by shortcut theme or edition.
 */

export type Ctx = 'general' | 'schematic' | 'pcb'

export interface ShortcutRow {
  action: string
  keys?: string[]
  menu?: string[]
  ctx: Ctx[]
  note?: string
  group: string
}

export const shortcutRows: ShortcutRow[] = [
  // ---------- general ----------
  { group: 'Everyday', action: 'Undo / Redo', keys: ['Ctrl+Z', 'Ctrl+Y'], ctx: ['general'] },
  { group: 'Everyday', action: 'Save all', keys: ['Ctrl+S'], ctx: ['general'] },
  { group: 'Everyday', action: 'Find / replace', keys: ['Ctrl+F'], ctx: ['general'] },
  { group: 'Everyday', action: 'Delete selection', keys: ['Delete'], ctx: ['general'] },
  { group: 'Everyday', action: 'Rotate selection', keys: ['Space'], ctx: ['general'] },
  { group: 'Everyday', action: 'Mirror left/right · up/down', keys: ['X', 'Y'], ctx: ['general'] },
  { group: 'Everyday', action: 'Move by centre', keys: ['M'], ctx: ['general'] },
  { group: 'Everyday', action: 'Fit all in view', keys: ['K'], ctx: ['general'] },
  { group: 'Everyday', action: 'Zoom', ctx: ['general'], note: 'Mouse wheel. A/Z zoom keys have had no default binding since v1.8.' },
  { group: 'Everyday', action: 'Customise shortcuts', menu: ['Settings', 'Shortcuts'], ctx: ['general'], note: 'Also where you pick the shortcut theme (Professional, Standard or Altium).' },

  // ---------- schematic ----------
  { group: 'Schematic', action: 'Place a device (part)', keys: ['Shift+F'], menu: ['Place', 'Device'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Open the Library panel', keys: ['S'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Draw a wire', keys: ['W', 'Alt+W'], ctx: ['schematic'], note: 'W or Alt+W depending on your shortcut theme.' },
  { group: 'Schematic', action: 'Name the wire while drawing', keys: ['Tab'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Net label', keys: ['N'], ctx: ['schematic'], note: 'In Pro a net label sets the wire’s name.' },
  { group: 'Schematic', action: 'Power / ground flag', menu: ['Place', 'Net Flag'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Net port', menu: ['Place', 'Net Port'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'No-connect flag', menu: ['Place', 'No Connect'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Bus', keys: ['Alt+B'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Annotate designators', menu: ['Design', 'Annotate Designator'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Check the schematic', menu: ['Design', 'Check DRC'], ctx: ['schematic'], note: 'Results appear in the bottom panel.' },
  { group: 'Schematic', action: 'Convert / update the PCB', menu: ['Design', 'Update/Convert Schematic to PCB'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Cross-probe to PCB', keys: ['Shift+X'], ctx: ['schematic', 'pcb'] },
  { group: 'Schematic', action: 'Place transfer (highlight in PCB)', keys: ['Ctrl+Shift+X'], ctx: ['schematic'] },
  { group: 'Schematic', action: 'Export BOM', menu: ['Export', 'Bill of Materials (BOM)'], ctx: ['schematic', 'pcb'] },

  // ---------- pcb: layout ----------
  { group: 'PCB · Layout', action: 'Board outline', menu: ['Place', 'Board Outline'], ctx: ['pcb'] },
  { group: 'PCB · Layout', action: 'Import schematic changes', menu: ['Design', 'Import Changes from Schematic'], ctx: ['pcb'] },
  { group: 'PCB · Layout', action: 'Show / hide ratlines', menu: ['View', 'Ratline'], ctx: ['pcb'] },
  { group: 'PCB · Layout', action: 'Switch active layer: top · bottom', keys: ['T', 'B'], ctx: ['pcb'], note: '1–4 select inner layers on multilayer boards.' },
  { group: 'PCB · Layout', action: 'Highlight current layer only', keys: ['Shift+S'], ctx: ['pcb'] },
  { group: 'PCB · Layout', action: 'Highlight net', keys: ['H'], ctx: ['pcb'] },
  { group: 'PCB · Layout', action: 'Toggle mm / mil', keys: ['Q'], ctx: ['pcb'] },
  { group: 'PCB · Layout', action: 'Measure distance', keys: ['Alt+M'], ctx: ['pcb'], note: 'Some docs say Ctrl+M; check your theme.' },
  { group: 'PCB · Layout', action: 'Flip board view', keys: ['F'], ctx: ['pcb'], note: 'Look at the board from underneath.' },
  { group: 'PCB · Layout', action: 'Command box', keys: ['C'], ctx: ['pcb'] },

  // ---------- pcb: routing ----------
  { group: 'PCB · Routing', action: 'Route a track', keys: ['W', 'Alt+W'], ctx: ['pcb'], note: 'Depends on shortcut theme. Double-clicking a pad also starts routing.' },
  { group: 'PCB · Routing', action: 'Cycle track width while routing', keys: ['Shift+W'], ctx: ['pcb'] },
  { group: 'PCB · Routing', action: 'Change corner style (45° / 90° / arc)', keys: ['L'], ctx: ['pcb'] },
  { group: 'PCB · Routing', action: 'Place a via', keys: ['V'], ctx: ['pcb'] },
  { group: 'PCB · Routing', action: 'Cycle via size', keys: ['Shift+V'], ctx: ['pcb'] },
  { group: 'PCB · Routing', action: 'Default widths, clearances, via sizes', menu: ['Design', 'Design Rules'], ctx: ['pcb'] },

  // ---------- pcb: copper ----------
  { group: 'PCB · Copper', action: 'Copper region (pour)', menu: ['Place', 'Copper Region'], ctx: ['pcb'], note: 'Set its net (e.g. GND) in the Property panel.' },
  { group: 'PCB · Copper', action: 'Rebuild all copper', keys: ['Shift+B'], ctx: ['pcb'] },
  { group: 'PCB · Copper', action: 'Show / hide copper areas', keys: ['Shift+M'], ctx: ['pcb'] },

  // ---------- pcb: check & ship ----------
  { group: 'Check & ship', action: 'Design rule check', menu: ['Design', 'Check DRC'], ctx: ['pcb'] },
  { group: 'Check & ship', action: 'Manufacturability check', menu: ['Design', 'DFM Check'], ctx: ['pcb'] },
  { group: 'Check & ship', action: '3D preview', menu: ['View', '3D Preview'], ctx: ['pcb'] },
  { group: 'Check & ship', action: '2D photo preview', menu: ['View', '2D Preview'], ctx: ['pcb'] },
  { group: 'Check & ship', action: 'Export Gerbers', menu: ['Export', 'PCB Fabrication File (Gerber)'], ctx: ['pcb'] },
  { group: 'Check & ship', action: 'Export pick & place (CPL)', menu: ['Export', 'Pick and Place File'], ctx: ['pcb'] },
  { group: 'Check & ship', action: 'Order boards', menu: ['Order', 'PCB Order'], ctx: ['pcb'] },
]

/** Keys shown on the visual keyboard, with what they do per editor. */
export const keyMap: Record<string, { schematic?: string; pcb?: string; both?: string }> = {
  W: { schematic: 'Wire (theme-dependent)', pcb: 'Route track (theme-dependent)' },
  N: { schematic: 'Net label' },
  S: { schematic: 'Library panel' },
  T: { pcb: 'Top layer' },
  B: { pcb: 'Bottom layer' },
  V: { pcb: 'Via' },
  L: { pcb: 'Corner style while routing' },
  H: { pcb: 'Highlight net' },
  Q: { pcb: 'mm ↔ mil' },
  F: { pcb: 'Flip board view' },
  C: { pcb: 'Command box' },
  K: { both: 'Fit all' },
  M: { both: 'Move by centre' },
  X: { both: 'Mirror left/right' },
  Y: { both: 'Mirror up/down' },
  Space: { both: 'Rotate' },
  Tab: { schematic: 'Name wire while drawing' },
  Delete: { both: 'Delete' },
  Shift: { both: 'Shift+F place device · Shift+W width · Shift+V via size · Shift+B rebuild copper · Shift+M copper areas · Shift+S layer highlight · Shift+X cross-probe' },
  Ctrl: { both: 'Ctrl+Z undo · Ctrl+Y redo · Ctrl+S save · Ctrl+F find · Ctrl+Shift+X place transfer' },
  Alt: { both: 'Alt+W wire/route (Pro theme) · Alt+B bus · Alt+M measure' },
  '1': { pcb: 'Inner layer 1' },
  '2': { pcb: 'Inner layer 2' },
  '3': { pcb: 'Inner layer 3' },
  '4': { pcb: 'Inner layer 4' },
}
