/* Bring-up model: assembly state, faults, and what the multimeter / bench supply would read. */
import { placed as PLACED, netlist } from '@/pcb/project'
import { getFootprint } from '@/pcb/footprints'
import { partPads, type PartInst, type WorldPad } from '@/pcb/board'

export type Joint = 'none' | 'good' | 'cold' | 'lifted'

export interface PartState {
  placed: boolean
  /** LED only: soldered the wrong way round */
  reversed: boolean
  joints: Record<string, Joint>
}

export type Assembly = Record<string, PartState>

export const PARTS: PartInst[] = PLACED.map((p) => ({ ...p }))
export const partByRef = (ref: string) => PARTS.find((p) => p.ref === ref)!

/** Height tiers: smallest/lowest first. */
export const TIER: Record<string, number> = { R1: 1, R2: 1, R3: 1, C1: 1, C2: 1, C3: 1, U1: 2, D1: 2, J1: 3 }

/** The order shown in the parts tray (like a BOM, deliberately not the soldering order). */
export const TRAY = ['J1', 'U1', 'D1', 'R1', 'R2', 'R3', 'C1', 'C2', 'C3']

export const DESCR: Record<string, string> = {
  J1: '2-pin header',
  U1: 'NE555 · SOIC-8',
  D1: 'Red LED · 0805',
  R1: '1 kΩ · 0805',
  R2: '47 kΩ · 0805',
  R3: '330 Ω · 0805',
  C1: '10 µF · 0805',
  C2: '100 nF · 0805',
  C3: '10 nF · 0805',
}

export function freshAssembly(): Assembly {
  const a: Assembly = {}
  for (const p of PARTS) {
    const fp = getFootprint(p.fp)
    a[p.ref] = { placed: false, reversed: false, joints: Object.fromEntries(fp.pads.map((pd) => [pd.num, 'none' as Joint])) }
  }
  return a
}

/** World pads of the real (correctly oriented) part — used for hit-testing and probes. */
export const PADS: WorldPad[] = PARTS.flatMap((p) => partPads(p, netlist))
export const padByKey = (key: string) => PADS.find((p) => p.key === key)!

export const isSoldered = (s: PartState) => s.placed && Object.values(s.joints).every((j) => j !== 'none')
export const allSoldered = (a: Assembly) => PARTS.every((p) => isSoldered(a[p.ref]))

/* ------------------------------------------------------------------ */
/* Test points                                                         */
/* ------------------------------------------------------------------ */

export const PIN_NAMES: Record<string, string> = {
  'U1.1': 'GND',
  'U1.2': 'TRIG',
  'U1.3': 'OUT',
  'U1.4': 'RESET',
  'U1.5': 'CONT',
  'U1.6': 'THRES',
  'U1.7': 'DISCH',
  'U1.8': 'VCC',
  'J1.1': '+5V',
  'J1.2': 'GND',
}

export function padLabel(key: string) {
  const [ref, n] = key.split('.')
  const name = PIN_NAMES[key]
  if (ref === 'J1') return `J1 ${name}`
  if (ref === 'U1') return `U1 pin ${n} · ${name}`
  if (ref === 'D1') return `D1 ${n === '1' ? 'cathode' : 'anode'}`
  return `${ref} pad ${n}`
}

/* ------------------------------------------------------------------ */
/* Circuit behaviour                                                   */
/* ------------------------------------------------------------------ */

export interface Health {
  bridge: boolean
  /** chip has power and ground */
  chipPowered: boolean
  /** chip held in reset (RESET pin floating low) */
  inReset: boolean
  /** the timer oscillates */
  oscillates: boolean
  /** LED can light when OUT is high */
  ledPath: boolean
}

const jointOk = (a: Assembly, key: string) => {
  const [ref, n] = key.split('.')
  const j = a[ref]?.joints[n]
  return j === 'good'
}

