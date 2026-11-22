import { hit } from '../../combat'
import { impact, burst } from '../../fx'
import { random as simulationRandom } from '../../math'
import { createHero } from '../../state'
import type { ContentId, GameHooks, GameState, JobId, Mob, SfxCue } from '../../types'
import type { ContentAbility, ContentPack } from '../contracts'
import shadowPortrait from './portraits/shadowblade.svg?url'
import summonerPortrait from './portraits/spirit-summoner.svg?url'
import paladinPortrait from './portraits/crimson-paladin.svg?url'

export type SpecializationId = 'shadowblade' | 'spirit-summoner' | 'crimson-paladin'
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
  readonly stats: HeroStats
  readonly startingAbility: ContentId
  readonly progressionAbility: ContentId
  readonly passive: string
  readonly special: string
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
    legacyArtJob: 'knight', portraitSrc: shadowPortrait,
    stats: { hp: 105, speed: 248, damage: 28, delay: 0.43, range: 132 },
    startingAbility: 'heroes:shadow-daggers', progressionAbility: 'heroes:shadow-precision',
    passive: '暗影精準：24% 暴擊機率，造成 170% 傷害；升級增強暴擊倍率。',
    special: '影襲：突襲周圍最多三名敵人，短暫潛行並取得閃避保護。',
    specialCooldown: 9.5,
    animation: { idle: 'shadow-breath', attack: 'dual-blade-slash', special: 'shadow-afterimages' },
    audio: { attack: 'knight', special: 'dash' },
  },
  'spirit-summoner': {
    id: 'spirit-summoner', label: '靈契召喚師', subtitle: 'Spirit Summoner',
    description: '與靈體協同作戰，逐步提升召喚數量與支援能力。',
    strengths: ['持續召喚傷害', '小額治癒', '穩定遠程作戰'],
    weaknesses: ['脆弱', '前期召喚數量少', '召喚攻擊需要時間'],
    legacyArtJob: 'wizard', portraitSrc: summonerPortrait,
    stats: { hp: 118, speed: 194, damage: 24, delay: 0.66, range: 355 },
    startingAbility: 'heroes:spirit-orb', progressionAbility: 'heroes:spirit-bond',
    passive: '靈契：靈火攻擊、守護靈治療、奪魂靈吸血，最多三個常駐夥伴。',
    special: '靈潮集結：靈體集中攻擊周圍目標並恢復少量生命。',
    specialCooldown: 12,
    animation: { idle: 'floating-grimoire', attack: 'spirit-cast', special: 'spectral-convergence' },
    audio: { attack: 'wizard', special: 'vortex' },
  },
  'crimson-paladin': {
    id: 'crimson-paladin', label: '緋紅聖騎', subtitle: 'Crimson Paladin',
    description: '高耐久反擊型近戰，透過生命風險換取屏障與強化傷害。',
    strengths: ['承傷減免', '近身反擊', '臨時屏障'],
    weaknesses: ['移動慢', '射程短', '主動技能消耗生命'],
    legacyArtJob: 'knight', portraitSrc: paladinPortrait,
    stats: { hp: 190, speed: 172, damage: 30, delay: 0.65, range: 116 },
    startingAbility: 'heroes:crimson-guard', progressionAbility: 'heroes:crimson-vow',
    passive: '緋紅韌性：受到傷害減少 14%，受傷時有冷卻的近距離反擊。',
    special: '血誓屏障：犧牲少量生命換取 3.5 秒的吸收護盾；生命低時反擊更強。',
    specialCooldown: 14,
    animation: { idle: 'shield-vigil', attack: 'shield-counter', special: 'crimson-aegis' },
    audio: { attack: 'knight', special: 'knight' },
  },
})

const HERO_LIST = Object.values(HERO_DEFINITIONS)

