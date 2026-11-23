import { BALANCE } from '../../config'

/** Static progression definitions: no updates occur inside the simulation tick. */
export interface Presentation { icon: string; title: string; description: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }
export interface AchievementDef extends Presentation { id: string; embers: number; cosmetic?: string }
export interface MilestoneDef extends Presentation { id: string; embers: number }
export interface ResearchDef extends Presentation { id: string; maxRank: number; firstCost: number; costStep: number; requires?: readonly { id: string; rank: number }[]; benefitPerRank: number; benefit: 'damagePct' | 'hpFlat' | 'xpPct' | 'lootPct' | 'goldPct' }
export interface UnlockDef extends Presentation { id: string; cost: number; hero?: string; masteryLevel?: number; research?: string; effect: string }

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-blood', icon: '⚔', title: '初臨戰場', description: '首次擊敗敵人', rarity: 'common', embers: BALANCE.meta.achievementEmbers['first-blood'] },
  { id: 'first-victory', icon: '♛', title: '破曉之光', description: '獲得一場勝利', rarity: 'rare', embers: BALANCE.meta.achievementEmbers['first-victory'], cosmetic: 'knight-gilded' },
  { id: 'monster-hunter', icon: '✦', title: '百魔斬', description: '單局擊敗一百名敵人', rarity: 'rare', embers: BALANCE.meta.achievementEmbers['monster-hunter'], cosmetic: 'ranger-moonlit' },
  { id: 'boss-slayer', icon: '☄', title: '魔王終結者', description: '擊敗首領', rarity: 'epic', embers: BALANCE.meta.achievementEmbers['boss-slayer'], cosmetic: 'wizard-astral' },
  { id: 'survivor', icon: '◈', title: '屹立不搖', description: '單局存活五分鐘', rarity: 'common', embers: BALANCE.meta.achievementEmbers['survivor'] },
  { id: 'three-heroes', icon: '❖', title: '三英傳說', description: '使用三名英雄', rarity: 'rare', embers: BALANCE.meta.achievementEmbers['three-heroes'] },
  { id: 'veteran-explorer', icon: '⌖', title: '遠征老手', description: '完成十場遠征', rarity: 'rare', embers: BALANCE.meta.achievementEmbers['veteran-explorer'] },
  { id: 'victorious-five', icon: '✧', title: '破曉常勝', description: '獲得五場勝利', rarity: 'epic', embers: BALANCE.meta.achievementEmbers['victorious-five'] },
  { id: 'abyss-conqueror', icon: '♜', title: '深淵征服者', description: '擊敗三次首領', rarity: 'epic', embers: BALANCE.meta.achievementEmbers['abyss-conqueror'] },
  { id: 'endless-walker', icon: '∞', title: '無盡旅人', description: '無盡模式生存六百秒', rarity: 'rare', embers: BALANCE.meta.achievementEmbers['endless-walker'] },
  { id: 'relic-collector', icon: '◈', title: '遺物收藏家', description: '收集五種不同遺物', rarity: 'epic', embers: BALANCE.meta.achievementEmbers['relic-collector'] },
  { id: 'evolution-scholar', icon: '✺', title: '進化學者', description: '發現三種進化', rarity: 'epic', embers: BALANCE.meta.achievementEmbers['evolution-scholar'] },
  { id: 'cosmetic-curator', icon: '✿', title: '外觀藏家', description: '收集五種外觀', rarity: 'rare', embers: BALANCE.meta.achievementEmbers['cosmetic-curator'] },
  { id: 'challenge-champion', icon: '⚑', title: '試煉冠軍', description: '挑戰模式取勝', rarity: 'legendary', embers: BALANCE.meta.achievementEmbers['challenge-champion'] },
]

export const MILESTONES: readonly MilestoneDef[] = [
  { id: 'first-boss', icon: '♛', title: '首領初征', description: '首次擊敗首領', rarity: 'rare', embers: BALANCE.meta.milestoneEmbers['first-boss'] },
  { id: 'three-wins', icon: '✧', title: '三次破曉', description: '累積三勝', rarity: 'rare', embers: BALANCE.meta.milestoneEmbers['three-wins'] },
  { id: 'ten-runs', icon: '⌖', title: '十場遠征', description: '累積十場遊戲', rarity: 'rare', embers: BALANCE.meta.milestoneEmbers['ten-runs'] },
  { id: 'five-relics', icon: '◈', title: '珍藏遺物', description: '發現五種遺物', rarity: 'epic', embers: BALANCE.meta.milestoneEmbers['five-relics'] },
  { id: 'three-evolutions', icon: '✺', title: '進化探索', description: '發現三種進化', rarity: 'epic', embers: BALANCE.meta.milestoneEmbers['three-evolutions'] },
]

