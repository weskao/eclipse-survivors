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
