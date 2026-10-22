/*
 * Paint a board surface once and get matching colour / bump / ORM maps out of it.
 * The painter draws in millimetres with "inks" (mask, pad, silk…); each pass maps the ink to its
 * own value, so copper looks raised under the mask, pads shine and silkscreen is matte.
 */
import * as THREE from 'three'
import { MASKS, REAL, type MaskColor } from '@/pcb/palette'
import { canvasTex } from './textures'

export type Ink = 'mask' | 'cuMask' | 'pad' | 'enig' | 'copper' | 'silk' | 'fr4' | 'hole' | 'none'
export type Pass = 'color' | 'bump' | 'orm'

const BUMP: Record<Ink, string> = {
  mask: '#000',
  cuMask: '#7a7a7a',
  pad: '#9a9a9a',
  enig: '#9a9a9a',
  copper: '#9a9a9a',
  silk: '#d4d4d4',
  fr4: '#000',
  hole: '#000',
  none: '#000',
}
// glTF convention: G = roughness, B = metalness
const ORM: Record<Ink, string> = {
  mask: 'rgb(255,88,0)',
  cuMask: 'rgb(255,70,0)',
  pad: 'rgb(255,60,255)',
  enig: 'rgb(255,48,255)',
  copper: 'rgb(255,70,255)',
  silk: 'rgb(255,220,0)',
  fr4: 'rgb(255,200,0)',
  hole: 'rgb(255,255,0)',
  none: 'rgb(255,88,0)',
}

export function inkColor(ink: Ink, mask: MaskColor = 'green') {
  const m = MASKS[mask]
  switch (ink) {
    case 'mask':
      return m.mask
    case 'cuMask':
      return m.maskCopper
    case 'pad':
      return REAL.hasl
    case 'enig':
      return REAL.enig
    case 'copper':
      return REAL.copper
    case 'silk':
      return m.silk
    case 'fr4':
      return REAL.fr4
    case 'hole':
      return REAL.hole
    default:
      return 'rgba(0,0,0,0)'
  }
}

export type Painter = (ctx: CanvasRenderingContext2D, ink: (k: Ink) => string, pass: Pass) => void

/** Returns colour/bump/orm canvas textures for a w×h mm surface (texture top row = −z). */
export function paintedMaps(key: string, w: number, h: number, paint: Painter, opts: { ppm?: number; mask?: MaskColor; base?: Ink } = {}) {
  const { ppm = 40, mask = 'green', base = 'mask' } = opts
  const W = Math.round(w * ppm)
  const H = Math.round(h * ppm)
  const make = (pass: Pass, scale: number) =>
    canvasTex(
      `${key}:${pass}`,
      Math.round(W * scale),
      Math.round(H * scale),
      (ctx, cw, ch) => {
        const ink = (k: Ink) => (pass === 'color' ? inkColor(k, mask) : pass === 'bump' ? BUMP[k] : ORM[k])
        ctx.fillStyle = ink(base)
        ctx.fillRect(0, 0, cw, ch)
        ctx.save()
        ctx.scale(cw / w, ch / h)
        if (pass === 'bump') ctx.filter = `blur(${0.04 * (cw / w)}px)`
        paint(ctx, ink, pass)
        ctx.restore()
        if (pass === 'color') {
          // a whisper of grain so flat mask doesn't look like plastic
          const img = ctx.getImageData(0, 0, cw, ch)
          const d = img.data
          let seed = 7
          for (let i = 0; i < d.length; i += 4) {
            seed = (seed * 16807) % 2147483647
            const n = ((seed / 2147483647) - 0.5) * 6
            d[i] += n
            d[i + 1] += n
            d[i + 2] += n
          }
          ctx.putImageData(img, 0, 0)
        }
      },
      pass !== 'color',
    )
  return { color: make('color', 1), bump: make('bump', 0.6), orm: make('orm', 0.6) } as { color: THREE.Texture; bump: THREE.Texture; orm: THREE.Texture }
}

/* small drawing helpers (mm units) */
export function polyline(ctx: CanvasRenderingContext2D, pts: [number, number][], width: number, style: string) {
  ctx.strokeStyle = style
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

export function roundRect(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, r: number, style: string) {
  ctx.fillStyle = style
  ctx.beginPath()
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r)
  ctx.fill()
}

export function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, style: string) {
  ctx.fillStyle = style
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}
