/*
 * The course project: "Blinky" — a 555-timer LED blinker.
 * The same board is used across lessons (schematic → placement → routing → pour → DRC → gerbers → order)
 * and is what the learner builds in the capstone sandbox.
 *
 *   f ≈ 1.44 / ((R1 + 2·R2) · C1) = 1.44 / ((1k + 94k) · 10µF) ≈ 1.5 Hz
 */
import type { BoardDoc, PartInst, Track, Via, Pour, SilkText } from './board'

export interface ProjectPart {
  ref: string
  value: string
  fp: string
  /** what the part is, in plain English */
  role: string
}

export const parts: ProjectPart[] = [
  { ref: 'J1', value: 'Header 2-pin', fp: 'HDR-1x2', role: 'Power input: 5 V and ground come in here.' },
  { ref: 'U1', value: 'NE555', fp: 'SOIC-8', role: 'The 555 timer chip. It switches its output on and off to make the blink.' },
  { ref: 'R1', value: '1kΩ', fp: 'R0805', role: 'Timing resistor A: the timing capacitor charges through it.' },
  { ref: 'R2', value: '47kΩ', fp: 'R0805', role: 'Timing resistor B: sets how long the LED stays on and off.' },
  { ref: 'C1', value: '10µF', fp: 'C0805', role: 'Timing capacitor: it charges and discharges to set the blink rate.' },
  { ref: 'C2', value: '100nF', fp: 'C0805', role: 'Decoupling capacitor: a tiny local energy reservoir for the chip.' },
  { ref: 'C3', value: '10nF', fp: 'C0805', role: 'Keeps the 555 CONTROL pin quiet so the timing stays stable.' },
  { ref: 'R3', value: '330Ω', fp: 'R0805', role: 'Current-limiting resistor so the LED doesn’t burn out.' },
  { ref: 'D1', value: 'LED red', fp: 'LED0805', role: 'The LED that blinks.' },
]

/** "REF.pin" → net */
export const netlist: Record<string, string> = {
  'J1.1': 'VCC',
  'J1.2': 'GND',
  'U1.1': 'GND',
  'U1.2': 'THR',
  'U1.3': 'OUT',
  'U1.4': 'VCC',
  'U1.5': 'CTRL',
  'U1.6': 'THR',
  'U1.7': 'DIS',
  'U1.8': 'VCC',
  'R1.1': 'VCC',
  'R1.2': 'DIS',
  'R2.1': 'DIS',
  'R2.2': 'THR',
  'C1.1': 'THR',
  'C1.2': 'GND',
  'C2.1': 'VCC',
  'C2.2': 'GND',
  'C3.1': 'CTRL',
  'C3.2': 'GND',
  'R3.1': 'OUT',
  'R3.2': 'LED',
  'D1.1': 'GND',
  'D1.2': 'LED',
}

export const netInfo: Record<string, { color: string; about: string }> = {
  VCC: { color: '#e0542c', about: 'The +5 V supply rail.' },
  GND: { color: '#5b6b7a', about: 'Ground: the 0 V return path every current flows back through.' },
  THR: { color: '#2f8a5b', about: 'Threshold/trigger node: the timing capacitor voltage the 555 watches.' },
  DIS: { color: '#7a52c7', about: 'Discharge: the 555 empties the capacitor through this pin.' },
  OUT: { color: '#d99a1e', about: 'The 555 output: switches between 0 V and about 5 V.' },
  LED: { color: '#c7406a', about: 'Between the resistor and the LED.' },
  CTRL: { color: '#3767c9', about: 'Control voltage pin, filtered by C3.' },
}

export const BOARD_W = 30
export const BOARD_H = 26

