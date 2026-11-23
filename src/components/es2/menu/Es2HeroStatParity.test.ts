import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JOB } from '../../../game/constants'
import { HERO_DEFINITIONS } from '../../../game/content/heroes'
import Es2MainMenu from './Es2MainMenu.vue'

const labels = ['HP', 'ATK', 'SPD', 'ATK CD']
const wrappers: Array<{ unmount(): void }> = []
afterEach(() => { for (const w of wrappers.splice(0)) w.unmount() })

describe('homepage hero stat parity', () => {
  it('shows matching abbreviation, stat order and values for all six hero cards', () => {
    const screen = mount(Es2MainMenu, { props: { choice: 'knight', runMode: 'quick', version: '1.0.0' } })
    wrappers.push(screen)
    const heroes = [
      ...(['knight', 'ranger', 'wizard'] as const).map(id => ({
        selector: `[data-hero="${id}"]`, stats: JOB[id],
      })),
      ...(['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const).map(id => ({
        selector: `[data-hero-id="${id}"]`, stats: HERO_DEFINITIONS[id].stats,
      })),
    ]
    for (const { selector, stats } of heroes) {
      const card = screen.get(selector)
      const names = card.findAll('.es2-hero-stat-strip .es2-hero-stat-label').map(node => node.text())
      const values = card.findAll('.es2-hero-stat-strip .es2-hero-stat-value').map(node => node.text())
      expect(names, selector).toEqual(labels)
      expect(values, selector).toEqual([
        String(stats.hp), String(stats.damage), String(stats.speed), `${stats.delay}s`,
      ])
    }
  })

  it('matches selected original hero detail labels and preserves full descriptions for accessibility', () => {
    const screen = mount(Es2MainMenu, { props: { choice: 'knight', runMode: 'quick', version: '1.0.0' } })
    wrappers.push(screen)
    const detail = screen.get('[data-es2-classic-details]')
    expect(detail.findAll('[data-es2-classic-stat] small').map(node => node.text())).toEqual(labels)
    expect(screen.get('[data-hero="knight"] .es2-hero-stat-strip [data-hero-stat="attack-delay"]').attributes('title')).toBeTruthy()
  })

  it('uses one compact four-stat layout with narrow-device wrapping instead of overflowing cards', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/menu.css'), 'utf8')
    expect(css).toContain('.es2-hero-stat-strip')
    expect(css).toContain('repeat(4,minmax(0,1fr))')
    expect(css).toContain('repeat(2,minmax(0,1fr))')
    expect(css).toContain('min-width:0')
    expect(css).toContain('.es2-roster__stats')
  })
})
