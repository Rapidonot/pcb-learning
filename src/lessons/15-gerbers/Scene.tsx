import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useMission } from '../mission'
import { Button, FloatingCard } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconEye, IconEyeOff, IconLayers, IconDownload, IconBox } from '@/components/icons'
import { PcbCanvas } from '@/pcb/PcbCanvas'
import { stages } from '@/pcb/project'
import { buildFiles, FILE_ORDER, type FileId, type GFile, type GLine } from './gerber'
import { LayerArt, PrimShape } from './LayerArt'
import { makeZip } from './zip'

/* draw order in the flat viewer, bottom → top */
const FLAT_ORDER: FileId[] = ['GBO', 'GBS', 'GBL', 'GTL', 'GTS', 'GTP', 'GTO', 'DRL', 'GKO']
/* physical order in the exploded stack, bottom → top */
const STACK_ORDER: FileId[] = ['GKO', 'GBO', 'GBS', 'GBL', 'DRL', 'GTL', 'GTS', 'GTP', 'GTO']

const fmtSize = (n: number) => (n < 1000 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)

export function useGerbers() {
  return useMemo(() => {
    const doc = stages.finished()
    return { doc, files: buildFiles(doc) }
  }, [])
}

export function downloadZip(files: Record<FileId, GFile>) {
  const readme = [
    'Learn PCB - educational sample Gerbers for the "Blinky" board',
    '',
    'These files were generated in your browser from the course board data so you can',
    'open them in a Gerber viewer and see how a fabrication package is organised.',
    'They are a teaching sample, not a checked production release. For a real order,',
    'export from EasyEDA: Export > PCB Fabrication File (Gerber).',
    '',
  ].join('\r\n')
  const bytes = makeZip([...FILE_ORDER.map((id) => ({ name: files[id].name, text: files[id].text })), { name: 'README_educational.txt', text: readme }])
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Blinky_Gerber_educational.zip'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/* ------------------------------------------------------------------ */

export function Scene() {
  const mission = useMission()
  const { doc, files } = useGerbers()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [visible, setVisible] = useState<Record<FileId, boolean>>(() => Object.fromEntries(FILE_ORDER.map((id) => [id, true])) as Record<FileId, boolean>)
  const [selFile, setSelFile] = useState<FileId>('GTL')
  const [selLine, setSelLine] = useState<number | null>(null)
  const [hoverPrim, setHoverPrim] = useState<number | null>(null)
  const [mode, setMode] = useState<'flat' | 'stack'>('flat')
  const [explode, setExplode] = useState(0.6)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width > 700))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const file = files[selFile]
  const selPrim = selLine !== null ? file.lines[selLine]?.prim ?? null : null

  /* missions */
  useEffect(() => {
    const on = FILE_ORDER.filter((id) => visible[id])
    if (on.length && on.every((id) => id === 'GTL' || id === 'GKO') && on.includes('GTL')) mission.complete('solo')
  }, [visible, mission])
  useEffect(() => {
    if (mode === 'stack' && explode >= 0.85) mission.complete('explode')
  }, [mode, explode, mission])

  const pickFile = (id: FileId) => {
    setSelFile(id)
    setSelLine(null)
    setHoverPrim(null)
  }
  const toggle = (id: FileId) => setVisible((v) => ({ ...v, [id]: !v[id] }))
  const solo = (id: FileId) => setVisible(Object.fromEntries(FILE_ORDER.map((k) => [k, k === id])) as Record<FileId, boolean>)
  const all = (on: boolean) => setVisible(Object.fromEntries(FILE_ORDER.map((k) => [k, on])) as Record<FileId, boolean>)

  const pickLine = useCallback(
    (i: number) => {
      setSelLine((cur) => (cur === i ? null : i))
      const l = files[selFile].lines[i]
      if (selFile === 'DRL' && (l.k === 'hole' || l.k === 'tool')) mission.complete('drill')
      if (selFile === 'GTS' && l.k === 'flash') mission.complete('mask')
    },
    [files, selFile, mission],
  )
  const pickPrim = (i: number) => {
    const li = file.lines.findIndex((l) => l.prim === i)
    if (li >= 0) setSelLine(li)
    if (selFile === 'GTS') mission.complete('mask')
    if (selFile === 'DRL') mission.complete('drill')
  }

  const fileList = (
    <div className="l15-files">
      {FILE_ORDER.map((id) => {
        const f = files[id]
        return (
          <div key={id} className={`l15-file ${selFile === id ? 'is-sel' : ''} ${visible[id] ? '' : 'is-off'}`}>
            <button className="l15-file__main" onClick={() => pickFile(id)} title={f.title}>
              <span className="l15-sw" style={{ background: f.color }} />
              <span className="l15-file__name mono">{f.name}</span>
            </button>
            <button className="l15-file__eye" onClick={() => toggle(id)} aria-label={visible[id] ? `Hide ${f.name}` : `Show ${f.name}`}>
              {visible[id] ? <IconEye size={15} /> : <IconEyeOff size={15} />}
            </button>
          </div>
        )
      })}
      <div className="l15-files__foot">
        <button onClick={() => all(true)}>Show all</button>
        <button onClick={() => solo('GTL')}>Copper only</button>
      </div>
    </div>
  )

  return (
    <div className={`l15-scene ${wide ? 'is-wide' : 'is-narrow'}`} ref={wrapRef}>
      <div className="l15-viewer">
        {mode === 'flat' ? (
          <FlatView
            files={files}
            w={doc.w}
            h={doc.h}
            uid={uid}
            visible={visible}
            sel={selFile}
            selPrim={selPrim}
            hoverPrim={hoverPrim}
            setHoverPrim={setHoverPrim}
            onPrim={pickPrim}
            leftPad={wide ? 13 : 0}
          />
        ) : (
          <StackView files={files} w={doc.w} h={doc.h} uid={uid} visible={visible} sel={selFile} explode={explode} onPick={pickFile} narrow={!wide} />
        )}

        <div className="l15-badge mono" aria-hidden>
          Gerber viewer · {mode === 'flat' ? 'top view' : 'layer stack'}
        </div>

        {wide && (
          <FloatingCard key={mode} defaultCollapsed={mode === 'stack'} title="Gerber_Blinky.zip" subtitle="9 files, one per layer. Click a name to read it, the eye to hide it." width={272}>
            {fileList}
          </FloatingCard>
        )}

        {mode === 'flat' && hoverPrim !== null && file.prims[hoverPrim] && (
          <div className="l15-hover mono">{file.prims[hoverPrim].label}</div>
        )}

        <SceneToolbar>
          <Button size="sm" variant="ghost" active={mode === 'flat'} onClick={() => setMode('flat')}>
            <IconBox size={15} /> 2D
          </Button>
          <Button size="sm" variant="ghost" active={mode === 'stack'} onClick={() => setMode('stack')}>
            <IconLayers size={15} /> Stack
          </Button>
          <span className="scene-toolbar__sep" />
          {mode === 'stack' && (
            <label className="l15-tslider">
              <span className="mono">Explode</span>
              <input
                type="range"
                className="slider"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                style={{ ['--fill' as string]: `${explode * 100}%` }}
                onChange={(e) => setExplode(parseFloat(e.target.value))}
                aria-label="Explode the layer stack"
              />
            </label>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMode('stack')
              setExplode((e) => (mode === 'stack' && e > 0.85 ? 0 : 1))
            }}
          >
            {mode === 'stack' && explode > 0.85 ? 'Collapse' : 'Explode'}
          </Button>
        </SceneToolbar>
      </div>

      <ContentsPanel
        files={files}
        file={file}
        selFile={selFile}
        onFile={pickFile}
        visible={visible}
        onToggle={toggle}
        onSolo={solo}
        selLine={selLine}
        onLine={pickLine}
        narrow={!wide}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Flat 2D viewer                                                      */
/* ------------------------------------------------------------------ */

function FlatView({
  files,
  w,
  h,
  uid,
  visible,
  sel,
  selPrim,
  hoverPrim,
  setHoverPrim,
  onPrim,
  leftPad,
}: {
  files: Record<FileId, GFile>
  w: number
  h: number
  uid: string
  visible: Record<FileId, boolean>
  sel: FileId
  selPrim: number | null
  hoverPrim: number | null
  setHoverPrim: (i: number | null) => void
  onPrim: (i: number) => void
  leftPad: number
}) {
  const fit = useMemo(() => ({ x: -leftPad, y: 0, w: w + leftPad, h: h + (leftPad ? 0 : 8) }), [w, h, leftPad])
  const f = files[sel]
  const hl = (i: number | null, color: string, dash = false) => {
    if (i === null || !f.prims[i]) return null
    return (
      <g style={{ pointerEvents: 'none' }} className={dash ? '' : 'l15-glow'}>
        <PrimShape p={f.prims[i]} fill="none" stroke={color} extra={0.25} />
      </g>
    )
  }
  return (
    <PcbCanvas fit={fit} theme="eda" grid={1} pad={1.6} ariaLabel="Gerber viewer">
      {/* faint board silhouette so the layers have context */}
      <rect x={0} y={0} width={w} height={h} rx={1.5} fill="rgba(255,255,255,0.02)" />
      {FLAT_ORDER.filter((id) => visible[id]).map((id) => (
        <g key={id} opacity={id === sel ? 0.92 : files[id].kind === 'copper' ? 0.42 : 0.6}>
          <LayerArt f={files[id]} uid={uid} w={w} h={h} />
        </g>
      ))}
      {/* hit areas for the selected file */}
      {visible[sel] && (
        <g>
          {f.prims.map((p, i) =>
            p.kind === 'region' ? null : (
              <g
                key={i}
                onPointerEnter={() => setHoverPrim(i)}
                onPointerLeave={() => setHoverPrim(null)}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onPrim(i)
                }}
                opacity={0}
              >
                <PrimShape p={p} fill="#fff" stroke="#fff" extra={p.kind === 'path' ? 0.35 : 0.2} hit />
              </g>
            ),
          )}
        </g>
      )}
      {hoverPrim !== selPrim && hl(hoverPrim, 'rgba(255,255,255,0.7)', true)}
      {hl(selPrim, '#ffffff')}
    </PcbCanvas>
  )
}

