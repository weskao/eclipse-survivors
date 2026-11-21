import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('benchmark contract', () => {
  it('uses actual browser frame callbacks and main baseline rather than mock timings', () => {
    const script = readFileSync(resolve(process.cwd(), 'scripts/benchmark-audio-ux.py'), 'utf8')
    expect(script).toContain('window.requestAnimationFrame = callback')
    expect(script).toContain('window.__test && window.__test.sceneArtLoaded')
    expect(script).toContain('fe6161fa9deea23d4447b39b2085689744f531fe')
  })
})
