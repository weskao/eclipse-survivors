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
  { name: 'landscape-932', width: 932, height: 430 },
]

await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  // Run the real fine-pointer interaction before mobile-only scenarios.
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  try {
    const page = await desktop.newPage()
    await page.goto(target, { waitUntil: 'domcontentloaded' })
    const portal = page.locator('.es2-portal-start')
    await portal.waitFor({ state: 'visible', timeout: 30000 })
    const paint = () => portal.evaluate(el => {
      const rect = el.getBoundingClientRect()
      return { frame: getComputedStyle(el, '::before').backgroundImage,
        fill: getComputedStyle(el, '::after').backgroundImage,
        width: rect.width, height: rect.height, x: rect.x, y: rect.y,
        sweep: getComputedStyle(el.querySelector('.es2-portal-sheen'), '::before').animationName,
        menu: !!el.closest('.es2-menu'),
        core: getComputedStyle(el.querySelector('.es2-portal-core')).transform,
        glow: getComputedStyle(el.querySelector('.es2-portal-decoration')).boxShadow,
        outline: getComputedStyle(el).outlineStyle,
      }
    })
    await page.mouse.move(0, 0)
    const idle = await paint()
    await portal.screenshot({ path: directory + '/portal-start-idle.png', animations: 'disabled' })
    await portal.hover()
    const hover = await paint()
    assert.equal(idle.sweep, 'none', 'Idle must not shimmer')
    assert.equal(hover.frame, idle.frame, 'The metallic rim is already illuminated at rest')
    assert.equal(hover.fill, idle.fill, 'The dimensional interior is already illuminated at rest')
    assert.equal(hover.core, idle.core, 'Hover must not resize or rotate the core')
    assert.equal(hover.glow, idle.glow, 'The magical glow is already visible at rest')
    assert.equal(hover.sweep, 'es2-portal-sweep')
    assert.deepEqual([hover.x, hover.y, hover.width, hover.height], [idle.x, idle.y, idle.width, idle.height], 'Hover must not move the hit area')
    assert.equal(hover.menu, true)
    await page.waitForTimeout(220)
    await portal.screenshot({ path: directory + '/portal-start-hover.png' })
    await page.mouse.move(0, 0)
    assert.equal((await paint()).frame, idle.frame, 'Leaving the portal restores its idle rim')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await portal.hover()
    assert.equal((await paint()).sweep, 'none', 'Reduced motion disables the sweep')
    assert.equal((await paint()).frame, idle.frame, 'Reduced motion preserves the metallic rim')
    assert.equal((await paint()).outline, 'solid', 'Reduced motion retains a static hover indicator')
    await page.mouse.move(0, 0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.evaluate(() => document.documentElement.dataset.es2ReduceFlashing = 'true')
    await portal.hover()
    assert.equal((await paint()).sweep, 'none', 'Reduced flashing disables the sweep')
    await page.mouse.move(0, 0)
    await page.keyboard.press('Tab')
    await portal.focus()
    assert.equal(await portal.evaluate(el => el.matches(':focus-visible')), true, 'Expected keyboard focus')
    assert.equal((await paint()).frame, idle.frame, 'Keyboard focus preserves the metallic rim')
    assert.equal((await paint()).outline, 'solid', 'Keyboard focus retains a visible outline')
    await page.screenshot({ path: directory + '/portal-start-focus.png', animations: 'disabled' })
    console.log('PASS desktop: portal hover, leave, focus, stable hit area and accessibility')
  } finally { await desktop.close() }

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
      const assertHomepage = async (section) => {
        await page.locator('.es2-menu').evaluate(element => { element.scrollTop = 0 })
        const layout = await page.evaluate(() => {
          const start = document.querySelector('.es2-start')
          const rect = start.getBoundingClientRect()
          const root = document.querySelector('.es2-menu')
          const bar = document.querySelector('.es2-menu-action-bar')
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          return {
            startHeight: rect.height, startHit: start.contains(hit),
            menuBottom: root.getBoundingClientRect().bottom, barTop: bar.getBoundingClientRect().top,
            menuOverflowX: root.scrollWidth - root.clientWidth,
            startTop: rect.top, startBottom: rect.bottom,
            viewportHeight: window.visualViewport?.height ?? window.innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            menuScroll: root.scrollTop,
          }
        })
        assert.ok(layout.startTop >= -2 && layout.startBottom <= layout.viewportHeight + 2,
          `${viewport.name}: ${section}: Start must be visible before scrolling ${JSON.stringify(layout)}`)
        assert.ok(layout.documentWidth <= layout.viewportWidth + 2,
          `${viewport.name}: ${section}: horizontal overflow ${JSON.stringify(layout)}`)
        assert.equal(layout.menuScroll, 0, `${viewport.name}: ${section}: homepage auto-scrolled`)
        assert.ok(layout.startHeight >= 44 && layout.startHit, `${viewport.name}: ${section}: Start is obscured or too small ${JSON.stringify(layout)}`)
        assert.ok(layout.menuOverflowX <= 2, `${viewport.name}: ${section}: menu scrolls horizontally ${JSON.stringify(layout)}`)
        if (viewport.width > viewport.height) {
          assert.ok(layout.menuBottom <= layout.barTop + 2, `${viewport.name}: ${section}: selection area overlaps Start dock ${JSON.stringify(layout)}`)
          const scrolled = await page.locator('.es2-menu').evaluate(root => {
            root.scrollTop = root.scrollHeight
            const start = root.querySelector('.es2-start'), rect = start.getBoundingClientRect()
            const visible = rect.top >= 0 && rect.bottom <= innerHeight + 2 && start.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
            root.scrollTop = 0
            return visible
          })
          assert.ok(scrolled, `${viewport.name}: ${section}: Start becomes inaccessible when scrolling`)
        }
      }
      const assertHeroArtUsesSpace = async (family) => {
        const selector = family === 'new'
          ? '.es2-hero-section .es2-roster__portrait'
          : '.es2-hero-section .es2-hero-card img'
        const portraits = await page.locator(selector).evaluateAll(elements => elements.map(element => {
          const rect = element.getBoundingClientRect()
          const card = element.closest('.es2-hero-select-card').getBoundingClientRect()
          const copy = element.nextElementSibling.getBoundingClientRect()
          return { height:rect.height, width:rect.width, top:rect.top, bottom:rect.bottom, copyTop:copy.top, copyBottom:copy.bottom, cardBottom:card.bottom }
        }))
        // Prior small, fixed 10dvh images wasted most of the portrait viewport.
        // Landscape remains bounded by 44px navigation and compact action controls.
        const minimum = viewport.height >= viewport.width
          ? Math.min(120, viewport.height * 0.15)
          : Math.min(60, viewport.height * 0.18)
        assert.equal(portraits.length, 3)
        for (const art of portraits) {
          assert.ok(art.height >= minimum,
            `${viewport.name}: ${family} art wastes available space: ${JSON.stringify({art, minimum})}`)
          assert.ok(art.bottom <= art.copyTop + 2 && art.copyBottom <= art.cardBottom + 2,
            `${viewport.name}: ${family} art or stats clipped: ${JSON.stringify(art)}`)
        }
      }
      await assertHomepage('all heroes')
      await assertHeroArtUsesSpace('classic')
      await assertHeroArtUsesSpace('new')
      assert.equal(await page.locator('[data-hero]:visible, [data-hero-id]:visible').count(), 6)
      assert.equal(await page.locator('[data-es2-hall-navigation] button:visible').count(), 5)
      await page.screenshot({ path: `${directory}/${viewport.name}-menu.png`, animations: 'disabled' })
      await page.locator('[data-es2-expedition-navigation]').click()
      assert.equal(await page.locator('.es2-mode-section').isVisible(), true)
      assert.equal(await page.locator('[data-mode]:visible, [data-objective-mode]:visible').count(), 9)
      assert.equal(await page.locator('.es2-hero-section').isVisible(), false)
      await assertHomepage('expedition selection')
      await page.screenshot({ path: `${directory}/${viewport.name}-menu-objectives.png`, animations: 'disabled' })
      await page.locator('[data-es2-expedition-navigation]').click()
      await assertHomepage('return to all heroes')

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
      const hudControls = await page.locator('.es2-hud__controls .es2-hud__control-button').evaluateAll(buttons =>
        buttons.map(button => {
          const box = button.getBoundingClientRect()
          return { width: box.width, height: box.height, label: button.getAttribute('aria-label') }
        }))
      assert.equal(hudControls.length, 4, `${viewport.name}: audio/home/settings/pause must share a class`)
      for (const control of hudControls) {
        assert.ok(Math.abs(control.width - 44) <= 1 && Math.abs(control.height - 44) <= 1,
          `${viewport.name}: HUD action differs from 44px: ${JSON.stringify(control)}`)
      }
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
      if (viewport.width < viewport.height || (viewport.height <= 520 && viewport.width <= 1100)) {
        const toggle = page.locator('[data-es2-info-toggle]')
        const panel = page.locator('[data-es2-info-panel]')
        await toggle.waitFor({ state: 'visible' })
        const iconOffset = await toggle.evaluate(button => {
          const icon = button.querySelector('svg')
          if (!icon) return null
          const b = button.getBoundingClientRect(), i = icon.getBoundingClientRect()
          return { x: Math.abs((b.left + b.right - i.left - i.right) / 2),
            y: Math.abs((b.top + b.bottom - i.top - i.bottom) / 2) }
        })
        assert.ok(iconOffset && iconOffset.x <= 1 && iconOffset.y <= 1,
          `${viewport.name}: battle information icon is not centered: ${JSON.stringify(iconOffset)}`)
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
            hero: rect(document.querySelector('.es2-hud__hero')),
            topControls: rect(document.querySelector('.es2-hud__controls')),
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
        assert.ok(drawerBounds.toggle.right - drawerBounds.toggle.x <= 48,
          `${viewport.name}: compact information toggle obscures too much battlefield`)
        assert.ok(!intersects(drawerBounds.toggle, drawerBounds.hero) &&
          !intersects(drawerBounds.toggle, drawerBounds.topControls),
        `${viewport.name}: info toggle obscures an essential top HUD control`)
        await page.screenshot({ path: `${directory}/${viewport.name}-expanded-info.png`, animations: 'disabled' })
        await page.locator('[data-es2-info-close]').click()
        assert.equal(await panel.isVisible(), false, `${viewport.name}: close must restore battlefield`)
      }
      await page.screenshot({ path: `${directory}/${viewport.name}-game.png`, animations: 'disabled' })
      if (viewport.name === 'portrait-375' || viewport.name === 'landscape-640') {
        await page.locator('[data-es2-pause]').click()
        await page.locator('#paused').waitFor({ state: 'visible' })
        await page.screenshot({ path: directory + '/' + viewport.name + '-pause.png', animations: 'disabled' })
        await page.locator('#resume').click()
        await page.locator('[data-es2-home]').click()
        await page.locator('[data-es2-home-confirm]').waitFor({ state: 'visible' })
        await page.screenshot({ path: directory + '/' + viewport.name + '-home-confirm.png', animations: 'disabled' })
        await page.locator('[data-es2-home-cancel]').click()
        await page.locator('.es2-hud--active').waitFor({ state: 'visible' })
      }
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
      const side = heroId === 'spirit-summoner' ? 'right' : 'left'
      await page.addInitScript(side => localStorage.setItem('eclipse-survivors.accessibility.v1', JSON.stringify({ joystickSide: side })), side)
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
      assert.ok(preview.source.includes('run-attack@3x') && !preview.source.includes(heroId + '-run-attack@3x'),
        `${heroId}: no real 8-frame action preview`)
      assert.equal(preview.size, '400% 400%', `${heroId}: preview must use the gameplay 4×4 atlas`)
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
        const index = await offered.evaluate(button => Array.from(button.parentElement.children).indexOf(button))
        await page.keyboard.press(String(index + 1))
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
        return { special: rect(button), dash: rect(dash), joystick: rect(joystick),
          infoToggle: rect(document.querySelector('[data-es2-info-toggle]')) }
      })
      assert.ok(specialBounds, `${heroId}: special action button missing`)
      const overlaps = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
      assert.ok(!overlaps(specialBounds.special, specialBounds.dash) &&
        !overlaps(specialBounds.special, specialBounds.joystick),
      `${heroId}: special action overlaps touch controls: ${JSON.stringify(specialBounds)}`)
      assert.ok(!overlaps(specialBounds.special, specialBounds.infoToggle),
        `${heroId}: special action overlaps information toggle: ${JSON.stringify(specialBounds)}`)
      await page.screenshot({ path: `${directory}/portrait-375-${heroId}-game.png`, animations: 'disabled' })
      // Rotate the real running game; cover narrow, standard and wide phone landscape,
      // and both joystick sides without duplicating any in-game controls.
      const landscape = heroId === 'shadowblade' ? { width: 640, height: 320 }
        : heroId === 'spirit-summoner' ? { width: 932, height: 430 } : { width: 812, height: 375 }
      await page.setViewportSize(landscape)
      await page.locator(`[data-hero-special]`).waitFor({ state: 'visible' })
      const landscapeBounds = await page.evaluate(() => {
        const rect = selector => {
          const el = document.querySelector(selector), b = el.getBoundingClientRect()
          return { x: b.x, y: b.y, right: b.right, bottom: b.bottom }
        }
        return { toggle: rect('[data-es2-info-toggle]'), special: rect('[data-hero-special]'),
          dash: rect('[data-testid="es2-dash"]'), joystick: rect('[data-testid="es2-stick"]'),
          timer: rect('.es2-hud__counters'), controls: rect('.es2-hud__controls'),
          side: document.querySelector('.es2-mobile-controls').dataset.side,
          position: getComputedStyle(document.querySelector('[data-es2-info-toggle]')).position }
      })
      assert.equal(landscapeBounds.side, side, `${heroId}: joystick side not restored`)
      assert.equal(landscapeBounds.position, 'static', `${heroId}: landscape toggle must be in the timer row`)
      for (const key of ['special', 'dash', 'joystick', 'timer', 'controls']) {
        assert.ok(!overlaps(landscapeBounds.toggle, landscapeBounds[key]),
          `${heroId}: ${side} landscape info toggle overlaps ${key}: ${JSON.stringify(landscapeBounds)}`)
      }
      await page.screenshot({ path: `${directory}/landscape-${landscape.width}-${heroId}-${side}-game.png`, animations: 'disabled' })
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
