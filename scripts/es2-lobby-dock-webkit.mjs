import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { webkit } from 'playwright'
import { assertExpeditionModeIcons } from './es2-mode-icon-qa.mjs'
import { assertNumericFont, assertModeDurations } from './es2-numeric-qa.mjs'
import { assertModeHotLayout } from './es2-mode-hot-qa.mjs'

const target = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const directory = 'artifacts/es2-mobile-browser'
await mkdir(directory, { recursive: true })
const browser = await webkit.launch()

// Hit testing alone can succeed while WebKit clips the dock's painted layer.
async function assertPaint(page, selector, stage) {
  const button = page.locator(selector)
  const rect = await button.boundingBox()
  assert.ok(rect, stage + ': missing action')
  const clip = { x: Math.ceil(rect.x) + 1, y: Math.ceil(rect.y) + 1,
    width: Math.floor(rect.width) - 3, height: Math.floor(rect.height) - 3 }
  const shown = await page.screenshot({ clip, scale: 'css' })
  const dock = page.locator('.es2-menu-action-bar')
  const previous = await dock.evaluate(el => {
    const value = el.style.visibility
    el.style.visibility = 'hidden'
    return value
  })
  let hidden
  try {
    hidden = await page.screenshot({ clip, scale: 'css' })
  } finally {
    await dock.evaluate((el, value) => { el.style.visibility = value }, previous)
  }
  const painted = await page.evaluate(async ([shown, hidden]) => {
    async function pixels(encoded) {
      const img = new Image()
      img.src = 'data:image/png;base64,' + encoded
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      return ctx.getImageData(0, 0, img.width, img.height).data
    }
    const [a, b] = await Promise.all([pixels(shown), pixels(hidden)])
    let changed = 0
    for (let i = 0; i < a.length; i += 4) {
      if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 12) changed++
    }
    return changed / (a.length / 4)
  }, [shown.toString('base64'), hidden.toString('base64')])
  assert.ok(painted > 0.05, stage + ': action hit area exists but has insufficient painted pixels: ' + painted)
}

async function verifyDock(page, stage) {
  await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForFunction(() => ['.es2-menu', '.es2-menu-action-bar'].every(selector =>
    document.querySelector(selector).getAnimations().every(animation => animation.playState !== 'running')))
  for (const bottom of [false, true]) {
    const layout = await page.evaluate(bottom => {
      const shell = document.querySelector('.es2-menu')
      const scroll = document.querySelector('.es2-menu-scroll')
      const dock = document.querySelector('.es2-menu-action-bar')
      if (!scroll || !dock) return { isolated: false }
      scroll.scrollTop = bottom ? scroll.scrollHeight : 0
      const r = dock.getBoundingClientRect(), s = scroll.getBoundingClientRect()
      const viewport = window.visualViewport
      const viewportBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight)
      const buttons = [...dock.querySelectorAll('button')].map(button => {
        const b = button.getBoundingClientRect()
        return b.height >= 44 && b.width >= 44 && b.top >= r.top - 2 && b.bottom <= viewportBottom + 2 &&
          b.left >= -2 && b.right <= innerWidth + 2 &&
          button.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2))
      })
      return { isolated: scroll.parentElement === shell && dock.parentElement === shell && !scroll.contains(dock),
        dockBottom: r.bottom, viewportBottom, scrollBottom: s.bottom, dockTop: r.top, buttons }
    }, bottom)
    assert.ok(layout.isolated && Math.abs(layout.dockBottom - layout.viewportBottom) <= 2 &&
      layout.scrollBottom <= layout.dockTop + 2 && layout.buttons.length === 2 && layout.buttons.every(Boolean),
      stage + ': inaccessible or clipped dock ' + JSON.stringify(layout))
    for (const selector of ['[data-es2-expedition-navigation]', '.es2-start']) {
      await assertPaint(page, selector, stage + (bottom ? '-scrolled' : '-top'))
    }
  }
  const cardsVisible = await page.locator('.es2-mode-section').isVisible()
  await assertExpeditionModeIcons(page, stage, { cards: cardsVisible })
  if (cardsVisible) {
    await assertModeDurations(page, stage)
    await assertModeHotLayout(page, stage)
  }
  await page.screenshot({ path: directory + '/webkit-dock-' + stage + '.png' })
  await page.locator('.es2-menu-scroll').evaluate(el => { el.scrollTop = 0 })
}

try {
  for (const locale of ['zh-TW', 'en-US']) {
    const context = await browser.newContext({ viewport: { width: 402, height: 874 },
      deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded' })
      await assertNumericFont(page, locale)
      await verifyDock(page, locale + '-portrait')
      await page.locator('[data-es2-expedition-navigation]').tap()
      assert.equal(await page.locator('.es2-menu').getAttribute('data-es2-menu-page'), 'modes')
      await verifyDock(page, locale + '-modes')
      for (const [width, height] of [[402, 680], [874, 402], [640, 320], [402, 874]]) {
        await page.setViewportSize({ width, height })
        await verifyDock(page, locale + '-' + width + 'x' + height)
      }
      await page.locator('.es2-hall-links button').first().tap()
      await page.locator('.es2-menu-action-bar').waitFor({ state: 'hidden' })
      await page.locator('[data-es2-return-lobby]').tap()
      await verifyDock(page, locale + '-hall-return')
      await page.locator('[data-es2-expedition-navigation]').tap()
      assert.equal(await page.locator('.es2-menu').getAttribute('data-es2-menu-page'), 'heroes')
      await page.locator('.es2-start').tap()
      await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
      console.log('PASS WebKit dock paint, rotation, resize and touch: ' + locale)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
