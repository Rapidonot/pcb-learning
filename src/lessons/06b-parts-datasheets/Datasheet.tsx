/* A typeset mock datasheet for a generic 555 timer, with clickable sections, pins and rating rows. */
import { useMemo, type ReactNode } from 'react'
import { symbols, blinkySchematic, schNets, type SymInst } from '@/pcb/schematic'
import { PINS, sectionById, type SectionId } from './data'

export interface DatasheetProps {
  section: SectionId | null
  pin: number | null
  row: string | null
  onSection: (id: SectionId) => void
  onPin: (n: number) => void
  onRow: (id: string, section: SectionId) => void
}

const INK = '#1d1c1a'
const BRAND = '#b8401d'

/* ------------------------------------------------------------------ */
/* Page chrome                                                         */
/* ------------------------------------------------------------------ */

function Page({ n, children }: { n: number; children: ReactNode }) {
  return (
    <article className="l6b-page" aria-label={`Datasheet page ${n}`}>
      <div className="l6b-page__wm" aria-hidden>
        TEACHING EXAMPLE
      </div>
      <header className="l6b-page__head">
        <span className="l6b-page__logo" aria-hidden>
          <svg viewBox="0 0 20 20" width="18" height="18">
            <rect x="4" y="4" width="12" height="12" rx="2" fill={BRAND} />
            {[6.5, 10, 13.5].map((v) => (
              <g key={v} fill={BRAND}>
                <rect x={v - 0.8} y={0.8} width={1.6} height={2.6} />
                <rect x={v - 0.8} y={16.6} width={1.6} height={2.6} />
              </g>
            ))}
            <circle cx="7" cy="7" r="1.2" fill="#fff" />
          </svg>
        </span>
        <b>EDU555</b>
        <span className="l6b-page__headmid">Precision timer</span>
        <span className="grow" />
        <span className="l6b-page__rev">Teaching datasheet · Rev A</span>
      </header>
      {children}
      <footer className="l6b-page__foot">
        <span>Simplified teaching example for Learn PCB. Not a manufacturer datasheet: values are illustrative.</span>
        <span>
          {n} / 4
        </span>
      </footer>
    </article>
  )
}

