import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { BoardDoc } from '@/pcb/board'
import type { MaskColor } from '@/pcb/palette'
import { IconCheck, IconCube, IconX } from '@/components/icons'
import { totalTrackLength } from './geometry'

const Board3D = lazy(() => import('@/pcb/Board3D').then((m) => ({ default: m.Board3D })))

export function CompleteModal({ doc, maskColor, onClose, open3d }: { doc: BoardDoc; maskColor: MaskColor; onClose: () => void; open3d: () => void }) {
  const stats = useMemo(() => {
    const top = doc.tracks.filter((t) => t.layer === 'top').length
    return [
      { k: 'Track length', v: totalTrackLength(doc).toFixed(1), u: 'mm' },
      { k: 'Tracks', v: String(doc.tracks.length), u: `${top} top · ${doc.tracks.length - top} bottom` },
      { k: 'Vias', v: String(doc.vias.length), u: '' },
      { k: 'Board size', v: `${doc.w} × ${doc.h}`, u: 'mm' },
      { k: 'Parts', v: String(doc.parts.length), u: 'placed' },
      { k: 'DRC', v: '0', u: 'errors' },
    ]
  }, [doc])
  return (
    <div className="sbx-modal" role="dialog" aria-modal="true" aria-label="Board complete" onPointerDown={onClose}>
      <div className="sbx-modal__card sbx-done" onPointerDown={(e) => e.stopPropagation()} data-testid="complete-modal">
        <button className="sbx-ibtn sbx-done__close" onClick={onClose} aria-label="Close">
          <IconX size={16} />
        </button>
        <div className="sbx-done__grid">
          <div className="sbx-done__copy">
            <div className="sbx-done__badge">
              <IconCheck size={22} />
            </div>
            <div className="sbx-eyebrow mono">Capstone · all 6 goals</div>
            <h2 className="display sbx-done__title">Board complete!</h2>
            <p>
              You took Blinky from a pile of footprints to a routed, poured, rule-checked board. That is the whole PCB workflow, start to finish. The next step in EasyEDA would be
              <b> Export › PCB Fabrication File (Gerber)</b> and an order.
            </p>
            <dl className="sbx-done__stats">
              {stats.map((s) => (
                <div key={s.k}>
                  <dt className="mono">{s.k}</dt>
                  <dd className="mono">
                    {s.v} <small>{s.u}</small>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="sbx-row">
              <button className="sbx-btn sbx-btn--primary" onClick={open3d}>
                <IconCube size={15} /> Open the 3D view
              </button>
              <button className="sbx-btn" onClick={onClose}>
                Keep editing
              </button>
              <Link className="sbx-btn sbx-btn--ghost" to="/">
                Back to the course
              </Link>
            </div>
          </div>
          <div className="sbx-done__3d">
            <Suspense fallback={<div className="sbx-spinner" />}>
              <Board3D doc={doc} maskColor={maskColor} autoRotate blink quality="high" shadow />
            </Suspense>
            <span className="sbx-done__cap mono">Your board in 3D · the LED blinks at ~1.5 Hz</span>
          </div>
        </div>
      </div>
    </div>
  )
}
