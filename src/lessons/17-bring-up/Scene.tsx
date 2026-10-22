import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { useMission } from '../mission'
import { FloatingCard, Button } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconCheck, IconX, IconReset, IconCube } from '@/components/icons'
import { BoardView, FootprintSilk, partTransform } from '@/pcb/render'
import { getFootprint } from '@/pcb/footprints'
import { analyze } from '@/pcb/board'
import { stages } from '@/pcb/project'
import { MASKS } from '@/pcb/palette'
import { ArtDefs, Bridge, ChipTop, HeaderBottom, HeaderTop, LedTop, SoicTop } from './art'
import { Iron, Probe, SolderWire, ToolDefs, Tweezers, Wick, probeTail } from './tools'
import { METER_H, METER_JACKS, METER_W, Meter, SUPPLY_H, SUPPLY_POSTS, SUPPLY_W, Supply } from './instruments'
import {
  DESCR,
  FAULTS,
  PADS,
  PARTS,
  TIER,
  TRAY,
  allSoldered,
  applyFault,
  electrical,
  formatOhms,
  freshAssembly,
  health,
  isSoldered,
  netOf,
  padByKey,
  padLabel,
  partByRef,
  resistance,
  voltageAt,
  type Assembly,
  type Fault,
  type MeterMode,
  type SupplyState,
} from './model'

const Board3D = lazy(() => import('@/pcb/Board3D').then((m) => ({ default: m.Board3D })))

type Phase = 'assemble' | 'inspect' | 'test' | 'power'
type Tool = 'iron' | 'wick' | 'loupe'
type Side = 'top' | 'bottom'
type V2 = [number, number]
interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const BW = 30
const BH = 26
const WHOLE: Rect = { x: -1.6, y: -1.6, w: BW + 3.2, h: BH + 3.2 }
const BRIDGE_AT: V2 = [20.9, 11.73] // between U1 pins 7 and 8 (world mm)
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

interface Layout {
  mobile: boolean
  board: Rect
  palette: { x: number; y: number; vertical: boolean }
  meter: (Rect & { s: number }) | null
  supply: (Rect & { s: number }) | null
  rest: { red: V2; black: V2 }
}

