/* The (deliberately simple) circuit model used by lesson 2. */

const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82]
/** E12 resistor values from 10 Ω to 10 kΩ */
export const R_VALUES = [...[1, 10, 100].flatMap((d) => E12.map((v) => v * d)), 10000]

export type LedColor = 'red' | 'green' | 'blue'

export const LEDS: Record<LedColor, { name: string; vf: number; color: string; glow: string; off: string }> = {
  red: { name: 'Red', vf: 2.0, color: '#ff3b2f', glow: '#ff5a3c', off: '#b9443c' },
  green: { name: 'Green', vf: 2.1, color: '#2fd36b', glow: '#3dff86', off: '#3f8f5d' },
  blue: { name: 'Blue', vf: 3.0, color: '#3f7bff', glow: '#5fa0ff', off: '#4361a8' },
}

export const SAFE_MAX = 0.02
export const BURN_AT = 0.04
export const RATING_W = 0.25 // a common through-hole resistor rating

export type Status = 'off' | 'dim' | 'safe' | 'over' | 'burnt' | 'reverse'

export function current(V: number, R: number, led: LedColor) {
  return Math.max(0, (V - LEDS[led].vf) / R)
}

export function statusOf(I: number, burnt: boolean, reversed: boolean): Status {
  if (burnt) return 'burnt'
  if (reversed) return 'reverse'
  if (I <= 0) return 'off'
  if (I < 0.005) return 'dim'
  if (I <= SAFE_MAX) return 'safe'
  return 'over'
}

export const STATUS_TEXT: Record<Status, { chip: string; tone: 'good' | 'warn' | 'bad' | undefined; text: string }> = {
  off: { chip: 'Off', tone: undefined, text: 'The supply is below the LED’s forward voltage, so it can’t push any current through.' },
  dim: { chip: 'Dim', tone: undefined, text: 'Under 5 mA. It glows, but only faintly. Try a smaller resistor.' },
  safe: { chip: 'Safe', tone: 'good', text: 'Between 5 and 20 mA: bright, happy and safe for years.' },
  over: { chip: 'Too much', tone: 'warn', text: 'Over 20 mA. The LED is overdriven and getting hot. Past 40 mA it will fail.' },
  burnt: { chip: 'Burnt out', tone: 'bad', text: 'The LED overheated and failed open. No current can flow any more.' },
  reverse: { chip: 'Backwards', tone: 'bad', text: 'The LED is in backwards. It only conducts from anode (+) to cathode (−).' },
}

export function fmtOhms(r: number) {
  if (r >= 1000) return `${+(r / 1000).toFixed(r % 1000 === 0 ? 0 : 1)} kΩ`
  return `${r} Ω`
}
export const fmtmA = (i: number) => (i * 1000 >= 100 ? (i * 1000).toFixed(0) : (i * 1000).toFixed(1))

export const BAND_COLORS = ['#1a1a1a', '#7a4316', '#d8342a', '#ee7d1f', '#f2cf26', '#2e9a4e', '#2f67d6', '#7d47c4', '#8c8c8c', '#f5f5f0']

/** 4-band colour code for an E12 value: [digit1, digit2, multiplier] as colour indices. */
export function bandsOf(r: number): [number, number, number] {
  const exp = Math.floor(Math.log10(r)) - 1
  const sig = Math.round(r / 10 ** exp)
  return [Math.floor(sig / 10), sig % 10, exp]
}
