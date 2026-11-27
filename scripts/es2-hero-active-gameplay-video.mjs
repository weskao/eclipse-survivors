/**
 * Real Chromium ES2 gameplay + live PulseAudio monitor, never synthetic footage or post-added SFX.
 * The explicit dev setup positions genuine enemies; Q still goes through the production HUD/engine.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { spawn, execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const output = 'artifacts/es2-hero-active-gameplay'
const base = new URL(process.env.PREVIEW_URL ?? 'http://127.0.0.1:4174/')
base.searchParams.set('heroActiveVideoQa', '1')
const heroes = ['knight', 'ranger', 'wizard', 'shadowblade', 'spirit-summoner', 'crimson-paladin']
const display = process.env.DISPLAY
assert.ok(display, 'Xvfb DISPLAY is required for real window capture')
await mkdir(output, { recursive: true })
const results = []
const browser = await chromium.launch({
  headless: false,
  ignoreDefaultArgs: ['--mute-audio'],
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
    '--kiosk', '--window-position=0,0', '--window-size=1280,720'],
})
try {
  for (const heroId of heroes) {
    const context = await browser.newContext({ viewport: null, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    let recorder
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    try {
      await page.goto(base.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 })
      const card = page.locator('button[data-hero="' + heroId + '"], button[data-hero-id="' + heroId + '"]')
      await card.click({ timeout: 45000 })
      await page.locator('.es2-start').click()
      const action = page.locator('.es2-hero-special[data-hero="' + heroId + '"] [data-hero-special]')
      await action.waitFor({ state: 'visible', timeout: 30000 })
      await page.waitForFunction(() => window.__test?.mode === 'play' && window.__test?.sceneArtLoaded && window.__test?.audio,
        null, { timeout: 45000 })
      await page.waitForFunction(() => window.__test?.pixiVfx?.status === 'ready', null, { timeout: 30000 })
      assert.equal(await action.getAttribute('data-ready'), 'true')
      const before = await page.evaluate(() => ({ frames: window.__test.frames, gpu: window.__test.pixiVfx.heroPasses }))
      const file = output + '/' + heroId + '-real-combat-with-audio.mp4'
      let recordingError = ''
      recorder = spawn('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'warning', '-y',
        '-thread_queue_size', '1024', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', '30',
        '-video_size', '1280x720', '-i', display + '+0,0',
        '-thread_queue_size', '1024', '-f', 'pulse', '-i', 'heroqa.monitor',
        '-t', '7', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-movflags', '+faststart', file])
      recorder.stderr.on('data', data => { recordingError += data.toString() })
      const recorded = new Promise(resolve => {
        recorder.once('error', e => resolve({ code: -1, error: String(e) }))
        recorder.once('close', code => resolve({ code, error: recordingError }))
      })
      await page.waitForTimeout(950)
      assert.equal(await page.evaluate(() => window.__test.prepareHeroActiveVideo()), true)
      await page.waitForTimeout(300)
      await page.keyboard.press('KeyQ')
      await page.waitForFunction(id => document.querySelector('.es2-hero-special[data-hero="' + id + '"] [data-hero-special]')?.getAttribute('data-ready') === 'false', heroId, { timeout: 3000 })
      await page.waitForFunction(previous => window.__test?.pixiVfx?.heroPasses > previous, before.gpu, { timeout: 5000 })
      await page.screenshot({ path: output + '/' + heroId + '-actual-cast.png' })
      // Continue real combat, with ordinary movement and legal choices if they appear.
      await page.keyboard.down('KeyD')
      await page.waitForTimeout(600)
      await page.keyboard.up('KeyD')
      const result = await recorded
      assert.equal(result.code, 0, result.error)
      const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }))
      assert.ok(probe.streams.some(s => s.codec_type === 'video' && s.codec_name === 'h264' && s.width === 1280 && s.height === 720))
      assert.ok(probe.streams.some(s => s.codec_type === 'audio' && s.codec_name === 'aac' && s.channels === 2))
      assert.ok(Number(probe.format.duration) >= 6.5)
      // Verify actual captured audio is non-silent, not merely an empty audio track.
      const sound = spawn('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'])
      let stats = ''
      sound.stderr.on('data', d => { stats += d.toString() })
      const soundCode = await new Promise(resolve => sound.once('close', resolve))
      assert.equal(soundCode, 0)
      const peak = Number(stats.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1])
      assert.ok(Number.isFinite(peak) && peak > -50, heroId + ': captured audio is silent')
      const after = await page.evaluate(() => ({ frames: window.__test.frames, gpu: window.__test.pixiVfx.heroPasses }))
      assert.ok(after.frames > before.frames + 30, heroId + ': actual Canvas stopped')
      assert.ok(after.gpu > before.gpu)
      assert.deepEqual(errors, [])
      const evidence = { heroId, file, bytes: (await stat(file)).size, duration: probe.format.duration,
        audioPeakDb: peak, canvasFrames: after.frames - before.frames, gpuPasses: after.gpu - before.gpu,
        source: 'real game window and live system audio; DEV target placement only' }
      results.push(evidence)
      await writeFile(output + '/capture-evidence.json', JSON.stringify({ sha: process.env.GITHUB_SHA, results }, null, 2))
      console.log('CAPTURED', JSON.stringify(evidence))
    } finally {
      if (recorder && recorder.exitCode === null && recorder.signalCode === null) recorder.kill('SIGTERM')
      await context.close()
    }
  }
} finally {
  await browser.close()
}
assert.equal(results.length, 6)
