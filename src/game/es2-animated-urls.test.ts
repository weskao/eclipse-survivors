import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LevelUpOverlay from '../components/LevelUpOverlay.vue'
import { animatedEs2ImageSrc, stillEs2ImageSrc, animatedSkillImageSrc } from './ui-art'
import type { AbilityId, UpgradeDef } from './types'

const weapons = [
  'shadow-daggers', 'holy-lance', 'blood-scythe', 'arcane-mines',
  'bone-spears', 'poison-cloud', 'ricochet-blades', 'spirit-wolves',
  'solar-beam', 'gravity-orbs', 'spectral-bow', 'thorn-chain',
]
const evolutions = [
  'nightfall-torrent', 'dawn-judgment', 'crimson-reaper',
  'singularity-minefield', 'toxic-permafrost', 'infinite-rebound',
  'wild-hunt', 'solar-tempest', 'celestial-collapse',
  'spectral-volley', 'bonefire-barrage', 'verdant-snare',
]

describe('ES2 animated production illustration integration', () => {
  it('uses exactly one animated 3x WebP per canonical weapon and evolution', () => {
    const ids = [...weapons.map(id => 'weapons:' + id),
      ...evolutions.map(id => 'evolution2:' + id)] as AbilityId[]
    const actual = new Set<string>()
    for (const id of ids) {
      const slug = id.split(':')[1]!
      const animated = animatedEs2ImageSrc(id)
      const staticArt = stillEs2ImageSrc(id)
      expect(animated, id).toContain(slug + '@3x-animated.webp')
      expect(staticArt, id).toContain(slug + '@3x.webp')
      expect(animated).not.toBe(staticArt)
      actual.add(animated!)
    }
    expect(actual.size).toBe(24)
  })

  it('does not rewrite built-in artwork or invent a URL for unknown content', () => {
    expect(animatedSkillImageSrc('blaze')).toContain('blaze@3x-animated.webp')
    expect(animatedEs2ImageSrc('blaze')).toBeUndefined()
    expect(animatedEs2ImageSrc('evolution2:nonexistent')).toBeUndefined()
  })

  it('uses animated skill artwork for upgrades, static sources for reduced motion and still setting', () => {
    const upgrade: UpgradeDef = {
      id: 'weapons:shadow-daggers', title: 'Shadow Daggers', desc: 'Dual blades',
      icon: '✦', rarity: 'rare', maxLevel: 3,
      iconSrc: stillEs2ImageSrc('weapons:shadow-daggers'),
    }
    const animated = mount(LevelUpOverlay, { props: { active: true, upgrades: [upgrade] } })
    expect(animated.find('picture img.skill-art').attributes('src'))
      .toContain('shadow-daggers@3x-animated.webp')
    expect(animated.find('picture source[media="(prefers-reduced-motion: reduce)"]').attributes('srcset'))
      .toContain('shadow-daggers@3x.webp')
    animated.unmount()

    const still = mount(LevelUpOverlay, { props: { active: true, upgrades: [upgrade], effect: 'still' } })
    expect(still.find('picture img.skill-art').attributes('src'))
      .toContain('shadow-daggers@3x.webp')
    still.unmount()
  })
})
