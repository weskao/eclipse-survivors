import { BALANCE } from '../../config'

/** Independent relic catalogue; only existing ContentPack fields may be registered. */
export type RelicId = `relics:${string}`
export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type RelicStat =
  | 'lifeSteal' | 'lightning' | 'fire' | 'frost' | 'protectLowHp' | 'dodge'
  | 'pierce' | 'summon' | 'execute' | 'critChance' | 'critPower' | 'moving'
  | 'stationary' | 'healOnKill' | 'regeneration' | 'maxHp' | 'maxHpRate'
  | 'speed' | 'haste' | 'reflect' | 'dashDamage' | 'resistance'
  | 'extraProjectile' | 'pickupRange' | 'damage' | 'incoming'
  | 'healingPenalty' | 'healOnPickup' | 'bossDamage' | 'markDamage'

export type RelicBonuses = Partial<Record<RelicStat, number>>
export interface RelicDefinition {
  readonly id: RelicId
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly rarity: RelicRarity
  readonly cursed: boolean
  readonly weight: number
  readonly maxStacks: number
  readonly bonuses: Readonly<RelicBonuses>
}

/** Positive values are bonuses unless the text explicitly states a tradeoff. */
const make = (slug: string, title: string, description: string, icon: string,
  rarity: RelicRarity, maxStacks: number, bonuses: RelicBonuses, cursed = false): RelicDefinition => ({
  id: ('relics:' + slug) as RelicId, title, description, icon, rarity, cursed, maxStacks,
  weight: BALANCE.relics.rarityWeights[rarity] * (cursed ? BALANCE.relics.curseWeightMultiplier : 1),
  bonuses: Object.freeze(bonuses),
})

