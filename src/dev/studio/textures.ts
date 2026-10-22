/*
 * Texture helpers for the thumbnail studio.
 *  - useSvgTex: render a React SVG tree to markup, rasterise it and hand back a THREE texture
 *  - canvasTex: draw with the 2D canvas API (can use the page's loaded web fonts)
 */
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as THREE from 'three'
import { hold } from './ready'

export interface SvgTexOpts {
  /** pixel size of the raster */
  w: number
  h: number
  /** svg viewBox, e.g. "0 0 30 26" */
  viewBox: string
  /** data maps (bump, roughness…) must not be colour-managed */
  linear?: boolean
  background?: string
}

const cache = new Map<string, Promise<THREE.Texture>>()

function rasterise(markup: string, o: SvgTexOpts): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = o.w
      c.height = o.h
      const ctx = c.getContext('2d')!
      if (o.background) {
        ctx.fillStyle = o.background
        ctx.fillRect(0, 0, o.w, o.h)
      }
      ctx.drawImage(img, 0, 0, o.w, o.h)
      URL.revokeObjectURL(url)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace
      t.anisotropy = 16
      t.generateMipmaps = true
      t.minFilter = THREE.LinearMipmapLinearFilter
      resolve(t)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('svg rasterise failed'))
    }
    img.src = url
  })
}

/** Rasterise an SVG subtree (in viewBox units) into a texture. `key` must change when the art changes. */
export function useSvgTex(key: string, o: SvgTexOpts, children: () => ReactNode): THREE.Texture | null {
  const markup = useMemo(() => {
    const el: ReactElement = createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', width: o.w, height: o.h, viewBox: o.viewBox, preserveAspectRatio: 'none' },
      children(),
    )
    return renderToStaticMarkup(el)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const ck = `${key}|${o.w}x${o.h}|${o.linear ? 1 : 0}`
    let p = cache.get(ck)
    if (!p) {
      p = rasterise(markup, o)
      cache.set(ck, p)
    }
    const release = hold()
    let live = true
    p.then((t) => live && setTex(t))
      .catch((e) => {
        window.__thumbError = String(e)
      })
      .finally(release)
    return () => {
      live = false
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup])
  return tex
}

const canvasCache = new Map<string, THREE.CanvasTexture>()
/** A cached canvas texture drawn synchronously. */
export function canvasTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, linear = false) {
  const hit = canvasCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  draw(ctx, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace
  t.anisotropy = 16
  canvasCache.set(key, t)
  return t
}

/** Soft radial glow sprite (white core, coloured falloff) used for LEDs. */
export function glowTex(color: string) {
  return canvasTex(`glow:${color}`, 256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    const c = new THREE.Color(color)
    const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`
    g.addColorStop(0, `rgba(255,240,230,0.95)`)
    g.addColorStop(0.12, `rgba(${rgb},0.75)`)
    g.addColorStop(0.35, `rgba(${rgb},0.28)`)
    g.addColorStop(0.65, `rgba(${rgb},0.08)`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
}

/** Rounded-rectangle path helper for canvas drawing. */
export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
