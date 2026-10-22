/* Footprint lab: one package, big, on an EDA canvas. */
import { useMemo } from 'react'
import { PcbCanvas } from '@/pcb/PcbCanvas'
import { FootprintGraphic, PadGlyph, PartBodyTop } from '@/pcb/render'
import { getFootprint, type PadDef } from '@/pcb/footprints'
import { Dimensions, footprintBounds, pkgById, unitFor } from './pkgs'

export interface LabVis {
  body: boolean
  numbers: boolean
  courtyard: boolean
  silk: boolean
  dims: boolean
}

export function Lab({
  pkg,
  vis,
  selPad,
  onPad,
  hintPin1,
  insetL,
  insetR,
  top,
}: {
  pkg: string
  vis: LabVis
  selPad: string | null
  onPad: (p: PadDef) => void
  hintPin1: boolean
  insetL: number
  insetR: number
  top: number
}) {
  const fp = getFootprint(pkg)
  const u = unitFor(fp)
  const fit = useMemo(() => footprintBounds(fp, u), [fp, u])
  const span = Math.max(fit.w, fit.h)
  const grid = span < 8 ? 0.1 : 0.5
  const major = span < 8 ? 10 : 2
  const p1 = fp.pads[0]
  return (
    <div className="l04-canvas" style={{ left: insetL, right: insetR, top }}>
      <PcbCanvas fit={fit} theme="eda" grid={grid} majorEvery={major} pad={0} ariaLabel={`${fp.name} footprint`}>
        <FootprintGraphic fp={fp} showSilk={vis.silk} showCourtyard={vis.courtyard} highlightPad={selPad ?? undefined} />
        {vis.courtyard && (
          <text x={fp.courtyard.w} y={-fp.courtyard.h - u * 0.25} fontSize={u * 0.42} textAnchor="end" className="l04-dimtext" fill="rgba(255,255,255,0.45)">
            courtyard
          </text>
        )}
        {vis.body && (
          <g className="l04-body" opacity={0.86} style={{ pointerEvents: 'none' }}>
            <PartBodyTop fp={fp} value={pkgById[pkg]?.value} />
          </g>
        )}
        {vis.numbers &&
          fp.pads.map((p) => (
            <text
              key={p.num}
              x={p.x}
              y={p.y}
              fontSize={Math.max(0.26, Math.min(p.w, p.h) * 0.45)}
              textAnchor="middle"
              dominantBaseline="central"
              className="l04-padnum"
              style={{ pointerEvents: 'none' }}
            >
              {p.name ?? p.num}
            </text>
          ))}
        {hintPin1 && selPad !== '1' && (
          <g transform={`translate(${p1.x} ${p1.y})`} style={{ pointerEvents: 'none' }}>
            <circle r={Math.max(p1.w, p1.h) * 0.75} fill="none" stroke="#ffd166" strokeWidth={u * 0.07} className="pin-hint" />
          </g>
        )}
        {/* hit areas */}
        {fp.pads.map((p) => (
          <g key={p.num} transform={`translate(${p.x} ${p.y})`} onPointerDown={() => onPad(p)} style={{ cursor: 'pointer' }} role="button" aria-label={`Pad ${p.num}`}>
            <PadGlyph pad={p} fill="transparent" hole={null} inflate={0.12} />
          </g>
        ))}
        {vis.dims && <Dimensions fp={fp} u={u} hlPitch={pkg === 'SOIC-8'} />}
      </PcbCanvas>
    </div>
  )
}
