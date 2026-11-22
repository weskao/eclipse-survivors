import type { ContentPack } from '../contracts'
import { BIOMES } from '../biomes'

/** Stage metadata only; integration must explicitly install the environment adapter. */
export const BIOMES_PACK: ContentPack = {
  id: 'biomes',
  stages: BIOMES.map(biome => ({ id: `biomes:${biome.id}`, title: biome.title })),
}
