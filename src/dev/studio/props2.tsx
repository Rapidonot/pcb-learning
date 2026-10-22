/*
 * Larger props for lesson thumbnails: battery, breadboard, laptop, pens, magnifier, squeegee,
 * shipping box, solder spool and soldering iron. Units: mm, +Y up, resting on y = 0 unless noted.
 */
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { mats } from '@/pcb/parts3d'
import { canvasTex, rrect } from './textures'
import { Glow, Tube } from './props'
import { faceGeometry } from './board'

const ACCENT = '#e0542c'

/* ------------------------------------------------------------------ */
/* Arrows & guide lines                                                */
/* ------------------------------------------------------------------ */

export function accentMat() {
  return <meshPhysicalMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.25} roughness={0.35} clearcoat={0.8} />
}

/** A tube arrow along a smooth path, with a cone head at the end. */
export function Arrow({ pts, r = 0.5, head = 2.2, color = ACCENT }: { pts: [number, number, number][]; r?: number; head?: number; color?: string }) {
  const { geo, end, dir } = useMemo(() => {
    const v = pts.map((p) => new THREE.Vector3(...p))
    const curve = new THREE.CatmullRomCurve3(v)
    const len = curve.getLength()
    const tEnd = 1 - head / len
    const end = curve.getPointAt(tEnd)
    const dir = curve.getTangentAt(tEnd)
    const pts2 = curve.getSpacedPoints(64).filter((_, i) => i / 64 <= tEnd)
    pts2.push(end)
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 64, r, 16, false)
    return { geo, end, dir }
  }, [pts, r, head])
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), [dir])
  const mat = <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.35} clearcoat={0.8} />
  return (
    <group>
      <mesh geometry={geo} castShadow>
        {mat}
      </mesh>
      <mesh position={end.clone().addScaledVector(dir, head / 2)} quaternion={q} castShadow>
        <coneGeometry args={[r * 2.4, head, 28]} />
        {mat}
      </mesh>
      <mesh position={end} quaternion={q}>
        <cylinderGeometry args={[r * 2.4, r * 2.4, 0.05, 28]} />
        {mat}
      </mesh>
    </group>
  )
}

