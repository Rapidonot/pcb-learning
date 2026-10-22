/* Lazy-loaded 3D preview of a search result: the part sitting on its footprint on a scrap of PCB. */
import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera, RoundedBox } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { DipIC, GullIC, mats } from '@/pcb/parts3d'
import type { FootprintDef } from '@/pcb/footprints'

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

const boardMat = new THREE.MeshPhysicalMaterial({ color: '#1f6b47', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.35 })
const holeMat = new THREE.MeshBasicMaterial({ color: '#0d0d0c' })

function Pads({ fp }: { fp: FootprintDef }) {
  const m = mats()
  return (
    <>
      {fp.pads.map((p) =>
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
  const zoom = Math.min(size.width, size.height) / (span * 1.12)
  const d = 60
  const dir = new THREE.Vector3(0.62, 0.85, 1.05).normalize()
  return <OrthographicCamera makeDefault zoom={zoom} near={-200} far={400} position={[dir.x * d, dir.y * d, dir.z * d]} />
}

export default function Preview3D({ fp, marking }: { fp: FootprintDef; marking: string }) {
  const bw = fp.courtyard.w * 2 + 1.6
  const bd = fp.courtyard.h * 2 + 1.6
  const span = Math.max(bw, bd)
  const isDip = fp.body.kind === 'dip'
  return (
    <Canvas
      key={fp.id + marking}
      shadows
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
      <group position={[0, isDip ? -1.4 : -0.4, 0]}>
        <RoundedBox args={[bw, 1.6, bd]} radius={0.3} smoothness={3} position={[0, -0.8, 0]} material={boardMat} receiveShadow />
        <Pads fp={fp} />
        {isDip ? <DipIC fp={fp} value={marking} /> : <GullIC fp={fp} value={marking} />}
      </group>
      <OrbitControls makeDefault autoRotate autoRotateSpeed={1.4} enableZoom={false} enablePan={false} enableDamping />
    </Canvas>
  )
}
