/*
 * Detailed 3D component models (units: mm, origin = part centre on the board surface, +Y up,
 * local +X/+Z match the footprint's x/y). Built from primitives so there are no external assets.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import type { FootprintDef } from './footprints'

/* ------------------------------------------------------------------ */
/* Shared materials (created once)                                     */
/* ------------------------------------------------------------------ */

let _mats: ReturnType<typeof makeMats> | null = null
function makeMats() {
  return {
    tin: new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: 0.22 }),
    solder: new THREE.MeshStandardMaterial({ color: '#cfd4da', metalness: 1, roughness: 0.14 }),
    gold: new THREE.MeshStandardMaterial({ color: '#f0c050', metalness: 1, roughness: 0.18 }),
    copper: new THREE.MeshStandardMaterial({ color: '#d98b4c', metalness: 1, roughness: 0.3 }),
    plastic: new THREE.MeshPhysicalMaterial({ color: '#1b1b1e', roughness: 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.6 }),
    plasticMatte: new THREE.MeshStandardMaterial({ color: '#1e1e22', roughness: 0.75 }),
    dimple: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.9 }),
    ceramic: new THREE.MeshStandardMaterial({ color: '#eceae3', roughness: 0.55 }),
    resTop: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.5 }),
    capBody: new THREE.MeshStandardMaterial({ color: '#b48e5c', roughness: 0.62 }),
    ledBody: new THREE.MeshStandardMaterial({ color: '#f6f4ee', roughness: 0.35 }),
    ledMark: new THREE.MeshStandardMaterial({ color: '#2f9f5f', roughness: 0.5 }),
    axialBody: new THREE.MeshStandardMaterial({ color: '#d8c08e', roughness: 0.55 }),
  }
}
export function mats() {
  if (!_mats) _mats = makeMats()
  return _mats
}

/* ------------------------------------------------------------------ */
/* Printed markings (canvas textures, cached)                          */
/* ------------------------------------------------------------------ */

const labelCache = new Map<string, THREE.Texture>()
/** A transparent texture with centred lines of text, for laser markings on chips. */
export function labelTexture(lines: string[], wMm: number, hMm: number, color = 'rgba(225,225,225,0.92)') {
  const key = `${lines.join('|')}:${wMm}x${hMm}:${color}`
  const hit = labelCache.get(key)
  if (hit) return hit
  const ppm = 96
  const c = document.createElement('canvas')
  c.width = Math.max(8, Math.round(wMm * ppm))
  c.height = Math.max(8, Math.round(hMm * ppm))
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lh = c.height / (lines.length + 0.6)
  lines.forEach((line, i) => {
    const size = i === 0 ? lh * 0.78 : lh * 0.55
    ctx.font = `600 ${size}px "IBM Plex Mono", ui-monospace, monospace`
    ctx.fillText(line, c.width / 2, lh * (i + 0.8))
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  labelCache.set(key, t)
  return t
}

function Decal({ tex, w, h, y, rot = 0 }: { tex: THREE.Texture; w: number; h: number; y: number; rot?: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, rot]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} transparent roughness={0.6} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * A concave solder fillet: profile in the XY plane (x = outward from the termination, y = up),
 * extruded across `width` along Z and centred.
 */
const filletCache = new Map<string, THREE.BufferGeometry>()
export function filletGeometry(length: number, height: number, width: number) {
  const key = `${length}:${height}:${width}`
  const hit = filletCache.get(key)
  if (hit) return hit
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(length, 0)
  // concave meniscus up the termination
  s.quadraticCurveTo(length * 0.18, height * 0.12, 0, height)
  s.lineTo(0, 0)
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: 10 })
  g.translate(0, 0, -width / 2)
  filletCache.set(key, g)
  return g
}

