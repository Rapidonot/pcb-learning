/* Footprint library (all dimensions in millimetres, origin = part centre). */

export type PadShape = 'rect' | 'roundrect' | 'round' | 'oval'

export interface PadDef {
  num: string
  /** pin name shown in tooltips, e.g. "VCC" */
  name?: string
  x: number
  y: number
  w: number
  h: number
  shape: PadShape
  /** drill diameter for through-hole pads */
  drill?: number
}

export type BodyKind = 'chip' | 'led-chip' | 'soic' | 'dip' | 'header' | 'led-5mm' | 'axial' | 'sot23' | 'electrolytic'

export interface FootprintDef {
  id: string
  name: string
  /** what EasyEDA/LCSC call the package */
  pkg: string
  mount: 'smd' | 'tht'
  pads: PadDef[]
  /** physical body outline (w × h, centred) and height — used for 3D & illustrations */
  body: { w: number; h: number; height: number; kind: BodyKind; color?: string }
  /** courtyard half-extents (keep-out area for neighbouring parts) */
  courtyard: { w: number; h: number }
  /** silkscreen outline segments [x1,y1,x2,y2] */
  silk: [number, number, number, number][]
  /** optional pin-1 / polarity marker dot on silkscreen */
  pin1?: [number, number]
  /** optional polarity mark, e.g. cathode bar position */
  polarity?: 'cathode-left' | 'cathode-right'
}

const chip = (
  id: string,
  pkg: string,
  bodyW: number,
  bodyH: number,
  padW: number,
  padH: number,
  padX: number,
  kind: BodyKind = 'chip',
  color?: string,
): FootprintDef => {
  const sx = padX + padW / 2 + 0.25
  const sy = Math.max(bodyH, padH) / 2 + 0.2
  return {
    id,
    name: `${pkg}`,
    pkg,
    mount: 'smd',
    pads: [
      { num: '1', x: -padX, y: 0, w: padW, h: padH, shape: 'roundrect' },
      { num: '2', x: padX, y: 0, w: padW, h: padH, shape: 'roundrect' },
    ],
    body: { w: bodyW, h: bodyH, height: kind === 'led-chip' ? 0.8 : 0.5, kind, color },
    courtyard: { w: sx + 0.15, h: sy + 0.15 },
    silk:
      kind === 'led-chip'
        ? [
            [-sx, -sy, sx, -sy],
            [-sx, sy, sx, sy],
            [-sx, -sy, -sx, sy],
          ]
        : [
            [-bodyW / 2 + 0.1, -sy, bodyW / 2 - 0.1, -sy],
            [-bodyW / 2 + 0.1, sy, bodyW / 2 - 0.1, sy],
          ],
    polarity: kind === 'led-chip' ? 'cathode-left' : undefined,
  }
}

const soic8: FootprintDef = {
  id: 'SOIC-8',
  name: 'SOIC-8_3.9x4.9mm_P1.27mm',
  pkg: 'SOIC-8',
  mount: 'smd',
  pads: [
    { num: '1', x: -2.7, y: -1.905, w: 1.55, h: 0.6, shape: 'roundrect' },
    { num: '2', x: -2.7, y: -0.635, w: 1.55, h: 0.6, shape: 'roundrect' },
    { num: '3', x: -2.7, y: 0.635, w: 1.55, h: 0.6, shape: 'roundrect' },
    { num: '4', x: -2.7, y: 1.905, w: 1.55, h: 0.6, shape: 'roundrect' },
    { num: '5', x: 2.7, y: 1.905, w: 1.55, h: 0.6, shape: 'roundrect' },
    { num: '6', x: 2.7, y: 0.635, w: 1.55, h: 0.6, shape: 'roundrect' },
    { num: '7', x: 2.7, y: -0.635, w: 1.55, h: 0.6, shape: 'roundrect' },
    { num: '8', x: 2.7, y: -1.905, w: 1.55, h: 0.6, shape: 'roundrect' },
  ],
  body: { w: 3.9, h: 4.9, height: 1.5, kind: 'soic' },
  courtyard: { w: 3.7, h: 2.75 },
  silk: [
    [-1.95, -2.56, 1.95, -2.56],
    [-1.95, 2.56, 1.95, 2.56],
    [-1.95, -2.56, -1.95, -2.4],
    [1.95, -2.56, 1.95, -2.4],
    [-1.95, 2.56, -1.95, 2.4],
    [1.95, 2.56, 1.95, 2.4],
  ],
  pin1: [-3.75, -2.6],
}

