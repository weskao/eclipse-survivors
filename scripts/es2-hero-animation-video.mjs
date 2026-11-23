/**
 * Real production-build Chromium capture. No mock sprites, fake game backgrounds,
 * procedural illustration stand-ins or recorded screenshots from a demo page.
 * Captures the actual engine's Canvas actor while using normal gameplay input.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const target = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const output = 'artifacts/es2-hero-video'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const results = []
try {
  for (const heroId of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
    const context = await browser.newContext({
      viewport: { width: 960, height: 540 }, deviceScaleFactor: 1,
      reducedMotion: 'no-preference', recordVideo: {
        dir: output, size: { width: 960, height: 540 },
      },
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    let video
    let metrics
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded' })
      const card = page.locator(`button[data-hero-id="${heroId}"]`)
      await card.waitFor({ state: 'visible', timeout: 30000 })
      await card.click()
      await page.locator('.es2-start').click()
      await page.waitForFunction(() =>
        !!document.querySelector('.es2-hud--active') ||
        !!document.querySelector('.es2-backdrop button[data-choice]'), null, { timeout: 30000 })
      // Actually choose legal skills when a real level-up modal is in the way.
      for (let i = 0; i < 64; i++) {
        if (await page.locator('.es2-hud--active').isVisible()) break
        await page.locator('.es2-backdrop button[data-choice]:visible:not(:disabled)')
          .first().click({ timeout: 20000 })
      }
      assert.equal(await page.evaluate(() => window.__test?.mode), 'play')
      const beginning = await page.evaluate(() => window.__test?.frames ?? 0)
      // Give the selected hero's direction sheet a chance to decode.
      await page.waitForTimeout(900)
      await page.keyboard.down('KeyD')
      await page.waitForTimeout(1500)
      await page.keyboard.up('KeyD')
      await page.keyboard.down('KeyW')
      await page.waitForTimeout(1100)
      await page.keyboard.up('KeyW')
      await page.evaluate(() => window.__test?.forceAttack())
      await page.waitForTimeout(850)
      await page.keyboard.down('KeyA')
      await page.waitForTimeout(1450)
      await page.keyboard.up('KeyA')
      await page.keyboard.down('KeyS')
      await page.keyboard.down('KeyD')
      await page.waitForTimeout(1150)
      await page.keyboard.up('KeyS')
      await page.keyboard.up('KeyD')
      await page.evaluate(() => window.__test?.forceAttack())
      await page.waitForTimeout(650)
      const ending = await page.evaluate(() => window.__test?.frames ?? 0)
      metrics = { heroId, canvasFramesRendered: ending - beginning,
        elapsedRecordedSeconds: 7.6, browserErrors: errors }
      assert.ok(metrics.canvasFramesRendered > 30, heroId + ': game Canvas stopped drawing')
      assert.deepEqual(errors, [], heroId + ': unexpected page script errors')
      video = page.video()
    } finally {
      await context.close()
    }
    assert.ok(video, heroId + ': Chromium did not return a real gameplay recording')
    const webm = await video.path()
    const mp4 = `${output}/${heroId}-real-gameplay.mp4`
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', webm,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'inherit' })
    results.push({ ...metrics, file: mp4 })
    console.log('CAPTURED', JSON.stringify(results.at(-1)))
  }
} finally {
  await browser.close()
}
await writeFile(`${output}/capture-metrics.json`, JSON.stringify(results, null, 2) + '\n')
