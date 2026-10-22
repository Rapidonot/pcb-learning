import { useEffect, useState } from 'react'
import * as THREE from 'three'

/**
 * Rasterise a live <svg> element into a THREE texture. Re-renders whenever `key` changes.
 * The svg must not carry positioning styles itself (wrap it in a hidden div instead).
 */
export function useSvgTexture(svg: SVGSVGElement | null, key: string, opts: { linear?: boolean } = {}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!svg) return
    let cancelled = false
    const xml = new XMLSerializer().serializeToString(svg)
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const c = document.createElement('canvas')
      c.width = svg.width.baseVal.value
      c.height = svg.height.baseVal.value
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace
      t.anisotropy = 8
      setTex((old) => {
        old?.dispose()
        return t
      })
      URL.revokeObjectURL(url)
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [svg, key])
  return tex
}

