/* The capstone goals, computed live from the board. */
import type { BoardDoc, Connectivity } from '@/pcb/board'
import { overlappingPairs, partOnBoard } from './geometry'
import type { DrcState } from './types'

export type CheckId = 'placed' | 'overlap' | 'routed' | 'pour' | 'drc' | 'view3d'

export interface CheckItem {
  id: CheckId
  label: string
  done: boolean
  /** short live status, e.g. "7 / 9 on the board" */
  status: string
  progress?: number
}

export interface Coach {
  step: number
  title: string
  body: string
  action?: 'route' | 'pour' | 'drc' | '3d' | 'select'
}

export interface Checklist {
  items: CheckItem[]
  done: number
  allDone: boolean
  coach: Coach
  offBoard: string[]
  overlaps: [string, string][]
  /** connections still to route (airwires), split by GND / others */
  airwires: number
  airwiresNonGnd: number
  drcFresh: boolean
  drcCount: number | null
}

export function computeChecklist(doc: BoardDoc, conn: Connectivity, drc: DrcState | null, viewed3d: boolean): Checklist {
  const offBoard = doc.parts.filter((p) => !partOnBoard(p, doc)).map((p) => p.ref)
  const onBoard = doc.parts.length - offBoard.length
  const overlaps = overlappingPairs(doc)
  const nets = new Set(Object.values(doc.netlist))
  const complete = [...nets].filter((n) => conn.complete.has(n)).length
  const airwires = conn.ratsnest.length
  const airwiresNonGnd = conn.ratsnest.filter((r) => r.net !== 'GND').length
  const pour = doc.pours.find((p) => p.net === 'GND')
  const drcFresh = !!drc && drc.doc === doc
  const drcCount = drcFresh ? drc!.errors.length : null

  const placedOk = offBoard.length === 0
  const overlapOk = placedOk && overlaps.length === 0
  const routedOk = airwires === 0 && conn.shorts.length === 0
  const pourOk = !!pour
  const drcOk = drcFresh && drcCount === 0

  const items: CheckItem[] = [
    { id: 'placed', label: 'All 9 parts on the board', done: placedOk, status: `${onBoard} / ${doc.parts.length} on the board`, progress: onBoard / doc.parts.length },
    {
      id: 'overlap',
      label: 'No overlapping parts',
      done: overlapOk,
      status: !placedOk ? 'Checked once every part is on the board' : overlaps.length ? `${overlaps.map((o) => o.join('↔')).join(', ')} overlap` : 'Courtyards are clear',
    },
    {
      id: 'routed',
      label: 'Every net routed (no airwires)',
      done: routedOk,
      status: conn.shorts.length
        ? `Short circuit: ${conn.shorts[0].nets.join(' + ')}`
        : airwires
          ? `${complete} / ${nets.size} nets complete · ${airwires} airwire${airwires === 1 ? '' : 's'} left`
          : `${nets.size} / ${nets.size} nets complete`,
      progress: complete / nets.size,
    },
    { id: 'pour', label: 'A GND copper pour', done: pourOk, status: pour ? `GND pour on the ${pour.layer} layer` : 'Not added yet' },
    {
      id: 'drc',
      label: '0 DRC errors',
      done: drcOk,
      status: !drc ? 'Run Design › Check DRC' : !drcFresh ? 'Board changed: run DRC again' : drcCount === 0 ? 'Clean: no errors' : `${drcCount} error${drcCount === 1 ? '' : 's'} to fix`,
    },
    { id: 'view3d', label: 'Viewed the board in 3D', done: viewed3d, status: viewed3d ? 'Looking good' : 'Open the 3D view' },
  ]
  const done = items.filter((i) => i.done).length

  let coach: Coach
  if (!placedOk) {
    coach =
      onBoard === 0
        ? { step: 1, title: 'Drag the parts onto the board', body: 'Tip: start with U1 in the middle. It has the most connections, so everything else gathers around it.', action: 'select' }
        : {
            step: 1,
            title: `Place the rest: ${offBoard.join(', ')}`,
            body: 'Follow the airwires: put each part next to the pins it connects to. Space rotates the part you are dragging.',
            action: 'select',
          }
  } else if (!overlapOk) {
    coach = { step: 2, title: `${overlaps[0][0]} and ${overlaps[0][1]} overlap`, body: 'Their courtyards (the keep-out boxes) touch. Nudge them apart so the factory can solder both.', action: 'select' }
  } else if (conn.shorts.length) {
    coach = { step: 3, title: 'Short circuit', body: `Copper joins ${conn.shorts[0].nets.join(' and ')}. Select the offending track and press Delete, then re-route it.`, action: 'select' }
  } else if (airwiresNonGnd > 0) {
    coach = {
      step: 3,
      title: `Route the airwires: ${airwiresNonGnd} to go`,
      body: 'Press W, click a pad, click to add corners, then click the matching pad. Leave GND for the copper pour.',
      action: 'route',
    }
  } else if (!pourOk) {
    coach = { step: 4, title: 'Add a GND copper pour', body: 'Pick Copper region and drag across the whole board. GND pads inside it join up automatically.', action: 'pour' }
  } else if (airwires > 0) {
    coach = {
      step: 4,
      title: `${airwires} GND airwire${airwires === 1 ? '' : 's'} left`,
      body: 'A GND pad sits outside the pour or on the other layer. Pour the other side too, or route the last few by hand.',
      action: 'pour',
    }
  } else if (!drcOk) {
    coach = drcFresh
      ? { step: 5, title: `Fix ${drcCount} DRC error${drcCount === 1 ? '' : 's'}`, body: 'Open the DRC tab and click an error to zoom to it. Then run the check again.', action: 'drc' }
      : { step: 5, title: 'Run the design rule check', body: 'Design › Check DRC compares your copper with the factory rules: 0.2 mm clearance, 0.2 mm tracks, 0.3 mm from the edge.', action: 'drc' }
  } else if (!viewed3d) {
    coach = { step: 6, title: 'Admire it in 3D', body: 'Open the 3D view to see your board the way it will come back from the factory. The LED even blinks.', action: '3d' }
  } else {
    coach = { step: 7, title: 'Board complete', body: 'Every goal is ticked. This board is ready for Gerbers and an order.', action: undefined }
  }

  return { items, done, allDone: done === items.length, coach, offBoard, overlaps, airwires, airwiresNonGnd, drcFresh, drcCount }
}
