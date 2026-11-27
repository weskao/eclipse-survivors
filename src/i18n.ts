import { ref } from 'vue'
import { BALANCE } from './game/config'

/** Two production catalogs. Chinese display copy is the canonical lookup key. */
export const SUPPORTED_LOCALES = ['en', 'zh-TW'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]
export interface LocaleStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const LOCALE_STORAGE_KEY = 'eclipse-survivors-locale'

const english = new Map<string, string>([
  ["暗影突襲","Shadow dash"],
  ["迂迴接近後快速突進攻擊。","Strafes before rapidly dashing into attack range."],
  ["死靈召喚","Raise minions"],
  ["召喚爪牙加入戰鬥。","Summons minions into combat."],
  ["暗影箭矢","Shadow arrow"],
  ["保持距離並發射遠程箭矢。","Keeps distance and fires ranged arrows."],
  ["疫病蔓延","Plague spill"],
  ["在瞄準位置留下持續毒傷區域。","Leaves a damaging poison zone at the aimed position."],
  ["盾牌猛擊","Shield bash"],
  ["近距離盾擊，正面防禦可減少承受傷害。","Bashes nearby targets and reduces damage from the front."],
  ["幽影突擊","Phantom strike"],
  ["短暫相位移動後進行近身攻擊。","Briefly phases before striking nearby targets."],
  ["烈焰爆破","Flame burst"],
  ["在瞄準位置形成燃燒區域。","Creates a burning zone at the aimed position."],
  ["寒霜飛彈","Frost missile"],
  ["發射可造成冰凍效果的投射物。","Fires a projectile that can inflict freeze."],
  ["狂暴重擊","Berserker strike"],
  ["近身重擊，低生命時移動更快。","Strikes at close range and moves faster at low health."],
  ["晶體射線","Crystal beam"],
  ["鎖定方向並蓄力發射直線攻擊。","Locks its aim and releases a charged line attack."],
  ["擁有多階段招式的遠征首領。","An expedition boss with multiple attack phases."],
  ["歷史紀錄可能包含未區分的首領擊倒數。","Historical records may contain unidentified boss kills."],
  ["最高等階達成","Maximum rank achieved"],
  ["新研究已開啟","New research available"],
  ["展開節點說明","Show node details"],
  ["收起節點說明","Hide node details"],
  ["成長分類","Growth categories"],
  ["選取節點後升級","Select node to upgrade"],
  ["節點詳情","Node details"],
  ["目前效果","Current effect"],
  ["下一階效果","Next rank effect"],
  ["技能說明","Skill description"],
  ["每階提升","Gain per rank"],
  ["前置條件","Prerequisites"],
  ["可升級","Available"],
  ["餘燼不足","Not enough embers"],
  ["升級成功","Upgrade complete"],
  ["距下一級尚需 {xp} XP","{xp} XP to next level"],
  ["升級 · {cost} ✧","Upgrade · {cost} ✧"],
  ["攻擊觸發距離","Attack trigger distance"],
  ["原始首領","Original boss"],
  ["技能基礎傷害範圍","Base skill damage range"],
  ["階段數","Phases"],
  ["魔物基礎數值","Base monster stats"],
  ["魔物招式","Monster abilities"],
  ["基礎數值不含遠征難度、時間成長及菁英加成。","Base stats exclude expedition difficulty, time scaling and elite bonuses."],
  ["首領紀錄為共用擊殺數；以下為各首領的基礎資料，並非個別遭遇紀錄。","Boss kills are tracked collectively; the following are base reference profiles, not individual encounter records."],
  ["躍擊","Pounce"],
  ["瞄準旅人後向前撲擊。","Lunges forward after targeting the adventurer."],
  ["俯衝","Dive"],
  ["蓄勢後高速俯衝，穿越攻擊路徑。","Dives at high speed along the attack path after a windup."],
  ["突刺","Jab"],
  ["向預先瞄準的位置發動近身突刺。","Jabs toward a previously targeted position."],
  ["震地重擊","Ground slam"],
  ["蓄力後對周圍範圍造成傷害。","Charges up and damages the surrounding area."],
  ["魔力彈幕","Arcane barrage"],
  ["朝旅人發射魔法投射物。","Fires magical projectiles toward the adventurer."],
  ["召喚爪牙","Summon minions"],
  ["召喚魔物加入戰鬥。","Summons monsters to join the fight."],
  ["蓄力 {seconds} 秒","Windup {seconds}s"],
  ["傷害 {damage} · 蓄力 {seconds} 秒","Damage {damage} · Windup {seconds}s"],
  ["投射物","Projectile"],
  ["持續傷害區域","Persistent damage zone"],
  ["瞬間範圍攻擊","Instant area attack"],
  ["召喚魔物","Summon monsters"],
  ["直線","Line"],
  ["環形","Ring"],
  ["圓形","Circle"],
  ["戰場區域","Arena zone"],
  ["暗影扇射","Shadow Fan"],
  ["黑暗領域","Darkness Field"],
  ["暗影交錯","Shadow Cross"],
  ["深淵召喚","Abyss Summon"],
  ["深淵塌陷","Abyss Collapse"],
  ["暗影風暴","Shadow Storm"],
  ["寒冰扇射","Ice Fan"],
  ["寒霜地帶","Frost Patch"],
  ["冰川之環","Glacial Ring"],
  ["旋轉庇護區","Rotating Shelter"],
  ["凜冬爆發","Winter Burst"],
  ["冰晶風暴","Ice Storm"],
  ["泰坦重擊","Titan Slam"],
  ["餘燼直擊","Ember Line"],
  ["熔岩噴發","Eruption"],
  ["烈焰浪潮","Flame Wave"],
  ["泰坦之怒","Titan Rage"],
  ["聖光之矛","Radiant Lance"],
  ["聖光之環","Light Ring"],
  ["虛空扇射","Void Fan"],
  ["暗影橫掃","Shadow Sweep"],
  ["暮光領域","Twilight Ground"],
  ["星蝕扇區","Eclipse Wedge"],
  ["星蝕交錯","Eclipse Cross"],
  ["熾天終曲","Seraph Finale"],
  ['解鎖條件：{condition}', 'Unlock requirement: {condition}'],
  ['暮境遠征', 'Eclipse Survivors'],
  ['血量偏低', 'Low health'],
  ['生命危急', 'Critical health'],
  ['瀕死', 'Near death'],
  ["查看英雄詳情", "View hero details"],
  ["目前為光環造型 · 不影響戰鬥數值", "Aura cosmetics for now · no combat stat changes"],
  ["查看詳情：{name}", "View details: {name}"],
  ["返回英雄選擇", "Back to heroes"],
  ["目前遠征", "Current expedition"],
  ["變更遠征", "Change expedition"],
  ["模式", "Modes"],
  ["英雄", "Heroes"],
  ["依序挑戰五位首領，敵人逐戰增強。", "Challenge five increasingly powerful bosses."],
  ["無盡求生，迎戰週期性星蝕事件。", "Survive endlessly through recurring eclipse events."],
  ["回收四件聖物，擊敗守護首領。", "Recover four relics and defeat the guardian boss."],
  ["承受輪替詛咒，擊敗兩位守衛。", "Endure rotating curses and defeat two guardians."],
  ["突破八波遭遇戰，挑戰混沌首領。", "Clear eight waves and challenge the chaos boss."],
  ["查看模式詳情：{name}", "View mode details: {name}"],
  ["英雄初始數值", "Base hero stats"],
  ["攻擊力", "Attack"],
  ["移動速度", "Move speed"],
  ["攻擊間隔", "Attack interval"],
  ["英雄類別", "Hero categories"],
  ["經典英雄", "Classic Heroes"],
  ["新增英雄", "New Heroes"],
  ["遠征類別", "Expedition categories"],
  ["一般遠征", "Classic Modes"],
  ["特殊試煉", "Special Trials"],
  ["冒險者殿堂", "Adventurer's Hall"],
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
  ["音樂", "Music"],
  ["音效", "Sound effects"],
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
    "完成設定",
    "Done"
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
    "點選卡牌或按 1–9 選擇",
    "Click a card or press 1–9 to select"
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
  ["最高連殺", "Best kill streak"],
  ["經驗值獲得", "XP earned"],
  ["平均每秒傷害", "Average DPS"],
  ["每分鐘擊殺", "Kills per minute"],
  ["首次升級時間", "First upgrade"],
  ["最高瞬間多殺", "Best multikill"],
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
  ,["返回主選單", "Return to Main Menu"]
  ,["返回主選單？", "Return to the Main Menu?"]
  ,["戰鬥已暫停。返回主選單將結束本次遠征，未結算的戰鬥進度不會保留。確定要離開嗎？", "The battle is paused. Returning to the main menu ends this expedition. Unsettled combat progress will not be saved. Are you sure you want to leave?"]
  ,["離開後將無法繼續本次遠征。", "You will not be able to resume this expedition."]
  ,["繼續戰鬥", "Continue Battle"]
  ,["結束遠征並返回", "End Expedition & Return"]
, ["Eclipse Survivors 主選單","Eclipse Survivors Main Menu"]
, ["♫ 啟用音樂","♫ Enable Music"]
, ["NEW HEROES · 新增英雄","NEW HEROES · EXPANDED ROSTER"]
, ["語言設定","Language Settings"]
, ["語言","Language"]
, ["介面語言","Display Language"]
, ["初次使用時依系統語言顯示；手動選擇後將記住此瀏覽器的偏好。","Your system language is used initially. Your selection is saved in this browser."]
, ["⚙ 遊戲設定","⚙ Game Settings"]
, ["目前職業：","Current Class:"]
, ["· 永久能力於下一次遠征生效。","· Permanent upgrades apply on your next expedition."]
, [" / 3 階"," / 3 ranks"]
, ["/ 3 階","/ 3 ranks"]
, ["只影響外觀 · 不影響戰鬥數值","Appearance only · no change to combat stats"]
, ...(import.meta.env.DEV ? [
  ["暗蝕敵軍 · 美術圖鑑","Eclipse Factions · Art Compendium"],
  ["以下為實際入庫的 WebP 動畫及攻擊預警示意，尚待美術驗收；命中判定仍以遊戲規則為準。","These in-project WebP animations and telegraphs await final art review; hit detection always follows gameplay rules."],
  ["四位首領 · 三階段視覺預覽","Four Bosses · Three-Phase Preview"],
  ["暗蝕之地 · 地板與場景裝飾","Eclipsed Lands · Terrain & Decorations"],
  ["c104 原始美術圖集（10 張 PNG · 待逐格驗收）","c104 source art atlas (10 PNGs · pending frame review)"],
  ["原圖已存入專案並由本介面直接引用；尚未通過精靈邊界審核的接觸圖不得當成遊戲動作影格。","Source art is stored in this project. Unverified contact sheets cannot be used as live animation frames."],
  ["寶箱、稀有度、HUD 與成就裝飾 · 美術預覽","Chest, Rarity, HUD & Achievement Art Preview"],
  ["以下 17 張圖尚待美術驗收，展示不會增加成就或變更存檔。","These 17 images await art review. Viewing them does not award achievements or change save data."]
] as [string, string][] : [])
, ["新成就：","New Achievement:"]
, ["新造型：","New Cosmetic:"]
, ["再次挑戰 ✦","Try Again ✦"]
, ["戰鬥資訊","Combat Information"]
, ["✦ 戰場地圖","✦ Battlefield Map"]
, ["✧ 武器與技能","✧ Weapons & Skills"]
, ["✓ 已選擇","✓ Selected"]
, ["ES2 新英雄選擇","ES2 Hero Selection"]
, ["生命","HP"]
, ["· 攻擊","· Attack"]
, ["· 速度","· Speed"]
, ["起始武器 ·","Starting Weapon ·"]
, ["主動技能 ·","Active Ability ·"]
, ["主動技能","Active Ability"]
, ["英雄主動技能","Hero Active Abilities"]
, ["（冷卻","(Cooldown"]
, ["秒）","s)"]
, ["優勢 ·","Strengths ·"]
, ["弱點 ·","Weaknesses ·"]
, ["潛行","Stealth"]
, ["屏障","Barrier"]
, ["靈體","Spirits"]
, ["ES2 擴充遠征模式","ES2 Expanded Expedition Modes"]
, ["選擇遠征試煉","Choose an Expedition Trial"]
, ["ES2 遠征模式","ES2 Expedition Mode"]
, ["ES2 模式進度","ES2 Mode Progress"]
, ["目前異變：","Active Mutation:"]
, ["預估餘燼：","Estimated Embers:"]
, ["✧ 暮光餘燼","✧ Twilight Embers"]
, ["· 前置研究未解鎖","· Prerequisite research not unlocked"]
, ["累積熟練度","Total Mastery"]
, ["已解鎖的效果由遊戲整合層在開局時套用，不會改變進行中的戰鬥。","Unlocked effects apply when starting a new run; they do not change an ongoing battle."]
, ["永久成就","Permanent Achievements"]
, ["永久成就 ·","Permanent Achievements ·"]
, ["手機操控與無障礙設定","Mobile Controls & Accessibility Settings"]
, ["操控與畫面輔助","Controls & Visual Accessibility"]
, ["立即預覽變更；儲存由遊戲設定整合層處理。","Preview changes immediately; the game settings system handles saving."]
, ["回復預設","Restore Defaults"]
, ["搖桿位置","Joystick Position"]
, ["左側","Left"]
, ["右側","Right"]
, ["距離","Distance"]
, ["離底部距離","Distance from Bottom"]
, ["觸控尺寸","Touch Control Size"]
, ["介面縮放","UI Scale"]
, ["畫質","Graphics Quality"]
, ["自動","Auto"]
, ["低","Low"]
, ["中","Medium"]
, ["高","High"]
, ["戰鬥特效強度","Combat VFX Intensity"]
, ["完整","Full"]
, ["中等","Medium"]
, ["關閉非必要特效","Disable nonessential effects"]
, ["減少動態","Reduced Motion"]
, ["減少 UI 移動與過渡動畫","Reduce UI movement and transitions"]
, ["依系統","Follow System"]
, ["降低閃光","Reduce Flashing"]
, ["避免頻繁閃爍；保留必要攻擊警示","Avoid frequent flashes while preserving essential attack warnings"]
, ["色覺輔助","Color Vision Support"]
, ["以符號及文字區分狀態，不只靠顏色","Use symbols and text, not color alone, to distinguish states"]
, ["英雄低血量警示","Low Health Warning"]
, ["血量偏低時顯示畫面邊緣、英雄資訊框及危急警示","Highlight screen edges and the hero HUD when health is low"]
, ["傷害數字","Damage Numbers"]
, ["顯示或隱藏戰鬥傷害浮字","Show or hide floating combat damage numbers"]
, ["滿血時顯示怪物血條","Show full-health enemy bars"]
, ["關閉時僅隱藏滿血怪物頭頂的血條；首領 HUD 保持顯示","When off, hide overhead bars for full-health enemies only; the boss HUD stays visible."]
, ["即時預覽 ·","Live Preview ·"]
, ["預覽左右控制鈕位置","Preview left and right controls"]
, ["● 狀態正常","● Status Normal"]
, ["搖桿：","Joystick:"]
, ["側 ·","side ·"]
, ["%｜畫面動態：","% | Motion:"]
, ["虛擬方向搖桿，鍵盤仍可使用方向鍵或 WASD","Virtual movement joystick; arrow keys and WASD also work"]
, ["衝刺，鍵盤可用空白鍵","Dash; keyboard shortcut is Space"]
, ["衝刺","Dash"]
, ["✦ 命運進化","✦ Destiny Evolution"]
, ["遺物","Relics"]
, ["重抽","Rerolls"]
, ["放逐","Banishes"]
, ["⚠ 詛咒遺物：包含負面代價","⚠ Cursed Relic: Includes a harmful tradeoff"]
, ["放逐此遺物","Banish This Relic"]
, ["重抽選項（","Reroll Offers ("]
, ["⏸ 冒險暫停","⏸ Expedition Paused"]
, ["行動裝置遊戲控制","Mobile Game Controls"]
, ["方向搖桿","Movement Joystick"]
, ["近戰突襲與短暫潛行，高爆發但生存能力較低。","Close-range ambushes and brief stealth deliver high burst damage at the cost of survivability."]
, ["高速突進","Rapid dashes"]
, ["暴擊","Critical strikes"]
, ["短暫潛行","Brief stealth"]
, ["低生命","Low health"]
, ["短射程","Short range"]
, ["須掌握突襲時機","Requires precise ambush timing"]
, ["影鋒雙匕","Shadowfang Daggers"]
, [`暗影精準：${Math.round(BALANCE.heroes.specialEffects.shadowblade.critChance * 100)}% 暴擊機率，造成 ${Math.round(BALANCE.heroes.specialEffects.shadowblade.critMultiplier * 100)}% 傷害；升級增強暴擊倍率。`,`Shadow Precision: ${Math.round(BALANCE.heroes.specialEffects.shadowblade.critChance * 100)}% critical-hit chance at ${Math.round(BALANCE.heroes.specialEffects.shadowblade.critMultiplier * 100)}% damage; upgrades raise critical damage.`]
, ["影襲：突襲周圍最多三名敵人，短暫潛行並取得閃避保護。","Shadow Assault: strike up to three nearby enemies, briefly enter stealth, and gain evasion protection."]
, ["與靈體協同作戰，逐步提升召喚數量與支援能力。","Fight alongside spirits, gradually gaining more summons and stronger support."]
, ["持續召喚傷害","Sustained summon damage"]
, ["小額治癒","Minor healing"]
, ["穩定遠程作戰","Reliable ranged combat"]
, ["脆弱","Fragile"]
, ["前期召喚數量少","Few early summons"]
, ["召喚攻擊需要時間","Summon attacks take time"]
, ["靈火寶珠","Spiritfire Orb"]
, ["靈契：靈火攻擊、守護靈治療、奪魂靈吸血，最多三個常駐夥伴。","Spirit Bond: spiritfire attacks, guardian healing, and soul-draining lifesteal with up to three permanent companions."]
, ["靈潮集結：靈體集中攻擊周圍目標並恢復少量生命。","Spirit Rally: focus companions on nearby targets and restore a small amount of health."]
, ["高耐久反擊型近戰，透過生命風險換取屏障與強化傷害。","A resilient melee counterattacker who trades health for barriers and amplified damage."]
, ["承傷減免","Damage mitigation"]
, ["近身反擊","Close-range counterattacks"]
, ["臨時屏障","Temporary barriers"]
, ["移動慢","Slow movement"]
, ["射程短","Limited reach"]
, ["主動技能消耗生命","Active ability consumes health"]
, ["緋紅聖盾","Crimson Aegis"]
, ["緋紅韌性：受到傷害減少 14%，受傷時有冷卻的近距離反擊。","Crimson Resilience: take 14% less damage and counterattack at close range with a cooldown when struck."]
, ["血誓屏障：犧牲少量生命換取 {seconds} 秒的吸收護盾；屏障到期或破碎時引爆緋紅報復，依吸收的傷害重創周圍敵人。","Blood Oath Barrier: sacrifice a little health for a {seconds}-second absorbing shield; when it expires or breaks, Crimson Retribution detonates, striking nearby enemies based on the damage absorbed."]
, ["· 專精","· Mastery"]
, ["提升英雄獨有的被動能力","Enhance this hero's unique passive ability"]
, ["強化暴擊與影襲傷害。","Boost critical hits and Shadow Assault damage."]
, ["強化靈體攻擊、治療與靈潮集結。","Boost spirit attacks, healing and Spectral Convergence."]
, ["強化減傷、反擊、低血量增傷、屏障與緋紅報復。","Boost mitigation, counters, low-HP damage, barriers and Crimson Retribution."]
, ["暴擊傷害倍率","Crit damage multiplier"]
, ["技能攻擊倍率","Skill attack multiplier"]
, ["技能移動倍率","Skill movement multiplier"]
, ["技能攻擊間隔倍率","Skill attack interval multiplier"]
, ["技能生命上限加成","Skill max HP bonus"]
, ["同時攻擊數","Simultaneous attacks"]
, ["技能射程倍率","Skill range multiplier"]
, ["飛刃數量","Orbiting blades"]
, ["經驗吸取範圍","XP pickup radius"]
, ["每秒生命恢復","HP regeneration / s"]
, ["目標數量","Targets"]
, ["技能冷卻時間","Skill cooldown"]
  , ["效果持續時間", "Effect Duration"]
, ["技能傷害倍率","Skill damage multiplier"]
, ["技能作用範圍","Skill reach"]
, ["減速持續時間","Slow duration"]
, ["投射物數量","Projectiles"]
, ["彈跳次數","Bounces"]
, ["穿透數量","Pierce count"]
, ["吸血上限","Lifesteal cap"]
, ["召喚物數量","Summons"]
, ["光束寬度","Beam width"]
, ["法球數量","Orbs"]
, ["主動傷害倍率（Q）","Active damage (Q)"]
, ["夥伴傷害倍率","Companion damage multiplier"]
, ["守護靈每次治療","Guardian heal per tick"]
, ["受到傷害減免","Damage reduction"]
, ["反擊傷害倍率","Counter damage multiplier"]
, ["低血量傷害倍率","Low-HP damage multiplier"]
, ["屏障額外吸收（Q）","Extra barrier absorption (Q)"]
, ["緋紅報復傷害倍率（Q）","Crimson Retribution damage multiplier (Q)"]
, ["依序迎戰五位首領，每次擊敗後迎接更強的對手；闖關與獎勵均依實際擊殺進度結算。","Face five bosses in order, each stronger than the last. Progression and rewards follow confirmed defeats."]
, ["於 480 秒內，依序擊敗五位已正式登場的首領才算勝利。","Defeat all five encountered bosses in order within 480 seconds to win."]
, ["角色死亡、放棄挑戰或 480 秒截止仍未擊敗五名首領即失敗。","Fail if your hero dies, you withdraw, or five bosses remain unbeaten at 480 seconds."]
, ["首領於 25／70／125／185／250 秒後逐一開放","Bosses unlock at 25 / 70 / 125 / 185 / 250 seconds"]
, ["首領生命與攻擊逐階增強","Boss health and damage increase each stage"]
, ["五連勝可獲得專屬徽章","Win five in a row to earn a unique badge"]
, ["不設終點的求生遠征，每三分鐘出現一次重大星蝕事件，敵人會持續增強，依生存里程碑取得獎勵。","Endless survival with a major eclipse event every three minutes. Enemies keep growing stronger; survival milestones award rewards."]
, ["不會因時間或首領擊倒而自動勝利；只有持續存活、死亡或主動結束。","Time or boss defeats never trigger automatic victory; survive until defeat or voluntary withdrawal."]
, ["角色死亡或主動放棄即結束本次無盡求生，不設隱藏終止時間。","Endless survival ends on death or withdrawal, with no hidden time limit."]
, ["每 180 秒可完成一場星蝕事件","Complete an eclipse event every 180 seconds"]
, ["難度按生存時間與事件進度提升","Difficulty rises with survival time and event progress"]
, ["按實際生存里程碑計算獎勵，最高 1500 餘燼","Rewards follow achieved survival milestones, capped at 1,500 embers"]
, ["依序回收四件遠古聖物，守護累積聖物完整度，最後擊敗守護首領才能帶走寶藏。","Recover four ancient relics in order, protect their shared integrity, then defeat the guardian boss to claim the treasure."]
, ["480 秒內集齊四件聖物、保持完整度大於零，並擊敗最後守護首領。","Collect four relics, maintain integrity above zero, and defeat the guardian boss within 480 seconds."]
, ["角色死亡、聖物完整度歸零、放棄或超過 480 秒即失敗。","Fail on death, zero relic integrity, withdrawal, or passing 480 seconds."]
, ["聖物最早於 25／65／110／155 秒可收集","Relics become available at 25 / 65 / 110 / 155 seconds"]
, ["收集後受到聖物破壞會降低共同完整度","Relic damage reduces their shared integrity"]
, ["守護首領最早於 220 秒可迎戰","The guardian boss becomes available at 220 seconds"]
, ["承受每分鐘輪替的危險詛咒，在艱困環境下存活六分鐘，並消滅兩位階段守衛。","Endure rotating curses every minute, survive six harsh minutes, and defeat two stage guardians."]
, ["擊敗兩名於 100／240 秒後可迎戰的守衛，且至少存活 360 秒。","Defeat both guardians unlocked at 100 / 240 seconds and survive at least 360 seconds."]
, ["角色死亡、放棄或 420 秒硬性截止仍未完成目標即失敗。","Fail on death, withdrawal, or when objectives remain incomplete at the 420-second hard limit."]
, ["每 60 秒輪替血價、夜幕、狂潮三種詛咒","Blood Price, Nightfall, and Frenzy curses rotate every 60 seconds"]
, ["強敵傷害與數量高於普通遠征","Stronger enemies deal more damage and appear more often"]
, ["360 秒生存與雙守衛擊殺缺一不可","Both 360-second survival and two guardian kills are mandatory"]
, ["快節奏八波變化式戰鬥，輪替爆發、裝甲與蜂擁規則，最後挑戰混沌首領。","Eight fast-paced encounter waves alternate burst, armor, and swarm rules before a final chaos boss."]
, ["330 秒內依序清除八波遭遇戰並擊敗最後登場的競技場首領。","Clear eight waves in order and defeat the final arena boss within 330 seconds."]
, ["角色死亡、放棄或 330 秒截止仍未完成全部八波與首領即失敗。","Fail on death, withdrawal, or reaching 330 seconds with waves or boss unfinished."]
, ["八波遭遇戰依次於 15 秒起逐段開放","Eight encounter waves unlock sequentially starting at 15 seconds"]
, ["每波切換蜂擁、鐵甲、狂暴規則","Each wave rotates swarm, armor, and rage rules"]
, ["第八波後於 170 秒開放最後首領","The final boss becomes available at 170 seconds after wave eight"]
, ["首次擊敗敵人","Defeat your first enemy"]
, ["獲得一場勝利","Win an expedition"]
, ["單局擊敗一百名敵人","Defeat 100 enemies in a single run"]
, ["擊敗首領","Defeat a boss"]
, ["單局存活五分鐘","Survive for five minutes in one run"]
, ["使用三名英雄","Play with all three heroes"]
, ["遠征老手","Veteran Explorer"]
, ["完成十場遠征","Complete ten expeditions"]
, ["破曉常勝","Dawn Victor"]
, ["獲得五場勝利","Win five expeditions"]
, ["深淵征服者","Abyss Conqueror"]
, ["擊敗三次首領","Defeat three bosses"]
, ["無盡旅人","Endless Wanderer"]
, ["無盡模式生存六百秒","Survive 600 seconds in Endless Mode"]
, ["遺物收藏家","Relic Collector"]
, ["收集五種不同遺物","Collect five distinct relics"]
, ["進化學者","Evolution Scholar"]
, ["發現三種進化","Discover three evolutions"]
, ["外觀藏家","Cosmetic Curator"]
, ["收集五種外觀","Collect five cosmetics"]
, ["試煉冠軍","Trial Champion"]
, ["挑戰模式取勝","Win Challenge Mode"]
, ["首領初征","First Boss Encounter"]
, ["首次擊敗首領","Defeat a boss for the first time"]
, ["三次破曉","Three Dawns"]
, ["累積三勝","Win three expeditions"]
, ["十場遠征","Ten Expeditions"]
, ["累積十場遊戲","Play ten expeditions"]
, ["珍藏遺物","Treasured Relics"]
, ["發現五種遺物","Discover five relics"]
, ["進化探索","Evolution Explorer"]
, ["攻擊研究","Offense Research"]
, ["每級 +{value}% 起始攻擊","+{value}% starting attack per rank"]
, ["生存研究","Vitality Research"]
, ["每級 +{value} 起始生命","+{value} starting HP per rank"]
, ["洞察研究","Insight Research"]
, ["每級 +{value}% 起始經驗加成","+{value}% starting experience gain per rank"]
, ["拾荒研究","Scavenging Research"]
, ["每級 +{value}% 拾取收益","+{value}% pickup rewards per rank"]
, ["餘燼研究","Ember Research"]
, ["每級 +{value}% 未來結算餘燼","+{value}% future ember rewards per rank"]
, ["守護者護符","Guardian's Talisman"]
, ["騎士專屬起始裝備","Knight starting equipment"]
, ["遊俠箭袋","Ranger's Quiver"]
, ["遊俠專屬起始裝備","Ranger starting equipment"]
, ["法師聚焦器","Mage Focus"]
, ["法師專屬起始裝備","Wizard starting equipment"]
, ["微光祝福","Faint Blessing"]
, ["出發時 +{value}% 經驗","+{value}% experience at expedition start"]
, ["漫遊行囊","Wanderer's Pack"]
, ["出發時 +{value}% 拾取","+{value}% pickup rewards at expedition start"]
, ["守護誓約","Guardian's Vow"]
, ["出發時 +{value}% 生命","+{value}% health at expedition start"]
, ["異界史萊姆","Otherworldly Slime"]
, ["接近並包圍旅人的潛伏魔物","A lurking monster that closes in and surrounds travelers"]
, ["幽暮蝙蝠","Twilight Bat"]
, ["從暗處快速逼近的飛行魔物","A flying monster that rushes in from the shadows"]
, ["荒野哥布林","Wild Goblin"]
, ["行動狡詐的小型戰士","A cunning small warrior"]
, ["遠古巨像","Ancient Colossus"]
, ["緩慢但危險的重裝造物","A slow but dangerous armored construct"]
, ["深淵術士","Abyss Warlock"]
, ["施放魔法彈幕，與玩家保持距離的遠程魔物","A ranged monster that launches magic volleys and keeps its distance"]
, ["深淵魔王","Abyssal Demon Lord"]
, ["在遠征中現身的首領","The boss encountered during an expedition"]
, ["黑影匕首接連追擊最多六名近敵，逐次衰減傷害","Shadow daggers strike up to six nearby enemies in succession, with diminishing damage"]
, ["聖槍穿刺一道直線上的敵人，並給予短暫防護","A holy lance pierces enemies in a line and grants brief protection"]
, ["血色鐮刀掃蕩附近敵人，以實際傷害少量吸血","A blood-red scythe sweeps nearby enemies and leeches a small portion of actual damage"]
, ["三處重力地雷引爆，傷害並牽引爆炸區內的敵人","Three gravity mines detonate, damaging and pulling enemies within their blast zones"]
, ["毒霜結界定期腐蝕並大幅減速周圍敵人","A toxic frost ward periodically corrodes and heavily slows nearby enemies"]
, ["彈刃在相鄰敵人間連續跳躍，每次碰撞造成傷害","Rebounding blades jump between nearby enemies and deal damage on each hit"]
, ["狼魂撲擊遠方目標，擊退並打斷敵人的逼近","A spectral wolf leaps at a distant target, knocking it back and interrupting its advance"]
, ["烈陽雷柱連擊最多五名敵人，額外附加短暫麻痺","Solar lightning pillars chain to five enemies, briefly paralyzing them"]
, ["兩次隕星引力爆炸，先將敵人吸向落點再造成重擊","Two meteor gravity blasts pull enemies toward impact points before a heavy strike"]
, ["向目標射出一列扇形穿雲靈箭，由既有投射物系統處理命中","Fire a fan of spirit arrows; the existing projectile system resolves hits"]
, ["在三名敵人位置引爆骨焰爆裂區，造成範圍火傷","Detonate bonefire zones at three enemy positions to deal area fire damage"]
, ["藤蔓圍捕最多八名敵人，重創並長時間限制移動","Vines ensnare up to eight enemies, dealing heavy damage and restricting movement"]
, ["曙鋼裂地","Dawn Breaker"]
, ["星痕穿矢","Starfall Volley"]
, ["虛空坍縮","Void Collapse"]
, ["曙鋼裂地：震擊周圍最多八名敵人，並短暫免疫傷害。","Dawn Breaker: strike up to eight nearby enemies and briefly become immune to damage."]
, ["星痕穿矢：鎖定射程內最近三名敵人，發射高傷害星矢。","Starfall Volley: unleash high-damage astral arrows against the three nearest enemies in range."]
, ["虛空坍縮：引爆身旁奧術能量，重創周圍最多六名敵人。","Void Collapse: detonate arcane energy around you, heavily damaging up to six nearby enemies."]
, ["影襲","Shadow Assault"]
, ["靈潮集結","Spirit Rally"]
, ["血誓屏障","Blood Oath Barrier"]
, ["騎士","Knight"]
, ["遊俠","Ranger"]
, ["法師","Wizard"]
, ["角色插畫","Character Illustration"]
, ["世界事件","World Event"]
, ["世界事件選項","World event choices"]
, ["進行選擇前請先查看代價與風險。","Inspect the cost and danger before making your choice"]
, ["✧ 天穹奇遇 ✧","✧ CELESTIAL ENCOUNTER ✧"]
, ["花費","Cost"]
, ["風險","Risk"]
, ["獎勵","Reward"]
, ["不可選擇","Unavailable"]
, ["透過觸控、滑鼠或數字鍵 1–9 選擇 · Tab 切換焦點 · Esc 關閉","Choose by touch, click or number keys 1–9 · Tab to navigate · Esc to close"]
, ["安全離開","Leave safely"]
, ["沒有立即危險","No immediate danger"]
, ["保留目前資源","Keep current resources"]
, ["流浪商人","Wandering Merchant"]
, ["交換經驗","Trade experience"]
, ["消耗 15 經驗","Spend 15 experience"]
, ["獲得補給憑證","Receive a supply token"]
, ["購買戰地口糧","Buy a field ration"]
, ["消耗 6 經驗","Spend 6 experience"]
, ["恢復 24 生命","Restore 24 HP"]
, ["詛咒祭壇","Cursed Altar"]
, ["喚起詛咒","Invoke the curse"]
, ["犧牲 18 生命","Sacrifice 18 HP"]
, ["獲得 15 秒詛咒之力","Gain cursed might for 15 seconds"]
, ["淨化符印","Purify the sigil"]
, ["消耗 12 經驗","Spend 12 experience"]
, ["獲得 8 秒防護結界","Gain a ward for 8 seconds"]
, ["神聖祭壇","Divine Shrine"]
, ["祈求治癒","Pray for healing"]
, ["僅能使用一次","One use only"]
, ["恢復 36 生命","Restore 36 HP"]
, ["祈求庇護","Pray for protection"]
, ["無治癒效果","No healing"]
, ["獲得 12 秒防護結界","Gain a 12-second ward"]
, ["寶藏秘庫","Treasure Vault"]
, ["使用符文解鎖","Unlock with runes"]
, ["消耗 8 經驗","Spend 8 experience"]
, ["獲得秘庫獎勵憑證","Receive a vault cache token"]
, ["強行突破秘庫","Force the vault"]
, ["在 18 秒內召喚並擊敗 3 名守衛","Summon 3 guardians and defeat them in 18 seconds"]
, ["成功後獲得傳說秘藏","Receive a legendary cache on success"]
, ["魔物伏擊","Monster Ambush"]
, ["正面迎戰","Stand and fight"]
, ["18 秒內擊敗 3 名召喚的襲擊者","Defeat 3 summoned attackers within 18 seconds"]
, ["獲得 30 經驗","Gain 30 experience"]
, ["突圍撤離","Break through"]
, ["損失 8 生命","Lose 8 HP"]
, ["獲得 7 秒加速效果","Gain a 7-second haste buff"]
, ["菁英狩獵","Elite Hunt"]
, ["狩獵標記菁英","Hunt the marked elite"]
, ["22 秒內擊敗一名菁英","Defeat one elite within 22 seconds"]
, ["獲得 40 經驗與菁英秘藏","Gain 40 experience and an elite cache"]
, ["先行整備","Prepare instead"]
, ["放棄菁英獎勵","Forfeit elite reward"]
, ["恢復 8 生命","Heal 8 HP"]
, ["遺忘墓穴","Forgotten Tomb"]
, ["深入墓穴","Enter the crypt"]
, ["陷阱造成 12 生命損失","Lose 12 HP to traps"]
, ["獲得古墓憑證","Receive an ancient tomb token"]
, ["研讀碑文","Read the epitaphs"]
, ["沒有隱藏寶藏","No hidden treasure"]
, ["獲得 14 經驗","Gain 14 experience"]
, ["療癒之泉","Healing Fountain"]
, ["飲用治癒泉水","Drink restorative water"]
, ["恢復 45 生命","Recover 45 HP"]
, ["洗淨腐化","Wash away corruption"]
, ["沒有立即治癒","No immediate healing"]
, ["獲得 18 秒淨化增益","Gain an 18-second cleansing buff"]
, ["遠古鍛爐","Ancient Forge"]
, ["鍛造裝備","Temper equipment"]
, ["消耗 18 經驗","Spend 18 experience"]
, ["獲得鍛造升級憑證","Receive a forge upgrade token"]
, ["過熱鋼鐵","Overheat the steel"]
, ["犧牲 16 生命","Sacrifice 16 HP"]
, ["獲得 14 秒鍛造之力","Gain 14 seconds of reforged might"]
, ["血之契約","Blood Pact"]
, ["締結契約","Seal the pact"]
, ["犧牲 24 生命","Sacrifice 24 HP"]
, ["獲得 20 秒契約之力","Gain 20 seconds of pact power"]
, ["斬斷契約","Break the pact"]
, ["放棄禁忌之力","Forfeit forbidden power"]
, ["恢復 10 生命","Recover 10 HP"]
, ["天穹祝福","Celestial Blessing"]
, ["迅捷祝福","Blessing of motion"]
, ["放棄防護效果","Forfeit protection"]
, ["獲得 16 秒加速效果","Gain 16 seconds of haste"]
, ["守護祝福","Blessing of safety"]
, ["放棄速度加成","Forfeit speed"]
, ["獲得 16 秒庇護效果","Gain 16 seconds of warding"]
, ["生存挑戰","Survival Challenge"]
, ["堅守試煉範圍","Stand in the trial circle"]
, ["9 秒內保持在 150 單位範圍內","Remain within 150 units for 9 seconds"]
, ["成功後獲得 36 經驗","Gain 36 experience on success"]
, ["撤退恢復","Withdraw and recover"]
, ["放棄試煉獎勵","Forfeit the trial reward"]
, ["恢復 6 生命","Recover 6 HP"]
, ["影鋒飛刃","Shadow Daggers"]
, ["每次擊中後自動尋找新目標的追蹤匕首。","Homing knives seek fresh victims after every strike."]
, ["聖光長槍","Holy Lance"]
, ["遠距祝福長槍可穿透整排敵人。","A long-range blessed spear pierces entire lines."]
, ["鮮血鐮刀","Blood Scythe"]
, ["近距離大範圍揮斬，吸取少量生命。","A wide close-range sweep steals a limited amount of life."]
, ["奧術地雷","Arcane Mines"]
, ["魔法陷阱在警示後引爆。","Magical traps detonate after a warning delay."]
, ["骸骨長矛","Bone Spears"]
, ["定時齊射狹長且具穿透力的骨刺。","A timed volley of narrow, penetrating bone darts."]
, ["毒霧之雲","Poison Cloud"]
, ["持續存在的毒素區域反覆造成範圍傷害。","Lingering toxin zones inflict repeated area damage."]
, ["迴旋飛刃","Ricochet Blades"]
, ["投擲圓刃每次反彈後追擊不同敵人。","Thrown discs chase different enemies after each bounce."]
, ["幽靈狼群","Spirit Wolves"]
, ["忠誠的靈體獵犬會追逐並撕咬附近威脅。","Loyal ethereal hunters pursue and bite nearby threats."]
, ["烈陽光束","Solar Beam"]
, ["蓄力後發射高傷害的穿透光束。","Charge up a piercing ray with high single-line damage."]
, ["重力法球","Gravity Orbs"]
, ["環繞的法球將敵人吸入並在接觸時脈衝傷害。","Orbiting cores drag enemies in and pulse on contact."]
, ["幽魂長弓","Spectral Bow"]
, ["強力幽靈箭矢可沿直線穿透敵人。","Heavy ghost arrows pierce enemies in a straight line."]
, ["荊棘鎖鏈","Thorn Chain"]
, ["蔓延的傷口持續束縛一群敵人。","Bind a cluster of foes with spreading, periodic wounds."]
, ["夜幕洪流","Nightfall Torrent"]
, ["黎明裁決","Dawn Judgment"]
, ["緋紅收割者","Crimson Reaper"]
, ["奇點雷區","Singularity Minefield"]
, ["劇毒永凍","Toxic Permafrost"]
, ["無盡迴彈","Infinite Rebound"]
, ["荒野狩獵","Wild Hunt"]
, ["烈日風暴","Solar Tempest"]
, ["天穹崩塌","Celestial Collapse"]
, ["幽魂齊射","Spectral Volley"]
, ["骨焰彈幕","Bonefire Barrage"]
, ["翠綠禁錮","Verdant Snare"]
, ["吸血尖牙","Vampire Fang"]
, ["每層恢復實際命中傷害的 2%，每次命中有上限。","Restore 2% of actual hit damage, per stack; capped per hit."]
, ["風暴王冠","Storm Crown"]
, ["每層使閃電攻擊傷害增加 24%。","Lightning attacks deal +24% damage per stack."]
, ["守護符印","Guardian Sigil"]
, ["生命低於 35% 時受到的傷害減少 25%。","Take 25% less damage below 35% HP."]
, ["幻影之靴","Phantom Boots"]
, ["每層增加 9% 閃避機率。","+9% chance to dodge incoming hits per stack."]
, ["天穹透鏡","Celestial Lens"]
, ["投射物額外穿透一個目標。","Projectiles pierce one extra target."]
, ["狼魂圖騰","Wolf Totem"]
, ["每層使召喚物傷害增加 28%。","Summons deal +28% damage per stack."]
, ["寒霜符文","Frost Rune"]
, ["每層使冰霜傷害增加 22%。","Frost damage +22% per stack."]
, ["餘燼之戒","Ember Ring"]
, ["每層使火焰傷害增加 20%。","Fire damage +20% per stack."]
, ["雷霆權杖","Thunder Rod"]
, ["每層對首領傷害增加 18%。","Deal +18% damage to bosses per stack."]
, ["墓園喪鐘","Grave Bell"]
, ["處決剩餘生命低於 6% 的普通敵人。","Execute ordinary foes below 6% remaining HP."]
, ["祭儀匕首","Ritual Dagger"]
, ["每層增加 7% 暴擊機率。","Critical hit chance +7% per stack."]
, ["獵手透鏡","Hunter Lens"]
, ["每層使暴擊傷害倍率增加 30%。","Critical damage multiplier +30% per stack."]
, ["戰旗","Battle Standard"]
, ["移動時傷害增加 18%。","+18% damage while moving."]
, ["止水法球","Stillwater Orb"]
, ["站立不動時傷害增加 22%。","+22% damage while stationary."]
, ["慈悲之種","Merciful Seed"]
, ["每次確實擊殺恢復 1.2 生命。","Heal 1.2 HP on each confirmed kill."]
, ["黎明羽毛","Dawn Feather"]
, ["每秒恢復 0.8 生命。","Regenerate 0.8 HP each second."]
, ["鍛鋼護甲","Tempered Plate"]
, ["最大生命增加 24，並恢復等量生命。","Maximum HP +24 and heal by the same amount."]
, ["旅人羅盤","Pilgrim Compass"]
, ["每層使移動速度增加 8%。","Movement speed +8% per stack."]
, ["水銀沙漏","Quicksilver Hourglass"]
, ["每層使攻擊間隔縮短 10%。","Attack intervals 10% shorter per stack."]
, ["鏡面護符","Mirror Charm"]
, ["反彈減傷後受到傷害的 20%。","Reflect 20% of post-mitigation damage."]
, ["動能肩甲","Kinetic Pauldrons"]
, ["衝刺後下一次攻擊傷害增加 35%。","Deal +35% damage with an attack after dashing."]
, ["壁壘之戒","Bulwark Ring"]
, ["每層使受到的傷害減少 7%。","Take 7% less damage per stack."]
, ["迴聲寶石","Echo Gem"]
, ["每層有 12% 機率額外發射一枚投射物。","12% chance to emit an extra projectile per stack."]
, ["磁力護身符","Magnetic Amulet"]
, ["每層使拾取範圍增加 30%。","Pickup radius +30% per stack."]
, ["灰燼之心","Ashen Heart"]
, ["基礎傷害增加 30%，但最大生命減少 25%。","+30% base damage, but maximum HP -25%."]
, ["詛咒聖杯","Cursed Chalice"]
, ["吸血 6%，但受到傷害增加 25%。","6% lifesteal, but incoming damage +25%."]
, ["厄運面具","Doom Mask"]
, ["暴擊機率增加 22%，但受到傷害增加 20%。","+22% critical chance, but incoming damage +20%."]
, ["血之硬幣","Blood Coin"]
, ["處決生命低於 15% 的敵人，但治癒效果減少 50%。","Execute foes below 15% HP, but healing -50%."]
, ["暗影鎖鏈","Shadow Chain"]
, ["召喚物傷害增加 65%，但移動速度減少 15%。","+65% summon damage, but movement speed -15%."]
, ["脆弱王冠","Fragile Crown"]
, ["元素傷害增加 55%，但受到傷害增加 35%。","+55% elemental damage, but incoming damage +35%."]
, ["空洞偶像","Hollow Idol"]
, ["攻擊間隔縮短 30%，但每秒損失 1 生命。","Attack intervals 30% shorter, but lose 1 HP/sec."]
, ["黑曜之鏡","Black Mirror"]
, ["反彈受到傷害的 85%，但傷害抗性減少 20%。","Reflect 85% incoming damage, but damage resistance -20%."]
, ["選擇遺物","Choose relic"]
, ["重抽獎勵","Reroll rewards"]
, ["放逐遺物","Banish relic"]
, ["冒險結束","Expedition Ended"]
, ["所有祝福已達到最高等級","All blessings are at maximum rank"]
, ["🏆 遠征勝利！","🏆 Expedition Victory!"]
, ["💀 冒險結束","💀 Expedition Ended"]
, ["幽暮之門已開啟","The Twilight Gate is open"]
, ["獎勵無法領取，請重新選擇","Could not claim the reward; please choose again"]
, ["請靠近事件","Move closer to the event"]
, ["目前無法選擇此項目","This option is currently unavailable"]
, ["永久研究未完成：儲存失敗或條件不足","Permanent research failed: could not save or requirements not met"]
, ["研究未解鎖或儲存失敗","Research not unlocked or saving failed"]
, ["裝備未解鎖或儲存失敗","Equipment not unlocked or saving failed"]
, ["祝福未解鎖或儲存失敗","Blessing not unlocked or saving failed"]
, ["造型尚未解鎖或儲存失敗","Cosmetic not unlocked or saving failed"]
, ["永久資料無法安全重置，原有紀錄已保留","Unable to safely reset permanent data; existing records were preserved"]
, ["最終決戰","Final Battle"]
, ["存活","Survived"]
, ["擊敗","Defeated"]
, ["隻魔物","monsters"]
, ["儲存未確認，未發放永久獎勵","Save unconfirmed; no permanent rewards granted"]
, ["已獲得聖物","Relic obtained"]
, ["血月大教堂","Blood Moon Cathedral"]
, ["哥德式教堂長廊、血月、儀式法陣與腐化祭壇","Gothic nave, blood moon, ritual circles and corrupted altars"]
, ["詛咒森林","Cursed Forest"]
, ["古樹、毒性孢子與纏繞樹根，還有可淨化的林地","Ancient trees, toxic spores and grasping roots with purifiable groves"]
, ["深淵墓城","Abyssal Necropolis"]
, ["墓穴、幽靈迷霧、詛咒之地與遊蕩的鬼火","Tombs, spectral fog, cursed ground and wandering wraith lights"]
, ["天穹裂隙","Celestial Rift"]
, ["漂浮的奧術遺跡、不穩定的裂隙與帶電的星界氣流","Floating arcane ruins, unstable rifts and charged celestial currents"]
, ["深淵君王","Abyss Monarch"]
, ["暮色帷幕","Veil of Dusk"]
, ["第二階段","Phase II"]
, ["最終階段","Final phase"]
, ["召喚王廷","Summoned Court"]
, ["深淵崩塌","Abyssal Collapse"]
, ["霜寒君主","Frost Sovereign"]
, ["寒冬彈幕","Winter Barrage"]
, ["冰封堡壘","Frozen Bastion"]
, ["絕對零度","Absolute Zero"]
, ["煉獄泰坦","Infernal Titan"]
, ["巨神之鎚","The Great Hammer"]
, ["熔岩大地","Molten Earth"]
, ["泰坦狂怒","Titan Enraged"]
, ["星蝕熾天使","Eclipse Seraph"]
, ["聖光昇華","Light Ascendant"]
, ["暗影逆轉","Dark Reversal"]
, ["完全星蝕","Total Eclipse"]
, ["暗影刺客","Shadow Assassin"]
, ["死靈法師","Necromancer"]
, ["暗影弓手","Dark Archer"]
, ["疫病使者","Plague Carrier"]
, ["盾衛守護者","Shield Guardian"]
, ["幻影","Phantom"]
, ["烈焰小鬼","Fire Imp"]
, ["霜寒怨靈","Frost Wraith"]
, ["狂戰士","Berserker"]
, ["水晶哨衛","Crystal Sentinel"]
, ["銳利祝福","Sharpened Blessing"]
, ["所有傷害 +28%","All damage +28%"]
, ["疾風腳步","Gale Steps"]
, ["移動速度 +13%","Movement speed +13%"]
, ["迅捷之星","Star of Haste"]
, ["攻擊間隔縮短 16%（可疊加）","Attack interval -16% (stacks)"]
, ["生命之光","Light of Life"]
, ["生命上限 +40，立即恢復最多 60 生命","Max HP +40; restore up to 60 HP immediately"]
, ["雙重魔力","Dual Magic"]
, ["每級增加一次同時攻擊（最多四擊），射程 +1%","Add one simultaneous attack per level (up to four); attack range +1%"]
, ["旋轉護符","Orbiting Charm"]
, ["增加一枚環繞飛刃並提高觸碰傷害","Add one orbiting blade and increase contact damage"]
, ["水晶磁力","Crystal Magnetism"]
, ["經驗吸取範圍每級增加 62","Increase XP attraction radius by 62 per level"]
, ["自然治癒","Natural Regeneration"]
, ["每級每秒恢復 1.05 生命","Regenerate 1.05 HP/sec per level"]
, ["落雷祝福","Lightning Blessing"]
, ["週期落雷打擊魔物，高等級最多七名","Periodic lightning strikes; up to seven targets at high levels"]
, ["極寒新星","Frost Nova"]
, ["定期釋放更大範圍冰霜衝擊並減速敵人","Periodically release a wider frost shockwave that slows enemies"]
, ["殞星轟擊","Meteor Strike"]
, ["召喚隕石砸落，擴大爆炸範圍","Call down meteors with a wider blast radius"]
, ["焚天烈環","Blazing Halo"]
, ["周身火焰範圍隨等級增大，持續造成傷害","Deal sustained damage with flames that expand as they level up"]
, ["虛空渦流","Void Vortex"]
, ["擴大吸引周圍敵人並造成範圍傷害","Pull nearby enemies from a wider area and deal area damage"]
, ["聖光障壁","Holy Barrier"]
, ["每級減少 13% 受到的傷害（上限 52%），立即恢復最多 28 生命","Reduce damage taken by 13% per rank (max 52%); restore up to 28 HP"]
, ["連鎖雷擊","Chain Lightning"]
, ["殺戮序曲","Killing Spree"]
, ["狂暴殺戮","Rampage"]
, ["全場磁吸","Global Magnet"]
, ["✦ 全場磁吸 · 吸引所有經驗水晶","✦ Global Magnet · Attract All XP Crystals"]
, ["詛咒 · 有代價","Cursed · Comes at a Cost"]
, ["跳過揭曉動畫","Skip Reveal"], ["跳過結算動畫","Skip Results Animation"]
, ["無盡屠戮","Massacre"]
, ["毀滅狂潮","Annihilation"]
, ["暮光浩劫","Eclipse Massacre"]
, ["神之殲滅","Godlike"]
, ["瞬間多殺","Multikill"]
, ["首領破防 · 傷害提升","Boss staggered · Damage increased"]
, ["戰鬥震動","Combat haptics"]
, ["僅支援震動的觸控裝置，減少動態時停用","Supported touch devices only; disabled with reduced motion"]
, ["感電減速時間","Shock slow duration"]
, ["擊殺額外放電目標","Kill discharge targets"]
, ["定期在敵群間彈跳更強的閃電","Stronger lightning periodically chains between enemies"]
, ["黎明遺庭","Dawnfall Courtyard"]
, ["晨光薄霧","Dawn Mist"]
, ["蒼雷聖域","Stormbound Sanctuary"]
, ["暴風雷雨","Thunderstorm"]
, ["霜華回廊","Frostbloom Passage"]
, ["極寒飛雪","Blizzard"]
, ["灰燼戰線","Ashen Front"]
, ["熾焰灰燼","Burning Embers"]
, ["🏆 擊敗森林魔王！","🏆 Forest Boss Defeated!"]
, ["🏆 擊敗深淵君王！","🏆 Abyss Monarch Defeated!"]
, ["🏆 擊敗霜寒君主！","🏆 Frost Sovereign Defeated!"]
, ["🏆 擊敗煉獄泰坦！","🏆 Infernal Titan Defeated!"]
, ["🏆 擊敗星蝕熾天使！","🏆 Eclipse Seraph Defeated!"]
, ["✦ 古代寶箱 · 選擇一件聖物","✦ Ancient Chest · Choose a Relic"]
, ["✦ 開啟古代寶箱 · 獲得經驗","✦ Ancient Chest Opened · Experience Gained"]
, ["✦ 魔法祭壇 · 回復生命","✦ Magic Shrine · Health Restored"]
, ["⚠ 菁英入侵 · 遺跡守衛現身","⚠ Elite Invasion · Ruins Guardian Appears"]
, ["✦ 暫時祝福 · 持續恢復生命","✦ Temporary Blessing · Regenerating Health"]
, ["✦ 禁忌契約 · 以生命換取力量","✦ Forbidden Pact · Trade Health for Power"]
, ["⚠ 試煉開始 · 留在法陣內 9 秒","⚠ Trial Started · Stay in the Circle for 9 Seconds"]
, ["試煉失敗 · 離開法陣","Trial Failed · Left the Circle"]
, ["✦ 試煉完成 · 經驗獎勵","✦ Trial Complete · Experience Reward"]
, ["冰霜雷暴","Frost Thunderstorm"]
, ["每 4.4 秒喚起冰雷連擊，傷害並持續減速最多 5 名敵人","Call down icy lightning every 4.4 seconds, damaging and slowing up to 5 enemies"]
, ["極寒新星 Lv.3 + 連鎖雷擊 Lv.3","Frost Nova Lv.3 + Chain Lightning Lv.3"]
, ["煉獄奇點","Infernal Singularity"]
, ["每 5 秒引爆灼熱引力場，牽引並焚燒周圍敵人","Detonate a burning gravity field every 5 seconds, pulling and burning nearby enemies"]
, ["焚天烈環 Lv.3 + 虛空渦流 Lv.3","Blazing Halo Lv.3 + Void Vortex Lv.3"]
, ["末日星雨","Apocalyptic Starfall"]
, ["每 6.5 秒向敵群落下數道高傷害隕火爆炸","Rain multiple devastating meteors on enemy groups every 6.5 seconds"]
, ["殞星轟擊 Lv.3 + 焚天烈環 Lv.3","Meteor Strike Lv.3 + Blazing Halo Lv.3"]
, ["劍刃風暴","Blade Tempest"]
, ["每 2.4 秒釋放一圈高速劍刃，對周圍敵人造成傷害","Launch a spinning ring of blades every 2.4 seconds, damaging nearby enemies"]
, ["旋轉護符 Lv.3 + 迅捷之星 Lv.3","Orbiting Charm Lv.3 + Star of Haste Lv.3"]
, ["守護聖域","Guardian Sanctuary"]
, ["每 5.5 秒恢復生命並獲得短暫免傷結界","Restore health and gain brief invulnerability every 5.5 seconds"]
, ["聖光障壁 Lv.3 + 自然治癒 Lv.3","Holy Barrier Lv.3 + Natural Regeneration Lv.3"]
, ["✨ 等級提升！","✨ Level Up!"]
, ["水晶磁力增強！","Crystal Magnetism Enhanced!"]
, ["殞星之力覺醒！","Meteor Power Awakened!"]
, ["虛空渦流更強大了！","Void Vortex Empowered!"]
, ["焚天烈環開始燃燒！","Blazing Halo Ignited!"]
, ["極寒新星冰封敵人！","Frost Nova Freezes Enemies!"]
, ["連鎖雷擊激活！","Chain Lightning Activated!"]
, ["傳說進化！","Legendary Evolution!"]
, ["✦ 場景轉換：","✦ Entering New Area:"]
, ["⚠ 魔王降臨！","⚠ Boss Incoming!"]
, [" · ⚠ 儲存未確認，未發放永久獎勵"," · ⚠ Save Unconfirmed; Permanent Rewards Withheld"]
, ["最終決戰 ·","Final Battle ·"]
, ["冒險者殿堂","Adventurer Hall"]
, ["黑夜吞沒失落王國，只有最後的冒險者能迎接黎明。","Darkness has swallowed the lost kingdom. Only the final adventurer can bring the dawn."]
, ["踏入幽暮遺跡，與無盡魔物決一死戰。","Enter the twilight ruins and fight the endless hordes."]
, ["♫ 點擊啟用主題音樂","♫ Tap to Enable Theme Music"]
, ["目前選擇的英雄角色","Currently Selected Hero"]
, ["選擇你的起始職業","Choose Your Starting Class"]
, ["三種戰鬥風格，選擇屬於你的生存之道。","Three fighting styles. Choose your path to survival."]
, ["點擊選擇","Select"]
, ["自動攻擊 · 收集精華 · 覺醒全新能力","Auto-attack · Collect Essence · Awaken New Powers"]
, ["⌨ WASD / 方向鍵移動","⌨ Move: WASD / Arrow Keys"]
, ["SPACE 衝刺","SPACE Dash"]
, ["P 暫停","P Pause"]
, ["手機支援觸控操作","Touch Controls Supported on Mobile"]
, ["遠征結算","Expedition Results"]
, ["征討紀錄","Enemies Defeated"]
, ["尚無魔物擊殺","No Monsters Defeated"]
, ["覺醒能力","Awakened Abilities"]
, ["種","types"]
, ["返回選角 · 殿堂","Back to Hero Selection · Hall"]
, ["遊戲快速操作","Quick Game Controls"]
, ["暫停","Pause"]
, ["暮光遺跡 · 戰域","Twilight Ruins · Battlefield"]
, ["☠ 墮落守望者 · MVP","☠ Fallen Watcher · MVP"]
, ["按","Press"]
, ["選擇其中一項能力後繼續冒險","Choose an Ability to Continue"]
, ["畫面效果","Visual Effects"]
, ["升級時不會晃動背景；可選擇保留柔和淡入或完全靜止。","The background stays steady during upgrades; choose a gentle fade or no animation."]
, ["技能升級畫面","Skill Upgrade Screen"]
, ["只顯示輕柔過場效果","Show a Gentle Transition"]
, ["無動畫","No Animation"]
, ["靜止畫面，專注選擇","Static Screen for Focused Selection"]
, ["戰鬥鏡頭震動","Combat Camera Shake"]
, ["戰鬥受到衝擊時的短暫回饋，不影響升級畫面","Brief feedback on impact; does not affect upgrade screens"]
, ["開啟","On"]
, ["關閉","Off"]
, ["技能升級畫面效果","Skill Upgrade Effects"]
, ["關閉戰鬥鏡頭震動","Turn Off Combat Camera Shake"]
, ["開啟戰鬥鏡頭震動","Turn On Combat Camera Shake"]
, ["設定會自動儲存至此瀏覽器。","Settings Are Saved in This Browser"]
, ["遊戲模式","Game Mode"]
, ["選擇遠征模式","Choose Expedition Mode"]
, ["冒險者總紀錄","Overall Adventurer Record"]
, ["總遠征","Total Expeditions"]
, ["戰績 · 永久強化 · 成就 · 圖鑑","Records · Permanent Upgrades · Achievements · Compendium"]
, ["永久攻擊傷害 +4% / 階","Permanent Attack Damage +4% / Rank"]
, ["永久最大生命 +12 / 階","Permanent Maximum HP +12 / Rank"]
, ["於下一次遠征生效","Takes Effect Next Expedition"]
, ["僅影響外觀，不影響戰鬥數值","Visual Only · Does Not Affect Combat"]
, ["個人最佳紀錄","Personal Best"]
, ["尚未挑戰","Not Yet Attempted"]
, ["冒險成就","Adventure Achievements"]
, ["首次擊倒後公開資料","Details Unlock After First Kill"]
, ["重置所有進度","Reset All Progress"]
, ["確定永久刪除成就、餘燼、紀錄及造型嗎？","Permanently Delete Achievements, Embers, Records and Cosmetics?"]
, ["確認刪除","Confirm Deletion"]
, ["初始外觀","Default Appearance"]
, ["首勝解鎖","Unlock After First Victory"]
, ["百魔斬解鎖","Unlock After Hundred Slayer"]
, ["魔王終結者解鎖","Unlock After Boss Slayer"]
, ["點擊套用","Equip"]
, ["種技能","Skills"]
, ["本次戰役","Current Battle"]
, ["ECLIPSE · 英雄","ECLIPSE · HERO"]
, ["01 / 命運繼承者","01 / THE CHOSEN"]
, ["02 / 遠征","02 / THE EXPEDITION"]
, ["✦ 天穹星蝕 ✦","✦ THE CELESTIAL ECLIPSE ✦"]
, ["✦ 勝利 · 黎明重現 ✦","✦ VICTORY · THE DAWN RETURNS ✦"]
, ["✧ 戰敗 · 長夜未盡 ✧","✧ DEFEAT · THE NIGHT ENDURES ✧"]
, ["HERO","HERO"]
, ["古代寶箱","Ancient Chest"]
, ["魔法祭壇","Magic Shrine"]
, ["菁英入侵","Elite Invasion"]
, ["短暫祝福","Temporary Blessing"]
, ["契約 -14HP","Pact -14 HP"]
, ["危險試煉","Dangerous Trial"]
, ["升級！","LEVEL UP!"]
, ["暗潮湧動","Shadows Gathering"]
, ["魔物突襲","Monster Assault"]
, ["戰利品時刻","Reward Wave"]
, ["短暫喘息","Brief Respite"]
, ["首領即將降臨","Boss Incoming"]
, ["首領決戰","Boss Battle"]
, ["競技場第 ","Arena Wave "]
, ["精英首領襲來","Elite Boss Approaching"]
, ["本次遠征獲得的餘燼","Embers Earned This Expedition"]
, ["）",")"]
, ["✦ CELESTIAL LEGACY ✦","✦ 天穹傳承 ✦"]
, ["EQUIPPED","Equipped"]
, ["WAVE","Wave"]
, ["PHASE","Phase"]
, ["TIME","Time"]
, ["KILLS","Kills"]
, ["COMBO","Combo"]
, ["RELICS","Relics"]
, ["✦ CELESTIAL ENCOUNTER ✦","✦ 天穹奇遇 ✦"]
, ["黑暗奇幻生存冒險","A DARK FANTASY SURVIVAL ADVENTURE"]
, ["第一章","CHAPTER I"]
, ["隕落王國","THE FALLEN KINGDOM"]
, ["命運繼承者","THE CHOSEN HERO"]
, ["啟程準備","PREPARE YOUR JOURNEY"]
, ["✧ 選擇英雄 ✧","✧ SELECT YOUR HERO ✧"]
, ["升級 · 選擇你的祝福","LEVEL UP · CHOOSE YOUR BLESSING"]
, ["· 進化","· EVOLUTION"]
, ["✦ ECLIPSE SURVIVORS · 遠征報告 ✦","✦ ECLIPSE SURVIVORS · EXPEDITION REPORT ✦"]
, ["✦ 系統 · 選項 ✦","✦ SYSTEM · OPTIONS ✦"]
, ["02 / 選擇遠征","02 / SELECT YOUR JOURNEY"]
, ["第二章 · 模式","CHAPTER II · MODES"]
, ["✦ 天穹傳承 ✦","✦ CELESTIAL LEGACY ✦"]
, ["行動操作 · 無障礙","MOBILE · ACCESSIBILITY"]
, ["遊戲已暫停","Game is paused"]
, ["玩家狀態異常","Invalid player state"]
, ["事件已過期","Event expired"]
, ["請進入互動範圍","Move into interaction range"]
, ["生命值不足","Insufficient HP"]
, ["經驗值不足","Insufficient XP"]
, ["請先完成目前目標","Finish the current objective"]
, ["遺物背包已滿或獎勵不可領取","Relic inventory full or unavailable"]
, ["敵人數量已達上限","Enemy capacity reached"]
, ["獎勵已領取","Reward Claimed"]
, [" 降臨！"," Arrives!"]
, ["選擇","Select"]
, ["🏅 新成就：","🏅 New achievement: "]
, ["✧ 新造型：","✧ New cosmetic: "]
, ["✧ 冒險者殿堂","✧ Adventurer Hall"]
, ["✦ 暮光餘燼","✦ Twilight Embers"]
, ["擊殺 ·","Kills ·"]
, ["秒 · Lv.","sec · Lv."]
, ["能力圖鑑","Ability Compendium"]
, ["本次遠征英雄：","Expedition Hero: "]
, ["領取 ","Claim "]
, ["放逐 ","Banish "]
  , ['日蝕高懸於古老的廢墟戰場上', 'A radiant eclipse hangs over an ancient ruined battlefield']
  , ['✦ 已獲得聖物：', '✦ Relic obtained: ']
  , ['存活 {seconds} 秒 · 擊敗 {kills} 隻魔物 · 等級 {level}', 'Survived {seconds}s · Defeated {kills} enemies · Lv.{level}']
  , ["普通寶箱", "Common Chest"]
  , ["稀有寶箱", "Rare Chest"]
  , ["史詩寶箱", "Epic Chest"]
  , ["傳說寶箱", "Legendary Chest"]
  , ["詛咒寶箱", "Cursed Chest"]
  , ["普通品質徽記", "Common Rarity Badge"]
  , ["稀有品質徽記", "Rare Rarity Badge"]
  , ["傳說品質徽記", "Legendary Rarity Badge"]
  , ["生命值圖示", "Health HUD Icon"]
  , ["經驗值圖示", "Experience HUD Icon"]
  , ["冷卻時間圖示", "Cooldown HUD Icon"]
  , ["任務目標圖示", "Quest HUD Icon"]
  , ["首領討伐徽章", "Boss Slayer Badge"]
  , ["生存達人徽章", "Survivor Badge"]
  , ["能力進化徽章", "Evolution Badge"]
  , ["冒險探索徽章", "Explorer Badge"]
  , ["收藏家徽章", "Collector Badge"]
  , ["完美挑戰徽章", "Flawless Badge"]
  , ["{name} 裝飾圖案", "{name} decorative artwork"]
  , ["{name} 原始角色插畫", "{name} original character illustration"]
  , ["{name} 主動技能圖示", "{name} active ability icon"]
  , ["{name} 主動技能", "{name} active ability"]
  , ["本次遠征英雄：{name}", "Expedition Hero: {name}"]
  , ["{name} 插畫", "{name} illustration"]
  , ["{name} 角色插畫", "{name} character illustration"]
  , ["{name} 技能插畫", "{name} skill artwork"]
  , ["{name} 成就徽章", "{name} achievement badge"]
  , ["{name} 攻擊預警示意", "{name} attack telegraph preview"]
  , ["{name} 場景插畫", "{name} scene illustration"]
  , ["{name} 地板材質", "{name} ground texture"]
  , ["{category} 原始圖板 {id}", "{category} source board {id}"]
  , ["互動世界事件 {kind}", "Interact with world event {kind}"]
  , ["領取 {title}，{description}", "Claim {title}, {description}"]
  , ["放逐 {title}", "Banish {title}"]
  , ["{special}，可施放，按 Q", "{special} Ready — press Q."]
  , ["{special}，尚未就緒", "{special} Not ready."]
  , ["{title} · {seconds} 秒", "{title} · {seconds} sec"]
  , ["冷卻 {seconds} 秒", "Cooldown {seconds} sec"]
  , ["每 3 分鐘 +{embers} 餘燼（最高 1500）", "+{embers} Embers every 3 min (max 1500)"]
  , ["勝利獎勵 {embers} 餘燼", "Victory reward: {embers} Embers"]
  , ["研究 · {cost} ✧", "Research · {cost} ✧"]
  , ["解鎖 · {cost} ✧", "Unlock · {cost} ✧"]
  , ["🔒 {desc}", "🔒 {desc}"]
  , ["{description} · {count} 擊倒", "{description} · {count} defeated"]
  , ["雲端存檔尚未設定","Cloud save is not configured"]
  , ["正在連線","Connecting"]
  , ["訪客・本機存檔","Guest · Local save"]
  , ["正在同步暮光餘燼","Syncing Twilight Embers"]
  , ["暮光餘燼已同步","Twilight Embers synced"]
  , ["無法同步，請重試","Unable to sync. Please retry."]
  , ["雲端餘燼已在其他裝置變更","Cloud balance changed on another device"]
  , ["Google 帳號與雲端存檔","Google account and cloud save"]
  , ["帳號","Account"]
  , ["Google 登入","Google sign-in"]
  , ["目前僅同步暮光餘燼，其他進度與設定保存在此裝置。","Only Twilight Embers sync. Other progress and settings stay on this device."]
  , ["Google 帳號","Google account"]
  , ["不登入也能遊玩。訪客餘燼與 Google 帳號分開保存。","Play without signing in. Guest and Google account balances are saved separately."]
  , ["本機未同步餘燼仍保留。重試或明確選擇使用雲端餘燼。","Unsynced local embers are retained. Retry or explicitly use the cloud balance."]
  , ["使用雲端餘燼將捨棄本機未同步的餘燼變更，其他本機進度不會重置。","Using the cloud balance discards unsynced local ember changes without resetting other local progress."]
  , ["確認使用雲端餘燼","Confirm cloud balance"]
  , ["使用 Google 登入","Sign in with Google"]
  , ["立即同步","Sync now"]
  , ["使用雲端餘燼","Use cloud balance"]
  , ["登出","Sign out"]
  , ["暮光餘燼已儲存至 Google 帳號。","Twilight Embers saved to your Google account."]
  , ["雲端餘燼發生衝突，尚未同步。","Cloud balance conflict. Not synced yet."]
  , ["暮光餘燼尚未同步，請重試。","Twilight Embers not synced yet. Please retry."]
  , ["正在同步暮光餘燼…","Syncing Twilight Embers…"]
  , ["正在連線 Google 帳號…","Connecting to your Google account…"]
  , ["登入成功","Signed in successfully"]
  , ["登入失敗","Sign-in failed"]
  , ["Google 帳號已連結。","Your Google account is connected."]
  , ["Google 登入失敗，請重試。","Google sign-in failed. Please retry."]
  , ["測試模式：餘燼僅保存在本次測試。","Playtest mode: Embers stay in this test session."]
  , ["訪客餘燼保存在本機；登入後可跨裝置同步帳號餘燼。","Guest Embers stay on this device. Sign in to sync account Embers across devices."]
])
const chinese = new Map<string, string>([
  ['TIME', '時間'], ['KILLS', '擊殺'], ['COMBO', '連擊'], ['RELICS', '遺物'],
  ['EQUIPPED', '已裝備'], ['WAVE', '波次'], ['PHASE', '階段'],
  ['VICTORY', '勝利'], ['DEFEAT', '失敗'],
])

