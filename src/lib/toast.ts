import { useSyncExternalStore, type ReactNode } from 'react'

export interface ToastItem {
  id: number
  kind: 'mission' | 'info' | 'success' | 'error'
  title: ReactNode
  body?: ReactNode
}

let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(t: Omit<ToastItem, 'id'>, ms = 3200) {
  const id = ++seq
  items = [...items, { ...t, id }].slice(-4)
  emit()
  window.setTimeout(() => {
    items = items.filter((x) => x.id !== id)
    emit()
  }, ms)
}

export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => items,
    () => items,
  )
}
