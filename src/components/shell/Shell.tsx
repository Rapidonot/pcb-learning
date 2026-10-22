import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { lessons, chapterById, lessonById } from '@/lessons/registry'
import { useProgress } from '@/lib/progress'
import { toggleTheme, useTheme } from '@/lib/theme'
import { useToasts } from '@/lib/toast'
import { IconBook, IconChip, IconGlossary, IconHome, IconKeyboard, IconMoon, IconSun, IconCheck, IconTrophy } from '../icons'
import { Logo } from './Logo'
import './shell.css'

export function Shell({ children }: { children: ReactNode }) {
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [loc.pathname])
  return (
    <div className="shell">
      <Rail />
      <div className="shell__main">{children}</div>
      <Toaster />
    </div>
  )
}

function Rail() {
  const theme = useTheme()
  const p = useProgress()
  const resume = p.lastLesson && lessonById(p.lastLesson) ? p.lastLesson : lessons[0].id
  const items = [
    { to: '/', icon: <IconHome />, label: 'Home', end: true },
    { to: `/learn/${resume}`, icon: <IconBook />, label: 'Lessons', match: '/learn' },
    { to: '/sandbox', icon: <IconChip />, label: 'Capstone sandbox' },
    { to: '/shortcuts', icon: <IconKeyboard />, label: 'EasyEDA cheat sheet' },
    { to: '/glossary', icon: <IconGlossary />, label: 'Glossary' },
  ]
  const loc = useLocation()
  return (
    <nav className="rail" aria-label="Main">
      <NavLink to="/" className="rail__logo" aria-label="Learn PCB home">
        <Logo size={30} />
      </NavLink>
      <div className="rail__items">
        {items.map((it) => {
          const active = it.match ? loc.pathname.startsWith(it.match) : undefined
          return (
            <NavLink
              key={it.label}
              to={it.to}
              end={it.end}
              className={({ isActive }) => `rail__item ${(active ?? isActive) ? 'is-active' : ''}`}
              data-tip={it.label}
              data-tip-pos="right"
              aria-label={it.label}
            >
              {it.icon}
            </NavLink>
          )
        })}
      </div>
      <div className="rail__foot">
        <button
          className="rail__item"
          onClick={toggleTheme}
          data-tip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          data-tip-pos="right"
          aria-label="Toggle colour theme"
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <div className="rail__vert mono">LEARN·PCB — v1.0</div>
      </div>
    </nav>
  )
}

export function TopBar({ children }: { children?: ReactNode }) {
  const p = useProgress()
  const done = Object.keys(p.completed).filter((id) => lessonById(id)).length
  const current = p.lastLesson ? lessonById(p.lastLesson) : undefined
  const chapter = current ? chapterById(current.chapter) : undefined
  return (
    <header className="topbar">
      <NavLink to="/" className="topbar__brand">
        <Logo size={34} />
        <div>
          <div className="topbar__name">LEARN PCB</div>
          <div className="topbar__tag">SKETCH · ROUTE · FABRICATE</div>
        </div>
      </NavLink>
      <div className="grow" />
      {children}
      <div className="topbar__progress" title={`${done} of ${lessons.length} lessons complete`}>
        {done === lessons.length ? <IconTrophy size={16} /> : <IconBook size={16} />}
        <div className="col" style={{ gap: 4, minWidth: 92 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="topbar__chap">{chapter?.title ?? 'Start here'}</span>
            <span className="topbar__count">
              {done}/{lessons.length}
            </span>
          </div>
          <div className="topbar__bar">
            <div style={{ width: `${(done / lessons.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <Clock />
    </header>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const date = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()
  const time = now.toLocaleTimeString('en-GB', { hour12: false })
  return (
    <div className="topbar__clock mono" aria-hidden>
      <div>{date}</div>
      <div>{time}</div>
    </div>
  )
}

function Toaster() {
  const toasts = useToasts()
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <div className="toast__icon">{t.kind === 'mission' || t.kind === 'success' ? <IconCheck size={14} /> : '!'}</div>
          <div className="grow">
            <div className="toast__title">{t.title}</div>
            {t.body && <div className="toast__body">{t.body}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
