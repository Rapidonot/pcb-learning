import { useCallback, useEffect, useRef, useState } from 'react'
import { useMission } from '../mission'
import { Button } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconCheck, IconChevronDown } from '@/components/icons'
import { Datasheet } from './Datasheet'
import { PartSearch } from './PartSearch'
import { FootprintCheck } from './FootprintCheck'
import { PINS, RIGHT_ID, SECTIONS, sectionById, type Candidate, type SectionId } from './data'

type Mode = 'sheet' | 'search' | 'check'
type Focus = { kind: 'section'; id: SectionId } | { kind: 'pin'; n: number } | { kind: 'row'; id: string; section: SectionId } | null

const ROW_NOTES: Record<string, { title: string; body: string; good?: boolean }> = {
  'abs-vcc': {
    title: 'Maximum supply voltage: 18 V',
    body: 'This is the most the VCC pin can ever see. Go above it, even for a moment, and the chip can be destroyed. Blinky runs at 5 V, so there is a huge safety margin.',
    good: true,
  },
  'rec-vcc': {
    title: 'Recommended supply: 5 V to 15 V',
    body: 'This is the range the chip is designed to work in. It is not the survival limit, though. Look one table up, in Absolute maximum ratings.',
  },
  'el-icc': {
    title: 'Supply current: 3 mA typical',
    body: 'The chip itself sips about 3 mA (6 mA worst case). Add the LED current and Blinky draws roughly 10 mA, which any USB port can supply.',
  },
}