/* ------------------------------------------------------------------ */
/* Exploded isometric stack of translucent film sheets (CSS 3D)        */
/* ------------------------------------------------------------------ */

function StackView({
  files,
  w,
  h,
  uid,
  visible,
  sel,
  explode,
  onPick,
  narrow,
}: {
  files: Record<FileId, GFile>
  w: number
  h: number
  uid: string
  visible: Record<FileId, boolean>
  sel: FileId
  explode: number
  onPick: (id: FileId) => void
  narrow: boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const anchors = useRef<Partial<Record<FileId, HTMLSpanElement | null>>>({})
  const labels = useRef<Partial<Record<FileId, HTMLDivElement | null>>>({})
  const [entered, setEntered] = useState(false)
  const [size, setSize] = useState({ w: 600, h: 400 })
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => {
      ro.disconnect()
      cancelAnimationFrame(t)
    }
  }, [])

  // keep the 2D labels glued to the 3D sheets (they move during the CSS transition)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const box = boxRef.current?.getBoundingClientRect()
      if (box) {
        for (const id of STACK_ORDER) {
          const a = anchors.current[id]
          const l = labels.current[id]
          if (!a || !l) continue
          const r = a.getBoundingClientRect()
          const x = r.left - box.left
          const y = r.top - box.top
          l.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const sheetW = narrow ? Math.max(110, Math.min(size.w * 0.42, size.h * 0.46)) : Math.max(150, Math.min(size.w * 0.42, size.h * 0.62, 380))
  const sheetH = (sheetW * h) / w
  const gap = entered ? 4 + explode * (narrow ? Math.min(16, size.h / 22) : 40) : 0
  const mid = (STACK_ORDER.length - 1) / 2
  const stageT = entered ? 'rotateX(58deg) rotateZ(-36deg)' : 'rotateX(0deg) rotateZ(0deg)'
  const pad = 1.4
  const vb = `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`

  return (
    <div className="l15-stack" ref={boxRef}>
      <div className="l15-stack__floor" />
      <div className="l15-stack__stage" style={{ transform: `translate(-50%, -50%) ${stageT}`, width: sheetW, height: sheetH, left: narrow ? '42%' : '52%', top: narrow ? '44%' : '50%' }}>
        {STACK_ORDER.map((id, i) => {
          const f = files[id]
          const isCore = id === 'DRL'
          const on = visible[id]
          const z = (i - mid) * gap
          const style: CSSProperties = {
            transform: `translateZ(${z}px)`,
            opacity: on ? (sel === id || !entered ? 1 : 0.9) : 0.12,
          }
          return (
            <div
              key={id}
              className={`l15-sheet ${isCore ? 'is-core' : ''} ${sel === id ? 'is-sel' : ''}`}
              style={style}
              onClick={() => onPick(id)}
              role="button"
              tabIndex={0}
              aria-label={f.name}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(id)}
            >
              <svg viewBox={vb} width="100%" height="100%" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`film-${uid}-${id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity={isCore ? 0 : 0.22} />
                    <stop offset="0.45" stopColor="#ffffff" stopOpacity={isCore ? 0 : 0.06} />
                    <stop offset="1" stopColor="#ffffff" stopOpacity={isCore ? 0 : 0.14} />
                  </linearGradient>
                  {isCore && (
                    <pattern id={`weave-${uid}`} width={0.8} height={0.8} patternUnits="userSpaceOnUse">
                      <rect width={0.8} height={0.8} fill="#c9b27a" />
                      <path d="M0 0.2 H0.8 M0 0.6 H0.8" stroke="#b79d62" strokeWidth={0.12} />
                      <path d="M0.2 0 V0.8 M0.6 0 V0.8" stroke="#d6c294" strokeWidth={0.08} />
                    </pattern>
                  )}
                </defs>
                {isCore ? (
                  <rect x={-pad + 0.2} y={-pad + 0.2} width={w + pad * 2 - 0.4} height={h + pad * 2 - 0.4} rx={1.8} fill={`url(#weave-${uid})`} />
                ) : (
                  <>
                    <rect x={-pad + 0.15} y={-pad + 0.15} width={w + pad * 2 - 0.3} height={h + pad * 2 - 0.3} rx={1.2} fill="rgba(20,24,22,0.55)" />
                    <rect x={-pad + 0.15} y={-pad + 0.15} width={w + pad * 2 - 0.3} height={h + pad * 2 - 0.3} rx={1.2} fill={`url(#film-${uid}-${id})`} stroke="rgba(255,255,255,0.55)" strokeWidth={0.12} />
                    {/* registration marks, like real photo-plot films */}
                    {[
                      [-pad + 0.8, -pad + 0.8],
                      [w + pad - 0.8, -pad + 0.8],
                      [-pad + 0.8, h + pad - 0.8],
                      [w + pad - 0.8, h + pad - 0.8],
                    ].map(([x, y], k) => (
                      <g key={k} stroke="rgba(255,255,255,0.5)" strokeWidth={0.07} fill="none">
                        <circle cx={x} cy={y} r={0.35} />
                        <path d={`M ${x - 0.55} ${y} H ${x + 0.55} M ${x} ${y - 0.55} V ${y + 0.55}`} />
                      </g>
                    ))}
                    <rect x={0} y={0} width={w} height={h} rx={1.5} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={0.06} strokeDasharray="0.4 0.3" />
                  </>
                )}
                {isCore && <rect x={0} y={0} width={w} height={h} rx={1.5} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={0.08} />}
                <g style={{ mixBlendMode: isCore ? 'normal' : 'screen' }}>
                  <LayerArt f={f} uid={`${uid}s`} w={w} h={h} film />
                </g>
              </svg>
              {isCore && (
                <>
                  <div className="l15-core-edge l15-core-edge--front" />
                  <div className="l15-core-edge l15-core-edge--side" />
                </>
              )}
              <span className="l15-anchor" ref={(el) => void (anchors.current[id] = el)} />
            </div>
          )
        })}
      </div>
      <div className="l15-labels" aria-hidden>
        {STACK_ORDER.map((id) => (
          <div
            key={id}
            ref={(el) => void (labels.current[id] = el)}
            className={`l15-label ${sel === id ? 'is-sel' : ''} ${visible[id] ? '' : 'is-off'}`}
            style={{ opacity: entered && explode > 0.2 ? 1 : 0 }}
          >
            <span className="l15-label__line" />
            <span className="l15-sw" style={{ background: files[id].color }} />
            <span className="mono">{id === 'DRL' ? 'DRL' : id}</span>
            {!narrow && <span className="l15-label__t">{files[id].title}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* File contents                                                        */
/* ------------------------------------------------------------------ */

const TOKEN = /(%[^%]*%|G04.*|;.*|D0[123]|D\d{2,}|G0?[1-5]\d?|M\d+|T\d+C[\d.]+|T\d+|[XYIJ]-?[\d.]+)/g

function Code({ line }: { line: GLine }) {
  if (line.k === 'comment') return <span className="tk-c">{line.t}</span>
  const parts = line.t.split(TOKEN).filter(Boolean)
  return (
    <>
      {parts.map((p, i) => {
        let c = ''
        if (p.startsWith('%')) c = 'tk-x'
        else if (p === 'D01') c = 'tk-d1'
        else if (p === 'D02') c = 'tk-d2'
        else if (p === 'D03') c = 'tk-d3'
        else if (/^D\d{2,}$/.test(p)) c = 'tk-ap'
        else if (/^G/.test(p)) c = 'tk-g'
        else if (/^M/.test(p)) c = 'tk-m'
        else if (/^T/.test(p)) c = 'tk-ap'
        else if (/^[XY]/.test(p)) c = 'tk-n'
        else if (/^[IJ]/.test(p)) c = 'tk-ij'
        return (
          <span key={i} className={c}>
            {p}
          </span>
        )
      })}
    </>
  )
}

const LIMIT = 70

function ContentsPanel({
  files,
  file,
  selFile,
  onFile,
  visible,
  onToggle,
  onSolo,
  selLine,
  onLine,
  narrow,
}: {
  files: Record<FileId, GFile>
  file: GFile
  selFile: FileId
  onFile: (id: FileId) => void
  visible: Record<FileId, boolean>
  onToggle: (id: FileId) => void
  onSolo: (id: FileId) => void
  selLine: number | null
  onLine: (i: number) => void
  narrow: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)
  useEffect(() => setShowAll(false), [selFile])
  useEffect(() => {
    if (selLine === null) return
    if (selLine >= LIMIT) setShowAll(true)
    const t = window.setTimeout(() => {
      const box = codeRef.current
      const el = box?.querySelector<HTMLElement>(`[data-line="${selLine}"]`)
      if (box && el) {
        const top = el.offsetTop - box.clientHeight / 3
        box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }
    }, 30)
    return () => window.clearTimeout(t)
  }, [selLine])
  const lines = showAll ? file.lines : file.lines.slice(0, LIMIT)
  const more = file.lines.length - lines.length
  const sel = selLine !== null ? file.lines[selLine] : null

  return (
    <div className="l15-contents">
      {narrow && (
        <div className="l15-chips" role="tablist">
          {FILE_ORDER.map((id) => (
            <button key={id} role="tab" aria-selected={selFile === id} className={`l15-chip ${selFile === id ? 'is-on' : ''} ${visible[id] ? '' : 'is-off'}`} onClick={() => onFile(id)}>
              <span className="l15-sw" style={{ background: files[id].color }} />
              {id}
            </button>
          ))}
        </div>
      )}
      <div className="l15-contents__head">
        <span className="l15-sw l15-sw--lg" style={{ background: file.color }} />
        <div className="l15-contents__title">
          <div className="mono l15-contents__name">{file.name}</div>
          <div className="l15-contents__meta mono">
            {file.kind === 'drill' ? 'Excellon' : 'RS-274X'} · {file.lines.length} lines · {fmtSize(file.text.length)}
          </div>
        </div>
        <button className="l15-iconbtn" onClick={() => onToggle(selFile)} aria-label={visible[selFile] ? 'Hide this layer' : 'Show this layer'}>
          {visible[selFile] ? <IconEye size={15} /> : <IconEyeOff size={15} />}
        </button>
        <button className="l15-iconbtn l15-iconbtn--txt mono" onClick={() => onSolo(selFile)} title="Show only this layer">
          Solo
        </button>
        {narrow && (
          <button className="l15-iconbtn" onClick={() => downloadZip(files)} aria-label="Download sample Gerbers (educational)">
            <IconDownload size={15} />
          </button>
        )}
      </div>
      <p className="l15-contents__about">{file.about}</p>
      <div className="l15-code mono" ref={codeRef}>
        {lines.map((l, i) => (
          <button key={i} data-line={i} className={`l15-line ${selLine === i ? 'is-on' : ''} ${l.prim !== undefined ? 'has-prim' : ''}`} onClick={() => onLine(i)}>
            <span className="l15-ln">{i + 1}</span>
            <span className="l15-lt">
              <Code line={l} />
            </span>
          </button>
        ))}
        {more > 0 && (
          <button className="l15-more" onClick={() => setShowAll(true)}>
            … {more} more lines · show all
          </button>
        )}
      </div>
      <div className="l15-explain">
        {sel ? (
          <>
            <div className="l15-explain__code mono">
              <Code line={sel} />
            </div>
            <div>{sel.note}</div>
          </>
        ) : (
          <div className="l15-explain__hint">
            Click any line to see what it tells the machine.{' '}
            {file.kind !== 'drill' && file.kind !== 'outline' ? 'Click a shape in the viewer to find its line.' : ''}
          </div>
        )}
      </div>
      {!narrow && <div className="l15-contents__foot">
        <Button size="sm" onClick={() => downloadZip(files)}>
          <IconDownload size={14} /> Download sample Gerbers
        </Button>
        <span className="l15-edu mono">educational</span>
      </div>}
    </div>
  )
}
