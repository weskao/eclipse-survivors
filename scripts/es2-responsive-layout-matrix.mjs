import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const destination = 'artifacts/es2-mobile-browser'
const cases = [
  ['portrait-320', 320, 640, true],
  ['portrait-390', 390, 844, true],
  ['folded-360', 360, 800, true],
  ['unfolded-720', 720, 850, true],
  ['portrait-430', 430, 932, true],
  ['landscape-844', 844, 390, true],
  ['tablet-portrait-768', 768, 1024, true],
  ['tablet-landscape-1024', 1024, 768, true],
  ['desktop-1280', 1280, 720, false],
  ['desktop-1440', 1440, 900, false],
  ['desktop-1920', 1920, 1080, false],
  // 1280×720 at 200% browser zoom yields an equivalent 640×360 CSS viewport.
  // It tests reflow bounds, not the browser's native zoom implementation.
  ['desktop-zoom-200-equivalent', 640, 360, false],
]
const inset = 2
const inside = (box, width, height) => box.x >= -inset && box.y >= -inset
  && box.right <= width + inset && box.bottom <= height + inset
const rect = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom } }
// Text must fit in either language; intentionally scrollable archives are checked per item.
const assertLocalizedTextFits = async (page, caseName, locale) => {
  const issues = await page.evaluate(() => {
    const selectors = [
      '.es2-hero-copy strong', '.es2-hero-copy small',
      '.es2-mode-copy strong', '.es2-mode-copy small',
      '.es2-dialog-header h2', '.es2-dialog-header p',
      '.es2-dialog-actions button', '.es2-archive-tabs button',
      '.es2-archive-card strong', '.es2-archive-card p',
      '.es2-card-name', '.es2-card-description', '.es2-reward-strip span',
    ]
    return [...document.querySelectorAll(selectors.join(','))]
      .filter(el => el.getClientRects().length && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2)
      .map(el => ({ selector: el.className, text: el.textContent?.trim().slice(0, 64),
        width: el.clientWidth, scrollWidth: el.scrollWidth }))
  })
  assert.deepEqual(issues, [], caseName + ': ' + locale + ' text overflow')
  const doc = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }))
  assert.ok(doc.content <= doc.viewport + inset, caseName + ': ' + locale + ' page overflow: ' + JSON.stringify(doc))
}
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
await mkdir(destination, { recursive: true })
try {
  for (const [name, width, height, mobile] of cases) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile, hasTouch: mobile,
      reducedMotion: name === 'portrait-320' ? 'reduce' : 'no-preference',
      locale: name === 'desktop-1440' || name === 'tablet-landscape-1024' ? 'zh-TW' : 'en-US',
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    try {
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      // Non-editable UI must never enter native text selection, including teleported overlays.
      const verifySelectionPolicy = async (stage) => {
        const offenders = await page.evaluate(() => [...document.body.querySelectorAll('*')]
          .filter(el => !el.closest('input, textarea, [contenteditable]:not([contenteditable="false"])'))
          .filter(el => el.getClientRects().length && getComputedStyle(el).userSelect !== 'none')
          .map(el => el.tagName + ' ' + (el.getAttribute('class') || '')).slice(0, 20))
        assert.deepEqual(offenders, [], name + ': selectable UI at ' + stage)
      }
      await verifySelectionPolicy('home')
      if (!mobile) {
        await page.locator('.es2-menu-brand h1').dblclick()
        assert.equal(await page.evaluate(() => window.getSelection()?.toString()), '', name + ': title text selected')
      }
      const editablePolicy = await page.evaluate(() => {
        const input = document.createElement('input')
        const textarea = document.createElement('textarea')
        const editable = document.createElement('div')
        editable.contentEditable = 'true'
        document.body.append(input, textarea, editable)
        try { return [input, textarea, editable].map(el => getComputedStyle(el).userSelect) }
        finally { input.remove(); textarea.remove(); editable.remove() }
      })
      assert.deepEqual(editablePolicy, ['text', 'text', 'text'], name + ': editable fields must remain selectable')
      const bounds = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
      }))
      assert.ok(bounds.documentWidth <= bounds.viewportWidth + inset,
        name + ': horizontal overflow: ' + JSON.stringify(bounds))
      // All devices expose the hall in the first viewport; wide devices also fit all six heroes.
      const verifyPage = async (selector, count, requireFit) => {
        const layout = await page.evaluate(({selector, requireFit}) => {
          const menu = document.querySelector('.es2-menu')
          const bar = menu.querySelector('.es2-menu-action-bar').getBoundingClientRect()
          const choices = [...menu.querySelectorAll(selector)]
          return { count: choices.length, offenders: choices.filter(el => {
            const r = el.getBoundingClientRect()
            return r.width === 0 || r.height === 0 || r.left < 0 || r.right > innerWidth + 2 ||
              (requireFit && (r.top < 0 || r.bottom > bar.top + 2))
          }).map(el => el.textContent.trim().slice(0, 80)) }
        }, {selector, requireFit})
        assert.equal(layout.count, count, name + ': missing choices')
        assert.deepEqual(layout.offenders, [], name + ': choices outside visible menu')
      }
      const verifyDock = async () => {
        for (const selector of ['[data-es2-expedition-summary]', '[data-es2-mode-summary]', '.es2-start']) {
          const el = page.locator(selector)
          assert.ok(inside(await el.evaluate(rect), width, height), name + ': dock clips ' + selector)
          assert.ok(await el.evaluate(node => node.scrollWidth <= node.clientWidth + 2), name + ': dock text overflow ' + selector)
        }
        const bounds = await page.evaluate(() => {
          const start = document.querySelector('.es2-start'), brief = document.querySelector('[data-es2-expedition-summary]')
          const a = start.getBoundingClientRect(), b = brief.getBoundingClientRect()
          const hit = document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2)
          return { hit: start.contains(hit), overlap: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
            startHeight: a.height, briefHeight: b.height }
        })
        assert.ok(bounds.hit && !bounds.overlap && bounds.startHeight >= 44 && bounds.briefHeight >= 44,
          name + ': inaccessible dock ' + JSON.stringify(bounds))
      }
      const wallet = page.locator('[data-es2-ember-wallet]')
      const walletLayout = await wallet.evaluate(el => {
        const value = el.querySelector('[data-es2-ember-value]'), label = el.querySelector('.es2-embers-label')
        const w = el.getBoundingClientRect(), h = el.closest('.es2-hall-heading').getBoundingClientRect()
        return { left:w.left, right:w.right, top:w.top, bottom:w.bottom, headingRight:h.right,
          font:parseFloat(getComputedStyle(value).fontSize), labelFont:parseFloat(getComputedStyle(label).fontSize),
          overflow:el.scrollWidth-el.clientWidth }
      })
      assert.ok(walletLayout.left >= 0 && walletLayout.right <= Math.min(width, walletLayout.headingRight) + 2 &&
        walletLayout.top >= 0 && walletLayout.bottom <= height && walletLayout.overflow <= 2 &&
        walletLayout.font >= 18 && walletLayout.font > walletLayout.labelFont,
        name + ': wallet prominence or bounds ' + JSON.stringify(walletLayout))
      await verifyDock()
      if (name === 'portrait-320') {
        const decoration = page.locator('[data-es2-portal-decoration]')
        for (const pseudo of ['::before', '::after']) {
          assert.equal(await decoration.evaluate((el, p) => getComputedStyle(el, p).animationName, pseudo), 'none')
        }
      }
      await verifyPage('[data-es2-hall-navigation] button', 5, true)
      await verifyPage('[data-hero], [data-hero-id]', 6, width >= 1000 && height >= 700)
      await page.screenshot({ path: destination + '/' + name + '-home-full.png', animations: 'disabled' })
      await page.locator('[data-es2-expedition-navigation]').click()
      await verifyPage('[data-mode], [data-objective-mode]', 9, width >= 1000 && height >= 700)
      await verifyDock()
      await verifyPage('[data-es2-hall-navigation] button', 5, true)
      await page.screenshot({ path: destination + '/' + name + '-expeditions.png', animations: 'disabled' })
      await page.locator('[data-es2-expedition-navigation]').click()
      await page.locator('.es2-top-actions [data-es2-settings]').click()
      const dialog = page.locator('.es2-dialog[role="dialog"]')
      await dialog.waitFor({ state: 'visible' })
      await verifySelectionPolicy('settings dialog and close button')
      await dialog.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
      const initialDialog = await dialog.evaluate(rect)
      assert.ok(inside(initialDialog, width, height),
        name + ': settings modal clips viewport: ' + JSON.stringify(initialDialog))
      const verifyDialogChrome = async (kind) => {
        const layout = await dialog.evaluate(element => {
          const bounds = child => { const b = child.getBoundingClientRect(); return { top:b.top, bottom:b.bottom, height:b.height } }
          return {
            panel: bounds(element),
            heading: bounds(element.querySelector('.es2-dialog-header')),
            body: bounds(element.querySelector('.es2-dialog-body')),
            actions: element.querySelector('.es2-dialog-actions') ? bounds(element.querySelector('.es2-dialog-actions')) : null,
          }
        })
        assert.ok(layout.heading.top >= layout.panel.top - inset && layout.heading.bottom <= layout.body.top + inset,
          name + ': ' + kind + ' heading is not pinned above the scrollable body: ' + JSON.stringify(layout))
        assert.ok(layout.body.bottom <= (layout.actions?.top ?? layout.panel.bottom) + inset,
          name + ': ' + kind + ' body obscures its actions: ' + JSON.stringify(layout))
        if (layout.actions) assert.ok(layout.actions.bottom <= layout.panel.bottom + inset,
          name + ': ' + kind + ' footer is outside the dialog: ' + JSON.stringify(layout))
      }
      const verifySettingsWidth = async (stage) => {
        const result = await dialog.evaluate(panel => {
          const body = panel.querySelector('.es2-dialog-body')
          const box = body.getBoundingClientRect()
          const left = box.left + body.clientLeft, right = left + body.clientWidth
          const offenders = [...body.querySelectorAll('section, header, div, button, input, label, output, p, strong, small, span')]
            .filter(el => el.getClientRects().length && el.getBoundingClientRect().width > 0)
            .filter(el => { const r = el.getBoundingClientRect(); return r.left < left - 1 || r.right > right + 1 })
            .map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.trim().slice(0, 50) }))
          const range = body.scrollWidth - body.clientWidth
          body.scrollLeft = 100
          const offset = body.scrollLeft
          body.scrollLeft = 0
          return { range, offset, panelRange: panel.scrollWidth - panel.clientWidth,
            overflowX: getComputedStyle(body).overflowX, overflowY: getComputedStyle(body).overflowY, offenders }
        })
        assert.equal(result.overflowX, 'hidden', name + ': ' + stage + ' horizontal scrolling enabled')
        assert.equal(result.overflowY, 'auto', name + ': ' + stage + ' vertical scrolling disabled')
        assert.ok(result.range <= 1 && result.panelRange <= 1 && result.offset <= 1,
          name + ': ' + stage + ' settings horizontal overflow ' + JSON.stringify(result))
        assert.deepEqual(result.offenders, [], name + ': ' + stage + ' settings controls clipped')
      }
      await verifyDialogChrome('settings')
      await verifySettingsWidth('initial')
      await dialog.locator('.es2-dialog-body').evaluate(element => { element.scrollTop = element.scrollHeight })
      await verifyDialogChrome('settings after scrolling')
      const scale = page.locator('#es2-interface-scale')
      await scale.evaluate(el => { el.value = '1.25'; el.dispatchEvent(new Event('input', { bubbles: true })) })
      const actual = await dialog.evaluate(el => getComputedStyle(el).getPropertyValue('--es2-ui-scale').trim())
      assert.equal(actual, '1.25', name + ': UI scale is not reflected by the dialog')
      assert.ok(inside(await dialog.evaluate(rect), width, height), name + ': 125% scaled modal clips viewport')
      const language = page.locator('#es2-language')
      await language.click()
      const option = page.locator('#es2-language-listbox [data-es2-value="en"]')
      await option.waitFor({ state: 'visible' })
      assert.ok(inside(await page.locator('#es2-language-listbox').evaluate(rect), width, height),
        name + ': language listbox clips viewport')
      await option.click()
      assert.equal(await language.getAttribute('aria-expanded'), 'false')
      await assertLocalizedTextFits(page, name, 'en')
      await verifySettingsWidth('English 125%')
      // Run the same real-browser layout check in Traditional Chinese.
      await language.click()
      await page.locator('#es2-language-listbox [data-es2-value="zh-TW"]').click()
      await assertLocalizedTextFits(page, name, 'zh-TW')
      await verifySettingsWidth('Traditional Chinese 125%')
      await language.click()
      await page.locator('#es2-language-listbox [data-es2-value="en"]').click()
      await page.screenshot({ path: destination + '/' + name + '-settings.png', animations: 'disabled' })
      await page.locator('.es2-close').click()
      await verifyDock()
      // The actual selection, not an authored mock, must update the visible brief on returning to the hero page.
      await page.locator('[data-es2-expedition-navigation]').click()
      await page.locator('[data-objective-mode="boss-rush"]').click()
      await page.locator('[data-es2-expedition-navigation]').click()
      assert.equal(await page.locator('[data-es2-expedition-summary]').getAttribute('data-run-mode'), 'boss-rush')
      assert.match(await page.locator('[data-es2-mode-summary]').innerText(), /five increasingly powerful bosses/i)
      await verifyDock()
      await page.screenshot({ path: destination + '/' + name + '-portal-boss-rush-125.png', animations: 'disabled' })
      await page.locator('[data-es2-expedition-navigation]').click()
      await page.locator('[data-mode="quick"]').click()
      await page.locator('[data-es2-expedition-navigation]').click()
      await page.locator('.es2-hall-links button').first().click()
      const tabs = page.locator('.es2-archive-tabs button')
      await tabs.first().waitFor({ state: 'visible' })
      // A new Es2Dialog mounts after Settings; measure its settled bounds, not the 12px enter translation.
      await dialog.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
      assert.equal(await tabs.count(), 5, name + ': missing archive tabs')
      await verifyDialogChrome('archive')
      for (let index = 0; index < 5; index++) {
        await tabs.nth(index).click()
        assert.equal(await tabs.nth(index).getAttribute('aria-current'), 'page',
          name + ': archive selection is inaccessible')
        assert.ok(inside(await dialog.evaluate(rect), width, height),
          name + ': archive modal clips viewport')
        await assertLocalizedTextFits(page, name, 'en-archive')
      }
      await page.screenshot({ path: destination + '/' + name + '-archive.png', animations: 'disabled' })
      await page.locator('.es2-close').click()
      let startedGame = false
      if (mobile && name.startsWith('tablet-')) {
        // Touch tablets must not render a permanent desktop equipment bar over
        // the real joystick/dash; all secondary HUD content belongs in the drawer.
        await page.locator('.es2-start').click()
        await page.locator('.es2-mobile-controls[data-active="true"]').waitFor({ state: 'visible', timeout: 30000 })
        const toggle = page.locator('[data-es2-info-toggle]')
        await toggle.waitFor({ state: 'visible' })
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false',
          name + ': touch tablet should start with optional information collapsed')
        assert.equal(await page.locator('.es2-hud__bottom').isVisible(), false,
          name + ': permanent skill/relic bar overlaps touch controls')
        await toggle.click()
        const layout = await page.evaluate(() => {
          const box = el => { const b = el.getBoundingClientRect()
            return { x: b.x, y: b.y, right: b.right, bottom: b.bottom } }
          return {
            drawer: box(document.querySelector('[data-es2-info-panel]')),
            joystick: box(document.querySelector('[data-testid="es2-stick"]')),
            dash: box(document.querySelector('[data-testid="es2-dash"]')),
          }
        })
        const intersects = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
        assert.ok(!intersects(layout.drawer, layout.joystick) && !intersects(layout.drawer, layout.dash),
          name + ': drawer obscures touch controls ' + JSON.stringify(layout))
        await page.screenshot({ path: destination + '/' + name + '-game.png', animations: 'disabled' })
        startedGame = true
      } else if (!mobile && name !== 'desktop-zoom-200-equivalent') {
        await page.locator('.es2-start').click()
        await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
        assert.ok(await page.locator('.es2-hud__bottom').isVisible(),
          name + ': desktop equipment HUD unexpectedly collapsed')
        await page.screenshot({ path: destination + '/' + name + '-game.png', animations: 'disabled' })
        startedGame = true
      } else {
        await page.screenshot({ path: destination + '/' + name + '-menu.png', animations: 'disabled' })
      }
      if (startedGame) {
        await page.locator('[data-es2-pause]').click()
        await page.locator('#paused').waitFor({ state: 'visible' })
        const layers = await page.evaluate(() => ({
          backdrop: Number(getComputedStyle(document.querySelector('.es2-backdrop')).zIndex),
          hud: Number(getComputedStyle(document.querySelector('.es2-hud')).zIndex),
        }))
        assert.ok(layers.backdrop > layers.hud,
          name + ': pause dialog must appear above the combat HUD')
        await page.screenshot({ path: destination + '/' + name + '-pause.png', animations: 'disabled' })
        await page.locator('#resume').click()
        await page.locator('[data-es2-home]').click()
        await page.locator('[data-es2-home-confirm]').waitFor({ state: 'visible' })
        assert.ok(await page.locator('[data-es2-home-cancel]').evaluate(el => el.classList.contains('es2-primary')),
          name + ': Continue Battle must remain the primary non-destructive action')
        await page.screenshot({ path: destination + '/' + name + '-home-confirm.png', animations: 'disabled' })
        await page.locator('[data-es2-home-cancel]').click()
        await page.locator('.es2-hud--active').waitFor({ state: 'visible' })
      }
      if (mobile && width <= 430 && height > width) {
        await page.locator('[data-hero-id="spirit-summoner"]').click()
        await page.locator('.es2-start').click()
        await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
        // Stress the actual rendered HUD with a long health/status value, independent of combat RNG.
        const healthLayout = await page.locator('.es2-hud__health-head').first().evaluate(row => {
          const value = row.lastElementChild
          const original = value.textContent
          value.textContent = 'HP 89 / 204 | 3/3 Charges ready'
          const r = row.getBoundingClientRect(), v = value.getBoundingClientRect()
          const hero = row.closest('.es2-hud__hero').getBoundingClientRect()
          const controls = document.querySelector('.es2-hud__controls').getBoundingClientRect()
          const result = { rowRight:r.right, valueRight:v.right, heroRight:hero.right, controlsLeft:controls.left,
            valueOverflow:value.scrollWidth-value.clientWidth }
          value.textContent = original
          return result
        })
        assert.ok(healthLayout.valueRight <= healthLayout.rowRight + 1 &&
          healthLayout.valueRight <= healthLayout.heroRight + 1 &&
          healthLayout.heroRight <= healthLayout.controlsLeft + 1 && healthLayout.valueOverflow <= 1,
          name + ': health/status overflows player panel ' + JSON.stringify(healthLayout))
      }
      assert.deepEqual(errors, [], name + ': uncaught browser exceptions')
      console.log('PASS ' + name + ': settings, scale, language, archive tabs and viewport bounds')
    } catch (error) {
      await page.screenshot({ path: destination + '/' + name + '-failed.png' }).catch(() => {})
      throw error
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
