import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** A celebratory burst of tiny resistors, LEDs and copper squares. */
export function Confetti({ fire }: { fire: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!fire) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    const colors = ['#e0542c', '#2f8a5b', '#e3a361', '#d6a63f', '#3767c9', '#1f6b47']
    const kinds = ['res', 'led', 'sq', 'sq', 'chip'] as const
    const parts = Array.from({ length: 110 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H * 0.6,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 16 - 6,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
      k: kinds[Math.floor(Math.random() * kinds.length)],
      s: 5 + Math.random() * 5,
    }))
    let raf = 0
    let t = 0
    const tick = () => {
      t++
      ctx.clearRect(0, 0, W, H)
      for (const p of parts) {
        p.vy += 0.42
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.r += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        ctx.globalAlpha = Math.max(0, 1 - t / 140)
        if (p.k === 'res') {
          ctx.fillStyle = '#c9ccd1'
          ctx.fillRect(-p.s, -p.s * 0.35, p.s * 2, p.s * 0.7)
          ctx.fillStyle = '#1d1d1f'
          ctx.fillRect(-p.s * 0.6, -p.s * 0.35, p.s * 1.2, p.s * 0.7)
        } else if (p.k === 'led') {
          ctx.fillStyle = p.c
          ctx.beginPath()
          ctx.arc(0, 0, p.s * 0.7, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.k === 'chip') {
          ctx.fillStyle = '#222225'
          ctx.fillRect(-p.s * 0.7, -p.s * 0.9, p.s * 1.4, p.s * 1.8)
          ctx.fillStyle = '#c9ccd1'
          for (let i = -1; i <= 1; i++) {
            ctx.fillRect(-p.s, i * p.s * 0.5 - 1, p.s * 0.3, 2)
            ctx.fillRect(p.s * 0.7, i * p.s * 0.5 - 1, p.s * 0.3, 2)
          }
        } else {
          ctx.fillStyle = p.c
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
        }
        ctx.restore()
      }
      if (t < 140) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, W, H)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fire])
  // portalled to <body> so transformed ancestors can't clip the fixed-position canvas
  return createPortal(<canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 90 }} aria-hidden />, document.body)
}
