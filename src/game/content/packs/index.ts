import type { ContentPack } from '../contracts'
import { WEAPONS_PACK } from './weapons'
import { EVOLUTION2_PACK } from './evolution2'
import { RELICS_PACK } from './relics'
import { ENEMY_FACTIONS_PACK } from './enemies'
import { BOSS_PACK } from './bosses'
import { WAVES_PACK } from './waves'
import { BIOMES_PACK } from './biomes'
import { WORLD_EVENTS_PACK } from './events'
import { COMBAT_VFX_PACK } from './combat-vfx'

/** Source registration is centralized here; runtime adapters remain explicit integration work. */
export const CONTENT_PACKS: readonly ContentPack[] = Object.freeze([
  WEAPONS_PACK,
  EVOLUTION2_PACK,
  RELICS_PACK,
  ENEMY_FACTIONS_PACK,
  BOSS_PACK,
  WAVES_PACK,
  BIOMES_PACK,
  WORLD_EVENTS_PACK,
  COMBAT_VFX_PACK,
])
