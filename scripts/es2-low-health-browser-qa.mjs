import assert from 'node:assert/strict'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

/** Genuine Vite-DEV game and Canvas captures; never inject mock HTML/portrait art. */
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4174/'
const directory = 'artifacts/es2-low-health-visual'
const devices = [
  { name: 'desktop-1440', width: 1440, height: 900, touch: false, locale: 'en-US' },
  { name: 'portrait-390', width: 390, height: 844, touch: true, locale: 'zh-TW' },
  { name: 'landscape-844', width: 844, height: 390, touch: true },
  { name: 'portrait-320-reduced', width: 320, height: 640, touch: true, reduced: true },
  { name: 'portrait-390-reduced-flashing', width: 390, height: 844, touch: true, flashing: true },
]
const stages = [
  { percent: 40, tier: 'warning' },
  { percent: 25, tier: 'critical' },
  { percent: 12, tier: 'emergency' },
  { percent: 75, tier: 'normal' },
]
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const evidence = []
try {
  for (const device of devices) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.touch ? 2 : 1,
      isMobile: device.touch,
      hasTouch: device.touch,
      locale: device.locale ?? 'en-US',
      reducedMotion: device.reduced ? 'reduce' : 'no-preference',
      ...(!device.reduced ? { recordVideo: { dir: directory,
        size: { width: device.width, height: device.height } } } : {}),
    })
    if (device.flashing) await context.addInitScript(() => localStorage.setItem('eclipse-survivors.accessibility.v1', JSON.stringify({ reducedFlashing: true })))
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    let video
    try {
      await page.goto(new URL('?showcase=1&lowHpQa=1', base).toString(), { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      await page.locator('.es2-start').click()
      await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
      await page.waitForFunction(() => window.__test?.mode === 'play' && !!window.__test?.hp,
        { timeout: 30000 })
      const record = { device: device.name, stages: [] }
      for (const stage of stages) {
        await page.evaluate(percent => {
          if (!window.__test) throw new Error('Missing live engine browser QA API')
          window.__test.previewLowHealth(percent)
        }, stage.percent)
        await page.locator('.es2-hud[data-es2-life-tier="' + stage.tier + '"]')
          .waitFor({ timeout: 10000 })
        const metrics = await page.evaluate(() => {
          const hero = document.querySelector('.es2-hud__portrait')
          const canvas = document.querySelector('#game')
          const vignette = document.querySelector('[data-es2-life-vignette]')
          const rect = hero.getBoundingClientRect()
          const panel = document.querySelector('.es2-hud__hero')
          const ring = getComputedStyle(panel, '::after')
          const label = panel.querySelector('[data-es2-life-message]')
          return {
            portrait: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
            canvasDrawn: canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0,
            vignette: !!vignette,
            touchBlock: vignette ? getComputedStyle(vignette).pointerEvents : 'none',
            hp: document.querySelector('.es2-hud__track--health[role="progressbar"]')?.getAttribute('aria-valuenow'),
            hpLabel: document.querySelector('.es2-hud__track--health[role="progressbar"]')?.getAttribute('aria-label'),
            locale: document.documentElement.lang,
            badge: !!document.querySelector('[data-es2-life-alert]'),
            label: label?.textContent?.trim() ?? '',
            panelBorder: getComputedStyle(panel).borderTopColor,
            ringAnimation: ring.animationName,
            ringOpacity: Number(ring.opacity),
            ringShadow: ring.boxShadow,
            vignetteAnimation: vignette ? getComputedStyle(vignette).animationName : 'none',
            vignetteOpacity: vignette ? Number(getComputedStyle(vignette).opacity) : 0,
          }
        })
        assert.ok(metrics.canvasDrawn, device.name + ': no real game Canvas')
        assert.ok(metrics.portrait.left >= -2 && metrics.portrait.right <= device.width + 2 &&
          metrics.portrait.top >= -2 && metrics.portrait.bottom <= device.height + 2,
          device.name + ': portrait clipped ' + JSON.stringify(metrics))
        assert.equal(metrics.locale, device.locale === 'zh-TW' ? 'zh-TW' : 'en')
        assert.ok(metrics.hpLabel && (device.locale === 'zh-TW' ? metrics.hpLabel === '生命值' : !/[\u3400-\u9fff]/.test(metrics.hpLabel)),
          device.name + ': missing or untranslated health label ' + metrics.hpLabel)
        assert.ok(metrics.hp != null && Math.abs(Number(metrics.hp) - stage.percent) < .01,
          device.name + ': non-authoritative HUD value ' + metrics.hp)
        assert.equal(metrics.badge, stage.tier !== 'normal')
        assert.equal(metrics.vignette, stage.percent <= 25)
        assert.equal(metrics.touchBlock, 'none')
        if (stage.tier === 'normal') {
          assert.equal(metrics.label, '')
          assert.equal(metrics.ringAnimation, 'none')
          assert.equal(metrics.ringOpacity, 0)
        } else {
          assert.ok(metrics.label, device.name + ': no visible warning text')
          assert.notEqual(metrics.ringShadow, 'none')
          assert.equal(metrics.panelBorder, stage.tier === 'warning' ? 'rgb(255, 192, 128)' :
            stage.tier === 'critical' ? 'rgb(255, 129, 118)' : 'rgb(255, 151, 143)')
          if (device.reduced || device.flashing) {
            assert.equal(metrics.ringAnimation, 'none')
            assert.ok(metrics.ringOpacity >= .7)
            assert.equal(metrics.vignetteAnimation, 'none')
            if (metrics.vignette) assert.ok(metrics.vignetteOpacity > 0)
          } else assert.equal(metrics.ringAnimation, 'es2-life-panel-pulse')
        }
        await page.waitForTimeout(stage.percent === 25 || stage.percent === 12 ? 1250 : 500)
        const name = device.name + '-hp-' + stage.percent
        await page.screenshot({ path: directory + '/' + name + '.png' })
        record.stages.push({ ...stage, ...metrics, screenshot: name + '.png' })
      }
      assert.deepEqual(errors, [], device.name + ': browser errors')
      evidence.push(record)
      video = page.video()
    } catch (error) {
      await page.screenshot({ path: directory + '/' + device.name + '-failed.png' }).catch(() => {})
      throw error
    } finally {
      await context.close()
      if (video) await copyFile(await video.path(), directory + '/' + device.name + '-life.webm')
    }
  }
  await writeFile(directory + '/report.json', JSON.stringify({
    source: 'Real Vite DEV / actual game Canvas / real Vue CombatHud',
    branch: 'feature/es2-release-readiness-integration',
    sha: process.env.GITHUB_SHA ?? null,
    evidence,
  }, null, 2) + '\n')
  console.log('Low-health real-game QA PASS: 5 configurations × 4 HP states; genuine PNG + WebM captures')
} finally {
  await browser.close()
}
