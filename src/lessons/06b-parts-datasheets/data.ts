/* Data for the "Choosing parts & reading datasheets" lesson: datasheet sections, pins and mock search results. */
import { getFootprint, type FootprintDef } from '@/pcb/footprints'

/* ------------------------------------------------------------------ */
/* Datasheet sections (hotspots)                                       */
/* ------------------------------------------------------------------ */

export type SectionId = 'title' | 'features' | 'pinout' | 'absmax' | 'recommended' | 'electrical' | 'application' | 'package' | 'land'

export interface Section {
  id: SectionId
  n: number
  name: string
  short: string
  /** plain-English explanation shown in the margin note */
  about: string
  /** why it matters for Blinky */
  blinky?: string
}

export const SECTIONS: Section[] = [
  {
    id: 'title',
    n: 1,
    name: 'Title block',
    short: 'Title',
    about:
      'The part number, a one-line description and the revision. Always check you are reading the datasheet for the exact part you will buy, because a similar-looking number can be a different chip.',
    blinky: 'Blinky uses a 555 timer, so this is the right family.',
  },
  {
    id: 'features',
    n: 2,
    name: 'Features & description',
    short: 'Features',
    about:
      'The sales pitch: the headline numbers in a few bullet points. Great for a first yes/no ("does it run from 5 V? does it come in a package I can solder?"), but always confirm the details in the tables further down.',
    blinky: 'Runs from 5 V and comes in SOIC-8: a good start.',
  },
  {
    id: 'pinout',
    n: 3,
    name: 'Pin configuration',
    short: 'Pinout',
    about:
      'A drawing of the package seen from the top, with every pin numbered and named, plus a table saying what each pin does. Pin 1 is marked with a dot or notch, and the numbers run anticlockwise from there.',
    blinky: 'You will wire these exact pins in the schematic. Click a pin to learn what it does.',
  },
  {
    id: 'absmax',
    n: 4,
    name: 'Absolute maximum ratings',
    short: 'Abs max',
    about:
      'The survival limits. Exceed any one of them, even for a moment, and the chip may be damaged for good. These are not values to design for: they are a cliff edge to stay well away from.',
    blinky: 'Blinky runs at 5 V, far below the 18 V limit. Plenty of safety margin.',
  },
  {
    id: 'recommended',
    n: 5,
    name: 'Recommended operating conditions',
    short: 'Operating',
    about:
      'The range where the chip is designed to work and where the other numbers in the datasheet are guaranteed. Design your circuit to sit comfortably inside these values.',
    blinky: '5 V sits right at the bottom of the 5 V to 15 V window, which is fine: it is inside the range.',
  },
  {
    id: 'electrical',
    n: 6,
    name: 'Electrical characteristics',
    short: 'Electrical',
    about:
      'The measured behaviour under stated test conditions (here VCC = 5 V). "Typ" is what most parts do; "max" is the worst case the maker guarantees. Design with the max values when it matters.',
    blinky: 'The chip itself needs only a few milliamps, so a USB supply is plenty.',
  },
  {
    id: 'application',
    n: 7,
    name: 'Typical application',
    short: 'Application',
    about:
      'A ready-made circuit from the people who designed the chip. It is often the best starting point for your own schematic, and it shows which support parts (like decoupling capacitors) the chip needs.',
    blinky: 'This is Blinky! R1, R2 and C1 set the blink rate; R3 limits the LED current.',
  },
  {
    id: 'package',
    n: 8,
    name: 'Package outline',
    short: 'Package',
    about:
      'The mechanical drawing of the physical part: body size, lead spacing (pitch) and height. Use it to check that the part fits and that the footprint you pick is for this exact package.',
    blinky: 'SOIC-8: a 4.9 × 3.9 mm body with leads every 1.27 mm. Hand-solderable with a fine tip.',
  },
  {
    id: 'land',
    n: 9,
    name: 'Recommended land pattern',
    short: 'Land pattern',
    about:
      'The copper pads the maker suggests for your board: their size, spacing and position. Your PCB footprint should match it. This is what the footprint check in step 3 compares against.',
    blinky: 'Pads 1.55 × 0.60 mm, rows 5.40 mm apart, 1.27 mm pitch.',
  },
]

