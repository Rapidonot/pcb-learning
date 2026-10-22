/*
 * A pan/zoom SVG viewport for the sandbox editor. Adapted from src/pcb/PcbCanvas.tsx, extended with:
 *  - handlers that can decline a press (then a one-finger / left drag pans the view)
 *  - two-finger pan + pinch, right/middle-drag pan, taps on empty space
 *  - programmatic zoomTo / centerOn (DRC "zoom to error", cross-probing)
 *  - a crisp, zoom-adaptive grid and a ViewContext so overlays can size strokes in screen pixels.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { EDA } from '@/pcb/palette'
import type { Vec } from '@/pcb/geom'
import { IconMinus, IconPlus, IconTarget } from '@/components/icons'

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}
export interface ViewInfo {
  view: ViewBox
  /** world units (mm) per screen pixel */
  px: number
}

const ViewCtx = createContext<ViewInfo>({ view: { x: 0, y: 0, w: 100, h: 60 }, px: 0.1 })
export const useView = () => useContext(ViewCtx)

export interface EditorCanvasHandle {
  toWorld: (clientX: number, clientY: number) => Vec
  fit: () => void
  zoomTo: (r: ViewBox, opts?: { minW?: number }) => void
  centerOn: (p: Vec) => void
  svg: SVGSVGElement | null
}

type PE = React.PointerEvent<SVGSVGElement>

export interface EditorCanvasProps {
  fit: ViewBox
  theme?: 'eda' | 'photo' | 'schematic'
  grid?: number | false
  majorEvery?: number
  zoomControls?: boolean
  overlay?: ReactNode
  children?: ReactNode
  className?: string
  style?: CSSProperties
  pad?: number
  ariaLabel?: string
  /** return true when the press was used (no panning). Anything else lets the drag pan. */
  onPointerDown?: (e: PE, world: Vec) => boolean | void
  /** called on hover and while dragging */
  onPointerMove?: (e: PE, world: Vec) => void
  onPointerUp?: (e: PE, world: Vec) => void
  /** a press on something the handler declined, released without moving */
  onTap?: (e: PE, world: Vec) => void
  /** right-click without dragging */
  onSecondaryTap?: (e: PE, world: Vec) => void
  /** a second finger landed: abort whatever the first finger started */
  onGestureCancel?: () => void
  onLeave?: () => void
  onDoubleClick?: (e: React.MouseEvent<SVGSVGElement>, world: Vec) => void
}

const THEMES = {
  eda: { bg: EDA.bg, minor: 'rgba(255,255,255,0.055)', major: 'rgba(255,255,255,0.12)' },
  photo: { bg: 'transparent', minor: 'transparent', major: 'transparent' },
  schematic: { bg: 'var(--sch-bg)', minor: 'var(--sch-grid)', major: 'color-mix(in srgb, var(--sch-grid) 60%, #999)' },
}

