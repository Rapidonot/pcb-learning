import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMission } from '../mission'
import { Button, Chip, FloatingCard, Toggle } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconPause, IconPlay, IconReset, IconX, IconChevronLeft } from '@/components/icons'
import { PcbCanvas } from '@/pcb/PcbCanvas'
import { blinkySchematic, SCH_BOUNDS, symPins, type SymInst } from '@/pcb/schematic'
import { SCH } from '@/pcb/SchematicView'
import { FootprintGraphic } from '@/pcb/render'
import { getFootprint } from '@/pcb/footprints'
import { netInfo, netlist, parts } from '@/pcb/project'
import type { Vec } from '@/pcb/geom'
import { fitInsets, netColor, netGraph, SchDrawing, useElementSize, usePrefersReducedMotion } from './schKit'

const NETS = ['VCC', 'GND', 'THR', 'DIS', 'OUT', 'LED', 'CTRL'] as const

/* ------------------------------------------------------------------ */
/* "Follow the current" path                                           */
/* ------------------------------------------------------------------ */

interface Leg {
  pts: Vec[]
  title: string
  text: string
  inside?: boolean
  net?: string
}
const LEGS: Leg[] = [
  { pts: [[60, 130], [80, 130], [80, 40], [190, 40], [190, 60]], title: 'Into the VCC rail', text: 'Current leaves the + pin of J1 and runs along the VCC wire to pin 8 of the 555.', net: 'VCC' },
  { pts: [[190, 60], [190, 150], [270, 150]], title: 'Through the 555', text: 'Pin 8 (VCC) powers the chip. While the timer output is high, pin 3 (OUT) passes current on.', inside: true },
  { pts: [[270, 150], [290, 150], [290, 160], [290, 200]], title: 'R3 limits it', text: 'R3 (330 Ω) keeps the current small enough that the LED is not damaged.', net: 'OUT' },
  { pts: [[290, 200], [290, 210], [290, 250]], title: 'D1 lights up', text: 'Current enters the LED at the anode (A) and leaves at the cathode (K). Light!', net: 'LED' },
  { pts: [[290, 250], [290, 260]], title: 'Home through GND', text: 'It returns through a GND flag. Every GND flag is the same net, so this is wired straight back to the − pin of J1.', net: 'GND' },
]
const segLen = (pts: Vec[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)
const LEG_LEN = LEGS.map((l) => segLen(l.pts))
const LEG_START = LEG_LEN.map((_, i) => LEG_LEN.slice(0, i).reduce((a, b) => a + b, 0))
const TOTAL = LEG_LEN.reduce((a, b) => a + b, 0)
const ALL_PTS: Vec[] = LEGS.flatMap((l, i) => (i === 0 ? l.pts : l.pts.slice(1)))

function pointAt(s: number): Vec {
  let rem = Math.max(0, Math.min(TOTAL, s))
  for (let i = 0; i < ALL_PTS.length - 1; i++) {
    const a = ALL_PTS[i]
    const b = ALL_PTS[i + 1]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (rem <= l) return [a[0] + ((b[0] - a[0]) * rem) / l, a[1] + ((b[1] - a[1]) * rem) / l]
    rem -= l
  }
  return ALL_PTS[ALL_PTS.length - 1]
}
const legAt = (s: number) => {
  for (let i = LEGS.length - 1; i >= 0; i--) if (s >= LEG_START[i]) return i
  return 0
}

/* ------------------------------------------------------------------ */
/* Hit geometry                                                        */
/* ------------------------------------------------------------------ */

const BODY: Record<string, [number, number, number, number]> = {
  R: [-13, -7, 26, 14],
  C: [-6, -11, 12, 22],
  LED: [-9, -10, 18, 20],
  NE555: [-40, -50, 80, 100],
  HDR2: [-11, -21, 18, 42],
}
function bodyRect(s: SymInst) {
  const [x, y, w, h] = BODY[s.sym]
  if (s.rot === 90) return { x: s.x - (y + h), y: s.y + x, w: h, h: w }
  return { x: s.x + x, y: s.y + y, w, h }
}

type Selection = { kind: 'part'; ref: string; net?: string | null } | { kind: 'net'; net: string } | null

/* ------------------------------------------------------------------ */

export function Scene() {
  const mission = useMission()
  const doc = useMemo(() => blinkySchematic(), [])
  const graph = useMemo(() => netGraph(doc, netlist), [doc])
  const rootRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(rootRef)
  const compact = size.w > 0 && size.w < 640
  const reduced = usePrefersReducedMotion()

  const [hover, setHover] = useState<string | null>(null)
  const [sel, setSel] = useState<Selection>(null)
  const [pinNums, setPinNums] = useState(true)
  const [junctions, setJunctions] = useState(false)
  const [pinFocus, setPinFocus] = useState<string | null>(null)
  // current animation
  const [anim, setAnim] = useState<{ s: number; playing: boolean } | null>(null)

  const userNet = hover ?? sel?.net ?? null
  const animLeg = anim ? legAt(anim.s) : -1
  const animDone = anim ? anim.s >= TOTAL : false
  const active = anim ? (animDone ? 'GND' : null) : userNet

  useEffect(() => {
    if (userNet === 'GND') mission.complete('gnd')
    if (userNet === 'THR') mission.complete('thr')
  }, [userNet, mission])
  useEffect(() => {
    if (pinFocus === 'U1.8') mission.complete('vcc-pin')
  }, [pinFocus, mission])
  useEffect(() => {
    if (animDone) mission.complete('current')
  }, [animDone, mission])

  // animation loop
  const playing = anim?.playing ?? false
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    let stepTimer = 0
    if (reduced) {
      stepTimer = window.setInterval(() => {
        setAnim((a) => {
          if (!a) return a
          const i = legAt(a.s)
          const next = i + 1 < LEGS.length ? LEG_START[i + 1] : TOTAL
          return { s: next, playing: next < TOTAL }
        })
      }, 2400)
      return () => window.clearInterval(stepTimer)
    }
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      setAnim((a) => {
        if (!a || !a.playing) return a
        const leg = legAt(a.s)
        const speed = leg === 1 ? 70 : leg >= 3 ? 34 : 62
        const s = Math.min(TOTAL, a.s + speed * dt)
        return { s, playing: s < TOTAL }
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, reduced])

  const toggleAnim = () => {
    setSel(null)
    setJunctions(false)
    setAnim((a) => {
      if (!a || a.s >= TOTAL) return { s: reduced ? LEG_START[0] : 0, playing: true }
      return { ...a, playing: !a.playing }
    })
  }

  const pickNet = useCallback((net: string | null) => {
    setAnim(null)
    setSel(net ? { kind: 'net', net } : null)
  }, [])

  // background tap clears selection
  const down = useRef<{ x: number; y: number; bg: boolean } | null>(null)
  const onDownCap = (e: React.PointerEvent) => {
    const t = e.target as Element
    down.current = { x: e.clientX, y: e.clientY, bg: t.tagName === 'svg' || t.getAttribute?.('data-bg') === '1' }
  }
  const onUpCap = (e: React.PointerEvent) => {
    const d = down.current
    if (d && d.bg && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) {
      setSel(null)
      setPinFocus(null)
    }
    down.current = null
  }

  const insets = compact ? { l: 6, r: 6, t: anim ? 84 : 6, b: 64 } : { l: 290, r: 14, t: 14, b: anim ? 118 : 66 }
  const fit = size.w > 0 ? fitInsets(SCH_BOUNDS, size.w > 0 ? { w: size.w, h: compact ? size.h * 0.6 : size.h } : size, insets, 6) : SCH_BOUNDS

  const hitHandlers = (net: string | null, pinKey?: string) => ({
    onPointerEnter: () => setHover(net),
    onPointerLeave: () => setHover(null),
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return
      pickNet(net)
      if (pinKey) setPinFocus(pinKey)
    },
  })

  const lit = anim ? anim.s > LEG_START[3] + 12 : false
  const head = anim ? pointAt(anim.s) : null

  const canvas = (
    <PcbCanvas fit={fit} pad={0} theme="schematic" grid={10} majorEvery={5} interactive zoomControls={!compact} ariaLabel="Blinky schematic">
      <SchDrawing
        doc={doc}
        graph={graph}
        active={active}
        showPinNumbers={pinNums}
        selectedRefs={sel?.kind === 'part' ? [sel.ref] : []}
        litRefs={lit ? ['D1'] : []}
        dimInactive={!anim}
      >
        {/* junction explainer */}
        {junctions &&
          graph.junctions.map((j, i) => (
            <g key={i} style={{ pointerEvents: 'none' }}>
              <circle cx={j[0]} cy={j[1]} r={7} fill="none" stroke="var(--accent)" strokeWidth={1.2} className="l06-ring" />
              <circle cx={j[0]} cy={j[1]} r={7} fill="none" stroke="var(--accent)" strokeWidth={1} />
              {i === 0 && (
                <g>
                  <line x1={j[0] + 5} y1={j[1] - 5} x2={j[0] + 18} y2={j[1] - 14} stroke="var(--accent)" strokeWidth={0.8} />
                  <text x={j[0] + 20} y={j[1] - 15} fontSize={7} fontWeight={700} fill="var(--accent-ink)" fontFamily="IBM Plex Mono, monospace">
                    DOT = JOINED
                  </text>
                </g>
              )}
            </g>
          ))}

        {/* current animation */}
        {anim && (
          <g style={{ pointerEvents: 'none' }}>
            {LEGS.map((l, i) => (
              <polyline
                key={i}
                points={l.pts.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="#f0a020"
                strokeOpacity={i <= animLeg ? 0.35 : 0.12}
                strokeWidth={i === animLeg ? 7 : 5}
                strokeDasharray={l.inside ? '3 4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {LEGS[1] && animLeg === 1 && (
              <text x={200} y={140} fontSize={6.5} fill="#b06a00" fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
                INSIDE THE CHIP
              </text>
            )}
            {head &&
              !reduced &&
              [0, 1, 2, 3, 4, 5].map((k) => {
                const p = pointAt(anim.s - k * 7)
                return <circle key={k} cx={p[0]} cy={p[1]} r={3.2 - k * 0.4} fill="#ffb020" opacity={1 - k * 0.15} stroke="#c06a00" strokeWidth={k === 0 ? 0.8 : 0} />
              })}
            {head && reduced && <circle cx={head[0]} cy={head[1]} r={4} fill="#ffb020" stroke="#c06a00" strokeWidth={0.8} />}
          </g>
        )}

        {/* hit areas */}
        {!anim && (
          <g>
            {doc.symbols.map((s) => {
              const r = bodyRect(s)
              return (
                <rect
                  key={s.ref}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    setAnim(null)
                    setSel({ kind: 'part', ref: s.ref })
                    setPinFocus(null)
                  }}
                />
              )
            })}
            {doc.wires.map((w) => (
              <polyline
                key={w.id}
                points={w.pts.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="transparent"
                strokeWidth={9}
                style={{ cursor: 'pointer' }}
                {...hitHandlers(graph.netOf(`wire:${w.id}`))}
              />
            ))}
            {doc.flags.map((f) => (
              <rect key={f.id} x={f.x - 10} y={f.kind === 'gnd' ? f.y - 2 : f.y - 18} width={20} height={20} fill="transparent" style={{ cursor: 'pointer' }} {...hitHandlers(graph.netOf(`flag:${f.id}`))} />
            ))}
            {doc.labels.map((l) => (
              <rect key={l.id} x={l.side === 'left' ? l.x - 22 : l.x} y={l.y - 7} width={22} height={14} fill="transparent" style={{ cursor: 'pointer' }} {...hitHandlers(graph.netOf(`label:${l.id}`))} />
            ))}
            {doc.symbols.flatMap(symPins).map((p) => (
              <circle key={p.key} cx={p.x} cy={p.y} r={5.5} fill="transparent" style={{ cursor: 'pointer' }} {...hitHandlers(graph.netOf(`pin:${p.key}`), p.key)} />
            ))}
          </g>
        )}
        {pinFocus && !anim && <PinFocus doc={doc} pinKey={pinFocus} />}
      </SchDrawing>
    </PcbCanvas>
  )

  const cardBody = sel?.kind === 'part' ? (
    <PartCard
      inst={doc.symbols.find((s) => s.ref === sel.ref)!}
      graph={graph}
      onBack={() => setSel(null)}
      onPin={(key, net) => {
        setPinFocus(key)
        setHover(null)
        setSel({ kind: 'part', ref: sel.ref, net })
      }}
      focusPin={pinFocus}
    />
  ) : sel?.kind === 'net' ? (
    <NetCard net={sel.net} graph={graph} onBack={() => setSel(null)} />
  ) : junctions ? (
    <JunctionCard onClose={() => setJunctions(false)} />
  ) : (
    <DefaultCard onNet={(n) => pickNet(n)} hoverNet={hover} pinNums={pinNums} setPinNums={setPinNums} />
  )

  const toolbar = (
    <SceneToolbar>
      <Button size="sm" variant="ghost" active={!!anim?.playing} onClick={toggleAnim} aria-label="Follow the current">
        {anim?.playing ? <IconPause size={15} /> : <IconPlay size={15} />} {compact ? 'Current' : anim && !animDone ? (anim.playing ? 'Pause' : 'Resume') : 'Follow the current'}
      </Button>
      {anim && (
        <Button size="sm" variant="ghost" icon aria-label="Stop the current animation" onClick={() => setAnim(null)}>
          <IconX size={15} />
        </Button>
      )}
      <span className="scene-toolbar__sep" />
      <Button
        size="sm"
        variant="ghost"
        active={junctions}
        onClick={() => {
          setAnim(null)
          setSel(null)
          setJunctions((j) => !j)
        }}
      >
        <span className="l06-dot" /> Junctions
      </Button>
      {compact && (
        <Button size="sm" variant="ghost" active={pinNums} onClick={() => setPinNums((v) => !v)}>
          Pin #
        </Button>
      )}
    </SceneToolbar>
  )

  const caption = anim && (
    <div className={`l06-caption ${compact ? 'is-compact' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
      <div className="l06-caption__steps">
        {LEGS.map((_, i) => (
          <span key={i} className={`l06-caption__step ${i < animLeg || animDone ? 'is-done' : i === animLeg ? 'is-on' : ''}`} />
        ))}
      </div>
      <div className="l06-caption__title mono">
        {String(animLeg + 1).padStart(2, '0')} · {LEGS[animLeg].title}
      </div>
      <div className="l06-caption__text">{LEGS[animLeg].text}</div>
      {animDone && (
        <button className="l06-caption__again mono" onClick={toggleAnim}>
          <IconReset size={13} /> Play again
        </button>
      )}
    </div>
  )

  return (
    <div ref={rootRef} className={`l06 ${compact ? 'l06--compact' : ''}`} onPointerDownCapture={onDownCap} onPointerUpCapture={onUpCap}>
      {compact ? (
        <>
          <div className="l06-canvas-compact">
            {canvas}
            {caption}
            {toolbar}
          </div>
          <div className="l06-sheet" onPointerDown={(e) => e.stopPropagation()}>
            {cardBody}
          </div>
        </>
      ) : (
        <>
          {canvas}
          <FloatingCard title="Schematic explorer" width={266}>
            {cardBody}
          </FloatingCard>
          {caption}
          {toolbar}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function PinFocus({ doc, pinKey }: { doc: ReturnType<typeof blinkySchematic>; pinKey: string }) {
  const p = doc.symbols.flatMap(symPins).find((q) => q.key === pinKey)
  if (!p) return null
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={p.x} cy={p.y} r={6} fill="none" stroke={SCH.hl} strokeWidth={1.4} className="l06-ring" />
      <circle cx={p.x} cy={p.y} r={2.4} fill={SCH.hl} />
    </g>
  )
}

function NetChip({ net, onClick, active }: { net: string | null; onClick?: () => void; active?: boolean }) {
  if (!net) return <span className="l06-netchip is-none mono">—</span>
  const style = { ['--c' as string]: netColor(net) }
  if (!onClick)
    return (
      <span className={`l06-netchip mono ${active ? 'is-on' : ''}`} style={style}>
        <i />
        {net}
      </span>
    )
  return (
    <button className={`l06-netchip mono ${active ? 'is-on' : ''}`} style={style} onClick={onClick}>
      <i />
      {net}
    </button>
  )
}

function DefaultCard({ onNet, hoverNet, pinNums, setPinNums }: { onNet: (n: string) => void; hoverNet: string | null; pinNums: boolean; setPinNums: (v: boolean) => void }) {
  return (
    <div className="l06-card">
      <p className="l06-card__p">
        <b>Hover or tap</b> any wire or pin to light up its whole net. <b>Click a symbol</b> to inspect the part.
      </p>
      <div className="l06-card__label mono">Nets in Blinky</div>
      <div className="l06-netgrid">
        {NETS.map((n) => (
          <NetChip key={n} net={n} active={hoverNet === n} onClick={() => onNet(n)} />
        ))}
      </div>
      <div className="l06-card__label mono">Legend</div>
      <div className="l06-legend">
        <LegendRow sw={<span className="l06-sw l06-sw--sym" />} text="Symbol (a part)" />
        <LegendRow sw={<span className="l06-sw l06-sw--wire" />} text="Wire" />
        <LegendRow sw={<span className="l06-sw l06-sw--label mono">THR</span>} text="Net label" />
        <LegendRow sw={<GndIcon />} text="Ground flag" />
      </div>
      <Toggle label="Pin numbers" checked={pinNums} onChange={setPinNums} />
    </div>
  )
}

function LegendRow({ sw, text }: { sw: ReactNode; text: string }) {
  return (
    <div className="l06-legend__row">
      <span className="l06-legend__sw">{sw}</span>
      <span>{text}</span>
    </div>
  )
}

function GndIcon() {
  return (
    <svg width="18" height="16" viewBox="-9 -1 18 16" aria-hidden>
      <g stroke={SCH.flag} strokeWidth={1.4} fill="none">
        <line x1={0} y1={0} x2={0} y2={6} />
        <line x1={-8} y1={6} x2={8} y2={6} />
        <line x1={-5} y1={9.5} x2={5} y2={9.5} />
        <line x1={-2} y1={13} x2={2} y2={13} />
      </g>
    </svg>
  )
}

function PartCard({
  inst,
  graph,
  onBack,
  onPin,
  focusPin,
}: {
  inst: SymInst
  graph: ReturnType<typeof netGraph>
  onBack: () => void
  onPin: (key: string, net: string | null) => void
  focusPin: string | null
}) {
  const part = parts.find((p) => p.ref === inst.ref)!
  const fp = getFootprint(part.fp)
  const pins = symPins(inst).sort((a, b) => +a.num - +b.num)
  const pad = 0.8
  const vb = `${-fp.courtyard.w - pad} ${-fp.courtyard.h - pad} ${fp.courtyard.w * 2 + pad * 2} ${fp.courtyard.h * 2 + pad * 2}`
  const kind = { R: 'Resistor', C: 'Capacitor', LED: 'Light-emitting diode', NE555: 'Timer IC', HDR2: 'Pin header' }[inst.sym]
  return (
    <div className="l06-card">
      <button className="l06-back mono" onClick={onBack}>
        <IconChevronLeft size={13} /> All nets
      </button>
      <div className="l06-part__head">
        <span className="l06-part__ref mono">{inst.ref}</span>
        <div>
          <div className="l06-part__kind">{kind}</div>
          <div className="l06-part__val mono">{inst.value}</div>
        </div>
      </div>
      <p className="l06-card__p">{part.role}</p>
      <div className="l06-look">
        <svg viewBox={vb} className="l06-look__svg" aria-label={`${inst.ref} as a real ${fp.pkg} part`}>
          <rect x={-fp.courtyard.w - pad} y={-fp.courtyard.h - pad} width={fp.courtyard.w * 2 + pad * 2} height={fp.courtyard.h * 2 + pad * 2} fill="#1f6b47" />
          <FootprintGraphic fp={fp} mode="real" showBody showSilk value={inst.value} />
        </svg>
        <div className="l06-look__cap mono">
          <span>In real life</span>
          <b>{fp.pkg}</b>
          <span>
            {fp.body.w} × {fp.body.h} mm
          </span>
        </div>
      </div>
      <div className="l06-card__label mono">Pins → nets</div>
      <div className="l06-pins">
        {pins.map((p) => {
          const net = graph.netOf(`pin:${p.key}`)
          return (
            <button key={p.key} className={`l06-pinrow ${focusPin === p.key ? 'is-on' : ''}`} onClick={() => onPin(p.key, net)}>
              <span className="l06-pinrow__num mono">{p.num}</span>
              <span className="l06-pinrow__name mono">{p.name === p.num ? '' : p.name}</span>
              <NetChip net={net} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NetCard({ net, graph, onBack }: { net: string; graph: ReturnType<typeof netGraph>; onBack: () => void }) {
  const g = graph.groups.find((x) => x.name === net)
  const info = netInfo[net]
  const pins = (g?.pins ?? []).slice().sort()
  const labels = g?.members.filter((m) => m.startsWith('label:')).length ?? 0
  const flags = g?.members.filter((m) => m.startsWith('flag:')).length ?? 0
  return (
    <div className="l06-card">
      <button className="l06-back mono" onClick={onBack}>
        <IconChevronLeft size={13} /> All nets
      </button>
      <div className="l06-net__head">
        <span className="l06-net__sw" style={{ background: netColor(net) }} />
        <span className="l06-net__name mono">{net}</span>
        <Chip>{pins.length} pins</Chip>
      </div>
      {info && <p className="l06-card__p">{info.about}</p>}
      <div className="l06-card__label mono">Connects</div>
      <div className="l06-pinlist">
        {pins.map((k) => (
          <span key={k} className="l06-pinlist__pin mono">
            {k.replace('.', ' · ')}
          </span>
        ))}
      </div>
      {labels > 1 && (
        <div className="l06-note">
          <b>{labels} net labels</b> called {net}. There's no line drawn between them, but the same name means the same net.
        </div>
      )}
      {flags > 1 && (
        <div className="l06-note">
          <b>{flags} {net} flags</b>, all one net. Flags save you from drawing long wires to every ground pin.
        </div>
      )}
    </div>
  )
}

function JunctionCard({ onClose }: { onClose: () => void }) {
  const [dot, setDot] = useState(false)
  const a = '#1f7a3f'
  const b = dot ? a : '#3767c9'
  return (
    <div className="l06-card">
      <button className="l06-back mono" onClick={onClose}>
        <IconChevronLeft size={13} /> All nets
      </button>
      <p className="l06-card__p">
        A <b>dot</b> where wires meet means they're joined. Wires that simply <b>cross</b> without a dot are <b>not</b> connected.
        The rings show Blinky's four junctions.
      </p>
      <button className="l06-toy" onClick={() => setDot((d) => !d)} aria-label={dot ? 'Remove the junction dot' : 'Add a junction dot'}>
        <svg viewBox="0 0 140 92" width="100%">
          <rect x="0" y="0" width="140" height="92" rx="8" fill="var(--sch-bg)" />
          <line x1={14} y1={46} x2={126} y2={46} stroke={a} strokeWidth={2.4} strokeLinecap="round" />
          <line x1={70} y1={10} x2={70} y2={82} stroke={b} strokeWidth={2.4} strokeLinecap="round" style={{ transition: 'stroke 0.25s' }} />
          {dot && <circle cx={70} cy={46} r={4.6} fill={a} className="l06-pop" />}
          <text x={18} y={40} fontSize={8} fill={a} fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
            NET A
          </text>
          <text x={74} y={18} fontSize={8} fill={b} fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
            {dot ? 'NET A' : 'NET B'}
          </text>
        </svg>
        <span className="l06-toy__cap mono">{dot ? 'Dot: one net. Tap to remove' : 'Crossing: two nets. Tap to add a dot'}</span>
      </button>
      <div className="l06-note">
        Tidy schematics avoid four wires meeting at one dot. Use two T-junctions instead, so a dot can never be mistaken for a crossing.
      </div>
    </div>
  )
}
