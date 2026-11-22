import { expect, it } from 'vitest'
import { CONTENT_PACKS } from './index'
import { createContentRegistry } from '../registry'
import { createHero, createState } from '../../state'
import { seeded } from '../../math'
import type { GameHooks, Mob } from '../../types'

const hooks: GameHooks = {
  sfx() {}, message() {}, offerUpgrades() {}, end() {},
}

it('makes all twelve new weapons selectable and effective in the default content registry', () => {
  const registry = createContentRegistry(CONTENT_PACKS, seeded(31))
  const state = createState()
  state.hero = createHero('ranger')
  state.mode = 'play'
  const weaponIds = registry.eligible(state).filter(a => a.id.startsWith('weapons:')).map(a => a.id)
  expect(weaponIds).toHaveLength(12)
  expect(registry.acquire(state, 'weapons:shadow-daggers', hooks)).toBe(true)

  const enemy: Mob = {
    x: 100, y: 0, type: 'slime', hp: 400, max: 400, r: 16, speed: 0, dmg: 0,
    phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
  }
  state.mobs.push(enemy)
  for (let i = 0; i < 120; i++) {
    state.worldClock += 1 / 60
    registry.tick(state, 1 / 60, hooks)
  }
  expect(state.damageDealt).toBeGreaterThan(0)
  expect(enemy.hp).toBeLessThan(400)
})
