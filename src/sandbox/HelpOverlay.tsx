import { useEffect, useRef } from 'react'
import { Keys } from '@/components/ui'
import { IconX } from '@/components/icons'
import { SHORTCUTS } from './shortcuts'

const SOURCE = {
  pro: { label: 'EasyEDA Pro', cls: 'is-pro' },
  std: { label: 'Std Edition', cls: 'is-std' },
  sandbox: { label: 'Sandbox', cls: '' },
}

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div className="sbx-modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onPointerDown={onClose}>
      <div className="sbx-modal__card sbx-help" ref={ref} tabIndex={-1} onPointerDown={(e) => e.stopPropagation()}>
        <header className="sbx-modal__head">
          <div>
            <div className="sbx-eyebrow mono">Keyboard</div>
            <h2 className="display">Shortcuts</h2>
          </div>
          <span className="grow" />
          <button className="sbx-ibtn" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </header>
        <div className="sbx-help__legend">
          <span className="sbx-src is-pro">EasyEDA Pro</span> default in EasyEDA Pro (per our fact-checked reference)
          <span className="sbx-src is-std">Std Edition</span> Standard Edition key
          <span className="sbx-src">Sandbox</span> only in this sandbox
        </div>
        <div className="sbx-help__grid">
          {SHORTCUTS.map((g) => (
            <section key={g.title}>
              <h3 className="mono">{g.title}</h3>
              <ul>
                {g.items.map((s) => (
                  <li key={s.action}>
                    <span className="sbx-help__keys">
                      {s.keys.map((k, i) => (
                        <span key={k}>
                          {i > 0 && <span className="muted"> / </span>}
                          {/^[A-Z][a-z]+-?[a-z]*$/.test(k) && !['Space', 'Esc', 'Delete', 'Backspace'].includes(k) ? <span className="sbx-help__mouse mono">{k}</span> : <Keys combo={k} />}
                        </span>
                      ))}
                    </span>
                    <span className="grow">
                      {s.action}
                      {s.note && <span className="sbx-help__note">{s.note}</span>}
                    </span>
                    <span className={`sbx-src ${SOURCE[s.source].cls}`}>{SOURCE[s.source].label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="sbx-help__foot">
          EasyEDA Pro shortcuts depend on the <b>shortcut theme</b> (Professional or Standard, chosen since v1.9) and can be remapped. Check <b>Settings › Shortcuts</b> in your copy, and lean on the
          menu paths when in doubt.
        </footer>
      </div>
    </div>
  )
}
