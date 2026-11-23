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
      ...(viewport.name === 'portrait-375' || viewport.name === 'landscape-640'
        ? { recordVideo: { dir: directory, size: { width: viewport.width, height: viewport.height } } }
        : {}),
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      assert.match(await page.locator('#gameVersion').innerText(), /^v[0-9]/)
      await page.screenshot({ path: `${directory}/${viewport.name}-menu.png`, animations: 'disabled' })

      // Exercise the actual in-game Settings listbox across both phone orientations.
      await page.locator('.es2-top-actions [data-es2-settings]').click()
      await page.locator('#es2-quality').waitFor({ state: 'visible', timeout: 10000 })
      const selectors = page.locator('.es2-dialog button[role="combobox"]')
      assert.equal(await selectors.count(), 4, `${viewport.name}: all settings must use game dropdowns`)
      assert.equal(await page.locator('.es2-dialog select').count(), 0,
        `${viewport.name}: native dropdown found`)
      const quality = page.locator('#es2-quality')
      await quality.click()
      const listbox = page.locator('#es2-quality-listbox')
      await listbox.waitFor({ state: 'visible' })
      const listLayout = await listbox.evaluate(element => {
        const box = element.getBoundingClientRect()
        const viewport = window.visualViewport
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom,
          width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight,
          offsetLeft: viewport?.offsetLeft ?? 0, offsetTop: viewport?.offsetTop ?? 0 }
      })
      assert.ok(listLayout.left >= listLayout.offsetLeft - 2
        && listLayout.top >= listLayout.offsetTop - 2
        && listLayout.right <= listLayout.offsetLeft + listLayout.width + 2
        && listLayout.bottom <= listLayout.offsetTop + listLayout.height + 2,
      `${viewport.name}: dropdown clips outside viewport: ${JSON.stringify(listLayout)}`)
      await page.screenshot({ path: `${directory}/${viewport.name}-dropdown.png`, animations: 'disabled' })
      await page.keyboard.press('Escape')
      assert.equal(await quality.getAttribute('aria-expanded'), 'false',
        `${viewport.name}: Escape must close dropdown, not settings`)
      assert.ok(await page.locator('.es2-dialog').isVisible())
      await page.locator('.es2-close').click()
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
      if (viewport.width < viewport.height || (viewport.height <= 520 && viewport.width <= 900)) {
        const toggle = page.locator('[data-es2-info-toggle]')
        const panel = page.locator('[data-es2-info-panel]')
        await toggle.waitFor({ state: 'visible' })
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false', `${viewport.name}: drawer must start collapsed`)
        assert.equal(await panel.isVisible(), false, `${viewport.name}: optional panels occupy battlefield`)
        assert.equal(await page.locator('.es2-hud__bottom').isVisible(), false,
          `${viewport.name}: permanent skill bar blocks touch controls`)
        await page.screenshot({ path: `${directory}/${viewport.name}-compact-game.png`, animations: 'disabled' })
        await toggle.click()
        await panel.waitFor({ state: 'visible' })
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
        const drawerBounds = await page.evaluate(() => {
          const rect = element => {
            const box = element.getBoundingClientRect()
            return { x: box.x, y: box.y, right: box.right, bottom: box.bottom }
          }
          return {
            drawer: rect(document.querySelector('[data-es2-info-panel]')),
            toggle: rect(document.querySelector('[data-es2-info-toggle]')),
            joystick: rect(document.querySelector('[data-testid="es2-stick"]')),
            dash: rect(document.querySelector('[data-testid="es2-dash"]')),
          }
        })
        const intersects = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
        assert.ok(drawerBounds.drawer.x >= -2 && drawerBounds.drawer.y >= -2
          && drawerBounds.drawer.right <= viewport.width + 2 && drawerBounds.drawer.bottom <= viewport.height + 2,
        `${viewport.name}: expanded information overflows: ${JSON.stringify(drawerBounds)}`)
        assert.ok(!intersects(drawerBounds.drawer, drawerBounds.joystick) &&
          !intersects(drawerBounds.drawer, drawerBounds.dash),
        `${viewport.name}: information drawer obscures a touch control`)
        assert.ok(!intersects(drawerBounds.toggle, drawerBounds.joystick) &&
          !intersects(drawerBounds.toggle, drawerBounds.dash),
        `${viewport.name}: information toggle obscures a touch control`)
        await page.screenshot({ path: `${directory}/${viewport.name}-expanded-info.png`, animations: 'disabled' })
        await page.locator('[data-es2-info-close]').click()
        assert.equal(await panel.isVisible(), false, `${viewport.name}: close must restore battlefield`)
      }
      await page.screenshot({ path: `${directory}/${viewport.name}-game.png`, animations: 'disabled' })
      await page.locator('[data-testid="es2-dash"]').click()
      assert.deepEqual(errors, [], `${viewport.name}: uncaught browser runtime errors`)
      console.log(`PASS ${viewport.name}: game, controls, safe viewport, reduced-motion policy`)
    } catch (error) {
      await page.screenshot({ path: `${directory}/${viewport.name}-failed.png` }).catch(() => {})
      throw error
    } finally {
      await context.close()
      if (page.video()) await page.video().saveAs(`${directory}/${viewport.name}-live.webm`)
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
      const specialBounds = await page.evaluate(() => {
        const button = document.querySelector('[data-hero-special]')
        const dash = document.querySelector('[data-testid="es2-dash"]')
        const joystick = document.querySelector('[data-testid="es2-stick"]')
        if (!button || !dash || !joystick) return null
        const rect = element => {
          const b = element.getBoundingClientRect()
          return { x: b.x, y: b.y, right: b.right, bottom: b.bottom }
        }
        return { special: rect(button), dash: rect(dash), joystick: rect(joystick) }
      })
      assert.ok(specialBounds, `${heroId}: special action button missing`)
      const overlaps = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
      assert.ok(!overlaps(specialBounds.special, specialBounds.dash) &&
        !overlaps(specialBounds.special, specialBounds.joystick),
      `${heroId}: special action overlaps touch controls: ${JSON.stringify(specialBounds)}`)
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
