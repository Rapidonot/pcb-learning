import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { lessons } from '@/lessons/registry'
import { useProgress } from '@/lib/progress'
import { Thumb } from './thumbs'
import { IconCheck, IconChevronLeft, IconChevronRight } from './icons'
import './strip.css'

export function LessonStrip({ current }: { current?: string }) {
  const p = useProgress()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('.strip__item.is-current')
    if (el && ref.current) {
      const box = ref.current
      box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
    }
  }, [current])
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 320, behavior: 'smooth' })
  return (
    <nav className="strip" aria-label="Lessons">
      <div className="strip__label mono">Lessons</div>
      <button className="strip__arrow" onClick={() => scroll(-1)} aria-label="Scroll lessons left">
        <IconChevronLeft size={16} />
      </button>
      <div className="strip__track" ref={ref}>
        {lessons.map((l) => {
          const done = !!p.completed[l.id]
          const isCur = l.id === current
          return (
            <Link key={l.id} to={`/learn/${l.id}`} className={`strip__item ${isCur ? 'is-current' : ''} ${done ? 'is-done' : ''}`}>
              <div className="strip__thumb">
                <Thumb id={l.id} />
                {done && (
                  <span className="strip__check">
                    <IconCheck size={10} />
                  </span>
                )}
              </div>
              <div className="strip__name mono">
                {l.num}. {l.short}
              </div>
            </Link>
          )
        })}
        <Link to="/sandbox" className="strip__item strip__item--cap">
          <div className="strip__thumb">
            <Thumb id="sandbox" />
          </div>
          <div className="strip__name mono">★ Capstone</div>
        </Link>
      </div>
      <button className="strip__arrow" onClick={() => scroll(1)} aria-label="Scroll lessons right">
        <IconChevronRight size={16} />
      </button>
    </nav>
  )
}
