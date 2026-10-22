/* Editor document store: undo/redo history, transient (drag) edits and localStorage persistence. */
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { BoardDoc } from '@/pcb/board'
import { netlist, parts as projectParts, stages } from '@/pcb/project'
import type { Vec } from '@/pcb/geom'
import { defaultPrefs, type Prefs, type Snap } from './types'

export const STORAGE_KEY = 'learnpcb:sandbox:v1'
const MAX_HISTORY = 150

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

interface Hist {
  past: BoardDoc[]
  doc: BoardDoc
  future: BoardDoc[]
  mergeKey?: string
  mergeAt?: number
}

export interface DocStore {
  doc: BoardDoc
  canUndo: boolean
  canRedo: boolean
  /** apply an edit as one undoable step. `merge` coalesces quick repeated edits (sliders). */
  commit: (fn: (d: BoardDoc) => BoardDoc, opts?: { merge?: string }) => void
  /** transient update (dragging): no history entry until endLive() */
  live: (fn: (d: BoardDoc) => BoardDoc) => void
  endLive: () => void
  cancelLive: () => void
  undo: () => void
  redo: () => void
  /** latest doc without waiting for a re-render */
  get: () => BoardDoc
}

export function useDocStore(initial: () => BoardDoc): DocStore {
  const [h, setH] = useState<Hist>(() => ({ past: [], doc: initial(), future: [] }))
  const ref = useRef(h)
  ref.current = h
  const liveBase = useRef<BoardDoc | null>(null)

  const set = useCallback((next: Hist) => {
    ref.current = next
    setH(next)
  }, [])

  const commit = useCallback<DocStore['commit']>(
    (fn, opts) => {
      const cur = ref.current
      const next = fn(cur.doc)
      if (next === cur.doc) return
      const now = Date.now()
      if (opts?.merge && cur.mergeKey === opts.merge && now - (cur.mergeAt ?? 0) < 1500) {
        set({ ...cur, doc: next, future: [], mergeAt: now })
        return
      }
      set({ past: [...cur.past, cur.doc].slice(-MAX_HISTORY), doc: next, future: [], mergeKey: opts?.merge, mergeAt: now })
    },
    [set],
  )

  const live = useCallback<DocStore['live']>(
    (fn) => {
      const cur = ref.current
      if (!liveBase.current) liveBase.current = cur.doc
      const next = fn(cur.doc)
      if (next !== cur.doc) set({ ...cur, doc: next })
    },
    [set],
  )

  const endLive = useCallback(() => {
    const base = liveBase.current
    liveBase.current = null
    const cur = ref.current
    if (!base || base === cur.doc) return
    set({ past: [...cur.past, base].slice(-MAX_HISTORY), doc: cur.doc, future: [], mergeKey: undefined })
  }, [set])

  const cancelLive = useCallback(() => {
    const base = liveBase.current
    liveBase.current = null
    if (base) set({ ...ref.current, doc: base })
  }, [set])

  const undo = useCallback(() => {
    const cur = ref.current
    if (!cur.past.length) return
    const prev = cur.past[cur.past.length - 1]
    set({ past: cur.past.slice(0, -1), doc: prev, future: [cur.doc, ...cur.future], mergeKey: undefined })
  }, [set])

  const redo = useCallback(() => {
    const cur = ref.current
    if (!cur.future.length) return
    const [next, ...rest] = cur.future
    set({ past: [...cur.past, cur.doc], doc: next, future: rest, mergeKey: undefined })
  }, [set])

  const get = useCallback(() => ref.current.doc, [])

  return useMemo(
    () => ({ doc: h.doc, canUndo: h.past.length > 0, canRedo: h.future.length > 0, commit, live, endLive, cancelLive, undo, redo, get }),
    [h, commit, live, endLive, cancelLive, undo, redo, get],
  )
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export interface Saved {
  v: 1
  doc: BoardDoc
  viewed3d: boolean
  prefs: Prefs
  /** the last DRC on this exact board passed (re-checked on load, never trusted blindly) */
  drcClean?: boolean
}

const isNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n)
const isVec = (p: unknown) => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1])

/** Validate whatever is in storage; anything odd falls back to a fresh board. */
function sanitizeDoc(raw: unknown): BoardDoc | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<BoardDoc>
  if (!Array.isArray(d.parts) || !Array.isArray(d.tracks) || !Array.isArray(d.vias) || !Array.isArray(d.pours)) return null
  const fresh = stages.converted()
  const refs = new Set(projectParts.map((p) => p.ref))
  if (d.parts.length !== refs.size || !d.parts.every((p) => p && refs.has(p.ref) && isNum(p.x) && isNum(p.y) && isNum(p.rot))) return null
  const parts = fresh.parts.map((fp) => {
    const s = d.parts!.find((p) => p.ref === fp.ref)!
    return { ...fp, x: s.x, y: s.y, rot: ((Math.round(s.rot / 90) * 90) % 360 + 360) % 360, side: s.side === 'bottom' ? ('bottom' as const) : ('top' as const) }
  })
  const tracks = d.tracks.filter((t) => t && typeof t.id === 'string' && Array.isArray(t.pts) && t.pts.length >= 2 && t.pts.every(isVec) && isNum(t.width) && (t.layer === 'top' || t.layer === 'bottom'))
  const vias = d.vias.filter((v) => v && typeof v.id === 'string' && isNum(v.x) && isNum(v.y) && isNum(v.d) && isNum(v.drill))
  const pours = d.pours.filter((p) => p && typeof p.id === 'string' && Array.isArray(p.pts) && p.pts.length >= 3 && p.pts.every(isVec) && typeof p.net === 'string' && isNum(p.clearance) && (p.layer === 'top' || p.layer === 'bottom'))
  return { ...fresh, parts, tracks, vias, pours, texts: Array.isArray(d.texts) ? d.texts : [], netlist }
}

export function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Saved>
    if (parsed.v !== 1) return null
    const doc = sanitizeDoc(parsed.doc)
    if (!doc) return null
    return { v: 1, doc, viewed3d: !!parsed.viewed3d, prefs: { ...defaultPrefs, ...(parsed.prefs ?? {}) }, drcClean: !!parsed.drcClean }
  } catch {
    return null
  }
}

export function writeSaved(s: Saved) {
  try {
    // netlist is fixed by the project: no need to store it
    const { netlist: _n, ...doc } = s.doc
    void _n
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, doc }))
    return true
  } catch {
    return false
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ */
/* Cursor store: pointer position + snap, kept outside React state so  */
/* moving the mouse only re-renders the overlay and the status bar.    */
/* ------------------------------------------------------------------ */

export interface HoverInfo {
  kind: 'pad' | 'via' | 'track' | 'part' | 'pour'
  label: string
  net?: string
  id: string
}

export interface CursorState {
  world: Vec | null
  snap: Snap | null
  hover: HoverInfo | null
}

export function createCursorStore() {
  let state: CursorState = { world: null, snap: null, hover: null }
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(patch: Partial<CursorState>) {
      state = { ...state, ...patch }
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }
}
export type CursorStore = ReturnType<typeof createCursorStore>

export function useCursor(store: CursorStore) {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