/** 24 normal and 8 cursed relics. All have game-rule contributions (no metadata filler). */
export const RELICS: readonly RelicDefinition[] = Object.freeze([
  make('vampire-fang', 'Vampire Fang', 'Restore 2% of actual hit damage, per stack; capped per hit.', '🦇', 'rare', BALANCE.relics.items['vampire-fang'].maxStacks, BALANCE.relics.items['vampire-fang'].bonuses),
  make('storm-crown', 'Storm Crown', 'Lightning attacks deal +24% damage per stack.', '⚡', 'epic', BALANCE.relics.items['storm-crown'].maxStacks, BALANCE.relics.items['storm-crown'].bonuses),
  make('guardian-sigil', 'Guardian Sigil', 'Take 25% less damage below 35% HP.', '🛡', 'rare', BALANCE.relics.items['guardian-sigil'].maxStacks, BALANCE.relics.items['guardian-sigil'].bonuses),
  make('phantom-boots', 'Phantom Boots', '+9% chance to dodge incoming hits per stack.', '👢', 'rare', BALANCE.relics.items['phantom-boots'].maxStacks, BALANCE.relics.items['phantom-boots'].bonuses),
  make('celestial-lens', 'Celestial Lens', 'Projectiles pierce one extra target.', '🔮', 'epic', BALANCE.relics.items['celestial-lens'].maxStacks, BALANCE.relics.items['celestial-lens'].bonuses),
  make('wolf-totem', 'Wolf Totem', 'Summons deal +28% damage per stack.', '🐺', 'rare', BALANCE.relics.items['wolf-totem'].maxStacks, BALANCE.relics.items['wolf-totem'].bonuses),
  make('frost-rune', 'Frost Rune', 'Frost damage +22% per stack.', '❄', 'common', BALANCE.relics.items['frost-rune'].maxStacks, BALANCE.relics.items['frost-rune'].bonuses),
  make('ember-ring', 'Ember Ring', 'Fire damage +20% per stack.', '🔥', 'common', BALANCE.relics.items['ember-ring'].maxStacks, BALANCE.relics.items['ember-ring'].bonuses),
  make('thunder-rod', 'Thunder Rod', 'Deal +18% damage to bosses per stack.', '🌩', 'common', BALANCE.relics.items['thunder-rod'].maxStacks, BALANCE.relics.items['thunder-rod'].bonuses),
  make('grave-bell', 'Grave Bell', 'Execute ordinary foes below 6% remaining HP.', '🔔', 'rare', BALANCE.relics.items['grave-bell'].maxStacks, BALANCE.relics.items['grave-bell'].bonuses),
  make('ritual-dagger', 'Ritual Dagger', 'Critical hit chance +7% per stack.', '🗡', 'common', BALANCE.relics.items['ritual-dagger'].maxStacks, BALANCE.relics.items['ritual-dagger'].bonuses),
  make('hunter-lens', 'Hunter Lens', 'Critical damage multiplier +30% per stack.', '🎯', 'rare', BALANCE.relics.items['hunter-lens'].maxStacks, BALANCE.relics.items['hunter-lens'].bonuses),
  make('battle-standard', 'Battle Standard', '+18% damage while moving.', '🚩', 'rare', BALANCE.relics.items['battle-standard'].maxStacks, BALANCE.relics.items['battle-standard'].bonuses),
  make('stillwater-orb', 'Stillwater Orb', '+22% damage while stationary.', '🔵', 'rare', BALANCE.relics.items['stillwater-orb'].maxStacks, BALANCE.relics.items['stillwater-orb'].bonuses),
  make('merciful-seed', 'Merciful Seed', 'Heal 1.2 HP on each confirmed kill.', '🌱', 'common', BALANCE.relics.items['merciful-seed'].maxStacks, BALANCE.relics.items['merciful-seed'].bonuses),
  make('dawn-feather', 'Dawn Feather', 'Regenerate 0.8 HP each second.', '🪶', 'common', BALANCE.relics.items['dawn-feather'].maxStacks, BALANCE.relics.items['dawn-feather'].bonuses),
  make('tempered-plate', 'Tempered Plate', 'Maximum HP +24 and heal by the same amount.', '⚙', 'common', BALANCE.relics.items['tempered-plate'].maxStacks, BALANCE.relics.items['tempered-plate'].bonuses),
  make('pilgrim-compass', 'Pilgrim Compass', 'Movement speed +8% per stack.', '🧭', 'common', BALANCE.relics.items['pilgrim-compass'].maxStacks, BALANCE.relics.items['pilgrim-compass'].bonuses),
  make('quicksilver-hourglass', 'Quicksilver Hourglass', 'Attack intervals 10% shorter per stack.', '⏳', 'rare', BALANCE.relics.items['quicksilver-hourglass'].maxStacks, BALANCE.relics.items['quicksilver-hourglass'].bonuses),
  make('mirror-charm', 'Mirror Charm', 'Reflect 20% of post-mitigation damage.', '🪞', 'rare', BALANCE.relics.items['mirror-charm'].maxStacks, BALANCE.relics.items['mirror-charm'].bonuses),
  make('kinetic-pauldrons', 'Kinetic Pauldrons', 'Deal +35% damage with an attack after dashing.', '💨', 'epic', BALANCE.relics.items['kinetic-pauldrons'].maxStacks, BALANCE.relics.items['kinetic-pauldrons'].bonuses),
  make('bulwark-ring', 'Bulwark Ring', 'Take 7% less damage per stack.', '💍', 'common', BALANCE.relics.items['bulwark-ring'].maxStacks, BALANCE.relics.items['bulwark-ring'].bonuses),
  make('echo-gem', 'Echo Gem', '12% chance to emit an extra projectile per stack.', '💎', 'epic', BALANCE.relics.items['echo-gem'].maxStacks, BALANCE.relics.items['echo-gem'].bonuses),
  make('magnetic-amulet', 'Magnetic Amulet', 'Pickup radius +30% per stack.', '🧲', 'common', BALANCE.relics.items['magnetic-amulet'].maxStacks, BALANCE.relics.items['magnetic-amulet'].bonuses),
  make('ashen-heart', 'Ashen Heart', '+30% base damage, but maximum HP -25%.', '🖤', 'epic', BALANCE.relics.items['ashen-heart'].maxStacks, BALANCE.relics.items['ashen-heart'].bonuses, true),
  make('cursed-chalice', 'Cursed Chalice', '6% lifesteal, but incoming damage +25%.', '🍷', 'legendary', BALANCE.relics.items['cursed-chalice'].maxStacks, BALANCE.relics.items['cursed-chalice'].bonuses, true),
  make('doom-mask', 'Doom Mask', '+22% critical chance, but incoming damage +20%.', '🎭', 'epic', BALANCE.relics.items['doom-mask'].maxStacks, BALANCE.relics.items['doom-mask'].bonuses, true),
  make('blood-coin', 'Blood Coin', 'Execute foes below 15% HP, but healing -50%.', '🪙', 'epic', BALANCE.relics.items['blood-coin'].maxStacks, BALANCE.relics.items['blood-coin'].bonuses, true),
  make('shadow-chain', 'Shadow Chain', '+65% summon damage, but movement speed -15%.', '⛓', 'epic', BALANCE.relics.items['shadow-chain'].maxStacks, BALANCE.relics.items['shadow-chain'].bonuses, true),
  make('fragile-crown', 'Fragile Crown', '+55% elemental damage, but incoming damage +35%.', '👑', 'legendary', BALANCE.relics.items['fragile-crown'].maxStacks, BALANCE.relics.items['fragile-crown'].bonuses, true),
  make('hollow-idol', 'Hollow Idol', 'Attack intervals 30% shorter, but lose 1 HP/sec.', '🗿', 'epic', BALANCE.relics.items['hollow-idol'].maxStacks, BALANCE.relics.items['hollow-idol'].bonuses, true),
  make('black-mirror', 'Black Mirror', 'Reflect 85% incoming damage, but damage resistance -20%.', '🪞', 'legendary', BALANCE.relics.items['black-mirror'].maxStacks, BALANCE.relics.items['black-mirror'].bonuses, true),
])
export const RELIC_BY_ID = new Map<RelicId, RelicDefinition>(RELICS.map(relic => [relic.id, relic]))

/** UI may render as accessible touch buttons and keyboard Digit1/2/3 choices. */
export const TREASURE_UI = Object.freeze({
  hotkeys: ['Digit1', 'Digit2', 'Digit3'] as const,
  selectionLabel: 'Choose relic', rerollLabel: 'Reroll rewards', banishLabel: 'Banish relic',
  touchMinSizePx: 44, columns: 3,
  colors: { common: '#aebcce', rare: '#55b4ff', epic: '#c895ff', legendary: '#ffca69' },
})
export const RELIC_CUES = Object.freeze({
  chestOpen: 'relics:chest-open', rewardTaken: 'relics:reward-taken',
  curseTaken: 'relics:curse-taken', reroll: 'relics:reroll', banish: 'relics:banish',
})