const dip8: FootprintDef = {
  id: 'DIP-8',
  name: 'DIP-8_W7.62mm',
  pkg: 'DIP-8',
  mount: 'tht',
  pads: [
    { num: '1', x: -3.81, y: -3.81, w: 1.6, h: 1.6, shape: 'rect', drill: 0.8 },
    { num: '2', x: -3.81, y: -1.27, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
    { num: '3', x: -3.81, y: 1.27, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
    { num: '4', x: -3.81, y: 3.81, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
    { num: '5', x: 3.81, y: 3.81, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
    { num: '6', x: 3.81, y: 1.27, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
    { num: '7', x: 3.81, y: -1.27, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
    { num: '8', x: 3.81, y: -3.81, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
  ],
  body: { w: 6.35, h: 9.8, height: 3.3, kind: 'dip' },
  courtyard: { w: 4.9, h: 5.2 },
  silk: [
    [-2.6, -5.0, -0.6, -5.0],
    [0.6, -5.0, 2.6, -5.0],
    [-2.6, 5.0, 2.6, 5.0],
    [-2.6, -5.0, -2.6, 5.0],
    [2.6, -5.0, 2.6, 5.0],
  ],
}

const header = (n: number): FootprintDef => {
  const pitch = 2.54
  const pads: PadDef[] = Array.from({ length: n }, (_, i) => ({
    num: String(i + 1),
    x: 0,
    y: (i - (n - 1) / 2) * pitch,
    w: 1.7,
    h: 1.7,
    shape: i === 0 ? 'rect' : 'round',
    drill: 1.0,
  }))
  const hh = (n * pitch) / 2
  return {
    id: `HDR-1x${n}`,
    name: `PinHeader_1x${String(n).padStart(2, '0')}_P2.54mm`,
    pkg: `HDR-1x${n} 2.54mm`,
    mount: 'tht',
    pads,
    body: { w: 2.54, h: n * pitch, height: 2.5, kind: 'header' },
    courtyard: { w: 1.6, h: hh + 0.3 },
    silk: [
      [-1.33, -hh, 1.33, -hh],
      [-1.33, hh, 1.33, hh],
      [-1.33, -hh, -1.33, hh],
      [1.33, -hh, 1.33, hh],
    ],
  }
}

const led5mm: FootprintDef = {
  id: 'LED-5MM',
  name: 'LED_D5.0mm',
  pkg: 'LED 5mm THT',
  mount: 'tht',
  pads: [
    { num: '1', name: 'K', x: -1.27, y: 0, w: 1.8, h: 1.8, shape: 'rect', drill: 0.9 },
    { num: '2', name: 'A', x: 1.27, y: 0, w: 1.8, h: 1.8, shape: 'round', drill: 0.9 },
  ],
  body: { w: 5.8, h: 5.8, height: 8.6, kind: 'led-5mm', color: '#e8392f' },
  courtyard: { w: 3.2, h: 3.2 },
  silk: [[-2.6, -1.6, -2.6, 1.6]],
  polarity: 'cathode-left',
}

const axial: FootprintDef = {
  id: 'R-AXIAL-0.4',
  name: 'R_Axial_L6.3mm_P10.16mm',
  pkg: 'Axial 0.4in',
  mount: 'tht',
  pads: [
    { num: '1', x: -5.08, y: 0, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
    { num: '2', x: 5.08, y: 0, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
  ],
  body: { w: 6.3, h: 2.5, height: 2.5, kind: 'axial', color: '#d9c08a' },
  courtyard: { w: 6.2, h: 1.6 },
  silk: [
    [-3.3, -1.4, 3.3, -1.4],
    [-3.3, 1.4, 3.3, 1.4],
    [-3.3, -1.4, -3.3, 1.4],
    [3.3, -1.4, 3.3, 1.4],
    [-4.1, 0, -3.3, 0],
    [3.3, 0, 4.1, 0],
  ],
}

const sot23: FootprintDef = {
  id: 'SOT-23',
  name: 'SOT-23-3',
  pkg: 'SOT-23',
  mount: 'smd',
  pads: [
    { num: '1', x: -0.95, y: 1.1, w: 0.6, h: 0.9, shape: 'roundrect' },
    { num: '2', x: 0.95, y: 1.1, w: 0.6, h: 0.9, shape: 'roundrect' },
    { num: '3', x: 0, y: -1.1, w: 0.6, h: 0.9, shape: 'roundrect' },
  ],
  body: { w: 2.9, h: 1.3, height: 1.0, kind: 'sot23' },
  courtyard: { w: 1.7, h: 1.8 },
  silk: [
    [-1.6, -0.75, -0.55, -0.75],
    [0.55, -0.75, 1.6, -0.75],
    [-1.6, -0.75, -1.6, 0.3],
    [1.6, -0.75, 1.6, 0.3],
  ],
}

export const footprints: Record<string, FootprintDef> = {
  R0402: chip('R0402', '0402', 1.0, 0.5, 0.6, 0.6, 0.5),
  R0603: chip('R0603', '0603', 1.6, 0.8, 0.9, 0.95, 0.8),
  R0805: chip('R0805', '0805', 2.0, 1.25, 1.0, 1.3, 0.95),
  R1206: chip('R1206', '1206', 3.2, 1.6, 1.15, 1.8, 1.5),
  C0805: chip('C0805', '0805', 2.0, 1.25, 1.0, 1.3, 0.95, 'chip', '#c9a776'),
  LED0805: chip('LED0805', '0805 LED', 2.0, 1.25, 1.0, 1.3, 0.95, 'led-chip'),
  'SOIC-8': soic8,
  'DIP-8': dip8,
  'HDR-1x2': header(2),
  'HDR-1x3': header(3),
  'HDR-1x4': header(4),
  'LED-5MM': led5mm,
  'R-AXIAL-0.4': axial,
  'SOT-23': sot23,
}

export function getFootprint(id: string): FootprintDef {
  const fp = footprints[id]
  if (!fp) throw new Error(`Unknown footprint ${id}`)
  return fp
}
