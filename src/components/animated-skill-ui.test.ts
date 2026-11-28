import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import LevelUpOverlay from './LevelUpOverlay.vue'
import { animatedSkillImageSrc, hasGeneratedSkillArt } from '../game/ui-art'
import type { UpgradeDef } from '../game/types'

const generated = ['damage','multi','blaze','frost','chain','vortex','meteor','orb','shield','heal'] as const

describe('raster spell artwork animation', () => {
  it('bundles real multi-frame transparent WebP animations for all generated spells', () => {
    for (const id of generated) {
      expect(hasGeneratedSkillArt(id)).toBe(true)
      const path = resolve(process.cwd(), `assets/skill-icons/${id}@3x-animated.webp`)
      const webp = readFileSync(path)
      expect(webp.toString('ascii', 0, 4)).toBe('RIFF')
      expect(webp.toString('ascii', 8, 12)).toBe('WEBP')
      expect(webp.includes(Buffer.from('ANIM'))).toBe(true)
      expect(webp.includes(Buffer.from('ANMF'))).toBe(true)
      expect(animatedSkillImageSrc(id)).toContain('@3x-animated.webp')
    }
  })

  it('serves the animated WebP in upgrade cards but swaps to still art on reduced motion', () => {
    const u: UpgradeDef = { id: 'blaze', title: 'Flame', desc: 'Fire', icon: '🔥', rarity: 'rare', maxLevel: 5 }
    const screen = mount(LevelUpOverlay, { props: { active: true, upgrades: [u] } })
    expect(screen.find('picture source[media="(prefers-reduced-motion: reduce)"]').attributes('srcset')).toContain('blaze@3x.webp')
    expect(screen.find('picture img.skill-art').attributes('src')).toContain('blaze@3x-animated.webp')
  })

  it('uses still spell artwork in the no-animation upgrade setting', () => {
    const u: UpgradeDef = { id: 'blaze', title: 'Flame', desc: 'Fire', icon: '🔥', rarity: 'rare', maxLevel: 5 }
    const screen = mount(LevelUpOverlay, { props: { active: true, upgrades: [u], effect: 'still' } })
    expect(screen.find('#level').classes()).toContain('still-upgrades')
    expect(screen.find('picture img.skill-art').attributes('src')).toContain('blaze@3x.webp')
    expect(screen.find('picture img.skill-art').attributes('src')).not.toContain('-animated.webp')
  })

  it('does not layer the fallback emoji on top of a real illustrated skill', () => {
    const illustrated: UpgradeDef = { id: 'blaze', title: 'Blaze', desc: 'Fire', icon: '🔥', rarity: 'rare', maxLevel: 5 }
    const card = mount(LevelUpOverlay, { props: { active: true, upgrades: [illustrated] } })
    expect(card.get('.skill-sigil').text()).not.toContain('🔥')
    const unknown: UpgradeDef = { ...illustrated, id: 'other:unknown' }
    const fallback = mount(LevelUpOverlay, { props: { active: true, upgrades: [unknown] } })
    expect(fallback.get('.skill-sigil').text()).toContain('🔥')
  })

  it('falls back to the original SVG if the new image fails to load', async () => {
    const u: UpgradeDef = { id: 'speed', title: 'Speed', desc: 'Speed', icon: '✶', rarity: 'common', maxLevel: 5 }
    const screen = mount(LevelUpOverlay, { props: { active: true, upgrades: [u] } })
    const img = screen.get('img.skill-art')
    await img.trigger('error')
    expect(img.attributes('src')).toContain('speed@3x.webp')
    await img.trigger('error')
    expect(img.attributes('src')).toContain('speed.svg')
  })

  it('uses a single animated atlas for the HUD and a static atlas in reduced motion', () => {
    const animation = readFileSync(resolve(process.cwd(), 'src/assets/ui/skill-art-atlas@3x-animated.webp'))
    expect(animation.toString('ascii', 8, 12)).toBe('WEBP')
    expect(animation.includes(Buffer.from('ANIM'))).toBe(true)
    const css = readFileSync(resolve(process.cwd(), 'src/visual-polish.css'), 'utf8')
    expect(css).toContain('skill-art-atlas@3x-animated.webp')
    expect(css).toContain('skill-art-atlas@3x.webp')
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })
})
