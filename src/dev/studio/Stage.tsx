/*
 * The shared "photo studio" every lesson thumbnail is shot in: one isometric orthographic camera,
 * one warm key light, a soft room environment for reflections, baked contact shadows on an
 * invisible floor, ambient occlusion and a touch of bloom. Keeping all of this identical across
 * scenes is what makes the lesson strip read as a set.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AccumulativeShadows, OrthographicCamera, RandomizedLight } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom } from '@react-three/postprocessing'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { pendingCount } from './ready'

/** Camera direction shared by every thumbnail (elevation ≈ 36°, azimuth ≈ 35° from +z). */
export const VIEW_DIR = new THREE.Vector3(0.464, 0.588, 0.663).normalize()
/** Key light: high, from screen-left and slightly in front, so shadows fall right / back. */
const KEY_DIR = new THREE.Vector3(-0.62, 1.55, 0.72).normalize()
/** lighting knobs; overridable from the URL (?key=2&env=0.4…) while tuning */
const Q = new URLSearchParams(window.location.search)
const knob = (k: string, d: number) => (Q.has(k) ? +Q.get(k)! : d)
export const LIGHT = {
  env: knob('env', 0.42),
  envRot: knob('envRot', 0),
  key: knob('key', 2.1),
  fill: knob('fill', 0.4),
  rim: knob('rim', 0.6),
  amb: knob('amb', 0.16),
  exposure: knob('exp', 0.92),
  bloom: knob('bloom', 0.55),
  ao: knob('ao', 2.2),
}
const CAM_START: [number, number, number] = [VIEW_DIR.x * 400, VIEW_DIR.y * 400, VIEW_DIR.z * 400]

function StudioEnvironment({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.035).texture
    scene.environment = env
    scene.environmentIntensity = intensity
    scene.environmentRotation.set(0, LIGHT.envRot, 0)
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene, intensity])
  return null
}

interface Framed {
  box: THREE.Box3
  size: number
}

/** Precise camera-space extents of everything in `root` (skips objects flagged userData.noFit). */
function fitExtents(root: THREE.Object3D, cam: THREE.Camera) {
  const inv = cam.matrixWorldInverse
  const v = new THREE.Vector3()
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  const box = new THREE.Box3()
  const pts: number[] = []
  root.updateWorldMatrix(true, true)
  const visit = (o: THREE.Object3D) => {
    if (!o.visible || o.userData.noFit) return
    const mesh = o as THREE.Mesh
    if (mesh.isMesh && mesh.geometry) {
      const pos = mesh.geometry.getAttribute('position')
      if (pos) {
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
          box.expandByPoint(v)
          pts.push(v.x, v.y, v.z)
        }
      }
    }
    o.children.forEach(visit)
  }
  visit(root)
  const floor = box.min.y
  const add = (x: number, y: number, z: number) => {
    v.set(x, y, z).applyMatrix4(inv)
    if (v.x < x0) x0 = v.x
    if (v.x > x1) x1 = v.x
    if (v.y < y0) y0 = v.y
    if (v.y > y1) y1 = v.y
  }
  for (let i = 0; i < pts.length; i += 3) {
    const [x, y, z] = [pts[i], pts[i + 1], pts[i + 2]]
    add(x, y, z)
    // where its soft floor shadow lands (light mostly overhead, a little from the left/front)
    const h = (y - floor) * 0.35
    if (h > 0.01) add(x + h, floor, z - h)
  }
  return { x0, x1, y0, y1, box }
}

function Director({
  content,
  margin,
  onFramed,
  framed,
}: {
  content: React.RefObject<THREE.Group | null>
  margin: number
  onFramed: (f: Framed) => void
  framed: Framed | null
}) {
  const { camera, size } = useThree()
  const idle = useRef(0)
  const after = useRef(0)
  const fonts = useRef(false)
  useEffect(() => {
    document.fonts.ready.then(() => (fonts.current = true))
  }, [])
  useFrame(() => {
    if (!framed) {
      if (!fonts.current || pendingCount() > 0 || !content.current) {
        idle.current = 0
        return
      }
      if (++idle.current < 4) return
      // aim, then fit precisely
      const cam = camera as THREE.OrthographicCamera
      cam.position.copy(VIEW_DIR).multiplyScalar(400)
      cam.up.set(0, 1, 0)
      cam.lookAt(0, 0, 0)
      cam.updateMatrixWorld(true)
      const e = fitExtents(content.current, cam)
      if (!isFinite(e.x0)) return
      const cx = (e.x0 + e.x1) / 2
      const cy = (e.y0 + e.y1) / 2
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0)
      const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1)
      cam.position.addScaledVector(right, cx).addScaledVector(up, cy)
      cam.zoom = Math.min((size.width * (1 - margin * 2)) / (e.x1 - e.x0), (size.height * (1 - margin * 2)) / (e.y1 - e.y0))
      cam.updateProjectionMatrix()
      cam.updateMatrixWorld(true)
      const s = e.box.getSize(new THREE.Vector3())
      onFramed({ box: e.box, size: Math.max(s.x, s.z, s.y * 0.6) })
      console.info(`[studio] framed at ${Math.round(performance.now())} ms`)
      return
    }
    after.current++
    if (after.current === 6) {
      window.__thumbReady = true
      console.info(`[studio] ready at ${Math.round(performance.now())} ms`)
    }
  })
  return null
}

