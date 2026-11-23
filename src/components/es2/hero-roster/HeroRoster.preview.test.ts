import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import HeroRoster from './HeroRoster.vue'
import { PRODUCTION_HERO_ACTION_SOURCES, PRODUCTION_HERO_SOURCES } from '../../../game/render/es2/production-heroes'

const ids = ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const

describe('hero roster action preview artwork', () => {
  it('uses the real eight-frame action sheet for each hero, not a resized portrait', () => {
    const wrapper = mount(HeroRoster)
    for (const id of ids) {
      const card = wrapper.get(`[data-hero-id="${id}"]`)
      const preview = card.get('.es2-hero-action-preview')
      const style = preview.attributes('style')
      expect(style).toContain(PRODUCTION_HERO_ACTION_SOURCES[id])
      expect(style).not.toContain(PRODUCTION_HERO_SOURCES[id])
    }
    wrapper.unmount()
  })

  it('displays exact isolated eight frames and freezes a valid frame under reduced motion', () => {
    const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
    expect(css).toMatch(/\.es2-hero-action-preview\s*\{[^}]*background-size:800% 100%/)
    expect(css).toMatch(/animation:es2-hero-action-frames[^;]*steps\(8,jump-none\)/)
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)\{\.es2-hero-action-preview\{animation:none/)
  })
})