/** Gull-wing lead (SOIC/SOT): starts at the body side (x=0) and steps down to a flat foot. */
const gullCache = new Map<string, THREE.BufferGeometry>()
export function gullWingGeometry(reach: number, shoulder: number, width: number, t = 0.2) {
  const key = `${reach}:${shoulder}:${width}:${t}`
  const hit = gullCache.get(key)
  if (hit) return hit
  const footStart = reach * 0.45
  const s = new THREE.Shape()
  // top edge out, then down the bend, then along the foot
  s.moveTo(0, shoulder + t / 2)
  s.lineTo(reach * 0.16, shoulder + t / 2)
  s.bezierCurveTo(reach * 0.3, shoulder + t / 2, reach * 0.26, t, footStart, t)
  s.lineTo(reach, t)
  s.lineTo(reach, 0)
  s.lineTo(footStart - t * 0.6, 0)
  s.bezierCurveTo(reach * 0.2, 0, reach * 0.24, shoulder - t / 2, reach * 0.1, shoulder - t / 2)
  s.lineTo(0, shoulder - t / 2)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 8 })
  g.translate(0, 0, -width / 2)
  gullCache.set(key, g)
  return g
}

/** Moulded IC body with chamfered edges. */
const bodyCache = new Map<string, THREE.BufferGeometry>()
export function mouldedBody(w: number, d: number, h: number, chamfer = 0.12) {
  const key = `${w}:${d}:${h}:${chamfer}`
  const hit = bodyCache.get(key)
  if (hit) return hit
  const r = 0.08
  const s = new THREE.Shape()
  const x0 = -w / 2 + chamfer
  const y0 = -d / 2 + chamfer
  const x1 = w / 2 - chamfer
  const y1 = d / 2 - chamfer
  s.moveTo(x0 + r, y0)
  s.lineTo(x1 - r, y0)
  s.quadraticCurveTo(x1, y0, x1, y0 + r)
  s.lineTo(x1, y1 - r)
  s.quadraticCurveTo(x1, y1, x1 - r, y1)
  s.lineTo(x0 + r, y1)
  s.quadraticCurveTo(x0, y1, x0, y1 - r)
  s.lineTo(x0, y0 + r)
  s.quadraticCurveTo(x0, y0, x0 + r, y0)
  const g = new THREE.ExtrudeGeometry(s, {
    depth: h - chamfer * 2,
    bevelEnabled: true,
    bevelSize: chamfer,
    bevelThickness: chamfer,
    bevelSegments: 2,
    curveSegments: 6,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, chamfer, 0)
  bodyCache.set(key, g)
  return g
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

function Fillets({ fp, termHalf, height }: { fp: FootprintDef; termHalf: number; height: number }) {
  const m = mats()
  return (
    <>
      {fp.pads.map((p) => {
        const s = Math.sign(p.x) || 1
        const len = Math.max(0.12, Math.abs(p.x) + p.w / 2 - termHalf - 0.04)
        const geo = filletGeometry(len, height, Math.min(p.h, fp.body.h) * 0.92)
        return <mesh key={p.num} geometry={geo} material={m.solder} position={[s * termHalf, 0, p.y]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} castShadow />
      })}
    </>
  )
}

/** SMD chip resistor or MLCC capacitor. */
export function ChipPart({ fp, value, isCap }: { fp: FootprintDef; value?: string; isCap: boolean }) {
  const m = mats()
  const { w, h, height } = fp.body
  const end = Math.min(w * 0.2, 0.5)
  const r = Math.min(0.06, h * 0.08)
  const code = useMemo(() => (isCap ? null : resistorCode(value)), [value, isCap])
  return (
    <group>
      <Fillets fp={fp} termHalf={w / 2} height={height * 0.7} />
      {/* ceramic body */}
      <RoundedBox args={[w - 0.02, height, h]} radius={r} smoothness={3} position={[0, height / 2 + 0.02, 0]} castShadow material={isCap ? m.capBody : m.ceramic} />
      {/* terminations */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[end, height + 0.03, h + 0.03]} radius={r} smoothness={3} position={[s * (w / 2 - end / 2), height / 2 + 0.02, 0]} castShadow material={m.tin} />
      ))}
      {/* resistive overglaze + marking */}
      {!isCap && (
        <>
          <mesh position={[0, height + 0.025, 0]} castShadow material={m.resTop}>
            <boxGeometry args={[w - end * 2 - 0.04, 0.03, h - 0.08]} />
          </mesh>
          {code && <Decal tex={labelTexture([code], w - end * 2, h - 0.1)} w={w - end * 2} h={h - 0.1} y={height + 0.042} />}
        </>
      )}
    </group>
  )
}

