/*
 * Hand-modelled props for lesson thumbnails (units: mm, +Y up). Everything is built from
 * primitives + canvas textures so there are no external assets.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Billboard, RoundedBox } from '@react-three/drei'
import { mats } from '@/pcb/parts3d'
import { canvasTex, glowTex, rrect } from './textures'

/* ------------------------------------------------------------------ */
/* Glow                                                                */
/* ------------------------------------------------------------------ */

/** A camera-facing soft halo (writes alpha, so it survives a transparent background). */
export function Glow({ size, color = '#ff3a1a', opacity = 1, position }: { size: number; color?: string; opacity?: number; position?: [number, number, number] }) {
  const tex = glowTex(color)
  return (
    <Billboard position={position} userData={{ noFit: true }}>
      <mesh renderOrder={10} userData={{ noFit: true }}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
    </Billboard>
  )
}

/* ------------------------------------------------------------------ */
/* Wires & leads                                                       */
/* ------------------------------------------------------------------ */

export function Tube({ pts, r, material, color, smooth = true, segments = 96 }: { pts: [number, number, number][]; r: number; material?: THREE.Material; color?: string; smooth?: boolean; segments?: number }) {
  const geo = useMemo(() => {
    const v = pts.map((p) => new THREE.Vector3(...p))
    const curve = smooth ? new THREE.CatmullRomCurve3(v, false, 'centripetal', 0.5) : polyCurve(v)
    return new THREE.TubeGeometry(curve, segments, r, 14, false)
  }, [pts, r, smooth, segments])
  return (
    <mesh geometry={geo} material={material} castShadow receiveShadow>
      {!material && <meshPhysicalMaterial color={color ?? '#d33'} roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.3} />}
    </mesh>
  )
}

function polyCurve(v: THREE.Vector3[]) {
  const path = new THREE.CurvePath<THREE.Vector3>()
  for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i], v[i + 1]))
  return path
}

