/* A small three.js viewer for the inspector: the selected part sitting on a scrap of PCB. Lazy-loaded. */
import { useEffect, useMemo, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls, OrthographicCamera, RoundedBox } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { Axial, ChipPart, DipIC, GullIC, Header, Led5mm, Sot23, mats } from '@/pcb/parts3d'
import { getFootprint, type PadDef } from '@/pcb/footprints'
import type { PartId } from './data'

function Env() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.035).texture
    scene.environment = env
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

/* ---------------- local models ---------------- */

const sleeveMat = new THREE.MeshPhysicalMaterial({ color: '#2a4f99', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 })
const stripeMat = new THREE.MeshPhysicalMaterial({ color: '#d9e1ee', roughness: 0.4, clearcoat: 0.6 })
const diodeMat = new THREE.MeshPhysicalMaterial({ color: '#1c1c1f', roughness: 0.35, clearcoat: 0.4 })
const bandMat = new THREE.MeshStandardMaterial({ color: '#cfd4da', roughness: 0.35, metalness: 0.2 })

const ELEC_PADS: PadDef[] = [
  { num: '1', x: 1.0, y: 0, w: 1.6, h: 1.6, shape: 'rect', drill: 0.8 },
  { num: '2', x: -1.0, y: 0, w: 1.6, h: 1.6, shape: 'round', drill: 0.8 },
]
const BTN_PADS: PadDef[] = [
  { num: '1', x: -3.25, y: -2.25, w: 1.6, h: 1.6, shape: 'round', drill: 1 },
  { num: '2', x: 3.25, y: -2.25, w: 1.6, h: 1.6, shape: 'round', drill: 1 },
  { num: '3', x: -3.25, y: 2.25, w: 1.6, h: 1.6, shape: 'round', drill: 1 },
  { num: '4', x: 3.25, y: 2.25, w: 1.6, h: 1.6, shape: 'round', drill: 1 },
]

/** direction (around Y) the minus stripe faces: towards the viewer, over the negative leg */
const STRIPE = -0.55

function Electrolytic() {
  const m = mats()
  const r = 2.5
  const h = 7
  const lift = 0.4
  return (
    <group>
      {ELEC_PADS.map((p) => (
        <mesh key={p.num} material={m.tin} position={[p.x, -0.5, p.y]}>
          <cylinderGeometry args={[0.25, 0.25, 2.4, 10]} />
        </mesh>
      ))}
      <group position={[0, lift, 0]}>
        <mesh material={sleeveMat} position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[r, r, h, 48]} />
        </mesh>
        {/* minus stripe, on the −X side above the negative leg */}
        <mesh material={stripeMat} position={[0, h / 2, 0]}>
          <cylinderGeometry args={[r + 0.01, r + 0.01, h - 0.3, 24, 1, true, STRIPE - Math.PI * 0.18, Math.PI * 0.36]} />
        </mesh>
        {[1.6, 3.4, 5.2].map((y) => (
          <mesh key={y} position={[Math.sin(STRIPE) * (r + 0.03), y, Math.cos(STRIPE) * (r + 0.03)]} rotation={[0, STRIPE, 0]}>
            <boxGeometry args={[0.7, 0.18, 0.05]} />
            <meshStandardMaterial color="#1b2f57" />
          </mesh>
        ))}
        {/* rolled rim and aluminium top with vent */}
        <mesh material={sleeveMat} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r - 0.12, 0.14, 10, 48]} />
        </mesh>
        <mesh material={m.tin} position={[0, h - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r - 0.2, 40]} />
        </mesh>
        {[0, Math.PI / 2].map((a) => (
          <mesh key={a} position={[0, h, 0]} rotation={[0, a, 0]}>
            <boxGeometry args={[r * 1.1, 0.03, 0.12]} />
            <meshStandardMaterial color="#7d848c" metalness={1} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Diode() {
  const m = mats()
  const half = 5.08
  const r = 1.35
  const y = r + 0.4
  const leadGeo = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>()
    const V = (a: number, b: number) => new THREE.Vector3(a, b, 0)
    path.add(new THREE.LineCurve3(V(-half, -1.6), V(-half, y - 0.6)))
    path.add(new THREE.QuadraticBezierCurve3(V(-half, y - 0.6), V(-half, y), V(-half + 0.6, y)))
    path.add(new THREE.LineCurve3(V(-half + 0.6, y), V(half - 0.6, y)))
    path.add(new THREE.QuadraticBezierCurve3(V(half - 0.6, y), V(half, y), V(half, y - 0.6)))
    path.add(new THREE.LineCurve3(V(half, y - 0.6), V(half, -1.6)))
    return new THREE.TubeGeometry(path, 80, 0.25, 10, false)
  }, [y])
  return (
    <group>
      <mesh geometry={leadGeo} material={m.tin} castShadow />
      <group position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={diodeMat} castShadow>
          <capsuleGeometry args={[r, 3.2, 8, 24]} />
        </mesh>
        <mesh material={bandMat} position={[0, -1.5, 0]}>
          <cylinderGeometry args={[r + 0.02, r + 0.02, 0.7, 24]} />
        </mesh>
      </group>
    </group>
  )
}

function Button() {
  const m = mats()
  return (
    <group>
      {BTN_PADS.map((p) => (
        <mesh key={p.num} material={m.tin} position={[p.x, 0.2, p.y]}>
          <boxGeometry args={[0.7, 3.4, 0.3]} />
        </mesh>
      ))}
      <RoundedBox args={[6, 3.1, 6]} radius={0.15} smoothness={3} position={[0, 1.55, 0]} material={m.plastic} castShadow />
      <mesh material={m.tin} position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[6.1, 0.2, 6.1]} />
      </mesh>
      <mesh material={m.plastic} position={[0, 3.9, 0]} castShadow>
        <cylinderGeometry args={[1.75, 1.75, 1.4, 40]} />
      </mesh>
    </group>
  )
}