export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!

/* ------------------------------------------------------------------ */
/* Pins                                                                */
/* ------------------------------------------------------------------ */

export interface PinInfo {
  num: number
  name: string
  type: 'Power' | 'Input' | 'Output' | 'I/O'
  desc: string
}

export const PINS: PinInfo[] = [
  { num: 1, name: 'GND', type: 'Power', desc: 'Ground, 0 V. Every current returns here.' },
  { num: 2, name: 'TRIG', type: 'Input', desc: 'Trigger. When it falls below 1/3 of VCC, the output switches high and a new timing cycle starts.' },
  { num: 3, name: 'OUT', type: 'Output', desc: 'Output. Swings between about 0 V and close to VCC. In Blinky it drives the LED through R3.' },
  { num: 4, name: 'RESET', type: 'Input', desc: 'Reset, active low. Pull it to 0 V to stop the timer. Tie it to VCC when you do not use it (Blinky does).' },
  { num: 5, name: 'CONT', type: 'I/O', desc: 'Control voltage. Gives access to the internal 2/3 VCC reference. Usually just a 10 nF capacitor to ground to keep it quiet (C3 in Blinky).' },
  { num: 6, name: 'THRES', type: 'Input', desc: 'Threshold. When it rises above 2/3 of VCC, the output switches low and the discharge pin turns on.' },
  { num: 7, name: 'DISCH', type: 'Output', desc: 'Discharge. An internal switch to ground that empties the timing capacitor (through R2 in Blinky).' },
  { num: 8, name: 'VCC', type: 'Power', desc: 'Positive supply. This is where the +5 V goes, with a 100 nF decoupling capacitor right next to it (C2).' },
]

/* ------------------------------------------------------------------ */
/* Mock device search                                                  */
/* ------------------------------------------------------------------ */

/** A fine-pitch 8-pin package, only used for one of the search results. */
export const VSSOP8: FootprintDef = {
  id: 'VSSOP-8',
  name: 'VSSOP-8_3.0x3.0mm_P0.65mm',
  pkg: 'VSSOP-8',
  mount: 'smd',
  pads: [
    { num: '1', x: -2.2, y: -0.975, w: 1.45, h: 0.42, shape: 'roundrect' },
    { num: '2', x: -2.2, y: -0.325, w: 1.45, h: 0.42, shape: 'roundrect' },
    { num: '3', x: -2.2, y: 0.325, w: 1.45, h: 0.42, shape: 'roundrect' },
    { num: '4', x: -2.2, y: 0.975, w: 1.45, h: 0.42, shape: 'roundrect' },
    { num: '5', x: 2.2, y: 0.975, w: 1.45, h: 0.42, shape: 'roundrect' },
    { num: '6', x: 2.2, y: 0.325, w: 1.45, h: 0.42, shape: 'roundrect' },
    { num: '7', x: 2.2, y: -0.325, w: 1.45, h: 0.42, shape: 'roundrect' },
    { num: '8', x: 2.2, y: -0.975, w: 1.45, h: 0.42, shape: 'roundrect' },
  ],
  body: { w: 3.0, h: 3.0, height: 1.1, kind: 'soic' },
  courtyard: { w: 3.1, h: 1.75 },
  silk: [
    [-1.4, -1.65, 1.4, -1.65],
    [-1.4, 1.65, 1.4, 1.65],
  ],
  pin1: [-3.2, -1.55],
}

export type Engine = 'lcsc' | 'easyeda'
export type Verdict = 'right' | 'wrong-fp' | 'extended' | 'wrong-volt' | 'no-supplier'

export interface Candidate {
  id: string
  title: string
  desc: string
  pkg: string
  fp: FootprintDef
  mount: 'SMD' | 'Through-hole'
  pitch: number
  supply: string
  /** for checking against Blinky's 5 V */
  vmin: number
  vmax: number
  cls: 'Basic' | 'Extended' | null
  stock: 'high' | 'low' | null
  supplier: boolean
  engines: Engine[]
  verdict: Verdict
  feedback: string
  /** text on the 3D model */
  marking: string
}

