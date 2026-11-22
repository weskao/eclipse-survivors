import type { WorldEventChoice, WorldEventDefinition, WorldEventEffect } from './types'

const xp = (amount: number): WorldEventEffect => ({ type: 'xp', amount })
const xpCost = (amount: number): WorldEventEffect => ({ type: 'xp-cost', amount })
const heal = (amount: number): WorldEventEffect => ({ type: 'heal', amount })
const hpCost = (amount: number): WorldEventEffect => ({ type: 'health-cost', amount })
const buff = (id: string, seconds: number): WorldEventEffect => ({ type: 'buff', id, seconds })
const loot = (id: string, tier: 'common' | 'rare' | 'epic' | 'legendary'): WorldEventEffect =>
  ({ type: 'symbolic-loot', id, tier })
const encounter = (id: string, count: number): WorldEventEffect => ({ type: 'encounter', id, count })
const choice = (id: string, title: string, risk: string, reward: string,
  effects: WorldEventEffect[], extras: Partial<WorldEventChoice> = {}): WorldEventChoice =>
  ({ id, title, risk, reward, effects, ...extras })
const leave = choice('leave', 'Leave safely', 'No immediate danger', 'Keep current resources', [])

export const WORLD_EVENT_DEFINITIONS: readonly WorldEventDefinition[] = [
  {
    id: 'events:wandering-merchant', title: 'Wandering Merchant', visualCueId: 'events:merchant-lantern', audioCue: 'select',
    choices: [
      choice('trade', 'Trade experience', 'Spend 15 experience', 'Receive a supply token', [xpCost(15), loot('loot:merchant-supply', 'rare')], { minXp: 15 }),
      choice('restock', 'Buy a field ration', 'Spend 6 experience', 'Restore 24 HP', [xpCost(6), heal(24)], { minXp: 6 }),
      leave,
    ],
  },
  {
    id: 'events:cursed-altar', title: 'Cursed Altar', visualCueId: 'events:altar-glow', audioCue: 'hurt',
    choices: [
      choice('invoke', 'Invoke the curse', 'Sacrifice 18 HP', 'Gain cursed might for 15 seconds', [hpCost(18), buff('events:cursed-might', 15)], { minHp: 19 }),
      choice('purify', 'Purify the sigil', 'Spend 12 experience', 'Gain a ward for 8 seconds', [xpCost(12), buff('events:ward', 8)], { minXp: 12 }),
      leave,
    ],
  },
  {
    id: 'events:divine-shrine', title: 'Divine Shrine', visualCueId: 'events:shrine-halo', audioCue: 'pickup',
    choices: [
      choice('heal', 'Pray for healing', 'One use only', 'Restore 36 HP', [heal(36)]),
      choice('ward', 'Pray for protection', 'No healing', 'Gain a 12-second ward', [buff('events:ward', 12)]),
      leave,
    ],
  },
  {
    id: 'events:treasure-vault', title: 'Treasure Vault', visualCueId: 'events:vault-spark', audioCue: 'upgrade',
    choices: [
      choice('unlock', 'Unlock with runes', 'Spend 8 experience', 'Receive a vault cache token',
        [xpCost(8), loot('loot:vault-cache', 'epic')], { minXp: 8 }),
      choice('force', 'Force the vault', 'Summon 3 guardians and defeat them in 18 seconds', 'Receive a rare cache on success',
        [encounter('events:vault-guards', 3)],
        { objective: { kind: 'kill', seconds: 18, count: 3, rewards: [loot('loot:vault-guard-cache', 'rare')] } }),
      leave,
    ],
  },
  {
    id: 'events:monster-ambush', title: 'Monster Ambush', visualCueId: 'events:ambush-warning', audioCue: 'boss',
    choices: [
      choice('fight', 'Stand and fight', 'Defeat 3 summoned attackers within 18 seconds', 'Gain 30 experience',
        [encounter('events:ambush', 3)],
        { objective: { kind: 'kill', seconds: 18, count: 3, rewards: [xp(30)] } }),
      choice('escape', 'Break through', 'Lose 8 HP', 'Gain a 7-second haste buff', [hpCost(8), buff('events:haste', 7)], { minHp: 9 }),
      leave,
    ],
  },
  {
    id: 'events:elite-hunt', title: 'Elite Hunt', visualCueId: 'events:hunt-banner', audioCue: 'boss',
    choices: [
      choice('hunt', 'Hunt the marked elite', 'Defeat one elite within 22 seconds', 'Gain 40 experience and an elite cache',
        [encounter('events:elite-target', 1)],
        { objective: { kind: 'kill', seconds: 22, count: 1, eliteOnly: true, rewards: [xp(40), loot('loot:elite-cache', 'rare')] } }),
      choice('decline', 'Prepare instead', 'Forfeit elite reward', 'Heal 8 HP', [heal(8)]),
      leave,
    ],
  },
  {
    id: 'events:forgotten-tomb', title: 'Forgotten Tomb', visualCueId: 'events:tomb-runes', audioCue: 'scene',
    choices: [
      choice('explore', 'Enter the crypt', 'Lose 12 HP to traps', 'Receive an ancient tomb token',
        [hpCost(12), loot('loot:tomb-relic-token', 'rare')], { minHp: 13 }),
      choice('study', 'Read the epitaphs', 'No hidden treasure', 'Gain 14 experience', [xp(14)]),
      leave,
    ],
  },
  {
    id: 'events:healing-fountain', title: 'Healing Fountain', visualCueId: 'events:fountain-light', audioCue: 'pickup',
    choices: [
      choice('drink', 'Drink restorative water', 'One use only', 'Recover 45 HP', [heal(45)]),
      choice('cleanse', 'Wash away corruption', 'No immediate healing', 'Gain an 18-second cleansing buff',
        [buff('events:cleanse', 18)]),
      leave,
    ],
  },
  {
    id: 'events:ancient-forge', title: 'Ancient Forge', visualCueId: 'events:forge-embers', audioCue: 'upgrade',
    choices: [
      choice('temper', 'Temper equipment', 'Spend 18 experience', 'Receive a forge upgrade token',
        [xpCost(18), loot('loot:forge-upgrade', 'epic')], { minXp: 18 }),
      choice('overheat', 'Overheat the steel', 'Sacrifice 16 HP', 'Gain 14 seconds of reforged might',
        [hpCost(16), buff('events:forged-might', 14)], { minHp: 17 }),
      leave,
    ],
  },
  {
    id: 'events:blood-pact', title: 'Blood Pact', visualCueId: 'events:blood-seal', audioCue: 'hurt',
    choices: [
      choice('sacrifice', 'Seal the pact', 'Sacrifice 24 HP', 'Gain 20 seconds of pact power',
        [hpCost(24), buff('events:pact-power', 20)], { minHp: 25 }),
      choice('sever', 'Break the pact', 'Forfeit forbidden power', 'Recover 10 HP', [heal(10)]),
      leave,
    ],
  },
  {
    id: 'events:celestial-blessing', title: 'Celestial Blessing', visualCueId: 'events:celestial-rays', audioCue: 'scene',
    choices: [
      choice('vigor', 'Blessing of motion', 'Forfeit protection', 'Gain 16 seconds of haste', [buff('events:haste', 16)]),
      choice('protection', 'Blessing of safety', 'Forfeit speed', 'Gain 16 seconds of warding', [buff('events:ward', 16)]),
      leave,
    ],
  },
  {
    id: 'events:survival-challenge', title: 'Survival Challenge', visualCueId: 'events:trial-circle', audioCue: 'boss',
    choices: [
      choice('endure', 'Stand in the trial circle', 'Remain within 150 units for 9 seconds', 'Gain 36 experience on success',
        [], { objective: { kind: 'stay', seconds: 9, radius: 150, rewards: [xp(36)] } }),
      choice('retreat', 'Withdraw and recover', 'Forfeit the trial reward', 'Recover 6 HP', [heal(6)]),
      leave,
    ],
  },
]

/** Reject invalid / duplicative symbolic grants before any transaction reaches an adapter. */
export function validEffects(effects: readonly WorldEventEffect[]): boolean {
  const seen = new Set<string>()
  for (const effect of effects) {
    if (effect.type === 'xp' || effect.type === 'xp-cost' ||
        effect.type === 'heal' || effect.type === 'health-cost') {
      if (!Number.isFinite(effect.amount) || effect.amount <= 0) return false
    } else if (effect.type === 'buff') {
      if (!effect.id || !Number.isFinite(effect.seconds) || effect.seconds <= 0 || effect.seconds > 60) return false
    } else if (effect.type === 'encounter') {
      if (!effect.id || !Number.isInteger(effect.count) || effect.count < 1 || effect.count > 6) return false
    } else if (!effect.id || !['common', 'rare', 'epic', 'legendary'].includes(effect.tier)) return false
    if (effect.type === 'symbolic-loot') {
      if (seen.has(effect.id)) return false
      seen.add(effect.id)
    }
  }
  return true
}