export function health(a: Assembly, bridge: boolean): Health {
  const chipPowered = jointOk(a, 'U1.8') && jointOk(a, 'U1.1') && jointOk(a, 'J1.1') && jointOk(a, 'J1.2')
  const inReset = !jointOk(a, 'U1.4')
  const timing = ['U1.2', 'U1.6', 'U1.7', 'R1.1', 'R1.2', 'R2.1', 'R2.2', 'C1.1', 'C1.2'].every((k) => jointOk(a, k))
  const oscillates = chipPowered && !inReset && timing && !bridge
  const ledPath = ['U1.3', 'R3.1', 'R3.2', 'D1.1', 'D1.2'].every((k) => jointOk(a, k)) && !a.D1.reversed
  return { bridge, chipPowered, inReset, oscillates, ledPath }
}

/** Output phase of the astable at time t (s). ~1.5 Hz, slightly asymmetric like the real circuit. */
export function phase(t: number) {
  const T = 0.66
  const tHigh = 0.335
  const u = ((t % T) + T) % T
  const high = u < tHigh
  // capacitor voltage: charging 1.67 → 3.33 while high, discharging 3.33 → 1.67 while low
  const k = high ? u / tHigh : (u - tHigh) / (T - tHigh)
  const thr = high ? 1.67 + 1.66 * (1 - Math.exp(-k * 1.1)) / (1 - Math.exp(-1.1)) : 3.33 - 1.66 * (1 - Math.exp(-k * 1.1)) / (1 - Math.exp(-1.1))
  return { high, thr }
}

export interface SupplyState {
  on: boolean
  vset: number
  ilim: number
}

export interface Electrical {
  /** actual output voltage / current */
  v: number
  i: number
  cc: boolean
  ledOn: boolean
}

export function electrical(h: Health, s: SupplyState, t: number): Electrical {
  if (!s.on) return { v: 0, i: 0, cc: false, ledOn: false }
  const vset = s.vset
  if (vset < 0.05) return { v: 0, i: 0, cc: false, ledOn: false }
  if (h.bridge && h.chipPowered && vset > 2) {
    // DISCH shorted to VCC: when the discharge switch turns on it pulls VCC to ground
    return { v: Math.min(vset, 0.92), i: s.ilim, cc: true, ledOn: false }
  }
  const scale = Math.min(1, vset / 5)
  let i = 0
  let ledOn = false
  if (h.chipPowered && vset > 3.5) {
    i += 0.003 * scale
    if (h.inReset) i += vset / 1000 // R1 straight to the active discharge switch
    if (h.oscillates) {
      const { high } = phase(t)
      if (high && h.ledPath) {
        ledOn = true
        i += Math.max(0, (vset - 1.4 - 1.9) / 330)
      } else if (!high) {
        i += vset / 1000 * 0.4
      }
    }
  }
  if (i > s.ilim) return { v: vset * (s.ilim / i), i: s.ilim, cc: true, ledOn: false }
  return { v: vset, i, cc: false, ledOn }
}

/* ------------------------------------------------------------------ */
/* Multimeter                                                          */
/* ------------------------------------------------------------------ */

export type MeterMode = 'off' | 'v' | 'ohm' | 'beep'

const NODE_OF = (key: string) => netlist[key]

/** Voltage at a probe point (a part lead) while powered. */
export function voltageAt(key: string, a: Assembly, h: Health, e: Electrical, t: number): number {
  const vcc = e.v
  if (vcc <= 0.01) return 0
  const [ref, n] = key.split('.')
  const net = NODE_OF(key)
  const j = a[ref]?.joints[n]
  // a cold or lifted joint: the lead is not connected to its pad
  if (ref === 'U1' && j !== 'good') {
    if (!h.chipPowered) return 0.02
    if (n === '4') return 0.31 // floating RESET reads low-ish
    return 0.02
  }
  const ph = phase(t)
  switch (net) {
    case 'VCC':
      return vcc
    case 'GND':
      return 0
    case 'CTRL':
      return h.chipPowered && !e.cc ? (vcc * 2) / 3 : 0
    case 'OUT':
      if (!h.chipPowered || e.cc || !h.oscillates) return 0.05
      return ph.high ? Math.max(0, vcc - 1.4) : 0.05
    case 'LED': {
      if (!h.chipPowered || e.cc || !h.oscillates) return 0
      if (!ph.high) return 0
      return a.D1.reversed ? Math.max(0, vcc - 1.4) : 1.92
    }
    case 'THR':
      if (e.cc) return 0.2
      if (!h.chipPowered) return vcc
      if (h.inReset) return 0.04
      return (ph.thr * vcc) / 5
    case 'DIS':
      if (e.cc) return 0.3
      if (!h.chipPowered) return vcc
      if (h.inReset) return 0.05
      return ph.high ? vcc - (vcc - (ph.thr * vcc) / 5) / 48 : 0.06
    default:
      return 0
  }
}