export const CANDIDATES: Candidate[] = [
  {
    id: 'ne555-soic',
    title: 'NE555',
    desc: 'Single bipolar timer',
    pkg: 'SOIC-8',
    fp: getFootprint('SOIC-8'),
    mount: 'SMD',
    pitch: 1.27,
    supply: '5 V – 15 V',
    vmin: 5,
    vmax: 15,
    cls: 'Basic',
    stock: 'high',
    supplier: true,
    engines: ['lcsc', 'easyeda'],
    verdict: 'right',
    feedback:
      'Spot on. It runs at 5 V, comes in SOIC-8 (the footprint Blinky is designed around), has a supplier number for the BOM, and is a Basic part, so assembly is cheaper.',
    marking: 'NE555',
  },
  {
    id: 'ne555-dip',
    title: 'NE555',
    desc: 'Single bipolar timer',
    pkg: 'DIP-8',
    fp: getFootprint('DIP-8'),
    mount: 'Through-hole',
    pitch: 2.54,
    supply: '5 V – 15 V',
    vmin: 5,
    vmax: 15,
    cls: 'Extended',
    stock: 'high',
    supplier: true,
    engines: ['lcsc', 'easyeda'],
    verdict: 'wrong-fp',
    feedback:
      'Same chip, different package. DIP-8 is through-hole with legs 2.54 mm apart, but Blinky is designed for the smaller surface-mount SOIC-8. The legs would not land on the pads.',
    marking: 'NE555P',
  },
  {
    id: 'cmos-soic',
    title: 'CMOS 555',
    desc: 'Low-power CMOS timer',
    pkg: 'SOIC-8',
    fp: getFootprint('SOIC-8'),
    mount: 'SMD',
    pitch: 1.27,
    supply: '2 V – 15 V',
    vmin: 2,
    vmax: 15,
    cls: 'Extended',
    stock: 'low',
    supplier: true,
    engines: ['lcsc', 'easyeda'],
    verdict: 'extended',
    feedback:
      'This would work at 5 V and it fits the SOIC-8 pads. But it is an Extended part with low stock, so assembly costs more and it may sell out. The Basic NE555 is the better pick here.',
    marking: 'CMOS555',
  },
  {
    id: 'lv-vssop',
    title: 'LV timer',
    desc: 'Low-voltage CMOS timer',
    pkg: 'VSSOP-8',
    fp: VSSOP8,
    mount: 'SMD',
    pitch: 0.65,
    supply: '1.5 V – 3.6 V',
    vmin: 1.5,
    vmax: 3.6,
    cls: 'Extended',
    stock: 'high',
    supplier: true,
    engines: ['lcsc', 'easyeda'],
    verdict: 'wrong-volt',
    feedback:
      'Check its supply range: 3.6 V maximum. Blinky runs at 5 V, which would push it past its absolute maximum rating and destroy it. The 0.65 mm pitch is also hard to hand-solder.',
    marking: 'LV555',
  },
  {
    id: 'ne555-user',
    title: 'NE555 (user part)',
    desc: 'Shared by a community member',
    pkg: 'SOIC-8',
    fp: getFootprint('SOIC-8'),
    mount: 'SMD',
    pitch: 1.27,
    supply: '5 V – 15 V',
    vmin: 5,
    vmax: 15,
    cls: null,
    stock: null,
    supplier: false,
    engines: ['easyeda'],
    verdict: 'no-supplier',
    feedback:
      'This one comes from the EasyEDA search engine and has no LCSC supplier number. The BOM could not tell a shop or an assembly service exactly which part to use. Prefer parts with a C-number.',
    marking: 'NE555',
  },
]

export const RIGHT_ID = 'ne555-soic'

/* Land pattern from the teaching datasheet (SOIC-8) */
export const LAND = { padW: 1.55, padH: 0.6, rowC: 5.4, pitch: 1.27, pins: 8 }
