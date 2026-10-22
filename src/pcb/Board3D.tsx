import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, AccumulativeShadows, RandomizedLight, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, SMAA } from '@react-three/postprocessing'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { BoardView } from './render'
import { BumpArt, OrmArt } from './boardMaps'
import { getFootprint } from './footprints'
import { analyze, type BoardDoc, type PartInst } from './board'
import { MASKS, type FinishColor, type MaskColor } from './palette'
import { useSvgTexture } from './svgTexture'
import { Axial, ChipPart, DipIC, GullIC, Header, Led5mm, LedChip, Sot23 } from './parts3d'

const THICK = 1.6
const EDGE_BEVEL = 0.12

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
/* Studio lighting: a procedural room environment (no network fetch)   */
/* ------------------------------------------------------------------ */

function StudioEnvironment({ intensity = 0.9 }: { intensity?: number }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.035).texture
    scene.environment = env
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene, intensity])
  return null
}

/* ------------------------------------------------------------------ */
/* Board mesh with physically based surface maps                       */
/* ------------------------------------------------------------------ */

interface SideMaps {
  color: THREE.Texture | null
  bump: THREE.Texture | null
  orm: THREE.Texture | null
}

function useConfigured(t: THREE.Texture | null, w: number, h: number, flip: boolean) {
  return useMemo(() => {
    if (!t) return null
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    t.repeat.set((flip ? -1 : 1) / w, (flip ? -1 : 1) / h)
    t.offset.set(0.5, 0.5)
    t.needsUpdate = true
    return t
  }, [t, w, h, flip])
}

function BoardFace({ doc, maps, bottom, maskColor }: { doc: BoardDoc; maps: SideMaps; bottom: boolean; maskColor: MaskColor }) {
  const geo = useMemo(() => new THREE.ShapeGeometry(roundedRectShape(doc.w - 0.02, doc.h - 0.02, doc.corner), 16), [doc.w, doc.h, doc.corner])
  const color = useConfigured(maps.color, doc.w, doc.h, bottom)
  const bump = useConfigured(maps.bump, doc.w, doc.h, bottom)
  const orm = useConfigured(maps.orm, doc.w, doc.h, bottom)
  const m = MASKS[maskColor]
  return (
    <mesh geometry={geo} rotation={[bottom ? Math.PI / 2 : -Math.PI / 2, 0, 0]} position={[0, bottom ? -0.004 : THICK + 0.004, 0]} receiveShadow>
      <meshPhysicalMaterial
        key={`${!!color}-${!!bump}-${!!orm}`}
        map={color ?? undefined}
        color={color ? '#ffffff' : m.mask}
        bumpMap={bump ?? undefined}
        bumpScale={2.2}
        roughnessMap={orm ?? undefined}
        metalnessMap={orm ?? undefined}
        roughness={orm ? 1 : 0.45}
        metalness={orm ? 1 : 0}
        clearcoat={0.4}
        clearcoatRoughness={0.25}
      />
    </mesh>
  )
}

function BoardMesh({ doc, top, bottom, maskColor }: { doc: BoardDoc; top: SideMaps; bottom: SideMaps; maskColor: MaskColor }) {
  const body = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedRectShape(doc.w - EDGE_BEVEL * 2, doc.h - EDGE_BEVEL * 2, Math.max(0.05, doc.corner - EDGE_BEVEL)), {
      depth: THICK - EDGE_BEVEL * 2,
      bevelEnabled: true,
      bevelSize: EDGE_BEVEL,
      bevelThickness: EDGE_BEVEL,
      bevelSegments: 3,
      curveSegments: 16,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, EDGE_BEVEL, 0)
    return g
  }, [doc.w, doc.h, doc.corner])
  const m = MASKS[maskColor]
  // the edge shows the FR-4 core tinted by the mask on both faces
  const edgeColor = useMemo(() => new THREE.Color(m.mask).lerp(new THREE.Color('#ddd3a8'), 0.55).getStyle(), [m.mask])
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color={edgeColor} roughness={0.7} />
      </mesh>
      <BoardFace doc={doc} maps={top} bottom={false} maskColor={maskColor} />
      <BoardFace doc={doc} maps={bottom} bottom maskColor={maskColor} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