/** Unpowered resistance between two probe points; `since` = seconds the probes have been in place. */
export function resistance(ka: string, kb: string, a: Assembly, bridge: boolean, since: number): { ohms: number | null; beep: boolean } {
  const na = netOf(ka, a, bridge)
  const nb = netOf(kb, a, bridge)
  if (!na || !nb) return { ohms: null, beep: false }
  if (na === nb) return { ohms: 0.3, beep: true }
  const pair = [na, nb].sort().join('-')
  const fixed: Record<string, number> = {
    'DIS-VCC': 1000,
    'DIS-THR': 47000,
    'THR-VCC': 48000,
    'LED-OUT': 330,
  }
  if (fixed[pair] && resistorOk(pair, a)) return { ohms: fixed[pair], beep: false }
  // capacitors: the reading climbs as the meter charges them, then goes over-range
  const caps: Record<string, number> = { 'GND-VCC': 1.6, 'GND-THR': 2.4, 'CTRL-GND': 0.8 }
  if (caps[pair]) {
    const tau = caps[pair]
    if (since > tau * 2.2) return { ohms: null, beep: false }
    const r = 180 * Math.exp(since * (5.5 / tau))
    return { ohms: r > 4e6 ? null : r, beep: false }
  }
  return { ohms: null, beep: false }
}

function resistorOk(pair: string, a: Assembly) {
  const ok = (ref: string) => isSoldered(a[ref])
  if (pair === 'DIS-VCC') return ok('R1')
  if (pair === 'DIS-THR') return ok('R2')
  if (pair === 'THR-VCC') return ok('R1') && ok('R2')
  if (pair === 'LED-OUT') return ok('R3')
  return true
}

/** The net a probe point is on (a lifted/cold U1 lead is isolated; the 7–8 bridge merges DIS into VCC). */
export function netOf(key: string, a: Assembly, bridge: boolean): string | null {
  const [ref, n] = key.split('.')
  const st = a[ref]
  if (!st) return null
  // probing a lead that is not connected to its pad: isolated
  if (st.placed && st.joints[n] !== 'good' && ref === 'U1') return `float:${key}`
  let net = NODE_OF(key)
  if (bridge && net === 'DIS') net = 'VCC'
  return net ?? null
}

export function formatOhms(o: number | null) {
  if (o === null) return { text: 'OL', unit: 'MΩ' }
  if (o < 1000) return { text: o.toFixed(o < 10 ? 1 : 0), unit: 'Ω' }
  if (o < 1e6) return { text: (o / 1000).toFixed(o < 1e4 ? 2 : 1), unit: 'kΩ' }
  return { text: (o / 1e6).toFixed(2), unit: 'MΩ' }
}

/* ------------------------------------------------------------------ */
/* Debug faults                                                        */
/* ------------------------------------------------------------------ */

export type Fault = 'led' | 'vcc' | 'reset'
export const FAULTS: Fault[] = ['vcc', 'led', 'reset']

export function applyFault(a: Assembly, f: Fault): Assembly {
  const next: Assembly = JSON.parse(JSON.stringify(a))
  if (f === 'led') next.D1.reversed = !next.D1.reversed
  if (f === 'vcc') next.U1.joints['8'] = 'cold'
  if (f === 'reset') next.U1.joints['4'] = 'lifted'
  return next
}
