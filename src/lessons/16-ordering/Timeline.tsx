import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { IconChevronLeft, IconChevronRight, IconPause, IconPlay, IconX } from '@/components/icons'
import { stages } from '@/pcb/project'
import type { FinishColor } from '@/pcb/palette'
import { Bubbles, Clipboard, DrillBit, IsoBoard, Iron, Probe, ShippingBox, type Stage } from './art'
import { FINISHES, MASK_NAMES, type Order } from './options'

const Board3D = lazy(() => import('@/pcb/Board3D').then((m) => ({ default: m.Board3D })))

interface Step {
  id: string
  title: string
  body: string
  stage?: Stage
}

function stepsFor(o: Order): Step[] {
  const finish = FINISHES.find((f) => f.id === o.finish)!.label
  return [
    { id: 'check', title: 'Files checked', stage: 'clad', body: 'The factory’s software (and often an engineer) checks your Gerbers: outline, layer count and drill sizes. Questions come back to you before anything is made.' },
    { id: 'drill', title: 'Drilled', stage: 'drilled', body: 'Your board is made on a large copper-clad panel, usually alongside other people’s boards. A machine drills every hole from your drill file.' },
    { id: 'plate', title: 'Plated', stage: 'plated', body: 'Chemical baths coat the inside of every hole with copper, so the top and bottom layers connect through it.' },
    { id: 'etch', title: 'Etched', stage: 'etched', body: 'Your copper pattern is printed onto the panel as a protective resist, and the unprotected copper is etched away.' },
    { id: 'mask', title: 'Solder mask', stage: 'masked', body: `${MASK_NAMES[o.mask]} solder mask covers the board except over the pads, which get their ${finish} finish.` },
    { id: 'silk', title: 'Silkscreen', stage: 'silk', body: 'Designators, outlines and the BLINKY logo are printed in ink.' },
    { id: 'test', title: 'Tested & cut out', stage: 'silk', body: 'Many factories test the connections electrically, then route each board out of the panel along your outline.' },
    { id: 'ship', title: 'Shipped', body: `${o.qty} boards are sealed in a bag, boxed and sent on their way.` },
    { id: 'arrive', title: 'Arrives', body: 'A small box lands on your doormat. Inside: your boards, usually in an anti-static bag.' },
    o.assembly
      ? { id: 'solder', title: 'Parts placed', stage: 'assembled', body: 'With assembly, the factory solders the SMD parts for you. You only add the through-hole header J1.' }
      : { id: 'solder', title: 'You solder it', stage: 'assembled', body: 'Parts go on one joint at a time. The lesson “Solder it & bring it to life” walks you through it.' },
    { id: 'blink', title: 'It blinks', body: 'Connect 5 V. The 555 starts its timing cycle and the LED blinks about one and a half times a second.' },
  ]
}

const STEP_MS = 2600

export function Timeline({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const steps = useMemo(() => stepsFor(order), [order])
  const doc = useMemo(() => stages.finished(), [])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const boxRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  const finish: FinishColor = order.finish === 'enig' ? 'enig' : 'hasl'

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!playing || i >= steps.length - 1) return
    const t = window.setTimeout(() => setI((n) => Math.min(steps.length - 1, n + 1)), STEP_MS)
    return () => window.clearTimeout(t)
  }, [i, playing, steps.length])
  useEffect(() => {
    if (i === steps.length - 1) onDone()
  }, [i, steps.length, onDone])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((n) => Math.min(steps.length - 1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, steps.length])

  const step = steps[i]
  const narrow = w < 560
  const boardW = Math.min(w * (narrow ? 0.62 : 0.4), 360)

  let art: React.ReactNode
  if (step.id === 'ship' || step.id === 'arrive') {
    art = (
      <div className={`l16-boxwrap ${step.id === 'ship' ? 'is-ship' : 'is-arrive'}`} style={{ width: Math.min(w * 0.6, 320) }}>
        <ShippingBox open={step.id === 'arrive'} mask={order.mask} />
      </div>
    )
  } else if (step.id === 'blink') {
    art = (
      <div className="l16-finale">
        <Suspense fallback={<div className="spinner" />}>
          <Board3D doc={doc} maskColor={order.mask} finish={finish} showParts blink autoRotate shadow camera="ortho" />
        </Suspense>
        <div className="l16-finale__glow" />
      </div>
    )
  } else {
    art = (
      <div className="l16-stagewrap">
        <IsoBoard key={step.id} doc={doc} stage={step.stage!} mask={order.mask} finish={finish} uid={`tl${step.id}`} wipe width={boardW} />
        {step.id === 'check' && <Clipboard items={['9 Gerber + drill files', 'Outline 30 × 26 mm', '2 copper layers', '4 holes, 2 drill sizes', 'Ready for production']} />}
        {step.id === 'drill' && (
          <div className="l16-over l16-over--drill">
            <DrillBit />
            <span className="l16-spark" />
          </div>
        )}
        {step.id === 'plate' && <Bubbles />}
        {step.id === 'etch' && <div className="l16-sheen" />}
        {step.id === 'test' && (
          <>
            <div className="l16-over l16-over--probeL">
              <Probe />
            </div>
            <div className="l16-over l16-over--probeR">
              <Probe flip />
            </div>
            <div className="l16-pass mono">PASS</div>
          </>
        )}
        {step.id === 'solder' && !order.assembly && (
          <div className="l16-over l16-over--iron">
            <Iron />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="l16-tl" role="dialog" aria-label="What happens after you order" ref={boxRef}>
      <div className="l16-tl__head">
        <span className="l16-tl__sim mono">Simulation · what happens next</span>
        <span className="grow" />
        <button className="l16-tl__x" onClick={onClose} aria-label="Close timeline">
          <IconX size={16} />
        </button>
      </div>
      <div className="l16-tl__art" key={step.id}>
        {art}
      </div>
      <div className="l16-tl__caption" aria-live="polite">
        <div className="l16-tl__n mono">
          {String(i + 1).padStart(2, '0')} / {steps.length}
        </div>
        <div>
          <div className="l16-tl__title">{step.title}</div>
          <div className="l16-tl__body">{step.body}</div>
        </div>
      </div>
      <div className="l16-tl__rail">
        <div className="l16-tl__track">
          <div className="l16-tl__fill" style={{ width: `${(i / (steps.length - 1)) * 100}%` }} />
        </div>
        <div className="l16-tl__dots">
          {steps.map((s, k) => (
            <button key={s.id} className={`l16-tl__dot ${k < i ? 'is-done' : ''} ${k === i ? 'is-on' : ''}`} onClick={() => setI(k)} aria-label={s.title} title={s.title}>
              {!narrow && <span className="l16-tl__lbl mono">{s.title}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="l16-tl__ctrls">
        <Button size="sm" variant="ghost" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} aria-label="Previous step">
          <IconChevronLeft size={15} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing && i < steps.length - 1 ? <IconPause size={15} /> : <IconPlay size={15} />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setI((n) => Math.min(steps.length - 1, n + 1))} disabled={i === steps.length - 1} aria-label="Next step">
          <IconChevronRight size={15} />
        </Button>
        {i === steps.length - 1 && (
          <Button size="sm" variant="primary" onClick={onClose}>
            Back to the form
          </Button>
        )}
      </div>
    </div>
  )
}
