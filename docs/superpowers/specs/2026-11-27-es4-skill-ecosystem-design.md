# ES4 — Adventurer Hall: Eclipse Ascendancy / 暮蝕昇華
Status: PROPOSED DESIGN — implementation not started; numeric values are tuning hypotheses, not verified balance.
Base: 54cad2219010381e14ab8db5f2baf87bf5a921ef (feature/es3-combat-juice-power-pacing-rewards)
Target: feature/es4-adventurer-hall-skill-ecosystem
Date: 2026-11-27

## 1. Goals and baseline
The current ES3 Hall has five research nodes (power, vitality, insight, scavenging, ember-study), each cap 5, three starting equipment and three blessings, achievements and mastery cap 20. Runtime applies the five original research effects in engine.ts and progression.ts. Existing specializations have their own adapters; classic heroes do not currently use that adapter (createHeroRosterAdapter returns null for classics). Existing v3 state validator requires every known research rank and rejects unknown IDs. Cloud wallet is balance/revision only, not a skill-tree cloud save. Preserve existing Hall WebP metal rings, tabs, touch inspector, rank-specific sound and animations. Build meaningful tactical choices for all six heroes, not cosmetic reskins; keep in-run weapons/evolutions/relics intact.

## 2. Alternatives and proposed decision
A. One giant passive tree: more visual complexity, little hero identity, mobile clutter, power creep. B. Six hero-only trees: distinct but no universal build discovery. C. Hybrid constellation: retain core research, six shared disciplines, six personal trees, six cross-tree resonances. Proposed C, with unlock ownership distinct from active attunement. Keep one engine/event integration, one catalog and one graph component. No new currency, no new mandatory Q for classic heroes, no third-party dependency. No paid unlocks or resetting ownership in first release.
Scope: 77 nodes total = 5 retained + 36 universal + 30 personal + 6 synergy; 72 new nodes, 289 total purchasable rank increments including existing ranks. 5 ranks for minor/mechanic nodes; one rank for keystones/resonances. Existing mastery cap 20 unchanged; existing 5 original nodes and costs/effects unchanged.

## 3. Player progression and attunement
Earn Twilight Embers from current verified run receipts → buy ranks → satisfy actual prerequisites → unlock keystones → select an expedition loadout → play and discover weapons/evolutions/relics → earn XP and embers. Hero mastery unlocks personal branches: root at level 1, middle at level 3, signature at level 6; use classic id or heroes: specialization namespace, no fabricated XP. Hero-specific effects activate only for that hero. Universal ranked effects owned apply to all; personal ranked effects only to matching hero. Keystones are owned but inactive unless equipped: max 2 universal + 1 matching hero signature + 1 resonance. Resonance activates only if both required universal keystones are equipped. Switching is free in menu, never mid-run, no automatic equip on purchase, no currency refund. Invalid/missing saved loadout normalizes to empty slots without losing ownership. One immutable run-start snapshot; account change clears old context. Unselected hero or unequipped keystone cannot modify battle. Display OWNED/ACTIVE separately and explain inactive resonance. Always show real source effect, no misleading links.

## 4. Catalog (proposal, values are per rank unless specified)
All requirements in tables are AND. Universal roots require corresponding original node Lv.1. Personal nodes also require mastery gates above. All links refer to stable IDs. Synergy requires both listed keystones owned to purchase; active requires both equipped. A root stat is permanent, but timed/proc behavior must be sourced from one event and reset on a new run. Q-specific effects only for actual existing Q specializations. Classic hero signatures extend existing attack/Dash, not add a fictional Q. No automatic unlock grants.
### 戰意 · Warfare
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| offense-edge | 鋒刃鍛造 | 5 | power Lv.1 | 起始攻擊 +1%/階（新永久攻擊池） |
| offense-precision | 銳眼 | 5 | offense-edge Lv.2 | 暴擊率 +0.5 個百分點/階 |
| offense-momentum | 連戰意志 | 5 | offense-edge Lv.2 | 每次擊殺獲 1 層戰意，持續 4 秒；每層傷害 +0.2%×階，上限 3 層，刷新而不疊時間 |
| offense-execution | 破甲斬 | 5 | offense-precision Lv.3 | 對低於 25% HP 的敵人傷害 +1%/階 |
| offense-fervor | 怒刃節奏 | 5 | offense-momentum Lv.3 | 基本攻擊冷卻 -0.8%/階 |
| offense-war-master | 戰王印記 | 1 | offense-execution Lv.3 + offense-fervor Lv.3 | 基本攻擊第 8 次命中造成一次額外 50% 基礎傷害；內置冷卻 3 秒，不觸發自身 |

