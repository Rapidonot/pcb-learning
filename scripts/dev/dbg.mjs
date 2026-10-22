import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const r = await page.evaluate(async () => {
  const svgs = [...document.querySelectorAll('svg[aria-hidden]')].filter(s => s.style.left === '-100000px')
  const out = []
  for (const svg of svgs) {
    const xml = new XMLSerializer().serializeToString(svg)
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
    const img = new Image()
    const res = await new Promise(r => { img.onload = () => r('ok ' + img.width + 'x' + img.height); img.onerror = (e) => r('error'); img.src = url })
    const c = document.createElement('canvas'); c.width = 200; c.height = 200
    const ctx = c.getContext('2d'); try { ctx.drawImage(img, 0, 0, 200, 200) } catch(e) { out.push('draw err ' + e) }
    const d = ctx.getImageData(100, 100, 1, 1).data
    out.push({ res, len: xml.length, px: [...d], head: xml.slice(0, 300) })
  }
  return out
})
console.log(JSON.stringify(r, null, 1))
await browser.close()