/** Insulated hook-up wire with stripped, tinned ends. */
export function Wire({ pts, color, r = 0.55 }: { pts: [number, number, number][]; color: string; r?: number }) {
  const m = mats()
  const n = pts.length
  // short bare copper tips
  const tip = (a: [number, number, number], b: [number, number, number]): [number, number, number][] => {
    const d = new THREE.Vector3(...a).sub(new THREE.Vector3(...b)).normalize()
    const end = new THREE.Vector3(...a).addScaledVector(d, 1.4)
    return [a, [end.x, end.y, end.z]]
  }
  return (
    <group>
      <Tube pts={pts} r={r} color={color} />
      <Tube pts={tip(pts[0], pts[1])} r={r * 0.42} material={m.copper} smooth={false} segments={4} />
      <Tube pts={tip(pts[n - 1], pts[n - 2])} r={r * 0.42} material={m.copper} smooth={false} segments={4} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Loose components (lying on a table, not soldered)                   */
/* ------------------------------------------------------------------ */

const BAND = ['#111111', '#7a4a1e', '#d0312d', '#f08a24', '#f1d22c', '#3a9a4a', '#2f62c9', '#7e4cc2', '#8d8d8d', '#f5f5f5']

/** Axial resistor with straight leads, lying along X; body centre at y = r. */
export function LooseResistor({ bands = [1, 0, 2], body = '#d9c08a', len = 6.4, r = 1.25, lead = 6, gold = true, leadDrop = 0, noLeads = false }: { bands?: number[]; body?: string; len?: number; r?: number; lead?: number; gold?: boolean; leadDrop?: number; noLeads?: boolean }) {
  const m = mats()
  const prof = useMemo(() => {
    // dog-bone profile: fat end caps, slimmer middle
    const pts: THREE.Vector2[] = []
    const L = len / 2
    const add = (x: number, y: number) => pts.push(new THREE.Vector2(Math.max(0.001, x), y))
    add(0, -L)
    add(r * 0.55, -L)
    add(r * 0.86, -L + 0.12)
    add(r * 1.0, -L + 0.45)
    add(r * 1.02, -L + 1.2)
    add(r * 0.9, -L + 1.75)
    add(r * 0.88, 0)
    add(r * 0.9, L - 1.75)
    add(r * 1.02, L - 1.2)
    add(r * 1.0, L - 0.45)
    add(r * 0.86, L - 0.12)
    add(r * 0.55, L)
    add(0, L)
    return new THREE.LatheGeometry(pts, 40)
  }, [len, r])
  const bandX = [-len / 2 + 0.9, -len / 2 + 1.9, -len / 2 + 2.75, len / 2 - 1.0]
  const cols = [...bands.map((b) => BAND[b]), gold ? '#c9a23a' : '#c0c0c0']
  const bandR = (x: number) => (Math.abs(x) > len / 2 - 1.8 ? r * 1.03 : r * 0.91)
  return (
    <group position={[0, r, 0]}>
      <mesh geometry={prof} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <meshPhysicalMaterial color={body} roughness={0.5} clearcoat={0.5} clearcoatRoughness={0.35} />
      </mesh>
      {cols.map((c, i) => (
        <mesh key={i} position={[bandX[i], 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[bandR(bandX[i]), bandR(bandX[i]), 0.42, 40]} />
          <meshPhysicalMaterial color={c} roughness={0.45} clearcoat={0.5} metalness={i === 3 && gold ? 0.6 : 0} />
        </mesh>
      ))}
      {!noLeads && [-1, 1].map((s) => (
        <Tube
          key={s}
          pts={[
            [s * (len / 2 - 0.1), 0, 0],
            [s * (len / 2 + lead * 0.7), -leadDrop * 0.6, 0],
            [s * (len / 2 + lead), -leadDrop, 0],
          ]}
          r={0.26}
          material={m.tin}
          segments={24}
        />
      ))}
    </group>
  )
}

/** Ceramic disc capacitor standing on its legs (legs end at y = 0). */
export function CeramicDisc({ label = '104', color = '#e08a2c' }: { label?: string; color?: string }) {
  const m = mats()
  const R = 2.6
  const disc = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 48, 24)
    g.scale(R, R * 1.02, 0.95)
    return g
  }, [])
  const tex = canvasTex(`disc:${label}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(40,20,5,0.85)'
    ctx.font = `600 ${w * 0.26}px "IBM Plex Mono", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, w / 2, h * 0.47)
  })
  return (
    <group>
      {[-1, 1].map((s) => (
        <Tube
          key={s}
          pts={[
            [s * 1.25, 0, 0],
            [s * 1.25, 2.2, 0],
            [s * 0.9, 3.4, 0],
            [s * 0.6, 4.6, 0],
          ]}
          r={0.24}
          material={m.tin}
          segments={24}
        />
      ))}
      {/* dipped epoxy drips down the legs */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.7, 4.2, 0]} castShadow>
          <sphereGeometry args={[0.55, 20, 12]} />
          <meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.7} />
        </mesh>
      ))}
      <mesh geometry={disc} position={[0, 4.6 + R * 0.92, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial map={tex} roughness={0.42} clearcoat={0.8} clearcoatRoughness={0.25} />
      </mesh>
    </group>
  )
}

