/**
 * Isolated expansion data. Deliberately not added to src/meta/modes.ts or RunModeId:
 * the integration owner must extend the shared selection, save and victory contracts.
 */
export type ObjectiveModeId =
  | 'boss-rush'
  | 'endless-eclipse'
  | 'relic-hunt'
  | 'cursed-expedition'
  | 'chaos-arena'

export interface ObjectiveModeDefinition {
  readonly id: ObjectiveModeId
  readonly title: string
  readonly description: string
  readonly victoryDescription: string
  readonly defeatDescription: string
  readonly preRunModifiers: readonly string[]
  /** null means truly endless: the evaluator never produces victory. */
  readonly timeLimitSeconds: number | null
  /** Survival is an explicit objective, not an implicit global win timer. */
  readonly surviveSeconds: number | null
  readonly bossReadySeconds: readonly number[]
  readonly relicReadySeconds: readonly number[]
  readonly waveReadySeconds: readonly number[]
  readonly majorEventIntervalSeconds: number | null
  readonly rewardEmbers: number
  readonly achievementId: `objectives:${string}`
  readonly enemyHp: number
  readonly enemyDamage: number
  readonly spawnFrequency: number
}

export const objectiveModeIds: readonly ObjectiveModeId[] = Object.freeze([
  'boss-rush', 'endless-eclipse', 'relic-hunt', 'cursed-expedition', 'chaos-arena',
])

/** Time gates are public encounter readiness rules, never automatic wins or spawns. */
export const OBJECTIVE_MODES: Readonly<Record<ObjectiveModeId, ObjectiveModeDefinition>> = Object.freeze({
  'boss-rush': {
    id: 'boss-rush',
    title: '首領連戰 · Boss Rush',
    description: '依序迎戰五位首領，每次擊敗後迎接更強的對手；闖關與獎勵均依實際擊殺進度結算。',
    victoryDescription: '於 480 秒內，依序擊敗五位已正式登場的首領才算勝利。',
    defeatDescription: '角色死亡、放棄挑戰或 480 秒截止仍未擊敗五名首領即失敗。',
    preRunModifiers: ['首領於 25／70／125／185／250 秒後逐一開放', '首領生命與攻擊逐階增強', '五連勝可獲得專屬徽章'],
    timeLimitSeconds: 480, surviveSeconds: null,
    bossReadySeconds: [25, 70, 125, 185, 250], relicReadySeconds: [], waveReadySeconds: [],
    majorEventIntervalSeconds: null, rewardEmbers: 300, achievementId: 'objectives:boss-rush-clear',
    enemyHp: 1.18, enemyDamage: 1.12, spawnFrequency: 1.05,
  },
  'endless-eclipse': {
    id: 'endless-eclipse',
    title: '永恆星蝕 · Endless Eclipse',
    description: '不設終點的求生遠征，每三分鐘出現一次重大星蝕事件，敵人會持續增強，依生存里程碑取得獎勵。',
    victoryDescription: '不會因時間或首領擊倒而自動勝利；只有持續存活、死亡或主動結束。',
    defeatDescription: '角色死亡或主動放棄即結束本次無盡求生，不設隱藏終止時間。',
    preRunModifiers: ['每 180 秒可完成一場星蝕事件', '難度按生存時間與事件進度提升', '按實際生存里程碑計算獎勵，最高 1500 餘燼'],
    timeLimitSeconds: null, surviveSeconds: null,
    bossReadySeconds: [], relicReadySeconds: [], waveReadySeconds: [],
    majorEventIntervalSeconds: 180, rewardEmbers: 28, achievementId: 'objectives:endless-eclipse-veteran',
    enemyHp: 1.32, enemyDamage: 1.18, spawnFrequency: 1.21,
  },
  'relic-hunt': {
    id: 'relic-hunt',
    title: '聖物追獵 · Relic Hunt',
    description: '依序回收四件遠古聖物，守護累積聖物完整度，最後擊敗守護首領才能帶走寶藏。',
    victoryDescription: '480 秒內集齊四件聖物、保持完整度大於零，並擊敗最後守護首領。',
    defeatDescription: '角色死亡、聖物完整度歸零、放棄或超過 480 秒即失敗。',
    preRunModifiers: ['聖物最早於 25／65／110／155 秒可收集', '收集後受到聖物破壞會降低共同完整度', '守護首領最早於 220 秒可迎戰'],
    timeLimitSeconds: 480, surviveSeconds: null,
    bossReadySeconds: [220], relicReadySeconds: [25, 65, 110, 155], waveReadySeconds: [],
    majorEventIntervalSeconds: null, rewardEmbers: 240, achievementId: 'objectives:relic-hunt-guardian',
    enemyHp: 1.1, enemyDamage: 1.15, spawnFrequency: 1.13,
  },
  'cursed-expedition': {
    id: 'cursed-expedition',
    title: '詛咒遠征 · Cursed Expedition',
    description: '承受每分鐘輪替的危險詛咒，在艱困環境下存活六分鐘，並消滅兩位階段守衛。',
    victoryDescription: '擊敗兩名於 100／240 秒後可迎戰的守衛，且至少存活 360 秒。',
    defeatDescription: '角色死亡、放棄或 420 秒硬性截止仍未完成目標即失敗。',
    preRunModifiers: ['每 60 秒輪替血價、夜幕、狂潮三種詛咒', '強敵傷害與數量高於普通遠征', '360 秒生存與雙守衛擊殺缺一不可'],
    timeLimitSeconds: 420, surviveSeconds: 360,
    bossReadySeconds: [100, 240], relicReadySeconds: [], waveReadySeconds: [],
    majorEventIntervalSeconds: null, rewardEmbers: 280, achievementId: 'objectives:cursed-expedition-survivor',
    enemyHp: 1.42, enemyDamage: 1.34, spawnFrequency: 1.29,
  },
  'chaos-arena': {
    id: 'chaos-arena',
    title: '混沌競技場 · Chaos Arena',
    description: '快節奏八波變化式戰鬥，輪替爆發、裝甲與蜂擁規則，最後挑戰混沌首領。',
    victoryDescription: '330 秒內依序清除八波遭遇戰並擊敗最後登場的競技場首領。',
    defeatDescription: '角色死亡、放棄或 330 秒截止仍未完成全部八波與首領即失敗。',
    preRunModifiers: ['八波遭遇戰依次於 15 秒起逐段開放', '每波切換蜂擁、鐵甲、狂暴規則', '第八波後於 170 秒開放最後首領'],
    timeLimitSeconds: 330, surviveSeconds: null,
    bossReadySeconds: [170], relicReadySeconds: [],
    waveReadySeconds: [15, 33, 51, 69, 87, 105, 123, 141],
    majorEventIntervalSeconds: null, rewardEmbers: 260, achievementId: 'objectives:chaos-arena-champion',
    enemyHp: 1.26, enemyDamage: 1.24, spawnFrequency: 1.38,
  },
})

// Freeze nested metadata once: callers and parallel packs cannot rewrite stage gates.
for (const mode of Object.values(OBJECTIVE_MODES)) {
  Object.freeze(mode.preRunModifiers)
  Object.freeze(mode.bossReadySeconds)
  Object.freeze(mode.relicReadySeconds)
  Object.freeze(mode.waveReadySeconds)
  Object.freeze(mode)
}

export function getObjectiveMode(id: ObjectiveModeId): ObjectiveModeDefinition {
  return OBJECTIVE_MODES[id]
}
