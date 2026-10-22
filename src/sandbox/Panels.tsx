import { useMemo, type ReactNode } from 'react'
import { beginnerRules, partPads, type DrcError, type DrcKind, type Layer } from '@/pcb/board'
import { getFootprint } from '@/pcb/footprints'
import { netInfo } from '@/pcb/project'
import { EDA } from '@/pcb/palette'
import { Meter, Slider, Toggle } from '@/components/ui'
import { IconCheck, IconEye, IconEyeOff, IconTrash, IconWarn } from '@/components/icons'
import type { EditorApi } from './Editor'
import { polyArea, totalTrackLength, trackLength } from './geometry'
import { roleOf } from './Chrome'
import type { LayerToggles, PanelTab } from './types'

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'layers', label: 'Layers' },
  { id: 'props', label: 'Properties' },
  { id: 'drc', label: 'DRC' },
]

export function SidePanel({ api, tab, setTab, sheetOpen, setSheetOpen }: { api: EditorApi; tab: PanelTab; setTab: (t: PanelTab) => void; sheetOpen: boolean; setSheetOpen: (o: boolean) => void }) {
  const fresh = api.drcState && api.drcState.doc === api.doc
  const badge: Partial<Record<PanelTab, ReactNode>> = {
    checklist: `${api.checklist.done}/6`,
    props: api.sel.length ? api.sel.length : undefined,
    drc: fresh ? api.drcState!.errors.length : undefined,
  }
  return (
    <aside className={`sbx-panel ${sheetOpen ? 'is-open' : ''}`} aria-label="Panels">
      <div className="sbx-panel__grab" onClick={() => setSheetOpen(!sheetOpen)} aria-hidden>
        <span />
      </div>
      <div className="sbx-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`sbx-tab ${tab === t.id ? 'is-on' : ''}`}
            onClick={() => {
              if (tab === t.id) setSheetOpen(!sheetOpen)
              else setSheetOpen(true)
              setTab(t.id)
            }}
            data-testid={`tab-${t.id}`}
          >
            {t.label}
            {badge[t.id] !== undefined && <span className={`sbx-tab__badge ${t.id === 'drc' && badge.drc === 0 ? 'is-good' : t.id === 'drc' ? 'is-bad' : ''}`}>{badge[t.id]}</span>}
          </button>
        ))}
      </div>
      <div className="sbx-panel__body">
        {tab === 'checklist' && <ChecklistTab api={api} />}
        {tab === 'layers' && <LayersTab api={api} />}
        {tab === 'props' && <PropsTab api={api} />}
        {tab === 'drc' && <DrcTab api={api} />}
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/* Checklist                                                           */
/* ------------------------------------------------------------------ */

