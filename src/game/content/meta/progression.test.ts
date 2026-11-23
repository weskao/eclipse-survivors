import { BALANCE } from '../../config'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../../config'
import { emptyProfile } from '../../../meta/profile'
import type { RunStats } from '../../../meta/types'
import {
  ACHIEVEMENTS, RESEARCH, applyCompletedRun, buyResearch, createMetaState,
  getAchievementStates, getBonusStates, getDiscoveryEntries, getEquipmentStates, getResearchStates, getRewardMetadata, getStartingLoadout,
  parseMetaSnapshot, proposeV2Migration, readMetaSnapshot, resetMetaState,
  unlockStartingBonus, unlockStartingEquipment, validateMetaState,
} from './index'

const run = (id = 'new-run-1', overrides: Partial<RunStats> = {}): RunStats => ({
  id, mode: 'quick', hero: 'knight', victory: true, seconds: 180,
  kills: 115, level: 10, damageDealt: 900, damageTaken: 120, remainingHp: 40,
  bossDefeated: true, enemies: { slime: 110, boss: 1 },
  abilities: ['bolt', 'frozen-thunderstorm'], ...overrides,
})

describe('isolated permanent meta progression', () => {
  it('starts locked and does not mutate the input or the run', () => {
    const initial = createMetaState()
    const original = structuredClone(initial)
    const result = applyCompletedRun(initial, { stats: run(), relicIds: ['relics:moonstone'], bossIds: ['bosses:monarch'] })
    expect(result.accepted).toBe(true)
    expect(initial).toEqual(original)
    expect(initial.embers).toBe(0)
    expect(result.state.runs).toBe(1)
    expect(result.state.wins).toBe(1)
    expect(result.state.bossWins).toBe(1)
    expect(result.state.discoveries.relics).toContain('relics:moonstone')
    expect(result.state.discoveries.evolutions).toContain('frozen-thunderstorm')
    expect(result.state.discoveries.bosses).toContain('bosses:monarch')
    expect(result.state.modeRecords.quick?.runs).toBe(1)
  })

  it('settles a run once, including its bonuses and discoveries', () => {
    const first = applyCompletedRun(createMetaState(), { stats: run() })
    const repeated = applyCompletedRun(first.state, { stats: run() })
    expect(repeated.accepted).toBe(false)
    expect(repeated.reason).toBe('duplicate')
    expect(repeated.state).toBe(first.state)
    expect(repeated.rewards).toEqual([])
    expect(first.state.achievements.filter(id => id === 'first-victory')).toHaveLength(1)
  })

  it('has unique reward catalogs, locked and unlocked achievements with metadata', () => {
    expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length)
    expect(new Set(RESEARCH.map(r => r.id)).size).toBe(RESEARCH.length)
    expect(getAchievementStates(createMetaState()).every(a => !a.unlocked)).toBe(true)
    const result = applyCompletedRun(createMetaState(), { stats: run() })
    expect(getAchievementStates(result.state).find(a => a.id === 'first-victory')?.unlocked).toBe(true)
    expect(result.rewards.some(r => getRewardMetadata(r).title.length > 0)).toBe(true)
  })

  it('calculates currency without double-paying achievements or milestones', () => {
    const first = applyCompletedRun(createMetaState(), { stats: run('a') })
    const second = applyCompletedRun(first.state, { stats: run('b') })
    expect(first.rewards.reduce((n, r) => n + r.embers, 0)).toBe(first.state.embers)
    expect(second.state.embers - first.state.embers).toBe(second.rewards.reduce((n, r) => n + r.embers, 0))
    expect(second.rewards.filter(r => r.id === 'first-victory')).toHaveLength(0)
    expect(second.state.achievements.filter(x => x === 'first-victory')).toHaveLength(1)
  })

  it('uses all five configurable research caps and escalating late-stage prices', () => {
    for (const def of RESEARCH) {
      const cfg = BALANCE.meta.research[def.id as keyof typeof BALANCE.meta.research]
      expect(def.maxRank).toBe(cfg.maxRank)
      expect(def.benefitPerRank).toBe(cfg.benefitPerRank)
      expect(def.maxRank).toBeGreaterThanOrEqual(def.id === 'power' || def.id === 'vitality' ? 5 : 4)
    }
    let state = { ...createMetaState(), embers: 50_000 }
    for (const id of ['power', 'vitality', 'insight', 'scavenging', 'ember-study'] as const) {
      const cfg = BALANCE.meta.research[id]
      for (let rank = 0; rank < cfg.maxRank; rank++) {
        const displayed = getResearchStates(state).find(entry => entry.id === id)!
        const nextCost = cfg.firstCost + rank * cfg.costStep +
          Math.max(0, rank - cfg.lateCostStartRank) ** 2 * cfg.lateCostStep
        expect(displayed.nextCost).toBe(nextCost)
        expect(buyResearch(state, id).ok).toBe(true)
        const purchased = buyResearch(state, id)
        expect(purchased.state.research[id]).toBe(rank + 1)
        expect(purchased.state.embers).toBe(state.embers - nextCost)
        state = purchased.state
      }
      expect(getResearchStates(state).find(entry => entry.id === id)?.nextCost).toBeNull()
      expect(buyResearch(state, id).ok).toBe(false)
    }
    expect(validateMetaState(state)).toBe(true)
  })

  it('pays moderately more embers per finished run using configurable reward math', () => {
    const receipt = { stats: run('tuning-earn', { kills: 115, seconds: 180, victory: true }) }
    const first = applyCompletedRun(createMetaState(), receipt)
    expect(first.accepted).toBe(true)
    const earn = BALANCE.meta.runRewards
    const oldBase = Math.floor(115 / 10) + Math.floor(180 / 30) + 30
    const expected = Math.floor(oldBase * earn.baseMultiplier)
    expect(first.rewards.find(reward => reward.type === 'run')?.embers).toBe(expected)
    expect(expected).toBeGreaterThan(oldBase)
    expect(expected / oldBase).toBeLessThan(1.2)
    expect(applyCompletedRun(first.state, receipt)).toMatchObject({ accepted: false, reason: 'duplicate' })
  })

  it('uses permanent research ranks, prices and prerequisites with no negative wallet', () => {
    const initial = { ...createMetaState(), embers: 1500 }
    const first = buyResearch(initial, 'power')
    expect(first.ok).toBe(true)
    expect(first.state.research.power).toBe(1)
    expect(first.state.embers).toBeLessThan(1500)
    expect(initial.research.power).toBe(0)
    let full = first.state
    for (let n = 1; n < BALANCE.meta.research.power.maxRank; n++) full = buyResearch(full, 'power').state
    expect(buyResearch(full, 'power').ok).toBe(false)
    expect(buyResearch(createMetaState(), 'power').ok).toBe(false)
    expect(buyResearch(initial, 'not-real').ok).toBe(false)
  })

  it('extends every research cap and preserves the original first three upgrade prices', () => {
    const state = { ...createMetaState(), embers: 20_000 }
    for (const id of ['power', 'vitality', 'insight', 'scavenging', 'ember-study'] as const) {
      const def = RESEARCH.find(x => x.id === id)!
      expect(def.maxRank).toBe(BALANCE.meta.research[id].maxRank)
      expect(def.maxRank).toBeGreaterThan(id === 'power' || id === 'vitality' ? 3 : 2)
    }
    let current = state
    expect(getResearchStates(current).find(x => x.id === 'power')?.nextCost).toBe(25)
    current = buyResearch(current, 'power').state
    expect(getResearchStates(current).find(x => x.id === 'power')?.nextCost).toBe(50)
    current = buyResearch(current, 'power').state
    expect(getResearchStates(current).find(x => x.id === 'power')?.nextCost).toBe(75)
    current = buyResearch(current, 'power').state
    expect(getResearchStates(current).find(x => x.id === 'power')?.nextCost).toBeGreaterThan(75)
    const old = structuredClone(current)
    expect(buyResearch(current, 'power').state.research.power).toBe(4)
    expect(current).toEqual(old)
    expect(validateMetaState({ ...current, research: { ...current.research, power: 6 } })).toBe(true)
  })

  it('increases ember gains moderately, keeps duplicate-run protection and grants scaling bonuses once', () => {
    const plain = applyCompletedRun(createMetaState(), {
      stats: run('plain', { kills: 120, seconds: 200, victory: true }),
    })
    expect(plain.accepted).toBe(true)
    const expected = Math.floor(120 / BALANCE.meta.currency.killsPerEmber)
      + Math.floor(200 / BALANCE.meta.currency.secondsPerEmber)
      + BALANCE.meta.currency.victoryEmbers
    expect(expected).toBeGreaterThan(48)
    expect(expected).toBeLessThan(65)
    expect(plain.rewards[0]?.embers).toBe(expected)
    const funded = createMetaState()
    funded.research['ember-study'] = 4
    funded.research.power = 1
    funded.research.insight = 1
    funded.research.vitality = 1
    funded.research.scavenging = 1
    const rich = applyCompletedRun(funded, { stats: run('rich', { kills: 120, seconds: 200, victory: true }) })
    expect(rich.rewards[0]?.embers).toBe(expected + Math.floor(expected * 4 * BALANCE.meta.research['ember-study'].benefitPerRank))
    expect(applyCompletedRun(rich.state, { stats: run('rich', { kills: 120, seconds: 200 }) }).accepted).toBe(false)
  })

  it('requires parent research nodes and exposes remaining upgrade costs', () => {
    const initial = { ...createMetaState(), embers: 2000 }
    expect(getResearchStates(initial).find(x => x.id === 'insight')?.locked).toBe(true)
    expect(buyResearch(initial, 'insight').ok).toBe(false)
    const powered = buyResearch(initial, 'power').state
    expect(getResearchStates(powered).find(x => x.id === 'insight')?.locked).toBe(false)
    expect(getResearchStates(powered).find(x => x.id === 'insight')?.nextCost).toBe(80)
    const insight = buyResearch(powered, 'insight')
    expect(insight.ok).toBe(true)
    expect(buyResearch(insight.state, 'ember-study').ok).toBe(false)
    const vital = buyResearch(insight.state, 'vitality').state
    const scavenged = buyResearch(vital, 'scavenging')
    expect(scavenged.ok).toBe(true)
    expect(buyResearch(scavenged.state, 'ember-study').ok).toBe(true)
  })

  it('exposes locked and unlocked starter rewards for integration UI', () => {
    const initial = createMetaState()
    expect(getEquipmentStates(initial, 'knight').find(x => x.id === 'knight-aegis')?.locked).toBe(true)
    expect(getBonusStates(initial).find(x => x.id === 'ember-spark')?.locked).toBe(true)
    const rich = { ...initial, embers: 2000, mastery: { ...initial.mastery, knight: { xp: 1000, level: 4 } }, research: { ...initial.research, power: 1, insight: 1 } }
    const equip = unlockStartingEquipment(rich, 'knight-aegis').state
    const bonus = unlockStartingBonus(equip, 'ember-spark').state
    expect(getEquipmentStates(bonus, 'knight').find(x => x.id === 'knight-aegis')?.unlocked).toBe(true)
    expect(getBonusStates(bonus).find(x => x.id === 'ember-spark')?.unlocked).toBe(true)
  })

  it('gates equipment and starter bonuses behind mastery and upgrades', () => {
    const s = createMetaState()
    expect(unlockStartingEquipment(s, 'knight-aegis').ok).toBe(false)
    expect(unlockStartingBonus(s, 'ember-spark').ok).toBe(false)
    const unlocked = { ...s, embers: 2000, mastery: { ...s.mastery, knight: { xp: 1000, level: 4 } }, research: { ...s.research, power: 1, insight: 1 } }
    const gear = unlockStartingEquipment(unlocked, 'knight-aegis')
    const bonus = unlockStartingBonus(gear.state, 'ember-spark')
    expect(gear.ok).toBe(true)
    expect(bonus.ok).toBe(true)
    expect(unlockStartingEquipment(bonus.state, 'knight-aegis').ok).toBe(false)
    expect(getStartingLoadout(bonus.state, 'knight').equipment.map(x => x.id)).toContain('knight-aegis')
    expect(getStartingLoadout(bonus.state, 'knight').bonuses.map(x => x.id)).toContain('ember-spark')
    expect(getStartingLoadout(bonus.state, 'ranger').equipment).toEqual([])
  })

  it('updates hero mastery and per-mode records without giving run-only buffs', () => {
    const first = applyCompletedRun(createMetaState(), { stats: run('a') })
    const second = applyCompletedRun(first.state, { stats: run('b', { mode: 'endless', hero: 'ranger', victory: false, seconds: 700 }) })
    expect(first.state.mastery.knight.xp).toBeGreaterThan(0)
    expect(second.state.mastery.ranger.xp).toBeGreaterThan(0)
    expect(second.state.modeRecords.quick?.wins).toBe(1)
    expect(second.state.modeRecords.endless?.wins).toBe(0)
    expect(getStartingLoadout(second.state, 'knight').bonuses).toEqual([])
  })

  it('records optional discoveries while preserving unavailable content IDs', () => {
    const initial = createMetaState()
    expect(getDiscoveryEntries(initial, 'relics', ['relics:moonstone'])[0]?.unlocked).toBe(false)
    const next = applyCompletedRun(initial, { stats: run(), relicIds: ['relics:moonstone'], weaponIds: ['arcane:bolt'], evolutionIds: ['arcane:super-bolt'], bossIds: ['bosses:monarch'] }).state
    expect(getDiscoveryEntries(next, 'relics', ['relics:moonstone', 'relics:unknown']).map(x => x.unlocked)).toEqual([true, false])
    expect(next.discoveries.weapons).toContain('arcane:bolt')
    expect(next.discoveries.evolutions).toContain('arcane:super-bolt')
  })

  it('accepts real fractional run durations without discarding settlement', () => {
    const result = applyCompletedRun(createMetaState(), { stats: run('fractional', { seconds: 180.65 }) })
    expect(result.accepted).toBe(true)
    expect(result.state.modeRecords.quick?.bestSeconds).toBe(180.65)
  })

  it('counts confirmed boss kills rather than arbitrary discovered boss species', () => {
    const first = applyCompletedRun(createMetaState(), { stats: run('boss-1'), bossIds: ['bosses:one', 'bosses:two', 'bosses:three'] })
    expect(first.state.bossWins).toBe(1)
    expect(first.state.achievements).not.toContain('abyss-conqueror')
    const second = applyCompletedRun(first.state, { stats: run('boss-2') })
    const third = applyCompletedRun(second.state, { stats: run('boss-3') })
    expect(third.state.bossWins).toBe(3)
    expect(third.state.achievements).toContain('abyss-conqueror')
  })

  it('rejects unknown cosmetic unlock claims', () => {
    expect(applyCompletedRun(createMetaState(), { stats: run(), cosmeticIds: ['not-a-cosmetic'] }).accepted).toBe(false)
    expect(parseMetaSnapshot(JSON.stringify({ ...createMetaState(), cosmetics: ['not-a-cosmetic'] }))).toBeNull()
  })

  it('rejects malformed inputs and duplicate IDs before paying anything', () => {
    const p = createMetaState()
    expect(applyCompletedRun(p, { stats: run('', { id: '' }) }).accepted).toBe(false)
    expect(applyCompletedRun(p, { stats: run('bad', { kills: -1 }) }).accepted).toBe(false)
    expect(applyCompletedRun(p, { stats: run('bad2', { seconds: Number.POSITIVE_INFINITY }) }).accepted).toBe(false)
    expect(applyCompletedRun(p, { stats: run(), relicIds: ['BAD:ID'] }).accepted).toBe(false)
    expect(applyCompletedRun(p, { stats: run(), weaponIds: ['invalid'] }).accepted).toBe(false)
    expect(p).toEqual(createMetaState())
  })

  it('saturates its settlement ledger rather than forgetting older runs', () => {
    const p = { ...createMetaState(), runIds: Array.from({ length: 20_000 }, (_, i) => `run-${i}`) }
    const result = applyCompletedRun(p, { stats: run('later') })
    expect(result.accepted).toBe(false)
    expect(result.reason).toBe('ledger-full')
    expect(p.runIds).toHaveLength(20_000)
  })

  it('stages version 2 migration without altering the legacy profile, key, or existing currency', () => {
    const legacy = { ...emptyProfile(), runs: 30, wins: 5, embers: 375, recentRunIds: ['historical-id'], achievements: ['first-victory'], discoveredAbilities: ['bolt', 'frozen-thunderstorm', 'arcane:fire'] as ReturnType<typeof emptyProfile>['discoveredAbilities'] }
    const unchanged = structuredClone(legacy)
    const plan = proposeV2Migration(legacy)
    expect(plan?.fromVersion).toBe(2)
    expect(plan?.toVersion).toBe(3)
    expect(plan?.requiresIntegration).toBe(true)
    expect(plan?.next.embers).toBe(375)
    expect(plan?.next.runIds).toContain('historical-id')
    expect(plan?.next.discoveries.evolutions).toContain('frozen-thunderstorm')
    expect(plan?.next.discoveries.weapons).toContain('arcane:fire')
    expect(plan?.next.achievements).toContain('veteran-explorer')
    expect(legacy).toEqual(unchanged)
    expect(applyCompletedRun(plan!.next, { stats: run('historical-id') }).accepted).toBe(false)
  })

  it('preserves valid v2 profiles including passive discoveries and v1-derived win counts', () => {
    const legacy = {
      ...emptyProfile(), runs: 0, wins: 2, embers: 25,
      discoveredAbilities: ['damage', 'bolt', 'frozen-thunderstorm'] as ReturnType<typeof emptyProfile>['discoveredAbilities'],
      discoveredMonsters: { slime: 4 },
      equippedCosmetics: { knight: 'knight-default', ranger: 'ranger-default', wizard: 'wizard-default' },
    }
    const migrated = proposeV2Migration(legacy)
    expect(migrated).not.toBeNull()
    expect(migrated!.next.runs).toBeGreaterThanOrEqual(migrated!.next.wins)
    expect(migrated!.next.discoveries.weapons).toContain('bolt')
    expect(migrated!.next.discoveries.weapons).not.toContain('damage')
    expect(migrated!.legacyProfile.discoveredAbilities).toContain('damage')
    expect(migrated!.legacyProfile.discoveredMonsters.slime).toBe(4)
    expect(migrated!.legacyProfile.runs).toBe(0)
    expect(legacy.runs).toBe(0)
  })

  it('never retroactively credits achievements or milestone rewards', () => {
    const legacy = { ...emptyProfile(), runs: 50, wins: 15, embers: 19, achievements: ['first-victory'] }
    const p = proposeV2Migration(legacy)!.next
    expect(p.embers).toBe(19)
    expect(p.achievements).toContain('veteran-explorer')
    expect(p.claimedMilestones).toContain('ten-runs')
    const newer = applyCompletedRun(p, { stats: run('new-after-migrate', { victory: false, bossDefeated: false, kills: 0 }) })
    expect(newer.rewards.some(r => r.id === 'ten-runs')).toBe(false)
    expect(newer.rewards.some(r => r.id === 'veteran-explorer')).toBe(false)
  })

  it('rejects corrupted or future data and keeps storage failures non-destructive', () => {
    const snapshot = createMetaState()
    expect(validateMetaState(snapshot)).toBe(true)
    expect(parseMetaSnapshot(JSON.stringify(snapshot))).toEqual(snapshot)
    expect(parseMetaSnapshot('{')).toBeNull()
    expect(parseMetaSnapshot(JSON.stringify({ ...snapshot, version: 999 }))).toBeNull()
    expect(parseMetaSnapshot(JSON.stringify({ ...snapshot, embers: -1 }))).toBeNull()
    expect(parseMetaSnapshot(JSON.stringify({ ...snapshot, research: { ...snapshot.research, power: 100 } }))).toBeNull()
    expect(readMetaSnapshot(() => { throw Error('storage blocked') })).toBeNull()
    expect(proposeV2Migration({ ...emptyProfile(), version: 99 })).toBeNull()
  })

  it('has explicit reset semantics with no retained rewards', () => {
    const earned = applyCompletedRun(createMetaState(), { stats: run() }).state
    const reset = resetMetaState()
    expect(reset).toEqual(createMetaState())
    expect(reset.runs).toBe(0)
    expect(reset.achievements).toEqual([])
    expect(earned.runs).toBe(1)
  })
})
