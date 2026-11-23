// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HERO_CANDIDATE_ATLASES } from './hero-candidate-atlas'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('ES2 candidate review inventory', () => {
  it('describes the real committed East/South candidate count in its accessible preview', async () => {
    const html = readFileSync(new URL('./hero-candidate-preview.html', import.meta.url), 'utf8')
    expect(html).toContain('id="candidate-summary"')
    expect(html).not.toMatch(/Ten candidate|Nine panels|one Shadowblade panel/)

    document.body.innerHTML = '<p id="candidate-summary"></p><button id="pause"></button><main id="grid"></main>'
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    vi.stubGlobal('requestAnimationFrame', () => 1)
    await import('./hero-candidate-preview')

    const east = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'E').length
    const south = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'S').length
    const summary = document.querySelector('#candidate-summary')?.textContent ?? ''
    expect(summary).toContain(`${HERO_CANDIDATE_ATLASES.length} local WebP candidates`)
    expect(summary).toContain(`${east} East-facing`)
    expect(summary).toContain(`${south} South-facing`)
    expect(document.querySelector('#grid')?.getAttribute('aria-label'))
      .toBe(`${HERO_CANDIDATE_ATLASES.length} candidate animation strips`)
    expect(document.querySelectorAll('#grid article')).toHaveLength(HERO_CANDIDATE_ATLASES.length)
  })
})
