// XP, level-ups, weighted blessings and evolution upgrades.
import { BALANCE } from './config'
import { MAX_LEVEL, UP } from './constants'
import type { ContentRegistry } from './content/registry'
import { EVOLUTIONS, eligibleEvolutions } from './evolutions'
import { burst, impact } from './fx'
import { random } from './math'
import type { AbilityId, ContentId, GameHooks, GameState, Hero, SkillRarity, UpgradeDef, UpgradeId } from './types'

export function addXp(s: GameState, n: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero) return
  hero.xp += n * s.xpGainMultiplier
  while (hero.xp >= hero.need) {
    hero.xp -= hero.need
    hero.level++
    hero.need = Math.round(hero.need * BALANCE.progression.growthMultiplier + BALANCE.progression.growthFlat)
    s.levelQueue++
    hero.levelAnim = 1.1
    impact(s, hero.x, hero.y, 88, '#ffe1a8', 1.8)
    burst(s, hero.x, hero.y, '#fff0ba', 20)
    hooks.message(`✨ 等級提升！ Lv.${hero.level}`)
  }
  if (s.levelQueue && s.mode === 'play') hooks.offerUpgrades()
}

const WEIGHT: Record<SkillRarity, number> = BALANCE.progression.rarityWeights

const AREA_SKILLS = new Set<string>(BALANCE.progression.groups.area)
const SUPPORT_SKILLS = new Set<string>(BALANCE.progression.groups.support)
const MOBILITY_SKILLS = new Set<string>(BALANCE.progression.groups.mobility)

function skillGroup(id: AbilityId): 'area' | 'support' | 'mobility' | 'attack' | null {
  if (AREA_SKILLS.has(id)) return 'area'
  if (SUPPORT_SKILLS.has(id)) return 'support'
  if (MOBILITY_SKILLS.has(id)) return 'mobility'
  if (BALANCE.progression.groups.attack.includes(id as UpgradeId) || id.startsWith('weapons:')) return 'attack'
  return null
}

/** Seedable weighted sampling without replacement. Unlocked evolutions get one guaranteed slot. */
export function pickUpgrades(hero?: Hero, rng: () => number = random, registry?: ContentRegistry, state?: GameState): UpgradeDef[] {
  const candidates: UpgradeDef[] = hero
    ? UP.filter(u => (hero.skills[u.id] ?? 0) < MAX_LEVEL[u.id]).map(u => ({ ...u, level: hero.skills[u.id] ?? 0 }))
    : [...UP]
  if (hero && registry && state) {
    candidates.push(...registry.eligible(state).map(a => ({ ...a, level: state.content.levels[a.id] ?? 0 })))
  }
  // Existing investments guide this run's build without removing random choices.
  // Capped skills still inform the type preference, but cannot be offered again.
  const invested = new Set<string>()
  if (hero) for (const [id, level] of Object.entries(hero.skills)) {
    if ((level ?? 0) > 0) {
      const group = skillGroup(id as UpgradeId)
      if (group) invested.add(group)
    }
  }
  if (state) for (const [id, level] of Object.entries(state.content.levels)) {
    if ((level ?? 0) > 0) {
      const group = skillGroup(id as ContentId)
      if (group) invested.add(group)
    }
  }
  const weightOf = (upgrade: UpgradeDef): number => {
    const level = upgrade.level ?? 0
    const group = skillGroup(upgrade.id)
    return WEIGHT[upgrade.rarity] * (1 + Math.min(BALANCE.progression.focusMaxBonus, level * BALANCE.progression.focusPerRank)
      + (level === 0 && group && invested.has(group) ? BALANCE.progression.sameGroupBonus : 0))
  }
  const available = hero ? eligibleEvolutions(hero) : []
  const selected: UpgradeDef[] = []
  if (available.length) {
    const index = Math.min(available.length - 1, Math.floor(rng() * available.length))
    selected.push({ ...available[index]!, level: 0 })
  }
  while (selected.length < BALANCE.progression.choiceCount && candidates.length) {
    const total = candidates.reduce((sum, u) => sum + weightOf(u), 0)
    let roll = Math.min(1 - Number.EPSILON, Math.max(0, rng())) * total
    const index = candidates.findIndex(u => (roll -= weightOf(u)) < 0)
    selected.push(candidates.splice(index < 0 ? candidates.length - 1 : index, 1)[0]!)
  }
  return selected
}

const MESSAGES: Partial<Record<UpgradeId, string>> = {
  magnet: '水晶磁力增強！',
  meteor: '殞星之力覺醒！',
  vortex: '虛空渦流更強大了！',
  blaze: '焚天烈環開始燃燒！',
  frost: '極寒新星冰封敵人！',
  chain: '連鎖雷擊激活！',
}

/** Invalid or capped picks do not change state, stats, or the pending level queue. */
export function applyUpgrade(s: GameState, id: AbilityId, hooks: GameHooks, registry?: ContentRegistry): boolean {
  const hero = s.hero
  if (!hero) return false
  const custom = registry?.getAbility(id)
  if (custom && registry) {
    if (!registry.acquire(s, id as ContentId, hooks)) return false
    hooks.message(`✦ ${custom.title}`)
  } else if (id.includes(':')) {
    return false
  } else {
    const evolution = EVOLUTIONS.find(e => e.id === id)
    if (evolution) {
      if (!eligibleEvolutions(hero).some(e => e.id === id)) return false
      hero.evolutions[evolution.id] = true
      hero.evolutionCd[evolution.id] = 0
      hooks.message(`✦ ${evolution.title} · 傳說進化！`)
    } else {
      const up = UP.find(u => u.id === id)
      if (!up || (hero.skills[up.id] ?? 0) >= MAX_LEVEL[up.id]) return false
      hero.skills[up.id] = (hero.skills[up.id] ?? 0) + 1
      if (id === 'damage') hero.damage *= BALANCE.skills.statUpgrades.damageMultiplier
      if (id === 'speed') hero.speed *= BALANCE.skills.statUpgrades.speedMultiplier
      if (id === 'haste') hero.delay *= BALANCE.skills.statUpgrades.attackDelayMultiplier
      if (id === 'multi') hero.range *= BALANCE.skills.statUpgrades.multiRangeMultiplier
      if (id === 'maxhp') {
        hero.max += BALANCE.skills.statUpgrades.maxHpAdded
        hero.hp = Math.min(hero.max, hero.hp + BALANCE.skills.statUpgrades.maxHpHealing)
      }
      if (id === 'shield') hero.hp = Math.min(hero.max, hero.hp + BALANCE.skills.statUpgrades.shieldHealing)
      const msg = MESSAGES[up.id]
      if (msg) hooks.message(msg)
    }
  }
  s.levelQueue = Math.max(0, s.levelQueue - 1)
  hero.levelAnim = Math.max(hero.levelAnim, 0.8)
  return true
}
