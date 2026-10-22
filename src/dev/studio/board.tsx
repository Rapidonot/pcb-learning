/*
 * Board building blocks for thumbnails: a bevelled slab with physically based top maps, a board
 * rendered from a real BoardDoc (same artwork as the 3D viewer), and simple copper geometry.
 */
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { roundedRectShape, Part3D } from '@/pcb/Board3D'
import { BoardView } from '@/pcb/render'
import { BumpArt, OrmArt } from '@/pcb/boardMaps'
import { analyze, type BoardDoc } from '@/pcb/board'
import { MASKS, type FinishColor, type MaskColor } from '@/pcb/palette'
import { useSvgTex } from './textures'

export const THICK = 1.6

/** ShapeGeometry with UVs spanning the w×h rectangle (texture top row = −z / "back"). */
export function faceGeometry(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 24)
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5)
  uv.needsUpdate = true
  return g
}

export interface TopMaps {
  color?: THREE.Texture | null
  bump?: THREE.Texture | null
  orm?: THREE.Texture | null
}

/**
 * A board slab centred on the origin, bottom face at y = 0 (top at `thick`).
 * The top face carries colour / bump / ORM maps; without maps it's plain glossy solder mask.
 */
export function Slab({
  w,
  h,
  corner = 1,
  thick = THICK,
  mask = 'green',
  maps = {},
  bumpScale = 2.2,
  edge,
  topColor,
  clearcoat = 0.45,
}: {
  w: number
  h: number
  corner?: number
  thick?: number
  mask?: MaskColor
  maps?: TopMaps
  bumpScale?: number
  edge?: string
  topColor?: string
  clearcoat?: number
}) {
  const bevel = Math.min(0.14, thick * 0.12)
  const body = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedRectShape(w - bevel * 2, h - bevel * 2, Math.max(0.05, corner - bevel)), {
      depth: thick - bevel * 2,
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 3,
      curveSegments: 20,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, bevel, 0)
    return g
  }, [w, h, corner, thick, bevel])
  const face = useMemo(() => faceGeometry(w - 0.03, h - 0.03, Math.max(0.05, corner - 0.02)), [w, h, corner])
  const m = MASKS[mask]
  const edgeColor = edge ?? new THREE.Color(m.mask).lerp(new THREE.Color('#c4b07a'), 0.55).getStyle()
  const { color, bump, orm } = maps
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color={edgeColor} roughness={0.62} />
      </mesh>
      <mesh geometry={face} rotation={[-Math.PI / 2, 0, 0]} position={[0, thick + 0.004, 0]} receiveShadow>
        <meshPhysicalMaterial
          key={`${!!color}-${!!bump}-${!!orm}`}
          map={color ?? undefined}
          color={color ? '#ffffff' : (topColor ?? m.mask)}
          bumpMap={bump ?? undefined}
          bumpScale={bumpScale}
          roughnessMap={orm ?? undefined}
          metalnessMap={orm ?? undefined}
          roughness={orm ? 1 : 0.38}
          metalness={orm ? 1 : 0}
          clearcoat={clearcoat}
          clearcoatRoughness={0.22}
        />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* A real board document rendered with the site's own artwork          */
/* ------------------------------------------------------------------ */

export function useDocMaps(doc: BoardDoc, key: string, opts: { mask?: MaskColor; finish?: FinishColor; ppm?: number; overlay?: ReactNode; silk?: boolean } = {}) {
  const { mask = 'green', finish = 'hasl', ppm = 48, overlay, silk = true } = opts
  const conn = useMemo(() => analyze(doc), [doc])
  const vb = `0 0 ${doc.w} ${doc.h}`
  const W = Math.round(doc.w * ppm)
  const H = Math.round(doc.h * ppm)
  const vis = { ratsnest: false, bodies: false, sheen: false, silk, refs: silk }
  const color = useSvgTex(`${key}:c`, { w: W, h: H, viewBox: vb }, () => (
    <>
      <BoardView doc={doc} conn={conn} mode="real" side="top" maskColor={mask} finish={finish} vis={vis} />
      {overlay}
    </>
  ))
  const bump = useSvgTex(`${key}:b`, { w: Math.round(W * 0.6), h: Math.round(H * 0.6), viewBox: vb, linear: true }, () => (
    <BumpArt doc={silk ? doc : { ...doc, parts: doc.parts, texts: [] }} conn={conn} side="top" />
  ))
  const orm = useSvgTex(`${key}:o`, { w: Math.round(W * 0.6), h: Math.round(H * 0.6), viewBox: vb, linear: true }, () => <OrmArt doc={doc} conn={conn} side="top" />)
  return { color, bump, orm }
}

