import { BALANCE } from './config'
import type { BaseUpgradeDef, JobDef, JobId, SceneDef, SkillRarity, UpgradeId } from './types'

export const TAU = 2 * Math.PI
export const MAX_MOBS = BALANCE.world.maxMobs
export const DURATION = BALANCE.world.duration
export const BOSS_TIME = BALANCE.world.bossTime
export const SCENE_SECONDS = BALANCE.world.sceneSeconds
export const DASH_COOLDOWN = BALANCE.world.dashCooldown
export const LOW_HP_PCT = BALANCE.world.lowHpPct
/** Illustrated courtyard size in world units. */
export const SCENE = BALANCE.world.scene

export const JOB: Record<JobId, JobDef> = {
  knight: { label: '曙鋼騎士', ...BALANCE.heroes.classic.knight },
  ranger: { label: '夜痕遊俠', ...BALANCE.heroes.classic.ranger },
  wizard: { label: '虛空術士', ...BALANCE.heroes.classic.wizard },
}
export const JOB_IDS = Object.keys(JOB) as JobId[]

export const MAX_LEVEL: Record<UpgradeId, number> = BALANCE.skills.maxLevels
const RARE_SKILLS: readonly UpgradeId[] = ['orb', 'bolt', 'frost', 'meteor', 'blaze', 'vortex', 'shield', 'chain']
const up = (id: UpgradeId, icon: string, title: string, desc: string): BaseUpgradeDef => ({
  id, icon, title, desc,
  rarity: (RARE_SKILLS.includes(id) ? 'rare' : 'common') as SkillRarity,
  maxLevel: MAX_LEVEL[id],
})
export const UP: readonly BaseUpgradeDef[] = [
  up('damage', '⚔', '銳利祝福', '所有傷害 +28%'),
  up('speed', '✣', '疾風腳步', '移動速度 +13%'),
  up('haste', 'ϟ', '迅捷之星', '攻擊間隔縮短 16%（可疊加）'),
  up('maxhp', '✚', '生命之光', '生命上限 +40，立即恢復最多 60 生命'),
  up('multi', '❖', '雙重魔力', '每級增加一次同時攻擊（最多四擊），射程 +1%'),
  up('orb', '◈', '旋轉護符', '增加一枚環繞飛刃並提高觸碰傷害'),
  up('magnet', '✧', '水晶磁力', '經驗吸取範圍每級增加 62'),
  up('heal', '❀', '自然治癒', '每級每秒恢復 1.05 生命'),
  up('bolt', 'ϟ', '落雷祝福', '週期落雷打擊魔物，高等級最多七名'),
  up('frost', '❄', '極寒新星', '定期釋放更大範圍冰霜衝擊並減速敵人'),
  up('meteor', '☄', '殞星轟擊', '召喚隕石砸落，擴大爆炸範圍'),
  up('blaze', '🔥', '焚天烈環', '周身火焰範圍隨等級增大，持續造成傷害'),
  up('vortex', '🌀', '虛空渦流', '擴大吸引周圍敵人並造成範圍傷害'),
  up('shield', '🛡', '聖光障壁', '每級減少 13% 受到的傷害（上限 52%），立即恢復最多 28 生命'),
  up('chain', '⚡', '連鎖雷擊', '定期在敵群間彈跳更強的閃電'),
]

export const SCENES: readonly SceneDef[] = [
  { name: '黎明遺庭', weather: 'sunshower', label: '晨光薄霧' },
  { name: '蒼雷聖域', weather: 'storm', label: '暴風雷雨' },
  { name: '霜華回廊', weather: 'snow', label: '極寒飛雪' },
  { name: '灰燼戰線', weather: 'embers', label: '熾焰灰燼' },
]
