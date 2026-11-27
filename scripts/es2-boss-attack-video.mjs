/**
 * Real Vite DEV/Chromium gameplay capture of all 25 Boss attacks.
 * Renders with the shipped engine, Canvas and current boss sprites (not mock art).
 * Uses the explicit development showcase scene; it never alters production balance.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4174/'
const motionQa = process.env.BOSS_MOTION_QA === '1'
const output = motionQa ? 'artifacts/es2-boss-motion-video' : 'artifacts/es2-boss-attack-video'
const phases = {
  'abyss-monarch': [
    ['shadow-fan', 'darkness-field'],
    ['shadow-cross', 'abyss-summon', 'darkness-field'],
    ['abyss-collapse', 'shadow-storm', 'abyss-summon'],
  ],
  'frost-sovereign': [
    ['ice-fan', 'frost-patch'],
    ['glacial-ring', 'rotating-shelter', 'ice-fan'],
    ['rotating-shelter', 'winter-burst', 'ice-storm'],
  ],
  'infernal-titan': [
    ['titan-slam', 'ember-line'],
    ['eruption', 'flame-wave', 'titan-slam'],
    ['titan-rage', 'flame-wave', 'eruption'],
  ],
  'eclipse-seraph': [
    ['radiant-lance', 'light-ring'],
    ['void-fan', 'shadow-sweep', 'twilight-ground'],
    ['eclipse-wedge', 'eclipse-cross', 'seraph-finale'],
  ],
}
await mkdir(output, { recursive: true })
const records = []
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
try {
  for (const [bossId, attacksByPhase] of Object.entries(phases)) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      recordVideo: { dir: output, size: { width: 1280, height: 720 } },
    })
    const page = await context.newPage()
    if (motionQa) {
      // Observe real successful draws on the browser canvas, not just decoded image URLs.
      await page.addInitScript(id => {
        const original = CanvasRenderingContext2D.prototype.drawImage
        const draws = [new Set(), new Set(), new Set()]
        window.__bossMotionDraws = draws
        CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
          const result = Reflect.apply(original, this, [source, ...args])
          if (source instanceof HTMLImageElement && source.src.includes(id + '-attack-source-reference.webp')
              && source.naturalWidth === 672 && source.naturalHeight === 336 && args.length === 8
              && args[2] === 112 && args[3] === 112 && args[6] > 0 && args[7] > 0) {
            const phase = args[1] / 112, slot = args[0] / 112
            if (Number.isInteger(phase) && phase >= 0 && phase < 3
                && Number.isInteger(slot) && slot >= 0 && slot < 6) draws[phase].add(slot)
          }
          return result
        }
      }, bossId)
    }
    const errors = []
    page.on('pageerror', error => errors.push(String(error.message)))
    let recording
    const record = { bossId, viewport: [1280, 720], attacks: [], browserErrors: errors,
      playback: 'Actual in-engine Canvas/Playwright; DEV showcase positions, invulnerability, and repeated phase transitions' }
    try {
      const url = new URL(base)
      url.searchParams.set('showcase', '1')
      url.searchParams.set('es2BossArtQa', bossId)
      if (motionQa) url.searchParams.set('es2BossMotionQa', '1')
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      await page.locator('.es2-start').click()
      await page.waitForFunction(() => window.__test?.mode === 'play', null, { timeout: 30000 })
      await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
      // Wait for actual Canvas frames and sprite decoding, not just visible DOM.
      const framesBefore = await page.evaluate(() => window.__test.frames)
      await page.waitForFunction(before => window.__test?.frames > before + 20, framesBefore, { timeout: 30000 })

      const start = Date.now()
      for (let phase = 1; phase <= 3; phase++) {
        await page.evaluate(value => window.__test.showcaseBoss(value), phase)
        await page.waitForFunction(expected =>
          window.__test?.bossPreview.id && window.__test.bossPreview.phase === expected,
          phase, { timeout: 15000 })
        for (const attackId of attacksByPhase[phase - 1]) {
          // The AI emits each pattern naturally in the real game loop.
          await page.waitForFunction(expected => window.__test?.bossAttackPreview?.id === expected,
            attackId, { timeout: 20000, polling: 30 })
          const enteredAt = Number(((Date.now() - start) / 1000).toFixed(2))
          await page.screenshot({ path: output + '/' + bossId + '-phase-' + phase + '-' + attackId + '-warning.png' })
          await page.waitForFunction(expected => window.__test?.bossAttackPreview?.id !== expected,
            attackId, { timeout: 9000, polling: 30 })
          await page.waitForFunction(() => window.__test?.bossAttackPreview?.activeImpacts > 0,
            null, { timeout: 5000, polling: 30 })
          const releasedAt = Number(((Date.now() - start) / 1000).toFixed(2))
          await page.screenshot({ path: output + '/' + bossId + '-phase-' + phase + '-' + attackId + '-release.png' })
          record.attacks.push({ phase, attackId, warningTimeSec: enteredAt, releaseTimeSec: releasedAt })
          await page.waitForTimeout(330)
        }
        await page.waitForTimeout(700)
        if (motionQa) {
          await page.waitForFunction(value => window.__bossMotionDraws?.[value - 1]?.size === 6,
            phase, { timeout: 20000 })
        }
      }
      if (motionQa) {
        record.drawnSourceSlots = await page.evaluate(() => window.__bossMotionDraws.map(row => [...row].sort((a, b) => a - b)))
        assert.deepEqual(record.drawnSourceSlots, Array.from({ length: 3 }, () => [0, 1, 2, 3, 4, 5]),
          bossId + ': actual Canvas did not draw all 18 motion reference cells')
      }
      await page.waitForTimeout(700)
      record.pixiVfx = await page.evaluate(() => window.__test?.pixiVfx ?? null)
      if (!motionQa) {
        const required = [...new Set(attacksByPhase.flat())]
        assert.ok(record.pixiVfx?.releasePasses > 0, bossId + ': PixiJS did not composite any real release')
        assert.deepEqual(required.filter(id => !record.pixiVfx.attackIds.includes(id)), [], bossId + ': missing actual GPU release evidence')
      }
      assert.equal(record.attacks.length, attacksByPhase.reduce((sum, row) => sum + row.length, 0),
        bossId + ': every phase-pattern was not captured')
      assert.deepEqual(errors, [], bossId + ': unexpected browser errors')
      recording = page.video()
    } finally {
      await context.close()
    }
    assert.ok(recording, bossId + ': real browser recording missing')
    const webm = await recording.path()
    const destination = output + '/' + bossId + (motionQa ? '-source-motion-real-gameplay.mp4' : '-all-attacks-real-gameplay.mp4')
    execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', webm,
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', destination], { stdio: 'inherit' })
    const { size } = await stat(destination)
    assert.ok(size > 10000, bossId + ': MP4 is empty')
    record.mp4 = destination
    record.bytes = size
    records.push(record)
    console.log('CAPTURED REAL BOSS VIDEO', JSON.stringify({ bossId, bytes: size, attacks: record.attacks.length, drawnSourceSlots: record.drawnSourceSlots, pixiVfx: record.pixiVfx }))
  }
} finally {
  await browser.close()
}
assert.equal(records.length, 4, 'Four distinct boss videos required')
assert.equal(records.reduce((sum, rec) => sum + rec.attacks.length, 0), 32,
  'Expected 32 per-phase attacks (25 distinct patterns including repeat appearances)')
await writeFile(output + '/capture-evidence.json', JSON.stringify({
  method: 'Real Chromium browser + live Vite DEV ES2 Canvas engine',
  motionReference: motionQa,
  sourceFramesDrawn: motionQa ? records.reduce((total, record) => total + record.drawnSourceSlots.flat().length, 0) : null,
  gitSha: process.env.GITHUB_SHA ?? null,
  note: 'DEV invulnerability/phase forcing; no mock sprites. UI / art candidates remain subject to human QA.',
  records,
}, null, 2) + '\n')
