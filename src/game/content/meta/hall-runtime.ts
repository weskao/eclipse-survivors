import tuning from '../../balance/hall-effect-tuning.json'
import type { GameHooks, GameState } from '../../types'
import type { HallRunSnapshot } from './hall-state'

export type HallDamageSource = 'basic' | 'weapon' | 'persistent' | 'summon' | 'hero' | 'proc'
type Target = { hp: number; max: number; slow?: number }
const capped = (value: number, cap: number) => Math.min(cap, Math.max(0, value))

export function createHallRuntime(snapshot: HallRunSnapshot) {
  const rank = (id: string) => snapshot.ranks[id] ?? 0
  return {
    snapshot, rank,
    stride: capped(rank('mobility-stride') * tuning.stride, tuning.movementCap),
    attackCooldown: 1 - capped(rank('offense-fervor') * tuning.fervor, tuning.cooldownCap),
    weaponCooldown: 1 - capped(rank('arcana-celerity') * tuning.celerity + rank('wizard-channel') * tuning.wizardChannel, tuning.cooldownCap),
    radius: 1 + capped(rank('arcana-reach') * tuning.reach + rank('wizard-circle') * tuning.wizardCircle, tuning.radiusCap),
    pickupRadius: 1 + capped(rank('hunt-magnet') * tuning.magnet, tuning.pickupCap),
    dashCooldown: 1 - capped(rank('mobility-dash') * tuning.dash, tuning.cooldownCap),
    xp: 1 + capped(rank('hunt-learning') * tuning.learning, tuning.xpCap),
    ember: capped(rank('hunt-fortune') * tuning.fortune, tuning.emberCap),
    regen: rank('defense-recovery') * tuning.recovery,
    momentum: 0, momentumUntil: 0, warHits: 0, warAt: 0, echoAt: tuning.echoCooldown,
    chorusAt: tuning.chorusCooldown, procAt: 0, afterwindUntil: 0, windstepUntil: 0, windstepAt: 0,
    shield: 0, shieldUntil: 0, wardAt: tuning.wardPeriod, lastStandAt: 0, bulwarkAt: 0,
    riposteUntil: 0, riposteAt: 0,
    hurtAt: -Infinity, dashAt: -Infinity, firstElite: false, reaperReady: false, hunterUntil: 0, guardianUntil: 0,
    bastionAt: 0, spellwindAt: 0, soulforgeAt: 0, soulwardAt: 0, soulwardUntil: 0,
    ambushReady: false, assassinAt: 0, legionUntil: 0, legionAt: 0, soulBondAt: 0, sanctuaryUntil: 0,
    markTarget: null as Target | null, markHits: 0,
  }
}
export type HallRuntime = ReturnType<typeof createHallRuntime>
export function installHallRun(state: GameState, snapshot: HallRunSnapshot): void {
  if (state.hall || !state.hero || snapshot.hero !== state.heroId || !Object.keys(snapshot.ranks).length) return
  const h = state.hall = createHallRuntime(snapshot)
  state.hero.damage *= 1 + capped(h.rank('offense-edge') * tuning.edge, tuning.damageCap)
  const hp = h.rank('defense-constitution') * tuning.constitution
  state.hero.max += hp
  state.hero.hp += hp
  state.hero.speed *= 1 + h.stride
  state.xpGainMultiplier *= h.xp
}
export function withHallSource(state: GameState, hooks: GameHooks, source: HallDamageSource): GameHooks {
  return state.hall ? { ...hooks, hallSource: source } : hooks
}
export function hallCritBonus(state: GameState, source?: HallDamageSource): number {
  const h = state.hall
  if (!h || source === 'proc') return 0
  return capped(h.rank('offense-precision') * tuning.precision +
    (source === 'basic' ? h.rank('shadowblade-blade') * tuning.shadowbladeBlade : 0), tuning.critCap)
}
export function hallOutgoing(state: GameState, amount: number, target: Target, source?: HallDamageSource): number {
  const h = state.hall
  if (!h || source === 'proc' || amount <= 0 || !Number.isFinite(amount)) return amount
  const r = h.rank
  const now = state.time
  let bonus = (now < h.momentumUntil ? h.momentum : 0) * r('offense-momentum') * tuning.momentum
  if (target.max > 0 && target.hp / target.max < tuning.executionHp) bonus += r('offense-execution') * tuning.execution
  if (source === 'basic') {
    bonus += r('knight-discipline') * tuning.knightDiscipline + r('ranger-aim') * tuning.rangerAim
    if (r('ranger-mark')) {
      if (h.markTarget !== target) { h.markTarget = target; h.markHits = 0 }
      if (h.markHits === 3) { bonus += r('ranger-mark') * tuning.rangerMark; h.markHits = 0 }
      else h.markHits++
    }
    if (now < h.windstepUntil && now >= h.windstepAt && r('mobility-windstep')) {
      bonus += tuning.windstepDamage
      h.windstepUntil = 0
      h.windstepAt = now + tuning.windstepCooldown
    }
    if (now < h.riposteUntil && now >= h.riposteAt && r('knight-riposte')) {
      bonus += r('knight-riposte') * tuning.knightRiposte
      h.riposteUntil = 0
      h.riposteAt = now + tuning.riposteCooldown
    }
  } else if (source === 'weapon' || source === 'persistent') {
    bonus += r('arcana-focus') * tuning.focus + r('wizard-study') * tuning.wizardStudy
    if ((target.slow ?? 0) > 0) bonus += r('arcana-resonance') * tuning.resonance
    if (source === 'persistent') bonus += r('summons-bond') * tuning.bond + r('summons-command') * tuning.command
  } else if (source === 'summon') bonus += r('summons-bond') * tuning.bond + r('spirit-summoner-pact') * tuning.spiritPact
  if (h.ambushReady && source !== 'hero') {
    h.ambushReady = false
    bonus += r('shadowblade-ambush') * tuning.shadowAmbush
    if (r('shadowblade-assassin') && now >= h.assassinAt && target.hp / target.max < tuning.executionHp) {
      bonus += tuning.shadowAssassinDamage
      h.assassinAt = now + tuning.shadowAssassinCooldown
    }
  }
  if (source === 'summon' && now < h.legionUntil) bonus += tuning.spiritLegionDamage
  if ((source === 'summon' || source === 'persistent') && now < h.guardianUntil) bonus += tuning.synergyGuardianDamage
  return amount * (1 + bonus)
}
/** Only accepted contact counts; the proc itself never re-enters this handler. */
export function hallExtraHit(state: GameState, amount: number, source?: HallDamageSource): number {
  const h = state.hall
  if (!h || !state.hero || state.hero.hp <= 0 || state.mode !== 'play' || !source || source === 'proc' || amount <= 0 || !Number.isFinite(amount)) return 0
  const now = state.time
  let bonus = 0
  if (source === 'basic' && h.rank('offense-war-master')) {
    h.warHits = Math.min(tuning.warHits, h.warHits + 1)
    if (h.warHits >= tuning.warHits && now >= h.warAt && now >= h.procAt) {
      h.warHits = 0
      h.warAt = now + tuning.warCooldown
      bonus = tuning.warDamage
      if (h.rank('synergy-blade-and-bastion') && now - h.hurtAt < tuning.synergyBastionSeconds && now >= h.bastionAt) {
        bonus *= 1 + tuning.synergyBastionDamage; h.bastionAt = now + tuning.synergyCooldown
      }
      if (h.reaperReady) { bonus *= 1 + tuning.synergyReaperDamage; h.reaperReady = false }
    }
  } else {
    const echo = (source === 'weapon' || source === 'persistent') && h.rank('arcana-echo') && now >= h.echoAt
    const chorus = (source === 'summon' || source === 'persistent') && h.rank('summons-chorus') && now >= h.chorusAt
    if ((echo || chorus) && now >= h.procAt) {
      if (echo) h.echoAt = now + tuning.echoCooldown
      if (chorus) h.chorusAt = now + tuning.chorusCooldown
      bonus = Math.max(echo ? tuning.echoDamage : 0, chorus ? tuning.chorusDamage : 0)
      if (echo && h.rank('synergy-spellwind') && now - h.dashAt < tuning.synergySpellwindSeconds && now >= h.spellwindAt) {
        bonus *= 1 + tuning.synergySpellwindDamage; h.spellwindAt = now + tuning.synergyCooldown
      }
      if (echo && chorus && h.rank('synergy-soulforge') && now >= h.soulforgeAt) {
        bonus *= 1 + tuning.synergySoulforgeDamage; h.soulforgeAt = now + tuning.synergyCooldown
      }
    }
  }
  if (bonus) h.procAt = now + tuning.procInterval
  return amount * bonus
}
export function hallKill(state: GameState, elite = false): void {
  const h = state.hall
  if (!h) return
  if (elite && !h.firstElite) {
    h.firstElite = true
    if (h.rank('synergy-hunter-instinct')) h.hunterUntil = state.time + tuning.synergyHunterSeconds
    if (h.rank('synergy-reaper')) h.reaperReady = true
  }
  if (!h.rank('offense-momentum')) return
  h.momentum = Math.min(tuning.momentumStacks, (state.time < h.momentumUntil ? h.momentum : 0) + 1)
  h.momentumUntil = state.time + tuning.momentumSeconds
}
export function grantShield(state: GameState, fraction: number, seconds: number): void {
  const h = state.hall, hero = state.hero
  if (!h || !hero || hero.hp <= 0 || fraction <= 0) return
  h.shield = Math.max(state.time < h.shieldUntil ? h.shield : 0, hero.max * fraction)
  h.shieldUntil = state.time + seconds
}
export function hallIncoming(state: GameState, amount: number, directContact = false, front = false): number {
  const h = state.hall, hero = state.hero
  if (!h || !hero) return amount
  const r = h.rank
  let reduction = r('defense-armor') * tuning.armor
  if (state.time < h.soulwardUntil) reduction += r('summons-soulward') * tuning.soulwardReduction
  if (hero.hp / hero.max < tuning.resolveHp) reduction += r('defense-resolve') * tuning.resolve
  if (directContact && hero.moveAmount > .05) reduction += r('mobility-evasion') * tuning.evasion
  if (directContact && front) reduction += r('knight-guard') * tuning.knightGuard
  return amount * (1 - capped(reduction, tuning.reductionCap))
}
export function hallAbsorb(state: GameState, amount: number): number {
  const h = state.hall
  if (!h || state.time >= h.shieldUntil || amount <= 0 || !Number.isFinite(amount)) return amount
  const absorbed = Math.min(h.shield, amount)
  h.shield -= absorbed
  return amount - absorbed
}
export function hallDamageTaken(state: GameState, amount: number, previousHp: number): void {
  const h = state.hall, hero = state.hero
  if (!h || !hero || hero.hp <= 0 || amount <= 0) return
  const now = state.time
  h.hurtAt = now
  if (h.rank('defense-last-stand') && now >= h.lastStandAt && previousHp / hero.max >= tuning.lastStandHp && hero.hp / hero.max < tuning.lastStandHp) {
    grantShield(state, tuning.lastStandShield, tuning.lastStandSeconds)
    h.lastStandAt = now + tuning.lastStandCooldown
    if (h.rank('synergy-guardian-spirits')) h.guardianUntil = now + tuning.synergyGuardianSeconds
  }
  if (h.rank('knight-riposte') && now >= h.riposteAt) h.riposteUntil = now + tuning.riposteSeconds
}
export function tickHall(state: GameState, dt: number, dashFinished: boolean): void {
  const h = state.hall, hero = state.hero
  if (!h || !hero || hero.hp <= 0 || state.mode !== 'play') return
  const now = state.time
  const regen = h.regen + (now < h.sanctuaryUntil ? tuning.paladinSanctuaryRegen : 0)
  if (regen) hero.hp = Math.min(hero.max, hero.hp + hero.max * regen * dt)
  if (now >= h.shieldUntil) h.shield = 0
  if (h.rank('defense-ward') && now >= h.wardAt) {
    grantShield(state, h.rank('defense-ward') * tuning.ward, tuning.wardSeconds)
    h.wardAt = now + tuning.wardPeriod
  }
  if (dashFinished) {
    h.dashAt = now
    h.afterwindUntil = now + tuning.afterwindSeconds
    h.windstepUntil = now + tuning.afterwindSeconds
    if (h.rank('knight-bulwark') && now >= h.bulwarkAt) {
      grantShield(state, tuning.bulwarkShield, tuning.bulwarkSeconds)
      h.bulwarkAt = now + tuning.bulwarkCooldown
    }
  }
}
export function hallMovement(state: GameState): number {
  const h = state.hall
  if (!h) return 1
  const wind = state.time < h.afterwindUntil ? h.rank('mobility-afterwind') * tuning.afterwind : 0
  const hunt = state.time < h.hunterUntil ? tuning.synergyHunterSpeed : 0
  return (1 + capped(h.stride + wind + hunt, tuning.movementCap)) / (1 + h.stride)
}
export function hallAttackDelay(state: GameState): number {
  const h = state.hall
  if (!h) return 1
  return Math.max(1 - tuning.cooldownCap, h.attackCooldown - ((state.hero?.moveAmount ?? 0) > .05 ? h.rank('ranger-skirmish') * tuning.rangerSkirmish : 0))
}
export function hallAttackRange(state: GameState): number {
  const h = state.hall
  return h && (state.hero?.moveAmount ?? 0) > .05 ? 1 + h.rank('mobility-hunter') * tuning.hunter : 1
}
export function hallSlow(state: GameState, target: object, seconds: number): number {
  return state.hall && !('type' in target && target.type === 'boss') ? seconds * (1 + state.hall.rank('arcana-frostbind') * tuning.frostbind) : seconds
}

export function hallRank(state: GameState, id: string): number { return state.hall?.rank(id) ?? 0 }
export function hallSummonInterval(state: GameState): number {
  return 1 - capped(hallRank(state, 'summons-command') * tuning.summonCommand + hallRank(state, 'spirit-summoner-pack') * tuning.spiritPack, tuning.cooldownCap)
}
export function hallEffectDuration(state: GameState): number {
  return 1 + hallRank(state, 'summons-tenacity') * tuning.tenacityDuration + hallRank(state, 'summons-duration') * tuning.summonDuration
}
export function hallSummonCast(state: GameState): void {
  const h = state.hall
  if (h && h.rank('summons-soulward') && state.time >= h.soulwardAt) {
    h.soulwardAt = state.time + tuning.soulwardCooldown
    h.soulwardUntil = state.time + tuning.soulwardSeconds
  }
}
