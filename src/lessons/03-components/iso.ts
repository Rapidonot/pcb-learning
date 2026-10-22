/* Tiny isometric projection helpers for the lesson illustrations (local copy for lesson 3). */
import { useLayoutEffect, useRef, useState } from 'react'

export type V3 = [number, number, number]
export type V2 = [number, number]

export const C30 = Math.cos(Math.PI / 6) // 0.866

/** world (x right-down, y left-down, z up) → screen */
export function iso(x: number, y: number, z = 0): V2 {
  return [(x - y) * C30, (x + y) * 0.5 - z]
}
export const isoP = (p: V3): V2 => iso(p[0], p[1], p[2])

export const pts = (ps: V2[]) => ps.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')

/** The three visible faces of an axis-aligned box. */
export function box(x: number, y: number, z: number, w: number, d: number, h: number) {
  return {
    top: pts([iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)]),
    left: pts([iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)]),
    right: pts([iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)]),
    shadow: pts([iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)]),
  }
}

/** SVG matrix that maps face-local (u→, v↓) coordinates onto a plane. */
export const faceTop = (x: number, y: number, z: number) => {
  const [ox, oy] = iso(x, y, z)
  return `matrix(${C30} 0.5 ${-C30} 0.5 ${ox} ${oy})`
}
/** +y face (front-left); origin = its top-left corner (x, y, zTop) */
export const faceLeft = (x: number, y: number, z: number) => {
  const [ox, oy] = iso(x, y, z)
  return `matrix(${C30} 0.5 0 1 ${ox} ${oy})`
}
/** +x face (front-right); origin = its top-left corner (x, yMax, zTop) */
export const faceRight = (x: number, y: number, z: number) => {
  const [ox, oy] = iso(x, y, z)
  return `matrix(${C30} -0.5 0 1 ${ox} ${oy})`
}

/** Ellipse radii of a horizontal circle of radius r. */
export const ellR = (r: number) => ({ rx: r * 1.2247, ry: r * 0.7071 })

/** Path of the side of a vertical cylinder (draw the top ellipse separately). */
export function cylSide(cx: number, cy: number, z0: number, z1: number, r: number) {
  const { rx, ry } = ellR(r)
  const [x, y0] = iso(cx, cy, z0)
  const [, y1] = iso(cx, cy, z1)
  return `M ${x - rx} ${y1} L ${x - rx} ${y0} A ${rx} ${ry} 0 0 0 ${x + rx} ${y0} L ${x + rx} ${y1} Z`
}

export function cubic(a: V3, b: V3, c: V3, d: V3, n = 24): V3[] {
  const out: V3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    const f = (k: 0 | 1 | 2) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]
    out.push([f(0), f(1), f(2)])
  }
  return out
}

/** A polyline in screen space with cumulative lengths, for animating dots along it. */
export interface Track2 {
  p: V2[]
  cum: number[]
  len: number
  /** per-segment: hidden (e.g. inside the supply) */
  hidden: boolean[]
  /** per-segment free-form tag */
  tag: string[]
}

export function makeTrack(segments: { pts: V3[]; hidden?: boolean; tag?: string }[]): Track2 {
  const p: V2[] = []
  const hidden: boolean[] = []
  const tag: string[] = []
  for (const s of segments) {
    s.pts.forEach((q, i) => {
      if (p.length && i === 0) return // shared joint
      p.push(isoP(q))
      if (p.length > 1) {
        hidden.push(!!s.hidden)
        tag.push(s.tag ?? '')
      }
    })
  }
  const cum = [0]
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]))
  return { p, cum, len: cum[cum.length - 1], hidden, tag }
}

export function pointAt(t: Track2, s: number): { x: number; y: number; hidden: boolean; tag: string } {
  s = ((s % t.len) + t.len) % t.len
  let lo = 0
  let hi = t.cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t.cum[mid] <= s) lo = mid
    else hi = mid
  }
  const seg = t.cum[hi] - t.cum[lo] || 1
  const f = (s - t.cum[lo]) / seg
  const a = t.p[lo]
  const b = t.p[hi]
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, hidden: t.hidden[lo], tag: t.tag[lo] }
}

/** Observe an element's size. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setSize({ w: r.width, h: r.height })
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

export function usePrefersReducedMotion() {
  const [r] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return r
}
