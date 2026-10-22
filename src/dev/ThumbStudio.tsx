/*
 * DEV ONLY — "thumbnail studio": renders one lesson thumbnail diorama full-screen on a transparent
 * background so scripts/render-thumbs.mjs can screenshot it.
 *
 *   /__studio?id=routing        one scene
 *   /__studio                   index of all scenes
 */
import { useEffect } from 'react'
import { Stage } from './studio/Stage'
import { scenes } from './studio/scenes'

export default function ThumbStudio() {
  const id = new URLSearchParams(window.location.search).get('id')
  useEffect(() => {
    // the page itself must be see-through so the screenshot keeps only the render
    const prev = [document.documentElement.style.background, document.body.style.background]
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.classList.add('thumb-studio')
    const style = document.createElement('style')
    style.textContent = 'body.thumb-studio::before{display:none!important}'
    document.head.appendChild(style)
    window.__thumbReady = false
    return () => {
      document.documentElement.style.background = prev[0]
      document.body.style.background = prev[1]
      document.body.classList.remove('thumb-studio')
      style.remove()
    }
  }, [])

  if (!id) {
    return (
      <div style={{ padding: 24, fontFamily: 'var(--font-mono)' }}>
        <h1>Thumbnail studio</h1>
        <ul>
          {Object.keys(scenes).map((k) => (
            <li key={k}>
              <a href={`/__studio?id=${k}`}>{k}</a>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  const scene = scenes[id]
  if (!scene) return <div style={{ padding: 24 }}>Unknown thumbnail id “{id}”.</div>
  const { Scene, stage } = scene
  return (
    <Stage {...stage}>
      <Scene />
    </Stage>
  )
}
