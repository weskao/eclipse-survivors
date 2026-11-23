import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

// Read-only screenshots of the actual built game, not archive-gallery mockups.
const root = 'artifacts/es2-biomes-gameplay'
const url = new URL(process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/')
url.searchParams.set('showcase', '1')
const ids = ['blood-moon-cathedral', 'cursed-forest', 'abyssal-necropolis', 'celestial-rift']
const sizes = [1152, 1152, 1152, 1152]
const devices = [
  { name: 'desktop-1440', width: 1440, height: 900, touch: false },
  { name: 'mobile-375', width: 375, height: 812, touch: true },
  { name: 'landscape-812', width: 812, height: 375, touch: true },
]
await mkdir(root, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const evidence = []
try {
  for (const device of devices) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.touch ? 2 : 1,
      isMobile: device.touch, hasTouch: device.touch,
      recordVideo: { dir: root, size: { width: device.width, height: device.height } },
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(url.href, { waitUntil: 'domcontentloaded' })
      await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      await page.locator('.es2-start').click()
      await page.waitForFunction(() => window.__test?.mode === 'play', null, { timeout: 30000 })
      await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 30000 })
      const scenes = new Set()
      for (let index = 0; index < ids.length; index++) {
        const before = await page.evaluate(() => window.__test?.frames ?? -1)
        const scene = await page.evaluate(index => {
          window.__test.previewBiome(index)
          return window.__test.scene
        }, index)
        assert.ok(scene, device.name + ' failed scene ' + index)
        scenes.add(scene)
        await page.waitForFunction(previous => window.__test?.frames > previous, before,
          { timeout: 30000 })
        const grounds = await page.evaluate(async () => {
          const urls = performance.getEntriesByType('resource').map(r => r.name)
            .filter(s => /-ground@3x-.*\.webp/.test(s))
          return Promise.all(urls.map(async url => {
            const image = new Image()
            image.src = url
            await image.decode()
            const canvas = document.createElement('canvas')
            canvas.width = image.naturalWidth
            canvas.height = image.naturalHeight
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(image, 0, 0)
            const { data, width: w, height: h } = ctx.getImageData(0, 0, canvas.width, canvas.height)
            let leftRight = 0, topBottom = 0
            for (let y = 0; y < h; y++) for (let k = 0; k < 3; k++)
              leftRight += Math.abs(data[y*w*4+k] - data[(y*w+w-1)*4+k])
            for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++)
              topBottom += Math.abs(data[x*4+k] - data[((h-1)*w+x)*4+k])
            return { url, width: w, height: h,
              seamLr: +(leftRight/(h*3)).toFixed(2), seamTb: +(topBottom/(w*3)).toFixed(2) }
          }))
        })
        for (let k = 0; k < ids.length; k++) {
          const ground = grounds.find(g => g.url.includes(ids[k]+'-ground@3x-'))
          assert.ok(ground, 'Missing actual runtime ground: '+ids[k])
          assert.equal(ground.width, sizes[k], ids[k]+' source width')
          assert.equal(ground.height, sizes[k], ids[k]+' source height')
          assert.ok(ground.seamLr < 8 && ground.seamTb < 8,
            ids[k]+' suspect ground edge pixel seam')
        }
        const screenshot = root+'/'+ids[index]+'-'+device.name+'.png'
        await page.screenshot({ path: screenshot, animations: 'disabled' })
        evidence.push({ viewport: device.name, biome: ids[index], scene, screenshot, grounds })
        await page.waitForTimeout(450)
      }
      assert.equal(scenes.size, ids.length)
      assert.deepEqual(errors, [], device.name+' browser errors')
    } finally {
      const video = page.video()
      await page.close()
      if (video) await video.saveAs(root+'/'+device.name+'.webm')
      await context.close()
    }
    console.log('PASS: four active gameplay Canvas biome screenshots on '+device.name)
  }
  await writeFile(root+'/biome-runtime-evidence.json',
    JSON.stringify({ source: 'real Chromium production preview',
      note: 'Native size and browser technical check only; all art remains human approval pending.',
      evidence }, null, 2)+'\n')
} finally {
  await browser.close()
}
