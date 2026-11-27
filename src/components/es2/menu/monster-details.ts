import { BALANCE } from '../../../game/config'
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
export function monsterGroups(id: MobType): MonsterGroup[] {
  const groups = [legacyGroup(id)]
  if (id !== 'boss') return groups
  for (const boss of Object.values(BOSS_DEFINITIONS)) {
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