function computeLayout(W: number, H: number, phase: Phase): Layout {
  const mobile = W < 640
  const tb = 62
  const inst = phase === 'test' || phase === 'power'
  if (!mobile) {
    const left = W >= 820 ? 284 : 16
    let meter: Layout['meter'] = null
    let supply: Layout['supply'] = null
    let right = 16
    if (inst) {
      const avail = H - tb - 22
      const need = phase === 'power' ? SUPPLY_H + 12 + METER_H : METER_H
      const s = Math.min(1, avail / need)
      if (phase === 'power') {
        supply = { x: W - 14 - SUPPLY_W * s, y: 12, w: SUPPLY_W * s, h: SUPPLY_H * s, s }
        meter = { x: W - 14 - SUPPLY_W * s + ((SUPPLY_W - METER_W) * s) / 2, y: 12 + (SUPPLY_H + 12) * s, w: METER_W * s, h: METER_H * s, s }
        right = SUPPLY_W * s + 30
      } else {
        meter = { x: W - 18 - METER_W * s, y: Math.max(12, (H - tb - METER_H * s) / 2), w: METER_W * s, h: METER_H * s, s }
        right = METER_W * s + 110
      }
    }
    const board = { x: left, y: 14, w: Math.max(200, W - left - right - 52), h: H - tb - 22 }
    const rest: Layout['rest'] = meter
      ? { red: [meter.x - 54, meter.y + meter.h * 0.42], black: [meter.x - 64, meter.y + meter.h * 0.66] }
      : { red: [W + 50, H], black: [W + 50, H] }
    return { mobile, board, palette: { x: board.x + board.w + 8, y: board.y + 4, vertical: true }, meter, supply, rest }
  }
  // phone
  const top = 86
  let meter: Layout['meter'] = null
  let supply: Layout['supply'] = null
  let bottom = H - tb
  if (inst) {
    const s = Math.min(0.62, (H - tb - top - 190) / METER_H)
    meter = { x: W - 6 - METER_W * s, y: H - tb - METER_H * s - 2, w: METER_W * s, h: METER_H * s, s }
    if (phase === 'power') {
      const ss = Math.min((W - 20 - METER_W * s) / SUPPLY_W, 0.75)
      supply = { x: 6, y: H - tb - SUPPLY_H * ss - 4, w: SUPPLY_W * ss, h: SUPPLY_H * ss, s: ss }
    }
    bottom = meter.y - 6
  }
  const board = { x: 6, y: top, w: W - 12 - 44, h: Math.max(140, bottom - top) }
  const rest: Layout['rest'] = meter
    ? phase === 'power'
      ? { red: [meter.x - 6, meter.y - 30], black: [meter.x - 34, meter.y - 18] }
      : { red: [meter.x - 40, meter.y + meter.h * 0.3], black: [meter.x - 54, meter.y + meter.h * 0.62] }
    : { red: [W + 50, H], black: [W + 50, H] }
  return { mobile, board, palette: { x: W - 46, y: top + 2, vertical: true }, meter, supply, rest }
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

const rot = ([x, y]: V2, deg: number): V2 => {
  const a = (deg * Math.PI) / 180
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
}

function partAt(p: V2) {
  for (const part of PARTS) {
    const fp = getFootprint(part.fp)
    const [lx, ly] = rot([p[0] - part.x, p[1] - part.y], -part.rot)
    if (Math.abs(lx) <= fp.courtyard.w + 0.15 && Math.abs(ly) <= fp.courtyard.h + 0.15) return part
  }
  return null
}

function padAt(p: V2, tol: number, refs?: string[]) {
  let best: { key: string; d: number } | null = null
  for (const pad of PADS) {
    if (refs && !refs.includes(pad.ref)) continue
    const [lx, ly] = rot([p[0] - pad.x, p[1] - pad.y], -pad.rot)
    if (Math.abs(lx) <= pad.w / 2 + tol && Math.abs(ly) <= pad.h / 2 + tol) {
      const d = Math.hypot(lx, ly)
      if (!best || d < best.d) best = { key: pad.key, d }
    }
  }
  return best?.key ?? null
}

function nearestPad(p: V2, maxD: number, refs: string[]) {
  let best: { key: string; d: number } | null = null
  for (const pad of PADS) {
    if (!refs.includes(pad.ref)) continue
    const d = Math.hypot(p[0] - pad.x, p[1] - pad.y)
    if (d <= maxD && (!best || d < best.d)) best = { key: pad.key, d }
  }
  return best?.key ?? null
}

function focusRect(ref: string, side: Side, aspect: number): Rect {
  const part = partByRef(ref)
  const fp = getFootprint(part.fp)
  const vertical = part.rot % 180 !== 0
  const cw = (vertical ? fp.courtyard.h : fp.courtyard.w) * 2
  const ch = (vertical ? fp.courtyard.w : fp.courtyard.h) * 2
  let w = Math.max(cw + 7, 10)
  let h = Math.max(ch + 6, 8)
  if (w / h < aspect) w = h * aspect
  else h = w / aspect
  const cx = side === 'bottom' ? BW - part.x : part.x
  return { x: cx - w / 2, y: part.y - h / 2, w, h }
}

/* ------------------------------------------------------------------ */
/* Little icons for the tool palette                                   */
/* ------------------------------------------------------------------ */

const Ico = ({ children }: { children: ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
const IcoIron = () => (
  <Ico>
    <path d="M3 21l5-5M8 16l2.5-2.5M10.5 13.5l7-7a2 2 0 0 1 2.8 2.8l-7 7z" />
    <path d="M3 21l1.2-3.2L6.2 19.8z" fill="currentColor" />
  </Ico>
)
const IcoWick = () => (
  <Ico>
    <path d="M4 20 15 9" strokeWidth={4} />
    <path d="M4 20 15 9" stroke="var(--card)" strokeWidth={1.2} strokeDasharray="1.5 1.5" />
    <circle cx="18" cy="6" r="3.2" />
  </Ico>
)
const IcoLoupe = () => (
  <Ico>
    <circle cx="10" cy="10" r="6" />
    <path d="M14.5 14.5 20 20" strokeWidth={2.4} />
    <path d="M7.5 8.5a3 3 0 0 1 2-2" />
  </Ico>
)
const IcoFit = () => (
  <Ico>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Ico>
)
const IcoFlip = () => (
  <Ico>
    <path d="M12 3v18" strokeDasharray="2 2" />
    <path d="M9 7 4 12l5 5zM15 7l5 5-5 5z" />
  </Ico>
)

/* ------------------------------------------------------------------ */
/* Beeper (continuity mode)                                            */
/* ------------------------------------------------------------------ */

function useBeep(on: boolean) {
  const ctx = useRef<AudioContext | null>(null)
  const osc = useRef<OscillatorNode | null>(null)
  useEffect(() => {
    if (!on) {
      try {
        osc.current?.stop()
      } catch {
        /* already stopped */
      }
      osc.current = null
      return
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx.current = ctx.current ?? new AC()
      const c = ctx.current
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'square'
      o.frequency.value = 2700
      g.gain.value = 0.025
      o.connect(g).connect(c.destination)
      o.start()
      osc.current = o
    } catch {
      /* audio not available */
    }
    return () => {
      try {
        osc.current?.stop()
      } catch {
        /* ignore */
      }
      osc.current = null
    }
  }, [on])
  useEffect(() => () => void ctx.current?.close().catch(() => {}), [])
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

interface ProbeState {
  pad: string | null
  drag: V2 | null
}
type Msg = { text: string; tone?: 'good' | 'warn' | 'bad' } | null

export function Scene() {
  const mission = useMission()
  const stageRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 950, h: 600 })
  const [phase, setPhase] = useState<Phase>('assemble')
  const [tool, setTool] = useState<Tool>('iron')
  const [asm, setAsm] = useState<Assembly>(freshAssembly)
  const [fresh, setFresh] = useState<string[]>([]) // "REF.pad" being animated
  const [dropping, setDropping] = useState<string | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const [orderBroken, setOrderBroken] = useState(false)
  const [bridge, setBridge] = useState<'none' | 'on' | 'fading' | 'gone'>('none')
  const [side, setSide] = useState<Side>('top')
  const [flip, setFlip] = useState<'none' | 'out' | 'in'>('none')
  const [vb, setVb] = useState<Rect>(WHOLE)
  const vbTarget = useRef<Rect>(WHOLE)
  const vbCur = useRef<Rect>(WHOLE)
  const [focus, setFocus] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [dialog, setDialog] = useState<'led' | 'turn' | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [iron, setIron] = useState<{ p: V2; press: boolean; instant: boolean } | null>(null)
  const [wick, setWick] = useState<{ p: V2; used: boolean } | null>(null)
  const [tweez, setTweez] = useState<{ p: V2; k: number } | null>(null)
  const [wire, setWire] = useState<{ p: V2; k: number } | null>(null)
  const [puffs, setPuffs] = useState<{ id: number; p: V2 }[]>([])
  const [loupe, setLoupe] = useState<V2 | null>(null)
  const [visited, setVisited] = useState<string[]>([])
  const [mmode, setMmode] = useState<MeterMode>('off')
  const [probes, setProbes] = useState<{ red: ProbeState; black: ProbeState }>({ red: { pad: null, drag: null }, black: { pad: null, drag: null } })
  const probesAt = useRef(performance.now())
  const [shortOk, setShortOk] = useState(false)
  const [sup, setSup] = useState<SupplyState>({ on: false, vset: 0, ilim: 1 })
  const [now, setNow] = useState(0)
  const blinkTime = useRef(0)
  const [blinked, setBlinked] = useState(false)
  const [fault, setFault] = useState<Fault | null>(null)
  const faultIdx = useRef(0)
  const [show3d, setShow3d] = useState(false)
  const [measured, setMeasured] = useState<Record<string, number>>({})
  const dragging = useRef<'iron' | 'loupe' | null>(null)
  const timers = useRef<number[]>([])
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  /* ---------- size ---------- */
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  const L = useMemo(() => computeLayout(size.w, size.h, phase), [size, phase])
  const aspect = L.board.w / L.board.h

  /* ---------- camera ---------- */
  const fitWhole = useCallback(() => {
    const r = { ...WHOLE }
    if (r.w / r.h < aspect) {
      const w = r.h * aspect
      r.x -= (w - r.w) / 2
      r.w = w
    } else {
      const h = r.w / aspect
      r.y -= (h - r.h) / 2
      r.h = h
    }
    vbTarget.current = r
    setFocus(null)
  }, [aspect])
  const zoomTo = useCallback((ref: string, s: Side = side) => {
    vbTarget.current = focusRect(ref, s, aspect)
    setFocus(ref)
  }, [aspect, side])
  useEffect(() => {
    if (focus) vbTarget.current = focusRect(focus, side, aspect)
    else fitWhole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect])
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const c = vbCur.current
      const t = vbTarget.current
      const k = reduced() ? 1 : 0.16
      const d = Math.abs(c.x - t.x) + Math.abs(c.y - t.y) + Math.abs(c.w - t.w) + Math.abs(c.h - t.h)
      if (d > 0.002) {
        const n = { x: c.x + (t.x - c.x) * k, y: c.y + (t.y - c.y) * k, w: c.w + (t.w - c.w) * k, h: c.h + (t.h - c.h) * k }
        vbCur.current = d < 0.02 ? { ...t } : n
        setVb(vbCur.current)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* ---------- mm <-> stage px ---------- */
  const scale = Math.min(L.board.w / vb.w, L.board.h / vb.h)
  const offX = L.board.x + (L.board.w - vb.w * scale) / 2
  const offY = L.board.y + (L.board.h - vb.h * scale) / 2
  const toPx = (p: V2, s: Side = side): V2 => {
    const X = s === 'bottom' ? BW - p[0] : p[0]
    return [offX + (X - vb.x) * scale, offY + (p[1] - vb.y) * scale]
  }
  const toMm = (clientX: number, clientY: number): V2 => {
    const r = stageRef.current!.getBoundingClientRect()
    const X = vb.x + (clientX - r.left - offX) / scale
    const Y = vb.y + (clientY - r.top - offY) / scale
    return [side === 'bottom' ? BW - X : X, Y]
  }
  const stagePx = (clientX: number, clientY: number): V2 => {
    const r = stageRef.current!.getBoundingClientRect()
    return [clientX - r.left, clientY - r.top]
  }

  /* ---------- derived ---------- */
  const done = allSoldered(asm)
  const bridgeOn = bridge === 'on' || bridge === 'fading'
  const H = useMemo(() => health(asm, bridge === 'on'), [asm, bridge])
  const E = electrical(H, sup, now)
  const powered = sup.on && E.v > 0.5

  const flash = useCallback((text: string, tone?: 'good' | 'warn' | 'bad', ms = 3800) => {
    setMsg({ text, tone })
    const id = window.setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), ms)
    timers.current.push(id)
  }, [])

  /* ---------- clock (instruments) ---------- */
  useEffect(() => {
    if (phase !== 'test' && phase !== 'power') return
    const t0 = performance.now() - now * 1000
    const id = window.setInterval(() => setNow((performance.now() - t0) / 1000), 50)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* ---------- missions ---------- */
  useEffect(() => {
    if (done && !orderBroken && order.length === PARTS.length) mission.complete('order')
  }, [done, orderBroken, order, mission])

  // blink detection
  const lastNow = useRef(now)
  useEffect(() => {
    const dt = now - lastNow.current
    lastNow.current = now
    const ok = sup.on && H.oscillates && H.ledPath && !E.cc && Math.abs(sup.vset - 5) <= 0.21
    if (ok && dt > 0 && dt < 0.5) blinkTime.current += dt
    if (!ok) blinkTime.current = 0
    if (blinkTime.current > 1.3 && !blinked) {
      if (sup.ilim <= 0.1001 && shortOk) {
        setBlinked(true)
        mission.complete('blink')
        if (fault) {
          flash('Fixed it! That is exactly how real debugging goes: measure, find, fix.', 'good', 5000)
          setFault(null)
        } else flash('It blinks! About 1.5 times a second. Your first board is alive.', 'good', 5000)
      }
    }
  }, [now, sup, H, E.cc, blinked, shortOk, mission, flash, fault])

  /* ---------- assembly actions ---------- */
  const nextTierBlocked = (ref: string) => PARTS.some((p) => !asm[p.ref].placed && p.ref !== ref && TIER[p.ref] < TIER[ref])

  const place = (ref: string, reversed: boolean) => {
    const part = partByRef(ref)
    if (nextTierBlocked(ref)) {
      setOrderBroken(true)
      flash(
        ref === 'J1'
          ? 'The header is the tallest part: with it on, your iron can’t reach the small parts. Smallest first!'
          : 'Taller part before the small ones: it will get in the way of your iron. Smallest and lowest first!',
        'warn',
        5200,
      )
    }
    setAsm((a) => ({ ...a, [ref]: { ...a[ref], placed: true, reversed } }))
    setOrder((o) => (o.includes(ref) ? o : [...o, ref]))
    setDropping(ref)
    later(() => setDropping((d) => (d === ref ? null : d)), 600)
    zoomTo(ref, 'top')
    later(() => {
      const fr = focusRect(ref, 'top', aspect)
      const sc = Math.min(L.board.w / fr.w, L.board.h / fr.h)
      const px: V2 = [L.board.x + (L.board.w - fr.w * sc) / 2 + (part.x - fr.x) * sc, L.board.y + (L.board.h - fr.h * sc) / 2 + (part.y - fr.y) * sc]
      setTweez({ p: px, k: Date.now() })
    }, 280)
    later(() => setTweez(null), 1250)
    if (ref === 'U1') flash('Tack one corner pin, check the chip is straight, then drag along each row of pins.', undefined, 5200)
    else if (ref === 'J1') flash('Through-hole part: flip the board and solder the pins from underneath. Click J1.', undefined, 5200)
    else if (!nextTierBlocked(ref)) flash(`${ref} placed. Solder both ends: click each pad, or drag across them.`)
  }

  const solder = (key: string, at: V2, instant: boolean) => {
    const [ref, n] = key.split('.')
    const st = asm[ref]
    if (!st.placed) return
    const j = st.joints[n]
    if (j === 'good') return
    if (sup.on) {
      flash('Switch the power off before you touch the board with the iron!', 'bad')
      return
    }
    const nextJoints = { ...st.joints, [n]: 'good' as const }
    const next = { ...asm, [ref]: { ...st, joints: nextJoints } }
    setAsm(next)
    setFresh((f) => [...f, key])
    later(() => setFresh((f) => f.filter((k) => k !== key)), 900)
    setIron({ p: at, press: true, instant })
    later(() => setIron((i) => (i ? { ...i, press: false } : i)), 380)
    const id = Date.now() + Math.random()
    setPuffs((p) => [...p, { id, p: at }])
    later(() => setPuffs((p) => p.filter((q) => q.id !== id)), 1400)
    setWire({ p: at, k: id })
    later(() => setWire((w) => (w?.k === id ? null : w)), 420)
    if (j === 'cold' || j === 'lifted') flash(`Reflowed ${padLabel(key)} with fresh solder and flux. Now it’s shiny.`, 'good')
    // the classic drag-soldering mistake: a bridge between pins 7 and 8
    if (ref === 'U1' && bridge === 'none' && nextJoints['7'] === 'good' && nextJoints['8'] === 'good') {
      setBridge('on')
      later(() => flash('Row done. Drag-soldering often leaves a bridge: always inspect before powering up.', 'warn', 5200), 600)
    }
    if (isSoldered(next[ref])) {
      if (ref === 'J1') later(() => doFlip('top', 'J1'), 800)
      else
        later(() => {
          setFocus((f) => {
            if (f === ref) {
              fitWhole()
              return null
            }
            return f
          })
        }, 900)
      if (allSoldered(next)) later(() => flash('Everything is soldered. Next: inspect your work (step 2).', 'good', 5200), 1000)
    }
  }

  const doFlip = (to: Side, ref?: string) => {
    if (flip !== 'none' || to === side) return
    setFlip('out')
    later(() => {
      setSide(to)
      if (ref) vbTarget.current = focusRect(ref, to, aspect)
      vbCur.current = vbTarget.current
      setVb(vbTarget.current)
      setFlip('in')
    }, reduced() ? 0 : 260)
    later(() => setFlip('none'), reduced() ? 0 : 560)
  }

  const applyWick = (p: V2, at: V2) => {
    if (bridge !== 'on' || Math.hypot(p[0] - BRIDGE_AT[0], p[1] - BRIDGE_AT[1]) > 1.6) {
      flash('Solder wick soaks up excess solder. Nothing to soak up here.')
      setWick({ p: at, used: false })
      later(() => setWick(null), 900)
      return
    }
    if (sup.on) {
      flash('Switch the power off before you touch the board with the iron!', 'bad')
      return
    }
    setWick({ p: at, used: false })
    setIron({ p: at, press: true, instant: false })
    later(() => {
      setWick({ p: at, used: true })
      setBridge('fading')
    }, 500)
    later(() => {
      setBridge('gone')
      setIron((i) => (i ? { ...i, press: false } : i))
      mission.complete('bridge')
      flash('Bridge gone: the copper braid wicked the extra solder away. Pins 7 and 8 are separate again.', 'good', 5000)
    }, 1300)
    later(() => setWick(null), 2000)
  }

  const freshBoard = () => {
    setAsm(freshAssembly())
    setOrder([])
    setOrderBroken(false)
    setBridge('none')
    setSide('top')
    setFault(null)
    setSup((s) => ({ ...s, on: false }))
    setShortOk(false)
    setBlinked(false)
    setVisited([])
    setProbes({ red: { pad: null, drag: null }, black: { pad: null, drag: null } })
    fitWhole()
    setPhase('assemble')
    flash('A fresh board from the bag (you ordered five!). Smallest parts first.')
  }

  const breakIt = () => {
    const f = FAULTS[faultIdx.current % FAULTS.length]
    faultIdx.current++
    setAsm((a) => applyFault(a, f))
    setFault(f)
    setBlinked(false)
    setSup((s) => ({ ...s, on: false }))
    flash('A board from a friend arrived “dead”. Power it up, then use the checklist to find the fault.', 'warn', 5200)
  }

  /* ---------- board pointer handling ---------- */
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (dialog || flip !== 'none') return
    const p = toMm(e.clientX, e.clientY)
    const at = stagePx(e.clientX, e.clientY)
    if (phase === 'test' || phase === 'power') {
      const part = partAt(p)
      if (part) zoomTo(part.ref)
      return
    }
    if (tool === 'loupe') {
      dragging.current = 'loupe'
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      setLoupe(p)
      return
    }
    if (tool === 'wick') {
      applyWick(p, at)
      return
    }
    // iron / tweezers
    if (side === 'bottom') {
      const key = padAt(p, 0.45, ['J1'])
      if (key) {
        const pad = padByKey(key)
        solder(key, toPx([pad.x, pad.y]), false)
      } else if (!partAt(p)) doFlip('top')
      return
    }
    if (bridge === 'on' && Math.hypot(p[0] - BRIDGE_AT[0], p[1] - BRIDGE_AT[1]) < 0.7) {
      flash('Dragging the iron through a bridge just pushes the solder around. Use solder wick (and a dab of flux).', 'warn', 5200)
      return
    }
    const part = partAt(p)
    if (!part) {
      if (focus) {
        fitWhole()
      }
      return
    }
    const st = asm[part.ref]
    if (!st.placed) {
      if (sup.on) {
        flash('Switch the power off first.', 'bad')
        return
      }
      if (part.ref === 'D1') {
        zoomTo('D1', 'top')
        setDialog('led')
      } else place(part.ref, false)
      return
    }
    if (part.ref === 'J1') {
      if (!isSoldered(st) || Object.values(st.joints).some((j) => j !== 'good')) doFlip('bottom', 'J1')
      else zoomTo('J1')
      return
    }
    if (focus !== part.ref) zoomTo(part.ref)
    const key = padAt(p, 0.3, [part.ref])
    if (key) {
      const j = st.joints[key.split('.')[1]]
      if (j !== 'good') {
        const pad = padByKey(key)
        solder(key, toPx([pad.x, pad.y]), false)
        dragging.current = 'iron'
        ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
        return
      }
    }
    if (part.ref === 'D1' && isSoldered(st)) {
      if (sup.on) flash('Switch the power off first.', 'bad')
      else setDialog('turn')
      return
    }
    dragging.current = 'iron'
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = toMm(e.clientX, e.clientY)
    if (tool === 'loupe' && (phase === 'assemble' || phase === 'inspect')) {
      if (e.pointerType === 'mouse' || dragging.current === 'loupe') setLoupe(p)
    }
    if (dragging.current === 'iron' && side === 'top') {
      const at = stagePx(e.clientX, e.clientY)
      setIron({ p: at, press: true, instant: true })
      const key = padAt(p, 0.12, PARTS.filter((q) => asm[q.ref].placed && q.ref !== 'J1').map((q) => q.ref))
      if (key) {
        const [ref, n] = key.split('.')
        if (asm[ref].joints[n] !== 'good') solder(key, at, true)
      }
    }
    if (e.pointerType === 'mouse' && !dragging.current) {
      const part = side === 'top' ? partAt(p) : null
      setHover(part?.ref ?? null)
    }
  }
  const onUp = () => {
    if (dragging.current === 'iron') setIron((i) => (i ? { ...i, press: false, instant: false } : i))
    dragging.current = null
  }

  // loupe visits (inspection)
  useEffect(() => {
    if (!loupe || phase !== 'inspect') return
    const near = PARTS.filter((p) => Math.hypot(p.x - loupe[0], p.y - loupe[1]) < 3.2).map((p) => p.ref)
    if (Math.hypot(loupe[0] - BRIDGE_AT[0], loupe[1] - BRIDGE_AT[1]) < 2.2) near.push('U1-right')
    if (near.some((r) => !visited.includes(r))) setVisited((v) => [...new Set([...v, ...near])])
  }, [loupe, phase, visited])

  /* ---------- probes ---------- */
  const probeDrag = useRef<{ c: 'red' | 'black'; dx: number; dy: number } | null>(null)
  const onProbeDown = (c: 'red' | 'black') => (e: RPointerEvent<SVGGElement>) => {
    e.stopPropagation()
    ;(e.currentTarget as SVGGElement).setPointerCapture(e.pointerId)
    const at = stagePx(e.clientX, e.clientY)
    const tip = probeTip(c)
    probeDrag.current = { c, dx: tip[0] - at[0], dy: tip[1] - at[1] }
    if (e.pointerType === 'touch') probeDrag.current = { c, dx: -6, dy: -34 }
    setProbes((p) => ({ ...p, [c]: { pad: null, drag: [at[0] + probeDrag.current!.dx, at[1] + probeDrag.current!.dy] } }))
  }
  const onProbeMove = (e: RPointerEvent<SVGGElement>) => {
    const d = probeDrag.current
    if (!d) return
    const at = stagePx(e.clientX, e.clientY)
    setProbes((p) => ({ ...p, [d.c]: { pad: null, drag: [at[0] + d.dx, at[1] + d.dy] } }))
  }
  const onProbeUp = (e: RPointerEvent<SVGGElement>) => {
    const d = probeDrag.current
    if (!d) return
    probeDrag.current = null
    const at = stagePx(e.clientX, e.clientY)
    const tip: V2 = [at[0] + d.dx, at[1] + d.dy]
    const r = stageRef.current!.getBoundingClientRect()
    const mm = toMm(tip[0] + r.left, tip[1] + r.top)
    const placedRefs = PARTS.filter((q) => asm[q.ref].placed).map((q) => q.ref)
    const key = nearestPad(mm, Math.max(0.9, 16 / scale), placedRefs)
    setProbes((p) => ({ ...p, [d.c]: { pad: key, drag: null } }))
    probesAt.current = performance.now()
    if (key && side === 'bottom') doFlip('top')
  }
  const probeTip = (c: 'red' | 'black'): V2 => {
    const pr = probes[c]
    if (pr.drag) return pr.drag
    if (pr.pad) {
      const pad = padByKey(pr.pad)
      return toPx([pad.x, pad.y], 'top')
    }
    return L.rest[c]
  }

  /* ---------- meter reading ---------- */
  const since = (performance.now() - probesAt.current) / 1000
  const rp = probes.red.pad
  const bp = probes.black.pad
  const tq = Math.floor(now / 0.35) * 0.35
  let mText = ''
  let mUnit = ''
  let beep = false
  let mTag: string | undefined
  if (mmode === 'v') {
    mUnit = 'V'
    if (rp && bp && powered) {
      const Eq = electrical(H, sup, tq)
      const v = voltageAt(rp, asm, H, Eq, tq) - voltageAt(bp, asm, H, Eq, tq)
      mText = v.toFixed(2)
    } else mText = '0.00'
  } else if (mmode === 'ohm' || mmode === 'beep') {
    if (sup.on) {
      mText = 'OL'
      mUnit = mmode === 'ohm' ? 'Ω' : ''
      mTag = 'Turn the power off to measure Ω'
    } else if (rp && bp) {
      const r = resistance(rp, bp, asm, bridge === 'on', since)
      const f = formatOhms(r.ohms)
      mText = mmode === 'beep' ? (r.ohms !== null && r.ohms < 2000 ? f.text : 'OL') : f.text
      mUnit = mmode === 'beep' ? (r.ohms !== null && r.ohms < 2000 ? f.unit : '') : f.unit
      beep = mmode === 'beep' && r.beep
    } else {
      mText = 'OL'
      mUnit = mmode === 'ohm' ? 'MΩ' : ''
    }
  }
  if (rp && bp && mmode !== 'off' && !mTag) mTag = `${padLabel(rp).split(' · ')[0]} ↔ ${padLabel(bp).split(' · ')[0]}`
  useBeep(beep && (phase === 'test' || phase === 'power'))

  // record voltage measurements for the debug checklist
  useEffect(() => {
    if (mmode !== 'v' || !rp || !bp || !powered) return
    const bn = netOf(bp, asm, bridge === 'on')
    if (bn !== 'GND') return
    const v = parseFloat(mText)
    setMeasured((m) => (m[rp] === v ? m : { ...m, [rp]: v, [`${rp}@`]: Math.max(m[`${rp}@`] ?? 0, v), [`${rp}_`]: Math.min(m[`${rp}_`] ?? 99, v) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mText, rp, bp, mmode, powered])

  // the short-circuit check
  useEffect(() => {
    if (shortOk || sup.on || !done || !rp || !bp) return
    if (mmode !== 'ohm' && mmode !== 'beep') return
    const nets = [netOf(rp, asm, bridge === 'on'), netOf(bp, asm, bridge === 'on')].sort().join('-')
    if (nets !== 'GND-VCC' || beep) return
    if (since > (mmode === 'beep' ? 0.9 : 2.2)) {
      setShortOk(true)
      mission.complete('short')
      flash('No short between +5 V and GND. Safe to power up (step 4).', 'good', 5000)
    }
  }, [now, shortOk, sup.on, done, rp, bp, mmode, asm, bridge, beep, since, mission, flash])

  /* ---------- supply ---------- */
  const toggleOutput = () => {
    if (sup.on) {
      setSup((s) => ({ ...s, on: false }))
      return
    }
    if (!done) return flash('Finish soldering every part first.', 'warn')
    if (!shortOk) return flash('Do the short-circuit check first (step 3): +5 V to GND should not beep.', 'warn', 5000)
    if (sup.vset < 4.5) return flash('Set the voltage to 5.0 V first (drag the VOLTAGE knob up).', 'warn')
    if (sup.vset > 5.5) return flash('Blinky is designed for 5 V. Turn the voltage down to 5.0 V.', 'warn')
    if (sup.ilim > 0.1) flash('Tip: set a low current limit first, about 0.05 A. If something is shorted, the supply limits the damage.', 'warn', 5200)
    setSup((s) => ({ ...s, on: true }))
    blinkTime.current = 0
  }

  /* ---------- rendering pieces ---------- */
  const conn = useMemo(() => analyze(stages.finished()), [])
  const doc = useMemo(() => stages.finished(), [])
  const base = useMemo(
    () => <BoardView doc={doc} conn={conn} mode="real" side={side} maskColor="green" finish="hasl" vis={{ bodies: false, ratsnest: false }} />,
    [doc, conn, side],
  )

  const ledOn = E.ledOn && side === 'top'
  const flipT = side === 'bottom' ? `translate(${BW} 0) scale(-1 1)` : undefined
  const freshOf = (ref: string) => fresh.filter((k) => k.startsWith(ref + '.')).map((k) => k.split('.')[1])

  const partsLayer = (
    <g transform={flipT}>
      {side === 'top' && phase === 'assemble' &&
        PARTS.filter((p) => !asm[p.ref].placed).map((p) => {
          const fp = getFootprint(p.fp)
          const hot = hover === p.ref || focus === p.ref
          return (
            <g key={`t${p.ref}`} transform={partTransform(p)} className="l17-target">
              <rect
                x={-fp.courtyard.w}
                y={-fp.courtyard.h}
                width={fp.courtyard.w * 2}
                height={fp.courtyard.h * 2}
                rx={0.35}
                fill={hot ? 'rgba(255,190,90,0.22)' : 'rgba(255,190,90,0.08)'}
                stroke="#ffc46b"
                strokeWidth={hot ? 0.14 : 0.09}
                strokeDasharray="0.45 0.3"
              />
            </g>
          )
        })}
      {PARTS.map((p) => {
        const st = asm[p.ref]
        if (!st.placed) return null
        const fp = getFootprint(p.fp)
        const tr = partTransform(p) + (st.reversed ? ' rotate(180)' : '')
        let body: ReactNode = null
        if (side === 'bottom') {
          if (p.ref !== 'J1') return null
          body = <HeaderBottom fp={fp} joints={st.joints} fresh={freshOf('J1')} />
        } else if (fp.body.kind === 'chip') body = <ChipTop fp={fp} value={p.value} isCap={p.ref.startsWith('C')} joints={st.joints} fresh={freshOf(p.ref)} />
        else if (fp.body.kind === 'led-chip') {
          const joints = st.reversed ? { '1': st.joints['2'], '2': st.joints['1'] } : st.joints
          body = <LedTop fp={fp} joints={joints} on={ledOn} fresh={freshOf(p.ref)} />
        } else if (fp.body.kind === 'soic') body = <SoicTop fp={fp} value={p.value} joints={st.joints} fresh={freshOf(p.ref)} />
        else if (fp.body.kind === 'header') body = <HeaderTop fp={fp} />
        return (
          <g key={p.ref} transform={tr}>
            <g className={dropping === p.ref ? 'l17-drop' : undefined}>{body}</g>
          </g>
        )
      })}
      {side === 'top' && bridgeOn && (
        <g transform={partTransform(partByRef('U1'))}>
          <Bridge y1={-1.905} y2={-0.635} fading={bridge === 'fading'} />
        </g>
      )}
      {side === 'top' && (
        <g className="l17-ledglow" style={{ opacity: ledOn ? 1 : 0 }}>
          <circle cx={12} cy={21} r={6.5} fill="url(#l17-glow)" style={{ mixBlendMode: 'screen' }} />
          <circle cx={12} cy={21} r={2.2} fill="url(#l17-glow)" style={{ mixBlendMode: 'screen' }} />
        </g>
      )}
    </g>
  )

  // loupe (inspection magnifier)
  const loupeR = 64 / scale
  const showLoupe = loupe && tool === 'loupe' && (phase === 'assemble' || phase === 'inspect')
  const loupeEl = showLoupe ? (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <clipPath id="l17-loupeclip" clipPathUnits="userSpaceOnUse">
          <circle cx={side === 'bottom' ? BW - loupe[0] : loupe[0]} cy={loupe[1]} r={loupeR} />
        </clipPath>
      </defs>
      <circle cx={(side === 'bottom' ? BW - loupe[0] : loupe[0]) + loupeR * 0.08} cy={loupe[1] + loupeR * 0.14} r={loupeR * 1.04} fill="#000" opacity={0.35} filter="url(#l17-blur2)" />
      <g clipPath="url(#l17-loupeclip)">
        <rect x={-50} y={-50} width={140} height={140} fill="#14261b" />
        <g transform={`translate(${side === 'bottom' ? BW - loupe[0] : loupe[0]} ${loupe[1]}) scale(2.6) translate(${-(side === 'bottom' ? BW - loupe[0] : loupe[0])} ${-loupe[1]})`}>
          {base}
          {partsLayer}
        </g>
        <circle cx={(side === 'bottom' ? BW - loupe[0] : loupe[0]) - loupeR * 0.35} cy={loupe[1] - loupeR * 0.45} r={loupeR * 0.5} fill="#fff" opacity={0.08} />
      </g>
      <circle cx={side === 'bottom' ? BW - loupe[0] : loupe[0]} cy={loupe[1]} r={loupeR} fill="none" stroke="#1d1e22" strokeWidth={loupeR * 0.12} />
      <circle cx={side === 'bottom' ? BW - loupe[0] : loupe[0]} cy={loupe[1]} r={loupeR * 1.03} fill="none" stroke="#9aa1a8" strokeWidth={loupeR * 0.04} />
      <circle cx={side === 'bottom' ? BW - loupe[0] : loupe[0]} cy={loupe[1]} r={loupeR * 0.95} fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={loupeR * 0.02} />
    </g>
  ) : null

  /* ---------- coach text ---------- */
  const coach = (() => {
    if (msg) return msg
    if (phase === 'assemble') {
      if (side === 'bottom') return { text: 'Underside view. Click each header pin to solder it from below.' }
      if (done) return { text: 'All parts soldered. On to step 2: inspect.' }
      if (order.length === 0) return { text: 'Click a footprint to place its part. Start with the smallest, lowest parts.' }
      return { text: 'Click a pad to solder it, or drag the iron across pads.' }
    }
    if (phase === 'inspect') return { text: tool === 'loupe' ? 'Move the magnifier over the joints. Look for dull joints and solder bridges.' : tool === 'wick' ? 'Press the wick onto a bridge to soak the solder up.' : 'Click a dull joint to reflow it.' }
    if (phase === 'test') return { text: shortOk ? 'Short check passed.' : 'Dial to Ω or •))), then drag the red and black probes onto +5V and GND.' }
    return { text: blinked ? 'Blinky is blinking at about 1.5 Hz.' : 'Set 5.0 V and a low current limit, then press OUTPUT.' }
  })()

  const showTools = phase === 'assemble' || phase === 'inspect'
  const ironRest: V2 = [L.board.x + L.board.w - 30, L.board.y + L.board.h + 26]

  /* ---------- inspection checks ---------- */
  const anyBad = Object.values(asm).some((s) => Object.values(s.joints).some((j) => j === 'cold' || j === 'lifted'))
  const inspect = [
    { id: 'joints', label: 'Joints shiny and smooth', seen: visited.filter((v) => v !== 'U1-right').length >= 4, ok: !anyBad, bad: 'A dull, grainy joint: reflow it with the iron.' },
    { id: 'bridge', label: 'No solder bridges on U1', seen: visited.includes('U1-right'), ok: bridge !== 'on', bad: 'Bridge between U1 pins 7 and 8! Use the wick.' },
    { id: 'pin1', label: 'U1 pin-1 dot matches the silkscreen', seen: visited.includes('U1'), ok: true, bad: '' },
    { id: 'led', label: 'LED cathode mark matches the bar', seen: visited.includes('D1'), ok: !asm.D1.reversed, bad: 'D1 is backwards: the green mark is on the wrong end.' },
  ]

  /* ---------- debug checklist ---------- */
  const mv = (k: string) => measured[k]
  const debugRows = [
    { id: 'cc', label: 'Supply not in current limit (CC)', state: !sup.on ? null : E.cc ? false : true, hint: E.cc ? 'CC is lit: something draws too much current. Power off and look for a short or bridge.' : 'Power on to check.' },
    { id: 'j1', label: '5 V at J1 (+5V to GND)', state: mv('J1.1') === undefined ? null : mv('J1.1') > 4.7, hint: mv('J1.1') !== undefined ? `Measured ${mv('J1.1').toFixed(2)} V` : 'Meter on V⎓, black on GND, red on J1 +5V.' },
    { id: 'u8', label: '5 V at U1 pin 8 (VCC)', state: mv('U1.8') === undefined ? null : mv('U1.8') > 4.7, hint: mv('U1.8') !== undefined ? `Measured ${mv('U1.8').toFixed(2)} V${mv('U1.8') < 4.7 ? ': the chip is not getting power. Inspect pin 8.' : ''}` : 'Red probe on U1 pin 8.' },
    { id: 'u4', label: 'RESET (U1 pin 4) at 5 V', state: mv('U1.4') === undefined ? null : mv('U1.4') > 4.7, hint: mv('U1.4') !== undefined ? `Measured ${mv('U1.4').toFixed(2)} V${mv('U1.4') < 4.7 ? ': RESET is low, so the chip is held in reset. Inspect pin 4.' : ''}` : 'Red probe on U1 pin 4.' },
    { id: 'u3', label: 'OUT (U1 pin 3) switching', state: mv('U1.3@') === undefined ? null : mv('U1.3@') - (mv('U1.3_') ?? 0) > 1, hint: mv('U1.3@') !== undefined ? (mv('U1.3@') - (mv('U1.3_') ?? 0) > 1 ? 'Switching between about 0 V and 3.6 V. The chip works, so check the LED path.' : 'Stuck: the timer is not running.') : 'Red probe on U1 pin 3; watch the reading change.' },
    { id: 'led', label: 'LED the right way round', state: null as boolean | null, hint: 'Compare the LED’s green cathode mark with the bar on the silkscreen.' },
  ]

  return (
    <div className="l17-scene" ref={stageRef}>
      {/* the bench mat */}
      <div className="l17-mat" aria-hidden />

      {/* board */}
      <div
        ref={boardRef}
        className={`l17-board ${flip !== 'none' ? `is-flip-${flip}` : ''} ${phase === 'test' || phase === 'power' ? 'is-probe' : ''} tool-${tool}`}
        style={{ left: L.board.x, top: L.board.y, width: L.board.w, height: L.board.h }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => {
          setHover(null)
          if (!dragging.current && tool === 'loupe') setLoupe(null)
        }}
      >
        <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width="100%" height="100%" aria-label="Blinky board on the workbench">
          <ArtDefs />
          <rect x={0.3} y={0.9} width={BW} height={BH} rx={1.5} fill="#000" opacity={0.28} filter="url(#l17-blur2)" transform={side === 'bottom' ? `translate(${-0.6} 0)` : undefined} />
          {base}
          {partsLayer}
          {loupeEl}
        </svg>
      </div>

      {/* overlay: tools, probes, cables */}
      <svg className="l17-overlay" width={size.w} height={size.h} aria-hidden={false}>
        <ToolDefs />
        {/* supply leads to J1 */}
        {L.supply && phase === 'power' && side === 'top' && (
          <g style={{ pointerEvents: 'none' }}>
            {(['pos', 'neg'] as const).map((k) => {
              const post = SUPPLY_POSTS[k]
              const a: V2 = [L.supply!.x + post[0] * L.supply!.s, L.supply!.y + post[1] * L.supply!.s]
              const pad = padByKey(k === 'pos' ? 'J1.1' : 'J1.2')
              const b = toPx([pad.x, pad.y])
              const col = k === 'pos' ? '#d0321f' : '#1d1d20'
              const d = `M ${a[0]} ${a[1]} C ${a[0]} ${a[1] + 120} ${b[0] - 90} ${b[1] + 60} ${b[0]} ${b[1]}`
              return (
                <g key={k}>
                  <path d={d} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={6} transform="translate(3 6)" />
                  <path d={d} fill="none" stroke={col} strokeWidth={4.5} strokeLinecap="round" />
                  <path d={d} fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={1.3} strokeLinecap="round" />
                  <circle cx={b[0]} cy={b[1]} r={7} fill={col} stroke="#fff" strokeOpacity={0.4} />
                  <circle cx={b[0] - 2} cy={b[1] - 2} r={2} fill="#fff" opacity={0.4} />
                </g>
              )
            })}
          </g>
        )}
        {/* probes + cables */}
        {L.meter &&
          (['black', 'red'] as const).map((c) => {
            const tip = probeTip(c)
            const angle = c === 'red' ? 52 : 118
            const [tx, ty] = probeTail(angle)
            const tail: V2 = [tip[0] + tx, tip[1] + ty]
            const jack = METER_JACKS[c === 'red' ? 'v' : 'com']
            const j: V2 = [L.meter!.x + jack[0] * L.meter!.s, L.meter!.y + jack[1] * L.meter!.s]
            const sag = 90
            const d = `M ${tail[0]} ${tail[1]} C ${tail[0] + Math.cos((angle * Math.PI) / 180) * 60} ${tail[1] + sag} ${j[0]} ${j[1] + sag} ${j[0]} ${j[1]}`
            const col = c === 'red' ? '#c62d1f' : '#1b1b1d'
            const onPad = probes[c].pad
            return (
              <g key={c}>
                <path d={d} fill="none" stroke="#000" strokeOpacity={0.15} strokeWidth={5} transform="translate(3 6)" style={{ pointerEvents: 'none' }} />
                <path d={d} fill="none" stroke={col} strokeWidth={3.6} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                <path d={d} fill="none" stroke="#fff" strokeOpacity={0.22} strokeWidth={1} style={{ pointerEvents: 'none' }} />
                <g
                  transform={`translate(${tip[0]} ${tip[1]})`}
                  className="l17-probe"
                  role="button"
                  aria-label={`${c} probe${onPad ? ` on ${padLabel(onPad)}` : ''}`}
                  onPointerDown={onProbeDown(c)}
                  onPointerMove={onProbeMove}
                  onPointerUp={onProbeUp}
                  onPointerCancel={onProbeUp}
                >
                  <Probe color={c} angle={angle} active={!!onPad} />
                  <circle r={22} cx={Math.cos((angle * Math.PI) / 180) * 80} cy={Math.sin((angle * Math.PI) / 180) * 80} fill="transparent" />
                  <line x1={0} y1={0} x2={Math.cos((angle * Math.PI) / 180) * 130} y2={Math.sin((angle * Math.PI) / 180) * 130} stroke="transparent" strokeWidth={26} />
                </g>
                {onPad && (
                  <g transform={`translate(${tip[0]} ${tip[1]})`} style={{ pointerEvents: 'none' }}>
                    <rect x={c === 'red' ? 10 : -10 - padLabel(onPad).length * 6.1} y={-30} width={padLabel(onPad).length * 6.1 + 10} height={18} rx={5} fill="rgba(20,20,22,0.82)" />
                    <text x={c === 'red' ? 15 : -15} y={-17.5} fontSize={10.5} fill="#fff" textAnchor={c === 'red' ? 'start' : 'end'} fontFamily="IBM Plex Mono, monospace">
                      {padLabel(onPad)}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        {/* drag hint: nearest pad ring while dragging a probe */}
        {(['red', 'black'] as const).map((c) => {
          const d = probes[c].drag
          if (!d) return null
          const r = stageRef.current?.getBoundingClientRect()
          if (!r) return null
          const mm = toMm(d[0] + r.left, d[1] + r.top)
          const key = nearestPad(mm, Math.max(0.9, 16 / scale), PARTS.filter((q) => asm[q.ref].placed).map((q) => q.ref))
          if (!key) return null
          const pad = padByKey(key)
          const px = toPx([pad.x, pad.y], 'top')
          return (
            <g key={`h${c}`} style={{ pointerEvents: 'none' }}>
              <circle cx={px[0]} cy={px[1]} r={11} fill="none" stroke="#ffd166" strokeWidth={2} />
              <text x={px[0]} y={px[1] - 17} fontSize={11} textAnchor="middle" fill="#fff" stroke="#000" strokeWidth={3} paintOrder="stroke" fontFamily="IBM Plex Mono, monospace">
                {padLabel(key)}
              </text>
            </g>
          )
        })}
        {/* tweezers */}
        {tweez && (
          <g key={tweez.k} style={{ transform: `translate(${tweez.p[0]}px, ${tweez.p[1]}px)` }}>
            <g className="l17-tweezers">
              <Tweezers />
            </g>
          </g>
        )}
        {/* wick */}
        {wick && (
          <g style={{ transform: `translate(${wick.p[0]}px, ${wick.p[1]}px)` }} className="l17-wickin">
            <Wick used={wick.used} />
          </g>
        )}
        {/* solder wire */}
        {wire && (
          <g key={wire.k} style={{ transform: `translate(${wire.p[0]}px, ${wire.p[1]}px)` }} className="l17-wire">
            <SolderWire />
          </g>
        )}
        {/* iron */}
        {showTools && tool !== 'loupe' && (
          <g
            className={`l17-iron ${iron?.instant ? 'is-instant' : ''}`}
            style={{ transform: `translate(${(iron?.p ?? ironRest)[0]}px, ${(iron?.p ?? ironRest)[1] + (iron?.press ? 1.5 : iron ? -10 : 0)}px)` }}
          >
            <Iron />
          </g>
        )}
      </svg>

      {/* flux smoke */}
      {puffs.map((p) => (
        <span key={p.id} className="l17-puff" style={{ left: p.p[0], top: p.p[1] }} aria-hidden>
          <i />
          <i />
          <i />
        </span>
      ))}

      {/* instruments */}
      {L.meter && (
        <div className="l17-inst" style={{ left: L.meter.x, top: L.meter.y, width: L.meter.w, height: L.meter.h }}>
          <Meter mode={mmode} onMode={setMmode} text={mText} unit={mUnit} beep={beep} tag={mTag} />
        </div>
      )}
      {L.supply && (
        <div className="l17-inst" style={{ left: L.supply.x, top: L.supply.y, width: L.supply.w, height: L.supply.h }}>
          <Supply
            on={sup.on}
            vset={sup.vset}
            ilim={sup.ilim}
            vout={E.v}
            iout={E.i}
            cc={E.cc}
            onV={(v) => setSup((s) => ({ ...s, vset: v }))}
            onI={(v) => setSup((s) => ({ ...s, ilim: v }))}
            onToggle={toggleOutput}
            locked={!shortOk || !done}
          />
        </div>
      )}

      {/* tool palette */}
      <div className="l17-palette" style={{ left: L.palette.x, top: L.palette.y }} onPointerDown={(e) => e.stopPropagation()}>
        {showTools && (
          <>
            <button className={`l17-pal ${tool === 'iron' ? 'is-on' : ''}`} onClick={() => setTool('iron')} aria-label="Soldering iron and tweezers" title="Iron & tweezers">
              <IcoIron />
            </button>
            <button className={`l17-pal ${tool === 'wick' ? 'is-on' : ''}`} onClick={() => setTool('wick')} aria-label="Solder wick" title="Solder wick">
              <IcoWick />
            </button>
            <button className={`l17-pal ${tool === 'loupe' ? 'is-on' : ''}`} onClick={() => setTool('loupe')} aria-label="Magnifier" title="Magnifier">
              <IcoLoupe />
            </button>
            <span className="l17-pal__sep" />
          </>
        )}
        <button className="l17-pal" onClick={() => (side === 'bottom' ? doFlip('top') : fitWhole())} aria-label="Show the whole board" title="Whole board">
          <IcoFit />
        </button>
        {asm.J1.placed && showTools && (
          <button className={`l17-pal ${side === 'bottom' ? 'is-on' : ''}`} onClick={() => doFlip(side === 'top' ? 'bottom' : 'top', 'J1')} aria-label="Flip the board" title="Flip board">
            <IcoFlip />
          </button>
        )}
        {(phase === 'test' || phase === 'power') && (
          <button className={`l17-pal l17-pal--txt ${focus === 'U1' ? 'is-on' : ''}`} onClick={() => (focus === 'U1' ? fitWhole() : zoomTo('U1', 'top'))} aria-label="Zoom to U1">
            U1
          </button>
        )}
      </div>

      {/* coach line */}
      <div
        className={`l17-coach ${coach.tone ? `is-${coach.tone}` : ''}`}
        style={L.mobile ? { left: 8, right: 8, top: 52 } : { left: L.board.x + 8, width: L.board.w - 16, top: L.board.y + 2 }}
        role="status"
      >
        <span key={coach.text}>{coach.text}</span>
      </div>

      {/* LED orientation / turn-around dialogs */}
      {dialog && (
        <div className="l17-dialog-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <div className="l17-dialog" role="dialog" aria-label={dialog === 'led' ? 'Which way round?' : 'Turn D1 around?'}>
            {dialog === 'led' ? (
              <>
                <div className="l17-dialog__kicker mono">Polarity check</div>
                <b className="l17-dialog__title">Which way round does D1 go?</b>
                <p>LEDs only work one way. The bar on the silkscreen marks the cathode (−); the green line on the LED marks its cathode too.</p>
                <div className="l17-dialog__opts">
                  {[false, true].map((rev, i) => (
                    <button
                      key={i}
                      className="l17-ledopt"
                      onClick={() => {
                        setDialog(null)
                        place('D1', rev)
                      }}
                      aria-label={`Option ${i === 0 ? 'A' : 'B'}`}
                    >
                      <svg viewBox="-3 -2.2 6 4.4">
                        <ArtDefs />
                        <rect x={-3} y={-2.2} width={6} height={4.4} rx={0.4} fill={MASKS.green.mask} />
                        <FootprintSilk def={getFootprint('LED0805')} color={MASKS.green.silk} />
                        {getFootprint('LED0805').pads.map((pd) => (
                          <rect key={pd.num} x={pd.x - pd.w / 2} y={pd.y - pd.h / 2} width={pd.w} height={pd.h} rx={0.2} fill="#cfd3d8" />
                        ))}
                        <g transform={rev ? 'rotate(180)' : undefined}>
                          <LedTop fp={getFootprint('LED0805')} joints={{ '1': 'none', '2': 'none' }} on={false} />
                        </g>
                      </svg>
                      <span className="mono">Option {i === 0 ? 'A' : 'B'}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="l17-dialog__kicker mono">Rework</div>
                <b className="l17-dialog__title">Desolder D1 and turn it around?</b>
                <p>Heat both ends, lift it off with tweezers, rotate it 180° and solder it back. Only do this if the green mark is on the wrong end.</p>
                <div className="l17-dialog__row">
                  <Button
                    variant="accent"
                    onClick={() => {
                      setDialog(null)
                      setAsm((a) => ({ ...a, D1: { ...a.D1, reversed: !a.D1.reversed } }))
                      setFresh((f) => [...f, 'D1.1', 'D1.2'])
                      later(() => setFresh((f) => f.filter((k) => !k.startsWith('D1.'))), 900)
                      flash('D1 turned around and re-soldered.', 'good')
                    }}
                  >
                    Turn it around
                  </Button>
                  <Button variant="ghost" onClick={() => setDialog(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3D view */}
      {show3d && (
        <div className="l17-3d" onPointerDown={(e) => e.stopPropagation()}>
          <Suspense fallback={<div className="spinner" />}>
            <Board3D doc={doc} blink camera="ortho" autoRotate shadow quality="high" />
          </Suspense>
          <button className="l17-3d__close" onClick={() => setShow3d(false)}>
            Back to the bench
          </button>
          <div className="l17-3d__tag mono">Blinky · alive</div>
        </div>
      )}

      {/* control card */}
      <FloatingCard title="Workbench" subtitle={PHASE_SUB[phase]} width={256}>
        {phase === 'assemble' && (
          <>
            <div className="l17-tray" role="list">
              {TRAY.map((ref) => {
                const st = asm[ref]
                const solderedAll = isSoldered(st)
                return (
                  <button
                    key={ref}
                    role="listitem"
                    className={`l17-tray__item ${st.placed ? 'is-placed' : ''} ${solderedAll ? 'is-done' : ''} ${focus === ref ? 'is-focus' : ''}`}
                    onClick={() => {
                      if (side === 'bottom' && ref !== 'J1') doFlip('top')
                      zoomTo(ref, ref === 'J1' && side === 'bottom' ? 'bottom' : 'top')
                    }}
                  >
                    <span className="l17-tray__ref mono">{ref}</span>
                    <span className="l17-tray__desc">{DESCR[ref]}</span>
                    <span className="l17-tray__st">{solderedAll ? <IconCheck size={13} /> : st.placed ? '•' : ''}</span>
                  </button>
                )
              })}
            </div>
            {orderBroken && <div className="l17-note is-warn">Order mission needs a fresh board: smallest parts first.</div>}
            <Button size="sm" variant="ghost" onClick={freshBoard}>
              <IconReset size={14} /> Fresh board
            </Button>
          </>
        )}
        {phase === 'inspect' && (
          <div className="l17-checks">
            {inspect.map((c) => (
              <div key={c.id} className={`l17-check ${!c.seen ? '' : c.ok ? 'is-ok' : 'is-bad'}`}>
                <span className="l17-check__tick">{!c.seen ? '?' : c.ok ? <IconCheck size={12} /> : <IconX size={12} />}</span>
                <span>
                  {c.label}
                  {c.seen && !c.ok && <em>{c.bad}</em>}
                </span>
              </div>
            ))}
            <div className="l17-note">Use the magnifier on U1, D1 and a few passives to reveal each check.</div>
          </div>
        )}
        {phase === 'test' && (
          <div className="l17-checks">
            {!done && <div className="l17-note is-warn">Finish soldering first (step 1).</div>}
            <div className={`l17-check ${shortOk ? 'is-ok' : ''}`}>
              <span className="l17-check__tick">{shortOk ? <IconCheck size={12} /> : '1'}</span>
              <span>Dial to Ω or •))) (continuity)</span>
            </div>
            <div className={`l17-check ${shortOk ? 'is-ok' : ''}`}>
              <span className="l17-check__tick">{shortOk ? <IconCheck size={12} /> : '2'}</span>
              <span>Probes on +5V and GND (J1, or C2’s two pads)</span>
            </div>
            <div className={`l17-check ${shortOk ? 'is-ok' : ''}`}>
              <span className="l17-check__tick">{shortOk ? <IconCheck size={12} /> : '3'}</span>
              <span>
                No beep, reading climbs to OL
                <em>A low, steady reading or a beep means a short. Don’t power up!</em>
              </span>
            </div>
            <div className="l17-note">Tip: touch both probes to the same net (say J1 GND and U1 pin 1) to hear what a short sounds like.</div>
          </div>
        )}
        {phase === 'power' && (
          <div className="l17-checks">
            {!blinked || fault ? (
              <>
                <div className={`l17-check ${Math.abs(sup.vset - 5) <= 0.21 ? 'is-ok' : ''}`}>
                  <span className="l17-check__tick">{Math.abs(sup.vset - 5) <= 0.21 ? <IconCheck size={12} /> : '1'}</span>
                  <span>VOLTAGE knob to 5.0 V</span>
                </div>
                <div className={`l17-check ${sup.ilim <= 0.1001 ? 'is-ok' : ''}`}>
                  <span className="l17-check__tick">{sup.ilim <= 0.1001 ? <IconCheck size={12} /> : '2'}</span>
                  <span>CURRENT limit down to about 0.05 A</span>
                </div>
                <div className={`l17-check ${sup.on ? 'is-ok' : ''}`}>
                  <span className="l17-check__tick">{sup.on ? <IconCheck size={12} /> : '3'}</span>
                  <span>Press OUTPUT, watch for heat or smell</span>
                </div>
              </>
            ) : (
              <div className="l17-note is-good">It works! Board current is around {Math.round(E.i * 1000) || 8} mA.</div>
            )}
            {sup.on && !E.ledOn && (!H.oscillates || !H.ledPath || E.cc) && (
              <details className="l17-debug" open>
                <summary className="mono">LED dark? Debug checklist</summary>
                {debugRows.map((r) => (
                  <div key={r.id} className={`l17-check ${r.state === null ? '' : r.state ? 'is-ok' : 'is-bad'}`}>
                    <span className="l17-check__tick">{r.state === null ? '·' : r.state ? <IconCheck size={12} /> : <IconX size={12} />}</span>
                    <span>
                      {r.label}
                      <em>{r.hint}</em>
                    </span>
                  </div>
                ))}
                <div className="l17-note">Found it? Power off, fix it in step 1 or 2 (click a joint to reflow, or click D1 to turn it), then power up again.</div>
              </details>
            )}
            {blinked && !fault && (
              <div className="l17-row">
                <Button size="sm" variant="accent" onClick={() => setShow3d(true)}>
                  <IconCube size={14} /> See it in 3D
                </Button>
                <Button size="sm" variant="ghost" onClick={breakIt}>
                  Debug challenge
                </Button>
              </div>
            )}
          </div>
        )}
      </FloatingCard>

      <SceneToolbar>
        {(
          [
            ['assemble', '1', 'Solder'],
            ['inspect', '2', 'Inspect'],
            ['test', '3', 'Test'],
            ['power', '4', 'Power up'],
          ] as const
        ).map(([p, n, l]) => (
          <Button
            key={p}
            size="sm"
            variant="ghost"
            active={phase === p}
            aria-label={l}
            onClick={() => {
              setPhase(p)
              if (side === 'bottom' && p !== 'assemble') doFlip('top')
              if (p === 'inspect') setTool('loupe')
              if (p === 'assemble') setTool('iron')
              if (p === 'test' && mmode === 'off') setMmode('beep')
              if (p === 'power' && mmode === 'beep') setMmode('v')
              if (p !== 'assemble' && p !== 'inspect') setLoupe(null)
              setFocus(null)
              fitWhole()
            }}
          >
            <span className="l17-step mono">{n}</span>
            <span className="l17-step__label">{l}</span>
          </Button>
        ))}
      </SceneToolbar>
    </div>
  )
}

const PHASE_SUB: Record<Phase, string> = {
  assemble: 'Place each part, then solder its pads. Lowest and smallest first.',
  inspect: 'Check every joint before power touches the board.',
  test: 'Power off: check +5 V to GND for a short.',
  power: 'Bench supply: 5 V with a low current limit.',
}