/** Final, hand-tuned placement. */
export const placed: PartInst[] = [
  { ref: 'J1', fp: 'HDR-1x2', value: 'Header 2-pin', x: 4, y: 13, rot: 0, side: 'top' },
  { ref: 'U1', fp: 'SOIC-8', value: 'NE555', x: 18, y: 13, rot: 0, side: 'top' },
  { ref: 'C2', fp: 'C0805', value: '100nF', x: 18, y: 8, rot: 180, side: 'top' },
  { ref: 'R1', fp: 'R0805', value: '1kΩ', x: 25, y: 10.5, rot: 90, side: 'top' },
  { ref: 'R2', fp: 'R0805', value: '47kΩ', x: 25, y: 15, rot: 90, side: 'top' },
  { ref: 'C1', fp: 'C0805', value: '10µF', x: 23.2, y: 18.8, rot: 90, side: 'top' },
  { ref: 'C3', fp: 'C0805', value: '10nF', x: 20.7, y: 18, rot: 90, side: 'top' },
  { ref: 'R3', fp: 'R0805', value: '330Ω', x: 12, y: 17, rot: 90, side: 'top' },
  { ref: 'D1', fp: 'LED0805', value: 'LED red', x: 12, y: 21, rot: 270, side: 'top' },
]

/** Where parts land right after "Update/Convert Schematic to PCB": a row beside the board. */
export const unplaced: PartInst[] = [
  { ref: 'U1', fp: 'SOIC-8', value: 'NE555', x: 5, y: 34, rot: 0, side: 'top' },
  { ref: 'J1', fp: 'HDR-1x2', value: 'Header 2-pin', x: 12, y: 34, rot: 0, side: 'top' },
  { ref: 'R1', fp: 'R0805', value: '1kΩ', x: 17, y: 32.5, rot: 0, side: 'top' },
  { ref: 'R2', fp: 'R0805', value: '47kΩ', x: 22, y: 32.5, rot: 0, side: 'top' },
  { ref: 'R3', fp: 'R0805', value: '330Ω', x: 27, y: 32.5, rot: 0, side: 'top' },
  { ref: 'C1', fp: 'C0805', value: '10µF', x: 17, y: 36, rot: 0, side: 'top' },
  { ref: 'C2', fp: 'C0805', value: '100nF', x: 22, y: 36, rot: 0, side: 'top' },
  { ref: 'C3', fp: 'C0805', value: '10nF', x: 27, y: 36, rot: 0, side: 'top' },
  { ref: 'D1', fp: 'LED0805', value: 'LED red', x: 32, y: 34.2, rot: 0, side: 'top' },
]

const P = 0.5 // power track width
const S = 0.25 // signal track width

/** Reference routing (top layer + one bottom-layer jump for RESET). */
export const tracks: Track[] = [
  // VCC
  { id: 'vcc1', net: 'VCC', layer: 'top', width: P, pts: [[4, 11.73], [4, 7.2], [6.2, 5], [23.5, 5], [25, 6.5], [25, 9.55]] },
  { id: 'vcc2', net: 'VCC', layer: 'top', width: P, pts: [[18.95, 8], [18.95, 5]] },
  { id: 'vcc3', net: 'VCC', layer: 'top', width: P, pts: [[20.7, 11.095], [20.7, 9.75], [18.95, 8]] },
  { id: 'rst1', net: 'VCC', layer: 'top', width: S, pts: [[15.3, 14.905], [15.3, 16.6]] },
  { id: 'rst2', net: 'VCC', layer: 'bottom', width: S, pts: [[15.3, 16.6], [15.3, 5]] },
  // DIS
  { id: 'dis1', net: 'DIS', layer: 'top', width: S, pts: [[20.7, 12.365], [25, 12.365]] },
  { id: 'dis2', net: 'DIS', layer: 'top', width: S, pts: [[25, 11.45], [25, 14.05]] },
  // THR
  { id: 'thr1', net: 'THR', layer: 'top', width: S, pts: [[15.3, 12.365], [16.6, 12.365], [17.87, 13.635], [23.2, 13.635]] },
  { id: 'thr2', net: 'THR', layer: 'top', width: S, pts: [[23.2, 13.635], [23.2, 17.85]] },
  { id: 'thr3', net: 'THR', layer: 'top', width: S, pts: [[23.2, 15.95], [25, 15.95]] },
  // CTRL
  { id: 'ctl1', net: 'CTRL', layer: 'top', width: S, pts: [[20.7, 14.905], [20.7, 17.05]] },
  // OUT → R3 → LED
  { id: 'out1', net: 'OUT', layer: 'top', width: S, pts: [[15.3, 13.635], [13.6, 13.635], [12, 15.235], [12, 16.05]] },
  { id: 'led1', net: 'LED', layer: 'top', width: S, pts: [[12, 17.95], [12, 20.05]] },
  // GND
  { id: 'gnd1', net: 'GND', layer: 'top', width: P, pts: [[17.05, 8], [15.3, 9.75], [15.3, 11.095]] },
  { id: 'gnd2', net: 'GND', layer: 'top', width: P, pts: [[15.3, 11.095], [9.5, 11.095], [9.5, 23], [23.2, 23], [23.2, 19.75]] },
  { id: 'gnd3', net: 'GND', layer: 'top', width: P, pts: [[4, 14.27], [9.5, 14.27]] },
  { id: 'gnd4', net: 'GND', layer: 'top', width: P, pts: [[12, 21.95], [12, 23]] },
  { id: 'gnd5', net: 'GND', layer: 'top', width: P, pts: [[20.7, 18.95], [20.7, 23]] },
]

