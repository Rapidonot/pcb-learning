/* A 3D cut-away of a single via: half of the board is sliced off so you can look into the plated barrel. */
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const U = 10 // scene units per mm
const CORE = 1.6 * U
const CU = 0.07 * U // 1 oz copper, drawn 2× thicker
const PLATE = 0.04 * U
const HALF = 1.5 * U
const DEPTH = 1.1 * U
const TRACE_W = 0.25 * U

function halfBlockGeo(holeR: number) {
  const s = new THREE.Shape()
  s.moveTo(-HALF, 0)
  s.lineTo(-holeR, 0)
  s.absarc(0, 0, holeR, Math.PI, 0, true)
  s.lineTo(HALF, 0)
  s.lineTo(HALF, DEPTH)
  s.lineTo(-HALF, DEPTH)
  s.lineTo(-HALF, 0)
  const g = new THREE.ExtrudeGeometry(s, { depth: CORE, bevelEnabled: false, curveSegments: 40 })
  g.rotateX(-Math.PI / 2)
  return g
}

function halfRingGeo(rIn: number, rOut: number, h: number) {
  const s = new THREE.Shape()
  s.moveTo(rOut, 0)
  s.absarc(0, 0, rOut, 0, Math.PI, false)
  s.lineTo(-rIn, 0)
  s.absarc(0, 0, rIn, Math.PI, 0, true)
  s.lineTo(rOut, 0)
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 40 })
  g.rotateX(-Math.PI / 2)
  return g
}

const copperMat = { color: '#e39a58', metalness: 0.92, roughness: 0.26 } as const

/** A procedural studio environment so metals have something to reflect (no network fetch). */
function Studio() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.85
    return () => {
      scene.environment = null
      env.dispose()
      pm.dispose()
    }
  }, [gl, scene])
  return null
}

/** Glass-fibre weave in epoxy, drawn on a canvas and tiled over the FR-4. */
function useWeaveTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 288
    c.height = 160
    const g = c.getContext('2d')!
    g.fillStyle = '#c4ad75'
    g.fillRect(0, 0, c.width, c.height)
    // warp bundle weaving over/under
    const warp = g.createLinearGradient(0, 50, 0, 120)
    warp.addColorStop(0, '#efe2bb')
    warp.addColorStop(1, '#b9a26b')
    g.fillStyle = warp
    g.beginPath()
    g.moveTo(-10, 56)
    g.bezierCurveTo(50, 56, 90, 104, 144, 104)
    g.bezierCurveTo(198, 104, 238, 56, 298, 56)
    g.lineTo(298, 80)
    g.bezierCurveTo(238, 80, 198, 128, 144, 128)
    g.bezierCurveTo(90, 128, 50, 80, -10, 80)
    g.closePath()
    g.fill()
    // weft bundles end-on
    for (const cx of [48, 240]) {
      const rg = g.createRadialGradient(cx - 12, 70, 4, cx, 80, 46)
      rg.addColorStop(0, '#fbf3dc')
      rg.addColorStop(0.6, '#e2d1a2')
      rg.addColorStop(1, '#b09a63')
      g.fillStyle = rg
      g.beginPath()
      g.ellipse(cx, 80, 44, 21, 0, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = 'rgba(120,100,60,0.5)'
      g.lineWidth = 2
      g.stroke()
    }
    // speckle
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${90 + Math.random() * 60},${70 + Math.random() * 40},30,${0.06 + Math.random() * 0.08})`
      g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1 / 3.6, 1 / 2)
    t.anisotropy = 8
    return t
  }, [])
}

function Flow({ path, on }: { path: THREE.Vector3[]; on: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const lens = useMemo(() => {
    const out = [0]
    for (let i = 1; i < path.length; i++) out.push(out[i - 1] + path[i].distanceTo(path[i - 1]))
    return out
  }, [path])
  const total = lens[lens.length - 1]
  const N = 9
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    for (let k = 0; k < N; k++) {
      const m = refs.current[k]
      if (!m) continue
      m.visible = on
      if (!on) continue
      const t = ((clock.elapsedTime * 9 + (k * total) / N) % total + total) % total
      let i = 1
      while (i < lens.length - 1 && lens[i] < t) i++
      const a = path[i - 1]
      const b = path[i]
      const f = (t - lens[i - 1]) / (lens[i] - lens[i - 1] || 1)
      v.copy(a).lerp(b, f)
      m.position.copy(v)
    }
  })
  return (
    <group>
      {Array.from({ length: N }, (_, k) => (
        <mesh key={k} ref={(el) => { refs.current[k] = el }}>
          <sphereGeometry args={[0.32, 12, 12]} />
          <meshStandardMaterial color="#fff2a8" emissive="#ffd23a" emissiveIntensity={2.2} />
        </mesh>
      ))}
    </group>
  )
}

type Pt = [number, number, number]

/** Moves DOM labels to the screen position of 3D anchor points every frame. */
function Projector({ refs, points }: { refs: React.MutableRefObject<(HTMLDivElement | null)[]>; points: React.MutableRefObject<Pt[]> }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    points.current.forEach((p, i) => {
      const el = refs.current[i]
      if (!el) return
      v.set(p[0], p[1], p[2]).project(camera)
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`
    })
  })
  return null
}

