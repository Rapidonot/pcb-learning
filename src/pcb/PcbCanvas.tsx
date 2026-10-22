import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { EDA } from './palette'
import type { Vec } from './geom'
import { IconMinus, IconPlus, IconTarget } from '@/components/icons'
import './pcb.css'

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

export interface PcbCanvasHandle {
  /** client (screen) px → world mm */
  toWorld: (clientX: number, clientY: number) => Vec
  fit: () => void
  svg: SVGSVGElement | null
}

export interface PcbCanvasProps {
  /** world rectangle to fit on mount / on "fit" */
  fit: ViewBox
  /** visual theme of the canvas */
  theme?: 'eda' | 'paper' | 'schematic' | 'none'
  grid?: number | false
  majorEvery?: number
  /** allow wheel zoom + drag panning (drag on empty background) */
  interactive?: boolean
  /** show the floating zoom buttons */
  zoomControls?: boolean
  /** extra content drawn in screen space over the svg (HTML) */
  overlay?: ReactNode
  children?: ReactNode
  style?: CSSProperties
  className?: string
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>, world: Vec) => void
  onPointerMove?: (e: React.PointerEvent<SVGSVGElement>, world: Vec) => void
  onPointerUp?: (e: React.PointerEvent<SVGSVGElement>, world: Vec) => void
  /** a press-and-release on empty canvas that didn't pan (e.g. to deselect) */
  onBackgroundClick?: (e: React.PointerEvent<SVGSVGElement>, world: Vec) => void
  onContextMenu?: (e: React.MouseEvent<SVGSVGElement>) => void
  cursor?: string
  /** padding around the fit rect, in mm */
  pad?: number
  ariaLabel?: string
}

const themes = {
  eda: { bg: EDA.bg, minor: EDA.grid, major: EDA.gridMajor },
  paper: { bg: 'transparent', minor: 'color-mix(in srgb, var(--ink) 7%, transparent)', major: 'color-mix(in srgb, var(--ink) 13%, transparent)' },
  schematic: { bg: 'var(--sch-bg)', minor: 'var(--sch-grid)', major: 'color-mix(in srgb, var(--sch-grid) 60%, #999)' },
  none: { bg: 'transparent', minor: 'transparent', major: 'transparent' },
}

/**
 * An SVG viewport in world units (mm for boards). Fits `fit` on mount, supports wheel-zoom,
 * drag-to-pan on empty space, pinch zoom, and exposes toWorld() for editors.
 */
