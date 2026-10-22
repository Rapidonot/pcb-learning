import { useSyncExternalStore } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'learnpcb:theme'

const listeners = new Set<() => void>()
let pref: ThemePref = 'system'
try {
  pref = (localStorage.getItem(KEY) as ThemePref) || 'system'
} catch {
  /* ignore */
}

function apply() {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}
apply()

const mq = window.matchMedia('(prefers-color-scheme: dark)')
mq.addEventListener?.('change', () => listeners.forEach((l) => l()))

export function resolvedTheme(): 'light' | 'dark' {
  if (pref === 'system') return mq.matches ? 'dark' : 'light'
  return pref
}

export function toggleTheme() {
  pref = resolvedTheme() === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    /* ignore */
  }
  apply()
  listeners.forEach((l) => l())
}

export function useTheme() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    resolvedTheme,
    () => 'light' as const,
  )
}
