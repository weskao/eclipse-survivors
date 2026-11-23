import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.ES2_ENEMY_QA_URL ?? 'http://127.0.0.1:4174'
const out = 'artifacts/es2-enemy-qa'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true })
const viewports = [
  ['desktop-1440', { width: 1440, height: 900 }],
  ['portrait-390', { width: 390, height: 844 }],
  ['landscape-640', { width: 640, height: 360 }],
]
let captured = 0
try {
  for (const [name, viewport] of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, acceptDownloads: true })
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    const response = await page.goto(base + '/src/assets/es2/production/enemies/qa-preview.html', {
      waitUntil: 'domcontentloaded', timeout: 30_000,
    })
    if (!response?.ok()) throw new Error(name + ': unavailable candidate QA page')
    await page.waitForFunction(
      () => document.querySelector('#summary')?.textContent?.includes('Decoded 10 / 10 enemy types'),
      { timeout: 30_000 },
    )
    if (errors.length) throw new Error(name + ': ' + errors.join('; '))
    const sections = await page.locator('.candidate').count()
    if (sections !== 10) throw new Error(name + ': expected 10 enemy sections, got ' + sections)
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (overflow > 2) throw new Error(name + ': horizontal UI overflow ' + overflow + 'px')
    await page.screenshot({ path: join(out, name + '.png'), fullPage: true })
    if (name === 'desktop-1440') {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Export actual pixel findings' }).click(),
      ])
      const path = join(out, 'all-10-factions-pixel-findings.json')
      await download.saveAs(path)
      const findings = JSON.parse(await readFile(path, 'utf8')).findings
      if (findings.length !== 10 || findings.some(entry => entry.error)) {
        throw new Error('Expected all 10 decoded faction artworks with no errors')
      }
      for (const entry of findings) {
        if (!entry.native3x || !entry.bodyNative3x || !entry.cueNative3x ||
            entry.humanApproval !== 'pending' || !entry.bodyQa || !entry.cueQa ||
            entry.bodyQa.blankFrames.length ||
            entry.cueQa.blankFrames.length || entry.bodyQa.borderRiskFrames.length ||
            entry.cueQa.borderRiskFrames.length) {
          throw new Error('Pixel integrity regression: ' + entry.kind)
        }
      }
    }
    captured += 1
    await page.close()
  }
  console.log('ES2 real browser per-frame QA screenshots:', captured, 'viewports, 10 enemy types')
} finally {
  await browser.close()
}