export const PcbCanvas = forwardRef<PcbCanvasHandle, PcbCanvasProps>(function PcbCanvas(
  {
    fit,
    theme = 'eda',
    grid = 1,
    majorEvery = 5,
    interactive = true,
    zoomControls = true,
    overlay,
    children,
    style,
    className,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onBackgroundClick,
    onContextMenu,
    cursor,
    pad = 2,
    ariaLabel,
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 500 })
  const [vb, setVb] = useState<ViewBox | null>(null)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const t = themes[theme]

  // track container size
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const computeFit = useCallback((): ViewBox => {
    const fx = fit.x - pad
    const fy = fit.y - pad
    const fw = fit.w + pad * 2
    const fh = fit.h + pad * 2
    const aspect = size.w / size.h
    if (fw / fh > aspect) {
      const h = fw / aspect
      return { x: fx, y: fy - (h - fh) / 2, w: fw, h }
    }
    const w = fh * aspect
    return { x: fx - (w - fw) / 2, y: fy, w, h: fh }
  }, [fit.x, fit.y, fit.w, fit.h, pad, size.w, size.h])

  // refit whenever the fit rect or container size changes
  useEffect(() => {
    setVb(computeFit())
  }, [computeFit])

  const view = vb ?? computeFit()

  const toWorld = useCallback(
    (cx: number, cy: number): Vec => {
      const svg = svgRef.current
      if (!svg) return [0, 0]
      const r = svg.getBoundingClientRect()
      return [view.x + ((cx - r.left) / r.width) * view.w, view.y + ((cy - r.top) / r.height) * view.h]
    },
    [view],
  )

  useImperativeHandle(ref, () => ({ toWorld, fit: () => setVb(computeFit()), svg: svgRef.current }), [toWorld, computeFit])

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setVb((cur) => {
        const v = cur ?? computeFit()
        const svg = svgRef.current
        let wx = v.x + v.w / 2
        let wy = v.y + v.h / 2
        if (svg && cx !== undefined && cy !== undefined) {
          const r = svg.getBoundingClientRect()
          wx = v.x + ((cx - r.left) / r.width) * v.w
          wy = v.y + ((cy - r.top) / r.height) * v.h
        }
        const fitW = computeFit().w
        const nw = Math.min(fitW * 4, Math.max(fitW / 12, v.w * factor))
        const k = nw / v.w
        return { x: wx - (wx - v.x) * k, y: wy - (wy - v.y) * k, w: v.w * k, h: v.h * k }
      })
    },
    [computeFit],
  )

  // wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !interactive) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX, e.clientY)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [interactive, zoomAt])

  // panning & pinch
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const panState = useRef<{ x: number; y: number; vb: ViewBox; bg: boolean; moved: boolean } | null>(null)
  const pinch = useRef<{ d: number } | null>(null)

  const handleDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const world = toWorld(e.clientX, e.clientY)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (interactive && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) }
      panState.current = null
      return
    }
    const isBg = e.target === svgRef.current || (e.target as Element).getAttribute?.('data-bg') === '1'
    const wantsPan = interactive && (e.button === 1 || e.button === 2 || (isBg && e.button === 0 && !onPointerDown) || (e.button === 0 && e.altKey))
    if (wantsPan) {
      panState.current = { x: e.clientX, y: e.clientY, vb: view, bg: isBg && e.button === 0, moved: false }
      svgRef.current?.setPointerCapture(e.pointerId)
      return
    }
    onPointerDown?.(e, world)
  }

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      zoomAt(pinch.current.d / d, (a.x + b.x) / 2, (a.y + b.y) / 2)
      pinch.current.d = d
      return
    }
    if (panState.current) {
      const svg = svgRef.current!
      const r = svg.getBoundingClientRect()
      const p = panState.current
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) p.moved = true
      if (!p.moved) return
      const dx = ((e.clientX - p.x) / r.width) * p.vb.w
      const dy = ((e.clientY - p.y) / r.height) * p.vb.h
      setVb({ ...p.vb, x: p.vb.x - dx, y: p.vb.y - dy })
      return
    }
    onPointerMove?.(e, toWorld(e.clientX, e.clientY))
  }

  const handleUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (panState.current) {
      const p = panState.current
      panState.current = null
      if (p.bg && !p.moved) onBackgroundClick?.(e, toWorld(e.clientX, e.clientY))
      return
    }
    onPointerUp?.(e, toWorld(e.clientX, e.clientY))
  }

  const gridId = `g-${uid}`
  const gridMajorId = `gm-${uid}`
  const g = grid || 1
  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: t.bg, touchAction: interactive ? 'none' : 'auto', ...style }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu?.(e)
        }}
        style={{ display: 'block', cursor: panState.current ? 'grabbing' : cursor, userSelect: 'none' }}
        role="img"
        aria-label={ariaLabel}
      >
        {grid !== false && (
          <>
            <defs>
              <pattern id={gridId} width={g} height={g} patternUnits="userSpaceOnUse">
                <path d={`M ${g} 0 L 0 0 0 ${g}`} fill="none" stroke={t.minor} strokeWidth={view.w / size.w} />
              </pattern>
              <pattern id={gridMajorId} width={g * majorEvery} height={g * majorEvery} patternUnits="userSpaceOnUse">
                <rect width={g * majorEvery} height={g * majorEvery} fill={`url(#${gridId})`} />
                <path d={`M ${g * majorEvery} 0 L 0 0 0 ${g * majorEvery}`} fill="none" stroke={t.major} strokeWidth={(view.w / size.w) * 1.2} />
              </pattern>
            </defs>
            <rect data-bg="1" x={view.x} y={view.y} width={view.w} height={view.h} fill={`url(#${gridMajorId})`} />
          </>
        )}
        {grid === false && <rect data-bg="1" x={view.x} y={view.y} width={view.w} height={view.h} fill="transparent" />}
        {children}
      </svg>
      {overlay}
      {interactive && zoomControls && (
        <div className="canvas-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button aria-label="Zoom in" onClick={() => zoomAt(0.75)}>
            <IconPlus size={15} />
          </button>
          <button aria-label="Zoom out" onClick={() => zoomAt(1.33)}>
            <IconMinus size={15} />
          </button>
          <button aria-label="Fit to view" onClick={() => setVb(computeFit())}>
            <IconTarget size={15} />
          </button>
        </div>
      )}
    </div>
  )
})