const MIN_W = 3
const MAX_W = 600

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas(
  {
    fit,
    theme = 'eda',
    grid = 1,
    majorEvery = 5,
    zoomControls = true,
    overlay,
    children,
    className,
    style,
    pad = 2,
    ariaLabel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTap,
    onSecondaryTap,
    onGestureCancel,
    onLeave,
    onDoubleClick,
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const sizeRef = useRef<{ w: number; h: number } | null>(null)
  const [vb, setVbState] = useState<ViewBox | null>(null)
  const vbRef = useRef<ViewBox | null>(null)
  const setVb = useCallback((v: ViewBox) => {
    vbRef.current = v
    setVbState(v)
  }, [])
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const t = THEMES[theme]
  const fitRef = useRef(fit)
  fitRef.current = fit

  const computeFit = useCallback(
    (r: ViewBox, s: { w: number; h: number }, padding = pad): ViewBox => {
      const fx = r.x - padding
      const fy = r.y - padding
      const fw = r.w + padding * 2
      const fh = r.h + padding * 2
      const aspect = s.w / s.h
      if (fw / fh > aspect) {
        const h = fw / aspect
        return { x: fx, y: fy - (h - fh) / 2, w: fw, h }
      }
      const w = fh * aspect
      return { x: fx - (w - fw) / 2, y: fy, w, h: fh }
    },
    [pad],
  )

  // track the container size; keep scale + centre when it changes, fit on first layout
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const apply = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return
      const prev = sizeRef.current
      const cur = vbRef.current
      if (prev && prev.w === w && prev.h === h) return
      if (!prev || !cur) setVb(computeFit(fitRef.current, { w, h }))
      else {
        const px = cur.w / prev.w
        const cx = cur.x + cur.w / 2
        const cy = cur.y + cur.h / 2
        setVb({ x: cx - (w * px) / 2, y: cy - (h * px) / 2, w: w * px, h: h * px })
      }
      sizeRef.current = { w, h }
      setSize({ w, h })
    }
    const r = el.getBoundingClientRect()
    apply(r.width, r.height)
    const ro = new ResizeObserver(([entry]) => apply(entry.contentRect.width, entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [computeFit, setVb])

  const sz = size ?? { w: 800, h: 500 }
  const view = vb ?? computeFit(fit, sz)
  const px = view.w / sz.w

  const toWorld = useCallback((cx: number, cy: number): Vec => {
    const svg = svgRef.current
    const v = vbRef.current
    if (!svg || !v) return [0, 0]
    const r = svg.getBoundingClientRect()
    return [v.x + ((cx - r.left) / r.width) * v.w, v.y + ((cy - r.top) / r.height) * v.h]
  }, [])

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const v = vbRef.current
      const svg = svgRef.current
      if (!v || !svg) return
      let wx = v.x + v.w / 2
      let wy = v.y + v.h / 2
      if (cx !== undefined && cy !== undefined) [wx, wy] = toWorld(cx, cy)
      const nw = Math.min(MAX_W, Math.max(MIN_W, v.w * factor))
      const k = nw / v.w
      setVb({ x: wx - (wx - v.x) * k, y: wy - (wy - v.y) * k, w: v.w * k, h: v.h * k })
    },
    [setVb, toWorld],
  )

  const doFit = useCallback(() => {
    const s = size
    if (s) setVb(computeFit(fitRef.current, s))
  }, [size, computeFit, setVb])

  useImperativeHandle(
    ref,
    () => ({
      toWorld,
      fit: doFit,
      zoomTo: (r, opts) => {
        if (!size) return
        const minW = opts?.minW ?? 6
        const f = computeFit(r, size, 0)
        if (f.w < minW) {
          const k = minW / f.w
          const cx = f.x + f.w / 2
          const cy = f.y + f.h / 2
          setVb({ x: cx - (f.w * k) / 2, y: cy - (f.h * k) / 2, w: f.w * k, h: f.h * k })
        } else setVb(f)
      },
      centerOn: (p) => {
        const v = vbRef.current
        if (!v) return
        setVb({ ...v, x: p[0] - v.w / 2, y: p[1] - v.h / 2 })
      },
      svg: svgRef.current,
    }),
    [toWorld, doFit, size, computeFit, setVb],
  )

  // wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      zoomAt(Math.exp(Math.max(-60, Math.min(60, dy)) * 0.0018), e.clientX, e.clientY)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  /* ---------------- pointers: pan, pinch, delegate ---------------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pan = useRef<{ id: number; x: number; y: number; vb: ViewBox; moved: boolean; button: number } | null>(null)
  const pinch = useRef<{ d: number; mx: number; my: number } | null>(null)
  const delegated = useRef<number | null>(null)

  const handleDown = (e: PE) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    svgRef.current?.setPointerCapture?.(e.pointerId)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
      pan.current = null
      if (delegated.current !== null) {
        delegated.current = null
        onGestureCancel?.()
      }
      return
    }
    if (pointers.current.size > 2) return
    const world = toWorld(e.clientX, e.clientY)
    const forcePan = e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey && !e.shiftKey)
    if (!forcePan && e.button === 0 && onPointerDown?.(e, world) === true) {
      delegated.current = e.pointerId
      return
    }
    if (vbRef.current) pan.current = { id: e.pointerId, x: e.clientX, y: e.clientY, vb: vbRef.current, moved: false, button: e.button }
  }

  const handleMove = (e: PE) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const v = vbRef.current
      const svg = svgRef.current
      if (v && svg && d > 0) {
        const r = svg.getBoundingClientRect()
        const p = pinch.current
        // the world point under the old midpoint stays under the new midpoint
        const wx = v.x + ((p.mx - r.left) / r.width) * v.w
        const wy = v.y + ((p.my - r.top) / r.height) * v.h
        const nw = Math.min(MAX_W, Math.max(MIN_W, v.w * (p.d / d)))
        const nh = v.h * (nw / v.w)
        setVb({ x: wx - ((mx - r.left) / r.width) * nw, y: wy - ((my - r.top) / r.height) * nh, w: nw, h: nh })
      }
      pinch.current = { d, mx, my }
      return
    }
    const p = pan.current
    if (p && p.id === e.pointerId) {
      const svg = svgRef.current!
      const r = svg.getBoundingClientRect()
      const dxp = e.clientX - p.x
      const dyp = e.clientY - p.y
      if (!p.moved && Math.hypot(dxp, dyp) < 4) return
      p.moved = true
      svg.style.cursor = 'grabbing'
      setVb({ ...p.vb, x: p.vb.x - (dxp / r.width) * p.vb.w, y: p.vb.y - (dyp / r.height) * p.vb.h })
      return
    }
    if (pointers.current.size <= 1) onPointerMove?.(e, toWorld(e.clientX, e.clientY))
  }

  const handleUp = (e: PE) => {
    const had = pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const p = pan.current
    if (p && p.id === e.pointerId) {
      pan.current = null
      if (svgRef.current) svgRef.current.style.cursor = ''
      if (!p.moved && e.type === 'pointerup') {
        const w = toWorld(e.clientX, e.clientY)
        if (p.button === 2) onSecondaryTap?.(e, w)
        else if (p.button === 0) onTap?.(e, w)
      }
      return
    }
    if (delegated.current === e.pointerId) {
      delegated.current = null
      if (e.type === 'pointercancel') onGestureCancel?.()
      else onPointerUp?.(e, toWorld(e.clientX, e.clientY))
      return
    }
    void had
  }

  // grid: keep lines at least ~7 px apart
  const gridEl = useMemo(() => {
    if (grid === false || theme === 'photo') return null
    let g = grid
    while (g / px < 7) g *= g < 1 ? 2 : majorEvery
    const big = g * majorEvery
    const gridId = `sg-${uid}`
    const gridMajorId = `sgm-${uid}`
    return (
      <>
        <defs>
          <pattern id={gridId} width={g} height={g} patternUnits="userSpaceOnUse">
            <path d={`M ${g} 0 L 0 0 0 ${g}`} fill="none" stroke={t.minor} strokeWidth={px} />
          </pattern>
          <pattern id={gridMajorId} width={big} height={big} patternUnits="userSpaceOnUse">
            <rect width={big} height={big} fill={`url(#${gridId})`} />
            <path d={`M ${big} 0 L 0 0 0 ${big}`} fill="none" stroke={t.major} strokeWidth={px} />
          </pattern>
        </defs>
        <rect x={view.x} y={view.y} width={view.w} height={view.h} fill={`url(#${gridMajorId})`} />
        {/* origin axes */}
        <g stroke="rgba(255,255,255,0.18)" strokeWidth={px}>
          <line x1={view.x} y1={0} x2={view.x + view.w} y2={0} strokeDasharray={`${px * 4} ${px * 4}`} />
          <line x1={0} y1={view.y} x2={0} y2={view.y + view.h} strokeDasharray={`${px * 4} ${px * 4}`} />
        </g>
      </>
    )
  }, [grid, theme, px, majorEvery, uid, t.minor, t.major, view.x, view.y, view.w, view.h])

  const ctx = useMemo<ViewInfo>(() => ({ view, px }), [view, px])

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: t.bg, touchAction: 'none', ...style }}
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
        onPointerLeave={(e) => {
          if (!pointers.current.has(e.pointerId)) onLeave?.()
        }}
        onDoubleClick={(e) => onDoubleClick?.(e, toWorld(e.clientX, e.clientY))}
        onContextMenu={(e) => e.preventDefault()}
        style={{ display: 'block', userSelect: 'none', WebkitUserSelect: 'none' }}
        role="application"
        aria-label={ariaLabel}
      >
        {gridEl}
        <ViewCtx.Provider value={ctx}>{children}</ViewCtx.Provider>
      </svg>
      {overlay}
      {zoomControls && (
        <div className="sbx-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button aria-label="Zoom in" data-tip="Zoom in (wheel)" data-tip-pos="left" onClick={() => zoomAt(0.72)}>
            <IconPlus size={15} />
          </button>
          <button aria-label="Zoom out" data-tip="Zoom out (wheel)" data-tip-pos="left" onClick={() => zoomAt(1.38)}>
            <IconMinus size={15} />
          </button>
          <button aria-label="Fit to view" data-tip="Fit all (K)" data-tip-pos="left" onClick={doFit}>
            <IconTarget size={15} />
          </button>
        </div>
      )}
    </div>
  )
})