const chineseByEnglish = new Map([...english].filter(([, en]) => en.trim().length > 0).map(([zh, en]) => [en, zh]))

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
  const gameTitle = t('暮境遠征')
  document.title = currentLocale.value === 'en' ? gameTitle : `${gameTitle}｜${english.get('暮境遠征')!.toUpperCase()}`
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
// An English item name can appear inside an otherwise Chinese UI label.
// Match only complete words so "Time" never changes "Timekeeper".
const englishNameFragments = [...chineseByEnglish.keys()]
  .filter(key => key.length >= 4 && /^[A-Za-z][A-Za-z0-9' -]*$/.test(key) &&
    /[\u3400-\u9fff]/.test(chineseByEnglish.get(key) ?? ''))
  .sort((a, b) => b.length - a.length)
const englishNameExpression = new RegExp(englishNameFragments
  .map(value => value.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&')).join('|'), 'g')

export function t(value: unknown, params?: Record<string, unknown>): string {
  const source = value === null || value === undefined ? '' : String(value)
  let translated: string
  if (currentLocale.value === 'zh-TW') {
    translated = chinese.get(source) ?? chineseByEnglish.get(source) ??
      (/[A-Za-z]/.test(source) ? source.replace(englishNameExpression, (match, index: number, text: string) => {
        if (/[A-Za-z]/.test(text[index - 1] ?? '') ||
          /[A-Za-z]/.test(text[index + match.length] ?? '')) return match
        return chineseByEnglish.get(match) ?? match
      }) : source)
  } else {
    translated = english.get(source) ?? (/[\u3400-\u9fff]/.test(source)
      ? source.replace(expression, match => english.get(match) ?? match) : source)
  }
  // Substitute user/game values after translating the template. The values are data,
  // not translation keys, and must never be changed by a fragment match.
  return params ? translated.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.hasOwn(params, key) ? String(params[key]) : whole) : translated
}
export const formatNumber = (number: number): string => new Intl.NumberFormat(currentLocale.value).format(number)