function Lights({ framed }: { framed: Framed | null }) {
  const key = useRef<THREE.DirectionalLight>(null)
  const c = framed ? framed.box.getCenter(new THREE.Vector3()) : new THREE.Vector3()
  const s = framed ? framed.size : 40
  useEffect(() => {
    const l = key.current
    if (!l) return
    l.target.position.copy(c)
    l.target.updateMatrixWorld()
    const cam = l.shadow.camera
    cam.left = -s
    cam.right = s
    cam.top = s
    cam.bottom = -s
    cam.near = 0.1
    cam.far = s * 8
    cam.updateProjectionMatrix()
    l.shadow.needsUpdate = true
  })
  const kp = c.clone().addScaledVector(KEY_DIR, s * 3)
  const fp = c.clone().add(new THREE.Vector3(s * 1.6, s * 0.9, s * 0.4))
  const rim = c.clone().add(new THREE.Vector3(-s * 0.6, s * 1.2, -s * 1.8))
  return (
    <>
      <ambientLight intensity={LIGHT.amb} color="#fff4e6" />
      <directionalLight
        ref={key}
        position={kp}
        intensity={LIGHT.key}
        color="#fff0dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
        shadow-radius={4}
      />
      {/* cool-ish fill from the right keeps the shadow side from going dead */}
      <directionalLight position={fp} intensity={LIGHT.fill} color="#e8eeff" />
      {/* warm rim from behind separates silhouettes */}
      <directionalLight position={rim} intensity={LIGHT.rim} color="#ffd9b0" />
    </>
  )
}

function Floor({ framed }: { framed: Framed }) {
  const c = framed.box.getCenter(new THREE.Vector3())
  const s = framed.size
  return (
    <group userData={{ noFit: true }}>
      <AccumulativeShadows
        position={[c.x, framed.box.min.y - 0.02, c.z]}
        frames={40}
        temporal={false}
        alphaTest={0.85}
        opacity={0.72}
        scale={s * 3}
        resolution={512}
        color="#3b2a14"
        colorBlend={2}
      >
        <RandomizedLight
          amount={4}
          radius={s * 0.55}
          ambient={0.55}
          intensity={4.2}
          position={[-s * 0.55, s * 1.9, s * 0.55]}
          bias={0.0006}
          mapSize={512}
          size={s * 1.6}
          near={0.1}
          far={s * 8}
        />
      </AccumulativeShadows>
    </group>
  )
}

export interface StageProps {
  children: ReactNode
  /** fraction of the frame left empty on each side */
  margin?: number
  /** scale for the AO radius (world units = mm) */
  ao?: number
  exposure?: number
  bloom?: number
}

export function Stage({ children, margin = 0.07, ao = 1, exposure = LIGHT.exposure, bloom = LIGHT.bloom }: StageProps) {
  const content = useRef<THREE.Group>(null)
  const [framed, setFramed] = useState<Framed | null>(null)
  return (
    <Canvas
      shadows
      dpr={window.devicePixelRatio || 1}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = exposure
        gl.setClearColor(0x000000, 0)
      }}
      style={{ position: 'fixed', inset: 0, background: 'transparent' }}
    >
      <OrthographicCamera makeDefault position={CAM_START} zoom={8} near={1} far={2000} />
      <StudioEnvironment intensity={LIGHT.env} />
      <Lights framed={framed} />
      <group ref={content}>{children}</group>
      {framed && <Floor framed={framed} />}
      <Director content={content} margin={margin} framed={framed} onFramed={setFramed} />
      <EffectComposer multisampling={8} enableNormalPass={false}>
        <N8AO aoRadius={1.4 * ao} distanceFalloff={0.7} intensity={LIGHT.ao} quality="high" color="#1d130a" />
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={bloom} />
      </EffectComposer>
    </Canvas>
  )
}
