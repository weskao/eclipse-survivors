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

const DEFAULT_AURA = ['#efd69d30', '#f4de9d9f'] as const
const AURAS: Partial<Record<CosmeticId, readonly [string, string]>> = {
  'knight-gilded': ['#edb43d88', '#ffe29dff'],
  'ranger-moonlit': ['#629bf58c', '#b6e3ffff'],
  'wizard-astral': ['#a56dfc8c', '#e0b8ffff'],
}
/** Same cosmetic colors in menu previews and world rendering. No gameplay state changes. */
export function cosmeticAura(id?: CosmeticId): readonly [string, string] {
  return id ? AURAS[id] ?? DEFAULT_AURA : DEFAULT_AURA
}
export function cosmeticStyle(id?: CosmeticId) {
  const [glow, ring] = cosmeticAura(id)
  return { '--es2-skin-glow': glow, '--es2-skin-ring': ring }
}
