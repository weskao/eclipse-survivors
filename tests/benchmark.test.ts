import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('benchmark contract', () => {
  it('uses actual browser frame callbacks and main baseline rather than mock timings', () => {
    const script = readFileSync(new URL('../scripts/benchmark-audio-ux.py', import.meta.url), 'utf8')
    expect(script).toContain('window.requestAnimationFrame = callback')
    expect(script).toContain('window.__test && window.__test.sceneArtLoaded')
    expect(script).toContain('fe6161fa9deea23d4447b39b2085689744f531fe')
  })
})