/* ---------------- the scene ---------------- */

interface Spec {
  pads: PadDef[]
  board: [number, number]
  model: ReactNode
  height: number
  marks: { at: [number, number, number]; text: string }[]
}

function spec(id: PartId): Spec {
  const fp = (k: string) => getFootprint(k)
  switch (id) {
    case 'res-tht':
      return { pads: fp('R-AXIAL-0.4').pads, board: [15, 6], model: <Axial fp={fp('R-AXIAL-0.4')} value="330" />, height: 3, marks: [] }
    case 'res-smd':
      return { pads: fp('R0805').pads, board: [5, 3.4], model: <ChipPart fp={fp('R0805')} value="330" isCap={false} />, height: 0.6, marks: [] }
    case 'cap-cer':
      return { pads: fp('C0805').pads, board: [5, 3.4], model: <ChipPart fp={fp('C0805')} isCap />, height: 0.6, marks: [] }
    case 'cap-elec':
      return {
        pads: ELEC_PADS,
        board: [8, 8],
        model: <Electrolytic />,
        height: 7.6,
        marks: [
          { at: [Math.sin(STRIPE) * 2.6, 5.4, Math.cos(STRIPE) * 2.6], text: '− stripe = negative' },
          { at: [1.0, 0.1, 0], text: 'square pad = +' },
        ],
      }
    case 'led':
      return {
        pads: fp('LED-5MM').pads,
        board: [8, 8],
        model: <Led5mm fp={fp('LED-5MM')} on={false} />,
        height: 8.6,
        marks: [
          { at: [-2.9, 2.2, 0], text: 'flat edge = cathode (−)' },
          { at: [-1.27, 0.1, 0], text: 'square pad = cathode' },
        ],
      }
    case 'diode':
      return { pads: fp('R-AXIAL-0.4').pads, board: [15, 6], model: <Diode />, height: 3, marks: [{ at: [-1.5, 3.3, 0], text: 'band = cathode (−)' }] }
    case 'ic-dip':
      return {
        pads: fp('DIP-8').pads,
        board: [11, 13],
        model: <DipIC fp={fp('DIP-8')} value="NE555P" />,
        height: 4.2,
        marks: [
          { at: [0, 4.3, -4.9], text: 'notch' },
          { at: [-3.81, 0.2, -3.81], text: 'pin 1' },
        ],
      }
    case 'ic-soic':
      return {
        pads: fp('SOIC-8').pads,
        board: [8, 7],
        model: <GullIC fp={fp('SOIC-8')} value="NE555" />,
        height: 1.6,
        marks: [
          { at: [-1.35, 1.6, -1.85], text: 'pin-1 dot' },
          { at: [-2.7, 0.1, -1.905], text: 'pin 1' },
        ],
      }
    case 'transistor':
      return { pads: fp('SOT-23').pads, board: [4.6, 4.6], model: <Sot23 fp={fp('SOT-23')} />, height: 1.1, marks: [] }
    case 'header':
      return { pads: fp('HDR-1x2').pads, board: [5, 8], model: <Header fp={fp('HDR-1x2')} />, height: 8.4, marks: [{ at: [0, 0.1, -1.27], text: 'square pad = pin 1' }] }
    case 'button':
      return { pads: BTN_PADS, board: [10, 8.5], model: <Button />, height: 4.6, marks: [] }
  }
}

