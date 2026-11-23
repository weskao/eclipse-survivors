import { afterEach, describe, expect, it } from 'vitest'
import { setLocale, t } from './i18n'
import { BIOMES } from './game/content/biomes'
import { BOSS_DEFINITIONS } from './game/content/bosses/definitions'
import { ENEMY_DEFINITIONS } from './game/content/enemies/definitions'

const memoryStorage = { getItem: () => null, setItem: () => {} }
afterEach(() => setLocale('zh-TW', memoryStorage))
const catalog = [
  ...BIOMES.flatMap(biome => [biome.title, biome.description]),
  ...Object.values(BOSS_DEFINITIONS).flatMap(boss => [boss.title, ...boss.phaseNames]),
  ...Object.values(ENEMY_DEFINITIONS).map(enemy => enemy.title),
]

describe('localized game content without changing stable gameplay identifiers', () => {
  it('has actual traditional-Chinese descriptions for every ES2 area, boss phase and faction', () => {
    setLocale('zh-TW', memoryStorage)
    const untranslated = catalog.filter(value => !/[\u3400-\u9fff]/.test(t(value)))
    expect(untranslated).toEqual([])
  })
  it('preserves canonical English values in English UI', () => {
    setLocale('en', memoryStorage)
    expect(catalog.map(value => t(value))).toEqual(catalog)
  })
})