export const vias: Via[] = [
  { id: 'v1', x: 15.3, y: 16.6, d: 0.6, drill: 0.3 },
  { id: 'v2', x: 15.3, y: 5, d: 0.6, drill: 0.3 },
]

export const groundPours: Pour[] = [
  {
    id: 'pour-bot',
    net: 'GND',
    layer: 'bottom',
    clearance: 0.3,
    pts: [
      [0.5, 0.5],
      [BOARD_W - 0.5, 0.5],
      [BOARD_W - 0.5, BOARD_H - 0.5],
      [0.5, BOARD_H - 0.5],
    ],
  },
  {
    id: 'pour-top',
    net: 'GND',
    layer: 'top',
    clearance: 0.3,
    pts: [
      [0.5, 0.5],
      [BOARD_W - 0.5, 0.5],
      [BOARD_W - 0.5, BOARD_H - 0.5],
      [0.5, BOARD_H - 0.5],
    ],
  },
]

export const silkTexts: SilkText[] = [
  { id: 't-name', text: 'BLINKY', x: 27.6, y: 22.6, size: 1.6, layer: 'top', anchor: 'end' },
  { id: 't-ver', text: 'v1.0', x: 27.6, y: 24.4, size: 1.0, layer: 'top', anchor: 'end' },
  { id: 't-5v', text: '+5V', x: 5.6, y: 12.1, size: 1.0, layer: 'top', anchor: 'start' },
  { id: 't-gnd', text: 'GND', x: 5.6, y: 16.4, size: 1.0, layer: 'top', anchor: 'start' },
]

const base = { w: BOARD_W, h: BOARD_H, corner: 1.5, netlist }

/** Snapshots of the same board at different stages of the course. */
export const stages = {
  converted: (): BoardDoc => ({ ...base, parts: clone(unplaced), tracks: [], vias: [], pours: [], texts: [] }),
  placed: (): BoardDoc => ({ ...base, parts: clone(placed), tracks: [], vias: [], pours: [], texts: [] }),
  routed: (): BoardDoc => ({ ...base, parts: clone(placed), tracks: clone(tracks), vias: clone(vias), pours: [], texts: [] }),
  poured: (): BoardDoc => ({ ...base, parts: clone(placed), tracks: clone(tracks), vias: clone(vias), pours: clone(groundPours), texts: [] }),
  finished: (): BoardDoc => ({
    ...base,
    parts: clone(placed),
    tracks: clone(tracks),
    vias: clone(vias),
    pours: clone(groundPours),
    texts: clone(silkTexts),
  }),
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}
