/*
 * SVG artwork rasterised onto thumbnail props: schematic paper, an EasyEDA-style screen,
 * a datasheet page and the individual board layers (for the exploded stack and gerber films).
 * Everything reuses the site's own renderers so the thumbnails match the lessons.
 */
import type { ReactNode } from 'react'
import { BoardView, FootprintSilk, PadGlyph, PourFill, RefLabel, SilkTextEl, partTransform } from '@/pcb/render'
import { SchematicView } from '@/pcb/SchematicView'
import type { SchDoc } from '@/pcb/schematic'
import { analyze, type BoardDoc, type Layer } from '@/pcb/board'
import { getFootprint } from '@/pcb/footprints'
import { EDA } from '@/pcb/palette'

const pts = (p: [number, number][]) => p.map((q) => q.join(',')).join(' ')

/* ------------------------------------------------------------------ */
/* Schematic sheet: viewBox 0 0 440 311                                 */
/* ------------------------------------------------------------------ */

export const SHEET = { w: 440, h: 311 }

export function SchematicSheet({ doc, children }: { doc: SchDoc; children?: ReactNode }) {
  const grid: ReactNode[] = []
  for (let x = 10; x < SHEET.w; x += 10) grid.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={SHEET.h} stroke="#ebe5d6" strokeWidth={0.5} />)
  for (let y = 10; y < SHEET.h; y += 10) grid.push(<line key={`y${y}`} x1={0} y1={y} x2={SHEET.w} y2={y} stroke="#ebe5d6" strokeWidth={0.5} />)
  return (
    <g>
      <rect width={SHEET.w} height={SHEET.h} fill="#fbfaf6" />
      {grid}
      <rect x={6} y={6} width={SHEET.w - 12} height={SHEET.h - 12} fill="none" stroke="#9c8f78" strokeWidth={1.2} />
      <g transform="translate(6 2) scale(0.97)">
        <SchematicView doc={doc} showPinNames={false} />
        {children}
      </g>
      <g transform={`translate(${SHEET.w - 136} ${SHEET.h - 36})`}>
        <rect width={130} height={30} fill="#fbfaf6" stroke="#9c8f78" strokeWidth={1} />
        <line x1={0} y1={15} x2={130} y2={15} stroke="#9c8f78" strokeWidth={0.6} />
        <text x={6} y={11} fontSize={9} fontWeight={700} fill="#26241f" fontFamily="monospace">
          BLINKY · NE555
        </text>
        <text x={6} y={26} fontSize={7} fill="#6d6657" fontFamily="monospace">
          Sheet 1/1 · Rev A
        </text>
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* EasyEDA-like editor screen: viewBox 0 0 400 250                      */
/* ------------------------------------------------------------------ */

export function EdaScreen({ doc }: { doc: BoardDoc }) {
  const dots: ReactNode[] = []
  for (let x = 76; x < 336; x += 9) for (let y = 36; y < 226; y += 9) dots.push(<circle key={`${x},${y}`} cx={x} cy={y} r={0.55} fill="rgba(255,255,255,0.13)" />)
  const s = 6.4
  return (
    <g>
      <rect width={400} height={250} fill="#17191c" />
      {/* menu + toolbar */}
      <rect width={400} height={13} fill="#2a2d33" />
      {['#e8453c', '#f0b43c', '#3fb86b'].map((c, i) => (
        <circle key={c} cx={8 + i * 8} cy={6.5} r={2.4} fill={c} />
      ))}
      {[40, 64, 86, 110, 134].map((x) => (
        <rect key={x} x={x} y={4.5} width={16} height={4} rx={1} fill="#6b7078" />
      ))}
      <rect y={13} width={400} height={17} fill="#22252a" />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={76 + i * 15} y={17} width={10} height={9} rx={2} fill={i === 3 ? '#2f7de1' : '#3a3e46'} />
      ))}
      {/* left panel: layers */}
      <rect y={30} width={70} height={210} fill="#1e2125" />
      {[EDA.top, EDA.bottom, EDA.silkTop, EDA.silkBottom, EDA.outline, '#8a8f99', '#8a8f99'].map((c, i) => (
        <g key={i} transform={`translate(8 ${40 + i * 13})`}>
          <rect width={8} height={8} rx={1.5} fill={c} />
          <rect x={12} y={2} width={i < 5 ? 40 : 30} height={4} rx={1} fill="#4b5059" />
        </g>
      ))}
      {/* right panel: properties */}
      <rect x={340} y={30} width={60} height={210} fill="#1e2125" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={346} y={40 + i * 12} width={i % 3 === 0 ? 30 : 46} height={5} rx={1.5} fill={i % 3 === 0 ? '#5d636d' : '#353941'} />
      ))}
      {/* canvas */}
      <rect x={70} y={30} width={270} height={210} fill={EDA.bg} />
      {dots}
      <g transform={`translate(${205 - (doc.w * s) / 2} ${135 - (doc.h * s) / 2}) scale(${s})`}>
        <BoardView doc={doc} mode="eda" vis={{ ratsnest: false }} />
      </g>
      {/* status bar */}
      <rect y={240} width={400} height={10} fill="#2f7de1" />
      <rect x={6} y={243} width={60} height={4} rx={1} fill="rgba(255,255,255,0.6)" />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Datasheet page: viewBox 0 0 300 424                                  */
