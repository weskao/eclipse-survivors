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
, ["暗蝕敵軍 · 美術圖鑑","Eclipse Factions · Art Compendium"]
, ["以下為實際入庫的 WebP 動畫及攻擊預警示意，尚待美術驗收；命中判定仍以遊戲規則為準。","These in-project WebP animations and telegraphs await final art review; hit detection always follows gameplay rules."]
, ["四位首領 · 三階段視覺預覽","Four Bosses · Three-Phase Preview"]
, ["暗蝕之地 · 地板與場景裝飾","Eclipsed Lands · Terrain & Decorations"]
, ["查看 c104 原始美術圖集（10 張 PNG · 待逐格驗收）","View c104 source art atlas (10 PNGs · pending frame review)"]
, ["原圖已存入專案並由本介面直接引用；尚未通過精靈邊界審核的接觸圖不得當成遊戲動作影格。","Source art is stored in this project. Unverified contact sheets cannot be used as live animation frames."]
, ["寶箱、稀有度、HUD 與成就裝飾 · 美術預覽","Chest, Rarity, HUD & Achievement Art Preview"]
, ["以下 17 張圖尚待美術驗收，展示不會增加成就或變更存檔。","These 17 images await art review. Viewing them does not award achievements or change save data."]
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
, ["傷害數字","Damage Numbers"]
, ["顯示或隱藏戰鬥傷害浮字","Show or hide floating combat damage numbers"]
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
, ["暗影精準：24% 暴擊機率，造成 170% 傷害；升級增強暴擊倍率。","Shadow Precision: 24% critical-hit chance at 170% damage; upgrades raise critical damage."]
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
, ["血誓屏障：犧牲少量生命換取 3.5 秒的吸收護盾；生命低時反擊更強。","Blood Oath Barrier: sacrifice a little health for a 3.5-second absorbing shield; counterattacks are stronger at low health."]
, ["· 專精","· Mastery"]
, ["提升英雄獨有的被動能力","Enhance this hero's unique passive ability"]
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
, ["每級 +4% 起始攻擊（沿用 v2）","+4% starting attack per rank (carried over from v2)"]
, ["生存研究","Vitality Research"]
, ["每級 +12 起始生命（沿用 v2）","+12 starting HP per rank (carried over from v2)"]
, ["洞察研究","Insight Research"]
, ["每級 +1% 起始經驗加成","+1% starting experience gain per rank"]
, ["拾荒研究","Scavenging Research"]
, ["每級 +1% 拾取收益","+1% pickup rewards per rank"]
, ["餘燼研究","Ember Research"]
, ["每級 +1% 未來結算餘燼","+1% future ember rewards per rank"]
, ["守護者護符","Guardian's Talisman"]
, ["騎士專屬起始裝備","Knight starting equipment"]
, ["遊俠箭袋","Ranger's Quiver"]
, ["遊俠專屬起始裝備","Ranger starting equipment"]
, ["法師聚焦器","Mage Focus"]
, ["法師專屬起始裝備","Wizard starting equipment"]
, ["微光祝福","Faint Blessing"]
, ["出發時 +1% 經驗","+1% experience at expedition start"]
, ["漫遊行囊","Wanderer's Pack"]
, ["出發時 +1% 拾取","+1% pickup rewards at expedition start"]
, ["守護誓約","Guardian's Vow"]
, ["出發時 +1% 生命","+1% health at expedition start"]
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
, ["影襲","Shadow Assault"]
, ["靈潮集結","Spirit Rally"]
, ["血誓屏障","Blood Oath Barrier"]
, ["騎士","Knight"]
, ["遊俠","Ranger"]
, ["法師","Wizard"]
, ["角色插畫","Character Illustration"]
])
const chinese = new Map<string, string>([
  ['TIME', '時間'], ['KILLS', '擊殺'], ['COMBO', '連擊'], ['RELICS', '遺物'],
  ['EQUIPPED', '已裝備'], ['WAVE', '波次'], ['PHASE', '階段'],
  ['VICTORY', '勝利'], ['DEFEAT', '失敗'],
])

const chineseByEnglish = new Map([...english].map(([zh, en]) => [en, zh]))

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
  if (currentLocale.value === 'zh-TW') return chinese.get(source) ?? chineseByEnglish.get(source) ?? source
  return english.get(source) ?? (/[\u3400-\u9fff]/.test(source)
    ? source.replace(expression, match => english.get(match) ?? match) : source)
}
export const formatNumber = (number: number): string => new Intl.NumberFormat(currentLocale.value).format(number)