/** Radial electrolytic capacitor standing upright (legs end at y = 0). */
export function Electrolytic({ r = 3.2, h = 8, sleeve = '#1f3f8a', stripe = '#cfd8ea', label = '100µF' }: { r?: number; h?: number; sleeve?: string; stripe?: string; label?: string }) {
  const m = mats()
  const can = useMemo(() => {
    // sleeve profile with the rolled groove near the bottom and a rounded top lip
    const p: THREE.Vector2[] = []
    const add = (x: number, y: number) => p.push(new THREE.Vector2(x, y))
    add(0.001, 0)
    add(r * 0.8, 0)
    add(r - 0.12, 0.05)
    add(r, 0.3)
    add(r, 1.0)
    add(r - 0.22, 1.25)
    add(r - 0.22, 1.5)
    add(r, 1.75)
    add(r, h - 0.4)
    add(r - 0.12, h - 0.12)
    add(r - 0.35, h)
    add(0.001, h)
    return new THREE.LatheGeometry(p, 64)
  }, [r, h])
  const sleeveTex = canvasTex(`ecap:${sleeve}:${stripe}:${label}`, 1024, 512, (ctx, w, hh) => {
    ctx.fillStyle = sleeve
    ctx.fillRect(0, 0, w, hh)
    // polarity stripe with minus signs (sits around u ≈ 0.62 → faces the camera)
    const sx = w * 0.56
    const sw = w * 0.13
    ctx.fillStyle = stripe
    ctx.fillRect(sx, 0, sw, hh)
    ctx.fillStyle = sleeve
    for (let i = 0; i < 4; i++) ctx.fillRect(sx + sw * 0.28, hh * (0.2 + i * 0.18), sw * 0.44, hh * 0.045)
    // value printing
    ctx.save()
    ctx.translate(w * 0.86, hh * 0.5)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = 'rgba(235,240,250,0.9)'
    ctx.font = `600 ${hh * 0.11}px "IBM Plex Mono", monospace`
    ctx.textAlign = 'center'
    ctx.fillText(label, 0, 0)
    ctx.fillText('25V', 0, hh * 0.13)
    ctx.restore()
  })
  const top = canvasTex('ecap-top', 256, 256, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    g.addColorStop(0, '#e9ecef')
    g.addColorStop(1, '#b8bec6')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, w)
    // pressure vent "K" score
    ctx.strokeStyle = 'rgba(70,75,85,0.75)'
    ctx.lineWidth = w * 0.025
    ctx.beginPath()
    ctx.moveTo(w * 0.5, w * 0.18)
    ctx.lineTo(w * 0.5, w * 0.82)
    ctx.moveTo(w * 0.5, w * 0.5)
    ctx.lineTo(w * 0.22, w * 0.25)
    ctx.moveTo(w * 0.5, w * 0.5)
    ctx.lineTo(w * 0.78, w * 0.25)
    ctx.stroke()
  })
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.25, 0.5, 0]} material={m.tin} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 1.2, 12]} />
        </mesh>
      ))}
      <group position={[0, 1.0, 0]}>
        <mesh geometry={can} castShadow receiveShadow>
          <meshPhysicalMaterial map={sleeveTex} roughness={0.32} clearcoat={0.9} clearcoatRoughness={0.18} />
        </mesh>
        <mesh position={[0, h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r - 0.36, 48]} />
          <meshStandardMaterial map={top} metalness={0.9} roughness={0.32} />
        </mesh>
      </group>
    </group>
  )
}

