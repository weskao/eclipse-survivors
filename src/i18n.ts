import { ref } from 'vue'

/** Two production catalogs. Chinese display copy is the canonical lookup key. */
export const SUPPORTED_LOCALES = ['en', 'zh-TW'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]
export interface LocaleStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const LOCALE_STORAGE_KEY = 'eclipse-survivors-locale'

const english = new Map<string, string>([
  [
    "遊戲設定",
    "Game Settings"
  ],
  [
    "控制聲音、視覺效果與戰鬥體驗",
    "Adjust audio, visuals, and combat experience"
  ],
  [
    "音訊設定",
    "Audio settings"
  ],
  [
    "音訊",
    "Audio"
  ],
  [
    "背景音樂",
    "Background music"
  ],
  [
    "戰鬥音效",
    "Combat sound effects"
  ],
  [
    "畫面與動態",
    "Visuals & motion"
  ],
  [
    "畫面與動態效果設定",
    "Visual and motion settings"
  ],
  [
    "技能選擇畫面不觸發鏡頭震動；系統減少動態效果設定會優先套用。",
    "The skill selection screen does not shake the camera. Your system reduced-motion preference takes priority."
  ],
  [
    "升級動態效果",
    "Upgrade animation"
  ],
  [
    "柔和淡入",
    "Gentle fade"
  ],
  [
    "完全靜止",
    "No animation"
  ],
  [
    "戰鬥時鏡頭震動",
    "Combat camera shake"
  ],
  [
    "已開啟",
    "Enabled"
  ],
  [
    "已關閉",
    "Disabled"
  ],
  [
    "完成設定",
    "Done"
  ],
  [
    "將背景音樂靜音",
    "Mute background music"
  ],
  [
    "開啟背景音樂",
    "Enable background music"
  ],
  [
    "將遊戲音效靜音",
    "Mute game sound effects"
  ],
  [
    "開啟遊戲音效",
    "Enable game sound effects"
  ],
  [
    "設定",
    "Settings"
  ],
  [
    "開啟設定",
    "Open settings"
  ],
  [
    "開啟遊戲設定",
    "Open game settings"
  ],
  [
    "關閉設定",
    "Close settings"
  ],
  [
    "關閉對話視窗",
    "Close dialog"
  ],
  [
    "確認",
    "Confirm"
  ],
  [
    "取消",
    "Cancel"
  ],
  [
    "知道了",
    "Got it"
  ],
  [
    "注意：此操作無法復原。",
    "This action cannot be undone."
  ],
  [
    "重置所有遠征紀錄？",
    "Reset all expedition records?"
  ],
  [
    "成就、餘燼、戰績、造型及永久升級將全部刪除。",
    "All achievements, embers, records, cosmetics, and permanent upgrades will be deleted."
  ],
  [
    "永久刪除",
    "Delete permanently"
  ],
  [
    "音量",
    "Volume"
  ],
  [
    "音訊控制",
    "Audio controls"
  ],
  [
    "音量與音效調整",
    "Adjust volume and sound effects"
  ],
  [
    "即時音量控制",
    "Live volume controls"
  ],
  [
    "關閉音訊控制",
    "Close audio controls"
  ],
  [
    "靜音背景音樂",
    "Mute background music"
  ],
  [
    "恢復背景音樂",
    "Unmute background music"
  ],
  [
    "靜音遊戲音效",
    "Mute game sound effects"
  ],
  [
    "恢復遊戲音效",
    "Unmute game sound effects"
  ],
  [
    "遊戲音效",
    "Game sound effects"
  ],
  [
    "拖曳即時生效 · 點擊音符即可靜音",
    "Changes apply instantly · tap a music icon to mute"
  ],
  [
    "穿越失落的國度，成為黑夜之後的第一道曙光。",
    "Cross the lost kingdom and become the first light after the darkness."
  ],
  [
    "選擇命運的繼承者",
    "Choose Your Champion"
  ],
  [
    "每位英雄都擁有專屬的戰鬥風格。",
    "Every hero has a unique fighting style."
  ],
  [
    "選擇英雄",
    "Select hero"
  ],
  [
    "選擇遠征命運",
    "Choose Your Expedition"
  ],
  [
    "每一條道路都通往不同的試煉。",
    "Every path leads to a different trial."
  ],
  [
    "踏入幽暮之門",
    "Enter the Twilight Gate"
  ],
  [
    "啟用音樂",
    "Enable music"
  ],
  [
    "遠征模式",
    "Expedition mode"
  ],
  [
    "WASD / 方向鍵移動 · SPACE 衝刺 · 手機支援觸控操作",
    "Move with WASD / arrow keys · SPACE to dash · touch controls on mobile"
  ],
  [
    "暮光餘燼",
    "Twilight Embers"
  ],
  [
    "曙鋼騎士",
    "Dawnsteel Knight"
  ],
  [
    "重甲反擊 · 近戰爆發",
    "Armored counterattacks · melee burst"
  ],
  [
    "夜痕遊俠",
    "Nightmark Ranger"
  ],
  [
    "精準射擊 · 高機動",
    "Precision shooting · high mobility"
  ],
  [
    "虛空術士",
    "Void Arcanist"
  ],
  [
    "奧術魔彈 · 元素毀傷",
    "Arcane bolts · elemental destruction"
  ],
  [
    "影刃行者",
    "Shadowblade"
  ],
  [
    "靈契召喚師",
    "Spirit Summoner"
  ],
  [
    "緋紅聖騎",
    "Crimson Paladin"
  ],
  [
    "已選擇",
    "Selected"
  ],
  [
    "英雄造型",
    "Hero cosmetics"
  ],
  [
    "永久強化",
    "Permanent Upgrades"
  ],
  [
    "聖物庫",
    "Relic Vault"
  ],
  [
    "魔物圖鑑",
    "Monster Compendium"
  ],
  [
    "技能圖鑑",
    "Skill Compendium"
  ],
  [
    "成就殿堂",
    "Achievement Hall"
  ],
  [
    "遠征成就殿堂",
    "Expedition Achievement Hall"
  ],
  [
    "能力",
    "Abilities"
  ],
  [
    "聖物",
    "Relics"
  ],
  [
    "魔物",
    "Monsters"
  ],
  [
    "成就",
    "Achievements"
  ],
  [
    "升級",
    "Upgrade"
  ],
  [
    "已滿階",
    "Max rank"
  ],
  [
    "尚未解鎖",
    "Not unlocked"
  ],
  [
    "已解鎖",
    "Unlocked"
  ],
  [
    "未解鎖",
    "Locked"
  ],
  [
    "使用中",
    "Equipped"
  ],
  [
    "套用造型",
    "Equip cosmetic"
  ],
  [
    "重置永久進度…",
    "Reset permanent progression…"
  ],
  [
    "遠征次數",
    "Runs"
  ],
  [
    "勝利",
    "Victories"
  ],
  [
    "永久研究",
    "Permanent Research"
  ],
  [
    "英雄專精",
    "Hero Mastery"
  ],
  [
    "起始裝備與祝福",
    "Starting Equipment & Blessings"
  ],
  [
    "研究之樹",
    "Research Tree"
  ],
  [
    "永久成長 · 英雄傳承",
    "Permanent Progression · Hero Legacy"
  ],
  [
    "永久成長 v3",
    "Permanent Progression v3"
  ],
  [
    "研究、裝備與祝福只在下一場遠征開始時生效。",
    "Research, equipment, and blessings take effect on your next expedition."
  ],
  [
    "原初鎧甲",
    "Original Armor"
  ],
  [
    "曙光鎏金",
    "Gilded Dawn"
  ],
  [
    "森林斗篷",
    "Forest Cloak"
  ],
  [
    "月影獵裝",
    "Moonshadow Gear"
  ],
  [
    "初學星袍",
    "Novice Star Robe"
  ],
  [
    "星界法衣",
    "Astral Garment"
  ],
  [
    "破曉之刃",
    "Dawnbringer Blade"
  ],
  [
    "不滅之心",
    "Undying Heart"
  ],
  [
    "永久傷害 +4% / 階",
    "Permanent damage +4% / rank"
  ],
  [
    "永久生命 +12 / 階",
    "Permanent HP +12 / rank"
  ],
  [
    "聖物收藏庫",
    "Relic Collection"
  ],
  [
    "永久強化 · 英雄傳承",
    "Permanent Upgrades · Hero Legacy"
  ],
  [
    "覺醒能力圖鑑",
    "Awakened Ability Compendium"
  ],
  [
    "冒險者殿堂 · 記錄每一場遠征留下的印記",
    "Adventurer Hall · preserve every expedition's legacy"
  ],
  [
    "殿堂分類",
    "Hall sections"
  ],
  [
    "未知聖物",
    "Unknown Relic"
  ],
  [
    "尚未發現",
    "Not yet discovered"
  ],
  [
    "尚未遭遇",
    "Not yet encountered"
  ],
  [
    "尚未覺醒",
    "Not yet awakened"
  ],
  [
    "遠征中發現的聖物將顯示於此。尚無聖物資料可供展示。",
    "Relics found during expeditions appear here. No relic data is available yet."
  ],
  [
    "擊倒",
    "Defeated"
  ],
  [
    "十種敵人及預警",
    "Ten enemies and attack telegraphs"
  ],
  [
    "首領美術",
    "Boss artwork"
  ],
  [
    "四種場景美術",
    "Four environment previews"
  ],
  [
    "技能插畫",
    "Skill artwork"
  ],
  [
    "成就徽章",
    "Achievement badge"
  ],
  [
    "已達成",
    "Achieved"
  ],
  [
    "尚未達成",
    "Not achieved"
  ],
  [
    "UI 美術素材",
    "UI art assets"
  ],
  [
    "裝飾圖案",
    "Decoration"
  ],
  [
    "首領",
    "Boss"
  ],
  [
    "生命值",
    "Health"
  ],
  [
    "經驗值",
    "Experience"
  ],
  [
    "戰鬥統計",
    "Combat statistics"
  ],
  [
    "戰鬥操作",
    "Combat controls"
  ],
  [
    "暫停遊戲",
    "Pause game"
  ],
  [
    "暫停（P）",
    "Pause (P)"
  ],
  [
    "戰場小地圖",
    "Battlefield minimap"
  ],
  [
    "戰場地圖",
    "Battlefield Map"
  ],
  [
    "首領生命",
    "Boss HP"
  ],
  [
    "首領生命值",
    "Boss health"
  ],
  [
    "波次",
    "Wave"
  ],
  [
    "波次進度",
    "Wave progress"
  ],
  [
    "暫時效果",
    "Status effects"
  ],
  [
    "任務目標",
    "Objectives"
  ],
  [
    "目前目標",
    "Current Objective"
  ],
  [
    "戰鬥通知",
    "Combat notifications"
  ],
  [
    "已裝備遺物",
    "Equipped relics"
  ],
  [
    "疊加數量",
    "Stack count"
  ],
  [
    "已裝備技能",
    "Equipped skills"
  ],
  [
    "武器與技能",
    "Weapons & Skills"
  ],
  [
    "尚未取得技能",
    "No skills acquired"
  ],
  [
    "可用",
    "Ready"
  ],
  [
    "冷卻",
    "Cooldown"
  ],
  [
    "等級",
    "Level"
  ],
  [
    "已進化",
    "Evolved"
  ],
  [
    "技能",
    "Skill"
  ],
  [
    "秒",
    "sec"
  ],
  [
    "第",
    "Stage"
  ],
  [
    "階段",
    "phase"
  ],
  [
    "世界事件標記",
    "World-event markers"
  ],
  [
    "互動世界事件",
    "Interact with world event"
  ],
  [
    "奇幻生存戰遊戲畫面",
    "Fantasy survival game canvas"
  ],
  [
    "獲得新的命運刻印",
    "A New Mark of Destiny"
  ],
  [
    "命運覺醒 · 神兵進化",
    "Destiny Awakening · Weapon Evolution"
  ],
  [
    "打開遠古秘藏",
    "Open the Ancient Treasure"
  ],
  [
    "選擇一項能力，繼續你的遠征",
    "Choose an ability to continue your expedition"
  ],
  [
    "一份傳說之力，改變戰鬥之道",
    "Legendary power that transforms the battle"
  ],
  [
    "選擇並領取一項戰利品",
    "Select a reward to claim"
  ],
  [
    "點選卡牌或按 1–9 選擇 · 方向鍵切換焦點 · Enter 確認",
    "Select a card or press 1–9 · arrow keys to change focus · Enter to confirm"
  ],
  [
    "目前沒有可用的選項",
    "No options available"
  ],
  [
    "遊戲暫停",
    "Game paused"
  ],
  [
    "冒險暫停",
    "Expedition paused"
  ],
  [
    "繼續遊戲",
    "Resume"
  ],
  [
    "返回選角",
    "Return to hero selection"
  ],
  [
    "再次挑戰",
    "Try Again"
  ],
  [
    "返回主選單",
    "Return to Main Menu"
  ],
  [
    "存活時間",
    "Time Survived"
  ],
  [
    "魔物擊殺",
    "Monsters Defeated"
  ],
  [
    "英雄等級",
    "Hero Level"
  ],
  [
    "造成傷害",
    "Damage Dealt"
  ],
  [
    "承受傷害",
    "Damage Taken"
  ],
  [
    "剩餘生命",
    "Remaining HP"
  ],
  [
    "新成就",
    "New achievement"
  ],
  [
    "新造型",
    "New cosmetic"
  ],
  [
    "本次遠征英雄",
    "Expedition hero"
  ],
  [
    "載入遊戲中",
    "Loading game"
  ],
  [
    "世界正在甦醒…",
    "The world is awakening…"
  ],
  [
    "即將出征的英雄",
    "Hero entering the expedition"
  ],
  [
    "遠古遺物寶箱",
    "Ancient Relic Chest"
  ],
  [
    "選擇一項遺物，詛咒也會伴隨戰利品",
    "Choose a relic; cursed rewards have a price"
  ],
  [
    "遺物選項",
    "Relic options"
  ],
  [
    "普通",
    "Common"
  ],
  [
    "稀有",
    "Rare"
  ],
  [
    "史詩",
    "Epic"
  ],
  [
    "傳說",
    "Legendary"
  ],
  [
    "領取遺物",
    "Claim Relic"
  ],
  [
    "放棄寶箱",
    "Leave Chest"
  ],
  [
    "目前沒有可領取的遺物，可關閉寶箱繼續遊戲。",
    "No relics are available; close the chest to continue."
  ],
  [
    "重抽選項",
    "Reroll options"
  ],
  [
    "按 1–3 選取 · Tab 移動焦點 · Esc 關閉",
    "Press 1–3 to select · Tab to focus · Esc to close"
  ],
  [
    "神兵進化配方",
    "Weapon evolution recipe"
  ],
  [
    "可進化",
    "Available to evolve"
  ],
  [
    "尚未達成條件",
    "Requirements not met"
  ],
  [
    "命運進化",
    "Destiny Evolution"
  ],
  [
    "將武器與被動技能提升至指定等級，即可解鎖傳說之力。",
    "Level up the required weapon and passive to unlock legendary power."
  ],
  [
    "首領連戰 · Boss Rush",
    "Boss Rush"
  ],
  [
    "永恆星蝕 · Endless Eclipse",
    "Endless Eclipse"
  ],
  [
    "聖物追獵 · Relic Hunt",
    "Relic Hunt"
  ],
  [
    "詛咒遠征 · Cursed Expedition",
    "Cursed Expedition"
  ],
  [
    "混沌競技場 · Chaos Arena",
    "Chaos Arena"
  ],
  [
    "挑戰勝利",
    "Challenge complete"
  ],
  [
    "主動撤退",
    "Withdrawn"
  ],
  [
    "挑戰失敗",
    "Challenge failed"
  ],
  [
    "持續求生",
    "Surviving"
  ],
  [
    "挑戰進行中",
    "Challenge in progress"
  ],
  [
    "連續首領擊敗",
    "Bosses defeated in sequence"
  ],
  [
    "完成星蝕事件",
    "Eclipse events completed"
  ],
  [
    "聖物與守護首領",
    "Relics and guardian boss"
  ],
  [
    "雙守衛與生存目標",
    "Two guardians and survival"
  ],
  [
    "波次與最終首領",
    "Waves and final boss"
  ],
  [
    "聖物完整度",
    "Relic integrity"
  ],
  [
    "目前異變",
    "Active mutation"
  ],
  [
    "預估餘燼",
    "Estimated embers"
  ],
  [
    "初臨戰場",
    "First Blood"
  ],
  [
    "首次擊倒魔物",
    "Defeat your first monster"
  ],
  [
    "破曉之光",
    "Break of Dawn"
  ],
  [
    "獲得第一次勝利",
    "Earn your first victory"
  ],
  [
    "百魔斬",
    "Hundred Slayer"
  ],
  [
    "單局擊敗 100 隻魔物",
    "Defeat 100 monsters in one run"
  ],
  [
    "魔王終結者",
    "Boss Slayer"
  ],
  [
    "擊倒魔王",
    "Defeat the boss"
  ],
  [
    "屹立不搖",
    "Unshaken"
  ],
  [
    "單局存活 300 秒",
    "Survive 300 seconds in one run"
  ],
  [
    "三英傳說",
    "Three Heroes"
  ],
  [
    "使用三名英雄完成冒險",
    "Complete an expedition with all three heroes"
  ],
  [
    "迅捷遠征",
    "Swift Expedition"
  ],
  [
    "王國征途",
    "Kingdom Journey"
  ],
  [
    "無盡生存",
    "Endless Survival"
  ],
  [
    "詛咒試煉",
    "Cursed Trial"
  ],
  [
    "150 秒決戰 · 擊敗首領迎接黎明",
    "150-second showdown · defeat the boss and welcome the dawn"
  ],
  [
    "8 分鐘遠征 · 征服深淵魔王",
    "8-minute expedition · defeat the Abyssal Demon Lord"
  ],
  [
    "沒有時間限制 · 魔物愈來愈強",
    "No time limit · monsters grow stronger"
  ],
  [
    "210 秒 · 強敵侵襲與高壓戰鬥",
    "210 seconds · powerful enemies and intense combat"
  ]
])
const chinese = new Map<string, string>([
  ['TIME', '時間'], ['KILLS', '擊殺'], ['COMBO', '連擊'], ['RELICS', '遺物'],
  ['EQUIPPED', '已裝備'], ['WAVE', '波次'], ['PHASE', '階段'],
  ['VICTORY', '勝利'], ['DEFEAT', '失敗'],
])

