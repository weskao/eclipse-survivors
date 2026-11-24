// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HERO_CANDIDATE_ATLASES } from './hero-candidate-atlas'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('ES2 candidate review inventory', () => {
  it('describes the real committed East/South candidate count in its accessible preview', async () => {
    const html = readFileSync(resolve(process.cwd(), 'src/game/render/es2/hero-candidate-preview.html'), 'utf8')
    expect(html).toContain('id="candidate-summary"')
    expect(html).not.toMatch(/Ten candidate|Nine panels|one Shadowblade panel/)

    document.body.innerHTML = '<p id="candidate-summary"></p><button id="pause"></button><button id="step-prev"></button><button id="step-next"></button><button id="background-toggle"></button><button id="scale-toggle"></button><output id="frame-status"></output><main id="grid"></main>'
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const requestFrame = vi.fn(() => 1)
    vi.stubGlobal('requestAnimationFrame', requestFrame)
    await import('./hero-candidate-preview')

    const east = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'E').length
    const south = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'S').length
    const summary = document.querySelector('#candidate-summary')?.textContent ?? ''
    expect(summary).toContain(`${HERO_CANDIDATE_ATLASES.length} local WebP candidates`)
    expect(summary).toContain(`${east} East-facing`)
    expect(summary).toContain(`${south} South-facing`)
    expect(summary).toContain('6 diagonal four-frame strips')
    expect(summary).toContain('4 northern four-frame strips')
    expect(document.querySelector('#grid')?.getAttribute('aria-label'))
      .toBe(`${HERO_CANDIDATE_ATLASES.length} candidate animation strips`)
    expect(document.querySelectorAll('#grid article')).toHaveLength(HERO_CANDIDATE_ATLASES.length)
    // Reduced-motion QA must stay paused without an infinite 60fps redraw loop.
    expect(requestFrame).not.toHaveBeenCalled()
    expect(document.querySelector('#frame-status')?.textContent).toBe('Frame 1 / 4')
    document.querySelector<HTMLButtonElement>('#step-next')!.click()
    expect(document.querySelector('#frame-status')?.textContent).toBe('Frame 2 / 4')
    expect(document.querySelector('#pause')?.getAttribute('aria-pressed')).toBe('true')
    document.querySelector<HTMLButtonElement>('#step-prev')!.click()
    expect(document.querySelector('#frame-status')?.textContent).toBe('Frame 1 / 4')
    document.querySelector<HTMLButtonElement>('#background-toggle')!.click()
    expect(document.querySelector('#grid')?.getAttribute('data-contrast')).toBe('light')
    document.querySelector<HTMLButtonElement>('#scale-toggle')!.click()
    expect(document.querySelector('#grid')?.getAttribute('data-scale')).toBe('1x')
    expect([...document.querySelectorAll<HTMLCanvasElement>('#grid canvas')].every(c => c.width === 147 && c.height === 147)).toBe(true)
    expect(requestFrame).not.toHaveBeenCalled()
  })
})
