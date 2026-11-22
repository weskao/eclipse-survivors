import type { ContentId, SfxCue, UpgradeId } from '../../types'

/** Weapon IDs are foreign keys into the optional weapons pack, never implementations. */
export interface Evolution2Recipe {
  readonly id: ContentId
  readonly title: string
  readonly icon: string
  readonly desc: string
  readonly weaponId: ContentId
  readonly weaponTitle: string
  readonly passiveId: UpgradeId
  readonly passiveTitle: string
  readonly weaponLevel: number
  readonly passiveLevel: number
  readonly cooldownSeconds: number
  readonly color: string
  readonly radius: number
  readonly sound: SfxCue
}

/** Order is canonical: registry eligibility and upgrade presentation are deterministic. */
export const EVOLUTION2_RECIPES: readonly Evolution2Recipe[] = [
  {
    id: 'evolution2:nightfall-torrent', title: 'Nightfall Torrent', icon: '🗡',
    desc: '黑影匕首接連追擊最多六名近敵，逐次衰減傷害',
    weaponId: 'weapons:shadow-daggers', weaponTitle: 'Shadow Daggers',
    passiveId: 'haste', passiveTitle: 'Haste', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 2.2, color: '#bb9cff', radius: 350, sound: 'knight',
  },
  {
    id: 'evolution2:dawn-judgment', title: 'Dawn Judgment', icon: '✝',
    desc: '聖槍穿刺一道直線上的敵人，並給予短暫防護',
    weaponId: 'weapons:holy-lance', weaponTitle: 'Holy Lance',
    passiveId: 'shield', passiveTitle: 'Shield', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 4, color: '#ffe3a4', radius: 430, sound: 'bolt',
  },
  {
    id: 'evolution2:crimson-reaper', title: 'Crimson Reaper', icon: '☾',
    desc: '血色鐮刀掃蕩附近敵人，以實際傷害少量吸血',
    weaponId: 'weapons:blood-scythe', weaponTitle: 'Blood Scythe',
    passiveId: 'heal', passiveTitle: 'Healing', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 4.8, color: '#ff647e', radius: 220, sound: 'knight',
  },
  {
    id: 'evolution2:singularity-minefield', title: 'Singularity Minefield', icon: '◉',
    desc: '三處重力地雷引爆，傷害並牽引爆炸區內的敵人',
    weaponId: 'weapons:arcane-mines', weaponTitle: 'Arcane Mines',
    passiveId: 'vortex', passiveTitle: 'Vortex', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 5.8, color: '#ad90ff', radius: 400, sound: 'vortex',
  },
  {
    id: 'evolution2:toxic-permafrost', title: 'Toxic Permafrost', icon: '❄',
    desc: '毒霜結界定期腐蝕並大幅減速周圍敵人',
    weaponId: 'weapons:poison-cloud', weaponTitle: 'Poison Cloud',
    passiveId: 'frost', passiveTitle: 'Frost', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 3.3, color: '#8bdfb8', radius: 230, sound: 'frost',
  },
  {
    id: 'evolution2:infinite-rebound', title: 'Infinite Rebound', icon: '✣',
    desc: '彈刃在相鄰敵人間連續跳躍，每次碰撞造成傷害',
    weaponId: 'weapons:ricochet-blades', weaponTitle: 'Ricochet Blades',
    passiveId: 'multi', passiveTitle: 'Multi', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 2.6, color: '#a9e9ff', radius: 450, sound: 'chain',
  },
  {
    id: 'evolution2:wild-hunt', title: 'Wild Hunt', icon: '🐺',
    desc: '狼魂撲擊遠方目標，擊退並打斷敵人的逼近',
    weaponId: 'weapons:spirit-wolves', weaponTitle: 'Spirit Wolves',
    passiveId: 'speed', passiveTitle: 'Speed', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 3.7, color: '#b7ffa5', radius: 490, sound: 'dash',
  },
  {
    id: 'evolution2:solar-tempest', title: 'Solar Tempest', icon: '☀',
    desc: '烈陽雷柱連擊最多五名敵人，額外附加短暫麻痺',
    weaponId: 'weapons:solar-beam', weaponTitle: 'Solar Beam',
    passiveId: 'chain', passiveTitle: 'Lightning (Chain)', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 4.4, color: '#ffe38b', radius: 490, sound: 'bolt',
  },
  {
    id: 'evolution2:celestial-collapse', title: 'Celestial Collapse', icon: '☄',
    desc: '兩次隕星引力爆炸，先將敵人吸向落點再造成重擊',
    weaponId: 'weapons:gravity-orbs', weaponTitle: 'Gravity Orbs',
    passiveId: 'meteor', passiveTitle: 'Meteor', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 7, color: '#ffa57c', radius: 460, sound: 'meteor',
  },
  {
    id: 'evolution2:spectral-volley', title: 'Spectral Volley', icon: '➶',
    desc: '向目標射出一列扇形穿雲靈箭，由既有投射物系統處理命中',
    weaponId: 'weapons:spectral-bow', weaponTitle: 'Spectral Bow',
    passiveId: 'chain', passiveTitle: 'Chain', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 3.3, color: '#b2eaff', radius: 460, sound: 'ranger',
  },
  {
    id: 'evolution2:bonefire-barrage', title: 'Bonefire Barrage', icon: '♨',
    desc: '在三名敵人位置引爆骨焰爆裂區，造成範圍火傷',
    weaponId: 'weapons:bone-spears', weaponTitle: 'Bone Spears',
    passiveId: 'blaze', passiveTitle: 'Blaze', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 5.4, color: '#ff9d68', radius: 420, sound: 'meteor',
  },
  {
    id: 'evolution2:verdant-snare', title: 'Verdant Snare', icon: '❧',
    desc: '藤蔓圍捕最多八名敵人，重創並長時間限制移動',
    weaponId: 'weapons:thorn-chain', weaponTitle: 'Thorn Chain',
    passiveId: 'magnet', passiveTitle: 'Magnet', weaponLevel: 3, passiveLevel: 3,
    cooldownSeconds: 5, color: '#86e4a0', radius: 265, sound: 'vortex',
  },
]
