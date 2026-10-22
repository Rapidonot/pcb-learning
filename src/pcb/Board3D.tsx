import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BoardView } from './render'
import { getFootprint, type FootprintDef } from './footprints'
import type { BoardDoc, PartInst } from './board'
import { MASKS, REAL, type FinishColor, type MaskColor } from './palette'
import { useSvgTexture as useBoardTexture } from './svgTexture'

const THICK = 1.6
const PX_PER_MM = 48

/* ------------------------------------------------------------------ */
/* Texture from the photo-real SVG render                              */
/* ------------------------------------------------------------------ */

export function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x0 = -w / 2
  const y0 = -h / 2
  s.moveTo(x0 + r, y0)
  s.lineTo(x0 + w - r, y0)
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r)
  s.lineTo(x0 + w, y0 + h - r)
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h)
  s.lineTo(x0 + r, y0 + h)
  s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r)
  s.lineTo(x0, y0 + r)
  s.quadraticCurveTo(x0, y0, x0 + r, y0)
  return s
}

/* ------------------------------------------------------------------ */
/* Board mesh                                                          */
/* ------------------------------------------------------------------ */

function BoardMesh({ doc, top, bottom, maskColor, explode = 0 }: { doc: BoardDoc; top: THREE.Texture | null; bottom: THREE.Texture | null; maskColor: MaskColor; explode?: number }) {
  const shape = useMemo(() => roundedRectShape(doc.w, doc.h, doc.corner), [doc.w, doc.h, doc.corner])
  const body = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false, curveSegments: 12 })
    g.rotateX(-Math.PI / 2)
    return g
  }, [shape])
  const face = useMemo(() => {
    const g = new THREE.ShapeGeometry(shape, 12)
    return g
  }, [shape])
  const configure = (t: THREE.Texture | null, flipX = false) => {
    if (!t) return null
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    t.repeat.set((flipX ? -1 : 1) / doc.w, (flipX ? -1 : 1) / doc.h)
    t.offset.set(0.5, 0.5)
    t.needsUpdate = true
    return t
  }
  const topTex = useMemo(() => configure(top), [top, doc.w, doc.h]) // eslint-disable-line react-hooks/exhaustive-deps
  const botTex = useMemo(() => configure(bottom, true), [bottom, doc.w, doc.h]) // eslint-disable-line react-hooks/exhaustive-deps
  const m = MASKS[maskColor]
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color={REAL.fr4Dark} roughness={0.8} />
      </mesh>
      {/* top face */}
      <mesh geometry={face} rotation={[-Math.PI / 2, 0, 0]} position={[0, THICK + 0.005 + explode, 0]} receiveShadow>
        {topTex ? <meshStandardMaterial map={topTex} roughness={0.45} metalness={0.05} /> : <meshStandardMaterial color={m.mask} />}
      </mesh>
      {/* bottom face */}
      <mesh geometry={face} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.005 - explode, 0]}>
        {botTex ? <meshStandardMaterial map={botTex} roughness={0.45} /> : <meshStandardMaterial color={m.mask} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

const metal = { color: '#cfd3d8', metalness: 0.85, roughness: 0.3 }
const gold = { color: '#e0b24a', metalness: 0.9, roughness: 0.25 }
const plastic = { color: '#1d1d20', roughness: 0.55, metalness: 0.05 }

function ChipBody({ fp, isCap }: { fp: FootprintDef; isCap: boolean }) {
  const { w, h, height } = fp.body
  const end = Math.min(w * 0.22, 0.6)
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[w - end * 2 + 0.02, height, h]} />
        <meshStandardMaterial color={isCap ? '#b89a6a' : '#1c1c1e'} roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - end / 2), height / 2, 0]} castShadow>
          <boxGeometry args={[end, height + 0.02, h + 0.02]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  )
}

function LedChip({ fp, on }: { fp: FootprintDef; on: boolean }) {
  const { w, h, height } = fp.body
  return (
    <group>
      <mesh position={[0, height * 0.35, 0]} castShadow>
        <boxGeometry args={[w, height * 0.7, h]} />
        <meshStandardMaterial color="#f2efe6" roughness={0.5} />
      </mesh>
      <mesh position={[0, height * 0.82, 0]}>
        <boxGeometry args={[w - 0.6, height * 0.3, h - 0.25]} />
        <meshStandardMaterial
          color="#ff5a46"
          emissive="#ff2a10"
          emissiveIntensity={on ? 3.5 : 0.05}
          transparent
          opacity={0.92}
          roughness={0.2}
        />
      </mesh>
      {on && <pointLight position={[0, 1.5, 0]} color="#ff3a20" intensity={4} distance={10} decay={2} />}
      <mesh position={[-w / 2 + 0.15, height * 0.35, 0]}>
        <boxGeometry args={[0.3, height * 0.72, h + 0.01]} />
        <meshStandardMaterial color="#3fae6a" />
      </mesh>
    </group>
  )
}

