/*
 * IPC-2221 trace-width estimate (the formula behind most online calculators).
 *   I = k · ΔT^b · A^c        (A in mils², ΔT in °C, I in amps)
 *   A = (I / (k · ΔT^b))^(1/c)
 *   W = A / (T · 1.378)       (T = copper weight in oz, W in mils)
 * k = 0.048 for external layers, b = 0.44, c = 0.725.
 */
export const IPC = { k: 0.048, b: 0.44, c: 0.725 }

export const MIL = 0.0254 // mm per mil
export const OZ_MM = 0.035 // 1 oz copper ≈ 35 µm

export interface WidthResult {
  areaMil2: number
  widthMil: number
  widthMm: number
  thickMm: number
}

export function traceWidth(amps: number, riseC: number, oz: number): WidthResult {
  const areaMil2 = Math.pow(amps / (IPC.k * Math.pow(riseC, IPC.b)), 1 / IPC.c)
  const widthMil = areaMil2 / (oz * 1.378)
  return { areaMil2, widthMil, widthMm: widthMil * MIL, thickMm: oz * OZ_MM }
}

/** Inverse: temperature rise of a trace of a given width carrying `amps`. */
export function tempRise(amps: number, widthMm: number, oz: number) {
  const areaMil2 = (widthMm / MIL) * oz * 1.378
  return Math.pow(amps / (IPC.k * Math.pow(areaMil2, IPC.c)), 1 / IPC.b)
}

/** Track widths offered by the routing playground (mm). */
export const ROUTER_WIDTHS = [0.25, 0.5, 1.0] as const
