import { useSyncExternalStore } from 'react'

/**
 * Progress lives only in this browser (localStorage). No accounts, no tracking,
 * no network calls — the learner's data never leaves their device.
 */

const KEY = 'learnpcb:progress:v1'

export interface Progress {
  /** lessonId -> ISO date completed */
  completed: Record<string, string>
  /** lessonId -> mission ids achieved */
  missions: Record<string, string[]>
  /** lessonId -> best quiz score (0..1) */
  quiz: Record<string, number>
  lastLesson?: string
}

const empty: Progress = { completed: {}, missions: {}, quiz: {} }

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<Progress>
    return {
      completed: parsed.completed ?? {},
      missions: parsed.missions ?? {},
      quiz: parsed.quiz ?? {},
      lastLesson: parsed.lastLesson,
    }
  } catch {
    return empty
  }
}

let state: Progress = typeof window === 'undefined' ? empty : read()
const listeners = new Set<() => void>()

function write(next: Progress) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable (private mode) — progress just won't persist */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => state, () => empty)
}

export const progress = {
  get: () => state,
  completeMission(lessonId: string, missionId: string) {
    const list = state.missions[lessonId] ?? []
    if (list.includes(missionId)) return false
    write({ ...state, missions: { ...state.missions, [lessonId]: [...list, missionId] } })
    return true
  },
  setQuiz(lessonId: string, score: number) {
    const best = Math.max(score, state.quiz[lessonId] ?? 0)
    write({ ...state, quiz: { ...state.quiz, [lessonId]: best } })
  },
  completeLesson(lessonId: string) {
    if (state.completed[lessonId]) return
    write({ ...state, completed: { ...state.completed, [lessonId]: new Date().toISOString() } })
  },
  uncompleteLesson(lessonId: string) {
    const { [lessonId]: _drop, ...rest } = state.completed
    void _drop
    write({ ...state, completed: rest })
  },
  visit(lessonId: string) {
    if (state.lastLesson === lessonId) return
    write({ ...state, lastLesson: lessonId })
  },
  reset() {
    write(empty)
  },
}