function Sec({
  id,
  props,
  children,
  title,
  className = '',
}: {
  id: SectionId
  props: DatasheetProps
  children: ReactNode
  title?: ReactNode
  className?: string
}) {
  const s = sectionById(id)
  const on = props.section === id
  const hot = (
    <button
      type="button"
      className="l6b-hot"
      aria-label={`Explain: ${s.name}`}
      onClick={(e) => {
        e.stopPropagation()
        props.onSection(id)
      }}
    >
      {s.n}
    </button>
  )
  return (
    <section data-sec={id} className={`l6b-sec ${on ? 'is-on' : ''} ${title ? '' : 'l6b-sec--float'} ${className}`} onClick={() => props.onSection(id)}>
      {title ? (
        <h3 className="l6b-h">
          {hot}
          {title}
        </h3>
      ) : (
        hot
      )}
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Pinout drawing                                                      */
/* ------------------------------------------------------------------ */

function Pinout({ props }: { props: DatasheetProps }) {
  // body 120 x 150 at centre; pins 1-4 left (top→bottom), 8-5 right (top→bottom)
  const bx = 130
  const by = 26
  const bw = 100
  const bh = 148
  const ys = [0, 1, 2, 3].map((i) => by + 26 + i * 32)
  const pins = PINS.map((p) => {
    const left = p.num <= 4
    const i = left ? p.num - 1 : 8 - p.num
    return { ...p, left, y: ys[i] }
  })
  return (
    <svg viewBox="0 0 360 200" className="l6b-pinout" role="group" aria-label="Pin configuration, top view">
      <defs>
        <linearGradient id="l6b-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3f1ec" />
          <stop offset="1" stopColor="#e4e0d6" />
        </linearGradient>
      </defs>
      <rect x={bx} y={by} width={bw} height={bh} rx={6} fill="url(#l6b-body)" stroke={INK} strokeWidth={1.4} />
      <circle cx={bx + 16} cy={by + 16} r={5} fill="none" stroke={INK} strokeWidth={1.2} />
      <circle cx={bx + 16} cy={by + 16} r={2.2} fill={INK} />
      <text x={bx + bw / 2} y={by + bh / 2 - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} fontFamily="IBM Plex Mono, monospace">
        EDU555
      </text>
      <text x={bx + bw / 2} y={by + bh / 2 + 10} textAnchor="middle" fontSize={8.5} fill="#6b665c" fontFamily="IBM Plex Mono, monospace">
        TOP VIEW
      </text>
      {pins.map((p) => {
        const sel = props.pin === p.num
        const px = p.left ? bx - 22 : bx + bw
        return (
          <g
            key={p.num}
            className={`l6b-pin ${sel ? 'is-sel' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Pin ${p.num}, ${p.name}`}
            onClick={(e) => {
              e.stopPropagation()
              props.onPin(p.num)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                props.onPin(p.num)
              }
            }}
          >
            {/* generous hit area */}
            <rect x={p.left ? 8 : bx + bw - 4} y={p.y - 13} width={p.left ? bx - 4 : 360 - (bx + bw) - 4} height={26} rx={6} className="l6b-pin__hit" />
            <rect x={px} y={p.y - 6} width={22} height={12} rx={1.5} className="l6b-pin__lead" stroke={INK} strokeWidth={1.1} />
            <text
              x={p.left ? bx + 8 : bx + bw - 8}
              y={p.y}
              textAnchor={p.left ? 'start' : 'end'}
              dominantBaseline="central"
              fontSize={11}
              fontWeight={700}
              fill={INK}
              fontFamily="IBM Plex Mono, monospace"
            >
              {p.num}
            </text>
            <text
              x={p.left ? px - 8 : px + 30}
              y={p.y}
              textAnchor={p.left ? 'end' : 'start'}
              dominantBaseline="central"
              fontSize={13}
              fontWeight={600}
              className="l6b-pin__name"
              fontFamily="IBM Plex Mono, monospace"
            >
              {p.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Typical application (Blinky, drawn in datasheet line-art)           */
/* ------------------------------------------------------------------ */

function AppCircuit() {
  const doc = useMemo(() => blinkySchematic(), [])
  const junctions = useMemo(() => schNets(doc).junctions, [doc])
  const sym = (s: SymInst) => {
    const def = symbols[s.sym]
    const vertical = s.rot === 90 || s.rot === 270
    return (
      <g key={s.ref}>
        <g transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`}>
          {def.pins.map((p) => (
            <line key={p.num} x1={p.bx} y1={p.by} x2={p.x} y2={p.y} stroke={INK} strokeWidth={1.2} />
          ))}
          {def.body(INK)}
          {s.sym === 'NE555' &&
            def.pins.map((p) => {
              const dx = Math.sign(p.x - p.bx)
              const dy = Math.sign(p.y - p.by)
              return (
                <g key={`n${p.num}`} fontFamily="IBM Plex Mono, monospace">
                  <text
                    x={p.bx - dx * 4}
                    y={p.by - dy * 7}
                    fontSize={6.5}
                    fill={INK}
                    textAnchor={dx > 0 ? 'end' : dx < 0 ? 'start' : 'middle'}
                    dominantBaseline="central"
                  >
                    {p.name}
                  </text>
                  <text
                    x={(p.bx + p.x) / 2 + (dx === 0 ? 5 : 0)}
                    y={(p.by + p.y) / 2 + (dy === 0 ? -3.5 : 0)}
                    fontSize={6}
                    fill="#6b665c"
                    textAnchor={dx === 0 ? 'start' : 'middle'}
                    dominantBaseline="central"
                  >
                    {p.num}
                  </text>
                </g>
              )
            })}
        </g>
        {s.sym !== 'NE555' && (
          <g fontFamily="IBM Plex Mono, monospace" fill={INK}>
            <text x={vertical ? s.x + 12 : s.x} y={vertical ? s.y - 4 : s.y - 26} fontSize={7.5} fontWeight={700} textAnchor={vertical ? 'start' : 'middle'}>
              {s.ref}
            </text>
            <text x={vertical ? s.x + 12 : s.x} y={vertical ? s.y + 6 : s.y + 30} fontSize={7} textAnchor={vertical ? 'start' : 'middle'}>
              {s.value}
            </text>
          </g>
        )}
        {s.sym === 'NE555' && (
          <text x={s.x} y={s.y + 2} fontSize={8} fontWeight={700} textAnchor="middle" fill={INK} fontFamily="IBM Plex Mono, monospace">
            EDU555
          </text>
        )}
      </g>
    )
  }
  return (
    <svg viewBox="14 22 404 262" className="l6b-app" role="img" aria-label="Typical astable application circuit">
      {doc.wires.map((w) => (
        <polyline key={w.id} points={w.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      ))}
      {junctions.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.2} fill={INK} />
      ))}
      {doc.symbols.map(sym)}
      {doc.flags.map((f) =>
        f.kind === 'vcc' ? (
          <g key={f.id}>
            <line x1={f.x - 9} y1={f.y} x2={f.x + 9} y2={f.y} stroke={INK} strokeWidth={1.6} />
            <text x={f.x} y={f.y - 6} fontSize={7.5} fontWeight={700} textAnchor="middle" fill={INK} fontFamily="IBM Plex Mono, monospace">
              +5 V
            </text>
          </g>
        ) : (
          <g key={f.id} stroke={INK} strokeWidth={1.3}>
            <line x1={f.x - 8} y1={f.y} x2={f.x + 8} y2={f.y} />
            <line x1={f.x - 5} y1={f.y + 3} x2={f.x + 5} y2={f.y + 3} />
            <line x1={f.x - 2} y1={f.y + 6} x2={f.x + 2} y2={f.y + 6} />
          </g>
        ),
      )}
      {doc.labels.map((l) => (
        <text
          key={l.id}
          x={l.side === 'left' ? l.x - 3 : l.x + 4}
          y={l.y - 3}
          fontSize={6.5}
          textAnchor={l.side === 'left' ? 'end' : 'start'}
          fill="#6b665c"
          fontFamily="IBM Plex Mono, monospace"
        >
          {l.name}
        </text>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Mechanical drawings                                                 */
/* ------------------------------------------------------------------ */

const DIM = '#5f5a51'

function Arrow({ x1, y1, x2, y2, label, lx, ly, anchor = 'middle', rot }: { x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number; anchor?: 'start' | 'middle' | 'end'; rot?: number }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={DIM} strokeWidth={0.8} markerStart="url(#l6b-arr)" markerEnd="url(#l6b-arr)" />
      <text
        x={lx}
        y={ly}
        fontSize={8.5}
        fill={INK}
        textAnchor={anchor}
        dominantBaseline="central"
        fontFamily="IBM Plex Mono, monospace"
        fontWeight={600}
        transform={rot ? `rotate(${rot} ${lx} ${ly})` : undefined}
      >
        {label}
      </text>
    </g>
  )
}

function ArrowDefs() {
  return (
    <defs>
      <marker id="l6b-arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 2 L 9 5 L 0 8 z" fill={DIM} />
      </marker>
      <pattern id="l6b-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="#9a9488" strokeWidth="1" />
      </pattern>
    </defs>
  )
}

/** SOIC-8 package outline: top view + side view. 1 mm = 18 px. */
function PackageDrawing() {
  const k = 18
  const cx = 110
  const cy = 112
  const bw = 3.9 * k
  const bh = 4.9 * k
  const lead = 1.05 * k
  const lw = 0.41 * k
  const ys = [-1.905, -0.635, 0.635, 1.905].map((v) => cy + v * k)
  return (
    <svg viewBox="0 0 400 230" className="l6b-mech" role="img" aria-label="SOIC-8 package outline">
      <ArrowDefs />
      {/* top view */}
      {ys.map((y) => (
        <g key={y} stroke={INK} strokeWidth={1} fill="#f1efe9">
          <rect x={cx - bw / 2 - lead} y={y - lw / 2} width={lead} height={lw} />
          <rect x={cx + bw / 2} y={y - lw / 2} width={lead} height={lw} />
        </g>
      ))}
      <rect x={cx - bw / 2} y={cy - bh / 2} width={bw} height={bh} rx={3} fill="#fbfaf7" stroke={INK} strokeWidth={1.3} />
      <circle cx={cx - bw / 2 + 11} cy={cy - bh / 2 + 11} r={4} fill="none" stroke={INK} strokeWidth={1} />
      <text x={cx - bw / 2 - lead - 4} y={ys[0]} fontSize={8} textAnchor="end" dominantBaseline="central" fill={INK} fontFamily="IBM Plex Mono, monospace">
        1
      </text>
      {/* dims */}
      <line x1={cx - bw / 2} y1={cy - bh / 2 - 4} x2={cx - bw / 2} y2={cy - bh / 2 - 22} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx + bw / 2} y1={cy - bh / 2 - 4} x2={cx + bw / 2} y2={cy - bh / 2 - 22} stroke={DIM} strokeWidth={0.6} />
      <Arrow x1={cx - bw / 2} y1={cy - bh / 2 - 17} x2={cx + bw / 2} y2={cy - bh / 2 - 17} label="3.90" lx={cx} ly={cy - bh / 2 - 26} />
      <line x1={cx - bw / 2 - lead} y1={cy + bh / 2 + 4} x2={cx - bw / 2 - lead} y2={cy + bh / 2 + 24} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx + bw / 2 + lead} y1={cy + bh / 2 + 4} x2={cx + bw / 2 + lead} y2={cy + bh / 2 + 24} stroke={DIM} strokeWidth={0.6} />
      <Arrow x1={cx - bw / 2 - lead} y1={cy + bh / 2 + 18} x2={cx + bw / 2 + lead} y2={cy + bh / 2 + 18} label="6.00" lx={cx} ly={cy + bh / 2 + 28} />
      <line x1={cx + bw / 2 + 4} y1={cy - bh / 2} x2={cx + bw / 2 + lead + 34} y2={cy - bh / 2} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx + bw / 2 + 4} y1={cy + bh / 2} x2={cx + bw / 2 + lead + 34} y2={cy + bh / 2} stroke={DIM} strokeWidth={0.6} />
      <Arrow x1={cx + bw / 2 + lead + 28} y1={cy - bh / 2} x2={cx + bw / 2 + lead + 28} y2={cy + bh / 2} label="4.90" lx={cx + bw / 2 + lead + 40} ly={cy} anchor="start" />
      {/* pitch callout on the left */}
      <line x1={cx - bw / 2 - lead - 16} y1={ys[2]} x2={cx - bw / 2 - lead - 2} y2={ys[2]} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx - bw / 2 - lead - 16} y1={ys[3]} x2={cx - bw / 2 - lead - 2} y2={ys[3]} stroke={DIM} strokeWidth={0.6} />
      <Arrow x1={cx - bw / 2 - lead - 12} y1={ys[2]} x2={cx - bw / 2 - lead - 12} y2={ys[3]} label="1.27" lx={cx - bw / 2 - lead - 18} ly={(ys[2] + ys[3]) / 2} anchor="end" />
      <text x={cx} y={cy + bh / 2 + 46} fontSize={8} fill={DIM} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.1em">
        TOP VIEW
      </text>

      {/* end view (looking at the short side): body with gull-wing leads */}
      <g transform="translate(318 96)">
        <text x={0} y={-18} fontSize={8} fill={DIM} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.1em">
          END VIEW
        </text>
        <rect x={-bw / 2} y={0} width={bw} height={1.45 * k - 2} rx={3} fill="#fbfaf7" stroke={INK} strokeWidth={1.2} />
        {[-1, 1].map((sx) => (
          <path
            key={sx}
            d={`M ${sx * (bw / 2)} ${11} l ${sx * 5} 0 q ${sx * 4} 0 ${sx * 5} 6 l ${sx * 1.5} 9 q ${sx * 1} 5 ${sx * 6} 5 l ${sx * (lead - 15)} 0`}
            fill="none"
            stroke={INK}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <line x1={-bw / 2 - lead - 6} y1={1.75 * k - 0.5} x2={bw / 2 + lead + 6} y2={1.75 * k - 0.5} stroke="#9a9488" strokeWidth={0.8} strokeDasharray="3 2" />
        <line x1={bw / 2 + 4} y1={0} x2={bw / 2 + lead + 18} y2={0} stroke={DIM} strokeWidth={0.6} />
        <Arrow x1={bw / 2 + lead + 12} y1={0} x2={bw / 2 + lead + 12} y2={1.75 * k - 0.5} label="1.75 max" lx={0} ly={1.75 * k + 16} />
      </g>
    </svg>
  )
}

/** SOIC-8 recommended land pattern. 1 mm = 20 px. */
export function LandDrawing({ compact = false }: { compact?: boolean }) {
  const k = 20
  const cx = 165
  const cy = 108
  const ys = [-1.905, -0.635, 0.635, 1.905].map((v) => cy + v * k)
  const pw = 1.55 * k
  const ph = 0.6 * k
  const xc = 2.7 * k
  return (
    <svg viewBox={compact ? '84 24 250 176' : '0 0 400 220'} className="l6b-mech" role="img" aria-label="Recommended land pattern for SOIC-8">
      <ArrowDefs />
      {/* centre lines */}
      <line x1={cx} y1={cy - 70} x2={cx} y2={cy + 70} stroke="#b2ab9c" strokeWidth={0.6} strokeDasharray="6 3 1 3" />
      <line x1={cx - 100} y1={cy} x2={cx + 100} y2={cy} stroke="#b2ab9c" strokeWidth={0.6} strokeDasharray="6 3 1 3" />
      {ys.map((y, i) => (
        <g key={y}>
          <rect x={cx - xc - pw / 2} y={y - ph / 2} width={pw} height={ph} rx={2} fill="url(#l6b-hatch)" stroke={INK} strokeWidth={1.1} />
          <rect x={cx + xc - pw / 2} y={y - ph / 2} width={pw} height={ph} rx={2} fill="url(#l6b-hatch)" stroke={INK} strokeWidth={1.1} />
          {!compact && (
            <>
              <text x={cx - xc - pw / 2 - 5} y={y} fontSize={8} textAnchor="end" dominantBaseline="central" fill="#6b665c" fontFamily="IBM Plex Mono, monospace">
                {i + 1}
              </text>
              <text x={cx + xc + pw / 2 + 5} y={y} fontSize={8} textAnchor="start" dominantBaseline="central" fill="#6b665c" fontFamily="IBM Plex Mono, monospace">
                {8 - i}
              </text>
            </>
          )}
        </g>
      ))}
      {/* row centre distance */}
      <line x1={cx - xc} y1={ys[3] + 8} x2={cx - xc} y2={cy + 76} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx + xc} y1={ys[3] + 8} x2={cx + xc} y2={cy + 76} stroke={DIM} strokeWidth={0.6} />
      <Arrow x1={cx - xc} y1={cy + 70} x2={cx + xc} y2={cy + 70} label="5.40" lx={cx} ly={cy + 80} />
      {/* pad length */}
      <line x1={cx - xc - pw / 2} y1={ys[0] - 8} x2={cx - xc - pw / 2} y2={cy - 68} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx - xc + pw / 2} y1={ys[0] - 8} x2={cx - xc + pw / 2} y2={cy - 68} stroke={DIM} strokeWidth={0.6} />
      <Arrow x1={cx - xc - pw / 2} y1={cy - 62} x2={cx - xc + pw / 2} y2={cy - 62} label="1.55" lx={cx - xc} ly={cy - 72} />
      {/* pitch + pad width on the right */}
      <line x1={cx + xc + pw / 2 + 14} y1={ys[0]} x2={cx + xc + pw / 2 + 44} y2={ys[0]} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx + xc + pw / 2 + 14} y1={ys[1]} x2={cx + xc + pw / 2 + 44} y2={ys[1]} stroke={DIM} strokeWidth={0.6} />
      <Arrow x1={cx + xc + pw / 2 + 38} y1={ys[0]} x2={cx + xc + pw / 2 + 38} y2={ys[1]} label="1.27" lx={cx + xc + pw / 2 + 48} ly={(ys[0] + ys[1]) / 2} anchor="start" />
      <line x1={cx + xc + pw / 2 + 14} y1={ys[3] - ph / 2} x2={cx + xc + pw / 2 + 44} y2={ys[3] - ph / 2} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx + xc + pw / 2 + 14} y1={ys[3] + ph / 2} x2={cx + xc + pw / 2 + 44} y2={ys[3] + ph / 2} stroke={DIM} strokeWidth={0.6} />
      {/* pad width: arrows from outside pointing in */}
      <line x1={cx + xc + pw / 2 + 38} y1={ys[3] - ph / 2 - 11} x2={cx + xc + pw / 2 + 38} y2={ys[3] - ph / 2} stroke={DIM} strokeWidth={0.8} markerEnd="url(#l6b-arr)" />
      <line x1={cx + xc + pw / 2 + 38} y1={ys[3] + ph / 2 + 11} x2={cx + xc + pw / 2 + 38} y2={ys[3] + ph / 2} stroke={DIM} strokeWidth={0.8} markerEnd="url(#l6b-arr)" />
      <text x={cx + xc + pw / 2 + 48} y={ys[3]} fontSize={8.5} fill={INK} dominantBaseline="central" fontFamily="IBM Plex Mono, monospace" fontWeight={600}>
        0.60
      </text>
      {!compact && (
        <text x={cx} y={cy + 100} fontSize={8} fill={DIM} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.1em">
          ALL DIMENSIONS IN MM · PADS SHOWN HATCHED
        </text>
      )}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

type Row = { id?: string; cells: ReactNode[] }

function Table({ head, rows, props, section }: { head: string[]; rows: Row[]; props: DatasheetProps; section: SectionId }) {
  return (
    <div className="l6b-tablewrap">
      <table className="l6b-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`${r.id ? 'is-clickable' : ''} ${r.id && props.row === r.id ? 'is-sel' : ''}`}
              tabIndex={r.id ? 0 : undefined}
              onClick={
                r.id
                  ? (e) => {
                      e.stopPropagation()
                      props.onRow(r.id!, section)
                    }
                  : undefined
              }
              onKeyDown={
                r.id
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        props.onRow(r.id!, section)
                      }
                    }
                  : undefined
              }
            >
              {r.cells.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The document                                                        */
/* ------------------------------------------------------------------ */

export function Datasheet(props: DatasheetProps) {
  return (
    <div className="l6b-doc">
      {/* PAGE 1 */}
      <Page n={1}>
        <Sec id="title" props={props} className="l6b-titleblock">
          <div className="l6b-kicker">Timer · General purpose</div>
          <h2 className="l6b-title">EDU555 Precision Timer</h2>
          <p className="l6b-subtitle">Single bipolar 555-type timer for astable and monostable operation</p>
          <div className="l6b-pkgs">
            <span>SOIC-8 (D)</span>
            <span>DIP-8 (P)</span>
          </div>
        </Sec>
        <Sec id="features" props={props} title="Features">
          <div className="l6b-cols">
            <ul className="l6b-list">
              <li>Timing from microseconds to hours</li>
              <li>Astable (free-running) or monostable (one-shot) operation</li>
              <li>Supply voltage 5 V to 15 V</li>
              <li>Output can sink or source up to 200 mA</li>
              <li>TTL-compatible output at 5 V</li>
              <li>Available in SOIC-8 and DIP-8</li>
            </ul>
            <div>
              <h4 className="l6b-h4">Applications</h4>
              <p className="l6b-p">LED blinkers and flashers · Precision timing · Pulse generation · Time-delay generation</p>
              <h4 className="l6b-h4">Description</h4>
              <p className="l6b-p">
                The EDU555 produces accurate time delays or oscillation. In astable mode, two resistors and one capacitor set
                the frequency and duty cycle. Its output can drive an LED directly through a series resistor.
              </p>
            </div>
          </div>
        </Sec>
        <Sec id="pinout" props={props} title="Pin configuration and functions">
          <div className="l6b-pinrow">
            <div className="l6b-pinrow__fig">
              <div className="l6b-caption">D or P package · top view</div>
              <Pinout props={props} />
            </div>
            <div className="l6b-tablewrap l6b-pinrow__tbl">
              <table className="l6b-table l6b-table--pins">
                <thead>
                  <tr>
                    <th>Pin</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Function</th>
                  </tr>
                </thead>
                <tbody>
                  {PINS.map((p) => (
                    <tr
                      key={p.num}
                      className={`is-clickable ${props.pin === p.num ? 'is-sel' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        props.onPin(p.num)
                      }}
                    >
                      <td className="mono">{p.num}</td>
                      <td className="mono">
                        <b>{p.name}</b>
                      </td>
                      <td>{p.type}</td>
                      <td>{p.short}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Sec>
      </Page>

      {/* PAGE 2 */}
      <Page n={2}>
        <Sec id="absmax" props={props} title="Absolute maximum ratings">
          <div className="l6b-caption">Over operating free-air temperature range (unless otherwise noted)<sup>(1)</sup></div>
          <Table
            props={props}
            section="absmax"
            head={['Parameter', 'Symbol', 'Min', 'Max', 'Unit']}
            rows={[
              { id: 'abs-vcc', cells: ['Supply voltage', 'VCC', '', '18', 'V'] },
              { cells: ['Input voltage (TRIG, THRES, CONT, RESET)', 'VI', '', 'VCC', 'V'] },
              { cells: ['Output current', 'IO', '', '±225', 'mA'] },
              { cells: ['Junction temperature', 'TJ', '', '150', '°C'] },
              { cells: ['Storage temperature', 'Tstg', '−65', '150', '°C'] },
            ]}
          />
          <p className="l6b-note">
            (1) Stresses beyond those listed may cause permanent damage to the device. These are stress ratings only.
            Operation at these conditions is not implied.
          </p>
        </Sec>
        <Sec id="recommended" props={props} title="Recommended operating conditions">
          <Table
            props={props}
            section="recommended"
            head={['Parameter', 'Symbol', 'Min', 'Max', 'Unit']}
            rows={[
              { id: 'rec-vcc', cells: ['Supply voltage', 'VCC', '5', '15', 'V'] },
              { cells: ['Input voltage', 'VI', '0', 'VCC', 'V'] },
              { cells: ['Output current', 'IO', '', '200', 'mA'] },
              { cells: ['Operating free-air temperature', 'TA', '0', '70', '°C'] },
            ]}
          />
        </Sec>
        <Sec id="electrical" props={props} title="Electrical characteristics">
          <div className="l6b-caption">VCC = 5 V, TA = 25 °C (unless otherwise noted)</div>
          <Table
            props={props}
            section="electrical"
            head={['Parameter', 'Test conditions', 'Min', 'Typ', 'Max', 'Unit']}
            rows={[
              { id: 'el-icc', cells: ['Supply current', 'Output low, no load', '', '3', '6', 'mA'] },
              { cells: ['Threshold voltage', '', '', '3.3', '', 'V'] },
              { cells: ['Trigger voltage', '', '', '1.67', '', 'V'] },
              { cells: ['Reset voltage', '', '0.3', '0.7', '1', 'V'] },
              { cells: ['High-level output voltage', 'IOH = −100 mA', '2.75', '3.3', '', 'V'] },
              { cells: ['Low-level output voltage', 'IOL = 5 mA', '', '0.1', '0.35', 'V'] },
            ]}
          />
        </Sec>
      </Page>

      {/* PAGE 3 */}
      <Page n={3}>
        <Sec id="application" props={props} title="Typical application: astable LED blinker">
          <div className="l6b-figure">
            <AppCircuit />
          </div>
          <div className="l6b-formula">
            f ≈ 1.44 / ((R1 + 2·R2) · C1) = 1.44 / ((1 kΩ + 94 kΩ) · 10 µF) ≈ 1.5 Hz
          </div>
          <p className="l6b-p">
            C1 charges through R1 and R2 until THRES reaches 2/3 VCC, then discharges through R2 until TRIG falls to 1/3 VCC.
            Place the 100 nF decoupling capacitor C2 as close to pins 8 and 1 as possible. R3 limits the LED current to about
            9 mA.
          </p>
        </Sec>
      </Page>

      {/* PAGE 4 */}
      <Page n={4}>
        <Sec id="package" props={props} title="Package outline: SOIC-8 (D)">
          <div className="l6b-figure">
            <PackageDrawing />
          </div>
          <p className="l6b-note">Dimensions in millimetres. 1.27 mm pitch (0.050 in). Body size excludes mould flash.</p>
        </Sec>
        <Sec id="land" props={props} title="Recommended land pattern: SOIC-8 (D)">
          <div className="l6b-figure">
            <LandDrawing />
          </div>
          <p className="l6b-note">Pin 1 is at the top left (next to the dot on the package). Solder mask opening 0.05 mm larger than each pad.</p>
        </Sec>
      </Page>
    </div>
  )
}
