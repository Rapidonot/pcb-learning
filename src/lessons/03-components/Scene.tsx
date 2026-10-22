import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMission } from '../mission'
import { Button, Chip } from '@/components/ui'
import { SceneToolbar } from '@/components/content'
import { IconX, IconEye, IconReset, IconTrophy, IconInfo } from '@/components/icons'
import { parts as blinkyParts } from '@/pcb/project'
import { ArtDefs, PartArt } from './PartArt'
import { SymbolArt } from './Symbols'
import { Decoder } from './Decoder'
import { PARTS, SYMBOL_ANSWERS, byId, type PartId, type SymId } from './data'
import { useSize } from './iso'

const Viewer3D = lazy(() => import('./Viewer3D'))

type Mode = 'inspect' | 'match' | 'decode'
const GAME_LEN = 6

/** Keeps a WebGL failure from taking the whole lesson down. */
class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() {
    return { err: true }
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children
  }
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export function Scene() {
  const mission = useMission()
  const [ref, size] = useSize<HTMLDivElement>()
  const compact = size.w > 0 && size.w < 640
  const [mode, setMode] = useState<Mode>('inspect')
  const [sel, setSel] = useState<PartId | null>(null)
  const [sheet, setSheet] = useState(false)
  const seen = useRef(new Set<PartId>())

  /* ---------- match game ---------- */
  const newGame = () => shuffle(Object.keys(SYMBOL_ANSWERS) as SymId[]).slice(0, GAME_LEN)
  const [game, setGame] = useState<SymId[]>(newGame)
  const [round, setRound] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const [missed, setMissed] = useState(false)
  const [fb, setFb] = useState<{ kind: 'good' | 'bad' | 'near'; text: string; part: PartId } | null>(null)
  const over = round >= GAME_LEN

  const inspect = (id: PartId) => {
    setSel(id)
    setSheet(true)
    seen.current.add(id)
    if (seen.current.size >= 3) mission.complete('inspect3')
  }

  const answer = (id: PartId) => {
    if (over || fb?.kind === 'good') return
    const target = SYMBOL_ANSWERS[game[round]]
    if (target.ok.includes(id)) {
      setFb({ kind: 'good', text: `Yes! That's the ${target.label.toLowerCase()} symbol.`, part: id })
      if (!missed) setFirstTry((n) => n + 1)
      window.setTimeout(() => {
        setFb(null)
        setMissed(false)
        setRound((r) => r + 1)
      }, 900)
    } else {
      setMissed(true)
      const near = target.near?.[id]
      setFb({ kind: near ? 'near' : 'bad', text: near ?? `Not that one: that's a ${byId[id].name.toLowerCase()}. Look again at the symbol.`, part: id })
    }
  }
  useEffect(() => {
    if (over) mission.complete('match')
  }, [over, mission])
  const restart = () => {
    setGame(newGame())
    setRound(0)
    setFirstTry(0)
    setMissed(false)
    setFb(null)
  }

  const onPick = (id: PartId) => (mode === 'match' ? answer(id) : inspect(id))
  const onValue = useCallback((v: number) => {
    if (v === 330) mission.complete('decode')
  }, [mission])

  const switchMode = (m: Mode) => {
    setMode(m)
    setSheet(false)
    setFb(null)
  }

  return (
    <div ref={ref} className={`l03-scene ${compact ? 'is-compact' : ''} is-${mode}`}>
      <ArtDefs />
      {mode !== 'decode' ? (
        <>
          <Tray
            sel={mode === 'inspect' ? sel : null}
            fb={mode === 'match' ? fb : null}
            onPick={onPick}
            compact={compact}
            gameTop={mode === 'match' && compact}
          />
          {mode === 'inspect' && (!compact || sheet) && (
            <aside className={`l03-side ${compact ? 'is-sheet' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
              {compact && (
                <button className="l03-side__close" aria-label="Close" onClick={() => setSheet(false)}>
                  <IconX size={16} />
                </button>
              )}
              {sel ? <Inspector id={sel} onPolarity={(id) => ['led', 'cap-elec', 'diode'].includes(id) && mission.complete('polarity')} compact={compact} /> : <Empty />}
            </aside>
          )}
          {mode === 'match' && (
            <aside className={`l03-side l03-game ${compact ? 'is-top' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
              {!over ? (
                <>
                  <div className="l03-game__head">
                    <span className="float-card__title">Symbol match</span>
                    <span className="l03-dots">
                      {game.map((_, i) => (
                        <i key={i} className={i < round ? 'is-done' : i === round ? 'is-now' : ''} />
                      ))}
                    </span>
                  </div>
                  <div className="l03-game__sym" key={round}>
                    <SymbolArt id={game[round]} label="Mystery schematic symbol" />
                  </div>
                  <p className="l03-game__q">
                    {compact ? 'Tap the part this symbol stands for.' : 'Which part in the tray does this schematic symbol stand for? Click it.'}
                  </p>
                  <div className={`l03-game__fb is-${fb?.kind ?? 'none'}`} aria-live="polite">
                    {fb?.text ?? (compact ? '' : 'Hint: symbols show what a part does, not what it looks like.')}
                  </div>
                </>
              ) : (
                <div className="l03-game__win">
                  <IconTrophy size={28} />
                  <div className="l03-game__score">
                    {firstTry}/{GAME_LEN}
                  </div>
                  <p>first try. {firstTry === GAME_LEN ? 'Perfect! You can read schematics already.' : 'Nice work. Play again to beat your score.'}</p>
                  <Button size="sm" variant="primary" onClick={restart}>
                    <IconReset size={14} /> Play again
                  </Button>
                </div>
              )}
            </aside>
          )}
        </>
      ) : (
        <Decoder onValue={onValue} compact={compact} />
      )}

      <SceneToolbar>
        {(
          [
            ['inspect', compact ? 'Inspect' : 'Inspect parts'],
            ['match', compact ? 'Match' : 'Symbol game'],
            ['decode', compact ? 'Decode' : 'Value decoder'],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <Button key={m} size="sm" variant="ghost" active={mode === m} onClick={() => switchMode(m)} aria-pressed={mode === m}>
            {label}
          </Button>
        ))}
      </SceneToolbar>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Tray({
  sel,
  fb,
  onPick,
  compact,
  gameTop,
}: {
  sel: PartId | null
  fb: { kind: string; part: PartId } | null
  onPick: (id: PartId) => void
  compact: boolean
  gameTop: boolean
}) {
  return (
    <div className={`l03-tray ${gameTop ? 'is-below' : ''}`} role="list" aria-label="Parts tray">
      {PARTS.map((p) => {
        const state = fb && fb.part === p.id ? `is-${fb.kind}` : ''
        return (
          <button
            key={p.id}
            role="listitem"
            className={`l03-cell ${sel === p.id ? 'is-sel' : ''} ${state}`}
            onClick={() => onPick(p.id)}
            aria-label={`${p.name}, ${p.variant}`}
          >
            <span className="l03-cell__letter mono">{p.letter}</span>
            {p.zoom && <span className="l03-cell__zoom mono">{p.zoom}</span>}
            <span className="l03-cell__art">
              <PartArt id={p.id} />
            </span>
            <span className="l03-cell__name">{p.name}</span>
            {!compact && <span className="l03-cell__var mono">{p.mount} · {p.variant.split(',').slice(-1)[0].trim()}</span>}
          </button>
        )
      })}
      <div className="l03-cell l03-cell--key" aria-hidden>
        <div className="l03-key">
          <div>
            <b className="mono">THT</b> through-hole: legs go through the board
          </div>
          <div>
            <b className="mono">SMD</b> surface-mount: sits on pads
          </div>
          <div>
            <b className="mono l03-key__l">R</b> designator letter
          </div>
        </div>
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className="l03-empty">
      <div className="l03-empty__art">
        <PartArt id="res-tht" />
      </div>
      <div className="float-card__title">Parts inspector</div>
      <p>Click any part in the tray to see what it does, its schematic symbol, its letter and where it lives on Blinky.</p>
    </div>
  )
}

function Inspector({ id, onPolarity, compact }: { id: PartId; onPolarity: (id: PartId) => void; compact: boolean }) {
  const p = byId[id]
  const [marks, setMarks] = useState(false)
  useEffect(() => setMarks(false), [id])
  const refs = useMemo(() => blinkyParts.filter((b) => p.blinky.includes(b.ref)), [p])
  const hasMarks = ['cap-elec', 'led', 'diode', 'ic-dip', 'ic-soic', 'header'].includes(id)
  return (
    <div className="l03-insp" key={id}>
      <div className="l03-insp__head">
        <span className="l03-insp__letter mono" aria-label={`Designator letter ${p.letter}`}>
          {p.letter}
        </span>
        <div className="grow">
          <div className="l03-insp__name">{p.name}</div>
          <div className="l03-insp__var">{p.variant}</div>
        </div>
      </div>
      <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
        <Chip tone="accent">{p.mount}</Chip>
        <Chip>{p.kind}</Chip>
        {p.polar && <Chip tone="warn">{id.startsWith('ic') || id === 'transistor' ? 'Pin 1 matters' : id === 'header' ? 'Pin 1' : 'Polarised'}</Chip>}
      </div>

      <div className="l03-hero">
        <Boundary fallback={<PartArt id={id} />}>
          <Suspense fallback={<PartArt id={id} />}>
            <Viewer3D id={id} marks={marks} />
          </Suspense>
        </Boundary>
        <span className="l03-hero__tag mono">{marks ? 'drag to turn' : '3D · drag to turn'}</span>
        {hasMarks && (
          <button
            className={`l03-hero__btn ${marks ? 'is-on' : ''}`}
            onClick={() => {
              setMarks((m) => !m)
              onPolarity(id)
            }}
          >
            <IconEye size={14} /> {marks ? 'Hide marks' : id.startsWith('ic') || id === 'header' ? 'Show pin 1' : 'Show polarity'}
          </button>
        )}
      </div>

      <p className="l03-insp__what">{p.what}</p>

      <div className="l03-insp__grid">
        <div className="l03-insp__sym">
          <SymbolArt id={p.sym} label={`Schematic symbol for a ${p.name.toLowerCase()}`} />
          <span className="mono">SYMBOL</span>
        </div>
        <div className="l03-insp__des">
          <span className="mono">DESIGNATOR</span>
          <b className="mono">
            {p.letter}1, {p.letter}2…
          </b>
          <span className="mono">VALUE</span>
          <small>{p.values}</small>
        </div>
      </div>

      {p.polarity && (
        <div className={`l03-insp__pol ${p.polar ? 'is-polar' : ''}`}>
          <IconInfo size={14} />
          <span>{p.polarity}</span>
        </div>
      )}

      <div className="l03-insp__blinky">
        <div className="mono l03-insp__k">IN BLINKY</div>
        {refs.length ? (
          <ul>
            {refs.map((r) => (
              <li key={r.ref}>
                <b className="mono">{r.ref}</b>
                <span className="mono l03-insp__val">{r.value}</span>
                {!compact && <span className="l03-insp__role">{r.role}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Not used in Blinky.</p>
        )}
        {p.blinkyNote && <p className="l03-insp__note">{p.blinkyNote}</p>}
      </div>
    </div>
  )
}
