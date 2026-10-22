import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMission } from '../mission'
import { Button, Tabs, Toggle } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconCheck, IconInfo, IconReset, IconWarn, IconBox } from '@/components/icons'
import { stages } from '@/pcb/project'
import { BoardView } from '@/pcb/render'
import { MASKS, type MaskColor } from '@/pcb/palette'
import {
  DEFAULTS,
  EXTENDED_FEE,
  FINISHES,
  HELP,
  IMPACT_FIELDS,
  LEFTOVER,
  MASK_NAMES,
  MASK_ORDER,
  QTYS,
  THICKNESSES,
  buildBom,
  buildCpl,
  impactOf,
  isDefault,
  type Impact,
  type Order,
} from './options'
import { Timeline } from './Timeline'

const Board3D = lazy(() => import('@/pcb/Board3D').then((m) => ({ default: m.Board3D })))

/* ------------------------------------------------------------------ */
/* Small form pieces                                                    */
/* ------------------------------------------------------------------ */

function ImpactPill({ i }: { i: Impact }) {
  const glyph = i.cost === 0 ? '$' : i.cost === 1 ? '$$?' : '+$'
  return (
    <span className={`l16-impact is-${i.cost}`} title="Cost impact (no real prices shown)">
      <b className="mono">{glyph}</b>
      {i.text}
      {i.slower && <span className="l16-impact__slow mono">· slower?</span>}
    </span>
  )
}

