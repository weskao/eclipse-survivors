// @vitest-environment jsdom
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HERO_CANDIDATE_ATLASES } from './hero-candidate-atlas'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('ES2 candidate review inventory', () => {
  it('preserves the uploaded NW WebP and does not waive the manifest review gate', () => {
    const dir = resolve(process.cwd(), 'src/assets/es2/production/heroes/spirit-summoner/candidates/nw-2026-11-24-batch-6')
    const m = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'))
    const atlas = readFileSync(resolve(dir, 'run-nw-4frames@3x.webp'))
    expect(createHash('sha256').update(atlas).digest('hex')).toBe(m.webpSHA256)
    expect(atlas.length).toBe(m.bytes)
    expect(m.atlasPixels).toEqual([1536, 1536])
    expect(m.outputCellPixels).toEqual([768, 768])
    expect(m.frameCount).toBe(4)
    expect(m.eligibleForDevWiring).toBe(false)
    expect(m.qaGameplayApplied).toBe(false)
    expect(m.runtimeApplied).toBe(false)
    expect(m.status).toBe('QA_PENDING')
  })

  it('preserves Batch 24, 25 and 26 East run art as review-only assets', () => {
    for (const [hero, folder] of [
      ['shadowblade', 'run-e-2026-11-26-batch-24'],
      ['spirit-summoner', 'run-e-2026-11-26-batch-25'],
      ['shadowblade', 'run-e-2026-11-26-batch-26'],
      ['spirit-summoner', 'run-e-2026-11-26-batch-26'],
      ['crimson-paladin', 'run-e-2026-11-26-batch-26'],
    ]) {
      const dir = resolve(process.cwd(), 'src/assets/es2/production/heroes', hero!, 'candidates', folder!)
      const m = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'))
      const atlas = readFileSync(resolve(dir, 'run-e-4frames@3x.webp'))
      const source = readFileSync(resolve(dir, 'source.webp'))
      expect(createHash('sha256').update(atlas).digest('hex')).toBe(m.webpSHA256)
      expect(createHash('sha256').update(source).digest('hex')).toBe(m.sourceSHA256)
      expect(atlas.length).toBe(m.bytes)
      expect(m.atlasPixels).toEqual([1536, 1536])
      expect(m.frameCount).toBe(4)
      expect(m.status).toBe('QA_PENDING')
      expect(m.eligibleForDevWiring).toBe(false)
      expect(m.qaGameplayApplied).toBe(false)
      expect(m.runtimeApplied).toBe(false)
      expect(HERO_CANDIDATE_ATLASES.some(c => c.url.includes('/' + folder + '/'))).toBe(false)
    }
  })

  it.each([
    ['shadowblade', 'attack-e-keyframes-2026-11-26-batch-27', ['slash-key-a', 'recovery-key-a']],
    ['spirit-summoner', 'attack-e-keyframes-2026-11-26-batch-28', ['cast-release-key-a']],
  ] as const)('preserves %s independent attack keyframes and their review-only gate', (hero, folder, expectedKeys) => {
    const dir = resolve(process.cwd(), 'src/assets/es2/production/heroes', hero, 'candidates', folder)
    const m = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'))
    expect(m.status).toBe('QA_PENDING')
    expect(m.eligibleForDevWiring).toBe(false)
    expect(m.runtimeApplied).toBe(false)
    expect(m.qaGameplayApplied).toBe(false)
    expect(m.sequenceComplete).toBe(false)
    expect(m.continuousSequence).toBe(false)
    expect(m.frames.map((f: { id: string }) => f.id)).toEqual(expectedKeys)
    for (const f of m.frames) {
      const image = readFileSync(resolve(dir, f.file))
      const source = readFileSync(resolve(dir, f.sourceFile))
      expect(createHash('sha256').update(image).digest('hex')).toBe(f.webpSHA256)
      expect(createHash('sha256').update(source).digest('hex')).toBe(f.sourceSHA256)
      expect(f.outputCellPixels).toEqual([768, 768])
    }
    expect(HERO_CANDIDATE_ATLASES.some(c => c.url.includes('/' + folder + '/'))).toBe(false)
  })

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
    expect(summary).toContain('6 northern four-frame strips')
    expect(summary).toContain('21 additional pending atlases')
    expect(document.querySelector('#grid')?.getAttribute('aria-label'))
      .toBe(`${HERO_CANDIDATE_ATLASES.length + 26} candidate review panels`)
    expect(document.querySelectorAll('#grid article')).toHaveLength(HERO_CANDIDATE_ATLASES.length + 26)
    expect(summary).toContain('3 independent keyframes')
    const keys = [...document.querySelectorAll<HTMLElement>('[data-review-kind="pending-keyframe"]')]
    expect(keys.map(article => article.dataset.keyframe)).toEqual(['slash-key-a', 'recovery-key-a', 'cast-release-key-a'])
    expect(keys[2]?.dataset.candidateFolder).toBe('attack-e-keyframes-2026-11-26-batch-28')
    expect(keys[2]?.querySelector('h2')?.textContent).toContain('spirit-summoner · ATTACK · E')
    expect(keys.every(article => article.querySelector('h2')?.textContent?.includes('1 frame'))).toBe(true)
    expect(keys.every(article => article.querySelector('canvas')?.dataset.mirrored === 'false')).toBe(true)
    const pending = [...document.querySelectorAll<HTMLElement>('[data-review-kind="pending-atlas"]')]
    expect(pending).toHaveLength(21)
    const expectedPending = ["spirit-summoner · RUN · W","spirit-summoner · RUN · NW","crimson-paladin · RUN · W","crimson-paladin · RUN · NW","crimson-paladin · RUN · NE","shadowblade · HURT · SE","shadowblade · DEATH · SE","shadowblade · VICTORY · SE","spirit-summoner · HURT · SE","spirit-summoner · DEATH · SE","spirit-summoner · VICTORY · SE","crimson-paladin · HURT · SE","crimson-paladin · DEATH · SE","crimson-paladin · VICTORY · SE","crimson-paladin · SPECIAL · SE","spirit-summoner · IDLE · NW","shadowblade · RUN · E","spirit-summoner · RUN · E","crimson-paladin · RUN · E"]
    for (const name of expectedPending) {
      expect(pending.some(article => article.querySelector('h2')?.textContent?.startsWith(name))).toBe(true)
    }
    const batch26 = pending.filter(article => article.dataset.candidateFolder === 'run-e-2026-11-26-batch-26')
    expect(batch26).toHaveLength(3)
    for (const hero of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
      expect(batch26.some(article => article.querySelector('h2')?.textContent?.startsWith(hero + ' · RUN · E'))).toBe(true)
    }
    expect(pending.every(article => article.querySelector('canvas')?.dataset.mirrored === 'false')).toBe(true)
    const authored = document.querySelector<HTMLElement>('[data-review-kind="batch-6-nw"]')
    const reflected = document.querySelector<HTMLElement>('[data-review-kind="ne-reflected-nw"]')
    expect(authored?.textContent).toContain('NW')
    expect(reflected?.textContent).toContain('NW')
    expect(authored?.querySelector('canvas')?.dataset.mirrored).toBe('false')
    expect(reflected?.querySelector('canvas')?.dataset.mirrored).toBe('true')
    expect(HERO_CANDIDATE_ATLASES.some(c => c.url.includes('/nw-2026-11-24-batch-6/'))).toBe(false)
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
