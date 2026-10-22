/* What lesson 3 knows about each part in the tray. */

export type PartId =
  | 'res-tht'
  | 'res-smd'
  | 'cap-cer'
  | 'cap-elec'
  | 'led'
  | 'diode'
  | 'ic-dip'
  | 'ic-soic'
  | 'transistor'
  | 'header'
  | 'button'

export type SymId = 'R' | 'C' | 'Cpol' | 'LED' | 'D' | 'IC' | 'NPN' | 'HDR' | 'SW'

export interface PartInfo {
  id: PartId
  name: string
  variant: string
  mount: 'THT' | 'SMD'
  letter: string
  kind: 'Passive' | 'Active' | 'Electromechanical'
  sym: SymId
  what: string
  values: string
  /** polarity / pin-1 explanation */
  polarity: string | null
  /** true when getting it backwards matters (polarised or pin-1 sensitive) */
  polar: boolean
  /** Blinky references that use this kind of part */
  blinky: string[]
  blinkyNote?: string
  /** magnified in the tray */
  zoom?: string
}

export const PARTS: PartInfo[] = [
  {
    id: 'res-tht',
    name: 'Resistor',
    variant: 'Through-hole, axial',
    mount: 'THT',
    letter: 'R',
    kind: 'Passive',
    sym: 'R',
    what: 'Resists the flow of current. It sets how much current flows (like a narrow section of pipe) and can split a voltage into smaller pieces.',
    values: 'Ohms (Ω): from under 1 Ω to 10 MΩ. Common: 220 Ω, 1 kΩ, 10 kΩ. k = thousand, M = million. The value is printed as coloured bands.',
    polarity: 'No polarity. It works either way round.',
    polar: false,
    blinky: ['R1', 'R2', 'R3'],
    blinkyNote: 'Blinky uses the surface-mount (0805) version of the same part.',
  },
  {
    id: 'res-smd',
    name: 'Resistor',
    variant: 'Surface-mount chip, 0805',
    mount: 'SMD',
    letter: 'R',
    kind: 'Passive',
    sym: 'R',
    what: 'Exactly the same job as the through-hole resistor, in a tiny block that is soldered flat onto pads. The black top is the resistive layer.',
    values: 'Same ohm values. Most chip resistors carry a 3-digit code: “331” means 33 × 10¹ = 330 Ω.',
    polarity: 'No polarity. It works either way round.',
    polar: false,
    blinky: ['R1', 'R2', 'R3'],
    zoom: '×6',
  },
  {
    id: 'cap-cer',
    name: 'Ceramic capacitor',
    variant: 'Surface-mount MLCC, 0805',
    mount: 'SMD',
    letter: 'C',
    kind: 'Passive',
    sym: 'C',
    what: 'Stores a small amount of charge and gives it back very quickly. Placed next to a chip’s power pins it smooths out tiny supply dips. That job is called decoupling.',
    values: 'Farads (F), but always tiny: pF (trillionths), nF (billionths) and µF (millionths). 100 nF is the classic decoupling value.',
    polarity: 'No polarity, and no markings at all. You can’t read the value off the part, so keep them in labelled bags.',
    polar: false,
    blinky: ['C1', 'C2', 'C3'],
    zoom: '×6',
  },
  {
    id: 'cap-elec',
    name: 'Electrolytic capacitor',
    variant: 'Through-hole, radial can',
    mount: 'THT',
    letter: 'C',
    kind: 'Passive',
    sym: 'Cpol',
    what: 'Stores a lot of charge in a small can. Used for bulk energy storage and smoothing a power supply.',
    values: 'Typically 1 µF to thousands of µF, plus a maximum voltage printed on the side (here 25 V). Stay well below it.',
    polarity: 'Polarised! The light stripe with “−” signs marks the negative leg, which is also the shorter one. Fitted backwards it can fail, sometimes with a bang.',
    polar: true,
    blinky: [],
    blinkyNote: 'Not in Blinky: its 10 µF timing capacitor C1 is a ceramic chip.',
  },
  {
    id: 'led',
    name: 'LED',
    variant: 'Through-hole, 5 mm',
    mount: 'THT',
    letter: 'D',
    kind: 'Active',
    sym: 'LED',
    what: 'A light-emitting diode: it lights up when current flows through it the right way. It always needs a current-limiting resistor.',
    values: 'Forward voltage about 2 V (red) to 3 V (blue, white). Typically run at 5–20 mA.',
    polarity: 'Polarised. The cathode (−) has the shorter leg and a flat edge on the rim. The longer leg is the anode (+).',
    polar: true,
    blinky: ['D1'],
    blinkyNote: 'Blinky uses an 0805 surface-mount LED.',
  },
  {
    id: 'diode',
    name: 'Diode',
    variant: 'Through-hole, axial',
    mount: 'THT',
    letter: 'D',
    kind: 'Active',
    sym: 'D',
    what: 'A one-way valve for current. A common job is protecting a circuit if someone connects the power backwards.',
    values: 'Rated by the current and reverse voltage it can take. The 1N4007 handles 1 A and 1000 V.',
    polarity: 'Polarised. The silver band marks the cathode (−), matching the bar in the schematic symbol.',
    polar: true,
    blinky: [],
  },
  {
    id: 'ic-dip',
    name: '555 timer IC',
    variant: 'Through-hole, DIP-8',
    mount: 'THT',
    letter: 'U',
    kind: 'Active',
    sym: 'IC',
    what: 'An integrated circuit: a complete circuit of transistors and resistors sealed in one package. The 555 is a timer, and it makes Blinky blink.',
    values: 'Identified by part number, not a value. The NE555 runs from 5 to 15 V. Everything else is in its datasheet.',
    polarity: 'Pin 1 is next to the notch and the dot. Looking from the top, pins count anticlockwise from there: 1–4 down one side, 5–8 back up the other.',
    polar: true,
    blinky: ['U1'],
    blinkyNote: 'Blinky uses the SOIC-8 version: same chip, same pin numbers, smaller package.',
  },
  {
    id: 'ic-soic',
    name: '555 timer IC',
    variant: 'Surface-mount, SOIC-8',
    mount: 'SMD',
    letter: 'U',
    kind: 'Active',
    sym: 'IC',
    what: 'The same 555 chip in a smaller package with “gull-wing” legs that sit on pads instead of going through holes.',
    values: 'Same part number, same pins. Package size is about 4.9 × 3.9 mm with legs 1.27 mm apart.',
    polarity: 'Pin 1 is marked by a dot (dimple) in one corner, and often a bevelled edge along the pin-1 side.',
    polar: true,
    blinky: ['U1'],
    zoom: '×4',
  },
  {
    id: 'transistor',
    name: 'Transistor',
    variant: 'Surface-mount, SOT-23',
    mount: 'SMD',
    letter: 'Q',
    kind: 'Active',
    sym: 'NPN',
    what: 'An electronic switch or amplifier: a small current into one pin controls a much bigger current through the other two. Chips like the 555 contain dozens of them.',
    values: 'Identified by part number, e.g. an MMBT3904 (a small NPN transistor, up to 200 mA). Tiny parts like this carry a short code such as “1AM” instead of the full name.',
    polarity: 'Three legs that are not interchangeable. The datasheet shows which is base, collector and emitter.',
    polar: true,
    blinky: [],
    zoom: '×6',
  },
  {
    id: 'header',
    name: 'Pin header',
    variant: 'Through-hole, 2-pin, 2.54 mm',
    mount: 'THT',
    letter: 'J',
    kind: 'Electromechanical',
    sym: 'HDR',
    what: 'A connector: a row of pins where wires or other boards plug in. Blinky gets its 5 V and ground through one.',
    values: 'Counted in pins and pitch (the gap between pins). 2.54 mm (0.1 inch) is the classic pitch.',
    polarity: 'Pin 1 is usually marked on the PCB by a square pad, so you know which wire goes where.',
    polar: false,
    blinky: ['J1'],
  },
  {
    id: 'button',
    name: 'Push button',
    variant: 'Through-hole, 6 mm tactile',
    mount: 'THT',
    letter: 'SW',
    kind: 'Electromechanical',
    sym: 'SW',
    what: 'A switch that connects its contacts only while you press it. Used for resets, inputs and “on” buttons.',
    values: 'Described by size, travel and force rather than a value.',
    polarity: 'Four legs connected in pairs inside. Check the datasheet to see which pairs are joined.',
    polar: false,
    blinky: [],
  },
]

export const byId = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<PartId, PartInfo>

/** Which parts are a correct answer for a symbol in the matching game. */
export const SYMBOL_ANSWERS: Record<SymId, { label: string; ok: PartId[]; near?: Partial<Record<PartId, string>> }> = {
  R: { label: 'Resistor', ok: ['res-tht', 'res-smd'] },
  C: { label: 'Capacitor', ok: ['cap-cer', 'cap-elec'] },
  Cpol: {
    label: 'Polarised capacitor',
    ok: ['cap-elec'],
    near: { 'cap-cer': 'Close! It is a capacitor, but the + and the curved plate mean polarised: the electrolytic.' },
  },
  LED: { label: 'LED', ok: ['led'], near: { diode: 'Close! It is a diode, but the two little arrows mean light comes out.' } },
  D: { label: 'Diode', ok: ['diode'], near: { led: 'Close! An LED is a diode, but its symbol adds two light arrows.' } },
  IC: { label: 'Integrated circuit', ok: ['ic-dip', 'ic-soic'] },
  NPN: { label: 'Transistor', ok: ['transistor'] },
  HDR: { label: 'Connector', ok: ['header'] },
  SW: { label: 'Push button', ok: ['button'] },
}
