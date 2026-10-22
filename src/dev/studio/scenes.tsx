/*
 * One small still life per lesson. All scenes are shot by the same <Stage> (camera, lights, floor),
 * so they only describe objects. Units are millimetres; the stage frames each scene automatically.
 * Camera looks from +X/+Z, so "front" is +Z (screen-left face) and +X (screen-right face).
 */
import type { ComponentType } from 'react'
import { useMemo } from 'react'
import * as THREE from 'three'
import { getFootprint } from '@/pcb/footprints'
import { DipIC, GullIC, mats } from '@/pcb/parts3d'
import { Part3D } from '@/pcb/Board3D'
import { stages } from '@/pcb/project'
import { blinkySchematic } from '@/pcb/schematic'
import { analyze } from '@/pcb/board'
import { REAL } from '@/pcb/palette'
import type { StageProps } from './Stage'
import { DocBoard, Slab, THICK, faceGeometry, padGeometry, ringGeometry, traceGeometry, type P2 } from './board'
import { CeramicDisc, Electrolytic, Glow, LooseLed, LooseResistor, Paper, Pencil, Tube, Wire } from './props'
import { Arrow, BB, Battery9V, Breadboard, Dashes, Laptop, Magnifier, MagnifiedDisc, Pen, SolderSpool, SolderingIron, Squeegee, ShipBox, bbHole } from './props2'
import { useSvgTex } from './textures'
import { circle, paintedMaps, polyline, roundRect } from './paint'
import { CopperArt, DatasheetPage, DrillArt, EdaScreen, MaskOpeningsArt, PAGE, PINOUT, SHEET, SchematicSheet, SilkArt } from './art'

export interface SceneDef {
  Scene: ComponentType
  stage?: Omit<StageProps, 'children'>
}

const ACCENT = '#e0542c'
const COPPER = '#f0a46a'

function copperMat(glow = 0) {
  return <meshStandardMaterial color={COPPER} metalness={1} roughness={0.27} emissive="#ff7a2a" emissiveIntensity={glow} />
}

/* ------------------------------------------------------------------ */
/* 01 · What is a PCB: exploded layer stack                            */
/* ------------------------------------------------------------------ */

