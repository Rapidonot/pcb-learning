/* Ordering lesson: the simulated order form's fields, beginner defaults, and BOM / CPL builders. */
import type { MaskColor } from '@/pcb/palette'
import { getFootprint } from '@/pcb/footprints'
import { parts as projectParts, placed, BOARD_H } from '@/pcb/project'

export type Finish = 'hasl' | 'lfhasl' | 'enig'
export type OrderNo = 'default' | 'location' | 'remove'

export interface Order {
  qty: number
  thickness: number
  mask: MaskColor
  finish: Finish
  copper: 1 | 2
  goldFingers: boolean
  orderNo: OrderNo
  remarks: string
  assembly: boolean
}

export const DEFAULTS: Order = {
  qty: 5,
  thickness: 1.6,
  mask: 'green',
  finish: 'lfhasl',
  copper: 1,
  goldFingers: false,
  orderNo: 'default',
  remarks: '',
  assembly: false,
}

/** Somebody else's last order, still sitting in the form. */
export const LEFTOVER: Order = {
  qty: 30,
  thickness: 1.2,
  mask: 'black',
  finish: 'hasl',
  copper: 2,
  goldFingers: false,
  orderNo: 'default',
  remarks: '',
  assembly: false,
}

export const isDefault = (o: Order) =>
  o.qty === DEFAULTS.qty &&
  o.thickness === DEFAULTS.thickness &&
  o.mask === DEFAULTS.mask &&
  o.finish === DEFAULTS.finish &&
  o.copper === DEFAULTS.copper &&
  o.goldFingers === DEFAULTS.goldFingers &&
  o.orderNo === DEFAULTS.orderNo

/** Cost impact of a choice: 0 = baseline, 1 = may cost more / take longer, 2 = definitely extra. */
export interface Impact {
  cost: 0 | 1 | 2
  slower?: boolean
  text: string
}

export const QTYS = [5, 10, 15, 20, 25, 30, 50, 75, 100]
export const THICKNESSES = [0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0]
export const MASK_ORDER: MaskColor[] = ['green', 'purple', 'red', 'yellow', 'blue', 'white', 'black']
export const MASK_NAMES: Record<MaskColor, string> = {
  green: 'Green',
  purple: 'Purple',
  red: 'Red',
  yellow: 'Yellow',
  blue: 'Blue',
  white: 'White',
  black: 'Black',
}

export const FINISHES: { id: Finish; label: string; short: string }[] = [
  { id: 'hasl', label: 'HASL (with lead)', short: 'HASL' },
  { id: 'lfhasl', label: 'LeadFree HASL', short: 'LF HASL' },
  { id: 'enig', label: 'ENIG', short: 'ENIG' },
]

export function impactOf(field: keyof Order, o: Order): Impact {
  switch (field) {
    case 'qty':
      return o.qty === 5 ? { cost: 0, text: 'Smallest order' } : { cost: 1, text: 'Higher total, cheaper per board' }
    case 'thickness':
      return o.thickness === 1.6 ? { cost: 0, text: 'Standard' } : { cost: 1, slower: true, text: 'Non-standard: may cost more' }
    case 'mask':
      return o.mask === 'green' ? { cost: 0, text: 'Standard' } : { cost: 1, slower: true, text: 'May cost more or take longer' }
    case 'finish':
      return o.finish === 'enig' ? { cost: 2, text: '+ extra cost' } : o.finish === 'hasl' ? { cost: 0, text: 'Cheapest, contains lead' } : { cost: 0, text: 'Standard, RoHS' }
    case 'copper':
      return o.copper === 1 ? { cost: 0, text: 'Standard' } : { cost: 2, text: '+ extra cost' }
    case 'orderNo':
      return o.orderNo === 'remove' ? { cost: 2, text: '+ small fee' } : { cost: 0, text: 'Free' }
    case 'goldFingers':
      return o.goldFingers ? { cost: 2, text: '+ extra cost' } : { cost: 0, text: 'None' }
    case 'assembly':
      return o.assembly ? { cost: 2, slower: true, text: '+ assembly fees' } : { cost: 0, text: 'Bare boards' }
    default:
      return { cost: 0, text: '' }
  }
}