function ChecklistTab({ api }: { api: EditorApi }) {
  const { checklist, doc, conn } = api
  const nets = useMemo(() => [...new Set(Object.values(doc.netlist))], [doc.netlist])
  const airByNet = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of conn.ratsnest) m[r.net] = (m[r.net] ?? 0) + 1
    return m
  }, [conn])
  const len = totalTrackLength(doc)
  return (
    <div className="sbx-pane" data-testid="checklist">
      <div className="sbx-progress">
        <div className="sbx-progress__ring" style={{ ['--p' as string]: checklist.done / checklist.items.length }}>
          <span className="mono">
            {checklist.done}/{checklist.items.length}
          </span>
        </div>
        <div className="grow">
          <div className="sbx-eyebrow mono">Capstone goals</div>
          <div className="sbx-progress__title">{checklist.allDone ? 'Board complete!' : 'Build Blinky from scratch'}</div>
          <div className="sbx-progress__sub">{checklist.allDone ? 'Every goal ticked. Fab-ready.' : 'Goals tick themselves as you work.'}</div>
        </div>
      </div>

      {checklist.allDone && (
        <button className="sbx-done-banner" onClick={api.openSummary} data-testid="board-complete">
          <span className="sbx-done-banner__badge">
            <IconCheck size={16} />
          </span>
          <span className="grow">
            <b>Board complete!</b>
            <span>See your summary and the 3D preview</span>
          </span>
          <span aria-hidden>→</span>
        </button>
      )}

      <ol className="sbx-checks">
        {checklist.items.map((it, i) => (
          <li key={it.id} className={`sbx-check ${it.done ? 'is-done' : ''}`} data-check={it.id} data-done={it.done ? '1' : '0'}>
            <span className="sbx-check__box">{it.done ? <IconCheck size={13} /> : <span className="mono">{i + 1}</span>}</span>
            <div className="grow">
              <div className="sbx-check__label">{it.label}</div>
              <div className="sbx-check__status">{it.status}</div>
              {it.progress !== undefined && !it.done && <Meter value={it.progress} />}
            </div>
          </li>
        ))}
      </ol>

      <div className="sbx-subhead mono">Nets</div>
      <div className="sbx-nets">
        {nets.map((n) => {
          const ok = conn.complete.has(n)
          return (
            <button
              key={n}
              className={`sbx-net ${ok ? 'is-ok' : ''} ${api.highlightNet === n ? 'is-hl' : ''}`}
              style={{ ['--c' as string]: netInfo[n]?.color }}
              onClick={() => api.setHighlightNet((c) => (c === n ? null : n))}
              title={netInfo[n]?.about}
            >
              <i />
              <span className="sbx-net__name mono">{n}</span>
              <span className="sbx-net__state">{ok ? <IconCheck size={12} /> : `${airByNet[n] ?? 0}`}</span>
            </button>
          )
        })}
      </div>
      <div className="sbx-hintline">Click a net to highlight it on the board. Numbers are airwires left.</div>

      <div className="sbx-stats">
        <Stat k="Tracks" v={`${len.toFixed(0)}`} u="mm" />
        <Stat k="Vias" v={doc.vias.length} />
        <Stat k="Pours" v={doc.pours.length} />
        <Stat k="Airwires" v={conn.ratsnest.length} tone={conn.ratsnest.length ? undefined : 'good'} />
      </div>
    </div>
  )
}