/** 0805 SMD LED: white reflector body, clear lens, glowing die. */
export function LedChip({ fp, on }: { fp: FootprintDef; on: boolean }) {
  const m = mats()
  const { w, h, height } = fp.body
  return (
    <group>
      <Fillets fp={fp} termHalf={w / 2} height={height * 0.45} />
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.42, 0.32, h + 0.02]} radius={0.05} smoothness={2} position={[s * (w / 2 - 0.21), 0.16, 0]} material={m.tin} castShadow />
      ))}
      <RoundedBox args={[w - 0.5, height * 0.55, h]} radius={0.06} smoothness={3} position={[0, height * 0.28, 0]} material={m.ledBody} castShadow />
      {/* die */}
      <mesh position={[0, height * 0.58, 0]}>
        <boxGeometry args={[0.32, 0.12, 0.32]} />
        <meshStandardMaterial color="#ff3b28" emissive="#ff2a10" emissiveIntensity={on ? 9 : 0.04} toneMapped={false} />
      </mesh>
      {/* clear epoxy lens */}
      <RoundedBox args={[w - 0.55, height * 0.5, h - 0.06]} radius={0.12} smoothness={4} position={[0, height * 0.72, 0]}>
        <meshPhysicalMaterial
          color={on ? '#ffb2a6' : '#ffd7cf'}
          emissive="#ff3a1a"
          emissiveIntensity={on ? 1.6 : 0}
          roughness={0.08}
          transparent
          opacity={0.72}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </RoundedBox>
      {/* cathode mark */}
      <mesh position={[-(w / 2 - 0.55), height * 0.56, 0]} material={m.ledMark}>
        <boxGeometry args={[0.12, 0.02, h - 0.2]} />
      </mesh>
      {on && <pointLight position={[0, 1.2, 0]} color="#ff4a2a" intensity={3} distance={9} decay={2} />}
    </group>
  )
}

/** SOIC / SOT style IC with gull-wing leads. */
export function GullIC({ fp, value, small }: { fp: FootprintDef; value?: string; small?: boolean }) {
  const m = mats()
  const { w, h, height } = fp.body
  const standoff = small ? 0.08 : 0.12
  const bodyH = height - standoff
  const body = mouldedBody(w, h, bodyH, small ? 0.08 : 0.14)
  const leadW = small ? 0.38 : 0.42
  const leads = fp.pads.map((p) => {
    // leads leave the long sides (±x for SOIC, ±y for SOT-23)
    const alongX = !small
    const s = alongX ? Math.sign(p.x) : Math.sign(p.y)
    const bodyEdge = alongX ? w / 2 : h / 2
    const padOuter = (alongX ? Math.abs(p.x) + p.w / 2 : Math.abs(p.y) + p.h / 2) - 0.12
    const reach = padOuter - bodyEdge
    const geo = gullWingGeometry(reach, bodyH * 0.42 + standoff, leadW, small ? 0.13 : 0.2)
    const pos: [number, number, number] = alongX ? [s * bodyEdge, 0, p.y] : [p.x, 0, s * bodyEdge]
    const rotY = alongX ? (s > 0 ? 0 : Math.PI) : s > 0 ? -Math.PI / 2 : Math.PI / 2
    const footLen = reach * 0.5
    const fx = alongX ? s * (padOuter - footLen) : p.x
    const fz = alongX ? p.y : s * (padOuter - footLen)
    return (
      <group key={p.num}>
        <mesh geometry={geo} material={m.tin} position={pos} rotation={[0, rotY, 0]} castShadow />
        {/* solder joint at the toe and heel */}
        <mesh geometry={filletGeometry(0.22, 0.16, leadW * 0.95)} material={m.solder} position={[alongX ? s * padOuter : fx, 0, alongX ? fz : s * padOuter]} rotation={[0, rotY, 0]} />
      </group>
    )
  })
  return (
    <group>
      {leads}
      <mesh geometry={body} material={m.plastic} position={[0, standoff, 0]} castShadow receiveShadow />
      {!small && (
        <>
          {/* pin-1 dimple */}
          <mesh position={[-w / 2 + 0.6, standoff + bodyH + 0.002, -h / 2 + 0.6]} rotation={[-Math.PI / 2, 0, 0]} material={m.dimple}>
            <circleGeometry args={[0.26, 24]} />
          </mesh>
          {value && (
            <Decal tex={labelTexture([value, '2610', 'A'], h * 0.8, w * 0.62)} w={h * 0.8} h={w * 0.62} y={standoff + bodyH + 0.003} rot={Math.PI / 2} />
          )}
        </>
      )}
    </group>
  )
}

