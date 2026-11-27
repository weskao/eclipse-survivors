import { BALANCE } from '../../config'
import { HERO_MASTERY_DESCRIPTIONS } from './mastery-preview'
import { damageHero, hit } from '../../combat'
import { impact } from '../../fx'
import { random as simulationRandom } from '../../math'
import { createHero } from '../../state'
import type { ContentId, GameHooks, GameState, JobId, Mob, SfxCue } from '../../types'
import type { ContentAbility, ContentPack } from '../contracts'
import shadowPortrait from '../../../assets/es2/production/heroes/shadowblade-portrait@3x.webp'
import summonerPortrait from '../../../assets/es2/production/heroes/spirit-summoner-portrait@3x.webp'
import paladinPortrait from '../../../assets/es2/production/heroes/crimson-paladin-portrait@3x.webp'
import shadowSpecialIcon from '../../../assets/es2/production/heroes/shadowblade-special@3x.webp'
import summonerSpecialIcon from '../../../assets/es2/production/heroes/spirit-summoner-special@3x.webp'
import paladinSpecialIcon from '../../../assets/es2/production/heroes/crimson-paladin-special@3x.webp'

export type SpecializationId = 'shadowblade' | 'spirit-summoner' | 'crimson-paladin'
import { grantShield, hallCritBonus, hallRank, hallSummonCast, hallSummonInterval, withHallSource, type HallDamageSource } from '../meta/hall-runtime'
import hallTuning from '../../balance/hall-effect-tuning.json'

export type CompanionKind = 'wisp' | 'guardian' | 'reaver'

interface HeroStats {
  readonly hp: number
  readonly speed: number
  readonly damage: number
  readonly delay: number
  readonly range: number
}

export interface HeroSelectionDefinition {
  readonly id: SpecializationId
  readonly label: string
  readonly subtitle: string
  readonly description: string
  readonly strengths: readonly string[]
  readonly weaknesses: readonly string[]
  readonly legacyArtJob: JobId
  /** A distinct static illustration; the original three hero assets stay untouched. */
  readonly portraitSrc: string
  readonly specialIconSrc: string
  readonly stats: HeroStats
  readonly startingAbility: ContentId
  /** Hero-specific run equipment; the integration layer retains the original JobId only for fallback art. */
  readonly startingEquipment: string
  readonly progressionAbility: ContentId
  readonly passive: string
  /** Translation template; pass `specialParams` to `t()` wherever it is displayed. */
  readonly special: string
  readonly specialParams?: Readonly<Record<string, number>>
  readonly specialCooldown: number
  readonly animation: Readonly<{ idle: string; attack: string; special: string }>
  readonly audio: Readonly<{ attack: SfxCue; special: SfxCue }>
}

