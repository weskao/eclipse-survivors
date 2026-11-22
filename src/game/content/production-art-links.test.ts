import { describe, expect, it } from 'vitest'
import { WEAPON_ABILITIES } from './weapons/abilities'
import { EVOLUTION2_PACK } from './packs/evolution2'
import { createContentRegistry } from './registry'
import { WEAPONS_PACK } from './packs/weapons'
import { createState, resetRun } from '../state'
import { equippedSkillHud } from '../store'

describe('ES2 real production illustrations reach the live upgrade UI', () => {
  it('binds each of the twelve weapons to its exact bundled canonical WebP', () => {
    expect(WEAPON_ABILITIES).toHaveLength(12)
    for (const weapon of WEAPON_ABILITIES) {
      const slug = weapon.id.split(':')[1]
      expect(weapon.iconSrc, weapon.id).toContain('/production/weapons/' + slug + '@3x.webp')
    }
    expect(new Set(WEAPON_ABILITIES.map(a => a.iconSrc)).size).toBe(12)
  })

  it('binds all twelve evolutions to independent bundled WebPs with preserved prerequisites', () => {
    const abilities = EVOLUTION2_PACK.abilities ?? []
    expect(abilities).toHaveLength(12)
    for (const evolution of abilities) {
      const slug = evolution.id.split(':')[1]
      expect(evolution.iconSrc, evolution.id).toContain('/production/evolutions/' + slug + '@3x.webp')
      expect(evolution.requires).toHaveLength(2)
      expect(evolution.kind).toBe('evolution')
    }
    expect(new Set(abilities.map(a => a.iconSrc)).size).toBe(12)
  })

  it('projects registered canonical art to real equipped HUD slots', () => {
    const registry = createContentRegistry([WEAPONS_PACK, EVOLUTION2_PACK])
    const state = createState()
    resetRun(state)
    state.content.levels['weapons:shadow-daggers'] = 1
    const found = equippedSkillHud(state.hero!, registry, state).find(x => x.id === 'weapons:shadow-daggers')
    expect(found?.iconSrc).toBe(registry.getAbility('weapons:shadow-daggers')?.iconSrc)
    expect(found?.iconSrc).toContain('shadow-daggers@3x.webp')
  })
})
