/*
 * Tiny readiness tracker for the thumbnail studio: anything asynchronous (SVG rasterisation, fonts)
 * takes a hold and releases it when done. The studio only frames the shot, bakes the soft shadows
 * and raises `window.__thumbReady` once nothing is pending.
 */

let pending = 0
const listeners = new Set<() => void>()

export function hold(): () => void {
  pending++
  let released = false
  return () => {
    if (released) return
    released = true
    pending--
    listeners.forEach((f) => f())
  }
}

export const pendingCount = () => pending

export function onIdleChange(f: () => void) {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}

declare global {
  interface Window {
    __thumbReady?: boolean
    __thumbError?: string
  }
}
