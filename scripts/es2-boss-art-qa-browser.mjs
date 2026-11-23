import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

// This is an actual DEV Vite + engine + Canvas browser capture, not an AI mockup.
// Never mark QA_PENDING art as approved based on these technical screenshots.
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4174/'
const output = 'artifacts/es2-mobile-browser/boss-art-qa'
const bossIds = ['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph']
const viewports = [
  ['desktop-1440', 1440, 900, false],
  ['portrait-390', 390, 844, true],
  ['landscape-844', 844, 390, true],
]
const cases = []
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  for (const [viewport, width, height, mobile] of viewports) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile, hasTouch: mobile,
    })
    try {
      for (const id of bossIds) {
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        try {
          const url = new URL(base)
          url.searchParams.set('showcase', '1')
          url.searchParams.set('es2BossArtQa', id)
          await page.goto(url.href, { waitUntil: 'domcontentloaded' })
          await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
          await page.locator('.es2-start').click()
          await page.waitForFunction(() => window.__test?.mode === 'play', null, { timeout: 30000 })
          await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
          // Independently decode the EXACT review asset in the real browser.
          const decoded = await page.evaluate(async id => {
            const image = new Image()
            image.src = new URL('/src/assets/es2/production/bosses/candidates/' +
              id + '-phases-native3x-QA-PENDING.webp', location.origin).href
            await image.decode()
            return [image.naturalWidth, image.naturalHeight]
          }, id)
          assert.deepEqual(decoded, [2268, 756], id + ': candidate does not decode at native geometry')
          for (const phase of [1, 2, 3]) {
            await page.evaluate(phase => window.__test.showcaseBoss(phase), phase)
            const selected = await page.evaluate(() => window.__test.bossPreview)
            assert.deepEqual(selected, { id, phase },
              id + ': live Boss Controller does not match selected art/phase')
            const previousFrames = await page.evaluate(() => window.__test.frames)
            await page.waitForFunction(previous => window.__test?.frames > previous + 1,
              previousFrames, { timeout: 30000 })
            const name = id + '-phase-' + phase + '-' + viewport + '.png'
            await page.screenshot({ path: output + '/' + name, animations: 'disabled' })
            cases.push({ id, phase, viewport, file: name, browserDecoded: decoded, realCanvas: true,
              qaStatus: 'pending-human-visual-review' })
          }
          assert.deepEqual(errors, [], id + ' ' + viewport + ': uncaught browser errors')
          console.log('PASS: ' + id + ' real Canvas phases 1–3 at ' + viewport)
        } catch (error) {
          await page.screenshot({ path: output + '/' + id + '-' + viewport + '-failed.png' })
            .catch(() => {})
          throw error
        } finally {
          await page.close()
        }
      }
    } finally {
      await context.close()
    }
  }
  assert.equal(cases.length, 36, 'Expected all 4 bosses × 3 phases × 3 viewports')
  await writeFile(output + '/boss-art-qa-evidence.json', JSON.stringify({
    kind: 'real DEV Vite/Chromium engine Canvas captures',
    gitSha: process.env.GITHUB_SHA ?? null,
    note: 'This does NOT prove approved art, final native identity, or production bundle inclusion.',
    status: 'QA_PENDING',
    captures: cases,
  }, null, 2) + '\n')
  console.log('PASS: 36 real Canvas boss-art QA screenshots; approval remains pending')
} finally {
  await browser.close()
}