### 鐵衛 · Bastion
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| defense-constitution | 淬體 | 5 | vitality Lv.1 | 最大生命 +4/階 |
| defense-armor | 鋼壁 | 5 | defense-constitution Lv.2 | 所受傷害 -1%/階 |
| defense-recovery | 再生脈搏 | 5 | defense-constitution Lv.2 | 每秒恢復最大生命 0.03%/階 |
| defense-resolve | 不屈 | 5 | defense-armor Lv.3 | 生命低於 30% 時所受傷害額外 -1%/階 |
| defense-ward | 護幕 | 5 | defense-recovery Lv.3 | 每 20 秒獲最大生命 0.8%×階的護盾，持續 5 秒，不累積 |
| defense-last-stand | 不滅堡壘 | 1 | defense-resolve Lv.3 + defense-ward Lv.3 | 承受將生命降至 25% 以下的一擊後獲 8% 最大生命護盾，持續 4 秒；冷卻 45 秒，不免死 |

### 秘法 · Arcana
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| arcana-focus | 魔力聚焦 | 5 | insight Lv.1 | 武器技能傷害 +0.8%/階 |
| arcana-celerity | 流轉符文 | 5 | arcana-focus Lv.2 | 武器技能冷卻 -0.8%/階 |
| arcana-reach | 奧術擴界 | 5 | arcana-focus Lv.2 | 具範圍的技能半徑 +1%/階 |
| arcana-frostbind | 霜縛 | 5 | arcana-celerity Lv.3 | 既有緩速持續時間 +2%/階，不延長 Boss 控制免疫 |
| arcana-resonance | 元素共振 | 5 | arcana-reach Lv.3 | 對已受元素狀態影響的敵人技能傷害 +0.6%/階 |
| arcana-echo | 迴響法印 | 1 | arcana-frostbind Lv.3 + arcana-resonance Lv.3 | 每 12 秒下一次符合條件的武器技能產生 35% 傷害的迴響；沿用目標上限，不重觸發 |

### 逐風 · Windwalk
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| mobility-stride | 疾行 | 5 | vitality Lv.1 | 移速 +1%/階 |
| mobility-dash | 疾影步 | 5 | mobility-stride Lv.2 | 既有 Dash 冷卻 -1%/階 |
| mobility-evasion | 輕甲律動 | 5 | mobility-stride Lv.2 | 移動時所受接觸傷害 -0.6%/階 |
| mobility-afterwind | 殘風 | 5 | mobility-dash Lv.3 | Dash 後 2 秒移速 +1%/階，刷新不疊加 |
| mobility-hunter | 獵蹤 | 5 | mobility-evasion Lv.3 | 移動期間基本攻擊射程 +1%/階（不改近戰判定形狀） |
| mobility-windstep | 無痕步法 | 1 | mobility-afterwind Lv.3 + mobility-hunter Lv.3 | Dash 完成後 2 秒內下一次基本攻擊 +25% 傷害；冷卻 8 秒 |