/** The existing registry stores these starting abilities and upgrade levels per run. */
const abilities: ContentAbility[] = HERO_LIST.flatMap((def): ContentAbility[] => [
  {
    id: def.startingAbility, kind: 'weapon', icon: '✦', title: def.label + ' · ' + def.special,
    desc: def.passive, rarity: 'rare', maxLevel: 1,
    eligible: () => false, // The adapter grants this at run initialization, never in random rolls.
  },
  {
    id: def.progressionAbility, kind: 'ability', icon: '✧', title: def.label + ' · 專精',
    desc: '提升英雄獨有的被動能力', rarity: 'rare', maxLevel: 3,
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
  readonly companions: readonly CompanionKind[]
}

export interface HeroSpecializationAdapter {
  readonly id: SpecializationId
  /** Run AFTER the integration-owned resetRun; does not change global or shared types. */
  reset(): void
  /** Call once per live simulation tick, never for paused/level/result states. */
  tick(dt: number): void
  /** Wire a dedicated special-skill input in the integration branch. */
  activate(): boolean
  /** Apply BEFORE normal hit() to support shadow crit and low-health damage. */
  modifyOutgoingDamage(amount: number): number
  /** Apply BEFORE damageHero(); pass the returned amount to the legacy damage path. */
  mitigateIncomingDamage(amount: number): number
  /** Call only after damageHero() reports actual HP damage. */
  afterDamage(amount: number): void
  snapshot(): SpecializationSnapshot
}

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
  let cooldown = 0
  let stealth = 0
  let barrier = 0
  let barrierLife = 0
  let counterCooldown = 0
  let companionTimer = 0

  const alive = () => state.mode === 'play' && !!state.hero && state.hero.hp > 0
  const upgrades = () => state.content.levels[def.progressionAbility] ?? 0
  const companions = (): readonly CompanionKind[] => {
    if (id !== 'spirit-summoner' || !state.hero) return []
    return COMPANION_ORDER.slice(0, Math.min(3, 1 + Math.floor((state.hero.level - 1) / 2)))
  }

  return {
    id,
    reset(): void {
      cooldown = stealth = barrier = barrierLife = counterCooldown = companionTimer = 0
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
      stealth = Math.max(0, stealth - dt)
      counterCooldown = Math.max(0, counterCooldown - dt)
      barrierLife = Math.max(0, barrierLife - dt)
      if (barrierLife === 0) barrier = 0
      if (id !== 'spirit-summoner') return
      companionTimer -= dt
      if (companionTimer > 0) return
      companionTimer = 1.8
      const hero = state.hero!
      const active = companions()
      const nearest = nearby(state, 330, 1)[0]
      for (const companion of active) {
        if (companion === 'guardian') {
          hero.hp = Math.min(hero.max, hero.hp + 2 + upgrades())
        } else if (nearest?.hp && nearest.hp > 0) {
          hit(state, nearest, hero.damage * (companion === 'reaver' ? 0.36 : 0.53) * (1 + upgrades() * 0.18), hooks)
          if (companion === 'reaver') hero.hp = Math.min(hero.max, hero.hp + 1.5)
        }
      }
    },
    activate(): boolean {
      if (!alive() || cooldown > 0) return false
      const hero = state.hero!
      cooldown = def.specialCooldown
      if (id === 'shadowblade') {
        stealth = 0.95
        hero.inv = Math.max(hero.inv, 0.7)
        for (const enemy of nearby(state, 150, 3)) hit(state, enemy, hero.damage * 1.4, hooks)
        impact(state, hero.x, hero.y, 95, '#aa8eff', 0.7)
        burst(state, hero.x, hero.y, '#8666ef', 12)
      } else if (id === 'spirit-summoner') {
        for (const enemy of nearby(state, 330, 3)) hit(state, enemy, hero.damage * (1.2 + upgrades() * 0.2), hooks)
        hero.hp = Math.min(hero.max, hero.hp + 12)
        impact(state, hero.x, hero.y, 115, '#95eaff', 0.9)
      } else {
        const cost = Math.min(Math.max(0, hero.hp - 1), Math.ceil(hero.max * 0.08))
        hero.hp -= cost
        state.damageTaken += cost
        barrier = 48 + hero.level * 2 + upgrades() * 12
        barrierLife = 3.5
        impact(state, hero.x, hero.y, 105, '#ed6178', 1)
      }
      hooks.sfx(def.audio.special)
      return true
    },
    modifyOutgoingDamage(amount: number): number {
      if (!Number.isFinite(amount) || amount <= 0) return 0
      if (!alive()) return amount
      if (id === 'shadowblade') {
        return random() < 0.24 ? amount * (1.7 + upgrades() * 0.15) : amount
      }
      if (id === 'spirit-summoner') return amount * (1 + (companions().includes('wisp') ? 0.06 : 0))
      const hpRatio = state.hero!.hp / state.hero!.max
      return amount * (hpRatio < 0.4 ? 1.35 + upgrades() * 0.06 : 1)
    },
    mitigateIncomingDamage(amount: number): number {
      if (!Number.isFinite(amount) || amount <= 0) return 0
      if (!alive() || id !== 'crimson-paladin' || state.hero!.inv > 0 || state.hero!.dash > 0) return amount
      const reduced = amount * (0.86 - Math.min(0.06, upgrades() * 0.02))
      const absorb = barrierLife > 0 ? Math.min(barrier, reduced) : 0
      barrier -= absorb
      return Math.max(0, reduced - absorb)
    },
    afterDamage(amount: number): void {
      if (!alive() || id !== 'crimson-paladin' || !Number.isFinite(amount) || amount <= 0 || counterCooldown > 0) return
      counterCooldown = 1.8
      const hero = state.hero!
      for (const enemy of nearby(state, 155, 2)) hit(state, enemy, hero.damage * (0.7 + upgrades() * 0.12), hooks)
      impact(state, hero.x, hero.y, 72, '#fb8f96', 0.45)
    },
    snapshot(): SpecializationSnapshot {
      return { cooldown, stealth, barrier, companions: companions() }
    },
  }
}
