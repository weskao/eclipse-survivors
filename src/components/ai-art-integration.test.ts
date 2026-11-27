import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import LevelUpOverlay from './LevelUpOverlay.vue'
import GameHud from './GameHud.vue'
import { emptyHud } from '../game/store'
import { UP } from '../game/constants'

const read = (path: string) => readFileSync(resolve(process.cwd(), path))

describe('generated WebP art integration', () => {
  it('bundles ten original transparent @3x WebP skill images and one sprite atlas', () => {
    const ids = ['damage', 'multi', 'blaze', 'frost', 'chain', 'vortex', 'meteor', 'orb', 'shield', 'heal']
    for (const id of ids) {
      const content = read(`assets/skill-icons/${id}@3x.webp`)
      expect(content.subarray(0, 4).toString()).toBe('RIFF')
      expect(content.subarray(8, 12).toString()).toBe('WEBP')
      expect(content.subarray(12, 16).toString()).toBe('VP8X')
      expect(content[20]! & 0x10).toBe(0x10) // Alpha flag: transparency is preserved.
      expect(1 + content.readUIntLE(24, 3)).toBe(288) // @3x for 96px upgrades.
      expect(1 + content.readUIntLE(27, 3)).toBe(288)
      expect(content.length).toBeGreaterThan(2500)
    }
    const atlas = read('src/assets/ui/skill-art-atlas@3x.webp')
    expect(atlas.subarray(0, 4).toString()).toBe('RIFF')
    expect(atlas.subarray(8, 12).toString()).toBe('WEBP')
    expect(atlas[20]! & 0x10).toBe(0x10)
    expect(1 + atlas.readUIntLE(24, 3)).toBe(720)
    expect(1 + atlas.readUIntLE(27, 3)).toBe(288)
  })

  it('uses the new WebP in upgrade cards and keeps the SVG fallback for other skills', () => {
    const upgrades = [UP.find((u) => u.id === 'damage')!, UP.find((u) => u.id === 'speed')!]
    const wrapper = mount(LevelUpOverlay, { props: { active: true, upgrades } })
    expect(wrapper.find('[data-up="damage"] .skill-art').attributes('src')).toContain('damage@3x-animated.webp')
    expect(wrapper.find('[data-up="damage"] source[media="(prefers-reduced-motion: reduce)"]').attributes('srcset')).toContain('damage@3x.webp')
    expect(wrapper.find('[data-up="speed"] .skill-art').attributes('src')).toContain('speed@3x-animated.webp')
  })

  it('renders generated HUD skills from the atlas without fetching duplicate images', () => {
    const skill = (id: 'frost' | 'speed') => ({
      id, icon: '✶', title: id, rarity: 'rare' as const,
      level: 1, maxLevel: 5, cooldown: 0, cooldownPct: 0, evolved: false,
    })
    const wrapper = mount(GameHud, { props: {
      active: true, hud: { ...emptyHud(), skills: [skill('frost'), skill('speed')] },
      choice: 'knight', musicOn: true, sfxOn: true, toastText: '', toastVisible: false,
    } })
    expect(wrapper.find('[data-skill="frost"] .skill-art').exists()).toBe(false)
    expect(wrapper.find('[data-skill="speed"] .skill-art').attributes('src')).toContain('speed@3x.webp')
  })

  it('keeps game UI states readable and supports reduced motion and narrow screens', () => {
    const css = read('src/visual-polish.css').toString('utf8')
    expect(css).toContain('skill-art-atlas@3x.webp')
    expect(css).toContain('#level .upgrade:focus-visible')
    expect(css).toContain('.mode-choice[aria-checked="true"]')
    expect(css).toContain('@media(prefers-reduced-motion:reduce)')
    expect(css).toContain('@media(max-height:500px)')
    expect(css).toContain('result-panel')
  })
})