function Field({
  label,
  helpKey,
  def,
  isDef,
  impact,
  children,
  auto,
}: {
  label: string
  helpKey: string
  def?: string
  isDef?: boolean
  impact?: Impact
  children: ReactNode
  auto?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`l16-field ${isDef === false ? 'is-changed' : ''}`}>
      <div className="l16-field__head">
        <span className="l16-field__label mono">{label}</span>
        <button className={`l16-help ${open ? 'is-on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`What is ${label}?`}>
          ?
        </button>
        <span className="grow" />
        {auto ? (
          <span className="l16-auto mono">auto-detected</span>
        ) : def !== undefined ? (
          <span className={`l16-def mono ${isDef ? 'is-ok' : ''}`}>
            {isDef ? (
              <>
                <IconCheck size={11} /> beginner default
              </>
            ) : (
              <>beginner default: {def}</>
            )}
          </span>
        ) : null}
      </div>
      {open && <div className="l16-field__help">{HELP[helpKey]}</div>}
      <div className="l16-field__body">
        {children}
        {impact && <ImpactPill i={impact} />}
      </div>
    </div>
  )
}

function Chips<T extends string | number | boolean>({
  value,
  options,
  onChange,
  def,
  disabled,
}: {
  value: T
  options: { v: T; label: ReactNode; disabled?: boolean }[]
  onChange: (v: T) => void
  def?: T
  disabled?: boolean
}) {
  return (
    <div className="l16-chips" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.v)}
          role="radio"
          aria-checked={o.v === value}
          className={`l16-chip ${o.v === value ? 'is-on' : ''} ${o.v === def ? 'is-def' : ''}`}
          disabled={disabled || o.disabled}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function Scene() {
  const mission = useMission()
  const [o, setO] = useState<Order>(LEFTOVER)
  const [timeline, setTimeline] = useState(false)
  const [tab, setTab] = useState<'bom' | 'cpl'>('bom')
  const [seen, setSeen] = useState({ color: false, enig: false })
  const [pulse, setPulse] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width > 700))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const set = <K extends keyof Order>(k: K, v: Order[K]) => setO((cur) => ({ ...cur, [k]: v }))
  const applyDefaults = () => {
    setO((cur) => ({ ...DEFAULTS, assembly: cur.assembly, remarks: cur.remarks }))
    setPulse((p) => p + 1)
  }

  /* missions */
  useEffect(() => {
    if (isDefault(o)) mission.complete('defaults')
  }, [o, mission])
  useEffect(() => {
    setSeen((s) => ({ color: s.color || o.mask !== 'green', enig: s.enig || o.finish === 'enig' }))
  }, [o.mask, o.finish])
  useEffect(() => {
    if (seen.color && seen.enig) mission.complete('look')
  }, [seen, mission])
  useEffect(() => {
    if (o.assembly && tab === 'cpl') mission.complete('assembly')
  }, [o.assembly, tab, mission])
  const onDone = useCallback(() => mission.complete('order'), [mission])

  const impacts = IMPACT_FIELDS.map((f) => impactOf(f, o))
  const extra = impacts.filter((i) => i.cost > 0).length
  const slower = impacts.some((i) => i.slower)
  const thicknessWarn =
    o.thickness === 0.4 && o.finish !== 'enig' ? '0.4 mm boards are ENIG-only.' : o.thickness === 0.6 && o.finish === 'hasl' ? '0.6 mm 2-layer boards can’t use leaded HASL.' : null
  const silk = MASKS[o.mask].silk === '#1b1b1b' ? 'Black' : 'White'
  const finishLabel = FINISHES.find((f) => f.id === o.finish)!.label

  const preview = (
    <div className="l16-preview">
      <Suspense fallback={<div className="l16-preview__load"><div className="spinner" /></div>}>
        <Board3D doc={PREVIEW_DOC} maskColor={o.mask} finish={o.finish === 'enig' ? 'enig' : 'hasl'} showParts={o.assembly} blink={o.assembly} quality={wide ? 'high' : 'low'} />
      </Suspense>
      <div className="l16-preview__tag mono">
        Live preview · {MASK_NAMES[o.mask]} / {o.finish === 'enig' ? 'ENIG gold' : 'HASL silver'} pads
      </div>
    </div>
  )

  const summary = (
    <div className="l16-summary">
      <div className="l16-summary__spec">
        {[
          ['FR-4', '2 layers'],
          ['30 × 26 mm', `${o.qty} pcs`],
          [`${o.thickness.toFixed(1)} mm`, `${o.copper} oz`],
          [`${MASK_NAMES[o.mask]} / ${silk.toLowerCase()} silk`, finishLabel],
        ].map(([a, b], i) => (
          <div key={i} className="l16-summary__row">
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
        {o.assembly && (
          <div className="l16-summary__row">
            <span>Assembly</span>
            <span>SMD parts, top</span>
          </div>
        )}
      </div>
      <div className="l16-meter">
        <div className="l16-meter__label mono">Cost impact</div>
        <div className="l16-meter__bars">
          {[0, 1, 2, 3, 4].map((k) => (
            <span key={k} className={k <= Math.min(4, extra) ? 'is-on' : ''} style={{ ['--k' as string]: k }} />
          ))}
        </div>
        <div className="l16-meter__txt">{extra === 0 ? 'Standard options only' : `${extra} choice${extra > 1 ? 's' : ''} add${extra > 1 ? '' : 's'} cost`}</div>
        <div className="l16-meter__txt">{slower ? 'Lead time may be longer' : 'Standard lead time'}</div>
      </div>
    </div>
  )

  const actions = (
    <div className="l16-actions">
      <Button size="sm" onClick={applyDefaults}>
        <IconReset size={14} /> Use beginner defaults
      </Button>
      <Button variant="accent" onClick={() => setTimeline(true)}>
        <IconBox size={15} /> Place order (simulated)
      </Button>
    </div>
  )

  return (
    <div className={`l16-scene ${wide ? 'is-wide' : 'is-narrow'}`} ref={wrapRef}>
      {!wide && preview}
      <div className="l16-form" ref={formRef}>
        {pulse > 0 && <div className="l16-flash" key={pulse} aria-hidden />}
        <div className="l16-sim">
          <span className="l16-sim__badge mono">Simulation</span>
          <span>A generic practice order form, not a real shop. No prices: the tags show how each choice affects cost.</span>
        </div>

        {!isDefault(o) && (
          <div className="l16-leftover">
            <IconInfo size={16} />
            <span>
              This form still has the settings from somebody else’s last order. Check each field, or reset them all.
            </span>
            <Button size="sm" variant="primary" onClick={applyDefaults}>
              Beginner defaults
            </Button>
          </div>
        )}

        <section className="l16-sec">
          <h3 className="l16-sec__t mono">
            <span>01</span> Board
          </h3>
          <div className="l16-grid">
            <Field label="Base material" helpKey="material" auto>
              <Chips value="FR-4" options={[{ v: 'FR-4', label: 'FR-4' }]} onChange={() => {}} />
            </Field>
            <Field label="Layers" helpKey="layers" auto>
              <Chips value={2} options={[1, 2, 4, 6].map((n) => ({ v: n, label: n, disabled: n !== 2 }))} onChange={() => {}} />
            </Field>
          </div>
          <Field label="Dimensions" helpKey="size" auto>
            <div className="l16-dim mono">
              <span>30</span> × <span>26</span> mm <em>from Gerber_BoardOutlineLayer.GKO</em>
            </div>
          </Field>
          <Field label="PCB quantity" helpKey="qty" def="5" isDef={o.qty === DEFAULTS.qty} impact={impactOf('qty', o)}>
            <Chips value={o.qty} def={DEFAULTS.qty} options={QTYS.map((q) => ({ v: q, label: q }))} onChange={(v) => set('qty', v)} />
          </Field>
          <Field label="Thickness (mm)" helpKey="thickness" def="1.6" isDef={o.thickness === DEFAULTS.thickness} impact={impactOf('thickness', o)}>
            <Chips value={o.thickness} def={DEFAULTS.thickness} options={THICKNESSES.map((t) => ({ v: t, label: t.toFixed(1) }))} onChange={(v) => set('thickness', v)} />
            {thicknessWarn && (
              <span className="l16-warn">
                <IconWarn size={13} /> {thicknessWarn}
              </span>
            )}
          </Field>
        </section>

        <section className="l16-sec">
          <h3 className="l16-sec__t mono">
            <span>02</span> Colour &amp; finish
          </h3>
          <Field label="Solder mask colour" helpKey="mask" def="Green" isDef={o.mask === DEFAULTS.mask} impact={impactOf('mask', o)}>
            <div className="l16-swatches" role="radiogroup" aria-label="Solder mask colour">
              {MASK_ORDER.map((c: MaskColor) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={o.mask === c}
                  aria-label={MASK_NAMES[c]}
                  title={MASK_NAMES[c]}
                  className={`l16-swatch ${o.mask === c ? 'is-on' : ''}`}
                  style={{ ['--c' as string]: MASKS[c].mask, ['--s' as string]: MASKS[c].silk }}
                  onClick={() => set('mask', c)}
                >
                  <span />
                </button>
              ))}
              <span className="l16-swatch__name">{MASK_NAMES[o.mask]}</span>
            </div>
          </Field>
          <Field label="Silkscreen" helpKey="silk" auto>
            <div className="l16-dim">
              <span className="l16-silkdot" style={{ background: MASKS[o.mask].silk }} /> {silk}, chosen to contrast with the mask
            </div>
          </Field>
          <Field label="Surface finish" helpKey="finish" def="LeadFree HASL" isDef={o.finish === DEFAULTS.finish} impact={impactOf('finish', o)}>
            <Chips value={o.finish} def={DEFAULTS.finish} options={FINISHES.map((f) => ({ v: f.id, label: f.label }))} onChange={(v) => set('finish', v)} />
          </Field>
        </section>

        <section className="l16-sec">
          <h3 className="l16-sec__t mono">
            <span>03</span> Extras
          </h3>
          <div className="l16-grid">
            <Field label="Outer copper weight" helpKey="copper" def="1 oz" isDef={o.copper === DEFAULTS.copper} impact={impactOf('copper', o)}>
              <Chips value={o.copper} def={1} options={[{ v: 1 as const, label: '1 oz' }, { v: 2 as const, label: '2 oz' }]} onChange={(v) => set('copper', v)} />
            </Field>
            <Field label="Gold fingers" helpKey="gold" def="No" isDef={!o.goldFingers}>
              <Chips value={o.goldFingers} def={false} options={[{ v: false, label: 'No' }, { v: true, label: 'Yes', disabled: true }]} onChange={(v) => set('goldFingers', v)} />
              <span className="l16-note">Needs a board ≥ 50 mm</span>
            </Field>
          </div>
          <Field label="Order number marking" helpKey="orderNo" def="Factory places it" isDef={o.orderNo === DEFAULTS.orderNo} impact={impactOf('orderNo', o)}>
            <Chips
              value={o.orderNo}
              def="default"
              options={[
                { v: 'default' as const, label: 'Factory places it' },
                { v: 'location' as const, label: 'Specify a location' },
                { v: 'remove' as const, label: 'Remove' },
              ]}
              onChange={(v) => set('orderNo', v)}
            />
          </Field>
          <Field label="Remarks" helpKey="remarks">
            <textarea className="l16-remarks" rows={2} placeholder="Leave empty unless you need something unusual" value={o.remarks} onChange={(e) => set('remarks', e.target.value)} />
          </Field>
        </section>

        <section className={`l16-sec l16-sec--asm ${o.assembly ? 'is-on' : ''}`}>
          <h3 className="l16-sec__t mono">
            <span>04</span> Assembly (PCBA)
          </h3>
          <Field label="Have the parts soldered for you" helpKey="assembly" impact={impactOf('assembly', o)}>
            <Toggle label={o.assembly ? 'Assembly on: upload BOM + CPL' : 'Off: bare boards only'} checked={o.assembly} onChange={(v) => set('assembly', v)} />
          </Field>
          {o.assembly && <Assembly tab={tab} setTab={setTab} />}
        </section>
      </div>

      {wide && (
        <div className="l16-side">
          {preview}
          {summary}
          {actions}
        </div>
      )}

      {!wide && (
        <SceneToolbar>
          <Button size="sm" variant="ghost" onClick={applyDefaults}>
            <IconReset size={14} /> Defaults
          </Button>
          <span className="scene-toolbar__sep" />
          <Button size="sm" variant="accent" onClick={() => setTimeline(true)}>
            <IconBox size={14} /> Place order
          </Button>
        </SceneToolbar>
      )}

      {timeline && <Timeline order={o} onClose={() => setTimeline(false)} onDone={onDone} />}
    </div>
  )
}

const PREVIEW_DOC = stages.finished()

/* ------------------------------------------------------------------ */
/* Assembly: BOM, CPL and a placement preview                          */
/* ------------------------------------------------------------------ */

function Assembly({ tab, setTab }: { tab: 'bom' | 'cpl'; setTab: (t: 'bom' | 'cpl') => void }) {
  const [bom, setBom] = useState(() => buildBom())
  const cpl = useMemo(() => buildCpl(), [])
  const [hover, setHover] = useState<string | null>(null)
  const ext = bom.filter((l) => l.smd && l.example === 'Extended').length
  return (
    <div className="l16-asm">
      <div className="l16-asm__note">
        <b>Basic</b> parts stay loaded on the assembly machines, so there’s no loading fee. Each unique <b>Extended</b> part
        has to be loaded by hand: ${EXTENDED_FEE} per unique Extended part on Economic assembly at the time of writing
        (“preferred extended” parts are exempt). Click a type below to see the effect.
      </div>
      <Tabs
        tabs={[
          { value: 'bom', label: 'BOM · bill of materials' },
          { value: 'cpl', label: 'CPL · pick & place' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'bom' ? (
        <>
          <div className="l16-table-wrap">
            <table className="l16-table">
              <thead>
                <tr>
                  <th>Comment</th>
                  <th>Designator</th>
                  <th>Footprint</th>
                  <th>Qty</th>
                  <th>LCSC #</th>
                  <th>Type (example)</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((l, i) => (
                  <tr key={l.designators.join()} className={l.smd ? '' : 'is-tht'}>
                    <td>{l.value}</td>
                    <td className="mono">{l.designators.join(', ')}</td>
                    <td className="mono">{l.footprint}</td>
                    <td className="mono">{l.qty}</td>
                    <td className="mono l16-cnum" title="Find the real C-number on jlcpcb.com/parts or lcsc.com">
                      C·····
                    </td>
                    <td>
                      {l.smd ? (
                        <button
                          className={`l16-type is-${l.example.toLowerCase()}`}
                          onClick={() => setBom((b) => b.map((x, k) => (k === i ? { ...x, example: x.example === 'Basic' ? 'Extended' : 'Basic' } : x)))}
                        >
                          {l.example}
                        </button>
                      ) : (
                        <span className="l16-type is-tht">Through-hole</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="l16-fee">
            <span className="mono">Extended-part loading fee</span>
            <b className="mono">
              {ext} × ${EXTENDED_FEE} = ${ext * EXTENDED_FEE}
            </b>
            <span className="l16-fee__note">Example types only. Look up each part’s C-number: the JLCPCB parts page says whether it’s Basic or Extended today.</span>
          </div>
        </>
      ) : (
        <div className="l16-cpl">
          <div className="l16-table-wrap">
            <table className="l16-table">
              <thead>
                <tr>
                  <th>Designator</th>
                  <th>Mid X</th>
                  <th>Mid Y</th>
                  <th>Layer</th>
                  <th>Rotation</th>
                </tr>
              </thead>
              <tbody>
                {cpl.map((l) => (
                  <tr key={l.ref} onPointerEnter={() => setHover(l.ref)} onPointerLeave={() => setHover(null)} onClick={() => setHover(l.ref)} className={`${hover === l.ref ? 'is-hl' : ''} ${l.smd ? '' : 'is-tht'}`}>
                    <td className="mono">{l.ref}</td>
                    <td className="mono">{l.x.toFixed(2)}mm</td>
                    <td className="mono">{l.y.toFixed(2)}mm</td>
                    <td>{l.layer}</td>
                    <td className="mono">{l.rot}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="l16-place">
            <svg viewBox="-1.5 -1.5 33 29" width="100%" role="img" aria-label="Placement preview">
              <BoardView doc={PREVIEW_DOC} mode="real" vis={{ bodies: true }} />
              {hover &&
                (() => {
                  const p = PREVIEW_DOC.parts.find((q) => q.ref === hover)!
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <circle cx={p.x} cy={p.y} r={3.4} fill="none" stroke="#ffc45c" strokeWidth={0.25} className="l16-ring" />
                      <path d={`M ${p.x - 4.4} ${p.y} h 2 M ${p.x + 2.4} ${p.y} h 2 M ${p.x} ${p.y - 4.4} v 2 M ${p.x} ${p.y + 2.4} v 2`} stroke="#ffc45c" strokeWidth={0.2} />
                    </g>
                  )
                })()}
            </svg>
            <div className="l16-place__cap">
              Placement preview. Hover a row. Check that polarised parts (U1’s pin 1, D1’s cathode) face the right way: rotation
              conventions differ between tools.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
