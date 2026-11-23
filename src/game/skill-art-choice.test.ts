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
  it('provides an illustrated 3x icon for every hero specialization and its passive progression', () => {
    const owned = [
      ['shadowblade', 'shadow-daggers', 'shadow-precision'],
      ['spirit-summoner', 'spirit-orb', 'spirit-bond'],
      ['crimson-paladin', 'crimson-guard', 'crimson-vow'],
    ] as const
    for (const [hero, starting, progression] of owned) {
      for (const id of [starting, progression]) {
        const art = resolveSkillChoiceArt(`heroes:${id}`, undefined, false)
        expect(art.imageSrc).toContain(`${hero}-special@3x.webp`)
        expect(art.reducedMotionSrc).toBe(art.imageSrc)
      }
    }
  })

  it('does not replace externally owned illustrations with a generic icon', () => {
    expect(resolveSkillChoiceArt('other:custom', '/custom-illustration.webp', false)).toEqual({
      imageSrc: '/custom-illustration.webp', reducedMotionSrc: '/custom-illustration.webp',
    })
  })
})
