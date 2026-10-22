/*
 * One small still life per lesson. All scenes are shot by the same <Stage> (camera, lights, floor),
 * so they only describe objects. Units are millimetres; the stage frames each scene automatically.
 */
import type { ComponentType } from 'react'
import { useMemo } from 'react'
import { getFootprint } from '@/pcb/footprints'
import { DipIC } from '@/pcb/parts3d'
import { stages } from '@/pcb/project'
import type { StageProps } from './Stage'
import { DocBoard } from './board'
import { CeramicDisc, Electrolytic, Glow, LooseLed, LooseResistor } from './props'

export interface SceneDef {
  Scene: ComponentType
  stage?: Omit<StageProps, 'children'>
}

/* ------------------------------------------------------------------ */

function Sandbox() {
  const doc = useMemo(() => stages.finished(), [])
  const d1 = doc.parts.find((p) => p.ref === 'D1')!
  return (
    <group rotation={[0, -0.32, 0]}>
      <DocBoard doc={doc} id="sandbox" />
      <Glow size={16} position={[d1.x - doc.w / 2, 2.6, d1.y - doc.h / 2]} opacity={0.85} />
      <pointLight position={[d1.x - doc.w / 2, 4, d1.y - doc.h / 2]} color="#ff3a1a" intensity={30} distance={14} decay={2} />
    </group>
  )
}

function Components() {
  const dip = getFootprint('DIP-8')
  return (
    <group>
      {/* DIP-8: its pins reach 1.95 mm below its origin */}
      <group position={[-1, 1.95, -2]} rotation={[0, 0.25, 0]}>
        <DipIC fp={dip} value="NE555" />
      </group>
      <group position={[-11, 0, 6]} rotation={[0, 0.45, 0]}>
        <LooseResistor bands={[4, 7, 2]} />
      </group>
      <group position={[10, 0, -6]}>
        <Electrolytic />
      </group>
      <group position={[12, 0, 5]} rotation={[0, -0.3, 0]}>
        <CeramicDisc />
      </group>
      <group position={[-12, 0, -8]} rotation={[0, 0.5, 0]}>
        <LooseLed legs={4} />
      </group>
    </group>
  )
}

export const scenes: Record<string, SceneDef> = {
  components: { Scene: Components },
  sandbox: { Scene: Sandbox },
}
