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
} finally {
  await browser.close()
}
