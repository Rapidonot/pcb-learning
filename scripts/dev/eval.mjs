// usage: node scripts/dev/eval.mjs <path> "<js expression>"
import { chromium } from 'playwright'
const [, , path, expr] = process.argv
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:5173' + path, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
console.log(JSON.stringify(await page.evaluate(expr), null, 1))
await browser.close()