/* ------------------------------------------------------------------ */

export const PAGE = { w: 300, h: 424 }
/** centre of the pinout drawing on the page */
export const PINOUT = { x: 214, y: 150 }

export function DatasheetPage() {
  const text = (x: number, y: number, n: number, w: number) =>
    Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + i * 9} width={i === n - 1 ? w * 0.6 : w - (i % 3) * 6} height={3.6} rx={1.5} fill="#b9b2a3" />)
  const L = ['GND', 'TRIG', 'OUT', 'RESET']
  const R = ['VCC', 'DIS', 'THR', 'CV']
  const px = PINOUT.x
  const py = PINOUT.y
  return (
    <g fontFamily="sans-serif">
      <rect width={PAGE.w} height={PAGE.h} fill="#fdfcf8" />
      <rect width={PAGE.w} height={52} fill="#26241f" />
      <rect y={52} width={PAGE.w} height={4} fill="#e0542c" />
      <text x={20} y={33} fontSize={24} fontWeight={800} fill="#fdfcf8">
        NE555
      </text>
      <text x={108} y={25} fontSize={9.5} fill="#e9e2d2">
        Precision Timer
      </text>
      <text x={108} y={38} fontSize={7.5} fill="#a9a191">
        Single bipolar timer · SOIC-8 / DIP-8
      </text>
      {/* features */}
      <text x={20} y={78} fontSize={9} fontWeight={700} fill="#26241f">
        1 Features
      </text>
      {text(20, 88, 6, 130)}
      <text x={20} y={156} fontSize={9} fontWeight={700} fill="#26241f">
        2 Description
      </text>
      {text(20, 166, 7, 130)}
      {/* pinout */}
      <rect x={px - 62} y={py - 78} width={124} height={148} rx={4} fill="#f4f0e6" stroke="#ddd5c4" />
      <text x={px} y={py - 64} fontSize={7.5} fontWeight={700} fill="#26241f" textAnchor="middle">
        D PACKAGE (TOP VIEW)
      </text>
      <rect x={px - 22} y={py - 46} width={44} height={92} rx={3} fill="#2b2b2f" />
      <circle cx={px - 13} cy={py - 37} r={3.2} fill="#46464c" />
      {L.map((n, i) => (
        <g key={n}>
          <rect x={px - 34} y={py - 37 + i * 22} width={12} height={8} fill="#c9ccd1" />
          <text x={px - 37} y={py - 30.5 + i * 22} fontSize={8} fontWeight={700} fill="#26241f" textAnchor="end">
            {n}
          </text>
          <text x={px - 15} y={py - 30 + i * 22} fontSize={7} fill="#d8d8dc" textAnchor="middle">
            {i + 1}
          </text>
        </g>
      ))}
      {R.map((n, i) => (
        <g key={n}>
          <rect x={px + 22} y={py - 37 + i * 22} width={12} height={8} fill="#c9ccd1" />
          <text x={px + 37} y={py - 30.5 + i * 22} fontSize={8} fontWeight={700} fill="#26241f">
            {n}
          </text>
          <text x={px + 15} y={py - 30 + i * 22} fontSize={7} fill="#d8d8dc" textAnchor="middle">
            {8 - i}
          </text>
        </g>
      ))}
      {/* table */}
      <text x={20} y={252} fontSize={9} fontWeight={700} fill="#26241f">
        3 Pin Functions
      </text>
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <rect x={20} y={260 + i * 13} width={260} height={13} fill={i === 0 ? '#e7e0d0' : i % 2 ? '#fdfcf8' : '#f6f2e8'} />
          <rect x={26} y={265 + i * 13} width={24} height={3.6} rx={1.5} fill={i === 0 ? '#6d6657' : '#9a9282'} />
          <rect x={64} y={265 + i * 13} width={10} height={3.6} rx={1.5} fill="#b9b2a3" />
          <rect x={92} y={265 + i * 13} width={150 - (i % 3) * 20} height={3.6} rx={1.5} fill="#c8c1b2" />
        </g>
      ))}
      {/* waveform */}
      <rect x={20} y={360} width={260} height={48} fill="#f4f0e6" stroke="#ddd5c4" />
      <polyline points={pts([[28, 398], [60, 398], [60, 372], [100, 372], [100, 398], [140, 398], [140, 372], [180, 372], [180, 398], [220, 398], [220, 372], [260, 372], [260, 398], [272, 398]])} fill="none" stroke="#e0542c" strokeWidth={2} />
      <polyline points={pts([[28, 396], [60, 380], [100, 392], [140, 380], [180, 392], [220, 380], [260, 392], [272, 388]])} fill="none" stroke="#3767c9" strokeWidth={1.3} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Single board layers, in board mm (viewBox 0 0 doc.w doc.h)           */
