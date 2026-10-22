/*
 * Every shortcut the sandbox understands. `pro` marks keys that docs/easyeda-reference.md verifies as
 * EasyEDA Pro defaults; `std` marks Standard Edition keys; everything else is a sandbox convenience.
 */
export interface Shortcut {
  keys: string[]
  action: string
  source: 'pro' | 'std' | 'sandbox'
  note?: string
}

export interface ShortcutGroup {
  title: string
  items: Shortcut[]
}

export const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Tools',
    items: [
      { keys: ['W'], action: 'Route track', source: 'pro', note: 'Hotkey page lists W; the Professional shortcut theme uses Alt+W' },
      { keys: ['V'], action: 'Place via', source: 'pro' },
      { keys: ['E'], action: 'Copper region (pour)', source: 'std', note: 'Pro has no default key: Place › Copper Region' },
      { keys: ['Alt+M'], action: 'Measure distance', source: 'pro', note: 'Default since v1.2.6 (one page says Ctrl+M)' },
      { keys: ['H'], action: 'Highlight the net under the cursor', source: 'pro' },
      { keys: ['Esc'], action: 'Finish the route, then back to Select', source: 'sandbox' },
    ],
  },
  {
    title: 'While routing',
    items: [
      { keys: ['Shift+W'], action: 'Cycle track width 0.25 / 0.5 / 1.0 mm', source: 'pro' },
      { keys: ['T', 'B'], action: 'Switch to top / bottom copper (adds a via mid-route)', source: 'pro', note: 'The PCB FAQ says Alt+T / Alt+B mid-route' },
      { keys: ['L'], action: 'Cycle routing corner (45°, 45° diagonal-first, 90°)', source: 'pro' },
      { keys: ['V'], action: 'Drop a via and carry on on the other layer', source: 'sandbox' },
      { keys: ['Backspace'], action: 'Remove the last corner', source: 'sandbox' },
      { keys: ['Double-click'], action: 'Finish the track here', source: 'sandbox' },
      { keys: ['Right-click'], action: 'Finish the route', source: 'sandbox' },
    ],
  },
  {
    title: 'Editing',
    items: [
      { keys: ['Space'], action: 'Rotate the selected part', source: 'pro' },
      { keys: ['Delete'], action: 'Delete selected tracks, vias and pours', source: 'pro' },
      { keys: ['Ctrl+Z'], action: 'Undo', source: 'pro' },
      { keys: ['Ctrl+Y'], action: 'Redo', source: 'pro' },
      { keys: ['Ctrl+S'], action: 'Save (here: into this browser)', source: 'pro' },
      { keys: ['Shift+Click'], action: 'Add to the selection', source: 'sandbox' },
    ],
  },
  {
    title: 'View',
    items: [
      { keys: ['K'], action: 'Fit all', source: 'pro' },
      { keys: ['Q'], action: 'Units mm ↔ mil', source: 'pro' },
      { keys: ['Shift+S'], action: 'Show the active layer only', source: 'pro' },
      { keys: ['Shift+M'], action: 'Show / hide copper pours', source: 'pro' },
      { keys: ['Shift+B'], action: 'Rebuild all copper', source: 'pro' },
      { keys: ['Shift+X'], action: 'Cross-probe: find the part in the schematic', source: 'pro' },
      { keys: ['?'], action: 'This help', source: 'sandbox' },
      { keys: ['Wheel'], action: 'Zoom', source: 'sandbox' },
      { keys: ['Right-drag'], action: 'Pan (or drag empty space, or two fingers)', source: 'sandbox' },
    ],
  },
]