/** Through-hole DIP package. */
export function DipIC({ fp, value }: { fp: FootprintDef; value?: string }) {
  const m = mats()
  const { w, h, height } = fp.body
  const lift = 0.5
  return (
    <group>
      {fp.pads.map((p) => {
        const s = Math.sign(p.x)
        return (
          <group key={p.num} position={[p.x, 0, p.y]}>
            <mesh material={m.tin} position={[-s * 0.35, lift + 0.55, 0]} castShadow>
              <boxGeometry args={[0.7, 0.25, 1.4]} />
            </mesh>
            <mesh material={m.tin} position={[0, lift - 0.7, 0]} castShadow>
              <boxGeometry args={[0.25, 2.6, 0.5]} />
            </mesh>
          </group>
        )
      })}
      <mesh geometry={mouldedBody(w, h, height, 0.2)} material={m.plastic} position={[0, lift + 0.4, 0]} castShadow />
      <mesh position={[0, lift + 0.4 + height + 0.002, -h / 2 + 0.05]} rotation={[-Math.PI / 2, 0, 0]} material={m.dimple}>
        <circleGeometry args={[0.7, 24, 0, Math.PI]} />
      </mesh>
      {value && <Decal tex={labelTexture([value, 'P'], h * 0.6, w * 0.5)} w={h * 0.6} h={w * 0.5} y={lift + 0.4 + height + 0.003} rot={Math.PI / 2} />}
    </group>
  )
}

