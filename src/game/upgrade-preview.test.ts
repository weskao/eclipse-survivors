import { describe, expect, it } from 'vitest'
import { UP } from './constants'
import { EVOLUTIONS } from './evolutions'
import { WEAPON_SPECS } from './content/weapons/abilities'
import { EVOLUTION2_RECIPES } from './content/evolution2/recipes'
import { upgradeStatPreview } from './upgrade-preview'
import { BALANCE } from './config'

describe('level-up stat comparisons', () => {
  it('covers every built-in skill and arsenal weapon at each available rank', () => {
    for (const ability of [...UP, ...WEAPON_SPECS.map(w => ({ id: 'weapons:' + w.key, maxLevel: BALANCE.weapons.maxLevel }))]) {
      for (let rank = 0; rank < ability.maxLevel; rank++) {
        const rows = upgradeStatPreview(ability.id, rank, ability.maxLevel)
        expect(rows?.length, ability.id + ':' + rank).toBeGreaterThan(0)
        expect(rows?.every(row => row.before !== row.after)).toBe(true)
      }
      expect(upgradeStatPreview(ability.id, ability.maxLevel, ability.maxLevel)).toBeUndefined()
    }
  })
  it('shows cumulative bonuses and shorter intervals without changing game balance', () => {
    expect(upgradeStatPreview('damage', 1, 5)?.[0]).toEqual({ label: '技能攻擊倍率', before: '128%', after: '163.84%' })
    expect(upgradeStatPreview('bolt', 1, 5)).toContainEqual({ label: '技能冷卻時間', before: '1.82s', after: '1.64s' })
    expect(upgradeStatPreview('bolt', 0, 5)).toContainEqual({ label: '技能冷卻時間', before: '—', after: '1.82s' })
  })
  it('keeps hero mastery and covers all evolution unlocks', () => {
    expect(upgradeStatPreview('heroes:shadow-precision', 0, 3)?.[0]?.after).toBe('188%')
    for (const evo of [...EVOLUTIONS, ...EVOLUTION2_RECIPES]) {
      expect(upgradeStatPreview(evo.id, 0, 1)?.[0]?.before).toBe('—')
      expect(upgradeStatPreview(evo.id, 0, 1)?.[0]?.after).toMatch(/s$/)
    }
  })
})