/** 5 mm LED lying loose / standing on long legs (legs end at y = 0). */
export function LooseLed({ color = '#ff3a22', on = false, legs = 6, glow = 1, spread = 0.9 }: { color?: string; on?: boolean; legs?: number; glow?: number; spread?: number }) {
  const m = mats()
  const r = 2.5
  const lens = (
    <meshPhysicalMaterial
      color={color}
      emissive={color}
      emissiveIntensity={on ? 1.3 : 0.05}
      roughness={0.08}
      transmission={0}
      transparent
      opacity={on ? 0.9 : 0.82}
      clearcoat={1}
      clearcoatRoughness={0.04}
    />
  )
  const dome = useMemo(() => {
    const p: THREE.Vector2[] = []
    p.push(new THREE.Vector2(0.001, 0))
    p.push(new THREE.Vector2(r + 0.45, 0))
    p.push(new THREE.Vector2(r + 0.45, 1.0))
    p.push(new THREE.Vector2(r, 1.0))
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * (Math.PI / 2)
      const y = 1 + 4.2 + Math.sin(a) * r
      p.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * r), i === 0 ? 1 : y))
    }
    return new THREE.LatheGeometry(p, 48)
  }, [])
  return (
    <group>
      {/* legs: anode longer, cathode bent */}
      <Tube pts={[[spread, 0, 0], [spread, legs * 0.5, 0], [0.75, legs + 0.3, 0]]} r={0.22} material={m.tin} segments={16} />
      <Tube pts={[[-spread, 0, 0], [-spread, legs * 0.5, 0], [-0.75, legs + 0.3, 0]]} r={0.22} material={m.tin} segments={16} />
      <group position={[0, legs, 0]}>
        <mesh geometry={dome} castShadow>
          {lens}
        </mesh>
        {/* anvil + post inside the lens */}
        <mesh position={[-0.55, 2.0, 0]} material={m.tin}>
          <boxGeometry args={[1.0, 1.8, 0.4]} />
        </mesh>
        <mesh position={[0.6, 1.9, 0]} material={m.tin}>
          <boxGeometry args={[0.45, 1.6, 0.4]} />
        </mesh>
        <mesh position={[-0.45, 3.05, 0]}>
          <boxGeometry args={[0.5, 0.3, 0.5]} />
          <meshStandardMaterial color="#fff0e0" emissive={color} emissiveIntensity={on ? 14 : 0} toneMapped={false} />
        </mesh>
        {on && (
          <>
            <pointLight position={[0, 4, 0]} color={color} intensity={40} distance={30} decay={2} />
            <Glow size={22 * glow} color={color} position={[0, 4.4, 0]} opacity={0.9} />
          </>
        )}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Stationery                                                          */
/* ------------------------------------------------------------------ */

/** Pencil lying along +X (tip at +X), resting on y = 0. */
export function Pencil({ len = 60, r = 3.6, body = '#f2b51f' }: { len?: number; r?: number; body?: string }) {
  const hex = useMemo(() => {
    const g = new THREE.CylinderGeometry(r, r, len, 6, 1)
    g.rotateZ(-Math.PI / 2)
    return g
  }, [r, len])
  const cone = useMemo(() => {
    const p = [new THREE.Vector2(r * 0.98, 0), new THREE.Vector2(r * 0.4, 7.2), new THREE.Vector2(r * 0.22, 8.3), new THREE.Vector2(0.001, 9.4)]
    const g = new THREE.LatheGeometry(p, 36)
    g.rotateZ(-Math.PI / 2)
    return g
  }, [r])
  const lead = useMemo(() => {
    const p = [new THREE.Vector2(r * 0.25, 7.6), new THREE.Vector2(0.001, 9.5)]
    const g = new THREE.LatheGeometry(p, 24)
    g.rotateZ(-Math.PI / 2)
    return g
  }, [r])
  const m = mats()
  return (
    <group position={[0, r * 0.87, 0]} rotation={[Math.PI / 6, 0, 0]}>
      <mesh geometry={hex} castShadow receiveShadow>
        <meshPhysicalMaterial color={body} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} flatShading />
      </mesh>
      {/* sharpened wood + graphite */}
      <mesh geometry={cone} position={[len / 2, 0, 0]} castShadow>
        <meshStandardMaterial color="#e7c08b" roughness={0.85} />
      </mesh>
      <mesh geometry={lead} position={[len / 2 + 0.05, 0, 0]}>
        <meshStandardMaterial color="#2b2b2f" roughness={0.35} metalness={0.4} />
      </mesh>
      {/* ferrule + eraser */}
      <mesh position={[-len / 2 - 2.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.tin} castShadow>
        <cylinderGeometry args={[r * 1.02, r * 1.02, 4.4, 36]} />
      </mesh>
      {[-1.4, 0, 1.4].map((x) => (
        <mesh key={x} position={[-len / 2 - 2.2 + x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.tin}>
          <torusGeometry args={[r * 1.02, 0.18, 8, 36]} />
        </mesh>
      ))}
      <mesh position={[-len / 2 - 4.4 - 2.4, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[r * 0.98, 3.4, 8, 36]} />
        <meshStandardMaterial color="#f08a95" roughness={0.75} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Paper                                                               */
/* ------------------------------------------------------------------ */

/**
 * A sheet of paper lying on y = 0 with a gentle curl lifting one end, printed with `map`.
 * w along X, h along Z.
 */
export function Paper({ w, h, map, curl = 3, curlFrom = 0.72, side = 'x' }: { w: number; h: number; map: THREE.Texture | null; curl?: number; curlFrom?: number; side?: 'x' | 'z' }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, 80, 60)
    g.rotateX(-Math.PI / 2)
    const pos = g.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const t = side === 'x' ? (x + w / 2) / w : (z + h / 2) / h
      let y = 0.02
      if (t > curlFrom) {
        const k = (t - curlFrom) / (1 - curlFrom)
        y += curl * k * k
      }
      // a slight sag across the other axis
      const q = side === 'x' ? z / (h / 2) : x / (w / 2)
      y += 0.25 * (1 - q * q) * (t > curlFrom ? (t - curlFrom) / (1 - curlFrom) : 0)
      pos.setY(i, y)
    }
    g.computeVertexNormals()
    return g
  }, [w, h, curl, curlFrom, side])
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial key={map ? 1 : 0} map={map ?? undefined} color={map ? '#ffffff' : '#fbfaf6'} roughness={0.88} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Shared label helper                                                 */
/* ------------------------------------------------------------------ */

export function textTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  return canvasTex(key, w, h, draw)
}

export { RoundedBox, rrect }
