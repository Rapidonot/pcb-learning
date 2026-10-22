import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMission } from '../mission'
import { Button, Chip } from '@/components/ui'
import { IconCheck, IconX, IconSpark } from '@/components/icons'
import { PcbCanvas, type PcbCanvasHandle } from '@/pcb/PcbCanvas'
import { SchematicView, SCH } from '@/pcb/SchematicView'
import { blinkySchematic, SCH_BOUNDS, allPins } from '@/pcb/schematic'
import { BoardView, FootprintGraphic } from '@/pcb/render'
import { analyze, type BoardDoc, type WorldPad } from '@/pcb/board'
import { stages, netInfo, parts as projectParts, netlist as fullNetlist } from '@/pcb/project'
import { getFootprint } from '@/pcb/footprints'
import { EDA } from '@/pcb/palette'
import { snap, type Vec } from '@/pcb/geom'

const SCH_DOC = blinkySchematic()
const SCH_PINS = allPins(SCH_DOC)
const CONVERTED = stages.converted().parts
const NETS = Object.keys(netInfo)
const pinsOfNet = (net: string) => Object.keys(fullNetlist).filter((k) => fullNetlist[k] === net)
const PCB_FIT = { x: -2, y: -3, w: 38, h: 42 }
const PCB_FIT_NARROW = { x: -2, y: -3, w: 38, h: 50 }
const OUTLINE_CORNER = 1.5

type Phase = 'idle' | 'flying' | 'ready'
type MenuId = 'view' | 'place' | 'design'
interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}
interface Change {
  id: string
  kind: 'Component' | 'Net'
  name: string
  detail: string
}
interface Flight {
  start: number
  items: { ref: string; from: Vec; to: Vec; k: number; delay: number }[]
}

const FLY_MS = 950
const STAGGER = 120
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(900)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

const normRect = (a: Vec, b: Vec): Rect => ({ x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) })
const rw = (r: Rect) => r.x1 - r.x0
const rh = (r: Rect) => r.y1 - r.y0
const inside = (a: Rect, b: Rect) => a.x0 > b.x0 && a.y0 > b.y0 && a.x1 < b.x1 && a.y1 < b.y1

function judgeOutline(r: Rect): { ok: boolean; tone: 'good' | 'warn' | 'bad'; text: string } {
  const w = rw(r)
  const h = rh(r)
  if (w < 20 || h < 16 || w * h < 450)
    return { ok: false, tone: 'bad', text: `${w} × ${h} mm is too small. Nine parts plus room for traces need about 30 × 26 mm.` }
  if (w > 60 || h > 60) return { ok: false, tone: 'warn', text: `${w} × ${h} mm fits, but you pay for every square millimetre. Try something near 30 × 26 mm.` }
  if (w === 30 && h === 26) return { ok: true, tone: 'good', text: '30 × 26 mm with 1.5 mm rounded corners: exactly Blinky’s board.' }
  return { ok: true, tone: 'good', text: `${w} × ${h} mm works. (Blinky’s reference board is 30 × 26 mm.)` }
}

