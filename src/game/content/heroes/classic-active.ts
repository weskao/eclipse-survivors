import { BALANCE } from '../../config'
import { hit, damageHero } from '../../combat'
import type { GameHooks, GameState, HeroId, JobId, Mob, SfxCue } from '../../types'
import type { FactionBridge } from '../enemies/integration'
import { HERO_DEFINITIONS, isSpecializationId, type CastTarget, type HeroSpecializationAdapter } from './index'
import knightIcon from '../../../assets/es2/production/weapons/holy-lance@3x.webp'
import rangerIcon from '../../../assets/es2/production/weapons/spectral-bow@3x.webp'
import wizardIcon from '../../../assets/es2/production/weapons/gravity-orbs@3x.webp'
export interface ActiveSkillDefinition {
  readonly label: string
  readonly special: string
  readonly specialParams?: Readonly<Record<string, number>>
  readonly specialIconSrc: string
  readonly specialCooldown: number
  readonly audio: Readonly<{ special: SfxCue }>
}
const tuning = BALANCE.heroes.classicActive
export const CLASSIC_ACTIVE_DEFINITIONS: Readonly<Record<JobId, ActiveSkillDefinition>> = Object.freeze({
  knight: { label: '曙鋼騎士', special: '曙鋼裂地：震擊周圍最多八名敵人，並短暫免疫傷害。', specialIconSrc: knightIcon, specialCooldown: tuning.knight.cooldown, audio: { special: 'knight-special' } },
  ranger: { label: '夜痕遊俠', special: '星痕穿矢：鎖定射程內最近三名敵人，發射高傷害星矢。', specialIconSrc: rangerIcon, specialCooldown: tuning.ranger.cooldown, audio: { special: 'ranger-special' } },
  wizard: { label: '虛空術士', special: '虛空坍縮：引爆身旁奧術能量，重創周圍最多六名敵人。', specialIconSrc: wizardIcon, specialCooldown: tuning.wizard.cooldown, audio: { special: 'wizard-special' } },
})
export function getHeroActiveDefinition(id: HeroId): ActiveSkillDefinition {
  return isSpecializationId(id) ? HERO_DEFINITIONS[id] : CLASSIC_ACTIVE_DEFINITIONS[id]
}
export type ClassicHeroActive = Omit<HeroSpecializationAdapter, 'id'> & { readonly id: JobId }
type Faction = ReturnType<FactionBridge['factionsInRadius']>[number]
type Candidate = { actor: Mob; faction: false; d: number } | { actor: Faction; faction: true; d: number }
export function createClassicHeroActive(state: GameState, id: JobId, hooks: GameHooks, factions?: FactionBridge | null): ClassicHeroActive {
  const def = CLASSIC_ACTIVE_DEFINITIONS[id], config = tuning[id]
  let cooldown = 0
  let lastTargets: readonly CastTarget[] = []
  const alive = () => state.mode === 'play' && !!state.hero && state.hero.hp > 0
  return {
    id,
    reset() { cooldown = 0; lastTargets = [] },
    tick(dt) { if (alive() && Number.isFinite(dt) && dt > 0) cooldown = Math.max(0, cooldown - dt) },
    activate() {
      if (!alive() || cooldown > 0) return false
      const hero = state.hero!
      cooldown = def.specialCooldown
      if (config.invSeconds > 0) hero.inv = Math.max(hero.inv, config.invSeconds)
      const selected: Candidate[] = []
      const include = (candidate: Candidate) => {
        if (candidate.actor.hp <= 0 || !Number.isFinite(candidate.d) || candidate.d > config.reach ** 2) return
        let i = 0
        while (i < selected.length && selected[i]!.d <= candidate.d) i++
        if (i >= config.targets) return
        selected.splice(i, 0, candidate)
        if (selected.length > config.targets) selected.pop()
      }
      const distance = (a: CastTarget) => (a.x - hero.x) ** 2 + (a.y - hero.y) ** 2
      for (const actor of state.mobs) include({ actor, faction: false, d: distance(actor) })
      for (const actor of factions?.factionsInRadius(hero.x, hero.y, config.reach) ?? []) include({ actor, faction: true, d: distance(actor) })
      lastTargets = selected.map(({ actor }) => ({ x: actor.x, y: actor.y }))
      for (const target of selected) {
        if (target.faction) factions?.hitFaction(state, target.actor, hero.damage * config.damageMultiplier, hero.x, hero.y, hooks)
        else hit(state, target.actor, hero.damage * config.damageMultiplier, hooks)
      }
      hooks.sfx(def.audio.special)
      return true
    },
    modifyOutgoingDamage: amount => amount,
    consumeCriticalHit: () => false,
    mitigateIncomingDamage: amount => amount,
    afterDamage() {},
    canBeTargeted: () => !!state.hero && state.hero.hp > 0,
    dealDamage(target, amount) { const hp = target.hp; if (alive()) hit(state, target, amount, hooks); return Math.max(0, hp - target.hp) },
    receiveDamage(amount) { const hp = state.hero?.hp ?? 0; if (alive()) damageHero(state, amount, hooks); return Math.max(0, hp - (state.hero?.hp ?? 0)) },
    snapshot: () => ({ cooldown, stealth: 0, barrier: 0, companions: [] }),
    castTargets: () => lastTargets,
  }
}
