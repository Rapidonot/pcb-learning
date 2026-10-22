/* Literal colour palettes (not CSS vars) so boards can also be rasterised into 3D textures. */

export const EDA = {
  bg: '#101210',
  grid: 'rgba(255,255,255,0.07)',
  gridMajor: 'rgba(255,255,255,0.14)',
  top: '#e8453c',
  bottom: '#3f6fe0',
  multi: '#b9b9b9',
  silkTop: '#f0d84a',
  silkBottom: '#c9a0ff',
  outline: '#e05ad6',
  via: '#c8c8c8',
  hole: '#101210',
  ratsnest: '#7fc3ff',
  select: '#ffffff',
  drc: '#ff2bd1',
  courtyard: 'rgba(255,255,255,0.25)',
}

export type FinishColor = 'hasl' | 'enig'
export type MaskColor = 'green' | 'black' | 'blue' | 'red' | 'white' | 'purple' | 'yellow'

export const MASKS: Record<MaskColor, { mask: string; maskCopper: string; edge: string; silk: string }> = {
  green: { mask: '#1f6b47', maskCopper: '#2b8a5b', edge: '#134a30', silk: '#f4f1e8' },
  black: { mask: '#1b1c1e', maskCopper: '#2c2e31', edge: '#0d0e0f', silk: '#f4f1e8' },
  blue: { mask: '#1d4f9a', maskCopper: '#2c66bd', edge: '#123566', silk: '#f4f1e8' },
  red: { mask: '#a82c2c', maskCopper: '#c24141', edge: '#6e1a1a', silk: '#f4f1e8' },
  white: { mask: '#ecebe6', maskCopper: '#f7f6f2', edge: '#b9b7ae', silk: '#1b1b1b' },
  purple: { mask: '#5b2a86', maskCopper: '#7038a3', edge: '#3a1958', silk: '#f4f1e8' },
  yellow: { mask: '#d8b62c', maskCopper: '#e6c84a', edge: '#957a12', silk: '#1b1b1b' },
}

export const REAL = {
  fr4: '#c9b27a',
  fr4Dark: '#a8925c',
  hasl: '#d3d6da',
  haslShade: '#a9adb3',
  enig: '#e2b44e',
  enigShade: '#b98a2a',
  copper: '#d58a44',
  hole: '#1b1a17',
}
