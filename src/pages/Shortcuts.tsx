import { useMemo, useState } from 'react'
import { TopBar } from '@/components/shell/Shell'
import { Keys, Segmented, Callout, Button } from '@/components/ui'
import { keyMap, shortcutRows, type Ctx } from '@/data/shortcuts'
import { IconDownload } from '@/components/icons'
import './shortcuts.css'

const ROWS: (string | { k: string; w?: number })[][] = [
  ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', { k: 'Delete', w: 1.6 }],
  [{ k: 'Tab', w: 1.5 }, 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', { k: '[', w: 1.1 }],
  [{ k: 'Caps', w: 1.8 }, 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', { k: 'Enter', w: 1.3 }],
  [{ k: 'Shift', w: 2.3 }, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', { k: '/', w: 1.8 }],
  [{ k: 'Ctrl', w: 1.5 }, { k: 'Alt', w: 1.3 }, { k: 'Space', w: 6.4 }, { k: 'Alt', w: 1.3 }, { k: 'Ctrl', w: 1.5 }],
]

type Mode = 'schematic' | 'pcb'

export default function Shortcuts() {
  const [mode, setMode] = useState<Mode>('pcb')
  const [hover, setHover] = useState<string | null>('W')
  const [q, setQ] = useState('')
  const [ctx, setCtx] = useState<'all' | Ctx>('all')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return shortcutRows.filter(
      (r) =>
        (ctx === 'all' || r.ctx.includes(ctx) || r.ctx.includes('general')) &&
        (!s || r.action.toLowerCase().includes(s) || r.keys?.some((k) => k.toLowerCase().includes(s)) || r.menu?.some((m) => m.toLowerCase().includes(s))),
    )
  }, [q, ctx])
  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>()
    for (const r of filtered) {
      if (!m.has(r.group)) m.set(r.group, [])
      m.get(r.group)!.push(r)
    }
    return [...m.entries()]
  }, [filtered])

  const info = hover ? keyMap[hover] : undefined
  const keyText = (k: string) => {
    const e = keyMap[k]
    if (!e) return undefined
    return e.both ?? e[mode]
  }

  return (
    <div className="sc-page">
      <TopBar />
      <div className="sc-wrap">
        <header className="sc-head">
          <div className="eyebrow">Cheat sheet · EasyEDA Pro</div>
          <h1 className="display">Every key you'll actually use.</h1>
          <p>
            The shortcuts and menu paths from this course in one place. EasyEDA Pro lets you choose a shortcut theme and remap
            any key under <b>Settings › Shortcuts</b>, so if a key doesn't work, check there first. The menu path always
            works.
          </p>
          <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
            <Button size="sm" onClick={() => window.print()}>
              <IconDownload size={15} /> Print / save as PDF
            </Button>
          </div>
        </header>

        <section className="kb-card">
          <div className="kb-card__head">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'schematic', label: 'Schematic editor' },
                { value: 'pcb', label: 'PCB editor' },
              ]}
            />
            <div className="kb-info">
              {hover && info ? (
                <>
                  <span className="kbd kbd--lg">{hover}</span>
                  <span>{info.both ?? info[mode] ?? <span className="muted">Not used in the {mode === 'pcb' ? 'PCB' : 'schematic'} editor</span>}</span>
                </>
              ) : (
                <span className="muted">Hover or tap a highlighted key</span>
              )}
            </div>
          </div>
          <div className="kb" role="group" aria-label="Keyboard map">
            {ROWS.map((row, ri) => (
              <div key={ri} className="kb__row">
                {row.map((k, ki) => {
                  const key = typeof k === 'string' ? k : k.k
                  const w = typeof k === 'string' ? 1 : (k.w ?? 1)
                  const t = keyText(key)
                  const e = keyMap[key]
                  const tone = !e ? '' : e.both ? 'is-both' : e[mode] ? `is-${mode}` : 'is-other'
                  return (
                    <button
                      key={ki}
                      className={`kb__key ${tone} ${hover === key ? 'is-hover' : ''}`}
                      style={{ flexGrow: w, flexBasis: 0 }}
                      onMouseEnter={() => setHover(key)}
                      onFocus={() => setHover(key)}
                      onClick={() => setHover(key)}
                      aria-label={t ? `${key}: ${t}` : key}
                    >
                      <span className="kb__cap">{key}</span>
                      {t && <span className="kb__fn">{t.split(' · ')[0].replace(/ \(.*\)/, '')}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="kb-legend mono">
            <span>
              <i className="sw sw--both" /> Both editors
            </span>
            <span>
              <i className={`sw sw--${mode}`} /> {mode === 'pcb' ? 'PCB editor' : 'Schematic editor'}
            </span>
            <span>
              <i className="sw sw--other" /> Other editor only
            </span>
          </div>
        </section>

        <section className="sc-table-wrap">
          <div className="sc-filters">
            <input className="sc-search" placeholder="Search: via, copper, wire…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search shortcuts" />
            <Segmented
              value={ctx}
              onChange={setCtx}
              options={[
                { value: 'all', label: 'All' },
                { value: 'schematic', label: 'Schematic' },
                { value: 'pcb', label: 'PCB' },
              ]}
            />
          </div>
          {groups.map(([g, rows]) => (
            <div key={g} className="sc-group">
              <div className="sc-group__title mono">{g}</div>
              <div className="sc-rows">
                {rows.map((r, i) => (
                  <div key={i} className="sc-row">
                    <div className="sc-row__action">
                      {r.action}
                      {r.note && <div className="sc-row__note">{r.note}</div>}
                    </div>
                    <div className="sc-row__keys">
                      {r.keys?.map((k, j) => (
                        <span key={k} className="row" style={{ gap: 6 }}>
                          {j > 0 && <span className="muted mono" style={{ fontSize: 11 }}>or</span>}
                          <Keys combo={k} />
                        </span>
                      ))}
                    </div>
                    <div className="sc-row__menu">
                      {r.menu && (
                        <span className="imenu">
                          {r.menu.map((m, j) => (
                            <span key={j}>
                              {j > 0 && <span className="imenu__sep">›</span>}
                              <span className="imenu__item">{m}</span>
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="muted">Nothing matches "{q}".</p>}
        </section>

        <Callout kind="easyeda" title="Standard Edition users">
          Most keys match, with a few differences: in Standard, <b>Ctrl+G</b> places a GND flag, <b>Ctrl+Q</b> places a VCC flag,
          and <b>E</b> starts a copper area. Gerbers live under <b>Fabrication › PCB Fabrication File (Gerber)</b>.
        </Callout>
      </div>
    </div>
  )
}
