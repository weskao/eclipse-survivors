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
      const statsNode = card.get('.es2-hero-stat-strip.es2-roster__stats')
      expect(card.findAll('.es2-hero-stat-strip'), selector).toHaveLength(1)
      const names = statsNode.findAll('.es2-hero-stat-label').map(node => node.text())
      const values = statsNode.findAll('.es2-hero-stat-value').map(node => node.text())
      expect(names, selector).toEqual(labels)
      expect(values, selector).toEqual([
        String(stats.hp), String(stats.damage), String(stats.speed), `${stats.delay}s`,
      ])
    }
  })

  it('has no redundant classic stat panel and keeps accessible labels on each hero card', () => {
    const screen = mount(Es2MainMenu, { props: { choice: 'knight', runMode: 'quick', version: '1.0.0' } })
    wrappers.push(screen)
    expect(screen.find('[data-es2-classic-details]').exists()).toBe(false)
    expect(screen.findAll('.es2-hero-stat-strip')).toHaveLength(6)
    expect(screen.get('[data-hero="knight"] .es2-hero-stat-strip [data-hero-stat="attack-delay"]').attributes('title')).toBeTruthy()
  })

  it('uses one compact four-stat layout with narrow-device wrapping instead of overflowing cards', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/menu.css'), 'utf8')
    expect(css).toContain('.es2-hero-stat-strip')
    expect(css).toContain('repeat(4,minmax(0,1fr))')
    expect(css).toContain('repeat(2,minmax(0,1fr))')
    expect(css).toContain('min-width:0')
    expect(css).toContain('.es2-roster__stats')
    expect(css).toContain('object-position:center center')
    expect(css).toContain('radial-gradient(ellipse at 50% 36%,var(--es2-hero-glow)')
    expect(css).toContain('--es2-hero-glow:var(--es2-hero-idle-glow)')
    expect(css).not.toContain('.es2-classic-details')
  })
})