### 尋寶 · Expedition
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| hunt-magnet | 引靈 | 5 | scavenging Lv.1 | 拾取半徑 +2%/階 |
| hunt-learning | 博聞 | 5 | hunt-magnet Lv.2 | 經驗獲取 +0.5%/階 |
| hunt-salvage | 遺物鑑識 | 5 | hunt-magnet Lv.2 | 每場前 1–5 次普通寶箱揭曉提供一次額外免費重擲額度（每次最多 1、全場最多 5；不增寶箱內容） |
| hunt-sustain | 旅途補給 | 5 | hunt-learning Lv.3 | 拾取既有回血物品時恢復量 +2%/階 |
| hunt-fortune | 餘燼慧眼 | 5 | hunt-salvage Lv.3 | 結算基礎餘燼 +0.4%/階，不放大成就、里程碑或其他獎勵 |
| hunt-pathfinder | 遠征指引 | 1 | hunt-sustain Lv.3 + hunt-fortune Lv.3 | 每場首次精英擊殺後得到一次普通寶箱選項重擲額度（共用上限 5；不生成寶箱） |

### 靈契 · Spiritcraft
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| summons-bond | 契約根基 | 5 | insight Lv.1 | 召喚／持續效果傷害 +0.8%/階；同一來源只套一類 |
| summons-tenacity | 靈體韌性 | 5 | summons-bond Lv.2 | 有生命值的召喚物最大 HP +2%/階；無 HP 的效果改為持續時間 +0.5%/階 |
| summons-duration | 靈能延展 | 5 | summons-bond Lv.2 | 有限時間召喚與持續效果時長 +1%/階，不增加 tick 頻率 |
| summons-command | 號令 | 5 | summons-tenacity Lv.3 | 召喚物攻擊間隔 -0.6%/階；無召喚者的持續效果傷害 +0.4%/階 |
| summons-soulward | 護靈 | 5 | summons-duration Lv.3 | 召喚或施放持續效果後獲 3 秒傷害減免 0.6%/階；冷卻 12 秒 |
| summons-chorus | 萬靈共鳴 | 1 | summons-command Lv.3 + summons-soulward Lv.3 | 每 15 秒首次合格召喚攻擊／持續效果命中額外造成 30% 傷害；不可連鎖觸發 |

### 曙鋼騎士 — 近戰承傷、護盾、反擊；不複製聖騎士的自損屏障
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| knight-discipline | 鋼誓 | 5 | 對應英雄專精 Lv.1 | 近戰基本攻擊傷害 +1%/階 |
| knight-guard | 架盾 | 5 | knight-discipline Lv.2 | 受正面接觸傷害 -1%/階（以最後有效面向判定） |
| knight-riposte | 回刃 | 5 | knight-discipline Lv.2 | 有效受傷後 3 秒內下一次近戰攻擊 +2%/階；冷卻 6 秒 |
| knight-bulwark | 壁壘之誓 | 1 | knight-guard Lv.3 | Dash 結束獲 6% 最大 HP 護盾，4 秒，冷卻 15 秒 |
| knight-iron-counter | 鐵誓反擊 | 1 | knight-riposte Lv.3 | 觸發回刃時對最多 3 個相鄰目標造成 45% 基礎傷害；冷卻 10 秒 |

### 夜痕遊俠 — 精準遠射、移動射擊、走位；非無限投射物
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| ranger-aim | 獵弓專精 | 5 | 對應英雄專精 Lv.1 | 遠程基本攻擊傷害 +1%/階 |
| ranger-mark | 獵首標記 | 5 | ranger-aim Lv.2 | 同一目標連續 3 次基本攻擊命中後，下次命中 +2%/階，最多追蹤 1 個目標 |
| ranger-skirmish | 游擊步 | 5 | ranger-aim Lv.2 | 移動時基本攻擊冷卻 -0.6%/階 |
| ranger-piercing-moon | 穿月箭 | 1 | ranger-mark Lv.3 | 每 8 秒下一發基本射擊可穿透 1 名額外敵人；既有穿透上限仍有效 |
| ranger-storm-hunter | 疾風獵手 | 1 | ranger-skirmish Lv.3 | Dash 後下一發基本射擊附加一發 35% 傷害箭；冷卻 10 秒 |

