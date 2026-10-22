import { useEffect, useRef, useState } from 'react'
import { useMission } from '../mission'
import { Button, Chip, FloatingCard, Segmented, Toggle } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { getFootprint, type PadDef } from '@/pcb/footprints'
import { Lab, type LabVis } from './Lab'
import { FitTest, FIT_OPTIONS, verdict } from './FitTest'
import { TrueSize } from './TrueSize'
import { CrossSection } from './CrossSection'
import { CHIP_IDS, PKGS, geometry, mm, padSize, pkgById } from './pkgs'
import { useSize } from './useSize'

type Mode = 'lab' | 'size' | 'xs' | 'fit'

const TOGGLES: { k: keyof LabVis; label: string; short: string }[] = [
  { k: 'body', label: 'Part body', short: 'Body' },
  { k: 'numbers', label: 'Pin numbers', short: 'Pins' },
  { k: 'silk', label: 'Silkscreen', short: 'Silk' },
  { k: 'courtyard', label: 'Courtyard', short: 'Court' },
  { k: 'dims', label: 'Dimensions', short: 'Dims' },
]

export function Scene() {
  const mission = useMission()
  const [ref, size] = useSize<HTMLDivElement>()
  const compact = size.w > 0 && size.w < 640
  const [mode, setMode] = useState<Mode>('lab')
  const [pkg, setPkg] = useState('R0805')
  const [vis, setVis] = useState<LabVis>({ body: true, numbers: true, silk: true, courtyard: false, dims: false })
  const [selPad, setSelPad] = useState<string | null>(null)
  const [padMsg, setPadMsg] = useState<string | null>(null)
  const [missedPin1, setMissedPin1] = useState(false)
  const [fitFp, setFitFp] = useState('SOIC-8')
  const [fitPart, setFitPart] = useState('SOIC-8')
  const [solder, setSolder] = useState(true)
  const visited = useRef(new Set<string>(['R0805']))
  const [, force] = useState(0)

  const pick = (id: string) => {
    setPkg(id)
    setSelPad(null)
    setPadMsg(null)
    setMissedPin1(false)
    if (CHIP_IDS.includes(id) && !visited.current.has(id)) {
      visited.current.add(id)
      force((n) => n + 1)
      if (CHIP_IDS.every((c) => visited.current.has(c))) mission.complete('sizes')
    }
  }
  useEffect(() => {
    if (mode === 'lab' && vis.dims && pkg === 'SOIC-8') mission.complete('pitch')
  }, [mode, vis.dims, pkg, mission])
  useEffect(() => {
    if (mode === 'fit' && fitFp !== fitPart) mission.complete('mismatch')
  }, [mode, fitFp, fitPart, mission])

  const fp = getFootprint(pkg)
  const isIC = pkg === 'SOIC-8' || pkg === 'DIP-8'
  const onPad = (p: PadDef) => {
    setSelPad(p.num)
    const label = p.name ? `${p.name === 'K' ? 'cathode (K)' : 'anode (A)'}, pin ${p.num}` : `pin ${p.num}`
    let msg = `Pad ${p.num}: ${padSize(p)} mm${p.drill ? `, drill ⌀${mm(p.drill)}` : ''} · ${label}`
    if (p.num === '1') {
      if (isIC) {
        mission.complete('pin1')
        msg = pkg === 'SOIC-8' ? 'Pin 1 found! On the PCB it’s marked by the silkscreen dot; on the chip by the dimple.' : 'Pin 1 found! Its pad is square, and the silkscreen notch is at this end.'
      } else if (p.shape === 'rect' && fp.mount === 'tht') msg += '. A square pad marks pin 1.'
    } else if (isIC) {
      setMissedPin1(true)
      msg = `That’s pin ${p.num}. Pin 1 is marked by ${pkg === 'SOIC-8' ? 'the silkscreen dot' : 'the square pad'}: look again.`
    }
    setPadMsg(msg)
  }

  const g = geometry(fp)
  const meta = pkgById[pkg]
  const v = verdict(fitPart, fitFp)
  const dark = mode === 'lab' || mode === 'fit'

  const pkgButtons = (
    <div className="l04-pkgs" role="radiogroup" aria-label="Package">
      {PKGS.map((p) => (
        <button key={p.id} role="radio" aria-checked={pkg === p.id} className={`l04-pkg ${pkg === p.id ? 'is-on' : ''} ${visited.current.has(p.id) && CHIP_IDS.includes(p.id) ? 'is-seen' : ''}`} onClick={() => pick(p.id)}>
          <span>{p.label}</span>
          <small>{p.group === 'THT' ? 'THT' : 'SMD'}</small>
        </button>
      ))}
    </div>
  )

  return (
    <div ref={ref} className={`l04-scene ${compact ? 'is-compact' : ''} ${dark ? 'is-dark' : 'is-light'}`}>
      {/* ---------------- footprint lab ---------------- */}
      {mode === 'lab' && (
        <>
          <Lab
            pkg={pkg}
            vis={vis}
            selPad={selPad}
            onPad={onPad}
            hintPin1={isIC && missedPin1}
            insetL={compact ? 0 : 262}
            insetR={compact ? 0 : 248}
            top={compact ? 92 : 0}
          />
          {compact ? (
            <div className="l04-strip" onPointerDown={(e) => e.stopPropagation()}>
              {pkgButtons}
              <div className="l04-quick">
                {TOGGLES.map((t) => (
                  <button key={t.k} className={vis[t.k] ? 'is-on' : ''} aria-pressed={vis[t.k]} onClick={() => setVis((s) => ({ ...s, [t.k]: !s[t.k] }))}>
                    {t.short}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <FloatingCard title="Footprint lab" subtitle="Pick a package. Click a pad to measure it.">
              {pkgButtons}
              <hr className="hr" />
              <div className="l04-toggles">
                {TOGGLES.map((t) => (
                  <Toggle key={t.k} label={t.label} checked={vis[t.k]} onChange={(c) => setVis((s) => ({ ...s, [t.k]: c }))} />
                ))}
              </div>
            </FloatingCard>
          )}
          {!compact && (
            <div className="float-card float-card--tr l04-info" onPointerDown={(e) => e.stopPropagation()}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="l04-info__name">{meta.label}</span>
                <Chip tone={fp.mount === 'smd' ? 'accent' : undefined}>{fp.mount.toUpperCase()}</Chip>
              </div>
              <div className="l04-info__fp mono">{fp.name}</div>
              <p>{meta.about}</p>
              <dl className="l04-dl">
                <dt>Pads</dt>
                <dd>{fp.pads.length}</dd>
                {g.pitch && (
                  <>
                    <dt>{fp.pads.length === 2 ? 'Centre–centre' : 'Pitch'}</dt>
                    <dd className={pkg === 'SOIC-8' && vis.dims ? 'is-hl' : ''}>{mm(g.pitch.v)} mm</dd>
                  </>
                )}
                {g.row && (
                  <>
                    <dt>Row spacing</dt>
                    <dd>{mm(g.row.v)} mm</dd>
                  </>
                )}
                <dt>Pad 1</dt>
                <dd>{padSize(fp.pads[0])} mm</dd>
                {fp.pads[0].drill && (
                  <>
                    <dt>Drill</dt>
                    <dd>⌀{mm(fp.pads[0].drill)} mm</dd>
                  </>
                )}
                <dt>Body</dt>
                <dd>
                  {fp.body.w} × {fp.body.h} mm
                </dd>
                {meta.metric && (
                  <>
                    <dt>Metric code</dt>
                    <dd>{meta.metric}</dd>
                  </>
                )}
              </dl>
              {meta.blinky && (
                <div className="l04-info__blinky">
                  <b className="mono">BLINKY</b> {meta.blinky}
                </div>
              )}
            </div>
          )}
          <div className={`l04-msg ${padMsg ? 'is-on' : ''}`} aria-live="polite">
            {padMsg ?? (isIC ? 'Which pad is pin 1? Click it.' : vis.dims ? 'Dimensions are in millimetres, measured centre to centre.' : 'Tip: turn on Dimensions to measure the pads.')}
          </div>
        </>
      )}

      {/* ---------------- true size ---------------- */}
      {mode === 'size' && (
        <>
          <TrueSize sel={pkg} onPick={pick} top={0} bottom={0} compact={compact} />
          <div className="float-card float-card--tl l04-sizecard" onPointerDown={(e) => e.stopPropagation()}>
            <div className="float-card__title">Real proportions</div>
            <div className="float-card__sub" style={{ marginBottom: 6 }}>
              Each small square is 1 mm. Tap a chip to compare.
            </div>
            <div className="l04-chips4">
              {CHIP_IDS.map((id) => (
                <span key={id} className={visited.current.has(id) ? 'is-seen' : ''}>
                  {pkgById[id].label}
                </span>
              ))}
            </div>
            {pkgById[pkg].metric && (
              <div className="l04-metric">
                <b>{pkgById[pkg].label}</b> imperial = <b>{pkgById[pkg].metric}</b> metric
                <div>
                  {getFootprint(pkg).body.w} × {getFootprint(pkg).body.h} mm
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------- cross-section ---------------- */}
      {mode === 'xs' && (
        <div className="l04-xs">
          {compact ? (
            <>
              <div className="l04-xs__art">
                <CrossSection solder={solder} part="tht" />
              </div>
              <div className="l04-xs__art">
                <CrossSection solder={solder} part="smd" />
              </div>
            </>
          ) : (
            <div className="l04-xs__art">
              <CrossSection solder={solder} />
            </div>
          )}
          <div className="l04-xs__row">
            <div className="l04-xs__card">
              <b>Through-hole</b>
              <span className="is-pro">Very strong joints, easy to hand-solder, fits breadboards</span>
              <span className="is-con">Needs drilled holes, uses both sides, bigger and slower to assemble</span>
            </div>
            <div className="l04-xs__mid" onPointerDown={(e) => e.stopPropagation()}>
              <Toggle label="Solder" checked={solder} onChange={setSolder} />
            </div>
            <div className="l04-xs__card">
              <b>Surface-mount</b>
              <span className="is-pro">Tiny, cheap, machine-placed, parts on both sides</span>
              <span className="is-con">Small parts are fiddly by hand, joints are less sturdy for heavy connectors</span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- fit test ---------------- */}
      {mode === 'fit' && (
        <>
          <FitTest fpId={fitFp} partId={fitPart} insetL={compact ? 0 : 262} top={compact ? 118 : 0} bottom={0} />
          {compact ? (
            <div className="l04-strip l04-strip--fit" onPointerDown={(e) => e.stopPropagation()}>
              <FitPicker label="Footprint" value={fitFp} onChange={setFitFp} />
              <FitPicker label="Part" value={fitPart} onChange={setFitPart} />
            </div>
          ) : (
            <FloatingCard title="Fit test" subtitle="Choose the footprint drawn on the PCB, then the part you actually bought.">
              <Segmented label="Footprint on the PCB" value={fitFp} onChange={setFitFp} options={FIT_OPTIONS.map((id) => ({ value: id, label: pkgById[id].label }))} />
              <Segmented label="Part you bought" accent value={fitPart} onChange={setFitPart} options={FIT_OPTIONS.map((id) => ({ value: id, label: pkgById[id].label }))} />
              <div className="l04-legend">
                <span>
                  <i className="is-ok" /> lead on a pad
                </span>
                <span>
                  <i className="is-bad" /> lead misses
                </span>
              </div>
            </FloatingCard>
          )}
          <div className={`l04-verdict ${v.ok ? 'is-ok' : 'is-bad'} ${compact ? 'is-compact' : ''}`} role="status" key={`${fitFp}-${fitPart}`}>
            <b>{v.ok ? '✓ Fits' : '✕ Wrong footprint'}</b>
            <span>{v.text}</span>
          </div>
        </>
      )}

      <SceneToolbar>
        {(
          [
            ['lab', compact ? 'Pads' : 'Footprint lab'],
            ['size', compact ? 'Size' : 'True size'],
            ['xs', compact ? 'THT/SMD' : 'THT vs SMD'],
            ['fit', compact ? 'Fit' : 'Fit test'],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <Button key={m} size="sm" variant="ghost" active={mode === m} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {label}
          </Button>
        ))}
      </SceneToolbar>
    </div>
  )
}

function FitPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="l04-fitpick">
      <span className="mono">{label}</span>
      <div>
        {FIT_OPTIONS.map((id) => (
          <button key={id} className={value === id ? 'is-on' : ''} onClick={() => onChange(id)}>
            {pkgById[id].label}
          </button>
        ))}
      </div>
    </div>
  )
}
