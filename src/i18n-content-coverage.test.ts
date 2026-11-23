import { afterEach, describe, expect, it } from 'vitest'
import { setLocale, t } from './i18n'
import { BIOMES } from './game/content/biomes'
import { BOSS_DEFINITIONS } from './game/content/bosses/definitions'
import { ENEMY_DEFINITIONS } from './game/content/enemies/definitions'
import { UP, SCENES } from './game/constants'
import { EVOLUTIONS } from './game/evolutions'
import { HERO_DEFINITIONS } from './game/content/heroes'
import { WEAPON_SPECS } from './game/content/weapons/abilities'
import { EVOLUTION2_RECIPES } from './game/content/evolution2/recipes'
import { RELICS } from './game/content/relics/catalog'
import { WORLD_EVENT_DEFINITIONS } from './game/content/world-events/definitions'
import { ACHIEVEMENTS, MILESTONES, RESEARCH, STARTING_EQUIPMENT, STARTING_BONUSES } from './game/content/meta/catalog'

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

  it('translates every original skill, upgrade, scene and evolution into English', () => {
    setLocale('en', memoryStorage)
    const copy = [
      ...UP.flatMap(v => [v.title, v.desc]),
      ...SCENES.flatMap(v => [v.name, v.label]),
      ...EVOLUTIONS.flatMap(v => [v.title, v.desc, v.requirements]),
      ...Object.values(HERO_DEFINITIONS).flatMap(v => [
        v.label, v.description, v.startingEquipment, v.passive, v.special, ...v.strengths, ...v.weaknesses,
      ]),
      ...[...ACHIEVEMENTS, ...MILESTONES, ...RESEARCH, ...STARTING_EQUIPMENT, ...STARTING_BONUSES]
        .flatMap(v => [v.title, v.description]),
    ]
    expect(copy.filter(value => /[\u3400-\u9fff]/.test(t(value)))).toEqual([])
  })

  it('translates every new weapon, evolution, relic and world event into Traditional Chinese', () => {
    setLocale('zh-TW', memoryStorage)
    const text = [
      ...WEAPON_SPECS.flatMap(v => [v.title, v.desc]),
      ...EVOLUTION2_RECIPES.map(v => v.title),
      ...RELICS.flatMap(v => [v.title, v.description]),
      ...WORLD_EVENT_DEFINITIONS.flatMap(v => [
        v.title, ...v.choices.flatMap(choice => [choice.title, choice.risk, choice.reward]),
      ]),
    ]
    expect(text.filter(value => !/[\u3400-\u9fff]/.test(t(value)))).toEqual([])
  })
})