/** Board from a BoardDoc, centred on the origin, bottom at y = 0. */
export function DocBoard({
  doc,
  id,
  mask = 'green',
  finish = 'hasl',
  parts = true,
  skip = [],
  lift = {},
  ledOn = true,
  overlay,
  ppm,
  silk = true,
}: {
  doc: BoardDoc
  id: string
  mask?: MaskColor
  finish?: FinishColor
  parts?: boolean
  /** refs not to draw as 3D bodies */
  skip?: string[]
  /** per-ref hover height (mm) */
  lift?: Record<string, number>
  ledOn?: boolean
  overlay?: ReactNode
  ppm?: number
  silk?: boolean
}) {
  const maps = useDocMaps(doc, id, { mask, finish, overlay, ppm, silk })
  const ready = maps.color && maps.bump && maps.orm
  return (
    <group>
      <Slab w={doc.w} h={doc.h} corner={doc.corner} mask={mask} maps={ready ? maps : {}} />
      {parts &&
        doc.parts
          .filter((p) => !skip.includes(p.ref))
          .map((p) => (
            <group key={p.ref} position={[p.x - doc.w / 2, THICK + (lift[p.ref] ?? 0), p.y - doc.h / 2]} rotation={[0, (-p.rot * Math.PI) / 180, 0]}>
              <Part3D part={p} ledOn={ledOn} />
            </group>
          ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Copper as real geometry (for close-ups)                             */
/* ------------------------------------------------------------------ */

export type P2 = [number, number]

/** A flat trace with round joins/ends, as one merged geometry lying on y = 0 (thickness up). */
export function traceGeometry(pts: P2[], width: number, thick: number) {
  // segment boxes + joint discs, merged into one BufferGeometry
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const len = Math.hypot(bx - ax, by - ay)
    const g = new THREE.BoxGeometry(len, thick, width)
    g.rotateY(-Math.atan2(by - ay, bx - ax))
    g.translate((ax + bx) / 2, thick / 2, (ay + by) / 2)
    parts.push(g)
  }
  for (const [x, y] of pts) {
    const c = new THREE.CylinderGeometry(width / 2, width / 2, thick, 28)
    c.translate(x, thick / 2, y)
    parts.push(c)
  }
  return mergeGeometries(parts)
}

export function mergeGeometries(geos: THREE.BufferGeometry[]) {
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g))
  let count = 0
  for (const g of nonIndexed) count += g.getAttribute('position').count
  const pos = new Float32Array(count * 3)
  const nor = new Float32Array(count * 3)
  const uv = new Float32Array(count * 2)
  let o = 0
  for (const g of nonIndexed) {
    const p = g.getAttribute('position')
    const n = g.getAttribute('normal')
    const u = g.getAttribute('uv')
    pos.set(p.array as Float32Array, o * 3)
    if (n) nor.set(n.array as Float32Array, o * 3)
    if (u) uv.set(u.array as Float32Array, o * 2)
    o += p.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return out
}

/** Annular ring (THT pad / via land) lying flat, hole through the middle. */
export function ringGeometry(rOuter: number, rInner: number, thick: number) {
  const s = new THREE.Shape()
  s.absarc(0, 0, rOuter, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true)
  s.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelSize: Math.min(0.03, thick * 0.3), bevelThickness: Math.min(0.03, thick * 0.3), bevelSegments: 2, curveSegments: 40 })
  g.rotateX(-Math.PI / 2)
  return g
}

/** Rounded-rect pad (SMD) lying flat. */
export function padGeometry(w: number, h: number, r: number, thick: number) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w, h, Math.min(r, w / 2 - 0.01, h / 2 - 0.01)), {
    depth: thick,
    bevelEnabled: true,
    bevelSize: Math.min(0.03, thick * 0.3),
    bevelThickness: Math.min(0.03, thick * 0.3),
    bevelSegments: 2,
    curveSegments: 10,
  })
  g.rotateX(-Math.PI / 2)
  return g
}
