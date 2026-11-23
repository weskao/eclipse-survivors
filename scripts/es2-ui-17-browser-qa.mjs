import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const dir = 'artifacts/es2-ui-17-browser'
const assets = JSON.parse(await readFile('src/assets/es2/production/ui/manifest.json', 'utf8')).assets
assert.equal(assets.length, 17)
assert.equal(new Set(assets.map(x => x.id)).size, 17)
const sizes = [
  ['portrait-320', 320, 640, true],
  ['portrait-375', 375, 812, true],
  ['landscape-640', 640, 360, true],
  ['desktop-1440', 1440, 900, false],
]
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
await mkdir(dir, { recursive: true })
const evidence = []
async function measure(icon, label, width, height) {
  const v = await icon.evaluate(async image => {
    await image.decode()
    const b = image.getBoundingClientRect()
    return { src: image.currentSrc, naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight, width: b.width, height: b.height,
      left: b.left, right: b.right, top: b.top, bottom: b.bottom }
  })
  assert.ok(v.width > 0 && v.height > 0, label + ': missing rendered image')
  assert.ok(v.naturalWidth + 0.01 >= 3 * v.width &&
    v.naturalHeight + 0.01 >= 3 * v.height,
    label + ': <3x actual render: ' + JSON.stringify(v))
  assert.ok(v.left >= -2 && v.right <= width + 2 && v.top >= -2 && v.bottom <= height + 2,
    label + ': clipped outside viewport: ' + JSON.stringify(v))
  return v
}
try {
  for (const [name, width, height, touch] of sizes) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: touch ? 2 : 1,
      isMobile: touch, hasTouch: touch,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      await page.locator('.es2-hall-links button').first().click()
      const modal = page.locator('.es2-dialog[role="dialog"]')
      await modal.waitFor({ state: 'visible' })
      await modal.evaluate(e => Promise.all(e.getAnimations().map(a => a.finished)))
      await page.locator('.es2-archive-tabs button').nth(4).click()
      const gallery = page.locator('[data-es2-world-ui]')
      assert.equal(await gallery.count(), 17, name + ': expected 17 distinct gallery entries')
      const record = { name, gallery: [], achievements: [], hud: [], rarity: [] }
      for (const asset of assets) {
        const card = page.locator('[data-es2-world-ui="' + asset.id + '"]')
        assert.equal(await card.count(), 1, name + ': missing ' + asset.id)
        await card.scrollIntoViewIfNeeded()
        const image = await measure(card.locator('img.es2-world-art-icon'), name + '/' + asset.id, width, height)
        assert.ok(image.src.includes(asset.id + '@3x'), name + ': incorrect mapping ' + asset.id)
        assert.deepEqual([image.naturalWidth, image.naturalHeight],
          [asset.width, asset.height], name + ': manifest/image mismatch ' + asset.id)
        record.gallery.push({ id: asset.id, ...image })
      }
      await gallery.first().scrollIntoViewIfNeeded()
      await page.screenshot({ path: dir + '/' + name + '-gallery-top.png', animations: 'disabled' })
      await gallery.last().scrollIntoViewIfNeeded()
      await page.screenshot({ path: dir + '/' + name + '-gallery-bottom.png', animations: 'disabled' })
      const achievements = page.locator('[data-es2-achievement-badge]')
      assert.equal(await achievements.count(), 6, name + ': expected 6 achievement badges')
      for (let i = 0; i < 6; i++) {
        const badge = achievements.nth(i)
        await badge.scrollIntoViewIfNeeded()
        record.achievements.push(await measure(badge, name + '/achievement/' + i, width, height))
      }
      await achievements.first().scrollIntoViewIfNeeded()
      await page.screenshot({ path: dir + '/' + name + '-achievements.png', animations: 'disabled' })
      await page.locator('.es2-close').click()
      await page.locator('.es2-start').click()
      await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
      const hud = page.locator('.es2-hud__health-head img.es2-world-hud-icon')
      assert.ok(await hud.count() >= 2, name + ': real health/XP HUD missing')
      for (let i = 0; i < 2; i++)
        record.hud.push(await measure(hud.nth(i), name + '/HUD/' + i, width, height))
      await page.screenshot({ path: dir + '/' + name + '-live-hud.png', animations: 'disabled' })
      // Invoke existing engine-owned level-up, not mock UI insertion.
      await page.evaluate(() => { if (!window.__test) throw new Error('Game test API unavailable'); window.__test.level() })
      const rarity = page.locator('img[data-es2-rarity-icon]')
      await rarity.first().waitFor({ state: 'visible', timeout: 30000 })
      for (let i = 0; i < await rarity.count(); i++) {
        // Every card is vertically scrollable on small phones; check its visible position after scrolling.
        await rarity.nth(i).scrollIntoViewIfNeeded()
        record.rarity.push(await measure(rarity.nth(i), name + '/rarity/' + i, width, height))
      }
      await rarity.first().scrollIntoViewIfNeeded()
      await page.screenshot({ path: dir + '/' + name + '-live-rarity.png', animations: 'disabled' })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
        name + ': horizontal overflow')
      assert.deepEqual(errors, [], name + ': browser exception')
      evidence.push(record)
      console.log('PASS ' + name + ': UI 17/17, achievements 6/6, real HUD, rarity dialog')
    } catch (error) {
      await page.screenshot({ path: dir + '/' + name + '-failed.png' }).catch(() => {})
      throw error
    } finally { await context.close() }
  }
  await writeFile(dir + '/report.json', JSON.stringify({
    source: 'real Chromium production build', commit: process.env.GITHUB_SHA ?? null,
    approval: 'technical QA only; human visual approval required', evidence,
  }, null, 2) + '\n')
} finally { await browser.close() }
