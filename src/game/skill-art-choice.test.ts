import { describe, expect, it } from 'vitest'
import { resolveSkillChoiceArt } from './ui-art'
import { readFileSync } from 'node:fs'

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
        expect(art.imageSrc).toContain(`${hero}-${id === starting ? 'special' : 'portrait'}@3x.webp`)
        expect(art.reducedMotionSrc).toBe(art.imageSrc)
      }
    }
  })

  it('ships distinct 384px detailed vector illustrations for every legacy non-WebP choice', () => {
    const ids = ['speed', 'haste', 'maxhp', 'magnet', 'bolt', 'frozen-thunderstorm', 'infernal-singularity', 'apocalypse-rain', 'blade-tempest', 'guardian-sanctuary'] as const
    const art = ids.map(id => {
      expect(resolveSkillChoiceArt(id).imageSrc).toContain(id + '.svg')
      const source = readFileSync('assets/skill-icons/' + id + '.svg', 'utf8')
      expect(source).toContain('width="384"')
      expect(source).toContain('linearGradient')
      return source
    })
    expect(new Set(art).size).toBe(ids.length)
  })

  it('does not replace externally owned illustrations with a generic icon', () => {
    expect(resolveSkillChoiceArt('other:custom', '/custom-illustration.webp', false)).toEqual({
      imageSrc: '/custom-illustration.webp', reducedMotionSrc: '/custom-illustration.webp',
    })
  })
})