function Stat({ k, v, u, tone }: { k: string; v: ReactNode; u?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className={`sbx-stat ${tone ? `is-${tone}` : ''}`}>
      <div className="sbx-stat__k mono">{k}</div>
      <div className="sbx-stat__v mono">
        {v}
        {u && <small>{u}</small>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

function LayersTab({ api }: { api: EditorApi }) {
  const rows: { id: keyof LayerToggles; name: string; color: string; note?: string; copper?: Layer }[] = [
    { id: 'top', name: 'Top Layer', color: EDA.top, copper: 'top', note: 'T' },
    { id: 'bottom', name: 'Bottom Layer', color: EDA.bottom, copper: 'bottom', note: 'B' },
    { id: 'silk', name: 'Top Silkscreen', color: EDA.silkTop },
    { id: 'outline', name: 'Board Outline', color: EDA.outline },
    { id: 'pours', name: 'Copper Regions', color: '#d0675f', note: 'Shift+M' },
    { id: 'ratsnest', name: 'Ratlines', color: EDA.ratsnest },
    { id: 'drc', name: 'DRC markers', color: EDA.drc },
  ]
  return (
    <div className="sbx-pane">
      <p className="sbx-lead">Click a copper layer to make it active (new tracks go there). The eye hides a layer. The other copper layer is dimmed, as in EasyEDA.</p>
      <div className="sbx-layers">
        {rows.map((r) => {
          const on = api.layers[r.id]
          const active = r.copper && api.activeLayer === r.copper
          return (
            <div key={r.id} className={`sbx-layer ${active ? 'is-active' : ''} ${on ? '' : 'is-off'}`}>
              <button className="sbx-layer__main" onClick={() => r.copper && api.setActiveLayer(r.copper)} disabled={!r.copper} aria-pressed={!!active}>
                <span className="sbx-layer__sw" style={{ background: r.color }} />
                <span className="sbx-layer__name">{r.name}</span>
                {active && <span className="sbx-layer__active mono">ACTIVE</span>}
                {r.note && <span className="sbx-layer__key mono">{r.note}</span>}
              </button>
              <button className="sbx-layer__eye" onClick={() => api.setLayers((l) => ({ ...l, [r.id]: !l[r.id] }))} aria-label={on ? `Hide ${r.name}` : `Show ${r.name}`}>
                {on ? <IconEye size={15} /> : <IconEyeOff size={15} />}
              </button>
            </div>
          )
        })}
      </div>
      <div className="sbx-toggles">
        <Toggle label="Active layer only (Shift+S)" checked={api.singleLayer} onChange={api.setSingleLayer} />
        <Toggle label="Colour ratlines by net" checked={api.prefs.netColors} onChange={(v) => api.setPrefs((p) => ({ ...p, netColors: v }))} />
        <Toggle label="Net names on pads (zoom in)" checked={api.prefs.netLabels} onChange={(v) => api.setPrefs((p) => ({ ...p, netLabels: v }))} />
      </div>
      <div className="sbx-legend">
        {Object.entries(netInfo).map(([n, info]) => (
          <span key={n} className="sbx-legend__item">
            <i style={{ background: info.color }} />
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Properties                                                          */
/* ------------------------------------------------------------------ */

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="sbx-prop">
      <span className="sbx-prop__k mono">{k}</span>
      <span className="sbx-prop__v">{children}</span>
    </div>
  )
}

function NumIn({ value, onChange, step = 0.5, label }: { value: number; onChange: (v: number) => void; step?: number; label: string }) {
  return (
    <input
      className="sbx-num mono"
      type="number"
      step={step}
      value={Number(value.toFixed(3))}
      aria-label={label}
      onChange={(e) => {
        const v = parseFloat(e.target.value)
        if (Number.isFinite(v)) onChange(v)
      }}
    />
  )
}

function Seg<T extends string | number>({ value, options, onChange, testId }: { value: T; options: { v: T; l: ReactNode }[]; onChange: (v: T) => void; testId?: string }) {
  return (
    <div className="sbx-seg" data-testid={testId}>
      {options.map((o) => (
        <button key={String(o.v)} className={o.v === value ? 'is-on' : ''} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

function PropsTab({ api }: { api: EditorApi }) {
  const { sel, doc, conn, store } = api
  if (!sel.length) {
    return (
      <div className="sbx-pane">
        <div className="sbx-empty">
          <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden>
            <rect x="4" y="6" width="56" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M24 18l10 22 3-9 9-3z" fill="var(--accent)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <div className="sbx-empty__title">Nothing selected</div>
          <div className="sbx-empty__body">Click a part, track, via or copper region to edit it here, like EasyEDA’s Property panel.</div>
        </div>
        <div className="sbx-subhead mono">Board</div>
        <Row k="Size">
          {doc.w} × {doc.h} mm
        </Row>
        <Row k="Corners">{doc.corner} mm radius</Row>
        <Row k="Layers">2 (top + bottom copper)</Row>
        <Row k="Thickness">1.6 mm FR-4</Row>
        <Row k="Parts">{doc.parts.length}</Row>
        <Row k="Tracks">
          {doc.tracks.length} · {totalTrackLength(doc).toFixed(1)} mm
        </Row>
        <Row k="Vias">{doc.vias.length}</Row>
      </div>
    )
  }
  if (sel.length > 1) {
    return (
      <div className="sbx-pane">
        <div className="sbx-subhead mono">{sel.length} items selected</div>
        <ul className="sbx-sellist">
          {sel.map((s) => (
            <li key={s.kind + s.id}>
              <span className="mono">{s.kind}</span> {s.kind === 'part' ? s.id : ''}
            </li>
          ))}
        </ul>
        <div className="sbx-row">
          <button className="sbx-btn" onClick={api.rotateSelection}>
            Rotate parts
          </button>
          <button className="sbx-btn is-danger" onClick={api.deleteSelection}>
            Delete
          </button>
        </div>
      </div>
    )
  }
  const s = sel[0]
  if (s.kind === 'part') {
    const p = doc.parts.find((q) => q.ref === s.id)
    if (!p) return null
    const fp = getFootprint(p.fp)
    const pads = partPads(p, doc.netlist)
    const set = (patch: Partial<typeof p>) => store.commit((d) => ({ ...d, parts: d.parts.map((q) => (q.ref === p.ref ? { ...q, ...patch } : q)) }), { merge: `part:${p.ref}:${Object.keys(patch).join()}` })
    return (
      <div className="sbx-pane" data-testid="props-part">
        <div className="sbx-propcard">
          <div className="sbx-propcard__ref mono">{p.ref}</div>
          <div>
            <div className="sbx-propcard__val">{p.value}</div>
            <div className="sbx-propcard__fp mono">
              {fp.name} · {fp.mount.toUpperCase()}
            </div>
          </div>
        </div>
        <p className="sbx-lead">{roleOf(p.ref)}</p>
        <Row k="X (mm)">
          <NumIn value={p.x} onChange={(v) => set({ x: v })} label="X position" />
        </Row>
        <Row k="Y (mm)">
          <NumIn value={p.y} onChange={(v) => set({ y: v })} label="Y position" />
        </Row>
        <Row k="Rotation">
          <Seg value={p.rot} options={[0, 90, 180, 270].map((r) => ({ v: r, l: `${r}°` }))} onChange={(r) => set({ rot: r })} />
        </Row>
        <Row k="Layer">
          <Seg
            testId="part-side"
            value={p.side}
            options={[
              { v: 'top', l: 'Top' },
              { v: 'bottom', l: 'Bottom' },
            ]}
            onChange={(side) => side !== p.side && api.flipPart(p.ref, side)}
          />
        </Row>
        {p.side === 'bottom' && fp.mount === 'smd' && <div className="sbx-note">On the bottom the footprint is mirrored and its pads are bottom copper. Route to them on the bottom layer.</div>}
        <div className="sbx-subhead mono">Pins</div>
        <div className="sbx-pins">
          {pads.map((pd) => (
            <button key={pd.key} className={`sbx-pin ${api.highlightNet === pd.net ? 'is-hl' : ''}`} onClick={() => api.setHighlightNet((c) => (c === pd.net ? null : (pd.net ?? null)))}>
              <span className="mono">{pd.num}</span>
              <span className="sbx-pin__name">{pd.name ?? ''}</span>
              <span className="sbx-pin__net mono" style={{ color: netInfo[pd.net ?? '']?.color }}>
                {pd.net ?? '—'}
              </span>
            </button>
          ))}
        </div>
        <button className="sbx-btn" onClick={() => {
            api.crossProbe(p.ref)
            api.openSchematic()
          }}>
          Find in schematic (Shift+X)
        </button>
      </div>
    )
  }
  if (s.kind === 'track') {
    const t = doc.tracks.find((q) => q.id === s.id)
    if (!t) return null
    const net = conn.netOf.get(`track:${t.id}`) ?? t.net
    const set = (patch: Partial<typeof t>) => store.commit((d) => ({ ...d, tracks: d.tracks.map((q) => (q.id === t.id ? { ...q, ...patch } : q)) }))
    return (
      <div className="sbx-pane" data-testid="props-track">
        <div className="sbx-subhead mono">Track</div>
        <Row k="Net">
          <span className="mono" style={{ color: netInfo[net ?? '']?.color, fontWeight: 600 }}>
            {net ?? 'not connected'}
          </span>
        </Row>
        <Row k="Layer">
          <Seg value={t.layer} options={[{ v: 'top', l: 'Top' }, { v: 'bottom', l: 'Bottom' }]} onChange={(l) => set({ layer: l as Layer })} />
        </Row>
        <Row k="Width">
          <Seg value={t.width} options={[0.25, 0.5, 1.0].map((w) => ({ v: w, l: w.toFixed(2) }))} onChange={(w) => set({ width: w })} />
        </Row>
        <Row k="Length">{trackLength(t).toFixed(2)} mm</Row>
        <Row k="Segments">{t.pts.length - 1}</Row>
        {t.width < beginnerRules.minTrack && <div className="sbx-note is-warn">Thinner than the {beginnerRules.minTrack} mm minimum.</div>}
        <button className="sbx-btn is-danger" onClick={api.deleteSelection}>
          <IconTrash size={14} /> Delete track
        </button>
      </div>
    )
  }
  if (s.kind === 'via') {
    const v = doc.vias.find((q) => q.id === s.id)
    if (!v) return null
    const set = (patch: Partial<typeof v>) => store.commit((d) => ({ ...d, vias: d.vias.map((q) => (q.id === v.id ? { ...q, ...patch } : q)) }), { merge: `via:${v.id}` })
    return (
      <div className="sbx-pane" data-testid="props-via">
        <div className="sbx-subhead mono">Via</div>
        <Row k="Net">{conn.netOf.get(`via:${v.id}`) ?? 'not connected'}</Row>
        <Row k="X (mm)">
          <NumIn value={v.x} onChange={(x) => set({ x })} label="Via X" />
        </Row>
        <Row k="Y (mm)">
          <NumIn value={v.y} onChange={(y) => set({ y })} label="Via Y" />
        </Row>
        <Row k="Size">
          <Seg
            value={`${v.d}/${v.drill}`}
            options={[
              { v: '0.6/0.3', l: '0.6 / 0.3' },
              { v: '0.8/0.4', l: '0.8 / 0.4' },
              { v: '0.45/0.2', l: '0.45 / 0.2' },
            ]}
            onChange={(o) => {
              const [d, drill] = o.split('/').map(parseFloat)
              set({ d, drill })
            }}
          />
        </Row>
        <div className="sbx-note">Diameter / drill in mm. The beginner rule is at least 0.6 / 0.3 mm.</div>
        <button className="sbx-btn is-danger" onClick={api.deleteSelection}>
          <IconTrash size={14} /> Delete via
        </button>
      </div>
    )
  }
  const pour = doc.pours.find((q) => q.id === s.id)
  if (!pour) return null
  const area = polyArea(pour.pts)
  return (
    <div className="sbx-pane" data-testid="props-pour">
      <div className="sbx-subhead mono">Copper region</div>
      <Row k="Net">
        <select className="sbx-select mono" value={pour.net} onChange={(e) => api.updatePour(pour.id, { net: e.target.value })} aria-label="Pour net">
          {Object.keys(netInfo).map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </Row>
      <Row k="Layer">
        <Seg value={pour.layer} options={[{ v: 'top', l: 'Top' }, { v: 'bottom', l: 'Bottom' }]} onChange={(l) => api.updatePour(pour.id, { layer: l as Layer })} />
      </Row>
      <Slider label="Clearance" value={pour.clearance} min={0.2} max={1} step={0.05} unit="mm" format={(v) => v.toFixed(2)} onChange={(v) => api.updatePour(pour.id, { clearance: Math.round(v * 100) / 100 })} />
      <Row k="Area">
        {area.toFixed(0)} mm² · {Math.round((area / (doc.w * doc.h)) * 100)}% of the board
      </Row>
      <div className="sbx-note">Pads of the pour’s net that sit inside it connect through thermal spokes. Other copper gets a clearance gap.</div>
      <button className="sbx-btn is-danger" onClick={api.deleteSelection}>
        <IconTrash size={14} /> Delete region
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* DRC                                                                 */
/* ------------------------------------------------------------------ */

const KIND_INFO: Record<DrcKind, { title: string; why: string }> = {
  short: { title: 'Short circuits', why: 'Copper joins two different nets. The circuit will not work.' },
  clearance: { title: 'Clearance', why: `Copper of different nets is closer than ${beginnerRules.clearance} mm. The factory may bridge the gap.` },
  width: { title: 'Track width', why: `Tracks thinner than ${beginnerRules.minTrack} mm are hard to etch reliably.` },
  via: { title: 'Via size', why: `Vias need at least a ${beginnerRules.minVia} mm pad and a ${beginnerRules.minDrill} mm drill.` },
  edge: { title: 'Board edge', why: `Copper closer than ${beginnerRules.edgeClearance} mm to the edge can be exposed when the board is cut out.` },
  offboard: { title: 'Off the board', why: 'These pads are outside the outline. Drag their parts onto the board.' },
  overlap: { title: 'Overlapping parts', why: 'Courtyards overlap: the parts would collide during assembly.' },
  unrouted: { title: 'Unrouted connections', why: 'Airwires still to route (shown as ratlines on the board).' },
}
const ORDER: DrcKind[] = ['short', 'clearance', 'overlap', 'width', 'via', 'edge', 'offboard', 'unrouted']

function DrcTab({ api }: { api: EditorApi }) {
  const st = api.drcState
  const fresh = !!st && st.doc === api.doc
  const groups = useMemo(() => {
    const m = new Map<DrcKind, DrcError[]>()
    for (const e of st?.errors ?? []) {
      if (!m.has(e.kind)) m.set(e.kind, [])
      m.get(e.kind)!.push(e)
    }
    return ORDER.filter((k) => m.has(k)).map((k) => [k, m.get(k)!] as const)
  }, [st])
  return (
    <div className="sbx-pane" data-testid="drc-tab">
      <div className="sbx-row">
        <button className="sbx-btn sbx-btn--primary grow" onClick={api.runDrc} data-testid="run-drc">
          Check DRC
        </button>
      </div>
      <Toggle label="Real-time DRC" checked={api.prefs.realtimeDrc} onChange={(v) => api.setPrefs((p) => ({ ...p, realtimeDrc: v }))} />
      {st && !fresh && (
        <div className="sbx-note is-warn">
          <IconWarn size={14} /> The board changed since this check. Run it again.
        </div>
      )}
      {!st && (
        <div className="sbx-empty">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
            <path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z" />
            <path d="m8.5 12 2.5 2.5 4.5-5" stroke="var(--good)" strokeWidth="1.6" />
          </svg>
          <div className="sbx-empty__title">No check run yet</div>
          <div className="sbx-empty__body">Design › Check DRC compares your board with the factory rules and lists anything it cannot make.</div>
        </div>
      )}
      {st && st.errors.length === 0 && (
        <div className={`sbx-drc-ok ${fresh ? '' : 'is-stale'}`} data-testid="drc-clean">
          <span className="sbx-drc-ok__badge">
            <IconCheck size={18} />
          </span>
          <div>
            <b>0 errors</b>
            <div>Clearances, widths, vias, edges and connections all pass.</div>
          </div>
        </div>
      )}
      {st && st.errors.length > 0 && (
        <div className={`sbx-drc ${fresh ? '' : 'is-stale'}`} data-testid="drc-list">
          <div className="sbx-drc__sum mono">
            {st.errors.length} error{st.errors.length === 1 ? '' : 's'} · {new Date(st.at).toLocaleTimeString('en-GB')}
          </div>
          {groups.map(([kind, errs]) => (
            <section key={kind} className="sbx-drc__group">
              <header>
                <span className={`sbx-drc__kind sbx-drc__kind--${kind}`}>{KIND_INFO[kind].title}</span>
                <span className="mono">{errs.length}</span>
              </header>
              <p>{KIND_INFO[kind].why}</p>
              <ul>
                {errs.slice(0, 40).map((e, i) => (
                  <li key={i}>
                    <button onClick={() => api.focusDrc(e.at, e.items)} data-testid="drc-item">
                      <span className="sbx-drc__x" aria-hidden>
                        ×
                      </span>
                      <span className="grow">{e.message}</span>
                      <span className="mono sbx-drc__at">
                        {e.at[0].toFixed(1)}, {e.at[1].toFixed(1)}
                      </span>
                    </button>
                  </li>
                ))}
                {errs.length > 40 && <li className="muted">…and {errs.length - 40} more</li>}
              </ul>
            </section>
          ))}
        </div>
      )}
      <div className="sbx-subhead mono">Beginner rules</div>
      <div className="sbx-rules">
        <Row k="Clearance">{beginnerRules.clearance} mm</Row>
        <Row k="Min track">{beginnerRules.minTrack} mm</Row>
        <Row k="Via">
          {beginnerRules.minVia} / {beginnerRules.minDrill} mm
        </Row>
        <Row k="Edge">{beginnerRules.edgeClearance} mm</Row>
      </div>
      <div className="sbx-hintline">Conservative values well inside typical fab limits. Always check your manufacturer’s capabilities page.</div>
    </div>
  )
}