function WhatIsAPcb() {
  const doc = useMemo(() => stages.finished(), [])
  const vb = `0 0 ${doc.w} ${doc.h}`
  const sz = { w: doc.w * 40, h: doc.h * 40, viewBox: vb }
  const cu = useSvgTex('stack-cu', { ...sz, linear: true }, () => (
    <>
      <rect width={doc.w} height={doc.h} fill="#000" />
      <CopperArt doc={doc} side="top" fill="#fff" />
    </>
  ))
  const mask = useSvgTex('stack-mask', { ...sz, linear: true }, () => (
    <>
      <rect width={doc.w} height={doc.h} fill="#fff" />
      <MaskOpeningsArt doc={doc} fill="#000" />
    </>
  ))
  const silk = useSvgTex('stack-silk', { ...sz, linear: true }, () => (
    <>
      <rect width={doc.w} height={doc.h} fill="#000" />
      <SilkArt doc={doc} fill="#fff" />
    </>
  ))
  const fr4 = useSvgTex('stack-fr4', sz, () => (
    <>
      <rect width={doc.w} height={doc.h} fill={REAL.fr4} />
      <DrillArt doc={doc} fill="#4a3b22" outline={false} />
    </>
  ))
  const face = useMemo(() => faceGeometry(doc.w, doc.h, doc.corner), [doc])
  const gap = 5.2
  const corners: [number, number][] = [
    [doc.w / 2 - 0.6, doc.h / 2 - 0.6],
    [-doc.w / 2 + 0.6, doc.h / 2 - 0.6],
    [doc.w / 2 - 0.6, -doc.h / 2 + 0.6],
  ]
  const top = THICK + gap * 3
  return (
    <group>
      <Slab w={doc.w} h={doc.h} corner={doc.corner} maps={{ color: fr4 }} edge="#bfa868" clearcoat={0.1} />
      {cu && (
        <mesh geometry={face} rotation={[-Math.PI / 2, 0, 0]} position={[0, THICK + gap, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={COPPER} metalness={1} roughness={0.3} alphaMap={cu} alphaTest={0.5} side={THREE.DoubleSide} emissive="#ff7a2a" emissiveIntensity={0.08} />
        </mesh>
      )}
      {mask && (
        <mesh geometry={face} rotation={[-Math.PI / 2, 0, 0]} position={[0, THICK + gap * 2, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#1f7a4f" roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.2} alphaMap={mask} alphaTest={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      {silk && (
        <group position={[0, top, 0]}>
          <mesh geometry={face} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <meshStandardMaterial color="#fbf8ef" roughness={0.7} alphaMap={silk} alphaTest={0.4} side={THREE.DoubleSide} />
          </mesh>
          {/* the clear carrier the legend is printed on, so it reads as a layer */}
          <mesh geometry={face} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.16} roughness={0.1} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
      {corners.map(([x, z], i) => (
        <Dashes key={i} a={[x, THICK + 0.1, z]} b={[x, top, z]} r={0.09} dash={0.7} gap={0.55} color="#a3977f" emissive={0} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 02 · Electricity: 9 V battery → resistor → glowing LED on a breadboard */
/* ------------------------------------------------------------------ */

function holeXZ(col: number, row: number): [number, number] {
  return bbHole(col, row)
}

function Electricity() {
  const m = mats()
  const top = BB.h
  const H = (c: number, r: number, y = top): [number, number, number] => {
    const [x, z] = holeXZ(c, r)
    return [x, y, z]
  }
  // resistor across the + rail (row −2) and terminal row 2, column 6
  const [rx, rzA] = holeXZ(6, -2)
  const [, rzB] = holeXZ(6, 2)
  const rLift = 2.2
  const rMid = (rzA + rzB) / 2
  // LED: anode col 6 row 4, cathode col 7 row 4
  const [lx0, lz] = holeXZ(6, 4)
  const [lx1] = holeXZ(7, 4)
  const bs = 0.62
  const bat: [number, number, number] = [-BB.w / 2 - 22, 0, -7]
  const plus: [number, number, number] = [bat[0] + (23 + 1.2 + 2.6) * bs, 17.5 * bs * 0.5, bat[2] - 6.4 * bs]
  const minus: [number, number, number] = [bat[0] + (23 + 1.2 + 2.4) * bs, 17.5 * bs * 0.5, bat[2] + 6.4 * bs]
  return (
    <group>
      <Breadboard />
      <group position={bat} scale={bs}>
        <Battery9V />
      </group>
      {/* red: battery + → top rail */}
      <Wire
        color="#d83a2e"
        pts={[
          [plus[0] + 1.2, plus[1], plus[2]],
          [plus[0] + 4, plus[1] + 2, plus[2] - 1],
          [H(1, -2)[0] - 4, top + 7, H(1, -2)[2] - 2],
          [H(1, -2)[0], top + 3, H(1, -2)[2]],
          [H(1, -2)[0], top - 0.5, H(1, -2)[2]],
        ]}
      />
      {/* black: battery − → − rail */}
      <Wire
        color="#232326"
        pts={[
          [minus[0] + 1.2, minus[1], minus[2]],
          [minus[0] + 5, minus[1] + 1, minus[2] - 1],
          [H(2, -1)[0] - 3, top + 5, H(2, -1)[2] + 1],
          [H(2, -1)[0], top + 2.5, H(2, -1)[2]],
          [H(2, -1)[0], top - 0.5, H(2, -1)[2]],
        ]}
      />
      {/* black jumper: LED cathode column → − rail */}
      <Wire
        color="#232326"
        r={0.42}
        pts={[
          [H(7, 1)[0], top - 0.5, H(7, 1)[2]],
          [H(7, 1)[0], top + 2.2, H(7, 1)[2] - 0.8],
          [H(9, -1)[0], top + 2.8, H(9, -1)[2] + 1.2],
          [H(9, -1)[0], top - 0.5, H(9, -1)[2]],
        ]}
      />
      {/* resistor standing proud of the board, leads bent into the holes */}
      <group position={[rx, top + rLift, rMid]} rotation={[0, Math.PI / 2, 0]}>
        <group position={[0, -1.25, 0]}>
          <LooseResistor bands={[3, 3, 1]} noLeads />
        </group>
      </group>
      {[rzA, rzB].map((z, i) => {
        const s = z < rMid ? -1 : 1
        return (
          <Tube
            key={i}
            pts={[
              [rx, top + rLift, rMid + s * 3.1],
              [rx, top + rLift, z - s * 0.8],
              [rx, top + rLift - 0.4, z - s * 0.1],
              [rx, top + rLift - 1.2, z],
              [rx, top - 0.6, z],
            ]}
            r={0.24}
            material={m.tin}
            segments={40}
          />
        )
      })}
      {/* LED */}
      <group position={[(lx0 + lx1) / 2, top - 0.4, lz]}>
        <LooseLed on legs={3.4} spread={1.27} glow={1.1} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 03 · Components: a little family portrait                           */
/* ------------------------------------------------------------------ */

function Components() {
  const dip = getFootprint('DIP-8')
  return (
    <group>
      <group position={[0, 1.95, -1]} rotation={[0, 0.3, 0]}>
        <DipIC fp={dip} value="NE555" />
      </group>
      <group position={[-1.5, 0, 9.5]} rotation={[0, 0.15, 0]}>
        <LooseResistor bands={[4, 7, 2]} lead={4.2} />
      </group>
      <group position={[11, 0, -5]} rotation={[0, -3.6, 0]}>
        <Electrolytic r={3} h={7.5} />
      </group>
      <group position={[12, 0, 5.5]} rotation={[0, 0.62, 0]}>
        <CeramicDisc label="104" />
      </group>
      <group position={[-11, 0, -3.5]} rotation={[0, 0.6, 0]}>
        <LooseLed legs={3.2} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 04 · Footprints: SOIC-8 hovering over its pads                      */
/* ------------------------------------------------------------------ */

function Footprints() {
  const fp = getFootprint('SOIC-8')
  const W = 22
  const D = 17
  const maps = useMemo(
    () =>
      paintedMaps(
        'fp-board',
        W,
        D,
        (ctx, ink) => {
          const cx = W / 2
          const cy = D / 2
          // traces under the mask fanning out from the pads
          for (const p of fp.pads) {
            const x = cx + p.x
            const y = cy + p.y
            const out = Math.sign(p.x) * 4.2
            polyline(ctx, [[x, y], [x + out, y], [x + out + Math.sign(p.x) * 2, y + (p.y > 0 ? 2 : -2)], [x + out + Math.sign(p.x) * 6, y + (p.y > 0 ? 2 : -2)]], 0.32, ink('cuMask'))
          }
          // silkscreen outline + pin-1 dot
          ctx.strokeStyle = ink('silk')
          ctx.lineWidth = 0.18
          for (const [x1, y1, x2, y2] of fp.silk) {
            ctx.beginPath()
            ctx.moveTo(cx + x1, cy + y1)
            ctx.lineTo(cx + x2, cy + y2)
            ctx.stroke()
          }
          circle(ctx, cx + fp.pin1![0], cy + fp.pin1![1], 0.35, ink('silk'))
          ctx.fillStyle = ink('silk')
          ctx.font = '600 1.2px "IBM Plex Mono", monospace'
          ctx.fillText('U1', cx - 4.2, cy - 3.3)
        },
        { ppm: 64 },
      ),
    [fp],
  )
  const hover = 5.5
  return (
    <group>
      <Slab w={W} h={D} corner={1.6} maps={maps} />
      {fp.pads.map((p) => (
        <mesh key={p.num} geometry={padGeometry(p.w, p.h, 0.12, 0.06)} position={[p.x, THICK + 0.005, p.y]} castShadow receiveShadow>
          <meshStandardMaterial color="#e9c25a" metalness={1} roughness={0.2} />
        </mesh>
      ))}
      <group position={[0, THICK + hover, 0]}>
        <GullIC fp={fp} value="NE555" />
      </group>
      {[
        [-1.95, -2.45],
        [1.95, -2.45],
        [-1.95, 2.45],
        [1.95, 2.45],
      ].map(([x, z], i) => (
        <Dashes key={i} a={[x, THICK + hover - 0.05, z]} b={[x, THICK + 0.15, z]} r={0.07} dash={0.45} gap={0.35} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 05 · EasyEDA tour: laptop with the PCB editor open                  */
/* ------------------------------------------------------------------ */

function EasyedaTour() {
  const doc = useMemo(() => stages.routed(), [])
  const screen = useSvgTex('eda-screen', { w: 1600, h: 1000, viewBox: '0 0 400 250' }, () => <EdaScreen doc={doc} />)
  return (
    <group rotation={[0, 0.3, 0]}>
      <Laptop screen={screen} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 06/08 · Schematic paper                                             */
/* ------------------------------------------------------------------ */

const PAPER_W = 56
const PAPER_H = (PAPER_W * SHEET.h) / SHEET.w

/** sheet coords (schematic units, inside the sheet's transform) → paper-local x/z */
function sheetToPaper(x: number, y: number, w = PAPER_W, h = PAPER_H): [number, number] {
  const sx = 6 + 0.97 * x
  const sy = 2 + 0.97 * y
  return [(sx / SHEET.w - 0.5) * w, (sy / SHEET.h - 0.5) * h]
}

function useSchematicTex(key: string, drawing = false) {
  const doc = useMemo(() => {
    const d = blinkySchematic()
    if (drawing) d.wires = d.wires.filter((w) => w.id !== 'w16')
    return d
  }, [drawing])
  return useSvgTex(key, { w: 2200, h: Math.round((2200 * SHEET.h) / SHEET.w), viewBox: `0 0 ${SHEET.w} ${SHEET.h}` }, () => (
    <SchematicSheet doc={doc}>
      {drawing && (
        <g>
          <polyline points="270,150 284,150" fill="none" stroke={ACCENT} strokeWidth={2.2} strokeLinecap="round" />
          <polyline points="284,150 290,150 290,160" fill="none" stroke={ACCENT} strokeWidth={1.2} strokeDasharray="3 2.5" />
          <circle cx={290} cy={160} r={4.5} fill="none" stroke={ACCENT} strokeWidth={1.2} />
        </g>
      )}
    </SchematicSheet>
  ))
}

function ReadingSchematics() {
  const tex = useSchematicTex('sch-read')
  return (
    <group>
      <group rotation={[0, 0.12, 0]}>
        <Paper w={PAPER_W} h={PAPER_H} map={tex} curl={3.2} curlFrom={0.8} />
      </group>
      <group position={[6, 0.05, 14]} rotation={[0, 0.42, 0]} scale={0.62}>
        <Pencil />
      </group>
    </group>
  )
}

function DrawingSchematic() {
  const tex = useSchematicTex('sch-draw', true)
  const [tx, tz] = sheetToPaper(284, 150)
  return (
    <group rotation={[0, 0.12, 0]}>
      <Paper w={PAPER_W} h={PAPER_H} map={tex} curl={3.2} curlFrom={0.8} />
      <group position={[tx, 0.06, tz]} rotation={[-0.38, 0, -0.5]}>
        <Pen len={44} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 07 · Parts & datasheets                                             */
/* ------------------------------------------------------------------ */

function PartsDatasheets() {
  const fp = getFootprint('SOIC-8')
  const pw = 40
  const ph = (pw * PAGE.h) / PAGE.w
  const tex = useSvgTex('datasheet', { w: 1500, h: Math.round((1500 * PAGE.h) / PAGE.w), viewBox: `0 0 ${PAGE.w} ${PAGE.h}` }, () => <DatasheetPage />)
  const px = (PINOUT.x / PAGE.w - 0.5) * pw
  const pz = (PINOUT.y / PAGE.h - 0.5) * ph
  const R = 7.2
  const zoom = 1.7
  const lensY = 5.5
  return (
    <group>
      <group rotation={[0, -0.22, 0]}>
        <Paper w={pw} h={ph} map={tex} curl={2.6} curlFrom={0.84} />
        <group position={[px, lensY - 0.3, pz]}>
          <MagnifiedDisc map={tex} R={R - 0.4} u0={PINOUT.x / PAGE.w} v0={1 - PINOUT.y / PAGE.h} spanU={(R / zoom) / pw} spanV={(R / zoom) / ph} />
        </group>
        <group position={[px, lensY, pz]} rotation={[0, 2.5, 0]}>
          <Magnifier R={R} handle={20} />
        </group>
        <group position={[-8.5, 0.05, 15]} rotation={[0, 0.5, 0]} scale={1.5}>
          <GullIC fp={fp} value="NE555" />
        </group>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 09 · Schematic → PCB                                                */
/* ------------------------------------------------------------------ */

function SchematicToPcb() {
  const tex = useSchematicTex('sch-read')
  const doc = useMemo(() => stages.placed(), [])
  const lifts = useMemo(() => Object.fromEntries(doc.parts.map((p, i) => [p.ref, 3.2 + ((i * 7) % 5) * 0.7])), [doc])
  const conn = useMemo(() => analyze(doc), [doc])
  const ox = 22
  const toW = (x: number, y: number, ref: string): [number, number, number] => [x - doc.w / 2 + ox, THICK + lifts[ref] + 0.15, y - doc.h / 2]
  return (
    <group>
      <group position={[-22, 0, 2]} rotation={[0, 0.18, 0]}>
        <Paper w={34} h={34 * (SHEET.h / SHEET.w)} map={tex} curl={1.6} curlFrom={0.82} />
      </group>
      <group position={[ox, 0, 0]}>
        <DocBoard doc={doc} id="s2p" lift={lifts} silk={false} />
      </group>
      {conn.ratsnest.map((r, i) => (
        <Tube key={i} pts={[toW(r.a.x, r.a.y, r.a.ref), toW(r.b.x, r.b.y, r.b.ref)]} r={0.07} smooth={false} segments={2} material={RATS} />
      ))}
      <Arrow
        pts={[
          [-8, 3, -2],
          [-1, 9, -3],
          [6, 6.5, -3],
        ]}
        r={0.7}
        head={3.2}
      />
    </group>
  )
}
const RATS = new THREE.MeshStandardMaterial({ color: '#8fd0ff', emissive: '#5fb8ff', emissiveIntensity: 1.6, toneMapped: false })

/* ------------------------------------------------------------------ */
/* 10 · Placement                                                      */
/* ------------------------------------------------------------------ */

function Placement() {
  const doc = useMemo(() => stages.placed(), [])
  const u1 = doc.parts.find((p) => p.ref === 'U1')!
  const fp = getFootprint(u1.fp)
  const cx = u1.x
  const cy = u1.y
  const hover = 7
  const cw = fp.courtyard.w
  const ch = fp.courtyard.h
  return (
    <group rotation={[0, -0.12, 0]}>
      <DocBoard
        doc={doc}
        id="placement"
        skip={['U1']}
        overlay={
          <g>
            <rect x={cx - cw} y={cy - ch} width={cw * 2} height={ch * 2} rx={0.3} fill="rgba(224,84,44,0.18)" stroke={ACCENT} strokeWidth={0.22} strokeDasharray="0.7 0.45" />
          </g>
        }
      />
      <group position={[cx - doc.w / 2, THICK + hover, cy - doc.h / 2]}>
        <Part3D part={u1} ledOn={false} />
      </group>
      {[
        [-cw, -ch],
        [cw, -ch],
        [-cw, ch],
        [cw, ch],
      ].map(([x, z], i) => (
        <Dashes key={i} a={[cx - doc.w / 2 + x, THICK + hover - 0.1, cy - doc.h / 2 + z]} b={[cx - doc.w / 2 + x, THICK + 0.2, cy - doc.h / 2 + z]} r={0.08} dash={0.5} gap={0.4} />
      ))}
      <Arrow
        pts={[
          [cx - doc.w / 2, THICK + hover + 7.5, cy - doc.h / 2],
          [cx - doc.w / 2, THICK + hover + 2.4, cy - doc.h / 2],
        ]}
        r={0.45}
        head={2}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 11 · Routing: glowing copper with 45° corners                      */
/* ------------------------------------------------------------------ */

function Routing() {
  const W = 30
  const D = 22
  const w = (p: P2[]): P2[] => p.map(([x, y]) => [x - W / 2, y - D / 2])
  const traces: P2[][] = [
    w([[5, 5], [12, 5], [15, 2.6], [26, 2.6]]),
    w([[5, 11], [14, 11], [18, 7], [26, 7]]),
    w([[5, 17], [16, 17], [20, 13], [26, 13]]),
    w([[26, 19], [22.5, 19], [21, 20.5], [16, 20.5]]),
  ]
  const tht: P2[] = w([[5, 5], [5, 11], [5, 17]])
  const smd: P2[] = w([[26.4, 2.6], [26.4, 7], [26.4, 13], [26.4, 19]])
  const maps = useMemo(
    () =>
      paintedMaps(
        'route-board',
        W,
        D,
        (ctx, ink) => {
          // faint ghost of other copper under the mask
          polyline(ctx, [[0, 8], [3, 8]], 0.5, ink('cuMask'))
          polyline(ctx, [[0, 14], [2.5, 14]], 0.5, ink('cuMask'))
          ctx.fillStyle = ink('silk')
          ctx.font = '600 1.3px "IBM Plex Mono", monospace'
          ctx.fillText('J2', 2.2, 21)
          ctx.fillText('U3', 27.2, 21.2)
          ctx.strokeStyle = ink('silk')
          ctx.lineWidth = 0.18
          ctx.strokeRect(2.9, 2.6, 4.2, 16.8)
        },
        { ppm: 48 },
      ),
    [],
  )
  const geos = useMemo(() => traces.map((t) => traceGeometry(t, 1.05, 0.14)), [])
  return (
    <group>
      <Slab w={W} h={D} corner={2} maps={maps} />
      <group position={[0, THICK, 0]}>
        {geos.map((g, i) => (
          <mesh key={i} geometry={g} castShadow receiveShadow>
            {copperMat(0.55)}
          </mesh>
        ))}
        {tht.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh geometry={ringGeometry(1.25, 0.5, 0.16)} castShadow>
              {copperMat(0.4)}
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <circleGeometry args={[0.5, 24]} />
              <meshStandardMaterial color="#120f0b" />
            </mesh>
          </group>
        ))}
        {smd.map(([x, z], i) => (
          <mesh key={i} geometry={padGeometry(1.8, 1.3, 0.25, 0.16)} position={[x, 0, z]} castShadow>
            {copperMat(0.4)}
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 12 · Vias: cut-away cross-section                                   */
/* ------------------------------------------------------------------ */

function extrude(shape: THREE.Shape, depth: number, y: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 48 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

function Vias() {
  const W = 26
  const D = 12
  const rh = 1.35
  const rp = 2.6
  const tw = rp // trace width = pad radius keeps the outlines simple
  const cu = 0.42
  const core = 4.2
  const geos = useMemo(() => {
    const coreS = new THREE.Shape()
    coreS.moveTo(-W / 2, 0)
    coreS.lineTo(-rh, 0)
    coreS.absarc(0, 0, rh, Math.PI, 0, true)
    coreS.lineTo(W / 2, 0)
    coreS.lineTo(W / 2, D)
    coreS.lineTo(-W / 2, D)
    coreS.closePath()
    // bottom copper: pad + trace to the right
    const botCu = new THREE.Shape()
    botCu.moveTo(-rp, 0)
    botCu.lineTo(-rh, 0)
    botCu.absarc(0, 0, rh, Math.PI, 0, true)
    botCu.lineTo(W / 2, 0)
    botCu.lineTo(W / 2, tw)
    botCu.lineTo(0, tw)
    botCu.absarc(0, 0, rp, Math.PI / 2, Math.PI, false)
    botCu.closePath()
    const botMask = new THREE.Shape()
    botMask.moveTo(-W / 2, 0)
    botMask.lineTo(-rp, 0)
    botMask.absarc(0, 0, rp, Math.PI, Math.PI / 2, true)
    botMask.lineTo(W / 2, tw)
    botMask.lineTo(W / 2, D)
    botMask.lineTo(-W / 2, D)
    botMask.closePath()
    // top copper: pad + trace to the left
    const topCu = new THREE.Shape()
    topCu.moveTo(rp, 0)
    topCu.lineTo(rh, 0)
    topCu.absarc(0, 0, rh, 0, Math.PI, false)
    topCu.lineTo(-W / 2, 0)
    topCu.lineTo(-W / 2, tw)
    topCu.lineTo(0, tw)
    topCu.absarc(0, 0, rp, Math.PI / 2, 0, true)
    topCu.closePath()
    const topMask = new THREE.Shape()
    topMask.moveTo(-W / 2, tw)
    topMask.lineTo(0, tw)
    topMask.absarc(0, 0, rp, Math.PI / 2, 0, true)
    topMask.lineTo(W / 2, 0)
    topMask.lineTo(W / 2, D)
    topMask.lineTo(-W / 2, D)
    topMask.closePath()
    const total = cu * 2 + core
    const outer = new THREE.CylinderGeometry(rh, rh, total, 48, 1, true, Math.PI / 2, Math.PI)
    outer.translate(0, total / 2, 0)
    const inner = new THREE.CylinderGeometry(rh - 0.38, rh - 0.38, total + 0.02, 48, 1, true, Math.PI / 2, Math.PI)
    inner.translate(0, total / 2, 0)
    const lip = new THREE.Shape()
    lip.moveTo(-rh, 0)
    lip.absarc(0, 0, rh, Math.PI, 0, true)
    lip.lineTo(rh - 0.38, 0)
    lip.absarc(0, 0, rh - 0.38, 0, Math.PI, false)
    lip.closePath()
    return {
      core: extrude(coreS, core, cu),
      botCu: extrude(botCu, cu, 0),
      botMask: extrude(botMask, cu * 0.75, 0),
      topCu: extrude(topCu, cu, cu + core),
      topMask: extrude(topMask, cu * 0.75, cu + core),
      outer,
      inner,
      lipTop: extrude(lip, 0.04, total - 0.02),
      lipBot: extrude(lip, 0.04, -0.02),
      total,
    }
  }, [])
  const fr4 = useMemo(() => {
    const t = new THREE.CanvasTexture(
      (() => {
        const c = document.createElement('canvas')
        c.width = c.height = 256
        const x = c.getContext('2d')!
        x.fillStyle = '#d2bd84'
        x.fillRect(0, 0, 256, 256)
        x.strokeStyle = 'rgba(150,120,60,0.35)'
        x.lineWidth = 3
        for (let i = 0; i < 256; i += 16) {
          x.beginPath()
          x.moveTo(i, 0)
          x.lineTo(i + 8, 256)
          x.stroke()
        }
        return c
      })(),
    )
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(0.25, 0.25)
    return t
  }, [])
  const maskMat = <meshPhysicalMaterial color="#1f7a4f" roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} />
  return (
    <group rotation={[0, 0.1, 0]}>
      <mesh geometry={geos.core} castShadow receiveShadow>
        <meshStandardMaterial color="#d6c189" map={fr4} roughness={0.7} />
      </mesh>
      <mesh geometry={geos.botCu} castShadow receiveShadow>
        {copperMat(0.15)}
      </mesh>
      <mesh geometry={geos.botMask} castShadow receiveShadow>
        {maskMat}
      </mesh>
      <mesh geometry={geos.topCu} castShadow receiveShadow>
        {copperMat(0.15)}
      </mesh>
      <mesh geometry={geos.topMask} castShadow receiveShadow>
        {maskMat}
      </mesh>
      <mesh geometry={geos.outer}>{copperMat(0.1)}</mesh>
      <mesh geometry={geos.inner}>
        <meshStandardMaterial color={COPPER} metalness={1} roughness={0.25} side={THREE.DoubleSide} emissive="#ff7a2a" emissiveIntensity={0.12} />
      </mesh>
      <mesh geometry={geos.lipTop}>{copperMat(0.1)}</mesh>
      <mesh geometry={geos.lipBot}>{copperMat(0.1)}</mesh>
      {/* plating seen in section */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (rh - 0.19), geos.total / 2, -0.005]}>
          <boxGeometry args={[0.38, geos.total, 0.01]} />
          {copperMat(0.3)}
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 13 · Ground pour with thermal relief                                */
/* ------------------------------------------------------------------ */

function GroundPour() {
  const W = 30
  const D = 22
  const P = (x: number, y: number): P2 => [x - W / 2, -(y - D / 2)] // board mm → shape coords
  const thermal = P(9.5, 10)
  const via = P(17, 16)
  const pad = P(25.5, 16)
  const stitches = [P(4, 4), P(15, 4), P(24, 4.5), P(4, 18), P(11, 18.5), P(19, 9.5)]
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    const r = 1.6
    const x0 = -W / 2 + 1
    const y0 = -D / 2 + 1
    const x1 = W / 2 - 1
    const y1 = D / 2 - 1
    s.moveTo(x0 + r, y0)
    s.lineTo(x1 - r, y0)
    s.quadraticCurveTo(x1, y0, x1, y0 + r)
    s.lineTo(x1, y1 - r)
    s.quadraticCurveTo(x1, y1, x1 - r, y1)
    s.lineTo(x0 + r, y1)
    s.quadraticCurveTo(x0, y1, x0, y1 - r)
    s.lineTo(x0, y0 + r)
    s.quadraticCurveTo(x0, y0, x0 + r, y0)
    const h1 = new THREE.Path()
    h1.absarc(thermal[0], thermal[1], 2.7, 0, Math.PI * 2, true)
    s.holes.push(h1)
    // capsule clearance around the isolated via → trace → pad
    const cr = 2.1
    const h2 = new THREE.Path()
    h2.moveTo(via[0], via[1] - cr)
    h2.lineTo(pad[0], pad[1] - cr)
    h2.absarc(pad[0], pad[1], cr, -Math.PI / 2, Math.PI / 2, false)
    h2.lineTo(via[0], via[1] + cr)
    h2.absarc(via[0], via[1], cr, Math.PI / 2, Math.PI * 1.5, false)
    s.holes.push(h2)
    for (const [x, y] of stitches) {
      const h = new THREE.Path()
      h.absarc(x, y, 0.42, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 40 })
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const toW = (p: P2): [number, number] => [p[0], -p[1]]
  const [tx, tz] = toW(thermal)
  const [vx, vz] = toW(via)
  const [px, pz] = toW(pad)
  const trace = useMemo(() => traceGeometry([[vx, vz], [px, pz]], 1.0, 0.16), [vx, vz, px, pz])
  const hole = (x: number, z: number, r: number, k: string | number) => (
    <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
      <circleGeometry args={[r, 28]} />
      <meshStandardMaterial color="#120f0b" roughness={0.9} />
    </mesh>
  )
  return (
    <group rotation={[0, -0.05, 0]}>
      <Slab w={W} h={D} corner={2} />
      <group position={[0, THICK, 0]}>
        <mesh geometry={geo} castShadow receiveShadow>
          {copperMat(0.12)}
        </mesh>
        {/* thermal pad + four spokes */}
        <mesh geometry={ringGeometry(1.55, 0.55, 0.18)} position={[tx, 0, tz]} castShadow>
          <meshStandardMaterial color="#e1e4e8" metalness={1} roughness={0.2} />
        </mesh>
        {hole(tx, tz, 0.55, 'th')}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[tx + Math.cos((i * Math.PI) / 2) * 2.1, 0.07, tz + Math.sin((i * Math.PI) / 2) * 2.1]} rotation={[0, (-i * Math.PI) / 2, 0]} castShadow>
            <boxGeometry args={[1.5, 0.14, 0.75]} />
            {copperMat(0.12)}
          </mesh>
        ))}
        {/* isolated net: via → trace → pad */}
        <mesh geometry={trace} castShadow>
          {copperMat(0.12)}
        </mesh>
        <mesh geometry={ringGeometry(0.85, 0.38, 0.18)} position={[vx, 0, vz]} castShadow>
          {copperMat(0.12)}
        </mesh>
        {hole(vx, vz, 0.38, 'v')}
        <mesh geometry={ringGeometry(1.35, 0.55, 0.18)} position={[px, 0, pz]} castShadow>
          <meshStandardMaterial color="#e1e4e8" metalness={1} roughness={0.2} />
        </mesh>
        {hole(px, pz, 0.55, 'p')}
        {stitches.map((p, i) => {
          const [x, z] = toW(p)
          return (
            <group key={i}>
              <mesh geometry={ringGeometry(0.62, 0.26, 0.17)} position={[x, 0, z]}>
                {copperMat(0.12)}
              </mesh>
              {hole(x, z, 0.26, `s${i}`)}
            </group>
          )
        })}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 14 · Silkscreen                                                     */
/* ------------------------------------------------------------------ */

function Silkscreen() {
  const W = 30
  const D = 22
  const maps = useMemo(
    () =>
      paintedMaps(
        'silk-board',
        W,
        D,
        (ctx, ink) => {
          polyline(ctx, [[0, 9], [9, 9]], 0.6, ink('cuMask'))
          polyline(ctx, [[15, 9], [19, 9], [22, 12], [30, 12]], 0.6, ink('cuMask'))
          polyline(ctx, [[10, 17], [4, 17], [2, 19], [0, 19]], 0.6, ink('cuMask'))
          polyline(ctx, [[14, 17], [19, 17], [21, 15], [30, 15]], 0.6, ink('cuMask'))
          for (const [x, y] of [
            [10, 9],
            [14, 9],
            [10, 17],
            [14, 17],
          ])
            roundRect(ctx, x, y, 2.2, 2.6, 0.4, ink('pad'))
          // R1 outline + designator
          ctx.strokeStyle = ink('silk')
          ctx.lineWidth = 0.32
          ctx.lineJoin = 'round'
          ctx.strokeRect(7.6, 6.9, 8.8, 4.2)
          ctx.fillStyle = ink('silk')
          ctx.font = '600 4.2px "IBM Plex Mono", monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'alphabetic'
          ctx.fillText('R1', 12, 5.6)
          // D1: outline with a thick cathode bar, "+" on the anode
          ctx.strokeRect(7.6, 14.9, 8.8, 4.2)
          ctx.fillRect(7.45, 14.75, 1.1, 4.5)
          ctx.font = '600 3.2px "IBM Plex Mono", monospace'
          ctx.fillText('D1', 20.6, 18.3)
          ctx.fillRect(17.6, 13.0, 1.8, 0.36)
          ctx.fillRect(18.32, 12.28, 0.36, 1.8)
          // pin-1 dot & board name
          ctx.beginPath()
          ctx.arc(26.5, 3.3, 0.6, 0, Math.PI * 2)
          ctx.fill()
          ctx.font = '600 1.5px "IBM Plex Mono", monospace'
          ctx.textAlign = 'left'
          ctx.fillText('v1.0', 23.2, 20.6)
        },
        { ppm: 64 },
      ),
    [],
  )
  return (
    <group>
      <Slab w={W} h={D} corner={2} maps={maps} bumpScale={3} />
      <group position={[9, THICK, -7.5]} rotation={[0.42, -0.5, 0]}>
        <Squeegee len={17} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 15 · DRC: magnifier over a clearance error                          */
/* ------------------------------------------------------------------ */

function Drc() {
  const W = 30
  const D = 22
  const mark: P2 = [16.4, 12.75]
  const maps = useMemo(
    () =>
      paintedMaps(
        'drc-board',
        W,
        D,
        (ctx, ink, pass) => {
          polyline(ctx, [[0, 8], [12, 8], [16, 12], [30, 12]], 0.9, ink('cuMask'))
          polyline(ctx, [[0, 17], [12, 17], [15.2, 13.6], [18, 13.6], [20, 15.6], [30, 15.6]], 0.9, ink('cuMask'))
          polyline(ctx, [[0, 4], [30, 4]], 0.9, ink('cuMask'))
          for (const [x, y] of [
            [4, 20],
            [26, 20],
          ]) {
            circle(ctx, x, y, 1.2, ink('pad'))
            circle(ctx, x, y, 0.5, ink('hole'))
          }
          if (pass === 'color') {
            // the DRC marker
            ctx.strokeStyle = '#ff2bd1'
            ctx.lineWidth = 0.32
            ctx.beginPath()
            ctx.arc(mark[0], mark[1], 1.6, 0, Math.PI * 2)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(mark[0] - 0.9, mark[1] - 0.9)
            ctx.lineTo(mark[0] + 0.9, mark[1] + 0.9)
            ctx.moveTo(mark[0] + 0.9, mark[1] - 0.9)
            ctx.lineTo(mark[0] - 0.9, mark[1] + 0.9)
            ctx.stroke()
          }
        },
        { ppm: 64 },
      ),
    [],
  )
  const R = 7
  const zoom = 2.1
  const lens: [number, number, number] = [mark[0] - W / 2, THICK + 6, mark[1] - D / 2]
  return (
    <group>
      <Slab w={W} h={D} corner={2} maps={maps} />
      {/* glowing marker ring floating just above the board */}
      <mesh position={[mark[0] - W / 2, THICK + 0.25, mark[1] - D / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.14, 12, 48]} />
        <meshStandardMaterial color="#ff4fd8" emissive="#ff2bd1" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <group position={lens}>
        <group position={[0, -0.35, 0]}>
          <MagnifiedDisc map={maps.color} R={R - 0.4} u0={mark[0] / W} v0={1 - mark[1] / D} spanU={(R / zoom) / W} spanV={(R / zoom) / D} />
        </group>
        <group rotation={[0, 2.4, 0]}>
          <Magnifier R={R} handle={18} />
        </group>
        <Glow size={9} color="#ff2bd1" opacity={0.35} position={[0, 0.5, 0]} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 16 · Gerbers: fanned translucent films                              */
/* ------------------------------------------------------------------ */

function Gerbers() {
  const doc = useMemo(() => stages.finished(), [])
  const fw = doc.w + 4
  const fh = doc.h + 4
  const vb = `-2 -2 ${fw} ${fh}`
  const sz = { w: Math.round(fw * 36), h: Math.round(fh * 36), viewBox: vb, linear: true }
  const black = <rect x={-2} y={-2} width={fw} height={fh} fill="#000" />
  const reg = (
    <g stroke="#fff" strokeWidth={0.18} fill="none">
      {[
        [-1, -1],
        [doc.w + 1, -1],
        [-1, doc.h + 1],
        [doc.w + 1, doc.h + 1],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={0.55} />
          <line x1={x - 0.9} y1={y} x2={x + 0.9} y2={y} />
          <line x1={x} y1={y - 0.9} x2={x} y2={y + 0.9} />
        </g>
      ))}
    </g>
  )
  const layers = [
    { key: 'drill', color: '#8b8f98', art: <DrillArt doc={doc} fill="#fff" /> },
    { key: 'bcu', color: '#3f6fe0', art: <CopperArt doc={doc} side="bottom" fill="#fff" /> },
    { key: 'mask', color: '#a64fd6', art: <MaskOpeningsArt doc={doc} fill="#fff" /> },
    { key: 'tcu', color: '#e8453c', art: <CopperArt doc={doc} side="top" fill="#fff" pours={false} /> },
    { key: 'silk', color: '#f0c93a', art: <SilkArt doc={doc} fill="#fff" /> },
  ]
  /* eslint-disable react-hooks/rules-of-hooks */
  const texs = layers.map((l) =>
    useSvgTex(`gerber-${l.key}`, sz, () => (
      <>
        {black}
        {l.art}
        {reg}
      </>
    )),
  )
  /* eslint-enable react-hooks/rules-of-hooks */
  const film = useMemo(() => faceGeometry(fw, fh, 1.2), [fw, fh])
  return (
    <group rotation={[0, -0.35, 0]}>
      {layers.map((l, i) => {
        const a = (i - 2) * 0.2
        // fan around the front-left corner like a hand of cards
        const pivot = new THREE.Vector3(-fw / 2, 0, fh / 2)
        return (
          <group key={l.key} position={[pivot.x, i * 1.3, pivot.z]} rotation={[0, a, 0]}>
            <group position={[fw / 2, 0, -fh / 2]}>
              <mesh geometry={film} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
                <meshPhysicalMaterial color={l.color} transparent opacity={0.3} roughness={0.15} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
              {texs[i] && (
                <mesh geometry={film} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} castShadow>
                  <meshStandardMaterial color={l.color} emissive={l.color} emissiveIntensity={0.25} roughness={0.4} alphaMap={texs[i]} alphaTest={0.45} side={THREE.DoubleSide} />
                </mesh>
              )}
            </group>
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 17 · Ordering: shipping box + fresh boards                          */
/* ------------------------------------------------------------------ */

function Ordering() {
  const doc = useMemo(() => stages.finished(), [])
  const th = 0.85
  return (
    <group rotation={[0, -0.1, 0]}>
      <ShipBox w={42} d={30} h={20} />
      {/* a board standing in the box */}
      <group position={[-4, 8, -4]} rotation={[-1.25, 0, 0.1]}>
        <DocBoard doc={doc} id="order" parts={false} />
      </group>
      {/* one leaning against the side */}
      <group position={[33.2, 10.8, 1]} rotation={[0, 0, -1.08]}>
        <DocBoard doc={doc} id="order" parts={false} />
      </group>
      {/* a little stack in front */}
      {[0, 1].map((i) => (
        <group key={i} position={[16 + i * 0.6, i * (THICK + 0.05), 27 - i * 0.4]} rotation={[0, 0.3 - i * th * 0.2, 0]}>
          <DocBoard doc={doc} id="order" parts={false} />
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 18 · Bring-up: soldering iron on the Blinky board                   */
/* ------------------------------------------------------------------ */

function BringUp() {
  const doc = useMemo(() => stages.finished(), [])
  const r3 = doc.parts.find((p) => p.ref === 'R3')!
  const d1 = doc.parts.find((p) => p.ref === 'D1')!
  const tip = new THREE.Vector3(r3.x - doc.w / 2 - 0.2, THICK + 0.55, r3.y - 0.95 - doc.h / 2 - 0.1)
  const dir = new THREE.Vector3(-0.55, 0.62, -0.56).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir)
  return (
    <group>
      <group rotation={[0, -0.2, 0]}>
        <DocBoard doc={doc} id="bringup" />
        <Glow size={15} position={[d1.x - doc.w / 2, 2.6, d1.y - doc.h / 2]} opacity={0.9} />
        <pointLight position={[d1.x - doc.w / 2, 4, d1.y - doc.h / 2]} color="#ff3a1a" intensity={30} distance={14} decay={2} />
        <group position={tip} quaternion={q} scale={0.75}>
          <SolderingIron />
        </group>
      </group>
      <group position={[21, 0, 14]} rotation={[0, 0.5, 0]} scale={0.8}>
        <SolderSpool />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Capstone · the finished Blinky                                      */
/* ------------------------------------------------------------------ */

function Sandbox() {
  const doc = useMemo(() => stages.finished(), [])
  const d1 = doc.parts.find((p) => p.ref === 'D1')!
  return (
    <group rotation={[0, -0.32, 0]}>
      <DocBoard doc={doc} id="sandbox" />
      <Glow size={16} position={[d1.x - doc.w / 2, 2.6, d1.y - doc.h / 2]} opacity={0.9} />
      <pointLight position={[d1.x - doc.w / 2, 4, d1.y - doc.h / 2]} color="#ff3a1a" intensity={30} distance={14} decay={2} />
    </group>
  )
}

export const scenes: Record<string, SceneDef> = {
  'what-is-a-pcb': { Scene: WhatIsAPcb },
  electricity: { Scene: Electricity },
  components: { Scene: Components },
  footprints: { Scene: Footprints },
  'easyeda-tour': { Scene: EasyedaTour },
  'reading-schematics': { Scene: ReadingSchematics },
  'parts-datasheets': { Scene: PartsDatasheets },
  'drawing-schematic': { Scene: DrawingSchematic },
  'schematic-to-pcb': { Scene: SchematicToPcb },
  placement: { Scene: Placement },
  routing: { Scene: Routing },
  vias: { Scene: Vias },
  'ground-pour': { Scene: GroundPour },
  silkscreen: { Scene: Silkscreen },
  drc: { Scene: Drc },
  gerbers: { Scene: Gerbers },
  ordering: { Scene: Ordering },
  'bring-up': { Scene: BringUp },
  sandbox: { Scene: Sandbox },
}
