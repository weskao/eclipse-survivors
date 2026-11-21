import type { JobDef, JobId, SceneDef, UpgradeDef, UpgradeId } from './types'

export const TAU = 2 * Math.PI
export const MAX_MOBS = 130
export const DURATION = 150
export const BOSS_TIME = 92
export const SCENE_SECONDS = 36
/** Illustrated courtyard size in world units. */
export const SCENE = { width: 2200, height: 1238 } as const

export const JOB: Record<JobId, JobDef> = {
  knight: { label: '曙鋼騎士', hp: 175, speed: 190, damage: 32, delay: 0.57, range: 112 },
  ranger: { label: '夜痕遊俠', hp: 115, speed: 218, damage: 22, delay: 0.36, range: 430 },
  wizard: { label: '虛空術士', hp: 110, speed: 196, damage: 39, delay: 0.68, range: 390 },
}
export const JOB_IDS = Object.keys(JOB) as JobId[]

const up = (id: UpgradeId, icon: string, title: string, desc: string): UpgradeDef => ({ id, icon, title, desc })
export const UP: readonly UpgradeDef[] = [
  up('damage', '⚔', '銳利祝福', '所有傷害 +25%'),
  up('speed', '✣', '疾風腳步', '移動速度 +12%'),
  up('haste', 'ϟ', '迅捷之星', '攻擊速度 +15%'),
  up('maxhp', '✚', '生命之光', '生命上限 +35 並治療'),
  up('multi', '❖', '雙重魔力', '每次額外攻擊一次'),
  up('orb', '◈', '旋轉護符', '增加一枚環繞飛刃'),
  up('magnet', '✧', '水晶磁力', '吸取經驗的範圍增加'),
  up('heal', '❀', '自然治癒', '每秒恢復少量生命'),
  up('bolt', 'ϟ', '落雷祝福', '週期落雷打擊魔物'),
  up('frost', '❄', '極寒新星', '定期釋放冰霜衝擊並減速敵人'),
  up('meteor', '☄', '殞星轟擊', '召喚隕石砸落在敵群中央'),
  up('blaze', '🔥', '焚天烈環', '在周身噴發火焰造成持續傷害'),
  up('vortex', '🌀', '虛空渦流', '吸引周圍敵人並造成範圍傷害'),
  up('shield', '🛡', '聖光障壁', '減少受到的傷害並獲得護盾光環'),
  up('chain', '⚡', '連鎖雷擊', '定期在敵群間彈跳閃電'),
]

export const SCENES: readonly SceneDef[] = [
  { name: '黎明遺庭', weather: 'sunshower', label: '晨光薄霧' },
  { name: '蒼雷聖域', weather: 'storm', label: '暴風雷雨' },
  { name: '霜華回廊', weather: 'snow', label: '極寒飛雪' },
  { name: '灰燼戰線', weather: 'embers', label: '熾焰灰燼' },
]