export function Scene() {
  const mission = useMission()
  const [mode, setMode] = useState<Mode>('sheet')
  const [focus, setFocus] = useState<Focus>(null)
  const [visited, setVisited] = useState<SectionId[]>([])
  const [placed, setPlaced] = useState<Candidate | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)

  const visit = (id: SectionId) => setVisited((v) => (v.includes(id) ? v : [...v, id]))

  const onSection = (id: SectionId) => {
    setFocus({ kind: 'section', id })
    visit(id)
  }
  const onPin = (n: number) => {
    setFocus({ kind: 'pin', n })
    visit('pinout')
    if (n === 8) mission.complete('vcc')
  }
  const onRow = (id: string, section: SectionId) => {
    setFocus({ kind: 'row', id, section })
    visit(section)
    if (id === 'abs-vcc') mission.complete('absmax')
  }
  const onPlace = (c: Candidate) => {
    setPlaced(c)
    if (c.id === RIGHT_ID) mission.complete('pick')
  }
  const onPass = useCallback(() => mission.complete('footprint'), [mission])

  const jump = (id: SectionId) => {
    onSection(id)
    const el = docRef.current?.querySelector<HTMLElement>(`[data-sec="${id}"]`)
    const box = docRef.current
    if (el && box) {
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 14
      box.scrollTo({ top, behavior: 'smooth' })
    }
  }

  // phones: open the note sheet whenever something new is selected
  useEffect(() => {
    if (focus && window.matchMedia('(max-width: 760px)').matches) setNotesOpen(true)
  }, [focus])

  const curSection: SectionId | null = focus?.kind === 'section' ? focus.id : focus?.kind === 'row' ? focus.section : focus?.kind === 'pin' ? 'pinout' : null

  return (
    <div className="l6b-scene">
      {mode === 'sheet' && (
        <div className="l6b-reader">
          <div className="l6b-reader__doc" ref={docRef}>
            <Datasheet
              section={curSection}
              pin={focus?.kind === 'pin' ? focus.n : null}
              row={focus?.kind === 'row' ? focus.id : null}
              onSection={onSection}
              onPin={onPin}
              onRow={onRow}
            />
          </div>
          <aside className={`l6b-notes ${notesOpen ? 'is-open' : ''}`} aria-label="Datasheet notes">
            <button className="l6b-notes__grab" onClick={() => setNotesOpen((o) => !o)} aria-label={notesOpen ? 'Collapse notes' : 'Expand notes'}>
              <span className="l6b-notes__grabbar" />
            </button>
            <div className="l6b-notes__head">
              <span className="l6b-notes__title mono">Datasheet reader</span>
              <span className="l6b-notes__count mono">
                {visited.length}/{SECTIONS.length}
              </span>
              <button className="l6b-notes__toggle" onClick={() => setNotesOpen((o) => !o)} aria-label="Toggle notes">
                <IconChevronDown size={16} />
              </button>
            </div>
            <Note focus={focus} />
            <div className="l6b-toc">
              <div className="l6b-toc__label mono">Sections</div>
              {SECTIONS.map((s) => (
                <button key={s.id} className={`l6b-toc__item ${curSection === s.id ? 'is-on' : ''} ${visited.includes(s.id) ? 'is-seen' : ''}`} onClick={() => jump(s.id)}>
                  <span className="l6b-toc__n">{visited.includes(s.id) ? <IconCheck size={11} /> : s.n}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {mode === 'search' && (
        <div className="l6b-pane">
          <PartSearch placedId={placed?.id ?? null} onPlace={onPlace} />
        </div>
      )}

      {mode === 'check' && (
        <div className="l6b-pane">
          <FootprintCheck cand={placed} onPass={onPass} onBack={() => setMode('search')} />
        </div>
      )}

      <SceneToolbar>
        {(
          [
            ['sheet', '1', 'Datasheet'],
            ['search', '2', 'Find the part'],
            ['check', '3', 'Footprint check'],
          ] as const
        ).map(([m, n, l]) => (
          <Button key={m} size="sm" variant="ghost" active={mode === m} onClick={() => setMode(m)} aria-label={l}>
            <span className="l6b-step mono">{n}</span>
            <span className="l6b-step__label">{l}</span>
          </Button>
        ))}
      </SceneToolbar>
    </div>
  )
}

function Note({ focus }: { focus: Focus }) {
  if (!focus) {
    return (
      <div className="l6b-note-card is-empty">
        <div className="l6b-note-card__kicker mono">Start here</div>
        <p>
          Click any numbered <span className="l6b-inlinehot">1</span> marker, a pin in the pinout, or a row in a table. The plain-English
          meaning appears here.
        </p>
      </div>
    )
  }
  if (focus.kind === 'pin') {
    const p = PINS.find((q) => q.num === focus.n)!
    return (
      <div className="l6b-note-card" key={`pin${p.num}`}>
        <div className="l6b-note-card__kicker mono">Pin {p.num} · {p.type}</div>
        <div className="l6b-note-card__pin">
          <span className="l6b-pinbadge mono">{p.num}</span>
          <b className="mono">{p.name}</b>
        </div>
        <p>{p.desc}</p>
        {p.num === 8 && <div className="l6b-note-card__good">Found it: VCC is pin 8, diagonally opposite GND on pin 1.</div>}
      </div>
    )
  }
  if (focus.kind === 'row') {
    const r = ROW_NOTES[focus.id]
    const s = sectionById(focus.section)
    return (
      <div className="l6b-note-card" key={focus.id}>
        <div className="l6b-note-card__kicker mono">
          {s.n} · {s.name}
        </div>
        <b className="l6b-note-card__title">{r.title}</b>
        <p>{r.body}</p>
        {r.good && <div className="l6b-note-card__good">Exceed this and the chip dies. Design well below it.</div>}
      </div>
    )
  }
  const s = sectionById(focus.id)
  return (
    <div className="l6b-note-card" key={s.id}>
      <div className="l6b-note-card__kicker mono">Section {s.n}</div>
      <b className="l6b-note-card__title">{s.name}</b>
      <p>{s.about}</p>
      {s.blinky && (
        <div className="l6b-note-card__blinky">
          <span className="mono">For Blinky</span>
          {s.blinky}
        </div>
      )}
    </div>
  )
}
