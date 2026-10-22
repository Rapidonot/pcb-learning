import { Suspense, use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { lessons, lessonById, chapterById } from '@/lessons/registry'
import type { LessonContent, LessonMeta, QuizQuestion } from '@/lessons/types'
import { MissionProvider } from '@/lessons/mission'
import { progress, useProgress } from '@/lib/progress'
import { toast } from '@/lib/toast'
import { TopBar } from '@/components/shell/Shell'
import { LessonStrip } from '@/components/LessonStrip'
import { Keys, Button, Chip } from '@/components/ui'
import { IconArrowRight, IconCheck, IconChevronRight, IconArrowLeft, IconChevronDown } from '@/components/icons'
import { Confetti } from '@/components/Confetti'
import './lesson.css'

const cache = new Map<string, Promise<{ default: LessonContent }>>()
function loadLesson(meta: LessonMeta) {
  if (!cache.has(meta.id)) cache.set(meta.id, meta.load())
  return cache.get(meta.id)!
}

export default function LessonPage() {
  const { lessonId = '' } = useParams()
  const meta = lessonById(lessonId)
  useEffect(() => {
    if (meta) progress.visit(meta.id)
  }, [meta])
  // preload the next lesson in the background
  useEffect(() => {
    if (!meta) return
    const next = lessons[meta.num]
    if (next) {
      const t = window.setTimeout(() => loadLesson(next), 1500)
      return () => window.clearTimeout(t)
    }
  }, [meta])
  if (!meta) return <Navigate to="/" replace />
  return (
    <div className="lesson-page">
      <TopBar />
      <Suspense fallback={<LessonSkeleton meta={meta} />}>
        <LessonBody key={meta.id} meta={meta} />
      </Suspense>
    </div>
  )
}

function LessonSkeleton({ meta }: { meta: LessonMeta }) {
  return (
    <div className="lesson-top">
      <div className="lesson-grid">
        <section className="stage">
          <StageHead meta={meta} goal="Loading…" />
          <div className="stage__scene stage__scene--loading">
            <div className="spinner" />
          </div>
        </section>
        <aside className="side" />
      </div>
    </div>
  )
}

function StageHead({ meta, goal }: { meta: LessonMeta; goal: ReactNode }) {
  const chapter = chapterById(meta.chapter)
  return (
    <header className="stage__head">
      <div className="stage__num mono">{String(meta.num).padStart(2, '0')}</div>
      <div className="grow">
        <div className="eyebrow">
          {chapter.title} · Lesson {meta.num} of {lessons.length} · {meta.minutes} min
        </div>
        <h1 className="stage__title display">{meta.title}</h1>
        <div className="stage__goal">
          <span className="stage__goal-tag mono">TRY IT</span>
          {goal}
        </div>
      </div>
    </header>
  )
}

function LessonBody({ meta }: { meta: LessonMeta }) {
  const lesson = use(loadLesson(meta)).default
  const p = useProgress()
  const doneMissions = p.missions[meta.id] ?? []
  const completed = !!p.completed[meta.id]
  const { Scene, Article } = lesson
  const articleRef = useRef<HTMLDivElement>(null)
  const [celebrate, setCelebrate] = useState(0)

  const missionsDone = lesson.missions.filter((m) => doneMissions.includes(m.id)).length
  const allMissions = lesson.missions.length > 0 && missionsDone === lesson.missions.length

  const prevAll = useRef(allMissions)
  useEffect(() => {
    if (allMissions && !prevAll.current) {
      setCelebrate((c) => c + 1)
      toast({ kind: 'success', title: 'All missions done', body: 'Scroll down to check your understanding.' }, 4200)
    }
    prevAll.current = allMissions
  }, [allMissions])

  const complete = () => {
    if (!completed) {
      progress.completeLesson(meta.id)
      setCelebrate((c) => c + 1)
      toast({ kind: 'success', title: 'Lesson complete', body: meta.title })
    }
  }

  const next = lessons[meta.num]
  const prev = lessons[meta.num - 2]

  return (
    <MissionProvider lessonId={meta.id} missions={lesson.missions}>
      <div className="lesson-top">
        <div className="lesson-grid">
          <section className="stage anim-in">
            <StageHead meta={meta} goal={lesson.goal} />
            <div className="stage__scene">
              <Scene />
            </div>
          </section>
          <aside className="side anim-in" style={{ animationDelay: '80ms' }}>
            <MissionsPanel lesson={lesson} done={doneMissions} />
            <BuildPanel lesson={lesson} />
          </aside>
        </div>
        <LessonStrip current={meta.id} />
        <button className="scroll-hint" onClick={() => articleRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="mono">UNDERSTAND IT</span>
          <IconChevronDown size={16} />
        </button>
      </div>

      <div className="lesson-read" ref={articleRef}>
        <div className="lesson-read__inner">
          <div className="read-label mono">
            <span>§ {String(meta.num).padStart(2, '0')}</span> Understand
          </div>
          <article className="prose">
            <Article />
          </article>

          {lesson.terms.length > 0 && (
            <section className="terms">
              <div className="read-label mono">
                <span>¶</span> Key terms
              </div>
              <dl className="terms__list">
                {lesson.terms.map((t) => (
                  <div key={t.term} className="terms__item">
                    <dt>{t.term}</dt>
                    <dd>{t.def}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {lesson.quiz.length > 0 && <Quiz lessonId={meta.id} questions={lesson.quiz} onPass={complete} />}

          <section className="finish">
            {completed ? (
              <div className="finish__done">
                <div className="finish__badge">
                  <IconCheck size={22} />
                </div>
                <div>
                  <div className="finish__title">Lesson complete</div>
                  <div className="muted">Nice work. Your progress is saved in this browser.</div>
                </div>
              </div>
            ) : (
              <Button variant="primary" size="lg" onClick={complete}>
                <IconCheck size={18} /> Mark lesson complete
              </Button>
            )}
            <div className="finish__nav">
              {prev ? (
                <Link to={`/learn/${prev.id}`} className="nav-card">
                  <IconArrowLeft size={16} />
                  <div>
                    <div className="eyebrow">Previous</div>
                    <div className="nav-card__title">{prev.title}</div>
                  </div>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link to={`/learn/${next.id}`} className="nav-card nav-card--next">
                  <div>
                    <div className="eyebrow">Next · Lesson {next.num}</div>
                    <div className="nav-card__title">{next.title}</div>
                  </div>
                  <IconArrowRight size={16} />
                </Link>
              ) : (
                <Link to="/sandbox" className="nav-card nav-card--next">
                  <div>
                    <div className="eyebrow">Capstone</div>
                    <div className="nav-card__title">Build Blinky from scratch</div>
                  </div>
                  <IconArrowRight size={16} />
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>
      <Confetti fire={celebrate} />
    </MissionProvider>
  )
}

/* ------------------------------------------------------------------ */

function MissionsPanel({ lesson, done }: { lesson: LessonContent; done: string[] }) {
  if (!lesson.missions.length) return null
  const n = lesson.missions.filter((m) => done.includes(m.id)).length
  return (
    <section className="side-card missions">
      <header className="side-card__head">
        <span className="side-card__title mono">Missions</span>
        <span className="grow" />
        <Chip tone={n === lesson.missions.length ? 'good' : undefined}>
          {n}/{lesson.missions.length}
        </Chip>
      </header>
      <ul className="missions__list">
        {lesson.missions.map((m) => {
          const ok = done.includes(m.id)
          return (
            <li key={m.id} className={`mission ${ok ? 'is-done' : ''}`}>
              <span className="mission__box">{ok && <IconCheck size={12} />}</span>
              <span>{m.text}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function BuildPanel({ lesson }: { lesson: LessonContent }) {
  const [open, setOpen] = useState(0)
  const steps = lesson.build.steps
  if (!steps.length) return null
  return (
    <section className="side-card build">
      <header className="side-card__head">
        <span className="easy-badge" aria-hidden>
          E
        </span>
        <span className="side-card__title mono">Do it in EasyEDA</span>
        <span className="grow" />
        <span className="mono muted" style={{ fontSize: 11 }}>
          {open + 1}/{steps.length}
        </span>
      </header>
      {lesson.build.intro && <div className="build__intro">{lesson.build.intro}</div>}
      <ol className="build__steps">
        {steps.map((s, i) => (
          <li key={i} className={`bstep ${i === open ? 'is-open' : ''} ${i < open ? 'is-past' : ''}`}>
            <button className="bstep__head" onClick={() => setOpen(i)} aria-expanded={i === open}>
              <span className="bstep__num mono">{i < open ? <IconCheck size={11} /> : i + 1}</span>
              <span className="bstep__title">{s.title}</span>
            </button>
            {i === open && (
              <div className="bstep__body">
                {s.menu && (
                  <div className="menu-path">
                    {s.menu.map((m, j) => (
                      <span key={j} className="menu-path__item">
                        {j > 0 && <IconChevronRight size={11} />}
                        <span>{m}</span>
                      </span>
                    ))}
                  </div>
                )}
                {s.keys && s.keys.length > 0 && (
                  <div className="row wrap" style={{ gap: 6 }}>
                    {s.keys.map((k) => (
                      <Keys key={k} combo={k} />
                    ))}
                  </div>
                )}
                {s.body && <div className="bstep__text">{s.body}</div>}
                {i < steps.length - 1 && (
                  <button className="bstep__next" onClick={() => setOpen(i + 1)}>
                    Next step <IconArrowRight size={13} />
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {lesson.build.tip && <div className="build__tip">{lesson.build.tip}</div>}
      <div className="build__foot mono">Shortcuts are EasyEDA Pro defaults and can be changed under Settings › Shortcuts.</div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Quiz({ lessonId, questions, onPass }: { lessonId: string; questions: QuizQuestion[]; onPass: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const answered = answers.filter((a) => a !== null).length
  const correct = answers.filter((a, i) => a === questions[i].answer).length
  const finished = answered === questions.length
  const passed = finished && correct === questions.length

  useEffect(() => {
    if (finished) {
      progress.setQuiz(lessonId, correct / questions.length)
      if (passed) onPass()
    }
  }, [finished]) // eslint-disable-line react-hooks/exhaustive-deps

  const score = useMemo(() => `${correct}/${questions.length}`, [correct, questions.length])

  return (
    <section className="quiz">
      <div className="read-label mono">
        <span>?</span> Check yourself
        <span className="grow" />
        {finished && <Chip tone={passed ? 'good' : 'warn'}>{score}</Chip>}
      </div>
      <div className="quiz__list">
        {questions.map((q, qi) => {
          const a = answers[qi]
          return (
            <div key={qi} className="qcard">
              <div className="qcard__q">
                <span className="qcard__n mono">{qi + 1}</span>
                <div>{q.q}</div>
              </div>
              <div className="qcard__opts">
                {q.options.map((o, oi) => {
                  const chosen = a === oi
                  const right = a !== null && oi === q.answer
                  const wrong = chosen && oi !== q.answer
                  return (
                    <button
                      key={oi}
                      className={`qopt ${right ? 'is-right' : ''} ${wrong ? 'is-wrong' : ''} ${a !== null && !right && !wrong ? 'is-dim' : ''}`}
                      disabled={a !== null}
                      onClick={() => setAnswers((cur) => cur.map((x, i) => (i === qi ? oi : x)))}
                    >
                      <span className="qopt__key mono">{String.fromCharCode(65 + oi)}</span>
                      <span>{o}</span>
                    </button>
                  )
                })}
              </div>
              {a !== null && (
                <div className={`qcard__explain ${a === q.answer ? 'is-right' : 'is-wrong'}`}>
                  <b>{a === q.answer ? 'Correct.' : 'Not quite.'}</b> {q.explain}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {finished && !passed && (
        <Button size="sm" onClick={() => setAnswers(questions.map(() => null))}>
          Try again
        </Button>
      )}
    </section>
  )
}
