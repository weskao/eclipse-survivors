import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const capture = readFileSync(resolve(process.cwd(), 'scripts/es2-world-art-browser-qa.mjs'), 'utf8')

describe('ES2 49-art browser evidence must include actual gameplay', () => {
  it('captures each of the four biome scenes from the real running Canvas, not only the archive gallery', () => {
    expect(capture).toContain('for (const index of [0, 1, 2, 3])')
    expect(capture).toContain('window.__test.previewBiome(index)')
    expect(capture).toContain('gameplay-biome-')
    expect(capture).toContain('await page.waitForFunction(previousFrames => window.__test?.frames > previousFrames')
    expect(capture).toContain('sceneNames.size')
  })

  it('collects runtime scene captures at desktop and touch-phone viewports', () => {
    expect(capture).toContain("['desktop-1440', 1440, 900, false]")
    expect(capture).toContain("['mobile-375', 375, 812, true]")
    expect(capture).toContain("new URL(base)")
  })
})