const boardMat = new THREE.MeshPhysicalMaterial({ color: '#1f6b47', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.35 })
const holeMat = new THREE.MeshBasicMaterial({ color: '#0d0d0c' })

function Pads({ pads }: { pads: PadDef[] }) {
  const m = mats()
  return (
    <>
      {pads.map((p) =>
        p.drill ? (
          <group key={p.num} position={[p.x, 0.005, p.y]}>
            {p.shape === 'rect' ? (
              <mesh material={m.tin}>
                <boxGeometry args={[p.w, 0.05, p.h]} />
              </mesh>
            ) : (
              <mesh material={m.tin}>
                <cylinderGeometry args={[p.w / 2, p.w / 2, 0.05, 32]} />
              </mesh>
            )}
            <mesh material={holeMat} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[p.drill / 2, 24]} />
            </mesh>
          </group>
        ) : (
          <mesh key={p.num} material={m.tin} position={[p.x, 0.02, p.y]}>
            <boxGeometry args={[p.w, 0.04, p.h]} />
          </mesh>
        ),
      )}
    </>
  )
}

function Fit({ span }: { span: number }) {
  const { size } = useThree()
  const zoom = Math.min(size.width / (span * 1.8), size.height / (span * 1.42))
  const d = 60
  const dir = new THREE.Vector3(0.62, 0.8, 1.05).normalize()
  return <OrthographicCamera makeDefault zoom={zoom} near={-200} far={400} position={[dir.x * d, dir.y * d, dir.z * d]} />
}

export default function Viewer3D({ id, marks }: { id: PartId; marks: boolean }) {
  const s = spec(id)
  const [bw, bd] = s.board
  const span = Math.max(bw * 0.9, bd * 0.9, s.height * 1.25)
  return (
    <Canvas
      key={id}
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 0.95
      }}
    >
      <Fit span={span} />
      <Env />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[span * 1.2, span * 2, span * 0.8]}
        intensity={2.4}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
      />
      <group position={[0, -s.height * 0.42, 0]}>
        <RoundedBox args={[bw, 1.6, bd]} radius={0.3} smoothness={3} position={[0, -0.8, 0]} material={boardMat} receiveShadow />
        <Pads pads={s.pads} />
        {s.model}
        {marks &&
          s.marks.map((mk, i) => (
            <Html key={i} position={mk.at} center zIndexRange={[20, 0]}>
              <div className="l03-mark">
                <i />
                <b>{mk.text}</b>
              </div>
            </Html>
          ))}
      </group>
      <OrbitControls makeDefault autoRotate={!marks} autoRotateSpeed={1.2} enableZoom={false} enablePan={false} enableDamping />
    </Canvas>
  )
}