function Soic({ fp }: { fp: FootprintDef }) {
  const { w, h, height } = fp.body
  return (
    <group>
      <mesh position={[0, 0.15 + (height - 0.15) / 2, 0]} castShadow>
        <boxGeometry args={[w, height - 0.15, h]} />
        <meshStandardMaterial {...plastic} />
      </mesh>
      <mesh position={[-w / 2 + 0.6, height + 0.001, -h / 2 + 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 20]} />
        <meshStandardMaterial color="#38383c" />
      </mesh>
      {fp.pads.map((p) => {
        const s = Math.sign(p.x)
        const reach = Math.abs(p.x) - w / 2
        return (
          <group key={p.num} position={[s * (w / 2 + reach / 2), 0, p.y]}>
            <mesh position={[s * (reach / 2 - 0.25), 0.08, 0]} castShadow>
              <boxGeometry args={[0.6, 0.15, 0.4]} />
              <meshStandardMaterial {...metal} />
            </mesh>
            <mesh position={[-s * 0.15, 0.45, 0]} rotation={[0, 0, s * 0.9]}>
              <boxGeometry args={[0.15, 0.85, 0.4]} />
              <meshStandardMaterial {...metal} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Dip({ fp }: { fp: FootprintDef }) {
  const { w, h, height } = fp.body
  return (
    <group>
      <mesh position={[0, 0.5 + height / 2, 0]} castShadow>
        <boxGeometry args={[w, height, h]} />
        <meshStandardMaterial {...plastic} />
      </mesh>
      {fp.pads.map((p) => (
        <mesh key={p.num} position={[p.x * 0.92, 0.6, p.y]}>
          <boxGeometry args={[0.5, 2.6, 0.3]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  )
}

function Header({ fp }: { fp: FootprintDef }) {
  const { w, h, height } = fp.body
  return (
    <group>
      <RoundedBox args={[w, height, h]} radius={0.15} position={[0, height / 2, 0]} castShadow>
        <meshStandardMaterial {...plastic} />
      </RoundedBox>
      {fp.pads.map((p) => (
        <mesh key={p.num} position={[p.x, 2.2, p.y]} castShadow>
          <boxGeometry args={[0.64, 9, 0.64]} />
          <meshStandardMaterial {...gold} />
        </mesh>
      ))}
    </group>
  )
}

function Led5mm({ fp, on }: { fp: FootprintDef; on: boolean }) {
  const r = fp.body.w / 2 - 0.4
  return (
    <group>
      <mesh position={[0, 1 + 0.5, 0]}>
        <cylinderGeometry args={[r + 0.4, r + 0.4, 1, 32]} />
        <meshStandardMaterial color="#ff4a3a" emissive="#ff2010" emissiveIntensity={on ? 2 : 0.05} transparent opacity={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0, 2 + 2.5, 0]}>
        <cylinderGeometry args={[r, r, 5, 32]} />
        <meshStandardMaterial color="#ff4a3a" emissive="#ff2010" emissiveIntensity={on ? 2 : 0.05} transparent opacity={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0, 7, 0]}>
        <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ff4a3a" emissive="#ff2010" emissiveIntensity={on ? 2 : 0.05} transparent opacity={0.85} roughness={0.15} />
      </mesh>
      {on && <pointLight position={[0, 6, 0]} color="#ff3a20" intensity={8} distance={18} decay={2} />}
      {fp.pads.map((p) => (
        <mesh key={p.num} position={[p.x, 0.5, p.y]}>
          <boxGeometry args={[0.5, 1.6, 0.5]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  )
}

function Axial({ fp }: { fp: FootprintDef }) {
  const { w, h } = fp.body
  return (
    <group>
      <mesh position={[0, h / 2 + 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[h / 2, w - h, 8, 16]} />
        <meshStandardMaterial color={fp.body.color ?? '#d9c08a'} roughness={0.6} />
      </mesh>
      {fp.pads.map((p) => (
        <mesh key={p.num} position={[p.x, h / 2, 0]}>
          <boxGeometry args={[0.5, h + 0.6, 0.5]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  )
}

function Sot23({ fp }: { fp: FootprintDef }) {
  const { w, h, height } = fp.body
  return (
    <group>
      <mesh position={[0, 0.1 + height / 2, 0]} castShadow>
        <boxGeometry args={[w, height, h]} />
        <meshStandardMaterial {...plastic} />
      </mesh>
      {fp.pads.map((p) => (
        <mesh key={p.num} position={[p.x, 0.1, p.y * 0.85]}>
          <boxGeometry args={[0.4, 0.15, 0.7]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  )
}

export function Part3D({ part, ledOn }: { part: PartInst; ledOn: boolean }) {
  const fp = getFootprint(part.fp)
  const k = fp.body.kind
  const isCap = fp.body.color !== undefined
  let el: React.ReactNode
  switch (k) {
    case 'chip':
      el = <ChipBody fp={fp} isCap={isCap} />
      break
    case 'led-chip':
      el = <LedChip fp={fp} on={ledOn} />
      break
    case 'soic':
      el = <Soic fp={fp} />
      break
    case 'dip':
      el = <Dip fp={fp} />
      break
    case 'header':
      el = <Header fp={fp} />
      break
    case 'led-5mm':
      el = <Led5mm fp={fp} on={ledOn} />
      break
    case 'axial':
      el = <Axial fp={fp} />
      break
    case 'sot23':
      el = <Sot23 fp={fp} />
      break
    default:
      el = null
  }
  return el
}

function Parts({ doc, w, h, lift, blink }: { doc: BoardDoc; w: number; h: number; lift: number; blink: boolean }) {
  const [on, setOn] = useState(true)
  const acc = useRef(0)
  useFrame((_, dt) => {
    if (!blink) return
    acc.current += dt
    // ~1.5 Hz, 50% duty — same as the real Blinky circuit
    const next = acc.current % 0.66 < 0.33
    if (next !== on) setOn(next)
  })
  return (
    <group>
      {doc.parts.map((p) => {
        const bottom = p.side === 'bottom'
        return (
          <group
            key={p.ref}
            position={[p.x - w / 2, bottom ? -lift : THICK + lift, p.y - h / 2]}
            rotation={[bottom ? Math.PI : 0, (-p.rot * Math.PI) / 180, 0]}
          >
            <Part3D part={p} ledOn={!blink || on} />
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export interface Board3DProps {
  doc: BoardDoc
  maskColor?: MaskColor
  finish?: FinishColor
  showParts?: boolean
  /** lift parts off the board (exploded view), mm */
  explode?: number
  autoRotate?: boolean
  blink?: boolean
  /** initial camera direction */
  view?: 'iso' | 'top' | 'bottom'
  style?: React.CSSProperties
}

export function Board3D({ doc, maskColor = 'green', finish = 'hasl', showParts = true, explode = 0, autoRotate = false, blink = true, view = 'iso', style }: Board3DProps) {
  const [topSvg, setTopSvg] = useState<SVGSVGElement | null>(null)
  const [botSvg, setBotSvg] = useState<SVGSVGElement | null>(null)
  const key = useMemo(() => JSON.stringify([doc.parts, doc.tracks, doc.vias, doc.pours, doc.texts, maskColor, finish]), [doc, maskColor, finish])
  const topTex = useBoardTexture(topSvg, key)
  const botTex = useBoardTexture(botSvg, key)
  const span = Math.max(doc.w, doc.h)
  const cam: [number, number, number] =
    view === 'top' ? [0, span * 2.2, 0.01] : view === 'bottom' ? [0, -span * 2.2, 0.01] : [span * 0.8, span * 1.25, span * 1.45]
  const pxW = Math.round(doc.w * PX_PER_MM)
  const pxH = Math.round(doc.h * PX_PER_MM)
  const hidden: React.CSSProperties = { position: 'absolute', left: -100000, top: 0, width: pxW, height: pxH * 2, pointerEvents: 'none', overflow: 'hidden' }
  const vis = { ratsnest: false, bodies: false }
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <div style={hidden} aria-hidden>
        <svg ref={setTopSvg} xmlns="http://www.w3.org/2000/svg" width={pxW} height={pxH} viewBox={`0 0 ${doc.w} ${doc.h}`}>
          <BoardView doc={doc} mode="real" side="top" maskColor={maskColor} finish={finish} vis={vis} />
        </svg>
        <svg ref={setBotSvg} xmlns="http://www.w3.org/2000/svg" width={pxW} height={pxH} viewBox={`0 0 ${doc.w} ${doc.h}`}>
          <BoardView doc={doc} mode="real" side="bottom" maskColor={maskColor} finish={finish} vis={vis} />
        </svg>
      </div>
      <Canvas shadows dpr={[1, 2]} camera={{ position: cam, fov: 35, near: 0.5, far: 1000 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#fff6e8', '#3a3326', 0.6]} />
        <directionalLight position={[span, span * 2, span * 0.8]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-span, span, -span]} intensity={0.35} />
        <Suspense fallback={null}>
          <group>
            <BoardMesh doc={doc} top={topTex} bottom={botTex} maskColor={maskColor} />
            {showParts && <Parts doc={doc} w={doc.w} h={doc.h} lift={explode} blink={blink} />}
          </group>
          <ContactShadows position={[0, -0.8, 0]} opacity={0.35} scale={span * 3} blur={2.4} far={10} />
        </Suspense>
        <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={0.8} enableDamping minDistance={span * 0.5} maxDistance={span * 4} />
      </Canvas>
    </div>
  )
}