export const HERO_DEFINITIONS: Readonly<Record<SpecializationId, HeroSelectionDefinition>> = Object.freeze({
  shadowblade: {
    id: 'shadowblade', label: '影刃行者', subtitle: 'Shadowblade',
    description: '近戰突襲與短暫潛行，高爆發但生存能力較低。',
    strengths: ['高速突進', '暴擊', '短暫潛行'],
    weaknesses: ['低生命', '短射程', '須掌握突襲時機'],
    legacyArtJob: 'knight', portraitSrc: shadowPortrait, specialIconSrc: shadowSpecialIcon,
    stats: BALANCE.heroes.special.shadowblade,
    startingAbility: 'heroes:shadow-daggers', startingEquipment: '影鋒雙匕', progressionAbility: 'heroes:shadow-precision',
    passive: `暗影精準：${Math.round(BALANCE.heroes.specialEffects.shadowblade.critChance * 100)}% 暴擊機率，造成 ${Math.round(BALANCE.heroes.specialEffects.shadowblade.critMultiplier * 100)}% 傷害；升級增強暴擊倍率。`,
    special: '影襲：突襲周圍最多三名敵人，短暫潛行並取得閃避保護。',
    specialCooldown: BALANCE.heroes.specialCooldowns.shadowblade,
    animation: { idle: 'shadow-breath', attack: 'dual-blade-slash', special: 'shadow-afterimages' },
    audio: { attack: 'knight', special: 'shadowblade-special' },
  },
  'spirit-summoner': {
    id: 'spirit-summoner', label: '靈契召喚師', subtitle: 'Spirit Summoner',
    description: '與靈體協同作戰，逐步提升召喚數量與支援能力。',
    strengths: ['持續召喚傷害', '小額治癒', '穩定遠程作戰'],
    weaknesses: ['脆弱', '前期召喚數量少', '召喚攻擊需要時間'],
    legacyArtJob: 'wizard', portraitSrc: summonerPortrait, specialIconSrc: summonerSpecialIcon,
    stats: BALANCE.heroes.special['spirit-summoner'],
    startingAbility: 'heroes:spirit-orb', startingEquipment: '靈火寶珠', progressionAbility: 'heroes:spirit-bond',
    passive: '靈契：靈火攻擊、守護靈治療、奪魂靈吸血，最多三個常駐夥伴。',
    special: '靈潮集結：靈體集中攻擊周圍目標並恢復少量生命。',
    specialCooldown: BALANCE.heroes.specialCooldowns['spirit-summoner'],
    animation: { idle: 'floating-grimoire', attack: 'spirit-cast', special: 'spectral-convergence' },
    audio: { attack: 'wizard', special: 'spirit-summoner-special' },
  },
  'crimson-paladin': {
    id: 'crimson-paladin', label: '緋紅聖騎', subtitle: 'Crimson Paladin',
    description: '高耐久反擊型近戰，透過生命風險換取屏障與強化傷害。',
    strengths: ['承傷減免', '近身反擊', '臨時屏障'],
    weaknesses: ['移動慢', '射程短', '主動技能消耗生命'],
    legacyArtJob: 'knight', portraitSrc: paladinPortrait, specialIconSrc: paladinSpecialIcon,
    stats: BALANCE.heroes.special['crimson-paladin'],
    startingAbility: 'heroes:crimson-guard', startingEquipment: '緋紅聖盾', progressionAbility: 'heroes:crimson-vow',
    passive: '緋紅韌性：受到傷害減少 14%，受傷時有冷卻的近距離反擊。',
    special: '血誓屏障：犧牲少量生命換取 {seconds} 秒的吸收護盾；屏障到期或破碎時引爆緋紅報復，依吸收的傷害重創周圍敵人。',
    specialParams: { seconds: BALANCE.heroes.specialEffects['crimson-paladin'].barrierSeconds },
    specialCooldown: BALANCE.heroes.specialCooldowns['crimson-paladin'],
    animation: { idle: 'shield-vigil', attack: 'shield-counter', special: 'crimson-aegis' },
    audio: { attack: 'knight', special: 'crimson-paladin-special' },
  },
})

const HERO_LIST = Object.values(HERO_DEFINITIONS)

/** The existing registry stores these starting abilities and upgrade levels per run. */
const abilities: ContentAbility[] = HERO_LIST.flatMap((def): ContentAbility[] => [
  {
    id: def.startingAbility, kind: 'weapon', icon: '✦', iconSrc: def.specialIconSrc, title: def.label + ' · ' + def.special.split('：')[0],
    desc: def.passive, rarity: 'rare', maxLevel: 1,
    eligible: () => false, // The adapter grants this at run initialization, never in random rolls.
  },
  {
    id: def.progressionAbility, kind: 'ability', icon: '✧', title: def.label + ' · 專精',
    desc: HERO_MASTERY_DESCRIPTIONS[def.id], rarity: 'rare', maxLevel: 3,
    requires: [{ id: def.startingAbility, level: 1 }],
    eligible: state => (state.content.levels[def.startingAbility] ?? 0) > 0,
  },
])

export const HERO_SPECIALIZATIONS_PACK: ContentPack = {
  id: 'heroes',
  abilities,
}

export interface SpecializationSnapshot {
  readonly cooldown: number
  readonly stealth: number
  readonly barrier: number
  readonly barrierSeconds?: number
  readonly companions: readonly CompanionKind[]
}

export interface CastTarget { readonly x: number; readonly y: number }
const NO_TARGETS: readonly CastTarget[] = Object.freeze([])

export interface HeroSpecializationAdapter {
  readonly id: SpecializationId
  /** Run AFTER the integration-owned resetRun; does not change global or shared types. */
  reset(): void
  /** Call once per live simulation tick, never for paused/level/result states. */
  tick(dt: number): void
  /** Wire a dedicated special-skill input in the integration branch. */
  activate(): boolean
  /** Apply BEFORE normal hit() to support shadow crit and low-health damage. */
  modifyOutgoingDamage(amount: number, source?: HallDamageSource): number
  consumeCriticalHit(): boolean
  /** Apply BEFORE damageHero(); pass the returned amount to the legacy damage path. */
  mitigateIncomingDamage(amount: number): number
  /** Call only after damageHero() reports actual HP damage. */
  afterDamage(amount: number): void
  /** Suppresses enemy acquisition during active Shadowblade stealth. */
  canBeTargeted(): boolean
  /** Route the actual legacy hit once, keeping kills, XP, events, and damage totals authoritative. */
  dealDamage(target: Mob, amount: number): number
  /** Route incoming damage through guards, mitigation, legacy damage and counter in that order. */
  receiveDamage(amount: number): number
  snapshot(): SpecializationSnapshot
  /** World positions of the enemies the last successful cast struck (VFX only; empty for the barrier). */
  castTargets(): readonly CastTarget[]
}

