import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '@/components/shell/Shell'
import { chapters, lessons, lessonsInChapter, lessonById } from '@/lessons/registry'
import { useProgress } from '@/lib/progress'
import { Thumb } from '@/components/thumbs'
import { IconArrowRight, IconCheck, IconChip, IconKeyboard, IconLock } from '@/components/icons'
import { stages, parts as projectParts } from '@/pcb/project'
import { BoardView } from '@/pcb/render'
import { SchematicView } from '@/pcb/SchematicView'
import { blinkySchematic, SCH_BOUNDS } from '@/pcb/schematic'
import './home.css'

const Board3D = lazy(() => import('@/pcb/Board3D').then((m) => ({ default: m.Board3D })))

export default function Home() {
  const p = useProgress()
  const done = Object.keys(p.completed).filter((id) => lessonById(id)).length
  const resume = p.lastLesson ? lessonById(p.lastLesson) : undefined
  const nextUp = resume ?? lessons.find((l) => !p.completed[l.id]) ?? lessons[0]
  const finished = useMemo(() => stages.finished(), [])
  const sch = useMemo(() => blinkySchematic(), [])
  const totalMin = lessons.reduce((s, l) => s + l.minutes, 0)

  return (
    <div className="home">
      <TopBar />

      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <div className="hero__copy anim-in">
          <div className="eyebrow">A hands-on course · No experience needed</div>
          <h1 className="hero__title display">
            Design your first <em>circuit board</em>, one small step at a time.
          </h1>
          <p className="hero__lead">
            Circuit boards look scary until you break them into small steps. Peel a board apart layer by layer, wire a real
            circuit, route copper traces and order boards from a factory. Every lesson ends with the exact clicks to do it
            yourself in <b>EasyEDA</b>.
          </p>
          <div className="hero__cta">
            <Link to={`/learn/${nextUp.id}`} className="btn btn--accent btn--lg">
              {done > 0 ? `Continue · Lesson ${nextUp.num}` : 'Start lesson 1'} <IconArrowRight size={18} />
            </Link>
            <Link to="/sandbox" className="btn btn--lg">
              <IconChip size={18} /> Open the sandbox
            </Link>
          </div>
          <dl className="hero__stats">
            <div>
              <dt className="mono">{lessons.length}</dt>
              <dd>bite-sized lessons</dd>
            </div>
            <div>
              <dt className="mono">~{Math.round(totalMin / 10) * 10}</dt>
              <dd>minutes, start to finish</dd>
            </div>
            <div>
              <dt className="mono">1</dt>
              <dd>real board you can order</dd>
            </div>
          </dl>
        </div>
        <div className="hero__visual anim-in" style={{ animationDelay: '120ms' }}>
          <div className="hero__board">
            <Suspense fallback={<HeroFallback />}>
              <Board3D doc={finished} autoRotate blink camera="ortho" />
            </Suspense>
            <div className="hero__tag hero__tag--a mono">
              <span className="dot" /> NE555 timer
            </div>
            <div className="hero__tag hero__tag--b mono">
              <span className="dot dot--red" /> LED · 1.5 Hz blink
            </div>
            <div className="hero__tag hero__tag--c mono">30 × 26 mm · 2 layers</div>
          </div>
          <div className="hero__hint mono">Drag to orbit · scroll to zoom</div>
        </div>
      </section>

      {/* ---------------- What you'll build ---------------- */}
      <section className="build-strip">
        <div className="section-head">
          <div className="eyebrow">The project</div>
          <h2 className="display">Meet Blinky: the board you'll design.</h2>
          <p>
            A 555 timer, two resistors and a capacitor make an LED blink about one and a half times a second. It's small
            enough to finish in an afternoon and has every ingredient of a real product.
          </p>
        </div>
        <div className="triptych">
          <figure className="tri">
            <div className="tri__view tri__view--sch">
              <svg viewBox={`${SCH_BOUNDS.x - 8} ${SCH_BOUNDS.y - 6} ${SCH_BOUNDS.w + 16} ${SCH_BOUNDS.h + 12}`} width="100%" height="100%">
                <SchematicView doc={sch} showPinNames={false} />
              </svg>
            </div>
            <figcaption>
              <span className="mono">01</span> Schematic: what connects to what
            </figcaption>
          </figure>
          <figure className="tri">
            <div className="tri__view tri__view--eda">
              <svg viewBox={`-2 -2 ${finished.w + 4} ${finished.h + 4}`} width="100%" height="100%">
                <BoardView doc={stages.routed()} mode="eda" vis={{ ratsnest: false }} />
              </svg>
            </div>
            <figcaption>
              <span className="mono">02</span> Layout: where copper goes
            </figcaption>
          </figure>
          <figure className="tri">
            <div className="tri__view tri__view--real">
              <svg viewBox={`-2 -2 ${finished.w + 4} ${finished.h + 4}`} width="100%" height="100%">
                <BoardView doc={finished} mode="real" vis={{ bodies: true }} />
              </svg>
            </div>
            <figcaption>
              <span className="mono">03</span> Real board, assembled
            </figcaption>
          </figure>
        </div>
        <div className="bom">
          {projectParts.map((pp) => (
            <div key={pp.ref} className="bom__item" title={pp.role}>
              <span className="mono bom__ref">{pp.ref}</span>
              <span className="bom__val">{pp.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Course map ---------------- */}
      <section className="course">
        <div className="section-head">
          <div className="eyebrow">The course</div>
          <h2 className="display">Four chapters, from zero to a box of boards.</h2>
        </div>
        <div className="chapters">
          {chapters.map((c, ci) => {
            const ls = lessonsInChapter(c.id)
            const cd = ls.filter((l) => p.completed[l.id]).length
            return (
              <div key={c.id} className="chapter">
                <header className="chapter__head">
                  <div className="chapter__num mono">CH.{ci + 1}</div>
                  <div className="grow">
                    <h3>{c.title}</h3>
                    <p>{c.blurb}</p>
                  </div>
                  <div className="chapter__count mono">
                    {cd}/{ls.length}
                  </div>
                </header>
                <div className="chapter__lessons">
                  {ls.map((l) => {
                    const ok = !!p.completed[l.id]
                    return (
                      <Link key={l.id} to={`/learn/${l.id}`} className={`lcard ${ok ? 'is-done' : ''}`}>
                        <div className="lcard__thumb">
                          <Thumb id={l.id} />
                        </div>
                        <div className="lcard__body">
                          <div className="lcard__meta mono">
                            {String(l.num).padStart(2, '0')} · {l.minutes} min
                            {ok && (
                              <span className="lcard__ok">
                                <IconCheck size={11} />
                              </span>
                            )}
                          </div>
                          <div className="lcard__title">{l.title}</div>
                          <div className="lcard__blurb">{l.blurb}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <Link to="/sandbox" className="capstone">
            <div className="capstone__thumb">
              <Thumb id="sandbox" />
            </div>
            <div className="grow">
              <div className="eyebrow">Capstone</div>
              <div className="capstone__title display">Build Blinky from scratch in the sandbox</div>
              <p>
                A mini EasyEDA in your browser. Place parts, route both layers, pour ground, run DRC, check it in 3D and
                export your "order".
              </p>
            </div>
            <IconArrowRight size={22} />
          </Link>
        </div>
      </section>

      {/* ---------------- Promises ---------------- */}
      <section className="promises">
        <div className="promise">
          <div className="promise__icon">
            <IconKeyboard />
          </div>
          <h3>Learn the tool, not just the theory</h3>
          <p>
            Each lesson has a "Do it in EasyEDA" panel with the menu paths and shortcuts, plus a printable{' '}
            <Link to="/shortcuts">cheat sheet</Link>.
          </p>
        </div>
        <div className="promise">
          <div className="promise__icon">
            <IconChip />
          </div>
          <h3>Touch everything</h3>
          <p>Every concept comes with something to drag, toggle or break. Missions tick off as you go.</p>
        </div>
        <div className="promise">
          <div className="promise__icon">
            <IconLock />
          </div>
          <h3>Private by design</h3>
          <p>No account, no tracking, no cookies. Your progress is stored only in this browser.</p>
        </div>
      </section>

      <footer className="foot mono">
        <span>LEARN PCB · Made for curious beginners</span>
        <span>
          Not affiliated with EasyEDA, LCSC or JLCPCB. Fab limits change, so always check your manufacturer's current
          capabilities.
        </span>
      </footer>
    </div>
  )
}

function HeroFallback() {
  const doc = stages.finished()
  return (
    <svg viewBox={`-4 -4 ${doc.w + 8} ${doc.h + 8}`} width="100%" height="100%" style={{ padding: '10%' }}>
      <BoardView doc={doc} mode="real" vis={{ bodies: true }} />
    </svg>
  )
}