/** Dashed straight line made of little rods. */
export function Dashes({ a, b, r = 0.12, dash = 0.8, gap = 0.6, color = ACCENT, emissive = 0.4 }: { a: [number, number, number]; b: [number, number, number]; r?: number; dash?: number; gap?: number; color?: string; emissive?: number }) {
  const segs = useMemo(() => {
    const A = new THREE.Vector3(...a)
    const B = new THREE.Vector3(...b)
    const len = A.distanceTo(B)
    const dir = B.clone().sub(A).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    const out: { p: THREE.Vector3; l: number }[] = []
    for (let t = 0; t < len; t += dash + gap) {
      const l = Math.min(dash, len - t)
      out.push({ p: A.clone().addScaledVector(dir, t + l / 2), l })
    }
    return { out, q }
  }, [a, b, dash, gap])
  return (
    <group userData={{ noFit: true }}>
      {segs.out.map((s, i) => (
        <mesh key={i} position={s.p} quaternion={segs.q} userData={{ noFit: true }}>
          <cylinderGeometry args={[r, r, s.l, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 9 V battery (lying down, terminals toward +X)                       */
/* ------------------------------------------------------------------ */

export function Battery9V() {
  const m = mats()
  const L = 46
  const H = 17.5
  const D = 26.5
  const top = canvasTex('bat9v-top', 1024, 600, (ctx, w, h) => {
    ctx.fillStyle = '#232327'
    ctx.fillRect(0, 0, w, h)
    // copper band toward the terminal end (+x = right)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#f08a3c')
    g.addColorStop(0.5, '#d9622a')
    g.addColorStop(1, '#b84a1f')
    ctx.fillStyle = g
    ctx.fillRect(w * 0.55, 0, w * 0.45, h)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(w * 0.55, 0, w * 0.012, h)
    ctx.fillStyle = '#fff6ea'
    ctx.font = `700 ${h * 0.5}px "Inter Tight Variable", "Inter Tight", sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText('9V', w * 0.3, h * 0.52)
    ctx.font = `600 ${h * 0.08}px "IBM Plex Mono", monospace`
    ctx.fillStyle = 'rgba(255,240,225,0.75)'
    ctx.fillText('ALKALINE', w * 0.3, h * 0.84)
    ctx.fillStyle = 'rgba(40,20,10,0.85)'
    ctx.font = `700 ${h * 0.16}px "IBM Plex Mono", monospace`
    ctx.fillText('+  −', w * 0.78, h * 0.5)
  })
  const side = canvasTex('bat9v-side', 1024, 400, (ctx, w, h) => {
    ctx.fillStyle = '#232327'
    ctx.fillRect(0, 0, w, h)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#e9793a')
    g.addColorStop(1, '#c4521f')
    ctx.fillStyle = g
    ctx.fillRect(w * 0.55, 0, w * 0.45, h)
    ctx.fillStyle = 'rgba(255,240,225,0.7)'
    ctx.font = `600 ${h * 0.14}px "IBM Plex Mono", monospace`
    ctx.textBaseline = 'middle'
    ctx.fillText('9 VOLT  ·  6LR61', w * 0.06, h * 0.5)
  })
  const labelMat = (map: THREE.Texture) => <meshPhysicalMaterial map={map} roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.2} />
  return (
    <group position={[0, H / 2, 0]}>
      <RoundedBox args={[L, H, D]} radius={1.6} smoothness={4} castShadow receiveShadow>
        <meshPhysicalMaterial color="#26262a" roughness={0.35} clearcoat={0.6} />
      </RoundedBox>
      {/* wrap label on the top and front faces */}
      <mesh position={[0, H / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L - 3.2, D - 3.2]} />
        {labelMat(top)}
      </mesh>
      <mesh position={[0, 0, D / 2 + 0.01]}>
        <planeGeometry args={[L - 3.2, H - 3.2]} />
        {labelMat(side)}
      </mesh>
      {/* terminal cap */}
      <RoundedBox args={[1.6, H - 1.2, D - 1.2]} radius={0.6} smoothness={3} position={[L / 2 + 0.4, 0, 0]} castShadow>
        <meshStandardMaterial color="#141416" roughness={0.6} />
      </RoundedBox>
      {/* + : round stud, − : hexagonal socket */}
      <group position={[L / 2 + 1.2, 0, -6.4]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh material={m.tin} position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[2.4, 2.6, 2.4, 32]} />
        </mesh>
        <mesh material={m.tin} position={[0, 2.5, 0]} castShadow>
          <cylinderGeometry args={[2.0, 2.4, 0.4, 32]} />
        </mesh>
      </group>
      <group position={[L / 2 + 1.2, 0, 6.4]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh material={m.tin} position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[3.6, 3.6, 2.4, 6, 1, true]} />
        </mesh>
        <mesh material={m.tin} position={[0, 2.4, 0]} rotation={[0, Math.PI / 6, 0]}>
          <torusGeometry args={[3.3, 0.35, 8, 6]} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[3.4, 3.4, 0.2, 6]} />
          <meshStandardMaterial color="#0e0e10" />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Solderless breadboard                                               */
/* ------------------------------------------------------------------ */

export const BB = { cols: 17, pitch: 2.54, w: 47, d: 41, h: 7 }
/** World x/z of a hole. row 0–9 (a–j, channel between 4 and 5); rail rows: -2,-1 (back) 10,11 (front). */
export function bbHole(col: number, row: number): [number, number] {
  const p = BB.pitch
  const x = (col - (BB.cols - 1) / 2) * p
  let z: number
  if (row >= 0 && row <= 9) z = (row - 4.5) * p + (row >= 5 ? 1.27 : -1.27)
  else if (row < 0) z = -(4.5 * p + 1.27) - p * 1.2 + (row + 1) * p
  else z = 4.5 * p + 1.27 + p * 1.2 + (row - 10) * p
  return [x, z]
}

export function Breadboard({ children }: { children?: ReactNode }) {
  const { w, d, h } = BB
  const ppm = 28
  const draw = (pass: 'c' | 'b') => (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    ctx.fillStyle = pass === 'c' ? '#f3f0e8' : '#fff'
    ctx.fillRect(0, 0, cw, ch)
    ctx.scale(cw / w, ch / d)
    ctx.translate(w / 2, d / 2)
    // centre channel
    ctx.fillStyle = pass === 'c' ? '#d9d4c7' : '#555'
    ctx.fillRect(-w / 2, -0.9, w, 1.8)
    // rails stripes
    const railZ = (r: number) => bbHole(0, r)[1]
    if (pass === 'c') {
      ctx.fillStyle = '#d8453a'
      ctx.fillRect(-w / 2 + 2, railZ(-2) - 1.7, w - 4, 0.35)
      ctx.fillRect(-w / 2 + 2, railZ(10) - 1.7, w - 4, 0.35)
      ctx.fillStyle = '#3768c9'
      ctx.fillRect(-w / 2 + 2, railZ(-1) + 1.35, w - 4, 0.35)
      ctx.fillRect(-w / 2 + 2, railZ(11) + 1.35, w - 4, 0.35)
    }
    for (let c = 0; c < BB.cols; c++) {
      for (const r of [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
        if (r < 0 || r > 9) if (c % 6 === 5) continue
        const [x, z] = bbHole(c, r)
        ctx.fillStyle = pass === 'c' ? '#3a3631' : '#000'
        ctx.beginPath()
        ctx.roundRect(x - 0.5, z - 0.5, 1.0, 1.0, 0.15)
        ctx.fill()
      }
    }
  }
  const color = canvasTex('bb-c', w * ppm, d * ppm, draw('c'))
  const bump = canvasTex('bb-b', w * ppm, d * ppm, draw('b'), true)
  const face = useMemo(() => faceGeometry(w - 0.6, d - 0.6, 1.2), [w, d])
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.9} smoothness={4} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#efece4" roughness={0.45} clearcoat={0.3} />
      </RoundedBox>
      <mesh geometry={face} rotation={[-Math.PI / 2, 0, 0]} position={[0, h + 0.01, 0]} receiveShadow>
        <meshPhysicalMaterial map={color} bumpMap={bump} bumpScale={3} roughness={0.5} clearcoat={0.25} />
      </mesh>
      <group position={[0, h, 0]}>{children}</group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Laptop                                                               */
/* ------------------------------------------------------------------ */

export function Laptop({ screen, tilt = 0.22 }: { screen: THREE.Texture | null; tilt?: number }) {
  const W = 46
  const D = 31
  const T = 1.8
  const deck = canvasTex('laptop-deck', 1380, 930, (ctx, w, h) => {
    ctx.fillStyle = '#4b4e56'
    ctx.fillRect(0, 0, w, h)
    const s = w / W
    // key well
    ctx.fillStyle = '#2c2e33'
    rrect(ctx, 3 * s, 2.2 * s, (W - 6) * s, 15.5 * s, 0.8 * s)
    ctx.fill()
    const rows = 6
    const kw = (W - 7) / 14
    for (let r = 0; r < rows; r++) {
      const y = 2.8 + r * 2.5
      let x = 3.6
      for (let k = 0; k < 14; k++) {
        let ww = kw - 0.35
        if (r === 5 && k === 4) ww = kw * 5 - 0.35
        if (r === 5 && k > 4 && k < 9) continue
        ctx.fillStyle = '#17181b'
        rrect(ctx, x * s, y * s, ww * s, (r === 0 ? 1.4 : 2.1) * s, 0.35 * s)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.fillRect(x * s, y * s, ww * s, 0.25 * s)
        x += ww + 0.35
      }
    }
    // trackpad
    ctx.fillStyle = '#55585f'
    rrect(ctx, (W / 2 - 8) * s, 19 * s, 16 * s, 10 * s, 1 * s)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 0.12 * s
    ctx.stroke()
  })
  const lidGeo = useMemo(() => faceGeometry(W - 0.2, D - 0.2, 1.4), [])
  const scrGeo = useMemo(() => faceGeometry(W - 3.2, D - 4.6, 0.3), [])
  return (
    <group>
      {/* base */}
      <RoundedBox args={[W, T, D]} radius={0.7} smoothness={4} position={[0, T / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#5a5d66" metalness={0.75} roughness={0.38} />
      </RoundedBox>
      <mesh geometry={lidGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, T + 0.01, 0]}>
        <meshStandardMaterial map={deck} metalness={0.5} roughness={0.45} />
      </mesh>
      {/* lid hinged at the back edge, leaning back by `tilt` */}
      <group position={[0, T, -D / 2 + 0.6]} rotation={[-tilt, 0, 0]}>
        <RoundedBox args={[W, D, 1.1]} radius={0.5} smoothness={4} position={[0, D / 2, -0.55]} castShadow receiveShadow>
          <meshStandardMaterial color="#5a5d66" metalness={0.75} roughness={0.38} />
        </RoundedBox>
        <mesh geometry={lidGeo} position={[0, D / 2, 0.01]}>
          <meshStandardMaterial color="#0d0e10" roughness={0.2} />
        </mesh>
        <mesh geometry={scrGeo} position={[0, D / 2 + 0.7, 0.02]}>
          <meshStandardMaterial
            key={screen ? 1 : 0}
            color="#000"
            emissive="#ffffff"
            emissiveMap={screen ?? undefined}
            emissiveIntensity={screen ? 1.0 : 0}
            roughness={0.12}
          />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Fineliner pen (tip at origin, body going up along +Y)               */
/* ------------------------------------------------------------------ */

export function Pen({ len = 46, r = 1.7, body = '#1f2a38', accent = ACCENT }: { len?: number; r?: number; body?: string; accent?: string }) {
  const m = mats()
  const tip = useMemo(() => {
    const p = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.28, 0.15), new THREE.Vector2(0.3, 1.6), new THREE.Vector2(0.6, 2.0), new THREE.Vector2(r * 0.95, 6.5), new THREE.Vector2(r, 7)]
    return new THREE.LatheGeometry(p, 32)
  }, [r])
  return (
    <group>
      <mesh geometry={tip} castShadow>
        <meshStandardMaterial color="#b9bdc4" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshStandardMaterial color="#121214" roughness={0.4} />
      </mesh>
      {/* grip */}
      <mesh position={[0, 7 + 5, 0]} castShadow>
        <cylinderGeometry args={[r * 1.04, r, 10, 36]} />
        <meshPhysicalMaterial color={accent} roughness={0.55} clearcoat={0.3} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[0, 8 + i * 1.5, 0]}>
          <torusGeometry args={[r * 1.02, 0.12, 8, 36]} />
          <meshPhysicalMaterial color={accent} roughness={0.5} />
        </mesh>
      ))}
      {/* barrel */}
      <mesh position={[0, 17 + (len - 17) / 2, 0]} castShadow>
        <cylinderGeometry args={[r * 1.05, r * 1.05, len - 17, 36]} />
        <meshPhysicalMaterial color={body} roughness={0.28} clearcoat={0.9} clearcoatRoughness={0.15} />
      </mesh>
      <mesh position={[0, len, 0]} castShadow>
        <sphereGeometry args={[r * 1.05, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={body} roughness={0.28} clearcoat={0.9} />
      </mesh>
      {/* clip */}
      <mesh position={[0, len - 8, r * 1.25]} material={m.tin} castShadow>
        <boxGeometry args={[1.1, 15, 0.45]} />
      </mesh>
      <mesh position={[0, len - 15.5, r * 1.05]} material={m.tin}>
        <sphereGeometry args={[0.55, 16, 8]} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Magnifying glass (lens centre at origin, lying flat, handle to −x)   */
/* ------------------------------------------------------------------ */

export function Magnifier({ R = 9, handle = 24, children }: { R?: number; handle?: number; children?: ReactNode }) {
  const m = mats()
  return (
    <group>
      {children}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[R, 0.85, 20, 72]} />
        <meshPhysicalMaterial color="#1c1c20" roughness={0.3} clearcoat={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
        <torusGeometry args={[R - 0.75, 0.22, 10, 72]} />
      </mesh>
      {/* the glass: thin, mostly clear, strong reflections */}
      <mesh>
        <cylinderGeometry args={[R - 0.5, R - 0.5, 0.9, 64]} />
        <meshPhysicalMaterial color="#e8f6ff" transparent opacity={0.18} roughness={0.02} clearcoat={1} clearcoatRoughness={0} envMapIntensity={2.2} depthWrite={false} />
      </mesh>
      {/* handle */}
      <group position={[-R - 0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={m.gold} position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[1.25, 1.25, 3.2, 28]} />
        </mesh>
        <mesh position={[0, 3.2 + handle / 2, 0]} castShadow>
          <cylinderGeometry args={[1.9, 1.5, handle, 32]} />
          <meshPhysicalMaterial color="#8a5631" roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.3} />
        </mesh>
        <mesh position={[0, 3.2 + handle, 0]} castShadow>
          <sphereGeometry args={[1.9, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color="#8a5631" roughness={0.45} clearcoat={0.6} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * A flat disc that shows a magnified part of `map` (for faking a magnifier lens in an ortho view).
 * (u0, v0): centre in texture space; span: texture-space radius shown.
 */
export function MagnifiedDisc({ map, R, u0, v0, spanU, spanV }: { map: THREE.Texture | null; R: number; u0: number; v0: number; spanU: number; spanV: number }) {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(R, 64)
    const pos = g.getAttribute('position')
    const uv = g.getAttribute('uv')
    for (let i = 0; i < pos.count; i++) uv.setXY(i, u0 + (pos.getX(i) / R) * spanU, v0 + (pos.getY(i) / R) * spanV)
    g.rotateX(-Math.PI / 2)
    return g
  }, [R, u0, v0, spanU, spanV])
  if (!map) return null
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial map={map} roughness={0.6} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Screen-printing squeegee                                            */
/* ------------------------------------------------------------------ */

export function Squeegee({ len = 22 }: { len?: number }) {
  return (
    <group>
      {/* rubber blade, bottom edge on y = 0 */}
      <RoundedBox args={[len, 6, 1.2]} radius={0.3} smoothness={3} position={[0, 3, 0]} castShadow>
        <meshPhysicalMaterial color="#2f6f5a" roughness={0.6} clearcoat={0.2} />
      </RoundedBox>
      {/* wooden handle */}
      <RoundedBox args={[len + 1.5, 7, 4.2]} radius={1.2} smoothness={4} position={[0, 8.6, 0]} castShadow>
        <meshPhysicalMaterial color="#c88d55" roughness={0.5} clearcoat={0.5} clearcoatRoughness={0.4} />
      </RoundedBox>
      {/* white ink bead along the blade */}
      <mesh position={[0, 0.6, 1.0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.65, len - 3, 8, 20]} />
        <meshPhysicalMaterial color="#f6f3ea" roughness={0.3} clearcoat={0.6} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Shipping box (open, flaps out)                                      */
/* ------------------------------------------------------------------ */

function kraft(key: string, w: number, h: number, extra?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  return canvasTex(key, w, h, (ctx, cw, ch) => {
    ctx.fillStyle = '#c9a06a'
    ctx.fillRect(0, 0, cw, ch)
    // fibres
    let s = 11
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 2600; i++) {
      ctx.strokeStyle = rnd() > 0.5 ? 'rgba(120,80,35,0.10)' : 'rgba(255,235,200,0.10)'
      ctx.lineWidth = 1 + rnd() * 1.5
      const x = rnd() * cw
      const y = rnd() * ch
      const a = rnd() * Math.PI
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14)
      ctx.stroke()
    }
    extra?.(ctx, cw, ch)
  })
}

export function ShipBox({ w = 42, d = 30, h = 22 }: { w?: number; d?: number; h?: number }) {
  const t = 0.9
  const front = kraft('box-front', 840, 440, (ctx, cw, ch) => {
    // shipping label
    ctx.save()
    ctx.translate(cw * 0.52, ch * 0.22)
    ctx.rotate(-0.03)
    ctx.fillStyle = '#fbf9f3'
    ctx.shadowColor = 'rgba(60,40,10,0.25)'
    ctx.shadowBlur = 6
    ctx.fillRect(0, 0, cw * 0.4, ch * 0.56)
    ctx.shadowBlur = 0
    ctx.fillStyle = '#26241f'
    ctx.font = `700 ${ch * 0.09}px "Inter Tight Variable", sans-serif`
    ctx.fillText('PCB', cw * 0.025, ch * 0.12)
    ctx.fillStyle = '#e0542c'
    ctx.fillRect(cw * 0.25, ch * 0.045, cw * 0.12, ch * 0.08)
    ctx.fillStyle = 'rgba(38,36,31,0.55)'
    for (let i = 0; i < 3; i++) ctx.fillRect(cw * 0.025, ch * (0.18 + i * 0.06), cw * (0.3 - i * 0.05), ch * 0.025)
    // barcode
    let x = cw * 0.025
    let s = 5
    while (x < cw * 0.37) {
      s = (s * 16807) % 2147483647
      const bw = 1 + (s % 4)
      ctx.fillStyle = '#26241f'
      ctx.fillRect(x, ch * 0.4, bw * 1.6, ch * 0.13)
      x += bw * 1.6 + 2 + (s % 3)
    }
    ctx.restore()
    // "this side up" arrows
    ctx.strokeStyle = 'rgba(70,45,20,0.55)'
    ctx.lineWidth = 5
    for (const ax of [0.12, 0.2]) {
      ctx.beginPath()
      ctx.moveTo(cw * ax, ch * 0.62)
      ctx.lineTo(cw * ax, ch * 0.3)
      ctx.moveTo(cw * ax - 14, ch * 0.38)
      ctx.lineTo(cw * ax, ch * 0.3)
      ctx.lineTo(cw * ax + 14, ch * 0.38)
      ctx.stroke()
    }
  })
  const plain = kraft('box-plain', 512, 512)
  const inner = canvasTex('box-inner', 64, 64, (ctx, cw, ch) => {
    ctx.fillStyle = '#a77d4c'
    ctx.fillRect(0, 0, cw, ch)
  })
  const mat = (map: THREE.Texture) => <meshStandardMaterial map={map} roughness={0.85} />
  const flapH = d * 0.5
  return (
    <group>
      {/* bottom */}
      <mesh position={[0, t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, t, d]} />
        {mat(inner)}
      </mesh>
      {/* walls: front (+z) has the label */}
      <mesh position={[0, h / 2, d / 2 - t / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
        {[0, 1, 2, 3].map((i) => (
          <meshStandardMaterial key={i} attach={`material-${i}`} map={plain} roughness={0.85} />
        ))}
        <meshStandardMaterial attach="material-4" map={front} roughness={0.85} />
        <meshStandardMaterial attach="material-5" map={inner} roughness={0.9} />
      </mesh>
      <mesh position={[0, h / 2, -d / 2 + t / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
        {mat(inner)}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - t / 2), h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, h, d - 2 * t]} />
          {s > 0 ? mat(plain) : mat(inner)}
        </mesh>
      ))}
      {/* tape remnant on the front flap fold */}
      <mesh position={[0, h - 2.5, d / 2 + 0.02]}>
        <planeGeometry args={[6, 5]} />
        <meshPhysicalMaterial color="#d8b47c" roughness={0.25} clearcoat={1} transparent opacity={0.85} />
      </mesh>
      {/* flaps folded outward */}
      <group position={[0, h, d / 2]} rotation={[0.55, 0, 0]}>
        <mesh position={[0, 0, flapH / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[w - 0.4, flapH, t]} />
          {mat(plain)}
        </mesh>
      </group>
      <group position={[0, h, -d / 2]} rotation={[-0.35, 0, 0]}>
        <mesh position={[0, 0, -flapH / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[w - 0.4, flapH, t]} />
          {mat(plain)}
        </mesh>
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * w / 2, h, 0]} rotation={[0, 0, -s * (s > 0 ? 0.5 : 0.25)]}>
          <mesh position={[s * flapH * 0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <boxGeometry args={[t, flapH * 0.84, d - 1]} />
            {mat(plain)}
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Solder spool (standing on its rim, axis along Z)                    */
/* ------------------------------------------------------------------ */

export function SolderSpool({ R = 8, width = 8 }: { R?: number; width?: number }) {
  const m = mats()
  const wound = canvasTex(
    'spool-wound',
    256,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#808080'
      ctx.fillRect(0, 0, w, h)
      for (let y = 0; y < h; y += 8) {
        const g = ctx.createLinearGradient(0, y, 0, y + 8)
        g.addColorStop(0, '#303030')
        g.addColorStop(0.5, '#e0e0e0')
        g.addColorStop(1, '#303030')
        ctx.fillStyle = g
        ctx.fillRect(0, y, w, 8)
      }
    },
    true,
  )
  wound.wrapS = wound.wrapT = THREE.RepeatWrapping
  wound.repeat.set(1, 1)
  return (
    <group position={[0, R, 0]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, s * (width / 2 + 0.4), 0]} castShadow receiveShadow>
            <cylinderGeometry args={[R, R, 0.8, 56]} />
            <meshPhysicalMaterial color="#d23b2f" roughness={0.35} clearcoat={0.8} />
          </mesh>
        ))}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[R * 0.78, R * 0.78, width, 56, 1, true]} />
          <meshStandardMaterial color="#cfd3d8" metalness={1} roughness={0.32} bumpMap={wound} bumpScale={1.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, s * (width / 2 + 0.81), 0]} rotation={[s > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
            <circleGeometry args={[R * 0.28, 32]} />
            <meshStandardMaterial color="#5a1712" roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* label on the front flange */}
      <mesh position={[0, 0, width / 2 + 0.81]}>
        <ringGeometry args={[R * 0.32, R * 0.9, 48]} />
        <meshPhysicalMaterial color="#e24b3c" roughness={0.4} clearcoat={0.8} />
      </mesh>
      {/* loose tail of solder wire */}
      <Tube
        pts={[
          [R * 0.55, R * 0.5, 0],
          [R * 1.1, -R * 0.1, 1],
          [R * 1.5, -R * 0.85, 3],
          [R * 2.4, -R + 0.45, 4.5],
        ]}
        r={0.42}
        material={m.solder}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Soldering iron: tip at the origin, body along +X (rotate as needed) */
/* ------------------------------------------------------------------ */

export function SolderingIron({ hot = true }: { hot?: boolean }) {
  const geo = useMemo(() => {
    const p = (pts: [number, number][]) => {
      const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 40)
      g.rotateZ(-Math.PI / 2)
      return g
    }
    return {
      tip: p([
        [0.001, 0],
        [0.35, 0.3],
        [0.7, 2.2],
        [1.25, 6],
        [1.3, 9],
      ]),
      shaft: p([
        [1.3, 8.8],
        [1.6, 9.4],
        [1.6, 20],
        [2.6, 21],
        [2.6, 23],
      ]),
      grip: p([
        [2.4, 22.8],
        [3.4, 24.5],
        [3.9, 28],
        [3.5, 31],
        [3.6, 36],
        [4.2, 44],
        [4.2, 52],
        [3.4, 55],
        [1.6, 56],
        [1.4, 62],
      ]),
    }
  }, [])
  return (
    <group>
      <mesh geometry={geo.tip} castShadow>
        <meshStandardMaterial color="#c6cad0" metalness={1} roughness={0.22} emissive="#ff5a1a" emissiveIntensity={hot ? 0.0 : 0} />
      </mesh>
      {/* tinned, glowing point */}
      <mesh position={[0.5, 0, 0]}>
        <sphereGeometry args={[0.55, 16, 10]} />
        <meshStandardMaterial color="#ffd2a0" emissive="#ff7a2a" emissiveIntensity={hot ? 3 : 0} toneMapped={false} />
      </mesh>
      <mesh geometry={geo.shaft} castShadow>
        <meshStandardMaterial color="#9aa0a8" metalness={1} roughness={0.35} />
      </mesh>
      <mesh geometry={geo.grip} castShadow receiveShadow>
        <meshPhysicalMaterial color="#2a3442" roughness={0.55} clearcoat={0.4} />
      </mesh>
      {/* orange grip rings */}
      {[30, 33, 36].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[3.55, 0.35, 10, 40]} />
          <meshPhysicalMaterial color={ACCENT} roughness={0.5} clearcoat={0.4} />
        </mesh>
      ))}
      {hot && <Glow size={7} color="#ff7a2a" position={[0.4, 0, 0]} opacity={0.8} />}
    </group>
  )
}