function ViaModel({ d, drill, explode, flow, labelPts }: { d: number; drill: number; explode: number; flow: boolean; labelPts: React.MutableRefObject<Pt[]> }) {
  const rIn = (drill / 2) * U
  const rOut = (d / 2) * U
  const holeR = rIn + PLATE
  const gap = 0
  const slide = explode * 16
  const topY = CORE + gap
  const botY = -CU - gap
  const block = useMemo(() => halfBlockGeo(holeR), [holeR])
  const weave = useWeaveTexture()
  const ring = useMemo(() => halfRingGeo(rIn, rOut, CU), [rIn, rOut])
  const barrel = useMemo(() => halfRingGeo(rIn, holeR, 1), [rIn, holeR])
  const barrelH = topY + CU - botY
  const path = useMemo(
    () => [
      new THREE.Vector3(-HALF, topY + CU / 2, -TRACE_W / 2),
      new THREE.Vector3(-rIn - PLATE / 2, topY + CU / 2, -0.25),
      new THREE.Vector3(-rIn - PLATE / 2, botY + CU / 2, -0.25),
      new THREE.Vector3(HALF, botY + CU / 2, -TRACE_W / 2),
    ],
    [topY, botY, rIn],
  )
  const oy = -CORE / 2
  labelPts.current = [
    [-HALF * 0.7, topY + CU + 1.6 + oy, -TRACE_W / 2],
    [HALF * 0.65, botY - 1.6 + oy, -TRACE_W / 2],
    [rOut + 4.5, topY + CU + 2.6 + oy, -2],
    [-rIn - 5, CORE * 0.35 + oy, 0],
    [HALF * 0.6, CORE * 0.7 + oy, -slide],
  ]
  return (
    <group position={[0, oy, 0]}>
      {/* FR-4 */}
      <mesh geometry={block} position={[0, 0, -slide]}>
        <meshStandardMaterial map={weave} color="#ffffff" roughness={0.7} transparent opacity={1 - explode * 0.55} />
      </mesh>
      {/* faint full outline of the removed front half */}
      <mesh position={[0, CORE / 2, DEPTH / 2]}>
        <boxGeometry args={[HALF * 2, CORE, DEPTH]} />
        <meshBasicMaterial color="#8a7a4e" wireframe transparent opacity={0.12} />
      </mesh>

      {/* top copper: trace + ring */}
      <group position={[0, topY, 0]}>
        <mesh geometry={ring}>
          <meshStandardMaterial {...copperMat} />
        </mesh>
        <mesh position={[(-HALF - rIn) / 2, CU / 2, -TRACE_W / 2]}>
          <boxGeometry args={[HALF - rIn, CU, TRACE_W]} />
          <meshStandardMaterial {...copperMat} />
        </mesh>
      </group>
      {/* bottom copper: ring + trace */}
      <group position={[0, botY, 0]}>
        <mesh geometry={ring}>
          <meshStandardMaterial {...copperMat} />
        </mesh>
        <mesh position={[(HALF + rIn) / 2, CU / 2, -TRACE_W / 2]}>
          <boxGeometry args={[HALF - rIn, CU, TRACE_W]} />
          <meshStandardMaterial {...copperMat} />
        </mesh>
      </group>
      {/* plated barrel */}
      <mesh geometry={barrel} position={[0, botY, 0]} scale={[1, barrelH, 1]}>
        <meshStandardMaterial color="#e8a466" metalness={0.9} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      <Flow path={path} on={flow} />

    </group>
  )
}

const LABELS = ['Top trace', 'Bottom trace', 'Annular ring', 'Plated barrel', 'FR-4 · 1.6 mm']

export default function Via3D({ d, drill, explode, flow }: { d: number; drill: number; explode: number; flow: boolean }) {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const pts = useRef<Pt[]>([])
  return (
    <>
    <Canvas dpr={[1, 2]} camera={{ position: [12, 14, 46], fov: 32, near: 0.5, far: 500 }} gl={{ antialias: true, alpha: true }}>
      <Studio />
      <ambientLight intensity={0.25} />
      <hemisphereLight args={['#fff6e8', '#3a3326', 0.7]} />
      <directionalLight position={[20, 40, 30]} intensity={1.6} />
      <directionalLight position={[-30, -10, 20]} intensity={0.55} />
      <ViaModel d={d} drill={drill} explode={explode} flow={flow} labelPts={pts} />
      <Projector refs={refs} points={pts} />
      <OrbitControls makeDefault enableDamping enablePan={false} minDistance={16} maxDistance={90} target={[0, 0, -3]} />
    </Canvas>
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {LABELS.map((l, i) => (
        <div key={l} ref={(el) => { refs.current[i] = el }} style={{ position: 'absolute', left: 0, top: 0, opacity: 1 }}>
          <div className="l11-tag">{l}</div>
        </div>
      ))}
    </div>
    </>
  )
}
