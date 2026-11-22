import type { ContentPack } from '../contracts'
import { ENEMY_DEFINITIONS } from '../enemies/definitions'

/**
 * Registration is intentionally metadata-only.
 * The integration branch must explicitly install the faction runtime and renderer.
 */
export const ENEMY_FACTIONS_PACK: ContentPack = {
  id: 'factions',
  enemies: Object.entries(ENEMY_DEFINITIONS).map(([slug, definition]) => ({
    id: `factions:${slug}` as `factions:${string}`,
    title: definition.title,
  })),
}
