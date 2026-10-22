import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useMission } from '../mission'
import { Button, Segmented } from '@/components/ui'
import { IconArrowLeft, IconArrowRight, IconCheck, IconX } from '@/components/icons'
import { EdaMock, type MockState } from './EdaMock'
import { CHALLENGES, regionById, REGIONS, TOUR, type RegionId } from './data'

type Mode = 'explore' | 'tour' | 'quiz'
interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const TRY: Record<RegionId, string> = {
  menu: 'Open Settings › Shortcuts and switch the shortcut theme.',
  toolbar: 'Hover the buttons to read their names.',
  project: 'Double-click PCB1 to open the board.',
  canvas: 'Click U1, then press Shift+X to cross-probe.',
  property: 'Select R1 and change its value to 2.2k.',
  layers: 'Hide the Bottom Layer with its eye icon.',
  bottom: 'Type NE555 into the search box.',
}

export function Scene() {
  const mission = useMission()
  const rootRef = useRef<HTMLDivElement>(null)
  const refs = useRef<Record<string, HTMLElement | null>>({})
  const [size, setSize] = useState({ w: 0, h: 0 })
  const compact = size.w > 0 && size.w < 640

  const [mode, setMode] = useState<Mode>('explore')
  const [mock, setMock] = useState<MockState>({ doc: 'sch', leftOpen: false, rightOpen: false, bottomOpen: true, rightTab: 'property' })
  const [visited, setVisited] = useState<RegionId[]>([])
  const [focus, setFocus] = useState<RegionId | null>(null)
  const [step, setStep] = useState(0)
  const [q, setQ] = useState(0)
  const [answer, setAnswer] = useState<{ ok: boolean; region: RegionId } | null>(null)
  const [firstTry, setFirstTry] = useState<boolean[]>([])
  const [quizDone, setQuizDone] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [rects, setRects] = useState<Record<string, Rect>>({})
  const [flash, setFlash] = useState<{ region: RegionId; ok: boolean; key: number } | null>(null)
  const blockClick = useRef(false)

  const set = useCallback((p: Partial<MockState>) => setMock((m) => ({ ...m, ...p })), [])
  const regionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    refs.current[id] = el
  }, [])

  // size
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // measure regions after every render (cheap; only commits when something moved)
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const rr = root.getBoundingClientRect()
    const next: Record<string, Rect> = {}
    for (const [k, el] of Object.entries(refs.current)) {
      if (!el || !el.isConnected) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      next[k] = { x: Math.round(r.left - rr.left), y: Math.round(r.top - rr.top), w: Math.round(r.width), h: Math.round(r.height) }
    }
    if (JSON.stringify(next) !== JSON.stringify(rects)) setRects(next)
  })

  const rectOf = (id: RegionId): Rect | undefined => {
    if (id === 'project') return compact && !mock.leftOpen ? rects.left : rects.project
    if (id === 'property' || id === 'layers') return compact && !mock.rightOpen ? rects.right : rects[id]
    return rects[id]
  }

  /* ---------------- missions ---------------- */
  const visit = useCallback((id: RegionId) => setVisited((v) => (v.includes(id) ? v : [...v, id])), [])
  useEffect(() => {
    if (visited.length >= REGIONS.length) mission.complete('regions')
  }, [visited, mission])
  useEffect(() => {
    if (mock.doc === 'pcb') mission.complete('pcb')
  }, [mock.doc, mission])
  useEffect(() => {
    if (quizDone) mission.complete('challenge')
  }, [quizDone, mission])

  /* ---------------- tour ---------------- */
  const tourRegion = TOUR[step]
  const prepareFor = useCallback(
    (id: RegionId) => {
      if (id === 'layers') set({ doc: 'pcb', rightTab: 'layers', rightOpen: compact, leftOpen: false })
      else if (id === 'property') set({ rightTab: 'property', rightOpen: compact, leftOpen: false })
      else if (id === 'project') set({ leftOpen: compact, rightOpen: false })
      else if (id === 'bottom') set({ bottomOpen: true, leftOpen: false, rightOpen: false })
      else set({ leftOpen: false, rightOpen: false })
    },
    [set, compact],
  )
  useEffect(() => {
    if (mode !== 'tour') return
    prepareFor(tourRegion)
    visit(tourRegion)
  }, [mode, tourRegion, prepareFor, visit])

  /* ---------------- quiz ---------------- */
  const ch = CHALLENGES[q]
  useEffect(() => {
    if (mode !== 'quiz') return
    set({ leftOpen: false, rightOpen: false, bottomOpen: true })
    if (ch?.needsPcb) set({ doc: 'pcb', rightTab: 'layers' })
  }, [mode, q, ch, set])

  const startMode = (m: Mode) => {
    setMode(m)
    setFocus(null)
    setAnswer(null)
    if (m === 'tour') setStep(0)
    if (m === 'quiz' && quizDone) {
      setQ(0)
      setFirstTry([])
      setQuizDone(false)
    }
  }

  const matches = (clicked: RegionId, want: RegionId) => clicked === want || (compact && want === 'layers' && clicked === 'property' && mock.doc === 'pcb')

  const onDownCapture = (e: React.PointerEvent) => {
    rootRef.current?.focus({ preventScroll: true })
    const el = (e.target as Element).closest?.('[data-region]')
    const inCard = (e.target as Element).closest?.('.l05-card, .l05-modebar, .l05-beacon, .l05-modal')
    blockClick.current = false
    if (!el || inCard) return
    const region = el.getAttribute('data-region') as RegionId
    if (mode === 'explore') {
      visit(region)
      setFocus(region)
    } else if (mode === 'quiz' && ch && !(answer?.ok) && !quizDone) {
      e.preventDefault()
      e.stopPropagation()
      blockClick.current = true
      const ok = matches(region, ch.answer)
      setAnswer({ ok, region })
      setFlash({ region, ok, key: Date.now() })
      if (firstTry[q] === undefined) setFirstTry((f) => Object.assign([...f], { [q]: ok }))
      if (ok) visit(ch.answer)
    }
  }
  const onClickCapture = (e: React.MouseEvent) => {
    if (blockClick.current) {
      e.preventDefault()
      e.stopPropagation()
      blockClick.current = false
    }
  }
  const nextQ = () => {
    setAnswer(null)
    if (q + 1 >= CHALLENGES.length) setQuizDone(true)
    else setQ(q + 1)
  }

  /* ---------------- overlay geometry ---------------- */
  const cardRegion: RegionId | null = mode === 'tour' ? tourRegion : mode === 'explore' ? focus : answer?.ok ? ch.answer : null
  const cr = cardRegion ? rectOf(cardRegion) : undefined
  const cardW = compact ? size.w - 20 : 290
  const cardStyle = ((): CSSProperties | undefined => {
    if (!cr) return undefined
    if (compact) return { left: 10, right: 10, bottom: 10, width: 'auto' }
    const gap = 14
    const estH = 210
    let x: number
    let y = Math.max(54, Math.min(size.h - estH - 10, cr.y + 6))
    if (cr.x + cr.w + gap + cardW < size.w - 8) x = cr.x + cr.w + gap
    else if (cr.x - gap - cardW > 8) x = cr.x - gap - cardW
    else {
      // big region: sit inside it, below its top edge, or above it if it's at the bottom
      x = Math.min(size.w - cardW - 10, Math.max(10, cr.x + cr.w / 2 - cardW / 2))
      y = cr.h > 260 ? cr.y + 40 : Math.max(54, cr.y - estH - gap)
    }
    return { left: x, top: y, width: cardW }
  })()

  const spot = mode === 'tour' && cr ? cr : undefined

  const beaconIds: RegionId[] = TOUR.filter((id) => rectOf(id))
  const beaconPos = (id: RegionId) => {
    const r = rectOf(id)!
    if (r.h < 48) return { left: r.x + r.w - 22, top: r.y + r.h / 2 - 10 }
    return { left: r.x + r.w - 30, top: r.y + r.h - 30 }
  }

  const info = cardRegion ? regionById(cardRegion) : null
  const tourIdx = TOUR.indexOf(tourRegion)

  return (
    <div
      ref={rootRef}
      className={`l05 ${compact ? 'l05--compact' : ''} is-${mode}`}
      tabIndex={-1}
      onPointerDownCapture={onDownCapture}
      onClickCapture={onClickCapture}
    >
      {/* ---------- mode bar ---------- */}
      <div className="l05-modebar">
        <Segmented
          value={mode}
          onChange={startMode}
          options={[
            { value: 'explore', label: 'Explore' },
            { value: 'tour', label: compact ? 'Tour' : 'Guided tour' },
            { value: 'quiz', label: compact ? 'Where is it?' : 'Where is it?' },
          ]}
        />
        <div className="l05-modebar__msg">
          {mode === 'explore' && (
            <span>
              <b>Click anywhere</b> in the editor to find out what each area does.
            </span>
          )}
          {mode === 'tour' && (
            <span className="mono l05-modebar__step">
              STEP {tourIdx + 1} / {TOUR.length} · {regionById(tourRegion).name.toUpperCase()}
            </span>
          )}
          {mode === 'quiz' &&
            (quizDone ? (
              <span className="l05-q">
                <span className="l05-q__n mono">DONE</span> {firstTry.filter(Boolean).length} of {CHALLENGES.length} right first time. Nice
                navigating!
              </span>
            ) : (
              <span className={`l05-q ${answer && !answer.ok ? 'is-wrong' : ''}`} key={q}>
                <span className="l05-q__n mono">
                  {q + 1}/{CHALLENGES.length}
                </span>
                {answer && !answer.ok ? (
                  <>
                    Not quite: that's the <b>{regionById(answer.region).name}</b>. {ch.q.replace(/^Where/, 'Where')}
                  </>
                ) : (
                  <b>{ch.q}</b>
                )}
              </span>
            ))}
        </div>
        <div className="l05-modebar__chips mono">
          <span className={`l05-pill ${visited.length >= REGIONS.length ? 'is-done' : ''}`} title="Regions visited">
            {visited.length >= REGIONS.length && <IconCheck size={11} />} {visited.length}/{REGIONS.length}
            {!compact && ' areas'}
          </span>
        </div>
      </div>

      {/* ---------- the editor ---------- */}
      <div className="l05-stagewrap">
        <EdaMock
          {...mock}
          compact={compact}
          set={set}
          regionRef={regionRef}
          onLayerHidden={() => mission.complete('layer')}
          onValueEdited={() => {}}
          onSearch555={() => visit('bottom')}
          status={status}
          setStatus={setStatus}
          locked={mode === 'quiz' && !answer?.ok}
        />
      </div>

      {/* ---------- overlays ---------- */}
      {spot && <div className="l05-spot" style={{ left: spot.x - 4, top: spot.y - 4, width: spot.w + 8, height: spot.h + 8 }} />}

      {mode !== 'quiz' &&
        beaconIds.map((id) => {
          const n = TOUR.indexOf(id) + 1
          const seen = visited.includes(id)
          const cur = mode === 'tour' ? id === tourRegion : id === focus
          return (
            <button
              key={id}
              className={`l05-beacon ${seen ? 'is-seen' : ''} ${cur ? 'is-cur' : ''}`}
              style={beaconPos(id)}
              aria-label={`${regionById(id).name}${seen ? ' (visited)' : ''}`}
              onClick={() => {
                if (mode === 'tour') setStep(TOUR.indexOf(id))
                else {
                  visit(id)
                  setFocus(id)
                  prepareFor(id)
                }
              }}
            >
              {seen && !cur ? <IconCheck size={11} /> : n}
            </button>
          )
        })}

      {flash && rectOf(flash.region) && (
        <div
          key={flash.key}
          className={`l05-flash ${flash.ok ? 'is-ok' : 'is-bad'}`}
          style={{ left: rectOf(flash.region)!.x, top: rectOf(flash.region)!.y, width: rectOf(flash.region)!.w, height: rectOf(flash.region)!.h }}
          onAnimationEnd={() => setFlash(null)}
        />
      )}

      {info && cardStyle && (mode !== 'quiz' || answer?.ok) && (
        <div className={`l05-card ${mode === 'quiz' ? 'is-ok' : ''}`} style={cardStyle} key={`${mode}-${info.id}`}>
          <div className="l05-card__head">
            <span className="l05-card__n mono">{mode === 'quiz' ? <IconCheck size={13} /> : TOUR.indexOf(info.id) + 1}</span>
            <span className="l05-card__title">{mode === 'quiz' ? 'Right: the ' + info.name : info.name}</span>
            {mode === 'explore' && (
              <button className="l05-card__x" onClick={() => setFocus(null)} aria-label="Close">
                <IconX size={14} />
              </button>
            )}
          </div>
          <p className="l05-card__body">{mode === 'quiz' ? ch.why : info.body}</p>
          {mode !== 'quiz' && info.tip && <p className="l05-card__tip">{info.tip}</p>}
          {mode !== 'quiz' && (
            <div className="l05-card__try">
              <span className="mono">TRY</span> {TRY[info.id]}
            </div>
          )}
          {mode === 'tour' && (
            <div className="l05-card__nav">
              <div className="l05-dots">
                {TOUR.map((_, i) => (
                  <i key={i} className={i === step ? 'is-on' : i < step ? 'is-past' : ''} />
                ))}
              </div>
              <Button size="sm" variant="ghost" icon disabled={step === 0} onClick={() => setStep((s) => s - 1)} aria-label="Previous step">
                <IconArrowLeft size={14} />
              </Button>
              {step < TOUR.length - 1 ? (
                <Button size="sm" variant="primary" onClick={() => setStep((s) => s + 1)}>
                  Next <IconArrowRight size={14} />
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => startMode('quiz')}>
                  Test yourself <IconArrowRight size={14} />
                </Button>
              )}
            </div>
          )}
          {mode === 'quiz' && (
            <div className="l05-card__nav">
              <span className="grow" />
              <Button size="sm" variant="primary" onClick={nextQ}>
                {q + 1 >= CHALLENGES.length ? 'Finish' : 'Next question'} <IconArrowRight size={14} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