### 虛空術士 — 元素、範圍與連鎖爆發；非召喚職
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| wizard-study | 虛空研習 | 5 | 對應英雄專精 Lv.1 | 武器技能傷害 +1%/階 |
| wizard-circle | 咒陣擴張 | 5 | wizard-study Lv.2 | 具範圍的技能半徑 +1%/階 |
| wizard-channel | 秘法引導 | 5 | wizard-study Lv.2 | 武器技能冷卻 -0.6%/階 |
| wizard-star-collapse | 星核崩解 | 1 | wizard-circle Lv.3 | 每 12 秒下一次區域技能命中造成一次 40% 傷害的小型爆發，最多 5 目標 |
| wizard-double-sigil | 雙重咒印 | 1 | wizard-channel Lv.3 | 每第 6 次合格技能施放產生 30% 傷害的額外迴響；冷卻 10 秒 |

### 影刃行者 — 暴擊、影襲、潛行後爆發；保留既有 Q 機制
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| shadowblade-blade | 雙刃技藝 | 5 | 對應英雄專精 Lv.1 | 基本攻擊暴擊率 +0.6 個百分點/階 |
| shadowblade-vanish | 幽影遁形 | 5 | shadowblade-blade Lv.2 | 既有影襲潛行時長 +2%/階，不增加免傷時間 |
| shadowblade-ambush | 伏擊 | 5 | shadowblade-blade Lv.2 | 離開潛行後首擊傷害 +2%/階；每次潛行只觸發一次 |
| shadowblade-phantom | 幻影連襲 | 1 | shadowblade-vanish Lv.3 | Q 影襲結束後殘影攻擊 1 個合格目標，40% 傷害，冷卻 10 秒 |
| shadowblade-assassin | 絕影終結 | 1 | shadowblade-ambush Lv.3 | 伏擊首擊對生命低於 25% 目標額外 +30% 傷害；冷卻 12 秒，不強制秒殺 |

### 靈契召喚師 — 靈體群體協作、靈潮集結與回復；保留召喚上限
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| spirit-summoner-pact | 靈魂契約 | 5 | 對應英雄專精 Lv.1 | 召喚物傷害 +1%/階 |
| spirit-summoner-pack | 群靈號令 | 5 | spirit-summoner-pact Lv.2 | 召喚物攻擊冷卻 -0.6%/階 |
| spirit-summoner-mend | 共生 | 5 | spirit-summoner-pact Lv.2 | 既有 Q 靈潮回復量 +3%/階 |
| spirit-summoner-legion | 萬靈軍勢 | 1 | spirit-summoner-pack Lv.3 | Q 靈潮後 4 秒召喚傷害 +15%，冷卻 15 秒；不增加實體數 |
| spirit-summoner-soul-bond | 靈魂共生 | 1 | spirit-summoner-mend Lv.3 | Q 回復後獲最大 HP 5% 護盾，4 秒，冷卻 15 秒 |

### 緋紅聖騎 — 血誓代價、吸收傷害、緋紅報復；不取代騎士
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| crimson-paladin-oath | 緋紅誓約 | 5 | 對應英雄專精 Lv.1 | 既有 Q 血誓屏障吸收上限 +2%/階，生命代價不變 |
| crimson-paladin-sacrifice | 殉道 | 5 | crimson-paladin-oath Lv.2 | 屏障存續中受傷減免 +0.6%/階；自損不減免 |
| crimson-paladin-vengeance | 報復 | 5 | crimson-paladin-oath Lv.2 | 既有屏障終結爆發傷害 +2%/階 |
| crimson-paladin-blood-sanctuary | 血誓聖域 | 1 | crimson-paladin-sacrifice Lv.3 | 屏障正常結束後 3 秒獲每秒最大 HP 1% 回復；冷卻 20 秒，不抵銷全部代價 |
| crimson-paladin-crimson-reckoning | 緋紅審判 | 1 | crimson-paladin-vengeance Lv.3 | 既有報復爆發半徑 +15%、傷害 +20%；冷卻 20 秒，目標上限不變 |

