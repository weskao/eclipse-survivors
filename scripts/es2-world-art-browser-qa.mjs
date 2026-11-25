import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

// Vite development server, real browser-decoded repository WebPs.
// This technical audit does NOT grant human visual approval or prove that every
// boss/biome/enemy is visible in a normal gameplay encounter.
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const output = 'artifacts/es2-mobile-browser/world-art'
const categories = ['enemies', 'bosses', 'biomes', 'ui']
const manifests = await Promise.all(categories.map(async category => {
  const path = 'src/assets/es2/production/' + category + '/manifest.json'
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  return { category, assets: manifest.assets }
}))
const expected = manifests.flatMap(({ category, assets }) =>
  assets.map(asset => ({ category, id: asset.id, width: asset.width, height: asset.height,
    alpha: asset.alpha, frames: asset.frames, columns: asset.columns,
    frameWidth: asset.frameWidth, frameHeight: asset.frameHeight,
    sha256: asset.sha256, qaStatus: asset.status })))
assert.equal(expected.length, 49, 'Expected 49 existing world-art assets')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const browserErrors = []
  page.on('pageerror', error => browserErrors.push(error.message))
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.es2-hall-links button').first().click()
  const tabs = page.locator('.es2-hall-links button')
  await tabs.nth(2).click()
  await page.locator('[data-es2-world-enemy]').first().waitFor({ state: 'visible' })
  const worldEntries = await page.evaluate(() => {
    const cssUrl = element => {
      const value = getComputedStyle(element).backgroundImage
      const match = value.match(/^url\(["']?(.*?)["']?\)$/)
      if (!match) throw new Error('Missing authored CSS image: ' + value)
      return match[1]
    }
    const out = []
    for (const card of document.querySelectorAll('[data-es2-world-enemy]')) {
      const id = card.getAttribute('data-es2-world-enemy')
      out.push({ category: 'enemies', id, url: cssUrl(card.querySelector('.es2-world-art-enemy')) })
      out.push({ category: 'enemies', id: id + ':telegraph', url: card.querySelector('.es2-world-art-telegraph').src })
    }
    for (const card of document.querySelectorAll('[data-es2-world-boss]')) {
      out.push({ category: 'bosses', id: card.getAttribute('data-es2-world-boss'),
        url: cssUrl(card.querySelector('.es2-world-art-boss')) })
    }
    for (const card of document.querySelectorAll('[data-es2-world-biome]')) {
      const id = card.getAttribute('data-es2-world-biome')
      out.push({ category: 'biomes', id: id + ':ground', url: card.querySelector('.es2-world-art-ground').src })
      out.push({ category: 'biomes', id: id + ':decor', url: cssUrl(card.querySelector('.es2-world-art-decor')) })
    }
    return out
  })
  for (const [selector, name] of [
    ['[data-es2-world-enemy]', 'enemies'],
    ['[data-es2-world-boss]', 'bosses'],
    ['[data-es2-world-biome]', 'biomes'],
  ]) {
    await page.locator(selector).first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: output + '/' + name + '-archive-real-browser.png', animations: 'disabled' })
  }
  await tabs.nth(4).click()
  await page.locator('[data-es2-world-ui]').first().waitFor({ state: 'visible' })
  const uiEntries = await page.evaluate(() => Array.from(document.querySelectorAll('[data-es2-world-ui]'), card => ({
    category: 'ui', id: card.getAttribute('data-es2-world-ui'),
    url: card.querySelector('img.es2-world-art-icon').src,
  })))
  await page.locator('[data-es2-world-ui]').first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: output + '/ui-archive-real-browser.png', animations: 'disabled' })
  await page.locator('[data-es2-world-ui]').last().scrollIntoViewIfNeeded()
  await page.screenshot({ path: output + '/ui-archive-bottom-real-browser.png', animations: 'disabled' })
  const found = [...worldEntries, ...uiEntries]
  assert.equal(found.length, 49, 'All 49 authored images must be wired to the real archive UI')
  assert.equal(new Set(found.map(a => a.category + '/' + a.id)).size, 49, 'Duplicate world-art ID')
  assert.equal(new Set(found.map(a => a.url)).size, 49, 'Two assets share the same URL')
  // Manifest geometry is authoritative; do not infer source cells from preview CSS.
  const byId = new Map(expected.map(asset => [asset.category + '/' + asset.id, asset]))
  const requested = found.map(entry => {
    const geometry = byId.get(entry.category + '/' + entry.id)
    assert.ok(geometry, 'Unknown world-art entry ' + entry.category + '/' + entry.id)
    return { ...entry, ...geometry }
  })
  const audits = await page.evaluate(async entries => {
    const results = []
    for (const entry of entries) {
      const image = new Image()
      image.src = entry.url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Canvas 2D unavailable')
      ctx.drawImage(image, 0, 0)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let transparent = 0
      let opaque = 0
      for (let p = 3; p < pixels.length; p += 4) {
        if (pixels[p] === 0) transparent++
        if (pixels[p] === 255) opaque++
      }
      // Per-cell QA measures actual decoded source pixels (not scaled gallery screenshots).
      // An edge contact or repeated hash is a review flag, never automatic approval.
      const frameMetrics = []
      for (let frame = 0; frame < entry.frames; frame++) {
        const originX = (frame % entry.columns) * entry.frameWidth
        const originY = Math.floor(frame / entry.columns) * entry.frameHeight
        let left = entry.frameWidth, top = entry.frameHeight, right = -1, bottom = -1
        let visiblePixels = 0, edgePixels = 0, fingerprint = 2166136261
        for (let y = 0; y < entry.frameHeight; y++) for (let x = 0; x < entry.frameWidth; x++) {
          const offset = ((originY + y) * canvas.width + originX + x) * 4
          const alpha = pixels[offset + 3]
          for (let channel = 0; channel < 4; channel++)
            fingerprint = Math.imul(fingerprint ^ pixels[offset + channel], 16777619)
          if (alpha <= 16) continue
          visiblePixels++
          left = Math.min(left, x); top = Math.min(top, y)
          right = Math.max(right, x); bottom = Math.max(bottom, y)
          if (x === 0 || y === 0 || x === entry.frameWidth - 1 || y === entry.frameHeight - 1)
            edgePixels++
        }
        frameMetrics.push({
          index: frame, visiblePixels, edgePixels,
          bounds: visiblePixels ? { x: left, y: top, width: right - left + 1,
            height: bottom - top + 1 } : null,
          fingerprint: (fingerprint >>> 0).toString(16).padStart(8, '0'),
        })
      }
      const possibleDuplicateFrames = []
      for (let left = 0; left < frameMetrics.length; left++)
        for (let right = left + 1; right < frameMetrics.length; right++)
          if (frameMetrics[left].fingerprint === frameMetrics[right].fingerprint)
            possibleDuplicateFrames.push([left, right])

      let seamHorizontal = null
      let seamVertical = null
      if (entry.category === 'biomes' && entry.id.endsWith(':ground')) {
        let horizontal = 0, vertical = 0
        const w = canvas.width, h = canvas.height
        for (let y = 0; y < h; y++) for (let channel = 0; channel < 3; channel++) {
          horizontal += Math.abs(pixels[(y * w) * 4 + channel] -
            pixels[(y * w + w - 1) * 4 + channel])
        }
        for (let x = 0; x < w; x++) for (let channel = 0; channel < 3; channel++) {
          vertical += Math.abs(pixels[x * 4 + channel] -
            pixels[((h - 1) * w + x) * 4 + channel])
        }
        seamHorizontal = +(horizontal / (h * 3)).toFixed(2)
        seamVertical = +(vertical / (w * 3)).toFixed(2)
      }
      results.push({ category: entry.category, id: entry.id, src: entry.url,
        width: image.naturalWidth, height: image.naturalHeight,
        transparentPixels: transparent, opaquePixels: opaque,
        frameMetrics, possibleDuplicateFrames,
        seamHorizontalRgbMean: seamHorizontal, seamVerticalRgbMean: seamVertical })
    }
    return results
  }, requested)
  for (const asset of expected) {
    const actual = audits.find(a => a.category === asset.category && a.id === asset.id)
    assert.ok(actual, 'Missing real browser image: ' + asset.category + '/' + asset.id)
    assert.deepEqual([actual.width, actual.height], [asset.width, asset.height],
      asset.id + ': browser decoded different geometry than manifest')
    assert.ok(actual.opaquePixels > 0, asset.id + ': image has no visible art pixels')
    if (asset.alpha) assert.ok(actual.transparentPixels > 0, asset.id + ': expected transparent sheet')
    else assert.equal(actual.transparentPixels, 0, asset.id + ': ground cannot have missing alpha tiles')
    assert.equal(actual.frameMetrics.length, asset.frames,
      asset.id + ': source cell count does not match manifest')
    actual.frameWidth = asset.frameWidth
    actual.frameHeight = asset.frameHeight
    actual.frames = asset.frames
    actual.sha256 = asset.sha256
    actual.qaStatus = asset.qaStatus
    // RED: require an independently inspected visible region for every source frame.
    assert.equal(actual.frameMetrics?.length, asset.frames,
      asset.id + ': missing per-frame pixel review evidence')
    for (const frame of actual.frameMetrics) {
      assert.ok(frame.visiblePixels > 0, asset.id + ': blank atlas frame ' + frame.index)
      assert.ok(frame.bounds?.width > 0 && frame.bounds?.height > 0,
        asset.id + ': missing visible bounds for frame ' + frame.index)
    }
  }
  // Opaque seamless ground fills every edge by design; it is not atlas bleed.
  const edgeReview = audits.filter(asset => !(asset.category === 'biomes' && asset.id.endsWith(':ground')) &&
    asset.frameMetrics.some(frame => frame.edgePixels > 0))
  const repeatedReview = audits.filter(asset => asset.possibleDuplicateFrames.length > 0)
  console.log('World art per-frame review flags (not automatic failures): ' +
    edgeReview.length + ' sheets with touched cell edges; ' +
    repeatedReview.length + ' sheets with possible repeated frames')
  await writeFile(output + '/browser-decode-49.json',
    JSON.stringify({ source: 'real Chromium Vite DEV art inspection',
      note: 'Technical inspection only. All images require separate human visual/native-3x review.',
      assets: audits }, null, 2) + '\n')
  await page.locator('[data-es2-return-lobby]').click()
  await page.locator('.es2-start').click()
  await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
  await page.screenshot({ path: output + '/gameplay-current-encounter-real-browser.png', animations: 'disabled' })
  assert.deepEqual(browserErrors, [], 'Uncaught browser exceptions while reviewing world art')
  // Preserve real gameplay evidence for all four production biomes rather than
  // treating image decode in an archive gallery as proof of correct world rendering.
  // The existing showcase switch uses the actual engine, state transitions,
  // Vite-loaded sprites and Canvas renderer; it never mocks a gameplay screenshot.
  for (const [viewportName, width, height, touch] of [
    ['desktop-1440', 1440, 900, false],
    ['mobile-375', 375, 812, true],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: touch ? 2 : 1,
      isMobile: touch, hasTouch: touch,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      const scenarioUrl = new URL(base)
      scenarioUrl.searchParams.set('showcase', '1')
      await page.goto(scenarioUrl.href, { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      await page.locator('.es2-start').click()
      await page.waitForFunction(() => window.__test?.mode === 'play', null, { timeout: 30000 })

      const sceneNames = new Set()
      for (const index of [0, 1, 2, 3]) {
        const previousFrames = await page.evaluate(() => window.__test?.frames ?? -1)
        const sceneName = await page.evaluate(index => {
          window.__test.previewBiome(index)
          return window.__test.scene
        }, index)
        assert.ok(sceneName, viewportName + ': missing scene name for biome ' + index)
        sceneNames.add(sceneName)
        await page.waitForFunction(previousFrames => window.__test?.frames > previousFrames,
          previousFrames, { timeout: 30000 })
        await page.screenshot({
          path: output + '/gameplay-biome-' + index + '-' + viewportName + '.png',
          animations: 'disabled',
        })
      }
      assert.equal(sceneNames.size, 4,
        viewportName + ': not all four authored biomes changed the actual gameplay scene')
      assert.deepEqual(errors, [], viewportName + ': uncaught runtime exceptions while switching biomes')
      console.log('PASS: four distinct live Canvas biomes captured at ' + viewportName)
    } finally {
      await context.close()
    }
  }
  console.log('PASS: 49/49 production WebPs decoded, source geometry/alpha verified in real Chromium')
  console.log('ATTENTION: Native 3x source provenance, full combat state coverage and human approval remain pending')
} finally {
  await browser.close()
}