export const IMPACT_FIELDS: (keyof Order)[] = ['qty', 'thickness', 'mask', 'finish', 'copper', 'goldFingers', 'orderNo', 'assembly']

/** Plain-English explainers shown behind each "?" button. */
export const HELP: Record<string, string> = {
  material:
    'The board’s core. FR-4 (woven glass fibre in epoxy) is the standard for almost every hobby and product board. Other materials exist for special jobs such as heat-sinking or flexible boards.',
  layers: 'How many copper layers. The factory counts them from your Gerbers: Blinky has top and bottom copper, so it’s a 2-layer board.',
  size: 'Read from the board outline (GKO) in your Gerbers. Blinky is 30 × 26 mm. If this looks wrong, your outline is probably broken.',
  qty: 'How many bare boards you get. 5 is the smallest order and only the listed quantities can be chosen. Five is plenty for a first board: you will want spares.',
  thickness:
    '1.6 mm is the industry standard and fits most connectors and enclosures. Thinner boards flex; some options limit others (0.4 mm is ENIG-only, and 0.6 mm 2-layer boards can’t use leaded HASL).',
  mask: 'The colour of the protective lacquer. It doesn’t change how the board works. Green is the classic, best-supported choice and shows defects clearly.',
  silk: 'The printed labels. The factory picks a colour that contrasts with the mask: white on most colours, black on white or yellow.',
  finish:
    'A coating on the bare pads so they don’t oxidise and solder well. LeadFree HASL is the recommended standard (RoHS). Leaded HASL is cheapest but contains lead. ENIG is a flat gold finish for fine-pitch parts such as BGAs.',
  copper: 'How thick the outer copper is. 1 oz (about 35 µm) is standard and plenty for Blinky’s few milliamps. 2 oz is for high-current boards.',
  gold: 'Hard gold plating on edge connectors that slide into a slot (like a PC card). Needs a board at least 50 mm across, so it’s not possible on Blinky.',
  orderNo:
    'The factory prints a small order number on the silkscreen to track your boards. You can tell it where to put it (by adding a placeholder in your silkscreen) or pay a small fee to remove it.',
  remarks: 'Special requests in plain words. Leave it empty unless you really need something unusual.',
  assembly:
    'Have the factory solder the surface-mount parts for you. You upload two extra files: the BOM (which parts) and the CPL (where each one goes).',
}

/* ------------------------------------------------------------------ */
/* BOM & CPL                                                            */
/* ------------------------------------------------------------------ */

export interface BomLine {
  designators: string[]
  value: string
  footprint: string
  qty: number
  smd: boolean
  /** example library type, for the extended-part fee demo */
  example: 'Basic' | 'Extended'
}

export function buildBom(): BomLine[] {
  const map = new Map<string, BomLine>()
  for (const p of projectParts) {
    const fp = getFootprint(p.fp)
    const key = `${p.value}|${p.fp}`
    const line = map.get(key)
    if (line) {
      line.designators.push(p.ref)
      line.qty++
    } else
      map.set(key, {
        designators: [p.ref],
        value: p.value,
        footprint: fp.pkg,
        qty: 1,
        smd: fp.mount === 'smd',
        example: p.ref === 'U1' || p.ref === 'D1' ? 'Extended' : 'Basic',
      })
  }
  return [...map.values()]
}

export interface CplLine {
  ref: string
  x: number
  y: number
  rot: number
  layer: 'Top' | 'Bottom'
  smd: boolean
}

/** Pick-and-place: part centres measured from the board's bottom-left corner (Y up), rotation counter-clockwise. */
export function buildCpl(): CplLine[] {
  return placed.map((p) => ({
    ref: p.ref,
    x: p.x,
    y: BOARD_H - p.y,
    rot: (360 - p.rot) % 360,
    layer: p.side === 'top' ? 'Top' : 'Bottom',
    smd: getFootprint(p.fp).mount === 'smd',
  }))
}

export const EXTENDED_FEE = 3
