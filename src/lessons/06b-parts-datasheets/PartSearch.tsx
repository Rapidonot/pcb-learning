/* A mock of EasyEDA Pro's device search (Place > Device), with LCSC / EasyEDA search engines. */
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { FootprintGraphic } from '@/pcb/render'
import { SymbolGraphic } from '@/pcb/SchematicView'
import { MASKS } from '@/pcb/palette'
import type { FootprintDef } from '@/pcb/footprints'
import { CANDIDATES, type Candidate, type Engine } from './data'

const Preview3D = lazy(() => import('./Preview3D'))

/** display order: the right answer is not the first card */
const ORDER = ['cmos-soic', 'ne555-dip', 'ne555-soic', 'lv-vssop', 'ne555-user']

function fpBox(fp: FootprintDef, pad = 0.9) {
  const w = fp.courtyard.w + pad
  const h = fp.courtyard.h + pad
  return `${-w} ${-h} ${w * 2} ${h * 2}`
}

function Thumb({ fp }: { fp: FootprintDef }) {
  return (
    <svg viewBox={fpBox(fp, 0.7)} className="l6b-thumb" aria-hidden>
      <defs>
        <radialGradient id={`l6b-mask-${fp.id}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#2a8358" />
          <stop offset="1" stopColor={MASKS.green.mask} />
        </radialGradient>
      </defs>
      <rect x={-50} y={-50} width={100} height={100} fill={`url(#l6b-mask-${fp.id})`} />
      <FootprintGraphic fp={fp} mode="real" showBody />
    </svg>
  )
}

function StockBadge({ c }: { c: Candidate }) {
  if (!c.stock) return <span className="l6b-badge l6b-badge--muted">No stock info</span>
  return (
    <span className={`l6b-badge ${c.stock === 'high' ? 'l6b-badge--good' : 'l6b-badge--warn'}`}>
      <i className="l6b-badge__dot" />
      {c.stock === 'high' ? 'In stock' : 'Low stock'}
    </span>
  )
}

function ClassBadge({ c }: { c: Candidate }) {
  if (!c.cls) return null
  return <span className={`l6b-badge ${c.cls === 'Basic' ? 'l6b-badge--basic' : 'l6b-badge--ext'}`}>{c.cls}*</span>
}

export interface PartSearchProps {
  placedId: string | null
  onPlace: (c: Candidate) => void
}

export function PartSearch({ placedId, onPlace }: PartSearchProps) {
  const [engine, setEngine] = useState<Engine>('lcsc')
  const [query, setQuery] = useState('555')
  const [filter, setFilter] = useState('')
  const [sel, setSel] = useState<string>('cmos-soic')
  const [tab, setTab] = useState<'footprint' | '3d' | 'symbol'>('footprint')
  const [attempt, setAttempt] = useState<string | null>(placedId)
  const detailRef = useRef<HTMLDivElement>(null)
  const verdictRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const f = filter.trim().toLowerCase()
    return CANDIDATES.filter((c) => c.engines.includes(engine))
      .filter((c) => !q || `${c.title} ${c.desc} 555 timer`.toLowerCase().includes(q))
      .filter((c) => !f || `${c.pkg} ${c.mount} ${c.title} ${c.cls ?? ''}`.toLowerCase().includes(f))
      .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))
  }, [engine, query, filter])

  const cur = CANDIDATES.find((c) => c.id === sel) ?? results[0]
  const shown = results.some((r) => r.id === cur?.id) ? cur : results[0]
  const tried = attempt ? CANDIDATES.find((c) => c.id === attempt) : null

  const pick = (id: string) => {
    setSel(id)
    if (window.matchMedia('(max-width: 760px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  return (
    <div className="l6b-dlg" role="dialog" aria-label="Device search (mock)">
      <div className="l6b-dlg__title">
        <span className="l6b-dlg__dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="mono l6b-dlg__app">EasyEDA Pro</span>
        <span className="l6b-dlg__crumb">Place › Device</span>
        <span className="grow" />
        <kbd className="l6b-dlg__kbd">Shift+F</kbd>
      </div>
      <div className="l6b-dlg__bar">
        <div className="l6b-engine" role="radiogroup" aria-label="Search engine">
          <span className="l6b-engine__lbl">Search engine</span>
          {(
            [
              ['lcsc', 'LCSC Electronics'],
              ['easyeda', 'EasyEDA'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} role="radio" aria-checked={engine === v} className={`l6b-engine__opt ${engine === v ? 'is-on' : ''}`} onClick={() => setEngine(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="l6b-inputs">
          <label className="l6b-input">
            <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" placeholder="Search parts" />
          </label>
          <label className="l6b-input l6b-input--filter">
            <span className="l6b-input__tag">Filter</span>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter results" placeholder="e.g. SOIC" />
          </label>
        </div>
        <div className="l6b-quick" aria-label="Quick filters">
          {['SOIC', 'DIP', 'Basic'].map((q) => (
            <button key={q} className={`l6b-quick__chip ${filter.toLowerCase() === q.toLowerCase() ? 'is-on' : ''}`} onClick={() => setFilter((f) => (f.toLowerCase() === q.toLowerCase() ? '' : q))}>
              {q}
            </button>
          ))}
        </div>
      </div>
      {engine === 'easyeda' && (
        <div className="l6b-dlg__note">
          The EasyEDA engine also lists parts that LCSC does not sell. Those have no supplier part number.
        </div>
      )}
      <div className="l6b-dlg__main">
        <div className="l6b-results" role="listbox" aria-label="Search results">
          <div className="l6b-results__count mono">
            {results.length} result{results.length === 1 ? '' : 's'}
          </div>
          {results.map((c) => (
            <button
              key={c.id}
              role="option"
              aria-selected={shown?.id === c.id}
              className={`l6b-card ${shown?.id === c.id ? 'is-sel' : ''} ${placedId === c.id ? 'is-placed' : ''}`}
              onClick={() => pick(c.id)}
            >
              <Thumb fp={c.fp} />
              <div className="l6b-card__body">
                <div className="l6b-card__title">
                  <b>{c.title}</b>
                  <span>{c.desc}</span>
                </div>
                <div className="l6b-card__specs">
                  <span className="l6b-pkg">{c.pkg}</span>
                  <span>{c.mount}</span>
                  <span>{c.supply}</span>
                </div>
                <div className="l6b-card__meta">
                  <span className="mono l6b-cnum">{c.supplier ? 'C•••••' : '— no C-number'}</span>
                  <ClassBadge c={c} />
                  <StockBadge c={c} />
                </div>
              </div>
            </button>
          ))}
          {results.length === 0 && <div className="l6b-empty">No parts match. Try clearing the filter.</div>}
          <div className="l6b-footnote">
            Mock results for teaching. *Basic/Extended is JLCPCB's assembly classification: always confirm it on jlcpcb.com/parts.
          </div>
        </div>
        {shown && (
          <div className="l6b-detail" ref={detailRef}>
            <div className="l6b-tabs" role="tablist">
              {(
                [
                  ['footprint', 'Footprint'],
                  ['3d', '3D model'],
                  ['symbol', 'Symbol'],
                ] as const
              ).map(([v, l]) => (
                <button key={v} role="tab" aria-selected={tab === v} className={`l6b-tabs__tab ${tab === v ? 'is-on' : ''}`} onClick={() => setTab(v)}>
                  {l}
                </button>
              ))}
            </div>
            <div className={`l6b-preview l6b-preview--${tab}`}>
              {tab === 'footprint' && (
                <svg viewBox={fpBox(shown.fp, 1.2)} aria-label={`${shown.pkg} footprint`}>
                  <FootprintGraphic fp={shown.fp} mode="eda" showNumbers showCourtyard />
                </svg>
              )}
              {tab === '3d' && (
                <Suspense fallback={<div className="spinner" />}>
                  <Preview3D fp={shown.fp} marking={shown.marking} />
                </Suspense>
              )}
              {tab === 'symbol' && (
                <svg viewBox="-92 -86 190 172" aria-label="Schematic symbol">
                  <SymbolGraphic inst={{ ref: 'U?', sym: 'NE555', value: shown.title, x: 0, y: 0, rot: 0 }} />
                </svg>
              )}
              <span className="l6b-preview__tag mono">{shown.fp.name}</span>
            </div>
            <dl className="l6b-props">
              <dt>Package</dt>
              <dd>{shown.pkg}</dd>
              <dt>Mount</dt>
              <dd>{shown.mount}</dd>
              <dt>Pitch</dt>
              <dd>{shown.pitch.toFixed(2)} mm</dd>
              <dt>Supply</dt>
              <dd>{shown.supply}</dd>
              <dt>Supplier</dt>
              <dd>{shown.supplier ? 'LCSC' : '—'}</dd>
              <dt>Supplier part</dt>
              <dd className="mono">{shown.supplier ? 'C•••••' : '—'}</dd>
            </dl>
            <button
              className="l6b-place"
              onClick={() => {
                setAttempt(shown.id)
                onPlace(shown)
                window.setTimeout(() => verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
              }}
            >
              Place {shown.title} ({shown.pkg})
            </button>
            {tried && tried.id === shown.id && (
              <div ref={verdictRef} className={`l6b-verdict ${tried.verdict === 'right' ? 'is-good' : tried.verdict === 'extended' ? 'is-warn' : 'is-bad'}`} role="status">
                <b>
                  {tried.verdict === 'right'
                    ? 'Great choice'
                    : tried.verdict === 'extended'
                      ? 'Works, but not the best pick'
                      : 'Not this one'}
                  {' · '}
                  {tried.title} {tried.pkg}
                </b>
                <span>{tried.feedback}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
