import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import HeroRoster from './HeroRoster.vue'
import {
  PRODUCTION_HERO_ACTION_SOURCES,
  PRODUCTION_HERO_POSE_SOURCES,
  PRODUCTION_HERO_SOURCES,
} from '../../../game/render/es2/production-heroes'

const ids = ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const

describe('hero roster gameplay action preview', () => {
  it('previews the actual gameplay action pose atlas for each hero, not the outdated strip or portrait', () => {
    const wrapper = mount(HeroRoster)
    for (const id of ids) {
      const card = wrapper.get(`[data-hero-id="${id}"]`)
      const style = card.get('.es2-hero-action-preview').attributes('style')
      expect(style).toContain(PRODUCTION_HERO_POSE_SOURCES[id].action)
      expect(style).not.toContain(PRODUCTION_HERO_ACTION_SOURCES[id])
      expect(style).not.toContain(PRODUCTION_HERO_SOURCES[id])
    }
    wrapper.unmount()
  })

  it('isolates the eight authored run poses from the first two rows of the gameplay 4×4 atlas', () => {
    const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
    expect(css).toMatch(/\\.es2-hero-action-preview\\s*\\{[^}]*background-size:400% 400%/)
    expect(css).toMatch(/animation:es2-hero-action-frames[^;]*steps\\(1,end\\)/)
    const positions = ['0% 0%', '33.333% 0%', '66.667% 0%', '100% 0%',
      '0% 33.333%', '33.333% 33.333%', '66.667% 33.333%', '100% 33.333%']
    for (const [frame, position] of positions.entries()) {
      expect(css).toContain(`${frame * 12.5}%{background-position:${position}}`)
    }
    expect(css).toMatch(/@media\\(prefers-reduced-motion:reduce\\)\\{\\.es2-hero-action-preview\\{animation:none/)
  })
})