### 跨樹共鳴
| Stable ID | 節點 | 上限 | 前置 | 效果（初始平衡提案） |
|---|---|---:|---|---|
| synergy-blade-and-bastion | 鐵血戰魂 | 1 | offense-war-master Lv.1 + defense-last-stand Lv.1 | 有效受傷後 4 秒內首個戰王追加攻擊 +20% 傷害；冷卻 15 秒 |
| synergy-spellwind | 流風秘法 | 1 | arcana-echo Lv.1 + mobility-windstep Lv.1 | Dash 後 3 秒內一次迴響額外 +15% 傷害；冷卻 15 秒 |
| synergy-soulforge | 靈魂熔爐 | 1 | arcana-echo Lv.1 + summons-chorus Lv.1 | 一次符合兩類的命中只觸發較強額外攻擊，並額外 +10% 傷害；冷卻 15 秒 |
| synergy-hunter-instinct | 逐獵之心 | 1 | mobility-windstep Lv.1 + hunt-pathfinder Lv.1 | 每場首次精英擊殺後額外 5 秒 +8% 移速；不新增獎勵 |
| synergy-guardian-spirits | 守誓靈衛 | 1 | defense-last-stand Lv.1 + summons-chorus Lv.1 | 不滅堡壘觸發後 4 秒召喚／持續效果傷害 +10%；冷卻 45 秒 |
| synergy-reaper | 收割者之路 | 1 | offense-war-master Lv.1 + hunt-pathfinder Lv.1 | 每場首次精英擊殺後下一次戰王追加攻擊 +25% 傷害；不增加餘燼 |

## 5. Economy and balance
Use the existing embers wallet and atomic local transaction path; no second wallet. Proposed new costs: universal rank nodes by topology tier (root 40/20, middle 65/25, deep 90/35); hero ranked nodes root 50/25, middle 80/35. Formula cost = first + step*currentRank + 20*max(0,currentRank-2)^2. Universal keystone 320, hero signature 380, resonance 450. Prices/caps in JSON, not UI. Existing legacy prices untouched. Each purchase validates catalog, mastery, all prerequisites, rank, safe integer and sufficient funds; deduct once only after successful commit. No refund, no bypass by repeated tap, no payout on unlocking. New reward gain cap +2% of base settlement only, additive to existing ember study; no extra run receipts or reward ledger entries. Free reroll charges share per-run cap 5, consume on use, no additional chest loot; audit existing reroll semantics before enable. No new reward source.
Initial guardrails on new permanent bonuses (after original legacy, before run upgrades): added general damage multiplier ≤1.15; added global damage reduction ≤15% (existing damage floor and invulnerability rules remain); movement multiplier ≤1.10, cooldown multiplier ≥.85, radius multiplier ≤1.10, added crit ≤5 percentage points, pickup radius ≤1.15, new XP gain ≤1.05. Clamp typed modifier pools once; timed/conditional and signature damage also use explicit per-effect caps and proc budgets, not multiplied into recursively triggered damage. Extra proc damage ≤50% of triggering base hit except documented hero signature modifiers; one proc per source event, never proc-on-proc, at most 2 extra effects per event, global proc rate ≤8/s and existing target caps. Shield sources refresh strongest, no unbounded stacking, no new invulnerability or instant kill; bosses respect immunity. Stat math and apply order shared by UI and runtime: legacy → new permanent snapshot → existing run modifiers, conditional at authorized event only. Exact baseline comparisons required before tuning. Target first new node after 1–3 typical successful runs; first signature after 6–12 runs subject to actual mastery and measured receipts, not guaranteed. Measure median/p10/p90 earnings and time-to-unlock from deterministic scenarios and representative play. Compare fresh, existing full legacy, early/mid/high investment; avoid making old content trivial. Any numeric change needs recorded simulation evidence, not just intuition.