export function Scene() {
  const mission = useMission()
  const rootRef = useRef<HTMLDivElement>(null)
  const schRef = useRef<PcbCanvasHandle>(null)
  const pcbRef = useRef<PcbCanvasHandle>(null)
  const width = useWidth(rootRef)
  const narrow = width < 640

  const [phase, setPhase] = useState<Phase>('idle')
  const [imported, setImported] = useState<Set<string>>(new Set())
  const [importedNets, setImportedNets] = useState<Set<string>>(new Set())
  const [landed, setLanded] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<null | { changes: Change[]; ticked: Set<string> }>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [now, setNow] = useState(0)
  const [ratsKey, setRatsKey] = useState(0)
  const [ratlines, setRatlines] = useState(true)
  const hidOnce = useRef(false)
  const [menu, setMenu] = useState<MenuId | null>(null)
  const [outlineMode, setOutlineMode] = useState(false)
  const [outline, setOutline] = useState<Rect | null>(null)
  const [slots, setSlots] = useState<Rect[]>([])
  const [drawing, setDrawing] = useState<{ a: Vec; b: Vec } | null>(null)
  const [verdict, setVerdict] = useState<ReturnType<typeof judgeOutline> | null>(null)
  const [hoverNet, setHoverNet] = useState<string | null>(null)
  const [pinnedNet, setPinnedNet] = useState<string | null>(null)
  const [probeRef, setProbeRef] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef(0)

  const say = useCallback((t: string) => {
    setToast(t)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  /* ---------------- board doc ---------------- */

  const doc: BoardDoc = useMemo(() => {
    const parts = CONVERTED.filter((p) => landed.has(p.ref))
    const netlist: Record<string, string> = {}
    for (const [k, n] of Object.entries(fullNetlist)) if (landed.has(k.split('.')[0]) && importedNets.has(n)) netlist[k] = n
    return { w: 30, h: 26, corner: OUTLINE_CORNER, parts, tracks: [], vias: [], pours: [], texts: [], netlist }
  }, [landed, importedNets])
  const conn = useMemo(() => analyze(doc), [doc])
  const activeNet = hoverNet ?? pinnedNet

  /* ---------------- conversion ---------------- */

  const pendingChanges = useCallback((): Change[] => {
    const out: Change[] = []
    for (const p of projectParts) {
      if (imported.has(p.ref)) continue
      out.push({ id: `c:${p.ref}`, kind: 'Component', name: p.ref, detail: `${p.value} · ${getFootprint(p.fp).pkg}` })
    }
    for (const n of NETS) {
      if (importedNets.has(n)) continue
      out.push({ id: `n:${n}`, kind: 'Net', name: n, detail: `${pinsOfNet(n).length} pins` })
    }
    return out
  }, [imported, importedNets])

  const openConvert = () => {
    setMenu(null)
    if (phase === 'flying') return
    const changes = pendingChanges()
    setDialog({ changes, ticked: new Set(changes.map((c) => c.id)) })
  }

  const apply = () => {
    if (!dialog) return
    const tick = dialog.ticked
    const newParts = dialog.changes.filter((c) => c.kind === 'Component' && tick.has(c.id)).map((c) => c.name)
    const newNets = dialog.changes.filter((c) => c.kind === 'Net' && tick.has(c.id)).map((c) => c.name)
    setDialog(null)
    if (!newParts.length && !newNets.length) return
    mission.complete('convert')
    setImportedNets((s) => new Set([...s, ...newNets]))
    setImported((s) => new Set([...s, ...newParts]))
    if (newNets.length) setRatsKey((k) => k + 1)
    if (!newParts.length) return
    // compute the flight paths in scene pixels
    const root = rootRef.current?.getBoundingClientRect()
    const sm = schRef.current?.svg?.getScreenCTM()
    const pm = pcbRef.current?.svg?.getScreenCTM()
    if (!root || !sm || !pm || reducedMotion()) {
      setLanded((s) => new Set([...s, ...newParts]))
      setPhase('ready')
      return
    }
    const items = newParts.map((ref, i) => {
      const sym = SCH_DOC.symbols.find((s) => s.ref === ref)!
      const part = CONVERTED.find((p) => p.ref === ref)!
      const from: Vec = [sm.a * sym.x + sm.e - root.left, sm.d * sym.y + sm.f - root.top]
      const to: Vec = [pm.a * part.x + pm.e - root.left, pm.d * part.y + pm.f - root.top]
      return { ref, from, to, k: pm.a, delay: i * STAGGER }
    })
    setPhase('flying')
    setFlight({ start: performance.now(), items })
  }

  // flight animation loop
  useEffect(() => {
    if (!flight) return
    let raf = 0
    const total = FLY_MS + (flight.items.length - 1) * STAGGER
    const tick = () => {
      const t = performance.now()
      setNow(t)
      const el = t - flight.start
      const done = flight.items.filter((it) => el - it.delay >= FLY_MS).map((it) => it.ref)
      setLanded((s) => (done.every((r) => s.has(r)) ? s : new Set([...s, ...done])))
      if (el < total + 30) raf = requestAnimationFrame(tick)
      else {
        setFlight(null)
        setPhase('ready')
        setRatsKey((k) => k + 1)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [flight])

  /* ---------------- missions ---------------- */

  const [inspected, setInspected] = useState(false)
  const [toggled, setToggled] = useState(false)
  useEffect(() => {
    if (activeNet && phase === 'ready' && conn.pads.some((p) => p.net === activeNet)) {
      mission.complete('inspect')
      setInspected(true)
    }
  }, [activeNet, phase, conn, mission])

  const toggleRatlines = () => {
    setMenu(null)
    const next = !ratlines
    setRatlines(next)
    if (!next) hidOnce.current = true
    if (next && hidOnce.current && landed.size) {
      mission.complete('ratline')
      setToggled(true)
    }
    say(next ? 'View › Ratline: ratlines shown' : 'View › Ratline: ratlines hidden')
  }

  const startOutline = () => {
    setMenu(null)
    setOutlineMode(true)
    setVerdict(null)
    say('Board Outline: drag a rectangle on the PCB canvas')
  }

  /* ---------------- PCB pointer handlers (outline tool) ---------------- */

  const onPcbDown = (e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p: Vec = [snap(w[0], 1), snap(w[1], 1)]
    setDrawing({ a: p, b: p })
  }
  const onPcbMove = (_e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (!drawing) return
    const p: Vec = [snap(w[0], 1), snap(w[1], 1)]
    if (p[0] !== drawing.b[0] || p[1] !== drawing.b[1]) setDrawing({ ...drawing, b: p })
  }
  const onPcbUp = () => {
    if (!drawing) return
    const r = normRect(drawing.a, drawing.b)
    setDrawing(null)
    if (rw(r) < 1 || rh(r) < 1) return
    if (outline && inside(r, outline)) {
      setSlots((s) => [...s.slice(-2), r])
      setOutlineMode(false)
      say('A second closed shape inside the outline becomes a slot: a hole cut right through the board.')
      return
    }
    const v = judgeOutline(r)
    setVerdict(v)
    setOutline(r)
    setSlots([])
    if (v.ok) {
      setOutlineMode(false)
      mission.complete('outline')
    }
  }

  /* ---------------- render ---------------- */

  const flyingRefs = flight ? flight.items.filter((it) => !landed.has(it.ref)).map((it) => it.ref) : []
  const schHighlightRefs = flyingRefs.length ? flyingRefs : probeRef ? [probeRef] : []
  const nextStep = getNextStep()

  function getNextStep(): { title: string; body: ReactNode; action?: ReactNode } {
    if (phase === 'idle' && !landed.size)
      return {
        title: 'Send the schematic to the PCB',
        body: 'The schematic is drawn and checked. Run the conversion to bring every footprint and connection into the PCB.',
        action: (
          <Button size="sm" variant="accent" onClick={openConvert}>
            Design › Update/Convert…
          </Button>
        ),
      }
    if (phase === 'flying') return { title: 'Footprints on the move', body: 'Each symbol brings its footprint, and the netlist comes along to remember what connects to what.' }
    if (!outline || !verdict?.ok)
      return {
        title: 'Draw the board outline',
        body: outlineMode ? 'Drag a rectangle on the dark PCB canvas. The dashed box shows Blinky’s 30 × 26 mm.' : 'The parts have no board yet. Use Place › Board Outline and drag a rectangle.',
        action: !outlineMode && (
          <Button size="sm" variant="accent" onClick={startOutline}>
            Place › Board Outline
          </Button>
        ),
      }
    if (!inspected)
      return { title: 'Inspect the ratsnest', body: 'Hover or tap a pad to light up its net. Each thin line is an airwire: a connection still to be made in copper.' }
    if (toggled)
      return {
        title: 'Ready for placement',
        body: 'Footprints, netlist and an outline: the PCB has everything it needs. Next, drag the parts onto the board so the airwires get short and tidy.',
      }
    return {
      title: 'Hide and show the ratlines',
      body: 'Airwires are only a guide, not copper. Toggle them with View › Ratline.',
      action: (
        <Button size="sm" onClick={toggleRatlines}>
          View › Ratline
        </Button>
      ),
    }
  }

  const netPanel = activeNet ? <NetInfo net={activeNet} conn={conn} landed={landed.size > 0} /> : null

  return (
    <div
      ref={rootRef}
      className={`l08-scene ${narrow ? 'is-narrow' : ''}`}
      onPointerDown={(e) => {
        if (menu && !(e.target as Element).closest('.l08-menubar')) setMenu(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setMenu(null)
          setOutlineMode(false)
          setDrawing(null)
          setPinnedNet(null)
        }
      }}
    >
      <MenuBar
        menu={menu}
        setMenu={setMenu}
        hint={phase === 'idle' && !landed.size ? 'design' : phase === 'ready' && !outline ? 'place' : null}
        ratlines={ratlines}
        narrow={narrow}
        onConvert={openConvert}
        onCheck={() => {
          setMenu(null)
          say('Schematic DRC: 0 errors, 0 warnings. Ready to convert.')
        }}
        onOutline={startOutline}
        onRatline={toggleRatlines}
        converted={landed.size > 0}
      />

      <div className="l08-panes">
        <div className="l08-left">
          <section className={`l08-pane l08-pane--sch ${landed.size ? 'is-compact' : ''}`}>
            <div className="l08-tab mono">
              <span className="l08-tab__dot" style={{ background: SCH.wire }} />
              Blinky · Schematic
            </div>
            <div className="l08-pane__canvas">
              <PcbCanvas ref={schRef} fit={SCH_BOUNDS} theme="schematic" grid={10} interactive={false} zoomControls={false} pad={4} ariaLabel="Blinky schematic">
                <SchematicView
                  doc={SCH_DOC}
                  showPinNumbers={false}
                  highlightRefs={schHighlightRefs}
                  onPinEnter={(p) => setHoverNet(p ? fullNetlist[p.key] ?? null : null)}
                  pinHitRadius={6}
                />
                {activeNet &&
                  SCH_PINS.filter((p) => fullNetlist[p.key] === activeNet).map((p) => (
                    <g key={p.key} style={{ pointerEvents: 'none' }}>
                      <circle cx={p.x} cy={p.y} r={4.5} fill={netInfo[activeNet].color} fillOpacity={0.25} stroke={netInfo[activeNet].color} strokeWidth={1.4} />
                      <circle cx={p.x} cy={p.y} r={4.5} fill="none" stroke={netInfo[activeNet].color} strokeWidth={1} className="pin-hint" />
                    </g>
                  ))}
              </PcbCanvas>
            </div>
          </section>
          {!narrow && (
            <aside className="l08-guide">
              <div className="l08-guide__next">
                <div className="eyebrow">Next</div>
                <div className="l08-guide__title">{nextStep.title}</div>
                <div className="l08-guide__body">{nextStep.body}</div>
                {nextStep.action && <div className="l08-guide__act">{nextStep.action}</div>}
              </div>
              {netPanel ?? (
                <div className="l08-guide__hint">
                  {landed.size ? 'Hover a pad on the PCB, or a pin in the schematic, to see its net in both places.' : 'Hover a pin in the schematic to see which net it belongs to.'}
                </div>
              )}
            </aside>
          )}
        </div>

        <section className="l08-pane l08-pane--pcb">
          <div className="l08-tab l08-tab--dark mono">
            <span className="l08-tab__dot" style={{ background: EDA.top }} />
            Blinky · PCB
            <span className="grow" />
            {outlineMode && <span className="l08-tab__mode">BOARD OUTLINE TOOL</span>}
          </div>
          <div className="l08-pane__canvas">
            <PcbCanvas
              ref={pcbRef}
              fit={narrow ? PCB_FIT_NARROW : PCB_FIT}
              theme="eda"
              grid={1}
              zoomControls={!narrow}
              onPointerDown={outlineMode ? onPcbDown : undefined}
              onPointerMove={outlineMode ? onPcbMove : undefined}
              onPointerUp={outlineMode ? onPcbUp : undefined}
              cursor={outlineMode ? 'crosshair' : undefined}
              ariaLabel="Blinky PCB"
            >
              {outlineMode && <SuggestedOutline />}
              {outline && <Outline r={outline} slots={slots} bad={verdict ? !verdict.ok : false} dims={!drawing} />}
              <BoardView
                doc={doc}
                conn={conn}
                vis={{ outline: false, ratsnest: false }}
                highlightNet={activeNet}
                selectedRefs={probeRef ? [probeRef] : []}
                onPadEnter={(p: WorldPad | null) => setHoverNet(p?.net ?? null)}
                onPadPointerDown={(p) => {
                  if (outlineMode) return
                  setPinnedNet((n) => (n === p.net ? null : (p.net ?? null)))
                  setProbeRef(p.ref)
                }}
                onPartPointerDown={(ref) => !outlineMode && setProbeRef((r) => (r === ref ? null : ref))}
              />
              {ratlines && <Ratsnest key={ratsKey} conn={conn} active={activeNet} />}
              {drawing && <DrawingRect r={normRect(drawing.a, drawing.b)} />}
            </PcbCanvas>

            {phase === 'idle' && !landed.size && !dialog && (
              <div className="l08-empty">
                <div className="l08-empty__icon" aria-hidden>
                  <IconSpark size={22} />
                </div>
                <div className="l08-empty__t">This PCB is empty</div>
                <div className="l08-empty__b">Everything it needs is already in the schematic{narrow ? ' above' : ' on the left'}.</div>
                <button className="l08-cta" onClick={openConvert}>
                  <span className="l08-cta__menu mono">Design ›</span> Update/Convert Schematic to PCB
                </button>
              </div>
            )}
            {narrow && !(phase === 'idle' && !landed.size) && (
              <div className="l08-mhint">
                {netPanel ?? (
                  <>
                    <b>{nextStep.title}.</b> {nextStep.body}
                  </>
                )}
              </div>
            )}
            {verdict && !drawing && phase === 'ready' && (
              <div className={`l08-verdict l08-verdict--${verdict.tone}`} role="status">
                {verdict.ok ? <IconCheck size={14} /> : <IconX size={14} />} {verdict.text}
              </div>
            )}
          </div>
        </section>
      </div>

      {flight && <FlightLayer flight={flight} now={now} landed={landed} />}
      {dialog && (
        <ImportDialog
          changes={dialog.changes}
          ticked={dialog.ticked}
          onToggle={(id) =>
            setDialog((d) => {
              if (!d) return d
              const t = new Set(d.ticked)
              if (t.has(id)) t.delete(id)
              else t.add(id)
              return { ...d, ticked: t }
            })
          }
          onApply={apply}
          onCancel={() => setDialog(null)}
          update={imported.size > 0}
        />
      )}
      {toast && (
        <div className="l08-toast mono" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Menu bar                                                            */
/* ------------------------------------------------------------------ */

function MenuBar({
  menu,
  setMenu,
  hint,
  ratlines,
  narrow,
  onConvert,
  onCheck,
  onOutline,
  onRatline,
  converted,
}: {
  menu: MenuId | null
  setMenu: (m: MenuId | null) => void
  hint: MenuId | null
  ratlines: boolean
  narrow: boolean
  onConvert: () => void
  onCheck: () => void
  onOutline: () => void
  onRatline: () => void
  converted: boolean
}) {
  const item = (label: string, onClick: () => void, opts: { tag?: string; checked?: boolean; disabled?: boolean; hint?: boolean } = {}) => (
    <button role="menuitem" className={`l08-mi ${opts.hint ? 'is-hint' : ''}`} onClick={onClick} disabled={opts.disabled}>
      <span className="l08-mi__check">{opts.checked && <IconCheck size={13} />}</span>
      <span className="grow">{label}</span>
      {opts.tag && <span className="l08-mi__tag mono">{opts.tag}</span>}
    </button>
  )
  const dead = (label: string) => (
    <div className="l08-mi is-dead" aria-hidden>
      <span className="l08-mi__check" />
      <span className="grow">{label}</span>
    </div>
  )
  const menus: { id: MenuId; label: string; items: ReactNode }[] = [
    {
      id: 'view',
      label: 'View',
      items: (
        <>
          {item('Ratline', onRatline, { tag: 'PCB', checked: ratlines, disabled: !converted })}
          {dead('Grid')}
          {dead('3D Preview')}
        </>
      ),
    },
    {
      id: 'place',
      label: 'Place',
      items: (
        <>
          {item('Board Outline', onOutline, { tag: 'PCB', disabled: !converted, hint: hint === 'place' })}
          {dead('Track')}
          {dead('Via')}
          {dead('Copper Region')}
        </>
      ),
    },
    {
      id: 'design',
      label: 'Design',
      items: (
        <>
          {item('Check DRC', onCheck, { tag: 'SCH' })}
          {item('Update/Convert Schematic to PCB', onConvert, { tag: 'SCH', hint: hint === 'design' })}
          {dead('Design Rules')}
        </>
      ),
    },
  ]
  return (
    <div className="l08-menubar" role="menubar">
      <span className="l08-menubar__app mono">{narrow ? 'EDA' : 'EasyEDA Pro'}</span>
      {!narrow &&
        ['File', 'Edit'].map((m) => (
          <span key={m} className="l08-menubar__dead">
            {m}
          </span>
        ))}
      {menus.map((m) => (
        <div key={m.id} className="l08-menu">
          <button
            className={`l08-menu__btn ${menu === m.id ? 'is-open' : ''} ${hint === m.id ? 'is-hint' : ''}`}
            aria-haspopup="menu"
            aria-expanded={menu === m.id}
            onClick={() => setMenu(menu === m.id ? null : m.id)}
          >
            {m.label}
          </button>
          {menu === m.id && (
            <div className="l08-menu__drop" role="menu">
              {m.items}
            </div>
          )}
        </div>
      ))}
      {!narrow &&
        ['Tools', 'Export'].map((m) => (
          <span key={m} className="l08-menubar__dead">
            {m}
          </span>
        ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Confirm Import Information                                          */
/* ------------------------------------------------------------------ */

function ImportDialog({
  changes,
  ticked,
  onToggle,
  onApply,
  onCancel,
  update,
}: {
  changes: Change[]
  ticked: Set<string>
  onToggle: (id: string) => void
  onApply: () => void
  onCancel: () => void
  update: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('.btn--primary')?.focus({ preventScroll: true })
  }, [])
  return (
    <div className="l08-modal" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={ref}
        className="l08-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm Import Information"
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      >
        <div className="l08-dialog__title">
          <span>Confirm Import Information</span>
          <button onClick={onCancel} aria-label="Close dialog">
            <IconX size={14} />
          </button>
        </div>
        {changes.length === 0 ? (
          <div className="l08-dialog__empty">
            <IconCheck size={18} /> No changes found. The PCB already matches the schematic, and your placement stays exactly as it is.
          </div>
        ) : (
          <>
            <div className="l08-dialog__note">
              {update
                ? 'Only what changed is listed. Parts already on the PCB keep their positions.'
                : 'Everything in the schematic will be added to the PCB. Untick a row to leave it out.'}
            </div>
            <div className="l08-table" role="table">
              <div className="l08-tr l08-tr--head" role="row">
                <span />
                <span>Action</span>
                <span>Type</span>
                <span>Name</span>
                <span>Detail</span>
              </div>
              <div className="l08-tbody">
                {changes.map((c) => (
                  <label key={c.id} className={`l08-tr ${ticked.has(c.id) ? '' : 'is-off'}`} role="row">
                    <input type="checkbox" checked={ticked.has(c.id)} onChange={() => onToggle(c.id)} />
                    <span className="l08-add">Add</span>
                    <span>{c.kind}</span>
                    <span className="mono" style={{ color: c.kind === 'Net' ? netInfo[c.name]?.color : undefined, fontWeight: 600 }}>
                      {c.name}
                    </span>
                    <span className="l08-detail">{c.detail}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="l08-dialog__foot">
          <span className="mono l08-dialog__count">
            {changes.length ? `${ticked.size} of ${changes.length} changes ticked` : ''}
          </span>
          <span className="grow" />
          {changes.length > 0 && (
            <Button size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={changes.length ? onApply : onCancel}>
            {changes.length ? 'Apply Changes' : 'OK'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* PCB overlays                                                        */
/* ------------------------------------------------------------------ */

function FlightLayer({ flight, now, landed }: { flight: Flight; now: number; landed: Set<string> }) {
  const el = now - flight.start
  return (
    <svg className="l08-fly" aria-hidden>
      {flight.items.map((it) => {
        if (landed.has(it.ref)) return null
        const raw = (el - it.delay) / FLY_MS
        if (raw <= 0) return null
        const t = ease(Math.min(1, raw))
        const lift = Math.min(160, Math.abs(it.to[0] - it.from[0]) * 0.35 + 50)
        const cx = (it.from[0] + it.to[0]) / 2
        const cy = Math.min(it.from[1], it.to[1]) - lift
        const x = (1 - t) * (1 - t) * it.from[0] + 2 * (1 - t) * t * cx + t * t * it.to[0]
        const y = (1 - t) * (1 - t) * it.from[1] + 2 * (1 - t) * t * cy + t * t * it.to[1]
        const k = it.k * (1 + 0.35 * Math.sin(Math.PI * t))
        const part = CONVERTED.find((p) => p.ref === it.ref)!
        return (
          <g key={it.ref}>
            <path
              d={`M ${it.from[0]} ${it.from[1]} Q ${cx} ${cy} ${it.to[0]} ${it.to[1]}`}
              fill="none"
              stroke="#e0542c"
              strokeOpacity={0.35 * (1 - t)}
              strokeWidth={1.5}
              strokeDasharray="4 5"
            />
            <g transform={`translate(${x} ${y}) scale(${k})`} style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))' }}>
              <FootprintGraphic fp={part.fp} mode="eda" />
            </g>
            <text x={x} y={y - getFootprint(part.fp).courtyard.h * k - 6} className="l08-fly__ref" textAnchor="middle">
              {it.ref}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Ratsnest({ conn, active }: { conn: ReturnType<typeof analyze>; active: string | null }) {
  return (
    <g style={{ pointerEvents: 'none' }} className="l08-rats">
      {conn.ratsnest.map((r, i) => {
        const on = active === r.net
        return (
          <line
            key={i}
            x1={r.a.x}
            y1={r.a.y}
            x2={r.b.x}
            y2={r.b.y}
            pathLength={1}
            stroke={on ? '#ffffff' : EDA.ratsnest}
            strokeWidth={on ? 0.13 : 0.07}
            opacity={active && !on ? 0.22 : 0.95}
            style={{ animationDelay: `${Math.min(i * 45, 900)}ms` }}
          />
        )
      })}
    </g>
  )
}

function SuggestedOutline() {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={0} y={0} width={30} height={26} rx={OUTLINE_CORNER} fill="rgba(224,90,214,0.04)" stroke={EDA.outline} strokeOpacity={0.45} strokeWidth={0.1} strokeDasharray="0.6 0.4" />
      <text x={15} y={13} className="l08-sugg" textAnchor="middle" dominantBaseline="central">
        BLINKY · 30 × 26 mm
      </text>
    </g>
  )
}

function Outline({ r, slots, bad, dims }: { r: Rect; slots: Rect[]; bad: boolean; dims: boolean }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={r.x0}
        y={r.y0}
        width={rw(r)}
        height={rh(r)}
        rx={OUTLINE_CORNER}
        fill="rgba(255,255,255,0.025)"
        stroke={EDA.outline}
        strokeWidth={0.15}
        strokeDasharray={bad ? '0.5 0.3' : undefined}
        className="l08-outline"
      />
      {slots.map((s, i) => (
        <g key={i}>
          <rect x={s.x0} y={s.y0} width={rw(s)} height={rh(s)} rx={Math.min(0.8, rw(s) / 2, rh(s) / 2)} fill="#050605" stroke={EDA.outline} strokeWidth={0.15} />
          <text x={(s.x0 + s.x1) / 2} y={(s.y0 + s.y1) / 2} className="l08-sugg" textAnchor="middle" dominantBaseline="central">
            SLOT
          </text>
        </g>
      ))}
      {dims && <Dims r={r} />}
    </g>
  )
}

function Dims({ r, live }: { r: Rect; live?: boolean }) {
  const c = live ? '#ffffff' : 'rgba(255,255,255,0.6)'
  const y = r.y0 - 1.2
  const x = r.x0 - 1.2
  return (
    <g stroke={c} strokeWidth={0.05} className="l08-dims">
      <line x1={r.x0} x2={r.x1} y1={y} y2={y} />
      <line x1={r.x0} x2={r.x0} y1={y - 0.4} y2={y + 0.4} />
      <line x1={r.x1} x2={r.x1} y1={y - 0.4} y2={y + 0.4} />
      <line x1={x} x2={x} y1={r.y0} y2={r.y1} />
      <line x1={x - 0.4} x2={x + 0.4} y1={r.y0} y2={r.y0} />
      <line x1={x - 0.4} x2={x + 0.4} y1={r.y1} y2={r.y1} />
      <text x={(r.x0 + r.x1) / 2} y={y - 0.45} textAnchor="middle" fill={c} stroke="none">
        {rw(r)} mm
      </text>
      <text x={x - 0.45} y={(r.y0 + r.y1) / 2} textAnchor="middle" fill={c} stroke="none" transform={`rotate(-90 ${x - 0.45} ${(r.y0 + r.y1) / 2})`}>
        {rh(r)} mm
      </text>
    </g>
  )
}

function DrawingRect({ r }: { r: Rect }) {
  const v = judgeOutline(r)
  const col = rw(r) < 1 || rh(r) < 1 ? '#fff' : v.ok ? '#4fe0a6' : v.tone === 'warn' ? '#ffd166' : '#ff6b6b'
  const label = `${rw(r)} × ${rh(r)} mm`
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={r.x0} y={r.y0} width={rw(r)} height={rh(r)} rx={Math.min(OUTLINE_CORNER, rw(r) / 2, rh(r) / 2)} fill="rgba(224,90,214,0.08)" stroke={EDA.outline} strokeWidth={0.15} />
      <Dims r={r} live />
      <g transform={`translate(${r.x1 + 0.6} ${r.y1 + 0.6})`}>
        <rect x={0} y={0} width={label.length * 0.62 + 1} height={1.7} rx={0.4} fill="rgba(10,12,10,0.92)" stroke={col} strokeWidth={0.07} />
        <text x={0.5} y={0.88} dominantBaseline="central" className="l08-live" fill={col}>
          {label}
        </text>
      </g>
    </g>
  )
}

function NetInfo({ net, conn, landed }: { net: string; conn: ReturnType<typeof analyze>; landed: boolean }) {
  const info = netInfo[net]
  const pins = pinsOfNet(net)
  const wires = conn.ratsnest.filter((r) => r.net === net).length
  return (
    <div className="l08-net">
      <div className="row" style={{ gap: 8 }}>
        <span className="l08-net__sw" style={{ background: info?.color }} />
        <span className="l08-net__name mono">{net}</span>
        <span className="grow" />
        {landed && <Chip>{wires} airwire{wires === 1 ? '' : 's'}</Chip>}
      </div>
      <div className="l08-net__about">{info?.about}</div>
      <div className="l08-net__pins mono">{pins.join(' · ')}</div>
    </div>
  )
}


