import { BALANCE } from '../../../game/config'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../../game/content/enemies/definitions'
import { isFactionMonster, isNamedBoss, type MonsterId } from '../../../game/monster-catalog'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import { BOSS_ATTACKS, BOSS_DEFINITIONS, type BossAttackId } from '../../../game/content/bosses/definitions'
import { bossAttackImageSrc } from '../../../game/content/bosses/attack-art'
import type { AbilityId, EnemyAttack, MobType } from '../../../game/types'
import { skillImageSrc } from '../../../game/ui-art'
import { t } from '../../../i18n'

export interface MonsterStat { label: string; value: string | number; name: string }
export interface MonsterSkill { id: string; title: string; icon: string; description: string; detail: string }
export interface MonsterGroup { id: string; title?: string; color?: string; stats: MonsterStat[]; skills: MonsterSkill[] }
const enemyDossierArt = import.meta.glob('../../../assets/es2/production/skills/enemy-dossier/*@3x.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const attacks: Record<EnemyAttack, { title: string; description: string; art: AbilityId }> = {
  pounce: { title: '躍擊', description: '瞄準旅人後向前撲擊。', art: 'speed' },
  dive: { title: '俯衝', description: '蓄勢後高速俯衝，穿越攻擊路徑。', art: 'haste' },
  jab: { title: '突刺', description: '向預先瞄準的位置發動近身突刺。', art: 'damage' },
  slam: { title: '震地重擊', description: '蓄力後對周圍範圍造成傷害。', art: 'meteor' },
  bolt: { title: '魔力彈幕', description: '朝旅人發射魔法投射物。', art: 'bolt' },
  summon: { title: '召喚爪牙', description: '召喚魔物加入戰鬥。', art: 'multi' },
}
const legacyAttacks: Record<MobType, readonly EnemyAttack[]> = {
  slime: ['pounce'], bat: ['dive'], goblin: ['jab'], golem: ['slam'], warlock: ['bolt'], boss: ['bolt', 'slam', 'summon'],
}
const bossNames: Record<BossAttackId, string> = {
  'shadow-fan': '暗影扇射', 'darkness-field': '黑暗領域', 'shadow-cross': '暗影交錯',
  'abyss-summon': '深淵召喚', 'abyss-collapse': '深淵塌陷', 'shadow-storm': '暗影風暴',
  'ice-fan': '寒冰扇射', 'frost-patch': '寒霜地帶', 'glacial-ring': '冰川之環',
  'rotating-shelter': '旋轉庇護區', 'winter-burst': '凜冬爆發', 'ice-storm': '冰晶風暴',
  'titan-slam': '泰坦重擊', 'ember-line': '餘燼直擊', 'eruption': '熔岩噴發',
  'flame-wave': '烈焰浪潮', 'titan-rage': '泰坦之怒', 'radiant-lance': '聖光之矛',
  'light-ring': '聖光之環', 'void-fan': '虛空扇射', 'shadow-sweep': '暗影橫掃',
  'twilight-ground': '暮光領域', 'eclipse-wedge': '星蝕扇區', 'eclipse-cross': '星蝕交錯',
  'seraph-finale': '熾天終曲',
}
function stat(label: string, name: string, value: string | number): MonsterStat {
  return { label, name: t(name), value }
}
function legacyGroup(id: MobType): MonsterGroup {
  const config = BALANCE.enemies
  return {
    id,
    title: id === 'boss' ? t('原始首領') : undefined,
    stats: [
      stat('HP', '生命', config.baseHp[id]),
      stat('ATK', '攻擊力', id === 'boss' ? config.bossDamage : config.baseDamage),
      stat('SPD', '移動速度', config.baseSpeed[id]),
      stat('RNG', '攻擊觸發距離', config.ai.near[id]),
    ],
    skills: legacyAttacks[id].map(attack => ({
      id: attack, title: t(attacks[attack].title), icon: enemyDossierArt[`../../../assets/es2/production/skills/enemy-dossier/${attack}@3x.webp`] ?? skillImageSrc(attacks[attack].art),
      description: t(attacks[attack].description),
      detail: t('蓄力 {seconds} 秒', { seconds: Number((config.ai.windup[attack] + (id === 'boss' ? config.ai.bossWindupExtra : 0)).toFixed(2)) }),
    })),
  }
}
const factionSkills: Record<FactionKind, { title: string; description: string }> = {
  'shadow-assassin': { title: '暗影突襲', description: '迂迴接近後快速突進攻擊。' },
  'necromancer': { title: '死靈召喚', description: '召喚爪牙加入戰鬥。' },
  'dark-archer': { title: '暗影箭矢', description: '保持距離並發射遠程箭矢。' },
  'plague-carrier': { title: '疫病蔓延', description: '在瞄準位置留下持續毒傷區域。' },
  'shield-guardian': { title: '盾牌猛擊', description: '近距離盾擊，正面防禦可減少承受傷害。' },
  'phantom': { title: '幽影突擊', description: '短暫相位移動後進行近身攻擊。' },
  'fire-imp': { title: '烈焰爆破', description: '在瞄準位置形成燃燒區域。' },
  'frost-wraith': { title: '寒霜飛彈', description: '發射可造成冰凍效果的投射物。' },
  'berserker': { title: '狂暴重擊', description: '近身重擊，低生命時移動更快。' },
  'crystal-sentinel': { title: '晶體射線', description: '鎖定方向並蓄力發射直線攻擊。' },
}
export function monsterGroups(id: MonsterId): MonsterGroup[] {
  if (isFactionMonster(id)) {
    const def = ENEMY_DEFINITIONS[id], skill = factionSkills[id]
    return [{ id, color: def.telegraphColor, stats: [
      stat('HP', '生命', def.hp), stat('ATK', '攻擊力', def.damage),
      stat('SPD', '移動速度', def.speed), stat('RNG', '攻擊觸發距離', def.range),
    ], skills: [{ id, title: t(skill.title), icon: enemyDossierArt[`../../../assets/es2/production/skills/enemy-dossier/${id}@3x.webp`] ?? WORLD_ART.enemies[id].telegraph,
      description: t(skill.description), detail: t('蓄力 {seconds} 秒', { seconds: def.windup }) }] }]
  }
  if (!isNamedBoss(id)) return [legacyGroup(id)]
  const groups: MonsterGroup[] = []
  {
    const boss = BOSS_DEFINITIONS[id]
    const ids = [...new Set(boss.phases.flat())]
    const damage = ids.map(key => BOSS_ATTACKS[key].damage).filter(value => value > 0)
    groups.push({
      id: boss.id, title: t(boss.title), color: boss.color,
      stats: [
        stat('HP', '生命', boss.health),
        stat('ATK', '技能基礎傷害範圍', damage.length ? `${Math.min(...damage)}–${Math.max(...damage)}` : '—'),
        stat('SPD', '移動速度', BALANCE.bosses.movement[boss.id].speed),
        stat('P', '階段數', boss.phases.length),
      ],
      skills: ids.map(key => {
        const attack = BOSS_ATTACKS[key]
        const phases = boss.phases.flatMap((list, index) => list.includes(key) ? [`P${index + 1} · ${t(boss.phaseNames[index])}`] : [])
        const kind = { projectile: '投射物', zone: '持續傷害區域', burst: '瞬間範圍攻擊', summon: '召喚魔物' }[attack.kind]
        const shape = { beam: '直線', ring: '環形', circle: '圓形', arena: '戰場區域' }[attack.shape]
        const art: AbilityId = attack.kind === 'summon' ? 'multi' : attack.kind === 'projectile' ? 'bolt' :
          attack.shape === 'ring' ? 'orb' : attack.shape === 'beam' ? 'chain' : attack.kind === 'zone' ? 'vortex' : 'meteor'
        return {
          id: key, title: t(bossNames[key]), icon: bossAttackImageSrc(key) ?? skillImageSrc(art),
          description: `${phases.join(' / ')} · ${t(kind)} · ${t(shape)}`,
          detail: t('傷害 {damage} · 蓄力 {seconds} 秒', { damage: attack.damage, seconds: attack.windup }),
        }
      }),
    })
  }
  return groups
}