## 6. Persistence and cloud safety
Do not simply append RESEARCH entries to v3: strict validation would reject existing saves. Proposed v4 separate head/two slots, preserve v3 bytes and v2 migration; v3→v4 copy all fields, new ownership default 0, empty attunement, keep legacy costs/ledger/account partition. Validate v3 with frozen legacy catalog, v4 with new catalog and mastery/attunement invariants, unknown IDs and impossible rank/dependency rejected. Repair no unknown ownership, do not silently reset corrupt save; invalid selected slots can normalize only after ownership validation. Commit new verified envelope then head; power-loss, quota, duplicate requests and recovery tests. Rollback is explicit export/recovery (no silent downgrade or double-credit). Existing remote balance revision/CAS remains; do not claim skill ownership sync to another device. Block spending when wallet conflict or storage blocked. New version must have documented downgrade/mixed-client handling; if shared wallet cannot safely prevent stale-client double-spend, disable new purchases for cloud-connected accounts until a compatible server contract exists. No live deployment until tested. Unlocked dev storage isolated, no live cloud writes.

## 7. Runtime and presentation
Catalog typed stable IDs, tree, rank/cost, prerequisites, hero gate, effect descriptor, art ID, position/row, i18n keys. Validated DAG, no cycles/orphans/invalid rank requirements; per-node current/next values same modifier functions as runtime. Cross-tree links can be represented by clickable portal chips instead of tangled long edges; within a graph support every edge, including skipped rows (existing hallEdges connects adjacent rows only). Tree viewport pan/zoom only as optional convenience, never required to reach a node; provide list view/search/focus-to-node. Hall tabs: Core / Disciplines / Hero / Resonance (within research), mastery/unlocks/achievements unchanged. Disciplines segmented six, hero tab selects one of six. Compact layout, one inspector, desktop hover preview without purchase authorization, touch tap no forced scroll, safe-area bottom/side sheet, explicit confirmation; keyboard arrow/tab/Escape, screen reader rank and locked reasons; visible attunement slots and links. 320/375/390 widths, 568×320/844×390, tablet/foldable/desktop and 200% zoom, English/zh-TW; no horizontal page overflow or hidden action. Per tree visual palette and consistent semantic SVGs for functional delivery (future 3× transparent WebP optimization is non-blocking): warfare steel/red, bastion bronze, arcana violet, mobility jade, hunt amber, spirit cyan; hero art matches existing six. Shared frame and progress styles; planned 72 semantic icon mappings, reuse existing art only where meaning matches, retain semantic SVGs and individual original-art briefs; future reviewed WebP replacements must have dimensions 3× displayed size, alpha, decode and silhouette legibility. No invented image approval. Rank sounds distinct 1–5 using current Hall sampled engine; one combined arrival layer only when all prerequisites become satisfied. Rank1–4 bounded particles, max-rank crown; signature attune sound distinct from purchase, resonance uses paired motifs, actual destination arrival timed to route, no fake success. Reduced Motion/Flashing and existing SFX mute; no per-frame DOM work or infinite animation loops. New battle feedback uses existing bounded VFX/audio hooks, no extra renderer dependency.

## 8. Acceptance and non-goals
Wave 0 baseline + save and runtime risk audit; Wave 1 graph and migration; Wave 2 shared disciplines; Wave 3 six personal trees; Wave 4 resonance/attunement; Wave 5 Hall UX and assets; Wave 6 audiovisual polish; Wave 7 balance/performance/QA/release. Each slice must have RED→GREEN→REFACTOR, no placeholder abilities or unlock without runtime effect. Acceptance includes all 72 new nodes have at least one effect and traceable test; zero double-spends, wrong hero effects, invalid paths, recursive proc, regressions to legacy/weapon/relic/evolution, no inaccessible controls, no reduced-motion violations. Existing failures tracked separately; no test weakening. Measure existing ES3 130-enemy/long endless p50/p95/p99 with deterministic seed and same graphics settings; proposed ≤5% p95 regression and no increase in unbounded entities, actual device visual/audio review required. No new modes, paid mechanics, account-wide ownership sync, new renderer or full skill-tree replacement of in-run leveling in this scope. New branch isolated; no merge/main/release/force push without user authorization.
