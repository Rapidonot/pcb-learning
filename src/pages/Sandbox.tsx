import { TopBar } from '@/components/shell/Shell'
import { Editor } from '@/sandbox/Editor'

/** Capstone: build Blinky from scratch in a mini EasyEDA-style PCB editor. */
export default function Sandbox() {
  return (
    <div className="sbx-page">
      <TopBar>
        <div className="sbx-topbar-title">
          <span className="sbx-topbar-title__tag mono">CAPSTONE</span>
          <span className="display">Build Blinky from scratch</span>
        </div>
      </TopBar>
      <Editor />
    </div>
  )
}
