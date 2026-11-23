import { describe, expect, it } from 'vitest'
import { resolveSkillChoiceArt } from './ui-art'

describe('all battle skill choice illustrations', () => {
  it('selects the animated 3x painting for each authored weapon and evolution', () => {
    for (const kind of ['weapons', 'evolution2'] as const) {
      const name = kind === 'weapons' ? 'shadow-daggers' : 'solar-tempest'
      const art = resolveSkillChoiceArt(`${kind}:${name}`, undefined, false)
      expect(art.imageSrc).toContain(name + '@3x-animated.webp')
      expect(art.reducedMotionSrc).toContain(name + '@3x.webp')
      expect(resolveSkillChoiceArt(`${kind}:${name}`, undefined, true).imageSrc).toContain(name + '@3x.webp')
    }
  })
  it('keeps native skill SVG and generated animated icon behavior', () => {
    expect(resolveSkillChoiceArt('damage', undefined, false).imageSrc).toContain('damage@3x-animated.webp')
    expect(resolveSkillChoiceArt('speed', undefined, false).imageSrc).toContain('speed.svg')
    expect(resolveSkillChoiceArt('speed', undefined, true).imageSrc).toContain('speed.svg')
  })
  it('does not replace externally owned illustrations with a generic icon', () => {
    expect(resolveSkillChoiceArt('other:custom', '/custom-illustration.webp', false)).toEqual({
      imageSrc: '/custom-illustration.webp', reducedMotionSrc: '/custom-illustration.webp',
    })
  })
})
