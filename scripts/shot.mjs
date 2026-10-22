// usage: node scripts/shot.mjs <path> <out.png> [width] [height] [--full] [--dark] [--wait=ms] [--scroll=px]
import { chromium } from 'playwright'
const [, , path = '/', out = 'shot.png', w = '1440', h = '900', ...flags] = process.argv
const full = flags.includes('--full')
const dark = flags.includes('--dark')
const waitFlag = flags.find((f) => f.startsWith('--wait='))
const scrollFlag = flags.find((f) => f.startsWith('--scroll='))
const wait = waitFlag ? +waitFlag.split('=')[1] : 1500
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }).catch(async () => chromium.launch())
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 1), colorScheme: dark ? 'dark' : 'light' })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()) })
await page.goto('http://127.0.0.1:5173' + path, { waitUntil: 'networkidle' })
await page.waitForTimeout(wait)
if (scrollFlag) { await page.evaluate((y) => window.scrollTo(0, y), +scrollFlag.split('=')[1]); await page.waitForTimeout(400) }
await page.screenshot({ path: out, fullPage: full })
console.log(errors.slice(0, 15).join('\n') || 'no console errors')
await browser.close()
