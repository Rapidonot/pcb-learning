import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { progress } from '@/lib/progress'
import { toast } from '@/lib/toast'

interface MissionCtx {
  lessonId: string
  missionText: (id: string) => ReactNode | undefined
}

const Ctx = createContext<MissionCtx | null>(null)

export function MissionProvider({
  lessonId,
  missions,
  children,
}: {
  lessonId: string
  missions: { id: string; text: ReactNode }[]
  children: ReactNode
}) {
  const value = useMemo<MissionCtx>(
    () => ({ lessonId, missionText: (id) => missions.find((m) => m.id === id)?.text }),
    [lessonId, missions],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * Inside a lesson Scene: `const mission = useMission(); mission.complete('explode')`.
 * Safe to call repeatedly — only the first call per mission does anything.
 */
export function useMission() {
  const ctx = useContext(Ctx)
  const complete = useCallback(
    (id: string) => {
      if (!ctx) return
      if (progress.completeMission(ctx.lessonId, id)) {
        const text = ctx.missionText(id)
        toast({ kind: 'mission', title: 'Mission complete', body: text })
      }
    },
    [ctx],
  )
  return { complete }
}
