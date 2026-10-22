/* Lesson 13 scene: tidy up Blinky's silkscreen, with live checks and a "real board" preview. */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMission } from '../mission'
import { Button, Slider, Segmented, Toggle, Kbd } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconPointer, IconEye, IconEyeOff, IconX, IconRotate, IconCheck, IconWarn, IconCube, IconReset } from '@/components/icons'
import { PcbCanvas } from '@/pcb/PcbCanvas'
import { BoardView, PadGlyph, PartBodyTop, partTransform } from '@/pcb/render'
import { allPads, type BoardDoc } from '@/pcb/board'
import { getFootprint } from '@/pcb/footprints'
import { stages } from '@/pcb/project'
import { EDA, MASKS, type MaskColor } from '@/pcb/palette'
import { dist, pointInPoly, type Vec } from '@/pcb/geom'
import { MIN_LINE, MIN_SIZE, SUGGEST, checkSilk, labelPoly, labelSize, messyLabels, type Issue, type Label } from './silk'
import { Marks, Outlines, SilkText } from './SilkArt'

type Tool = 'select' | 'mark'
type View = 'eda' | 'real'

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [s, setS] = useState({ w: 900, h: 600 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setS({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return s
}

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const v = useRef(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => (v.current = e.intersectionRatio > 0.25), { threshold: [0, 0.25, 0.5] })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return v
}

const r2 = (v: number) => Math.round(v * 100) / 100
const norm = (a: number) => ((Math.round(a) % 360) + 360) % 360

/* ------------------------------------------------------------------ */

export function Scene() {
  const mission = useMission()
  const rootRef = useRef<HTMLDivElement>(null)
  const size = useSize(rootRef)
  const narrow = size.w < 640
  const inView = useInView(rootRef)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const doc = useMemo<BoardDoc>(() => ({ ...stages.finished(), texts: [] }), [])
  const pads = useMemo(() => allPads(doc), [doc])
  const [labels, setLabels] = useState<Label[]>(messyLabels)
  const [sel, setSel] = useState<string[]>([])
  const [tool, setTool] = useState<Tool>('select')
  const [view, setView] = useState<View>('eda')
  const [mask, setMask] = useState<MaskColor>('green')
  const [bodies, setBodies] = useState(true)
  const [copper, setCopper] = useState(false)
  const [hints, setHints] = useState(false)
  const [led, setLed] = useState<'cathode' | 'anode' | null>(null)
  const [pin1, setPin1] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [nameMoved, setNameMoved] = useState(false)
  const [connLabels, setConnLabels] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [flash, setFlash] = useState<string | null>(null)
  const drag = useRef<{ start: Vec; orig: Map<string, Vec>; moved: boolean } | null>(null)

  useEffect(() => {
    if (narrow) setPanelOpen(false)
  }, [narrow])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 3000)
    return () => clearTimeout(t)
  }, [flash])

  // board name + connector labels live in the same label list
  const nameText = `${name.trim()} ${version.trim()}`.trim()
  useEffect(() => {
    setLabels((ls) => {
      const rest = ls.filter((l) => l.id !== 'name')
      if (!nameText) return rest
      const prev = ls.find((l) => l.id === 'name')
      const base: Label = prev ?? { id: 'name', kind: 'text', text: nameText, x: 0, y: 23.9, size: 1.2, line: 0.18, rot: 0 }
      const next = { ...base, text: nameText }
      if (!nameMoved) next.x = r2(doc.w - 1.4 - labelSize(next).w / 2)
      return [...rest, next]
    })
  }, [nameText, nameMoved, doc.w])
  useEffect(() => {
    setLabels((ls) => {
      const rest = ls.filter((l) => l.id !== 'p5' && l.id !== 'pg')
      if (!connLabels) return rest
      return [
        ...rest,
        { id: 'p5', kind: 'text', text: '+5V', x: 6.75, y: 11.73, size: 1.0, line: 0.15, rot: 0 },
        { id: 'pg', kind: 'text', text: 'GND', x: 6.75, y: 14.27, size: 1.0, line: 0.15, rot: 0 },
      ]
    })
  }, [connLabels])

  const issues = useMemo(() => checkSilk(doc, pads, labels), [doc, pads, labels])
  const issuesOf = useCallback((id: string) => issues.filter((i) => i.label === id || i.id.includes(`${id}:`)), [issues])
  const refs = labels.filter((l) => l.kind === 'ref')
  const placeKinds = ['pad', 'hidden', 'overlap', 'offboard', 'far', 'wrongpart']
  const placeOK = refs.every((l) => !issuesOf(l.id).some((i) => placeKinds.includes(i.kind)))
  const sizeOK = labels.every((l) => !issuesOf(l.id).some((i) => ['small', 'thin', 'orient'].includes(i.kind)))
  const polarityOK = led === 'cathode' && pin1 === '1'
  const nameLabel = labels.find((l) => l.id === 'name')
  const nameOK = name.trim().length >= 2 && version.trim().length >= 1 && !!nameLabel && !issuesOf('name').some((i) => i.severity === 'error')

  useEffect(() => {
    if (placeOK) mission.complete('place')
  }, [placeOK, mission])
  useEffect(() => {
    if (sizeOK) mission.complete('size')
  }, [sizeOK, mission])
  useEffect(() => {
    if (!polarityOK) return
    mission.complete('polarity')
    // next step needs the panel: open it (it starts collapsed on phones)
    setPanelOpen(true)
    setTool('select')
  }, [polarityOK, mission])
  useEffect(() => {
    if (nameOK) mission.complete('name')
  }, [nameOK, mission])

  /* ---------------- editing ---------------- */
  const patchSel = (patch: Partial<Label> | ((l: Label) => Partial<Label>)) =>
    setLabels((ls) => ls.map((l) => (sel.includes(l.id) ? { ...l, ...(typeof patch === 'function' ? patch(l) : patch) } : l)))
  const selected = labels.filter((l) => sel.includes(l.id))
  const first = selected[0]

  const hitLabel = (w: Vec) => {
    for (let i = labels.length - 1; i >= 0; i--) if (pointInPoly(w, labelPoly(labels[i], 0.25))) return labels[i]
    return null
  }

  const onDown = (e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    if (view !== 'eda') return
    if (tool === 'mark') {
      const cand = pads.filter((p) => p.ref === 'D1' || p.ref === 'U1').map((p) => ({ p, d: dist(w, [p.x, p.y]) })).sort((a, b) => a.d - b.d)[0]
      if (!cand || cand.d > 1.6) {
        setFlash('Click right next to one end of D1, or next to one of U1’s pins.')
        return
      }
      const p = cand.p
      if (p.ref === 'D1') {
        const end = p.num === '1' ? 'cathode' : 'anode'
        setLed(end)
        setFlash(end === 'cathode' ? 'Cathode bar placed. Pin 1 of D1 goes to GND: that’s the cathode.' : 'That end is the anode (+). The cathode is the end wired to GND.')
      } else {
        setPin1(p.num)
        setFlash(p.num === '1' ? 'Pin-1 dot placed next to U1 pin 1.' : `That's pin ${p.num}. Pin 1 is the first pin on the side with the notch: top left here.`)
      }
      if ((p.ref === 'D1' && p.num === '1' && pin1 === '1') || (p.ref === 'U1' && p.num === '1' && led === 'cathode')) setTool('select')
      return
    }
    const hit = hitLabel(w)
    if (!hit) {
      setSel([])
      return
    }
    let nextSel = sel
    if (e.shiftKey) nextSel = sel.includes(hit.id) ? sel.filter((s) => s !== hit.id) : [...sel, hit.id]
    else if (!sel.includes(hit.id)) nextSel = [hit.id]
    setSel(nextSel)
    drag.current = { start: w, orig: new Map(labels.filter((l) => nextSel.includes(l.id)).map((l) => [l.id, [l.x, l.y] as Vec])), moved: false }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    if (!panelOpen && !narrow) setPanelOpen(true)
  }
  const onMove = (_e: React.PointerEvent<SVGSVGElement>, w: Vec) => {
    const d = drag.current
    if (!d) return
    let dx = w[0] - d.start[0]
    let dy = w[1] - d.start[1]
    if (Math.hypot(dx, dy) > 0.05) d.moved = true
    // magnetic snap to the suggested spot when dragging a single designator
    if (d.orig.size === 1) {
      const [id, o] = [...d.orig.entries()][0]
      const l = labels.find((x) => x.id === id)
      if (l?.ref && SUGGEST[l.ref]) {
        const [sx, sy] = SUGGEST[l.ref]
        if (Math.hypot(o[0] + dx - sx, o[1] + dy - sy) < 0.8) {
          dx = sx - o[0]
          dy = sy - o[1]
        }
      }
    }
    setLabels((ls) =>
      ls.map((l) => {
        const o = d.orig.get(l.id)
        return o ? { ...l, x: r2(Math.round((o[0] + dx) * 20) / 20), y: r2(Math.round((o[1] + dy) * 20) / 20) } : l
      }),
    )
    if (d.orig.has('name')) setNameMoved(true)
  }
  const onUp = () => {
    drag.current = null
  }

  const selectAllRefs = () => {
    setSel(labels.filter((l) => l.kind === 'ref').map((l) => l.id))
    setPanelOpen(true)
  }
  const rotateSel = () => patchSel((l) => ({ rot: norm(l.rot + 90) }))
  const snapSel = () => patchSel((l) => (l.ref && SUGGEST[l.ref] ? { x: SUGGEST[l.ref][0], y: SUGGEST[l.ref][1] } : {}))
  const resetAll = () => {
    setLabels(messyLabels())
    setSel([])
    setLed(null)
    setPin1(null)
    setName('')
    setVersion('')
    setNameMoved(false)
    setConnLabels(false)
  }

  /* ---------------- keys ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inView.current) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const step = e.shiftKey ? 1 : 0.1
      const k = e.key
      if (k === 'Escape') {
        setSel([])
        setTool('select')
      } else if (!sel.length) return
      else if (k === ' ') rotateSel()
      else if (k === 'ArrowLeft') patchSel((l) => ({ x: r2(l.x - step) }))
      else if (k === 'ArrowRight') patchSel((l) => ({ x: r2(l.x + step) }))
      else if (k === 'ArrowUp') patchSel((l) => ({ y: r2(l.y - step) }))
      else if (k === 'ArrowDown') patchSel((l) => ({ y: r2(l.y + step) }))
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------------- coaching ---------------- */
  const errorCount = issues.filter((i) => i.severity === 'error').length
  let coach: { tone: 'info' | 'good' | 'warn' | 'bad'; text: ReactNode }
  if (tool === 'mark') coach = { tone: 'info', text: <>Click the <b>cathode</b> end of D1 (the end wired to GND), and <b>pin 1</b> of U1.</> }
  else if (!placeOK) coach = { tone: 'bad', text: <>Drag each designator <b>off the pads</b> and right next to its own part. Magenta means silk on copper the fab will clip.</> }
  else if (!sizeOK) coach = { tone: 'warn', text: <>Now make every label readable: <b>Select all designators</b>, then set 1.0 mm height, 0.15 mm lines and 0° rotation.</> }
  else if (!polarityOK) coach = { tone: 'warn', text: <>Use <b>Mark</b> to add the LED's cathode bar and U1's pin-1 dot, so nobody solders them backwards.</> }
  else if (!nameOK) coach = { tone: 'info', text: <>Finally, sign your work: type a <b>board name</b> and <b>version</b> in the panel.</> }
  else if (view === 'eda') coach = { tone: 'good', text: <>Clean silkscreen! Switch to <b>Real board</b> to see how the factory will print it.</> }
  else coach = { tone: 'good', text: <>That's how it will come back from the factory. Try another solder-mask colour.</> }
  if (flash) coach = { tone: 'info', text: flash }

  /* ---------------- render ---------------- */
  const fit = narrow ? { x: 0, y: -1.5, w: doc.w, h: doc.h + 3 } : { x: -1.5, y: -2.6, w: doc.w + 1.5 + 15, h: doc.h + 5.6 }
  const m = MASKS[mask]
  const silkColor = view === 'eda' ? EDA.silkTop : m.silk
  const errLabels = new Set(issues.filter((i) => i.severity === 'error').flatMap((i) => [i.label, ...i.id.split(':').slice(0, 2)]))
  const warnLabels = new Set(issues.filter((i) => i.severity === 'warn').map((i) => i.label))
  const padClip = `padclip-${uid}`
  const noPads = `nopads-${uid}`
  const markBad = EDA.drc

  const silkLayer = (real: boolean) => (
    <g>
      <defs>
        <clipPath id={padClip}>
          {pads.map((p) => (
            <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              <PadGlyph pad={p} fill="#000" hole={null} inflate={0.05} />
            </g>
          ))}
        </clipPath>
        <mask id={noPads} maskUnits="userSpaceOnUse" x={-5} y={-5} width={doc.w + 10} height={doc.h + 10}>
          <rect x={-5} y={-5} width={doc.w + 10} height={doc.h + 10} fill="#fff" />
          {pads.map((p) => (
            <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              <PadGlyph pad={p} fill="#000" hole={null} inflate={0.08} />
            </g>
          ))}
        </mask>
      </defs>
      <g mask={real ? `url(#${noPads})` : undefined}>
        <Outlines doc={doc} color={silkColor} />
        <Marks led={led} pin1={pin1} color={silkColor} bad={real ? undefined : markBad} pads={pads} />
        {labels.map((l) => (
          <SilkText key={l.id} l={l} color={silkColor} minLine={real ? MIN_LINE : 0} />
        ))}
      </g>
      {!real && (
        <g clipPath={`url(#${padClip})`} style={{ pointerEvents: 'none' }}>
          {labels.map((l) => (
            <SilkText key={l.id} l={l} color={EDA.drc} />
          ))}
        </g>
      )}
    </g>
  )

  const statusFor = (l: Label) => (errLabels.has(l.id) ? 'err' : warnLabels.has(l.id) ? 'warn' : 'ok')

  const toolbar = (
    <SceneToolbar>
      <Button size="sm" variant="ghost" active={tool === 'select'} onClick={() => setTool('select')} aria-label="Select and move labels">
        <IconPointer size={15} /> {!narrow && 'Select'}
      </Button>
      <Button size="sm" variant="ghost" active={tool === 'mark'} onClick={() => { setTool(tool === 'mark' ? 'select' : 'mark'); setView('eda'); setSel([]); if (narrow) setPanelOpen(false) }} aria-label="Place polarity and pin-1 marks">
        <span className="l13-markico" aria-hidden /> Mark
      </Button>
      <Button size="sm" variant="ghost" onClick={selectAllRefs} aria-label="Select all designators">
        <span className="l13-allico" aria-hidden>R?</span> {!narrow && 'All designators'}
      </Button>
      <Button size="sm" variant="ghost" onClick={rotateSel} disabled={!sel.length} aria-label="Rotate selected 90° (Space)">
        <IconRotate size={15} />
      </Button>
      <span className="scene-toolbar__sep" />
      <Button size="sm" variant="ghost" active={hints} onClick={() => setHints((h) => !h)} aria-label="Show suggested spots">
        {hints ? <IconEye size={15} /> : <IconEyeOff size={15} />} {!narrow && 'Hints'}
      </Button>
      <Button size="sm" variant="ghost" active={view === 'real'} onClick={() => { setView(view === 'real' ? 'eda' : 'real'); setTool('select') }} aria-label="Toggle real board preview">
        <IconCube size={15} /> {narrow ? 'Real' : 'Real board'}
      </Button>
    </SceneToolbar>
  )

  return (
    <div ref={rootRef} className="l13-root">
      <PcbCanvas
        fit={fit}
        pad={narrow ? 1 : 0.8}
        theme={view === 'eda' ? 'eda' : 'paper'}
        grid={view === 'eda' ? 1 : false}
        zoomControls={!narrow}
        cursor={tool === 'mark' ? 'crosshair' : 'default'}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        ariaLabel="Blinky board silkscreen editor"
      >
        {view === 'eda' ? (
          <BoardView doc={doc} mode="eda" vis={{ silk: false, refs: false, ratsnest: false, pours: copper }}>
            {silkLayer(false)}
            {/* hints: suggested spots */}
            {hints &&
              refs.map((l) => {
                const s = SUGGEST[l.ref!]
                if (!s || (Math.abs(l.x - s[0]) < 0.06 && Math.abs(l.y - s[1]) < 0.06)) return null
                const ghost: Label = { ...l, x: s[0], y: s[1], size: 1, line: 0.15, rot: 0 }
                return (
                  <g key={l.id} opacity={0.55} style={{ pointerEvents: 'none' }}>
                    <polygon points={labelPoly(ghost, 0.1).map((p) => p.join(',')).join(' ')} fill="none" stroke="#7fe1ff" strokeWidth={0.06} strokeDasharray="0.25 0.15" />
                    <SilkText l={ghost} color="#7fe1ff" />
                  </g>
                )
              })}
            {/* mark tool: show pin numbers and nets */}
            {tool === 'mark' && (
              <g style={{ pointerEvents: 'none' }}>
                {pads
                  .filter((p) => p.ref === 'U1' || p.ref === 'D1')
                  .map((p) => (
                    <text key={p.key} x={p.x} y={p.y + 0.22} fontSize={0.6} textAnchor="middle" fill="#fff" fontFamily="IBM Plex Mono, monospace" fontWeight={700}>
                      {p.ref === 'U1' ? p.num : p.net}
                    </text>
                  ))}
              </g>
            )}
            {/* status boxes and selection */}
            {labels.map((l) => {
              const st = statusFor(l)
              const isSel = sel.includes(l.id)
              if (st === 'ok' && !isSel) return null
              return (
                <polygon
                  key={l.id}
                  points={labelPoly(l, 0.12).map((p) => p.join(',')).join(' ')}
                  fill={isSel ? 'rgba(255,255,255,0.08)' : 'none'}
                  stroke={isSel ? '#fff' : st === 'err' ? EDA.drc : '#ffa940'}
                  strokeWidth={isSel ? 0.07 : 0.06}
                  strokeDasharray={isSel ? '0.3 0.15' : st === 'warn' ? '0.2 0.15' : undefined}
                  className={st === 'err' && !isSel ? 'l13-err' : ''}
                  style={{ pointerEvents: 'none' }}
                />
              )
            })}
          </BoardView>
        ) : (
          <g>
            <BoardView doc={doc} mode="real" maskColor={mask} vis={{ silk: false, refs: false, bodies: false }} />
            <g clipPath={`url(#bclip-${uid})`}>
              <defs>
                <clipPath id={`bclip-${uid}`}>
                  <rect x={0} y={0} width={doc.w} height={doc.h} rx={doc.corner} />
                </clipPath>
              </defs>
              {silkLayer(true)}
            </g>
            {bodies &&
              doc.parts.map((p) => (
                <g key={p.ref} transform={partTransform(p)} style={{ filter: 'drop-shadow(0.15px 0.25px 0.2px rgba(0,0,0,0.45))' }}>
                  <PartBodyTop fp={getFootprint(p.fp)} value={p.value} />
                </g>
              ))}
          </g>
        )}
      </PcbCanvas>

      <div className={`l13-coach l13-coach--${coach.tone}`} role="status">
        <span className="l13-coach__dot" />
        <span>{coach.text}</span>
      </div>

      {toolbar}

      <div className={`l13-side ${panelOpen ? '' : 'is-collapsed'}`} onPointerDown={(e) => e.stopPropagation()}>
        <div className="float-card__head">
          <div className="float-card__title">{first && view === 'eda' ? 'Property' : 'Silk check'}</div>
          {!first && (
            <span className={`l13-count ${issues.length ? (errorCount ? 'is-bad' : 'is-warn') : 'is-good'}`}>
              {issues.length ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : 'all clear'}
            </span>
          )}
          <button className="float-card__collapse" aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'} onClick={() => setPanelOpen((o) => !o)}>
            {panelOpen ? '–' : '+'}
          </button>
        </div>

        {panelOpen && first && view === 'eda' && (
          <div className="l13-side__body">
            <div className="l13-kind mono">{selected.length > 1 ? `${selected.length} texts selected` : `${first.kind === 'ref' ? 'Designator' : 'Text'} · ${first.text}`}</div>
            <Slider label={selected.length > 1 && new Set(selected.map((l) => l.size)).size > 1 ? 'Text height (mixed)' : 'Text height'} value={Math.min(...selected.map((l) => l.size))} min={0.5} max={2} step={0.1} onChange={(v) => patchSel({ size: r2(v) })} format={(v) => `${v.toFixed(1)} mm`} />
            <Slider label={selected.length > 1 && new Set(selected.map((l) => l.line)).size > 1 ? 'Line width (mixed)' : 'Line width'} value={Math.min(...selected.map((l) => l.line))} min={0.08} max={0.3} step={0.01} onChange={(v) => patchSel({ line: r2(v) })} format={(v) => `${v.toFixed(2)} mm`} />
            <div className="l13-field">
              <span>Reads</span>
              <Segmented
                value={norm(first.rot)}
                onChange={(v) => patchSel({ rot: v })}
                options={[
                  { value: 0, label: '→ 0°' },
                  { value: 90, label: '↑ 90°' },
                  { value: 180, label: '← 180°' },
                  { value: 270, label: '↓ 270°' },
                ]}
              />
            </div>
            <ul className="l13-issues">
              {selected.flatMap((l) => issuesOf(l.id)).slice(0, 4).map((i) => (
                <li key={i.id} className={`is-${i.severity}`}>
                  {i.severity === 'error' ? <IconX size={13} /> : <IconWarn size={13} />}
                  <span>{i.text}</span>
                </li>
              ))}
              {!selected.some((l) => issuesOf(l.id).length) && (
                <li className="is-ok">
                  <IconCheck size={13} />
                  <span>Looks good.</span>
                </li>
              )}
            </ul>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {selected.some((l) => l.ref) && (
                <Button size="sm" onClick={snapSel}>
                  Snap to suggested spot
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => { setSel([]); if (narrow) setPanelOpen(false) }}>
                Done
              </Button>
            </div>
          </div>
        )}

        {panelOpen && (!first || view !== 'eda') && (
          <div className="l13-side__body">
            <ul className="l13-checks">
              <Check ok={placeOK} text="Designators off the pads, next to their parts" />
              <Check ok={sizeOK} text={`Text ≥ ${MIN_SIZE} mm, lines ≥ ${MIN_LINE} mm, reading the right way`} />
              <Check ok={polarityOK} text="LED cathode and U1 pin 1 marked" />
              <Check ok={nameOK} text="Board name and version" />
              <Check ok={connLabels} optional text="+5V / GND next to the power header" />
            </ul>
            {issues.length > 0 && (
              <ul className="l13-issues l13-issues--list">
                {issues.slice(0, 6).map((i: Issue) => (
                  <li key={i.id} className={`is-${i.severity}`}>
                    <button onClick={() => { setSel([i.label]); setView('eda') }}>
                      {i.severity === 'error' ? <IconX size={13} /> : <IconWarn size={13} />}
                      <span>{i.text}</span>
                    </button>
                  </li>
                ))}
                {issues.length > 6 && <li className="l13-more">+{issues.length - 6} more</li>}
              </ul>
            )}
            <div className="l13-namerow">
              <label className="l13-field">
                <span>Board name</span>
                <input className="l13-input" value={name} maxLength={14} placeholder="BLINKY" onChange={(e) => setName(e.target.value.toUpperCase())} aria-label="Board name" />
              </label>
              <label className="l13-field l13-field--ver">
                <span>Version</span>
                <input className="l13-input" value={version} maxLength={6} placeholder="v1.0" onChange={(e) => setVersion(e.target.value)} aria-label="Version" />
              </label>
            </div>
            <Toggle label="Add +5V and GND labels at J1" checked={connLabels} onChange={setConnLabels} />
            {view === 'real' ? (
              <>
                <div className="l13-field">
                  <span>Solder mask</span>
                  <div className="l13-swatches" role="radiogroup" aria-label="Solder mask colour">
                    {(Object.keys(MASKS) as MaskColor[]).map((c) => (
                      <button key={c} role="radio" aria-checked={mask === c} aria-label={c} className={mask === c ? 'is-on' : ''} style={{ background: MASKS[c].mask }} onClick={() => setMask(c)} />
                    ))}
                  </div>
                </div>
                <Toggle label="Show assembled parts" checked={bodies} onChange={setBodies} />
              </>
            ) : (
              <Toggle label="Show copper pour" checked={copper} onChange={setCopper} />
            )}
            <div className="row" style={{ gap: 6 }}>
              <Button size="sm" variant="ghost" onClick={resetAll}>
                <IconReset size={14} /> Messy again
              </Button>
              <span className="l13-keys">
                <Kbd>Space</Kbd> rotate · arrows nudge
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Check({ ok, text, optional }: { ok: boolean; text: string; optional?: boolean }) {
  return (
    <li className={ok ? 'is-ok' : optional ? 'is-opt' : ''}>
      <span className="l13-checks__box">{ok ? <IconCheck size={12} /> : null}</span>
      <span>
        {text}
        {optional && !ok && <em> (bonus)</em>}
      </span>
    </li>
  )
}
