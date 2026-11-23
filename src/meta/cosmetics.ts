import type { JobId } from '../game/types'
import type { CosmeticId } from './types'

/** Localizable presentation data; save files keep the stable cosmetic IDs. */
export const COSMETICS: readonly { id: CosmeticId; hero: JobId; name: string }[] = [
  { id: 'knight-default', hero: 'knight', name: '原初鎧甲' },
  { id: 'knight-gilded', hero: 'knight', name: '曙光鎏金' },
  { id: 'ranger-default', hero: 'ranger', name: '森林斗篷' },
  { id: 'ranger-moonlit', hero: 'ranger', name: '月影獵裝' },
  { id: 'wizard-default', hero: 'wizard', name: '初學星袍' },
  { id: 'wizard-astral', hero: 'wizard', name: '星界法衣' },
]
