import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Es2ChoiceCards from './Es2ChoiceCards.vue'

describe('all skills share responsive dark-fantasy card polish', () => {
  it('styles all rarity classes with layered art, readable hierarchy and motion accessibility', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/skill-polish.css'), 'utf8')
    expect(css).toContain('.es2-skill-card.es2-rarity-common')
    expect(css).toContain('.es2-skill-card.es2-rarity-rare')
    expect(css).toContain('.es2-skill-card.es2-rarity-epic')
    expect(css).toContain('.es2-skill-card.es2-rarity-legendary')
    expect(css).toContain('object-fit:contain')
    expect(css).toContain('prefers-reduced-motion:reduce')
    expect(css).toContain('max-height:570px')
    expect(css).not.toContain('object-fit:cover')
  })
  it('uses the short landscape card height for art without shrinking or cropping text', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/skill-polish.css'), 'utf8')
    expect(css).toMatch(/@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)/)
    expect(css).toMatch(/\.es2-skill-card\s*\{[^}]*min-height:clamp\(200px,calc\(100dvh - 105px\),360px\)/)
    expect(css).toMatch(/\.es2-skill-card\s+\.es2-card-art\s*\{[^}]*flex:1 0 clamp\(96px,30dvh,144px\)[^}]*border:0/)
    expect(css).toMatch(/\.es2-skill-card\s+\.es2-card-art img\s*\{[^}]*object-fit:contain/)
    expect(css).toMatch(/\.es2-skill-card\s+\.es2-card-description[^{}]*\{[^}]*font-size:max\(11px,/)
  })
  it('applies the shared skill-art treatment to every supplied skill, not just selected rarities', () => {
    const cards = mount(Es2ChoiceCards, { props: { kind: 'level', items: [
      { id: 'damage', title: 'Damage', imageSrc: '/damage.webp', rarity: 'common', level: 1, maxLevel: 5 },
      { id: 'frost', title: 'Frost', imageSrc: '/frost.webp', rarity: 'rare', level: 2, maxLevel: 5 },
      { id: 'meteor', title: 'Meteor', imageSrc: '/meteor.webp', rarity: 'legendary', level: 3, maxLevel: 5 },
    ] } })
    expect(cards.findAll('.es2-skill-card')).toHaveLength(3)
    expect(cards.findAll('.es2-skill-card .es2-card-art img')).toHaveLength(3)
    expect(cards.findAll('.es2-skill-card .es2-card-level')).toHaveLength(3)
  })
})
