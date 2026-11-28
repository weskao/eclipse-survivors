import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const root = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173/'
const output = 'artifacts/es2-browser-performance'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-precise-memory-info'],
})
try {
  for (const preset of ['desktop', 'mobile-low']) {
    const mobile = preset === 'mobile-low'
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 540 },
      deviceScaleFactor: mobile ? 1 : 2,
      isMobile: mobile, hasTouch: mobile,
      reducedMotion: mobile ? 'reduce' : 'no-preference',
    })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(new URL('tests/es2/performance/browser-harness.html?preset=' + preset, root).href, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(() => window.__es2BenchmarkResult || window.__es2BenchmarkError, null, {
        timeout: 90000,
      })
      const answer = await page.evaluate(() => ({
        result: window.__es2BenchmarkResult,
        error: window.__es2BenchmarkError,
      }))
      assert.ifError(answer.error)
      assert.deepEqual(errors, [])
      const report = answer.result
      assert.equal(report.label, 'ES2_REAL_CHROMIUM_CANVAS_PERFORMANCE_NOT_PHYSICAL_DEVICE')
      assert.equal(report.preset, preset)
      assert.equal(report.frames, 120)
      assert.equal(report.initialMobs, 130)
      assert.deepEqual(report.contactArt, ['normal', 'heavy', 'critical', 'elemental', 'evolved', 'hero', 'critical'])
      assert.deepEqual(report.nativeDeathArt, { slime: 4, bat: 4, goblin: 4, golem: 4, warlock: 4 })
      assert.equal(report.liveDeathLifecycle, true)
      assert.deepEqual([...report.factionArt].sort(), [
        'berserker', 'crystal-sentinel', 'dark-archer', 'fire-imp', 'frost-wraith',
        'necromancer', 'phantom', 'plague-carrier', 'shadow-assassin', 'shield-guardian',
      ])
      assert.deepEqual(report.treasureReveals, ['rare', 'epic', 'legendary'])
      for (const key of ['simulationMs', 'canvas2dRenderMs', 'requestAnimationFrameIntervalMs']) {
        assert.ok(Number.isFinite(report[key].median), key + ' median missing')
        assert.ok(Number.isFinite(report[key].p95), key + ' p95 missing')
        assert.ok(Number.isFinite(report[key].p99), key + ' p99 missing')
      }
      await page.screenshot({ path: output + '/' + preset + '.png' })
      await writeFile(output + '/' + preset + '.json', JSON.stringify(report, null, 2))
      console.log('PASS ' + preset + ' ' + JSON.stringify(report))
    } finally {
      await page.close()
    }
  }
  await verifyLiveDangerHud(browser)
} finally {
  await browser.close()
}

/** Use the real game, real boss controller and Canvas stroke path, not a mock HUD.
 * Sample the functional outline in CSS viewport coordinates against the actual
 * visible HUD plates. Edge overlap is allowed; a fully hidden warning is not.
 * This is a geometric HUD visibility check, not a human visual/art review. */
async function verifyLiveDangerHud(browser) {
  const cases = [
    ['desktop', 960, 540, false],
    ['portrait', 390, 844, true],
    ['landscape', 844, 390, true],
  ]
  for (const [name, width, height, mobile] of cases) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: 1,
      isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce',
    })
    await context.addInitScript(() => localStorage.setItem('eclipse-survivors.accessibility.v1',
      JSON.stringify({ reducedMotion: 'system', reducedFlashing: true, vfxIntensity: 'off' })))
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(new URL('?showcase=1&es2BossArtQa=abyss-monarch', root).href, { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      await page.locator('.es2-start').click()
      await page.waitForFunction(() => window.__test?.mode === 'play')
      await page.locator('.es2-hud--active').waitFor({ state: 'visible' })
      await page.evaluate(() => {
        const canvas = document.querySelector('#game')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Missing actual game canvas')
        const stroke = ctx.stroke
        const panels = '.es2-hud__plate, .es2-hud__info-toggle, .es2-hud__scene-title, .es2-hud__urgent-notice, [data-testid="es2-stick"], [data-testid="es2-dash"], [data-hero-special]'
        window.__es3DangerHud = null
        ctx.stroke = function (...args) {
          const result = Reflect.apply(stroke, this, args)
          // The Abyss encounter uses this functional outline even at VFX Off.
          if (this.strokeStyle !== '#a76af6' || !window.__test?.bossAttackPreview.id ||
              !document.querySelector('[data-es2-boss]')?.getClientRects().length ||
              window.__es3DangerHud?.exposed >= 8) return result
          const r = canvas.getBoundingClientRect()
          const blockers = [...document.querySelectorAll(panels)].filter(el => {
            const css = getComputedStyle(el)
            return el.getClientRects().length && css.visibility === 'visible' && Number(css.opacity) > 0
          }).map(el => el.getBoundingClientRect())
          let total = 0, exposed = 0
          const sx = canvas.width / r.width, sy = canvas.height / r.height
          // Two-pixel grid keeps narrow outlines measurable without allocating a pixel buffer.
          for (let y = 1; y < r.height; y += 2) for (let x = 1; x < r.width; x += 2) {
            if (!this.isPointInStroke(x * sx, y * sy)) continue
            total++
            if (!blockers.some(b => x + r.left >= b.left && x + r.left <= b.right &&
              y + r.top >= b.top && y + r.top <= b.bottom)) exposed++
          }
          window.__es3DangerHud = { attack: window.__test.bossAttackPreview.id, total, exposed,
            motion: document.documentElement.dataset.es2ReduceMotion,
            flashing: document.documentElement.dataset.es2ReduceFlashing,
            opacity: document.documentElement.style.getPropertyValue('--es2-vfx-opacity') }
          return result
        }
        window.__test.showcaseBoss(1)
      })
      await page.waitForFunction(() => window.__es3DangerHud?.exposed >= 8, null, { timeout: 20000 })
      const evidence = await page.evaluate(() => window.__es3DangerHud)
      assert.ok(evidence.total >= evidence.exposed && evidence.exposed >= 8, name + ': hidden warning')
      assert.equal(evidence.motion, 'true')
      assert.equal(evidence.flashing, 'true')
      assert.equal(evidence.opacity, '0')
      assert.deepEqual(errors, [])
      await page.screenshot({ path: output + '/danger-hud-' + name + '.png' })
      await writeFile(output + '/danger-hud-' + name + '.json', JSON.stringify(evidence, null, 2))
      console.log('PASS live danger/HUD ' + name + ' ' + JSON.stringify(evidence))
    } finally { await context.close() }
  }
}
