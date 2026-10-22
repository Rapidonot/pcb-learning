import { useMemo } from 'react'
import { blinkySchematic, SCH_BOUNDS } from '@/pcb/schematic'
import { SchematicView } from '@/pcb/SchematicView'
import { netlist, netInfo } from '@/pcb/project'
import { IconX } from '@/components/icons'
import { EditorCanvas } from './EditorCanvas'

/** Read-only schematic for cross-probing: click a symbol to find its footprint, a pin to highlight its net. */
export function SchematicDrawer({
  open,
  onClose,
  selectedRefs,
  highlightNet,
  onSymbol,
  onNet,
}: {
  open: boolean
  onClose: () => void
  selectedRefs: string[]
  highlightNet: string | null
  onSymbol: (ref: string) => void
  onNet: (net: string) => void
}) {
  const sch = useMemo(() => blinkySchematic(), [])
  return (
    <section className={`sbx-sch ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label="Schematic" onPointerDown={(e) => e.stopPropagation()}>
      <header className="sbx-sch__head">
        <span className="sbx-sch__tab mono">Blinky.SCH</span>
        <span className="sbx-sch__hint">Click a symbol to find it on the PCB · click a pin to highlight its net</span>
        <span className="grow" />
        <button className="sbx-ibtn" onClick={onClose} aria-label="Close schematic">
          <IconX size={15} />
        </button>
      </header>
      <div className="sbx-sch__canvas">
        {open && (
          <EditorCanvas fit={SCH_BOUNDS} theme="schematic" grid={10} pad={8} zoomControls={false} ariaLabel="Blinky schematic">
            <SchematicView
              doc={sch}
              highlightRefs={selectedRefs}
              highlightNet={highlightNet}
              dimOthers={selectedRefs.length > 0}
              onSymbolPointerDown={(ref, e) => {
                e.stopPropagation()
                onSymbol(ref)
              }}
              onPinPointerDown={(pin, e) => {
                e.stopPropagation()
                const n = netlist[pin.key]
                if (n) onNet(n)
              }}
              pinHitRadius={4}
            />
          </EditorCanvas>
        )}
      </div>
      <footer className="sbx-sch__foot">
        {highlightNet ? (
          <span>
            <i style={{ background: netInfo[highlightNet]?.color }} /> Net <b className="mono">{highlightNet}</b>: {netInfo[highlightNet]?.about}
          </span>
        ) : selectedRefs.length ? (
          <span>
            Cross-probing <b className="mono">{selectedRefs.join(', ')}</b>. In EasyEDA Pro this is Shift+X.
          </span>
        ) : (
          <span>The PCB was converted from this schematic, so every symbol has a matching footprint.</span>
        )}
      </footer>
    </section>
  )
}
