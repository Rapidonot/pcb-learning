import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { stages } from '@/pcb/project'
import { analyze, type BoardDoc, type Layer } from '@/pcb/board'
import { FootprintSilk, PadGlyph, PourFill, RefLabel, SilkTextEl, partTransform } from '@/pcb/render'
import { getFootprint } from '@/pcb/footprints'
import { useSvgTexture } from '@/pcb/svgTexture'
import { roundedRectShape, Part3D } from '@/pcb/Board3D'
import { MASKS, REAL } from '@/pcb/palette'
import { STACK, type StackLayer, type StackLayerId } from './stack'

export { STACK }
export type { StackLayerId }

const CORE = 1.6
const PX = 40 // px per mm for layer textures

/* ------------------------------------------------------------------ */
/* Layer artwork (2D SVG that becomes a texture)                       */
/* ------------------------------------------------------------------ */

function CopperArt({ doc, layer }: { doc: BoardDoc; layer: Layer }) {
  const conn = useMemo(() => analyze(doc), [doc])
  const cu = layer === 'top' ? REAL.copper : '#c27832'
  return (
    <g>
      {doc.pours
        .filter((p) => p.layer === layer)
        .map((p) => (
          <PourFill key={p.id} uid={`stack${layer}`} pour={p} doc={doc} conn={conn} fill={cu} />
        ))}
      {doc.tracks
        .filter((t) => t.layer === layer)
        .map((t) => (
          <polyline key={t.id} points={t.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={cu} strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      {conn.pads
        .filter((p) => p.layers.includes(layer))
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill={cu} hole="#1b1a17" />
          </g>
        ))}
      {doc.vias.map((v) => (
        <g key={v.id}>
          <circle cx={v.x} cy={v.y} r={v.d / 2} fill={cu} />
          <circle cx={v.x} cy={v.y} r={v.drill / 2} fill="#1b1a17" />
        </g>
      ))}
    </g>
  )
}

function MaskArt({ doc, layer }: { doc: BoardDoc; layer: Layer }) {
  const conn = useMemo(() => analyze(doc), [doc])
  const id = `maskart-${layer}`
  return (
    <g>
      <defs>
        <mask id={id}>
          <rect x={0} y={0} width={doc.w} height={doc.h} fill="#fff" />
          {conn.pads
            .filter((p) => p.layers.includes(layer))
            .map((p) => (
              <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
                <PadGlyph pad={p} fill="#000" hole={null} inflate={0.05} />
              </g>
            ))}
        </mask>
      </defs>
      <rect x={0} y={0} width={doc.w} height={doc.h} fill={layer === 'top' ? MASKS.green.mask : '#185a3b'} mask={`url(#${id})`} />
    </g>
  )
}

function SilkArt({ doc }: { doc: BoardDoc }) {
  const silk = MASKS.green.silk
  return (
    <g>
      {doc.parts.map((p) => (
        <g key={p.ref} transform={partTransform(p)}>
          <FootprintSilk def={getFootprint(p.fp)} color={silk} />
        </g>
      ))}
      {doc.parts.map((p) => (
        <RefLabel key={p.ref} part={p} color={silk} />
      ))}
      {doc.texts.map((t) => (
        <SilkTextEl key={t.id} t={t} color={silk} />
      ))}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* 3D                                                                  */
/* ------------------------------------------------------------------ */

interface StackProps {
  explode: number
  visible: Record<StackLayerId, boolean>
  selected: StackLayerId | null
  onSelect: (id: StackLayerId) => void
  showParts: boolean
  onUnderneath: () => void
  showLabels: boolean
}

function LayerPlane({
  doc,
  tex,
  y,
  opacity,
  layer,
  onSelect,
  dim,
  hovered,
  setHovered,
}: {
  doc: BoardDoc
  tex: THREE.Texture | null
  y: number
  opacity: number
  layer: StackLayer
  onSelect: (id: StackLayerId) => void
  dim: boolean
  hovered: boolean
  setHovered: (id: StackLayerId | null) => void
}) {
  const geo = useMemo(() => new THREE.ShapeGeometry(roundedRectShape(doc.w, doc.h, doc.corner), 12), [doc])
  const map = useMemo(() => {
    if (!tex) return null
    tex.repeat.set(1 / doc.w, 1 / doc.h)
    tex.offset.set(0.5, 0.5)
    tex.needsUpdate = true
    return tex
  }, [tex, doc.w, doc.h])
  return (
    <mesh
      geometry={geo}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, y, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(layer.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(layer.id)
      }}
      onPointerOut={() => setHovered(null)}
      renderOrder={10}
    >
      <meshStandardMaterial
        map={map ?? undefined}
        color={map ? '#ffffff' : layer.color}
        transparent
        alphaTest={0.02}
        opacity={dim ? 0.12 : opacity}
        side={THREE.DoubleSide}
        roughness={layer.id.startsWith('copper') ? 0.35 : 0.6}
        metalness={layer.id.startsWith('copper') ? 0.55 : 0.02}
        emissive={hovered ? '#ffffff' : '#000000'}
        emissiveIntensity={hovered ? 0.08 : 0}
        depthWrite={!layer.id.startsWith('mask')}
      />
    </mesh>
  )
}

function UnderneathWatcher({ onUnderneath }: { onUnderneath: () => void }) {
  const { camera } = useThree()
  const fired = useRef(false)
  useFrame(() => {
    if (!fired.current && camera.position.y < -2) {
      fired.current = true
      onUnderneath()
    }
  })
  return null
}

type Svgs = Partial<Record<StackLayerId, SVGSVGElement | null>>
type LabelRefs = React.MutableRefObject<(HTMLDivElement | null)[]>

/** Projects 3D anchor points to screen space every frame and moves the DOM labels there. */
function LabelProjector({ refs, points }: { refs: LabelRefs; points: [number, number, number][] }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    points.forEach((p, i) => {
      const el = refs.current[i]
      if (!el) return
      v.set(p[0], p[1], p[2]).project(camera)
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate(${x}px, ${y}px)`
    })
  })
  return null
}

function Stack({ explode, visible, selected, onSelect, showParts, onUnderneath, svgs, doc, labelRefs, hovered, setHovered }: StackProps & { svgs: Svgs; doc: BoardDoc; labelRefs: LabelRefs; hovered: StackLayerId | null; setHovered: (id: StackLayerId | null) => void }) {
  const tSilk = useSvgTexture(svgs.silkTop ?? null, 'silk')
  const tMaskT = useSvgTexture(svgs.maskTop ?? null, 'maskT')
  const tCuT = useSvgTexture(svgs.copperTop ?? null, 'cuT')
  const tCuB = useSvgTexture(svgs.copperBottom ?? null, 'cuB')
  const tMaskB = useSvgTexture(svgs.maskBottom ?? null, 'maskB')

  const gap = explode * 6
  // y positions (top of core = CORE)
  const ys: Record<StackLayerId, number> = {
    silkTop: CORE + 0.09 + gap * 3,
    maskTop: CORE + 0.06 + gap * 2,
    copperTop: CORE + 0.03 + gap * 1,
    core: 0,
    copperBottom: -0.03 - gap * 1,
    maskBottom: -0.06 - gap * 2,
  }
  const coreGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedRectShape(doc.w, doc.h, doc.corner), { depth: CORE, bevelEnabled: false, curveSegments: 12 })
    g.rotateX(-Math.PI / 2)
    return g
  }, [doc])

  const texFor: Record<StackLayerId, THREE.Texture | null> = {
    silkTop: tSilk,
    maskTop: tMaskT,
    copperTop: tCuT,
    core: null,
    copperBottom: tCuB,
    maskBottom: tMaskB,
  }
  const dimOf = (id: StackLayerId) => selected !== null && selected !== id

  return (
    <group>
      {STACK.filter((l) => l.id !== 'core' && visible[l.id]).map((l) => (
        <LayerPlane
          key={l.id}
          doc={doc}
          tex={texFor[l.id]}
          y={ys[l.id]}
          opacity={l.id.startsWith('mask') ? 0.86 : 1}
          layer={l}
          onSelect={onSelect}
          dim={dimOf(l.id)}
          hovered={hovered === l.id}
          setHovered={setHovered}
        />
      ))}
      {visible.core && (
        <mesh
          geometry={coreGeo}
          onClick={(e) => {
            e.stopPropagation()
            onSelect('core')
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered('core')
          }}
          onPointerOut={() => setHovered(null)}
        >
          <meshStandardMaterial
            color={REAL.fr4}
            roughness={0.85}
            transparent
            opacity={dimOf('core') ? 0.12 : 1}
            emissive={hovered === 'core' ? '#ffffff' : '#000000'}
            emissiveIntensity={hovered === 'core' ? 0.08 : 0}
          />
        </mesh>
      )}

      {/* plated holes: barrels that stretch through the stack */}
      {[...doc.vias.map((v) => ({ x: v.x, y: v.y, r: v.drill / 2 })), ...[[4, 11.73], [4, 14.27]].map(([x, y]) => ({ x, y, r: 0.5 }))].map((h, i) => (
        <mesh key={i} position={[h.x - doc.w / 2, (ys.copperTop + ys.copperBottom) / 2, h.y - doc.h / 2]}>
          <cylinderGeometry args={[h.r, h.r, ys.copperTop - ys.copperBottom, 20, 1, true]} />
          <meshStandardMaterial color={REAL.copper} metalness={0.6} roughness={0.35} side={THREE.DoubleSide} transparent opacity={selected && !selected.startsWith('copper') ? 0.15 : 0.9} />
        </mesh>
      ))}

      {showParts &&
        doc.parts.map((p) => (
          <group key={p.ref} position={[p.x - doc.w / 2, ys.silkTop + 0.02 + gap * 0.6, p.y - doc.h / 2]} rotation={[0, (-p.rot * Math.PI) / 180, 0]}>
            <Part3D part={p} ledOn />
          </group>
        ))}

      <LabelProjector
        refs={labelRefs}
        points={STACK.map((l) => [doc.w / 2 - 0.5, l.id === 'core' ? CORE / 2 : ys[l.id], -doc.h / 2 + 0.5] as [number, number, number])}
      />
      <UnderneathWatcher onUnderneath={onUnderneath} />
    </group>
  )
}

export function LayerStack3D(props: StackProps) {
  const doc = useMemo(() => stages.finished(), [])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const [hovered, setHovered] = useState<StackLayerId | null>(null)
  const [svgs, setSvgs] = useState<Svgs>({})
  const reg = (id: StackLayerId) => (el: SVGSVGElement | null) => {
    if (el) setSvgs((s) => (s[id] === el ? s : { ...s, [id]: el }))
  }
  const art = (id: StackLayerId, node: React.ReactNode) => (
    <svg ref={reg(id)} xmlns="http://www.w3.org/2000/svg" width={doc.w * PX} height={doc.h * PX} viewBox={`0 0 ${doc.w} ${doc.h}`}>
      {node}
    </svg>
  )
  return (
    <>
    <div aria-hidden style={{ position: 'absolute', left: -100000, top: 0, width: 10, height: 10, overflow: 'hidden', pointerEvents: 'none' }}>
      {art('silkTop', <SilkArt doc={doc} />)}
      {art('maskTop', <MaskArt doc={doc} layer="top" />)}
      {art('copperTop', <CopperArt doc={doc} layer="top" />)}
      {art('copperBottom', <CopperArt doc={doc} layer="bottom" />)}
      {art('maskBottom', <MaskArt doc={doc} layer="bottom" />)}
    </div>
    <Canvas dpr={[1, 2]} camera={{ position: [34, 40, 56], fov: 36, near: 0.5, far: 1000 }} gl={{ antialias: true, alpha: true }} onPointerMissed={() => void 0}>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#fff6e8', '#3a3326', 0.7]} />
      <directionalLight position={[30, 50, 25]} intensity={1.5} />
      <directionalLight position={[-30, -20, -20]} intensity={0.5} />
      <Suspense fallback={null}>
        <Stack {...props} svgs={svgs} doc={doc} labelRefs={labelRefs} hovered={hovered} setHovered={setHovered} />
      </Suspense>
      <OrbitControls makeDefault enableDamping minDistance={20} maxDistance={110} target={[-1, 1, 2]} />
    </Canvas>
    {props.showLabels && (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {STACK.map((l, i) => (
          <div key={l.id} ref={(el) => { labelRefs.current[i] = el }} style={{ position: 'absolute', left: 0, top: 0, display: props.visible[l.id] ? 'block' : 'none' }}>
            <div
              className={`stack-label ${props.selected === l.id ? 'is-sel' : ''} ${hovered === l.id ? 'is-hov' : ''}`}
              style={{ opacity: props.explode > 0.15 || props.selected === l.id ? 1 : 0 }}
            >
              <span className="stack-label__line" />
              <span className="stack-label__dot" style={{ background: l.color }} />
              {l.name}
            </div>
          </div>
        ))}
      </div>
    )}
    </>
  )
}
