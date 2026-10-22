import { useState } from 'react'
import { Board3D } from '@/pcb/Board3D'
import type { BoardDoc } from '@/pcb/board'
import { MASKS, type FinishColor, type MaskColor } from '@/pcb/palette'

/** The 3D view (lazy-loaded: three.js is heavy). */
export default function View3D({ doc, maskColor, finish }: { doc: BoardDoc; maskColor: MaskColor; finish: FinishColor }) {
  const [auto, setAuto] = useState(true)
  const [blink, setBlink] = useState(true)
  const [cam, setCam] = useState<'iso' | 'top' | 'bottom'>('iso')
  const [mask, setMask] = useState<MaskColor>(maskColor)
  const [proj, setProj] = useState<'persp' | 'ortho'>('persp')
  return (
    <div className="sbx-3d">
      <Board3D key={`${cam}-${proj}`} doc={doc} maskColor={mask} finish={finish} autoRotate={auto} blink={blink} view={cam} camera={proj} quality="high" shadow />
      <div className="sbx-photo sbx-photo--3d" onPointerDown={(e) => e.stopPropagation()}>
        <div className="sbx-seg">
          {(['iso', 'top', 'bottom'] as const).map((v) => (
            <button key={v} className={cam === v ? 'is-on' : ''} onClick={() => setCam(v)}>
              {v === 'iso' ? 'Angle' : v === 'top' ? 'Top' : 'Bottom'}
            </button>
          ))}
        </div>
        <div className="sbx-seg">
          <button className={proj === 'persp' ? 'is-on' : ''} onClick={() => setProj('persp')}>
            Perspective
          </button>
          <button className={proj === 'ortho' ? 'is-on' : ''} onClick={() => setProj('ortho')}>
            Isometric
          </button>
        </div>
        <span className="sbx-photo__sep" />
        <div className="sbx-swatches" role="radiogroup" aria-label="Solder mask colour">
          {(Object.keys(MASKS) as MaskColor[]).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mask === m}
              aria-label={`${m} solder mask`}
              className={`sbx-swatch ${mask === m ? 'is-on' : ''}`}
              style={{ background: MASKS[m].mask }}
              onClick={() => setMask(m)}
            />
          ))}
        </div>
        <span className="sbx-photo__sep" />
        <div className="sbx-seg">
          <button className={auto ? 'is-on' : ''} onClick={() => setAuto((a) => !a)}>
            Spin
          </button>
          <button className={blink ? 'is-on' : ''} onClick={() => setBlink((b) => !b)}>
            Blink
          </button>
        </div>
      </div>
      <div className="sbx-hint mono">Drag to orbit · scroll to zoom · like View › 3D Preview in EasyEDA</div>
    </div>
  )
}