const SHADOW = BALANCE.heroes.specialEffects.shadowblade
const SPIRIT = BALANCE.heroes.specialEffects['spirit-summoner']
const PALADIN = BALANCE.heroes.specialEffects['crimson-paladin']

const COMPANION_ORDER = ['wisp', 'guardian', 'reaver'] as const

/** Attack-time target selection: squared distances, no full-array sort, and at most three results. */
function nearby(state: GameState, reach: number, limit: number): Mob[] {
  const hero = state.hero
  if (!hero) return []
  const selected: { mob: Mob; d: number }[] = []
  const reachSquared = reach * reach
  for (const enemy of state.mobs) {
    if (enemy.hp <= 0) continue
    const dx = enemy.x - hero.x
    const dy = enemy.y - hero.y
    const d = dx * dx + dy * dy
    if (d > reachSquared) continue
    let i = 0
    while (i < selected.length && d >= selected[i]!.d) i++
    if (i >= limit) continue
    selected.splice(i, 0, { mob: enemy, d })
    if (selected.length > limit) selected.pop()
  }
  return selected.map(entry => entry.mob)
}

// Captured before hit() so knockback or death cannot move the visual contact point.
const strikePoints = (mobs: readonly Mob[]): readonly CastTarget[] =>
  mobs.length ? Object.freeze(mobs.map(m => Object.freeze({ x: m.x, y: m.y }))) : NO_TARGETS

/**
 * Per-engine, per-run closure. No module-global mutable state and no changes to JobId
 * or GameState. The integration branch owns engine lifecycle, damage and input wiring.
 */