/** 2.54 mm pin header. */
export function Header({ fp }: { fp: FootprintDef }) {
  const m = mats()
  const { w, height } = fp.body
  const pitch = 2.54
  const pinGeo = useMemo(() => {
    // square pin with a pyramid tip
    const g = new THREE.BoxGeometry(0.64, 8.4, 0.64)
    return g
  }, [])
  const tipGeo = useMemo(() => new THREE.ConeGeometry(0.45, 0.5, 4, 1), [])
  return (
    <group>
      {fp.pads.map((p) => (
        <group key={p.num} position={[p.x, 0, p.y]}>
          {/* plastic segment per pin (shows the break-apart notches) */}
          <RoundedBox args={[w - 0.04, height, pitch - 0.06]} radius={0.16} smoothness={3} position={[0, height / 2, 0]} material={m.plastic} castShadow />
          <mesh geometry={pinGeo} material={m.gold} position={[0, 8.4 / 2 - 2.6, 0]} castShadow />
          <mesh geometry={tipGeo} material={m.gold} position={[0, 8.4 - 2.6 + 0.25, 0]} rotation={[0, Math.PI / 4, 0]} castShadow />
          {/* solder cone on the underside */}
          <mesh material={m.solder} position={[0, -1.6 - 0.35, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.85, 0.7, 24]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** 5 mm through-hole LED. */
export function Led5mm({ fp, on }: { fp: FootprintDef; on: boolean }) {
  const m = mats()
  const r = 2.5
  const lens = (
    <meshPhysicalMaterial
      color={on ? '#ff8b7a' : '#ff6d5c'}
      emissive="#ff2a10"
      emissiveIntensity={on ? 1.8 : 0.02}
      roughness={0.06}
      transparent
      opacity={0.78}
      clearcoat={1}
    />
  )
  return (
    <group>
      {fp.pads.map((p) => (
        <mesh key={p.num} material={m.tin} position={[p.x, 0.6, p.y]}>
          <boxGeometry args={[0.45, 2.4, 0.45]} />
        </mesh>
      ))}
      <group position={[0, 1.6, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[r + 0.4, r + 0.4, 1, 40]} />
          {lens}
        </mesh>
        <mesh position={[0, 1 + 2.6, 0]}>
          <cylinderGeometry args={[r, r, 5.2, 40]} />
          {lens}
        </mesh>
        <mesh position={[0, 6.2, 0]}>
          <sphereGeometry args={[r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {lens}
        </mesh>
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[0.6, 0.4, 0.6]} />
          <meshStandardMaterial color="#ff4030" emissive="#ff2a10" emissiveIntensity={on ? 10 : 0} toneMapped={false} />
        </mesh>
      </group>
      {on && <pointLight position={[0, 6, 0]} color="#ff3a20" intensity={6} distance={18} decay={2} />}
    </group>
  )
}

/** Axial through-hole resistor with colour bands and bent leads. */
export function Axial({ fp, value }: { fp: FootprintDef; value?: string }) {
  const m = mats()
  const { w, h } = fp.body
  const r = h / 2
  const bands = useMemo(() => bandColors(value), [value])
  const leadGeo = useMemo(() => {
    const half = Math.abs(fp.pads[0].x)
    const y = r + 0.4
    const path = new THREE.CurvePath<THREE.Vector3>()
    path.add(new THREE.LineCurve3(new THREE.Vector3(-half, -1.6, 0), new THREE.Vector3(-half, y - 0.6, 0)))
    path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-half, y - 0.6, 0), new THREE.Vector3(-half, y, 0), new THREE.Vector3(-half + 0.6, y, 0)))
    path.add(new THREE.LineCurve3(new THREE.Vector3(-half + 0.6, y, 0), new THREE.Vector3(half - 0.6, y, 0)))
    path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(half - 0.6, y, 0), new THREE.Vector3(half, y, 0), new THREE.Vector3(half, y - 0.6, 0)))
    path.add(new THREE.LineCurve3(new THREE.Vector3(half, y - 0.6, 0), new THREE.Vector3(half, -1.6, 0)))
    return new THREE.TubeGeometry(path, 80, 0.25, 10, false)
  }, [fp, r])
  return (
    <group>
      <mesh geometry={leadGeo} material={m.tin} castShadow />
      <group position={[0, r + 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={m.axialBody} castShadow>
          <capsuleGeometry args={[r, w - h, 8, 24]} />
        </mesh>
        {bands.map((c, i) => (
          <mesh key={i} position={[0, -w / 2 + 1.3 + i * 0.95 + (i === bands.length - 1 ? 0.5 : 0), 0]}>
            <cylinderGeometry args={[r + 0.02, r + 0.02, 0.42, 24]} />
            <meshStandardMaterial color={c} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function Sot23({ fp }: { fp: FootprintDef }) {
  return <GullIC fp={fp} small />
}

/* ------------------------------------------------------------------ */

export function resistorCode(value?: string) {
  if (!value) return ''
  const m = value.match(/([\d.]+)\s*([kKmM]?)/)
  if (!m) return ''
  let ohms = parseFloat(m[1])
  if (m[2].toLowerCase() === 'k') ohms *= 1e3
  if (m[2] === 'M') ohms *= 1e6
  if (ohms < 10) return `${ohms}`.replace('.', 'R')
  const exp = Math.floor(Math.log10(ohms)) - 1
  const sig = Math.round(ohms / 10 ** exp)
  return `${sig}${exp}`
}

const BAND = ['#111111', '#7a4a1e', '#d0312d', '#f08a24', '#f1d22c', '#3a9a4a', '#2f62c9', '#7e4cc2', '#8d8d8d', '#f5f5f5']
function bandColors(value?: string) {
  const code = resistorCode(value || '10k')
  const d1 = +code[0] || 1
  const d2 = +code[1] || 0
  const mult = +code.slice(2) || 0
  return [BAND[d1], BAND[d2], BAND[Math.min(9, mult)], '#c9a23a']
}
