import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '@/components/shell/Shell'
import { lessons } from '@/lessons/registry'
import type { LessonMeta } from '@/lessons/types'
import './glossary.css'

interface Entry {
  term: string
  def: string
  lesson: LessonMeta
}

export default function Glossary() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all(lessons.map((l) => l.load().then((m) => m.default.terms.map((t) => ({ ...t, lesson: l })))))
      .then((all) => {
        if (!alive) return
        // de-duplicate by term (first lesson that teaches it wins)
        const seen = new Map<string, Entry>()
        for (const e of all.flat()) {
          const k = e.term.toLowerCase()
          if (!seen.has(k)) seen.set(k, e)
        }
        setEntries([...seen.values()].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })))
      })
      .catch(() => alive && setEntries([]))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!entries) return []
    const s = q.trim().toLowerCase()
    return s ? entries.filter((e) => e.term.toLowerCase().includes(s) || e.def.toLowerCase().includes(s)) : entries
  }, [entries, q])

  const byLetter = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const e of filtered) {
      const ch = /[a-z]/i.test(e.term[0]) ? e.term[0].toUpperCase() : '#'
      if (!m.has(ch)) m.set(ch, [])
      m.get(ch)!.push(e)
    }
    return [...m.entries()]
  }, [filtered])

  return (
    <div>
      <TopBar />
      <div className="gl-wrap">
        <header className="gl-head">
          <div className="eyebrow">Glossary</div>
          <h1 className="display">The words, in plain English.</h1>
          <p>Every key term from the course, with a link back to the lesson that teaches it.</p>
          <input className="gl-search" placeholder="Search terms…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search glossary" />
          {byLetter.length > 0 && (
            <nav className="gl-letters mono" aria-label="Jump to letter">
              {byLetter.map(([ch]) => (
                <a key={ch} href={`#gl-${ch}`}>
                  {ch}
                </a>
              ))}
            </nav>
          )}
        </header>
        {!entries && (
          <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        )}
        {byLetter.map(([ch, list]) => (
          <section key={ch} id={`gl-${ch}`} className="gl-section">
            <div className="gl-letter display">{ch}</div>
            <dl className="gl-list">
              {list.map((e) => (
                <div key={e.term} className="gl-item">
                  <dt>{e.term}</dt>
                  <dd>
                    {e.def}
                    <Link to={`/learn/${e.lesson.id}`} className="gl-link mono">
                      Lesson {e.lesson.num} · {e.lesson.short} →
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        {entries && filtered.length === 0 && <p className="muted">No terms match "{q}".</p>}
      </div>
    </div>
  )
}
