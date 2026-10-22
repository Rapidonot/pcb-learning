import type { ComponentType, ReactNode } from 'react'

export type ChapterId = 'foundations' | 'schematic' | 'layout' | 'fabrication'

export interface Chapter {
  id: ChapterId
  title: string
  blurb: string
}

/** Lightweight metadata — always loaded (used for menus, strip, course map). */
export interface LessonMeta {
  id: string // url slug, e.g. "what-is-a-pcb"
  num: number // 1-based order
  chapter: ChapterId
  title: string
  short: string // short label for the lesson strip, e.g. "Layers"
  blurb: string // one-sentence summary
  minutes: number
  load: () => Promise<{ default: LessonContent }>
}

/** A "mission": a small hands-on goal inside the scene that ticks off when achieved. */
export interface Mission {
  id: string
  text: ReactNode
}

/** One step of the "Build it in EasyEDA" panel. */
export interface BuildStep {
  title: ReactNode
  body?: ReactNode
  /** keyboard shortcuts shown as key caps, e.g. ["Alt+W"] */
  keys?: string[]
  /** menu path shown as breadcrumbs, e.g. ["Design", "Update PCB from Schematic"] */
  menu?: string[]
}

export interface QuizQuestion {
  q: ReactNode
  options: ReactNode[]
  answer: number
  explain: ReactNode
}

export interface Term {
  term: string
  def: string
}

/** Heavy content — lazy loaded per lesson. */
export interface LessonContent {
  /** The interactive stage. Fills its container (position: relative, width/height 100%). */
  Scene: ComponentType
  /** Hands-on goals the scene can tick off via useMission().complete(id). */
  missions: Mission[]
  /** One-line instruction shown above the scene. */
  goal: ReactNode
  /** The "Understand" article shown below the stage. */
  Article: ComponentType
  /** The "Build in EasyEDA" panel. */
  build: {
    intro?: ReactNode
    steps: BuildStep[]
    tip?: ReactNode
  }
  quiz: QuizQuestion[]
  terms: Term[]
}
