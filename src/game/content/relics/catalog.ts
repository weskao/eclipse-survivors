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
  weight: ({ common: 12, rare: 5, epic: 2, legendary: 0.75 }[rarity]) * (cursed ? 0.65 : 1),
  bonuses: Object.freeze(bonuses),
})

/** 24 normal and 8 cursed relics. All have game-rule contributions (no metadata filler). */
export const RELICS: readonly RelicDefinition[] = Object.freeze([
  make('vampire-fang', 'Vampire Fang', 'Restore 2% of actual hit damage, per stack; capped per hit.', '🦇', 'rare', 2, { lifeSteal: 0.02 }),
  make('storm-crown', 'Storm Crown', 'Lightning attacks deal +24% damage per stack.', '⚡', 'epic', 2, { lightning: 0.24 }),
  make('guardian-sigil', 'Guardian Sigil', 'Take 25% less damage below 35% HP.', '🛡', 'rare', 1, { protectLowHp: 0.25 }),
  make('phantom-boots', 'Phantom Boots', '+9% chance to dodge incoming hits per stack.', '👢', 'rare', 2, { dodge: 0.09 }),
  make('celestial-lens', 'Celestial Lens', 'Projectiles pierce one extra target.', '🔮', 'epic', 1, { pierce: 1 }),
  make('wolf-totem', 'Wolf Totem', 'Summons deal +28% damage per stack.', '🐺', 'rare', 2, { summon: 0.28 }),
  make('frost-rune', 'Frost Rune', 'Frost damage +22% per stack.', '❄', 'common', 3, { frost: 0.22 }),
  make('ember-ring', 'Ember Ring', 'Fire damage +20% per stack.', '🔥', 'common', 3, { fire: 0.2 }),
  make('thunder-rod', 'Thunder Rod', 'Lightning damage +14% per stack.', '🌩', 'common', 2, { lightning: 0.14 }),
  make('grave-bell', 'Grave Bell', 'Execute ordinary foes below 6% remaining HP.', '🔔', 'rare', 2, { execute: 0.06 }),
  make('ritual-dagger', 'Ritual Dagger', 'Critical hit chance +7% per stack.', '🗡', 'common', 3, { critChance: 0.07 }),
  make('hunter-lens', 'Hunter Lens', 'Critical damage multiplier +30% per stack.', '🎯', 'rare', 2, { critPower: 0.3 }),
  make('battle-standard', 'Battle Standard', '+18% damage while moving.', '🚩', 'rare', 1, { moving: 0.18 }),
  make('stillwater-orb', 'Stillwater Orb', '+22% damage while stationary.', '🔵', 'rare', 1, { stationary: 0.22 }),
  make('merciful-seed', 'Merciful Seed', 'Heal 1.2 HP on each confirmed kill.', '🌱', 'common', 3, { healOnKill: 1.2 }),
  make('dawn-feather', 'Dawn Feather', 'Regenerate 0.8 HP each second.', '🪶', 'common', 2, { regeneration: 0.8 }),
  make('tempered-plate', 'Tempered Plate', 'Maximum HP +24 and heal by the same amount.', '⚙', 'common', 2, { maxHp: 24 }),
  make('pilgrim-compass', 'Pilgrim Compass', 'Movement speed +8% per stack.', '🧭', 'common', 2, { speed: 0.08 }),
  make('quicksilver-hourglass', 'Quicksilver Hourglass', 'Attack intervals 10% shorter per stack.', '⏳', 'rare', 2, { haste: 0.1 }),
  make('mirror-charm', 'Mirror Charm', 'Reflect 20% of post-mitigation damage.', '🪞', 'rare', 2, { reflect: 0.2 }),
  make('kinetic-pauldrons', 'Kinetic Pauldrons', 'Deal +35% damage with an attack after dashing.', '💨', 'epic', 1, { dashDamage: 0.35 }),
  make('bulwark-ring', 'Bulwark Ring', 'Take 7% less damage per stack.', '💍', 'common', 3, { resistance: 0.07 }),
  make('echo-gem', 'Echo Gem', '12% chance to emit an extra projectile per stack.', '💎', 'epic', 2, { extraProjectile: 0.12 }),
  make('magnetic-amulet', 'Magnetic Amulet', 'Pickup radius +30% per stack.', '🧲', 'common', 2, { pickupRange: 0.3 }),
  make('ashen-heart', 'Ashen Heart', '+30% base damage, but maximum HP -25%.', '🖤', 'epic', 1, { damage: 0.3, maxHpRate: -0.25 }, true),
  make('cursed-chalice', 'Cursed Chalice', '6% lifesteal, but incoming damage +25%.', '🍷', 'legendary', 1, { lifeSteal: 0.06, incoming: 0.25 }, true),
  make('doom-mask', 'Doom Mask', '+22% critical chance, but incoming damage +20%.', '🎭', 'epic', 1, { critChance: 0.22, incoming: 0.2 }, true),
  make('blood-coin', 'Blood Coin', 'Execute foes below 15% HP, but healing -50%.', '🪙', 'epic', 1, { execute: 0.15, healingPenalty: 0.5 }, true),
  make('shadow-chain', 'Shadow Chain', '+65% summon damage, but movement speed -15%.', '⛓', 'epic', 1, { summon: 0.65, speed: -0.15 }, true),
  make('fragile-crown', 'Fragile Crown', '+55% elemental damage, but incoming damage +35%.', '👑', 'legendary', 1, { fire: 0.55, frost: 0.55, lightning: 0.55, incoming: 0.35 }, true),
  make('hollow-idol', 'Hollow Idol', 'Attack intervals 30% shorter, but lose 1 HP/sec.', '🗿', 'epic', 1, { haste: 0.3, regeneration: -1 }, true),
  make('black-mirror', 'Black Mirror', 'Reflect 85% incoming damage, but damage resistance -20%.', '🪞', 'legendary', 1, { reflect: 0.85, resistance: -0.2 }, true),
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