/* ------------------------------------------------------------------ */

export function CopperArt({ doc, side, fill, pours = true }: { doc: BoardDoc; side: Layer; fill: string; pours?: boolean }) {
  const conn = analyze(doc)
  return (
    <g>
      {pours &&
        doc.pours
          .filter((p) => p.layer === side)
          .map((p) => <PourFill key={p.id} uid={`art${side}`} pour={p} doc={doc} conn={conn} fill={fill} />)}
      {doc.tracks
        .filter((t) => t.layer === side)
        .map((t) => (
          <polyline key={t.id} points={pts(t.pts)} fill="none" stroke={fill} strokeWidth={t.width} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      {conn.pads
        .filter((p) => p.layers.includes(side))
        .map((p) => (
          <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <PadGlyph pad={p} fill={fill} hole="#000" />
          </g>
        ))}
      {doc.vias.map((v) => (
        <g key={v.id}>
          <circle cx={v.x} cy={v.y} r={v.d / 2} fill={fill} />
          <circle cx={v.x} cy={v.y} r={v.drill / 2} fill="#000" />
        </g>
      ))}
    </g>
  )
}

export function SilkArt({ doc, fill }: { doc: BoardDoc; fill: string }) {
  return (
    <g>
      {doc.parts.map((p) => (
        <g key={p.ref} transform={partTransform(p)}>
          <FootprintSilk def={getFootprint(p.fp)} color={fill} />
        </g>
      ))}
      {doc.parts.map((p) => (
        <RefLabel key={p.ref} part={p} color={fill} />
      ))}
      {doc.texts.map((t) => (
        <SilkTextEl key={t.id} t={t} color={fill} />
      ))}
    </g>
  )
}

/** Mask openings (pads, slightly inflated) drawn in `fill` on a transparent background. */
export function MaskOpeningsArt({ doc, fill }: { doc: BoardDoc; fill: string }) {
  const conn = analyze(doc)
  return (
    <g>
      {conn.pads.map((p) => (
        <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
          <PadGlyph pad={p} fill={fill} hole={null} inflate={0.08} />
        </g>
      ))}
    </g>
  )
}

export function DrillArt({ doc, fill, outline = true }: { doc: BoardDoc; fill: string; outline?: boolean }) {
  const conn = analyze(doc)
  return (
    <g>
      {conn.pads
        .filter((p) => p.drill)
        .map((p) => (
          <circle key={p.key} cx={p.x} cy={p.y} r={p.drill! / 2 + 0.1} fill={fill} />
        ))}
      {doc.vias.map((v) => (
        <circle key={v.id} cx={v.x} cy={v.y} r={v.drill / 2 + 0.1} fill={fill} />
      ))}
      {outline && <rect x={0.1} y={0.1} width={doc.w - 0.2} height={doc.h - 0.2} rx={doc.corner} fill="none" stroke={fill} strokeWidth={0.2} />}
    </g>
  )
}
