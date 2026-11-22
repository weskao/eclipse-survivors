import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const target = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const directory = 'artifacts/es2-mobile-browser'
const viewports = [
  { name: 'portrait-320', width: 320, height: 640 },
  { name: 'portrait-375', width: 375, height: 812 },
  { name: 'landscape-640', width: 640, height: 320 },
  { name: 'landscape-812', width: 812, height: 375 },
]

await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      reducedMotion: viewport.name === 'portrait-320' ? 'reduce' : 'no-preference',
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      assert.match(await page.locator('#gameVersion').innerText(), /^v[0-9]/)
      await page.screenshot({ path: `${directory}/${viewport.name}-menu.png`, animations: 'disabled' })
      await page.locator('.es2-start').click()
      await page.locator('.es2-mobile-controls[data-active="true"]').waitFor({ state: 'visible', timeout: 30000 })
      const layout = await page.evaluate(() => {
        const joystick = document.querySelector('[data-testid="es2-stick"]')
        const dash = document.querySelector('[data-testid="es2-dash"]')
        const rect = element => {
          const b = element.getBoundingClientRect()
          return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }
        }
        return {
          width: innerWidth, height: innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          joystick: rect(joystick), dash: rect(dash),
          dashDisabled: dash.disabled,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        }
      })
      const margin = 2
      assert.ok(layout.documentWidth <= layout.width + margin,
        `${viewport.name}: horizontal page overflow ${layout.documentWidth} > ${layout.width}`)
      for (const [name, b] of [['joystick', layout.joystick], ['dash', layout.dash]]) {
        assert.ok(b.width >= 44 && b.height >= 44,
          `${viewport.name}: ${name} is below a 44 CSS px touch target`)
        assert.ok(b.x >= -margin && b.y >= -margin && b.right <= layout.width + margin &&
          b.bottom <= layout.height + margin,
        `${viewport.name}: ${name} is outside the visible viewport: ${JSON.stringify(b)}`)
      }
      assert.ok(layout.joystick.right <= layout.dash.x ||
        layout.dash.right <= layout.joystick.x,
      `${viewport.name}: joystick and dash controls overlap`)
      assert.equal(layout.dashDisabled, false, `${viewport.name}: dash must be enabled during gameplay`)
      if (viewport.name === 'portrait-320') assert.equal(layout.reducedMotion, true)
      await page.screenshot({ path: `${directory}/${viewport.name}-game.png`, animations: 'disabled' })
      await page.locator('[data-testid="es2-dash"]').click()
      assert.deepEqual(errors, [], `${viewport.name}: uncaught browser runtime errors`)
      console.log(`PASS ${viewport.name}: game, controls, safe viewport, reduced-motion policy`)
    } catch (error) {
      await page.screenshot({ path: `${directory}/${viewport.name}-failed.png` }).catch(() => {})
      throw error
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
