import { BALANCE } from './config'
import { hallSlow, hallWeaponCast, withHallSource } from './content/meta/hall-runtime'
import { combatTargets, hitTarget, nearestCombatTargets, slowTarget, type CombatTarget } from './combat'
import type { FactionBridge } from './content/enemies/integration'
import { impact, pushDamageNumber, pushParticle, zigzag } from './fx'
import { dist } from './math'
import type { EvolutionId, GameHooks, GameState, Hero, UpgradeDef, UpgradeId } from './types'

export interface EvolutionDef extends UpgradeDef {
  id: EvolutionId
  rarity: 'legendary'
  isEvolution: true
  requirements: string
  requires: readonly [UpgradeId, UpgradeId]
}

const evolution = (id: EvolutionId, icon: string, title: string, desc: string, requires: readonly [UpgradeId, UpgradeId], requirements: string): EvolutionDef =>
  ({ id, icon, title, desc, rarity: 'legendary', maxLevel: 1, isEvolution: true, requires, requirements })

/** Prerequisites are intentionally shared, never consumed; existing builds remain viable. */
export const EVOLUTIONS: readonly EvolutionDef[] = [
  evolution('frozen-thunderstorm', '✳', '冰霜雷暴', '每 4.4 秒喚起冰雷連擊，傷害並持續減速最多 5 名敵人', ['frost', 'chain'], '極寒新星 Lv.3 + 連鎖雷擊 Lv.3'),
  evolution('infernal-singularity', '✺', '煉獄奇點', '每 5 秒引爆灼熱引力場，牽引並焚燒周圍敵人', ['blaze', 'vortex'], '焚天烈環 Lv.3 + 虛空渦流 Lv.3'),
  evolution('apocalypse-rain', '☄', '末日星雨', '每 6.5 秒向敵群落下數道高傷害隕火爆炸', ['meteor', 'blaze'], '殞星轟擊 Lv.3 + 焚天烈環 Lv.3'),
  evolution('blade-tempest', '✦', '劍刃風暴', '每 2.4 秒釋放一圈高速劍刃，對周圍敵人造成傷害', ['orb', 'haste'], '旋轉護符 Lv.3 + 迅捷之星 Lv.3'),
  evolution('guardian-sanctuary', '✥', '守護聖域', '每 5.5 秒恢復生命並獲得短暫免傷結界', ['shield', 'heal'], '聖光障壁 Lv.3 + 自然治癒 Lv.3'),
]

export const EVOLUTION_COOLDOWN: Record<EvolutionId, number> = BALANCE.evolutions.cooldowns

export function eligibleEvolutions(hero: Hero): EvolutionDef[] {
  return EVOLUTIONS.filter(e => !hero.evolutions[e.id] && e.requires.every(id => (hero.skills[id] ?? 0) >= BALANCE.evolutions.unlockSkillLevel))
}

/** Every evolved power has its own timer; none replaces its prerequisite attacks. */
export function tickEvolutions(s: GameState, hooks: GameHooks, factions?: FactionBridge): void {
  const hero = s.hero
  if (!hero) return
  for (const evo of EVOLUTIONS) {
    if (!hero.evolutions[evo.id] || (hero.evolutionCd[evo.id] ?? 0) > 0) continue
    // A combat evolution waits for targets, while the sanctuary is useful when injured.
    const targets = nearestCombatTargets(combatTargets(s, factions), hero)
    if (evo.id !== 'guardian-sanctuary' && targets.length === 0) continue
    hero.evolutionCd[evo.id] = EVOLUTION_COOLDOWN[evo.id] * (s.hall?.weaponCooldown ?? 1)
    const area = evo.id === 'infernal-singularity' || evo.id === 'apocalypse-rain' || evo.id === 'blade-tempest'
    const attackHooks = withHallSource(s, hooks, 'weapon', area)
    let counted=false
    const strike=(target: CombatTarget, amount: number, origin: {x:number;y:number} = hero) => {
      if(target.hp<=0)return false
      if(!counted){hallWeaponCast(s);counted=true}
      return hitTarget(s,target,amount,attackHooks,factions,origin,'evolved')
    }
    const radius = s.hall?.radius ?? 1
    if (evo.id === 'frozen-thunderstorm') {
      for (const target of targets.filter(e => dist(e.x - hero.x, e.y - hero.y) <= 450).slice(0, 5)) {
        if (!strike(target,hero.damage * 1.45)) continue
        slowTarget(target, hallSlow(s, target, 2.4))
        zigzag(s, hero.x, hero.y - 40, target.x, target.y)
        impact(s, target.x, target.y, 65, '#9bf2ff', 1)
      }
      hooks.sfx('bolt')
    } else if (evo.id === 'infernal-singularity') {
      impact(s, hero.x, hero.y, 235, '#ff815d', 1.5)
      for (const target of targets) {
        const d = dist(target.x - hero.x, target.y - hero.y)
        if (d > 250 * radius) continue
        target.x += (hero.x - target.x) * 0.32
        target.y += (hero.y - target.y) * 0.32
        strike(target,hero.damage * 1.9)
        pushParticle(s, { x: target.x, y: target.y, life: 0.65, max: 0.65, color: '#ff8a50', r: 12, type: 'ember', vy: -30 })
      }
      hooks.sfx('vortex')
    } else if (evo.id === 'apocalypse-rain') {
      for (const center of targets.slice(0, 4)) {
        if (center.hp <= 0) continue
        pushParticle(s, { x: center.x, y: center.y, life: 0.85, max: 0.85, color: '#ff9369', r: 21, type: 'meteor' })
        impact(s, center.x, center.y, 135, '#ff9864', 1.4)
        for (const target of targets) {
          if (target.hp > 0 && dist(target.x - center.x, target.y - center.y) < 130 * radius) strike(target,hero.damage * 2.1,center)
        }
      }
      hooks.sfx('meteor')
    } else if (evo.id === 'blade-tempest') {
      impact(s, hero.x, hero.y, 150, '#b2e9ff', 1)
      for (let i = 0; i < 7; i++) {
        s.swipes.push({ x: hero.x, y: hero.y, a: i * Math.PI * 2 / 7, life: 0.3, max: 0.3, r: 110 })
      }
      for (const target of targets) {
        if (dist(target.x - hero.x, target.y - hero.y) < 175 * radius) strike(target,hero.damage * 1.5)
      }
    } else if (evo.id === 'guardian-sanctuary') {
      const before = hero.hp
      hero.hp = Math.min(hero.max, hero.hp + Math.max(12, hero.max * 0.1))
      if (hero.hp > before) pushDamageNumber(s, {x:hero.x,y:hero.y-56,life:.62,value:Math.round(hero.hp-before),boss:false,kind:'heal'})
      hero.inv = Math.max(hero.inv, 0.7)
      impact(s, hero.x, hero.y, 120, '#a4ffe5', 1.7)
    }
  }
}
