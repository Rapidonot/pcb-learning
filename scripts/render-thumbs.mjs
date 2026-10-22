// Render the lesson thumbnails from the dev-only thumbnail studio (/__studio) and optimise them.
//
// usage: node scripts/render-thumbs.mjs [id ...] [--raw-only]
//   needs the Vite dev server on http://127.0.0.1:5173 (npm run dev)
//   raw captures:   .thumbs-raw/<id>.png     (1280×960, transparent)
//   final images:   public/thumbs/<id>.webp  (via scripts/optimize-thumbs.py)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173'
const args = process.argv.slice(2)
const rawOnly = args.includes('--raw-only')
let ids = args.filter((a) => !a.startsWith('--'))
const rawDir = join(root, '.thumbs-raw')
mkdirSync(rawDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const ctx = await browser.newContext({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 2 })

if (!ids.length) {
  // the studio index lists every scene
  const page = await ctx.newPage()
  await page.goto(`${BASE}/__studio`, { waitUntil: 'networkidle' })
  ids = await page.$$eval('a[href^="/__studio?id="]', (as) => as.map((a) => new URL(a.href).searchParams.get('id')))
  await page.close()
}

const failed = []
for (const id of ids) {
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const t0 = Date.now()
  try {
    await page.goto(`${BASE}/__studio?id=${id}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__thumbReady === true || !!window.__thumbError, null, { timeout: 180_000, polling: 250 })
    const err = await page.evaluate(() => window.__thumbError)
    if (err) throw new Error(err)
    await page.waitForTimeout(300)
    await page.screenshot({ path: join(rawDir, `${id}.png`), omitBackground: true })
    console.log(`✓ ${id}  ${((Date.now() - t0) / 1000).toFixed(1)}s${errors.length ? '  (console: ' + errors[0] + ')' : ''}`)
  } catch (e) {
    failed.push(id)
    console.log(`✗ ${id}: ${e.message}\n  ${errors.slice(0, 3).join('\n  ')}`)
  }
  await page.close()
}
await browser.close()

if (!rawOnly) {
  const ok = ids.filter((i) => !failed.includes(i))
  const r = spawnSync('python3', [join(root, 'scripts/optimize-thumbs.py'), rawDir, join(root, 'public/thumbs'), ...ok], { stdio: 'inherit' })
  if (r.status) process.exitCode = r.status
}
if (failed.length) {
  console.log('failed:', failed.join(', '))
  process.exitCode = 1
}
