/* "Wrong footprint" demo: put a part on a footprint and see whether its leads land on the pads. */
import { useMemo } from 'react'
import { PcbCanvas } from '@/pcb/PcbCanvas'
import { FootprintGraphic, PartBodyTop } from '@/pcb/render'
import { getFootprint, type FootprintDef } from '@/pcb/footprints'
import { geometry, mm, pkgById } from './pkgs'

export const FIT_OPTIONS = ['R0402', 'R0805', 'R1206', 'SOT-23', 'SOIC-8', 'DIP-8']

interface Contact {
  x: number
  y: number
  ok: boolean
  r: number
}

/** Where the part's terminals touch the board, and whether each lands on a pad of the footprint. */
function contacts(part: FootprintDef, fp: FootprintDef): Contact[] {
  return part.pads.map((t) => {
    const hit = fp.pads.some((p) => {
      if (p.shape === 'round') return Math.hypot(t.x - p.x, t.y - p.y) <= p.w / 2
      return Math.abs(t.x - p.x) <= p.w / 2 && Math.abs(t.y - p.y) <= p.h / 2
    })
    return { x: t.x, y: t.y, ok: hit, r: Math.max(0.18, Math.min(t.w, t.h) * 0.32) }
  })
}

export function verdict(partId: string, fpId: string) {
  const part = getFootprint(partId)
  const fp = getFootprint(fpId)
  const name = (id: string) => pkgById[id]?.label ?? id
  if (partId === fpId) return { ok: true, text: `A ${name(partId)} part on a ${name(fpId)} footprint: every lead lands squarely on its pad.` }
  const n = part.pads.length
  const m = fp.pads.length
  if (n !== m) return { ok: false, text: `The ${name(partId)} has ${n} leads, but the ${name(fpId)} footprint has ${m} pads. It can’t possibly be wired correctly.` }
  if (part.mount !== fp.mount)
    return {
      ok: false,
      text:
        part.mount === 'smd'
          ? `The ${name(partId)} has flat surface-mount legs, but the ${name(fpId)} footprint is drilled holes. Its legs are ${mm(geometry(part).pitch?.v ?? 0)} mm apart; the holes are ${mm(geometry(fp).pitch?.v ?? 0)} mm apart.`
          : `The ${name(partId)} has legs meant for holes, but the ${name(fpId)} footprint only has flat pads, ${mm(geometry(fp).pitch?.v ?? 0)} mm apart instead of ${mm(geometry(part).pitch?.v ?? 0)} mm.`,
    }
  if (part.body.kind === 'chip' && fp.body.kind === 'chip') {
    const bigger = part.body.w > fp.body.w
    return {
      ok: false,
      text: `A ${name(partId)} is ${mm(part.body.w)} mm long, but these pads are spaced for a ${mm(fp.body.w)} mm part. Its ends ${bigger ? 'overhang the pads' : 'barely reach the pads'}, so the joints would be weak or fail.`,
    }
  }
  return { ok: false, text: `The ${name(partId)}’s leads don’t line up with the ${name(fpId)} pads.` }
}

export function FitTest({ fpId, partId, insetL, top, bottom }: { fpId: string; partId: string; insetL: number; top: number; bottom: number }) {
  const fp = getFootprint(fpId)
  const part = getFootprint(partId)
  const cs = useMemo(() => contacts(part, fp), [part, fp])
  const fit = useMemo(() => {
    const w = Math.max(fp.courtyard.w, part.courtyard.w, part.body.w / 2) + 0.8
    const h = Math.max(fp.courtyard.h, part.courtyard.h, part.body.h / 2) + 0.8
    return { x: -w, y: -h, w: 2 * w, h: 2 * h }
  }, [fp, part])
  const u = Math.max(fit.w, fit.h) / 14
  const ok = partId === fpId
  return (
    <div className="l04-canvas" style={{ left: insetL, right: 0, top, bottom }}>
      <PcbCanvas fit={fit} theme="eda" grid={fit.w < 8 ? 0.1 : 0.5} majorEvery={fit.w < 8 ? 10 : 2} pad={u * 1.2} ariaLabel={`${pkgById[partId].label} part on a ${pkgById[fpId].label} footprint`}>
        <FootprintGraphic fp={fp} showSilk />
        <g key={`${partId}-${fpId}`} className="l04-drop" opacity={0.8}>
          <PartBodyTop fp={part} value={pkgById[partId]?.value} />
        </g>
        {cs.map((c, i) =>
          c.ok ? (
            <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="none" stroke="#3ddc84" strokeWidth={u * 0.08} />
          ) : (
            <g key={i} transform={`translate(${c.x} ${c.y})`} stroke="#ff4d6d" strokeWidth={u * 0.1} strokeLinecap="round">
              <line x1={-c.r} y1={-c.r} x2={c.r} y2={c.r} />
              <line x1={c.r} y1={-c.r} x2={-c.r} y2={c.r} />
            </g>
          ),
        )}
        {!ok && <rect x={fit.x + 0.1} y={fit.y + 0.1} width={fit.w - 0.2} height={fit.h - 0.2} fill="none" stroke="#ff4d6d" strokeWidth={u * 0.06} strokeDasharray={`${u * 0.4} ${u * 0.25}`} opacity={0.6} rx={u * 0.3} />}
      </PcbCanvas>
    </div>
  )
}
