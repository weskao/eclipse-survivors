import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const destination = 'artifacts/es2-mobile-browser'
const cases = [
  ['portrait-390', 390, 844, true],
  ['portrait-430', 430, 932, true],
  ['landscape-844', 844, 390, true],
  ['tablet-portrait-768', 768, 1024, true],
  ['tablet-landscape-1024', 1024, 768, true],
  ['desktop-1280', 1280, 720, false],
  ['desktop-1440', 1440, 900, false],
  ['desktop-1920', 1920, 1080, false],
  ['desktop-zoom-proxy', 1280, 720, false],
]
const inset = 2
const inside = (box, width, height) => box.x >= -inset && box.y >= -inset
  && box.right <= width + inset && box.bottom <= height + inset
const rect = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom } }
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
await mkdir(destination, { recursive: true })
try {
  for (const [name, width, height, mobile] of cases) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile, hasTouch: mobile,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    try {
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      if (name === 'desktop-zoom-proxy') {
        // CSS zoom stresses reflow but is not proof of native browser 200% zoom.
        await page.evaluate(() => { document.documentElement.style.zoom = '2' })
      }
      const bounds = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
      }))
      assert.ok(bounds.documentWidth <= bounds.viewportWidth + inset,
        name + ': horizontal overflow: ' + JSON.stringify(bounds))
      await page.locator('.es2-top-actions [data-es2-settings]').click()
      const dialog = page.locator('.es2-dialog[role="dialog"]')
      await dialog.waitFor({ state: 'visible' })
      assert.ok(inside(await dialog.evaluate(rect), width, height), name + ': settings modal clips viewport')
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
      await page.screenshot({ path: destination + '/' + name + '-settings.png', animations: 'disabled' })
      await page.locator('.es2-close').click()
      await page.locator('.es2-hall-links button').first().click()
      const tabs = page.locator('.es2-archive-tabs button')
      await tabs.first().waitFor({ state: 'visible' })
      assert.equal(await tabs.count(), 5, name + ': missing archive tabs')
      for (let index = 0; index < 5; index++) {
        await tabs.nth(index).click()
        assert.equal(await tabs.nth(index).getAttribute('aria-current'), 'page',
          name + ': archive selection is inaccessible')
        assert.ok(inside(await dialog.evaluate(rect), width, height),
          name + ': archive modal clips viewport')
      }
      await page.screenshot({ path: destination + '/' + name + '-archive.png', animations: 'disabled' })
      await page.locator('.es2-close').click()
      if (!mobile && name !== 'desktop-zoom-proxy') {
        await page.locator('.es2-start').click()
        await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
        assert.ok(await page.locator('.es2-hud__bottom').isVisible(),
          name + ': desktop equipment HUD unexpectedly collapsed')
        await page.screenshot({ path: destination + '/' + name + '-game.png', animations: 'disabled' })
      } else {
        await page.screenshot({ path: destination + '/' + name + '-menu.png', animations: 'disabled' })
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
