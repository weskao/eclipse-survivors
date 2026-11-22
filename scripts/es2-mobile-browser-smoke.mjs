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

  // Assert the three newly authored heroes actually render the *same* 900px
  // portrait in both selection and live HUD. Baseline controls above only
  // exercise the original knight and cannot catch a wrong new-hero sprite.
  for (const heroId of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded' })
      const card = page.locator(`button[data-hero-id="${heroId}"]`)
      await card.waitFor({ state: 'visible', timeout: 30000 })
      await card.click()
      assert.equal(await card.getAttribute('aria-pressed'), 'true')
      const cardPortrait = card.locator('img.es2-roster__portrait')
      await cardPortrait.evaluate(image => image.decode())
      const photo = await cardPortrait.evaluate(image => ({
        source: image.getAttribute('src'),
        width: image.naturalWidth, height: image.naturalHeight,
      }))
      assert.ok(photo.source.includes(heroId + '-portrait@3x'), `${heroId}: wrong menu portrait`)
      assert.deepEqual([photo.width, photo.height], [900, 900], `${heroId}: menu portrait is not true 3x`)
      const preview = await card.locator('.es2-hero-action-preview').evaluate(element => {
        const style = getComputedStyle(element)
        return { source: style.backgroundImage, size: style.backgroundSize }
      })
      assert.ok(preview.source.includes(heroId + '-run-attack@3x'),
        `${heroId}: no real 8-frame action preview`)
      assert.equal(preview.size, '800% 100%', `${heroId}: preview is not divided into 8 cells`)
      await page.screenshot({ path: `${directory}/portrait-375-${heroId}-selection.png`, animations: 'disabled' })
      await page.locator('.es2-start').click()
      // Newly selected specializations can enter a real level-up dialog at
      // run initialization. Choose an offered ability exactly as a player
      // would; the combat HUD is intentionally hidden while the modal is open.
      await page.waitForFunction(() =>
        !!document.querySelector('.es2-hud--active')
        || !!document.querySelector('.es2-backdrop button[data-choice]'), null, { timeout: 30000 })
      // Combat can accrue multiple queued upgrades from early waves. Process
      // each actual offer, but cap iterations to catch a broken infinite queue.
      let picks = 0
      for (; picks < 64; picks++) {
        if (await page.locator('.es2-hud--active').isVisible()) break
        const offered = page.locator('.es2-backdrop button[data-choice]:visible:not(:disabled)').first()
        await offered.waitFor({ state: 'visible', timeout: 30000 })
        await offered.click()
      }
      const mode = await page.evaluate(() => window.__test?.mode)
      assert.equal(mode, 'play', `${heroId}: still in ${mode} after ${picks} real upgrade picks`)
      const hudPortrait = page.locator('.es2-hud--active .es2-hud__portrait img')
      await hudPortrait.waitFor({ state: 'visible', timeout: 30000 })
      await hudPortrait.evaluate(image => image.decode())
      const hud = await hudPortrait.evaluate(image => ({
        source: image.getAttribute('src'),
        width: image.naturalWidth, height: image.naturalHeight,
      }))
      assert.ok(hud.source.includes(heroId + '-portrait@3x'), `${heroId}: HUD renders wrong hero`)
      assert.deepEqual([hud.width, hud.height], [900, 900], `${heroId}: HUD loads low-resolution art`)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
        `${heroId}: portrait game viewport horizontally overflows`)
      await page.screenshot({ path: `${directory}/portrait-375-${heroId}-game.png`, animations: 'disabled' })
      assert.deepEqual(errors, [], `${heroId}: uncaught browser errors`)
      console.log(`PASS ${heroId}: committed portrait and action preview, same hero on in-game HUD`)
    } catch (error) {
      await page.screenshot({ path: `${directory}/portrait-375-${heroId}-failed.png` }).catch(() => {})
      throw error
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