export function Part3D({ part, ledOn }: { part: PartInst; ledOn: boolean }) {
  const fp = getFootprint(part.fp)
  switch (fp.body.kind) {
    case 'chip':
      return <ChipPart fp={fp} value={part.value} isCap={fp.body.color !== undefined} />
    case 'led-chip':
      return <LedChip fp={fp} on={ledOn} />
    case 'soic':
      return <GullIC fp={fp} value={part.value} />
    case 'dip':
      return <DipIC fp={fp} value={part.value} />
    case 'header':
      return <Header fp={fp} />
    case 'led-5mm':
      return <Led5mm fp={fp} on={ledOn} />
    case 'axial':
      return <Axial fp={fp} value={part.value} />
    case 'sot23':
      return <Sot23 fp={fp} />
    default:
      return null
  }
}

function Parts({ doc, lift, blink }: { doc: BoardDoc; lift: number; blink: boolean }) {
  const [on, setOn] = useState(true)
  const acc = useRef(0)
  useFrame((_, dt) => {
    if (!blink) return
    acc.current += dt
    // ~1.5 Hz, 50 % duty — the same rate as the real Blinky circuit
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
            position={[p.x - doc.w / 2, bottom ? -lift : THICK + lift, p.y - doc.h / 2]}
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
/* Camera helpers                                                      */
/* ------------------------------------------------------------------ */

function FitOrtho({ span, dir }: { span: number; dir: [number, number, number] }) {
  const { size } = useThree()
  const zoom = Math.min(size.width, size.height) / (span * 1.22)
  const d = span * 3
  const len = Math.hypot(...dir)
  return (
    <OrthographicCamera makeDefault zoom={zoom} near={-500} far={1000} position={[(dir[0] / len) * d, (dir[1] / len) * d, (dir[2] / len) * d]} />
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
  /** 'ortho' gives the flat isometric "illustration" look */
  camera?: 'persp' | 'ortho'
  /** 'high' adds ambient occlusion and bloom; automatically lowered on small screens */
  quality?: 'high' | 'low'
  /** soft shadow on an invisible ground plane */
  shadow?: boolean
  style?: React.CSSProperties
}

function isLowPower() {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number }
  return window.innerWidth < 700 || (nav.deviceMemory !== undefined && nav.deviceMemory < 4)
}

export function Board3D({
  doc,
  maskColor = 'green',
  finish = 'hasl',
  showParts = true,
  explode = 0,
  autoRotate = false,
  blink = true,
  view = 'iso',
  camera = 'persp',
  quality = 'high',
  shadow = true,
  style,
}: Board3DProps) {
  const [svgs, setSvgs] = useState<Record<string, SVGSVGElement | null>>({})
  const reg = (k: string) => (el: SVGSVGElement | null) => {
    if (el) setSvgs((s) => (s[k] === el ? s : { ...s, [k]: el }))
  }
  const conn = useMemo(() => analyze(doc), [doc])
  const key = useMemo(() => JSON.stringify([doc.parts, doc.tracks, doc.vias, doc.pours, doc.texts, maskColor, finish]), [doc, maskColor, finish])
  const top: SideMaps = {
    color: useSvgTexture(svgs.topColor ?? null, key),
    bump: useSvgTexture(svgs.topBump ?? null, key, { linear: true }),
    orm: useSvgTexture(svgs.topOrm ?? null, key, { linear: true }),
  }
  const bottom: SideMaps = {
    color: useSvgTexture(svgs.botColor ?? null, key),
    bump: useSvgTexture(svgs.botBump ?? null, key, { linear: true }),
    orm: useSvgTexture(svgs.botOrm ?? null, key, { linear: true }),
  }
  const low = quality === 'low' || isLowPower()
  const span = Math.max(doc.w, doc.h)
  const dir: [number, number, number] = view === 'top' ? [0, 1, 0.0001] : view === 'bottom' ? [0, -1, 0.0001] : [0.62, 0.95, 1.05]
  const camPos: [number, number, number] = [dir[0] * span * 1.35, dir[1] * span * 1.35, dir[2] * span * 1.35]

  const hi = low ? 40 : 64 // px per mm for the top colour map
  const mid = low ? 24 : 36
  const art = (k: string, ppm: number, node: React.ReactNode) => (
    <svg ref={reg(k)} xmlns="http://www.w3.org/2000/svg" width={Math.round(doc.w * ppm)} height={Math.round(doc.h * ppm)} viewBox={`0 0 ${doc.w} ${doc.h}`}>
      {node}
    </svg>
  )
  const vis = { ratsnest: false, bodies: false, sheen: false }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <div aria-hidden style={{ position: 'absolute', left: -100000, top: 0, width: 10, height: 10, overflow: 'hidden', pointerEvents: 'none' }}>
        {art('topColor', hi, <BoardView doc={doc} conn={conn} mode="real" side="top" maskColor={maskColor} finish={finish} vis={vis} />)}
        {art('topBump', mid, <BumpArt doc={doc} conn={conn} side="top" />)}
        {art('topOrm', mid, <OrmArt doc={doc} conn={conn} side="top" />)}
        {art('botColor', mid, <BoardView doc={doc} conn={conn} mode="real" side="bottom" maskColor={maskColor} finish={finish} vis={vis} />)}
        {art('botBump', 16, <BumpArt doc={doc} conn={conn} side="bottom" />)}
        {art('botOrm', 16, <OrmArt doc={doc} conn={conn} side="bottom" />)}
      </div>
      <Canvas
        shadows
        dpr={[1, low ? 1.5 : 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
          gl.toneMappingExposure = 0.92
        }}
      >
        {camera === 'ortho' ? <FitOrtho span={span} dir={dir} /> : <PerspectiveCamera makeDefault position={camPos} fov={32} near={0.5} far={1000} />}
        <StudioEnvironment intensity={0.42} />
        <ambientLight intensity={0.12} />
        <directionalLight
          position={[span * 1.3, span * 1.15, span * 0.35]}
          intensity={2.6}
          color="#fff3e2"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-span}
          shadow-camera-right={span}
          shadow-camera-top={span}
          shadow-camera-bottom={-span}
          shadow-camera-near={0.5}
          shadow-camera-far={span * 5}
        />
        <directionalLight position={[-span, span * 0.6, -span * 0.4]} intensity={0.35} color="#ffe9d0" />

        <Suspense fallback={null}>
          <group>
            <BoardMesh doc={doc} top={top} bottom={bottom} maskColor={maskColor} />
            {showParts && <Parts doc={doc} lift={explode} blink={blink} />}
          </group>
          {shadow && (
            <AccumulativeShadows
              key={key}
              position={[0, -3, 0]}
              frames={low ? 40 : 90}
              temporal
              alphaTest={0.75}
              opacity={0.6}
              scale={span * 3}
              color="#3a2c18"
              colorBlend={1.5}
            >
              <RandomizedLight amount={6} radius={span * 0.45} ambient={0.55} intensity={1.1} position={[span * 0.5, span * 2, span * 0.6]} bias={0.0005} />
            </AccumulativeShadows>
          )}
        </Suspense>

        <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={0.7} enableDamping minDistance={span * 0.6} maxDistance={span * 4} minZoom={2} maxZoom={200} />

        {!low && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <N8AO halfRes aoRadius={1.6} distanceFalloff={0.6} intensity={2.4} quality="medium" color="#1a120a" />
            <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={1.1} />
            <SMAA />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