/** Small starter-only bonuses; existing legacy power/vitality caps are preserved. */
export const RESEARCH: readonly ResearchDef[] = [
  { id: 'power', icon: '⚔', title: '攻擊研究', description: '每級 +4% 起始攻擊', rarity: 'common', ...BALANCE.meta.research['power'], , benefit: 'damagePct' },
  { id: 'vitality', icon: '♥', title: '生存研究', description: '每級 +12 起始生命', rarity: 'common', ...BALANCE.meta.research['vitality'], , benefit: 'hpFlat' },
  { id: 'insight', icon: '✧', title: '洞察研究', description: '每級 +1% 起始經驗加成', rarity: 'rare', ...BALANCE.meta.research['insight'], requires: [{ id: 'power', rank: 1 }], , benefit: 'xpPct' },
  { id: 'scavenging', icon: '◈', title: '拾荒研究', description: '每級 +1% 拾取收益', rarity: 'rare', ...BALANCE.meta.research['scavenging'], requires: [{ id: 'vitality', rank: 1 }], , benefit: 'lootPct' },
  { id: 'ember-study', icon: '✦', title: '餘燼研究', description: '每級 +1% 未來結算餘燼', rarity: 'epic', ...BALANCE.meta.research['ember-study'], requires: [{ id: 'insight', rank: 1 }, { id: 'scavenging', rank: 1 }], , benefit: 'goldPct' },
]

export const STARTING_EQUIPMENT: readonly UnlockDef[] = [
  { id: 'knight-aegis', hero: 'knight', icon: '⛨', title: '守護者護符', description: '騎士專屬起始裝備', rarity: 'rare', ...BALANCE.meta.startingEquipment['knight-aegis'], effect: 'start-shield' },
  { id: 'ranger-quiver', hero: 'ranger', icon: '➶', title: '遊俠箭袋', description: '遊俠專屬起始裝備', rarity: 'rare', ...BALANCE.meta.startingEquipment['ranger-quiver'], effect: 'start-quiver' },
  { id: 'wizard-focus', hero: 'wizard', icon: '✦', title: '法師聚焦器', description: '法師專屬起始裝備', rarity: 'rare', ...BALANCE.meta.startingEquipment['wizard-focus'], effect: 'start-focus' },
]

export const STARTING_BONUSES: readonly UnlockDef[] = [
  { id: 'ember-spark', icon: '✧', title: '微光祝福', description: '出發時 +1% 經驗', rarity: 'rare', cost: BALANCE.meta.startingBonuses['ember-spark'].cost, research: 'insight', effect: 'start-xp-1pct' },
  { id: 'wanderer-kit', icon: '◈', title: '漫遊行囊', description: '出發時 +1% 拾取', rarity: 'rare', cost: BALANCE.meta.startingBonuses['wanderer-kit'].cost, research: 'scavenging', effect: 'start-loot-1pct' },
  { id: 'guardian-vow', icon: '♥', title: '守護誓約', description: '出發時 +1% 生命', rarity: 'epic', cost: BALANCE.meta.startingBonuses['guardian-vow'].cost, research: 'vitality', effect: 'start-hp-1pct' },
]

export const LEGACY_EVOLUTIONS: readonly string[] = [
  'frozen-thunderstorm', 'infernal-singularity', 'apocalypse-rain', 'blade-tempest', 'guardian-sanctuary',
]
export const LEGACY_WEAPONS: readonly string[] = [
  'bolt', 'frost', 'meteor', 'blaze', 'vortex', 'shield', 'chain', 'orb', 'multi',
]

export const LEGACY_COSMETICS: readonly string[] = [
  'knight-default', 'ranger-default', 'wizard-default',
  'knight-gilded', 'ranger-moonlit', 'wizard-astral',
]
export const isCosmeticId = (id: unknown): id is string =>
  typeof id === 'string' && (LEGACY_COSMETICS.includes(id)
    || /^[a-z][a-z0-9-]{0,31}:[a-z][a-z0-9-]{0,63}$/.test(id))

export const isDiscoverableId = (id: unknown): id is string =>
  typeof id === 'string' &&
  (LEGACY_EVOLUTIONS.includes(id) || LEGACY_WEAPONS.includes(id)
    || /^[a-z][a-z0-9-]{0,31}:[a-z][a-z0-9-]{0,63}$/.test(id))
