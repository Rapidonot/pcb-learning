import type { BoardDoc, Layer, Track, Via } from '@/pcb/board'
import type { Vec } from '@/pcb/geom'
import type { FinishColor, MaskColor } from '@/pcb/palette'

export type Tool = 'select' | 'route' | 'via' | 'pour' | 'measure' | 'highlight'
export type ViewMode = 'eda' | 'photo' | '3d'
/** EasyEDA's routing corner modes we support: 45° (straight then diagonal), 45° (diagonal first), 90° */
export type CornerMode = '45' | '45d' | '90'
export type PanelTab = 'checklist' | 'layers' | 'props' | 'drc'

export interface Sel {
  kind: 'part' | 'track' | 'via' | 'pour'
  id: string
}

export interface RouteState {
  net: string | undefined
  layer: Layer
  width: number
  /** the polyline currently being drawn (first point = start) */
  pts: Vec[]
  /** pieces already finished in this routing session (before a layer or width change) */
  done: Track[]
  /** vias dropped during this routing session */
  vias: Via[]
  /** what we started on, for messages: "U1.8" / "via" / "track" */
  from: string
}

export interface Snap {
  pt: Vec
  kind: 'pad' | 'via' | 'track' | 'grid'
  net?: string
  /** routing: would clicking here end the route on matching copper? */
  ok: boolean
  /** routing: why the target is refused */
  reason?: string
  label?: string
}

export interface Prefs {
  grid: number
  width: number
  units: 'mm' | 'mil'
  realtimeDrc: boolean
  netColors: boolean
  netLabels: boolean
  maskColor: MaskColor
  finish: FinishColor
  corner: CornerMode
}

export interface LayerToggles {
  top: boolean
  bottom: boolean
  silk: boolean
  outline: boolean
  ratsnest: boolean
  pours: boolean
  drc: boolean
}

export interface DrcState {
  errors: import('@/pcb/board').DrcError[]
  /** the doc the check ran on: if it differs from the current doc the result is stale */
  doc: BoardDoc
  manual: boolean
  at: number
}

export const WIDTHS = [0.25, 0.5, 1.0] as const
export const GRIDS = [0.1, 0.25, 0.5, 1.0] as const

export const defaultPrefs: Prefs = {
  grid: 0.5,
  width: 0.25,
  units: 'mm',
  realtimeDrc: false,
  netColors: true,
  netLabels: true,
  maskColor: 'green',
  finish: 'hasl',
  corner: '45',
}

export const defaultLayers: LayerToggles = {
  top: true,
  bottom: true,
  silk: true,
  outline: true,
  ratsnest: true,
  pours: true,
  drc: true,
}
