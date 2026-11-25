/**
 * Real production-build Chromium capture. No mock sprites, fake game backgrounds,
 * procedural illustration stand-ins or recorded screenshots from a demo page.
 * Captures the actual engine's Canvas actor while using normal gameplay input.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { heroVideoCaptureConfig, assessHeroCandidateCoverage, assessHeroEastActionCoverage, assessHeroNorthernRunCoverage, heroNorthernRunBatches } from './es2-hero-video-config.mjs'

const candidateQA = process.env.ES2_HERO_QA === '1'
const capture = heroVideoCaptureConfig(process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/', candidateQA, process.env.ES2_HERO_QA_DEFAULT === '1')
const output = capture.output
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
    if (candidateQA) {
      // Evidence is the actual engine Canvas draw calls, not only a downloaded WebP.
      await page.addInitScript(() => {
        const prior = CanvasRenderingContext2D.prototype.drawImage
        const seen = new Set()
        window.__es2CandidateDraws = []
        CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
          const src = source?.src
          if (typeof src === 'string' && src.includes('/candidates/') && args.length >= 4) {
            const transform = this.getTransform()
            const mirrored = transform.a * transform.d - transform.b * transform.c < 0
            const draw = { src, sx: args[0], sy: args[1], sw: args[2], sh: args[3], mirrored }
            const key = JSON.stringify(draw)
            if (!seen.has(key) && seen.size < 128) {
              seen.add(key)
              window.__es2CandidateDraws.push(draw)
            }
          }
          return prior.call(this, source, ...args)
        }
      })
    }
    const startedAt = Date.now()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    let video
    let metrics
    try {
      await page.goto(capture.url, { waitUntil: 'domcontentloaded' })
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
      await page.waitForTimeout(700)
      if (candidateQA) await page.screenshot({ path: `${output}/${heroId}-east-run-gameplay.png` })
      await page.waitForTimeout(800)
      await page.keyboard.up('KeyD')
      await page.keyboard.down('KeyW')
      await page.waitForTimeout(1100)
      await page.keyboard.up('KeyW')
      // Include a full South-facing stride; the old diagonal-only sequence
      // could not prove that a South-specific four-frame atlas was drawn.
      await page.keyboard.down('KeyS')
      await page.waitForTimeout(600)
      if (candidateQA) await page.screenshot({ path: `${output}/${heroId}-south-run-gameplay.png` })
      await page.waitForTimeout(500)
      await page.keyboard.up('KeyS')
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
      if (candidateQA) {
        // Exercise every selected run atlas using ordinary movement input. Retry
        // missing cells only, with a bounded time budget; never synthesize evidence.
        for (const [name, field, keys] of [
          ['east', 'eastRunFrames', ['KeyD']],
          ['south', 'southRunFrames', ['KeyS']],
          ['se', 'southeastRunFrames', ['KeyS', 'KeyD']],
          ['sw', 'southwestRunFrames', ['KeyS', 'KeyA']],
          ...(heroId === 'shadowblade' ? [['west', 'mirroredWestRunFrames', ['KeyA']]] : []),
        ]) {
          for (let attempt = 0; attempt < 3; attempt++) {
            const coverage = assessHeroCandidateCoverage(heroId, await page.evaluate(() => window.__es2CandidateDraws ?? []))
            if (attempt > 0 && coverage[field] === 4) break
            for (let i = 0; i < 8; i++) {
              const choice = page.locator('.es2-backdrop button[data-choice]:visible:not(:disabled)').first()
              if (!await choice.isVisible()) break
              await choice.click()
            }
            if (await page.evaluate(() => window.__test?.mode) !== 'play') break
            try {
              for (const key of keys) await page.keyboard.down(key)
              await page.waitForTimeout(1600)
              await page.screenshot({ path: `${output}/${heroId}-${name}-run-gameplay.png` })
              await page.waitForTimeout(500)
            } finally {
              for (const key of keys) await page.keyboard.up(key)
            }
          }
        }
      }
      if (candidateQA) {
        // Exercise only the newly admitted directions in actual combat.
        for (const direction of Object.keys(heroNorthernRunBatches(heroId))) {
          const keys = direction === 'ne' ? ['KeyW', 'KeyD'] : direction === 'nw' ? ['KeyW', 'KeyA'] : ['KeyW']
          for (let attempt = 0; attempt < 3; attempt++) {
            const evidence = assessHeroNorthernRunCoverage(heroId, await page.evaluate(() => window.__es2CandidateDraws ?? []))
            if (attempt > 0 && evidence.counts[direction] === 4) break
            for (let i = 0; i < 8; i++) {
              const choice = page.locator('.es2-backdrop button[data-choice]:visible:not(:disabled)').first()
              if (!await choice.isVisible()) break
              await choice.click()
            }
            if (await page.evaluate(() => window.__test?.mode) !== 'play') break
            try {
              for (const key of keys) await page.keyboard.down(key)
              await page.waitForTimeout(1600)
              await page.screenshot({ path: `${output}/${heroId}-${direction}-run-gameplay.png` })
              await page.waitForTimeout(500)
            } finally {
              for (const key of keys) await page.keyboard.up(key)
            }
          }
        }
        // Predecode the exact assets without drawing or claiming coverage.
        // The game renderer must still draw each source cell in real combat.
        await page.evaluate(async id => {
          for (const pose of ['attack', 'special']) {
            const image = new Image()
            image.src = `/src/assets/es2/production/heroes/${id}/candidates/east-2026-11-23/${pose}-east-4frames@3x.webp`
            await image.decode()
          }
        }, heroId)
        for (let i = 0; i < 8; i++) {
          const choice = page.locator('.es2-backdrop button[data-choice]:visible:not(:disabled)').first()
          if (!await choice.isVisible()) break
          await choice.click()
        }
        // Moving East does not control automatic targeting. Use the explicit
        // dev-only real combat scenario, then the ordinary Q activation.
        for (let attempt = 0; attempt < 3; attempt++) {
          const coverage = assessHeroEastActionCoverage(heroId, await page.evaluate(() => window.__es2CandidateDraws ?? []))
          if (coverage.eastAttackFrames === 4) break
          if (!await page.evaluate(() => window.__test?.prepareHeroArtEastAttack())) break
          await page.waitForTimeout(450)
        }
        if (await page.evaluate(() => window.__test?.mode) === 'play') {
          await page.evaluate(() => window.__test?.prepareHeroArtEastAttack())
          await page.waitForTimeout(350)
          await page.keyboard.press('KeyQ')
          await page.waitForTimeout(1000)
        }
      }
      const ending = await page.evaluate(() => window.__test?.frames ?? 0)
      const candidateCoverage = candidateQA
        ? assessHeroCandidateCoverage(heroId, await page.evaluate(() => window.__es2CandidateDraws ?? []))
        : null
      metrics = { heroId, artStatus: capture.status, canvasFramesRendered: ending - beginning,
        elapsedRecordedSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
        candidateCoverage,
        eastActionCandidateCoverage: candidateQA
          ? assessHeroEastActionCoverage(heroId, await page.evaluate(() => window.__es2CandidateDraws ?? []))
          : null,
        northernRunCandidateCoverage: candidateQA
          ? assessHeroNorthernRunCoverage(heroId, await page.evaluate(() => window.__es2CandidateDraws ?? []))
          : null,
        browserErrors: errors }
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

// Preserve all three recordings and metrics even if a candidate frame is missing.
// A green capture means each of the four staged cells was actually drawn for
// each of the four available run directions, not that the full art is approved.
if (candidateQA) {
  const incomplete = results.filter(result => !result.candidateCoverage.hasAllFourRunCandidateFrames ||
    (result.heroId === 'shadowblade' && result.candidateCoverage.mirroredWestRunFrames !== 4))
  assert.deepEqual(incomplete, [], 'Incomplete real Canvas run-candidate coverage')
  assert.deepEqual(results.filter(result => !result.northernRunCandidateCoverage.complete), [],
    'Incomplete real Canvas northern run-candidate coverage')
  assert.deepEqual(results.filter(result => !result.eastActionCandidateCoverage.hasAllEastActionCandidateFrames), [],
    'Incomplete real Canvas East attack/special candidate coverage')
}