export function createHeroSpecializationAdapter(
  state: GameState,
  id: SpecializationId,
  hooks: GameHooks,
  random: () => number = simulationRandom,
): HeroSpecializationAdapter {
  const def = HERO_DEFINITIONS[id]
  let lastCritical = false
  let cooldown = 0
  let stealth = 0
  let barrier = 0
  let barrierLife = 0
  let absorbed = 0
  let counterCooldown = 0
  let companionTimer = 0
  let lastTargets = NO_TARGETS
  let phantomAt = 0, sanctuaryAt = 0, reckoningAt = 0

  const alive = () => state.mode === 'play' && !!state.hero && state.hero.hp > 0
  const upgrades = () => state.content.levels[def.progressionAbility] ?? 0
  const companions = (): readonly CompanionKind[] => {
    if (id !== 'spirit-summoner' || !state.hero) return []
    const level = Number.isFinite(state.hero.level) ? Math.max(1, state.hero.level) : 1
    return COMPANION_ORDER.slice(0, Math.min(3, 1 + Math.floor((level - 1) / 2)))
  }

  return {
    id,
    reset(): void {
      cooldown = stealth = barrier = barrierLife = absorbed = counterCooldown = companionTimer = 0
      phantomAt = sanctuaryAt = reckoningAt = 0
      lastTargets = NO_TARGETS
      lastCritical = false
      state.choice = def.legacyArtJob
      state.hero = createHero(def.legacyArtJob)
      Object.assign(state.hero, {
        hp: def.stats.hp, max: def.stats.hp, speed: def.stats.speed,
        damage: def.stats.damage, delay: def.stats.delay, range: def.stats.range,
      })
      state.content.levels[def.startingAbility] = 1
    },
    tick(dt: number): void {
      if (!alive() || !Number.isFinite(dt) || dt <= 0) return
      cooldown = Math.max(0, cooldown - dt)
      const wasStealth = stealth > 0
      stealth = Math.max(0, stealth - dt)
      if (wasStealth && stealth === 0 && state.hall && hallRank(state, 'shadowblade-ambush')) state.hall.ambushReady = true
      counterCooldown = Math.max(0, counterCooldown - dt)
      if (barrierLife > 0) {
        barrierLife = Math.max(0, barrierLife - dt)
        // Crimson Retribution: detonate once when the ward expires or breaks. Deferred to the
        // tick so the burst never re-enters hit() from inside an enemy's damage path.
        if (barrierLife === 0 || barrier <= 0) {
          const stored = absorbed
          const expired = barrierLife === 0 && barrier > 0
          barrierLife = barrier = absorbed = 0
          if (expired && state.hall && hallRank(state, 'crimson-paladin-blood-sanctuary') && state.time >= sanctuaryAt) {
            sanctuaryAt = state.time + hallTuning.paladinSignatureCooldown
            state.hall.sanctuaryUntil = state.time + hallTuning.paladinSanctuarySeconds
          }
          if (stored >= PALADIN.retributionMinAbsorb) {
            const hero = state.hero!
            const reckoning = hallRank(state, 'crimson-paladin-crimson-reckoning') > 0 && state.time >= reckoningAt
            if (reckoning) reckoningAt = state.time + hallTuning.paladinSignatureCooldown
            const reach = PALADIN.retributionRange * (reckoning ? 1 + hallTuning.paladinReckoningRadius : 1)
            const damage = stored * (PALADIN.retributionAbsorbRatio + upgrades() * PALADIN.retributionRatioPerRank) * (1 + hallRank(state, 'crimson-paladin-vengeance') * hallTuning.paladinVengeance) * (reckoning ? 1 + hallTuning.paladinReckoningDamage : 1)
            for (const enemy of nearby(state, reach, PALADIN.retributionTargets)) hit(state, enemy, damage, withHallSource(state, hooks, 'hero'))
            impact(state, hero.x, hero.y, reach, '#ff8a6a', 1.6)
            hooks.sfx('crimson-paladin-retribution')
          }
        }
      }
      if (id !== 'spirit-summoner') return
      companionTimer -= dt
      if (companionTimer > 0) return
      companionTimer = SPIRIT.companionTickSeconds * hallSummonInterval(state)
      const hero = state.hero!
      const active = companions()
      const nearest = nearby(state, SPIRIT.companionRange, 1)[0]
      for (const companion of active) {
        if (companion === 'guardian') {
          hero.hp = Math.min(hero.max, hero.hp + SPIRIT.guardianHealBase + upgrades() * SPIRIT.guardianHealPerRank)
        } else if (nearest?.hp && nearest.hp > 0) {
          hit(state, nearest, hero.damage * (companion === 'reaver' ? 0.36 : 0.53) * (1 + upgrades() * SPIRIT.companionDamagePerRank), withHallSource(state, hooks, 'summon'))
          if (companion === 'reaver') hero.hp = Math.min(hero.max, hero.hp + 1.5)
        }
      }
    },
    activate(): boolean {
      if (!alive() || cooldown > 0) return false
      const hero = state.hero!
      cooldown = def.specialCooldown
      if (id === 'shadowblade') {
        stealth = SHADOW.stealthSeconds * (1 + hallRank(state, 'shadowblade-vanish') * hallTuning.shadowVanish)
        hero.inv = Math.max(hero.inv, 0.7)
        const struck = nearby(state, SHADOW.specialReach, SHADOW.specialHits)
        lastTargets = strikePoints(struck)
        for (const enemy of struck) hit(state, enemy, hero.damage * (SHADOW.specialDamageBase + upgrades() * SHADOW.specialDamagePerRank), withHallSource(state, hooks, 'hero'))
        const phantom = hallRank(state, 'shadowblade-phantom') && state.time >= phantomAt ? nearby(state, SHADOW.specialReach, 1)[0] : undefined
        if (phantom) { phantomAt = state.time + hallTuning.shadowPhantomCooldown; hit(state, phantom, hero.damage * hallTuning.shadowPhantomDamage, withHallSource(state, hooks, 'proc')) }
      } else if (id === 'spirit-summoner') {
        const struck = nearby(state, SPIRIT.companionRange, 3)
        lastTargets = strikePoints(struck)
        for (const enemy of struck) hit(state, enemy, hero.damage * (SPIRIT.specialDamageBase + upgrades() * SPIRIT.specialDamagePerRank), hooks)
        const before = hero.hp
        hero.hp = Math.min(hero.max, hero.hp + SPIRIT.specialHeal * (1 + hallRank(state, 'spirit-summoner-mend') * hallTuning.spiritMend))
        hallSummonCast(state)
        const hall = state.hall
        if (hall && hall.rank('spirit-summoner-legion') && state.time >= hall.legionAt) {
          hall.legionAt = state.time + hallTuning.spiritLegionCooldown; hall.legionUntil = state.time + hallTuning.spiritLegionSeconds
        }
        if (hall && hero.hp > before && hall.rank('spirit-summoner-soul-bond') && state.time >= hall.soulBondAt) {
          hall.soulBondAt = state.time + hallTuning.spiritBondCooldown; grantShield(state, hallTuning.spiritBondShield, hallTuning.spiritBondSeconds)
        }
      } else {
        const cost = Math.min(Math.max(0, hero.hp - 1), Math.ceil(hero.max * PALADIN.healthCostRatio))
        hero.hp -= cost
        state.damageTaken += cost
        barrier = (PALADIN.barrierBase + hero.level * PALADIN.barrierPerHeroLevel + upgrades() * PALADIN.barrierPerRank) * (1 + hallRank(state, 'crimson-paladin-oath') * hallTuning.paladinOath)
        lastTargets = NO_TARGETS
        barrierLife = PALADIN.barrierSeconds
        absorbed = 0
      }
      hooks.sfx(def.audio.special)
      return true
    },
    modifyOutgoingDamage(amount: number, source?: HallDamageSource): number {
      lastCritical = false
      if (!Number.isFinite(amount) || amount <= 0) return 0
      if (!alive()) return amount
      if (id === 'shadowblade') {
        lastCritical = random() < SHADOW.critChance + hallCritBonus(state, source)
        return lastCritical ? amount * (SHADOW.critMultiplier + upgrades() * SHADOW.critBonusPerRank) : amount
      }
      if (id === 'spirit-summoner') return amount * (1 + (companions().includes('wisp') ? 0.06 : 0))
      const hpRatio = state.hero!.hp / state.hero!.max
      return amount * (hpRatio < PALADIN.lowHpThreshold ? PALADIN.lowHpDamageBase + upgrades() * PALADIN.lowHpDamagePerRank : 1)
    },
    consumeCriticalHit(): boolean {
      const critical = lastCritical
      lastCritical = false
      return critical
    },
    mitigateIncomingDamage(amount: number): number {
      if (!Number.isFinite(amount) || amount <= 0) return 0
      if (!alive() || id !== 'crimson-paladin' || state.hero!.inv > 0 || state.hero!.dash > 0) return amount
      const reduced = amount * (1 - PALADIN.baseReduction - Math.min(PALADIN.extraReductionCap, upgrades() * PALADIN.reductionPerRank)) * (1 - (barrierLife > 0 && barrier > 0 ? hallRank(state, 'crimson-paladin-sacrifice') * hallTuning.paladinSacrifice : 0))
      const absorb = barrierLife > 0 ? Math.min(barrier, reduced) : 0
      barrier -= absorb
      absorbed += absorb
      return Math.max(0, reduced - absorb)
    },
    afterDamage(amount: number): void {
      if (!alive() || id !== 'crimson-paladin' || !Number.isFinite(amount) || amount <= 0 || counterCooldown > 0) return
      counterCooldown = PALADIN.counterCooldown
      const hero = state.hero!
      for (const enemy of nearby(state, PALADIN.counterRange, PALADIN.counterTargets)) hit(state, enemy, hero.damage * (PALADIN.counterDamageBase + upgrades() * PALADIN.counterDamagePerRank), hooks)
      impact(state, hero.x, hero.y, 72, '#fb8f96', 0.45)
    },
    canBeTargeted(): boolean {
      return !!state.hero && state.hero.hp > 0 && (id !== 'shadowblade' || stealth <= 0)
    },
    dealDamage(target: Mob, amount: number): number {
      if (!alive() || target.hp <= 0 || !Number.isFinite(target.hp)) return 0
      const modified = this.modifyOutgoingDamage(amount)
      if (modified <= 0) return 0
      const before = target.hp
      hit(state, target, modified, hooks)
      return Math.max(0, before - target.hp)
    },
    receiveDamage(amount: number): number {
      const hero = state.hero
      // Run the exact legacy pre-damage guards before consuming an absorption barrier.
      if (!alive() || !hero || hero.inv > 0 || hero.dash > 0
        || !Number.isFinite(amount) || amount <= 0) return 0
      const mitigated = this.mitigateIncomingDamage(amount)
      if (mitigated <= 0) return 0
      const before = hero.hp
      damageHero(state, mitigated, hooks)
      const taken = Math.max(0, before - hero.hp)
      if (taken > 0) this.afterDamage(taken)
      return taken
    },
    snapshot(): SpecializationSnapshot {
      return { cooldown, stealth, barrier, barrierSeconds: barrierLife, companions: companions() }
    },
    castTargets: () => lastTargets,
  }
}

/** Safe adapter entry for persisted/menu IDs. Legacy jobs keep their untouched engine path. */
export function isSpecializationId(id: unknown): id is SpecializationId {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(HERO_DEFINITIONS, id)
}

export function createHeroRosterAdapter(
  state: GameState,
  heroId: string,
  hooks: GameHooks,
  random: () => number = simulationRandom,
): HeroSpecializationAdapter | null {
  return isSpecializationId(heroId) ? createHeroSpecializationAdapter(state, heroId, hooks, random) : null
}