export function detectLocale(languages: Iterable<unknown> = []): Locale {
  for (const language of languages) {
    if (/^zh($|[-_])/i.test(String(language))) return 'zh-TW'
    if (/^en($|[-_])/i.test(String(language))) return 'en'
  }
  return 'en'
}
export function savedLocale(storage?: LocaleStorage): Locale | null {
  try {
    const value = (storage ?? globalThis.localStorage).getItem(LOCALE_STORAGE_KEY)
    return value === 'en' || value === 'zh-TW' ? value : null
  } catch { return null }
}
function systemLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? [...navigator.languages] : navigator.language ? [navigator.language] : []
}
export function resolveInitialLocale(storage?: LocaleStorage, languages: Iterable<unknown> = systemLanguages()): Locale {
  return savedLocale(storage) ?? detectLocale(languages)
}

export const currentLocale = ref<Locale>(resolveInitialLocale())
export const getLocale = (): Locale => currentLocale.value

function syncDocument(): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = currentLocale.value
  document.title = currentLocale.value === 'en' ? 'Eclipse Survivors' : '暮境遠征｜ECLIPSE SURVIVORS'
  document.querySelector('meta[name="description"]')?.setAttribute('content', currentLocale.value === 'en'
    ? 'A fantasy survival action game featuring evolving skills, bosses and mobile controls.'
    : '奇幻生存動作遊戲：英雄、武器進化、首領挑戰與行動裝置操控。')
}
/** Only explicit player choices persist; startup system detection never writes storage. */
export function setLocale(locale: string, storage?: LocaleStorage): Locale {
  if (locale !== 'en' && locale !== 'zh-TW') return currentLocale.value
  currentLocale.value = locale
  syncDocument()
  try { (storage ?? globalThis.localStorage).setItem(LOCALE_STORAGE_KEY, locale) } catch { /* use in-memory locale */ }
  return currentLocale.value
}
export function applyDocumentLocale(): void { syncDocument() }

// Exact data strings work for immutable game definitions; phrases handle notices with live values.
const fragments = [...english.keys()].filter(key => key.length >= 2).sort((a, b) => b.length - a.length)
const expression = new RegExp(fragments.map(s => s.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&')).join('|'), 'g')
export function t(value: unknown, params?: Record<string, unknown>): string {
  let source = value === null || value === undefined ? '' : String(value)
  if (params) source = source.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.hasOwn(params, key) ? String(params[key]) : whole)
  if (currentLocale.value === 'zh-TW') return chinese.get(source) ?? source
  return english.get(source) ?? (/[\u3400-\u9fff]/.test(source)
    ? source.replace(expression, match => english.get(match) ?? match) : source)
}
export const formatNumber = (number: number): string => new Intl.NumberFormat(currentLocale.value).format(number)
