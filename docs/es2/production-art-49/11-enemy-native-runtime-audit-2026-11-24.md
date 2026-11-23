# ES2 20 項敵人及預警：現行實際尺寸／原生來源更新審查

> 本文件更新現行分支的實際尺寸，取代 2026-11-23 QA_REVIEW 中過期的 96px 格寬判斷。**僅技術改善，不授予美術人工核准。**

## QA 原則與檢查

- 來源：`src/assets/es2/production/enemies/manifest.json` 與 `src/game/render/es2/production-factions.ts`（依最新工作樹重讀）。
- 10 種敵人、10 張預警素材已入庫；各 WebP 的 ID／尺寸／Alpha／SHA 由現有 Vitest 驗證。
- **真正 3×素材需有原生像素母圖證據**；原圖每格寬度達標不等於已通過動畫、表情、武器、影格連續性或人眼審核。
- 預警目前正式顯示 40×40px，各預警圖已是 150px，來源尺寸相當於 3.75×；攻擊幾何獨立於這些裝飾圖示。

## 實際遊戲 Body 比例（不是過期的 96px）

| 敵人 | 戰鬥顯示 px | 既有 Runtime 格寬 px | Runtime 名義倍率 | 真實母圖格寬 px | 原生來源名義倍率 | 實際繪製 |
|---|---:|---:|---:|---:|---:|---|
| `shadow-assassin` | 146 | 216 | 1.48× | 512 | 3.51× | **已使用完整 512px 3×2 master**（保留回退） |
| `necromancer` | 168 | 276 | 1.64× | 362 | 2.15× | 目前仍繪製既有橫列 WebP |
| `dark-archer` | 154 | 228 | 1.48× | 362 | 2.35× | 目前仍繪製既有橫列 WebP |
| `plague-carrier` | 184 | 288 | 1.57× | 362 | 1.97× | 目前仍繪製既有橫列 WebP |
| `shield-guardian` | 208 | 336 | 1.62× | 362 | 1.74× | 目前仍繪製既有橫列 WebP |
| `phantom` | 152 | 210 | 1.38× | 362 | 2.38× | 目前仍繪製既有橫列 WebP |
| `fire-imp` | 142 | 210 | 1.48× | 362 | 2.55× | 目前仍繪製既有橫列 WebP |
| `frost-wraith` | 166 | 228 | 1.37× | 512 | 3.08× | **已使用完整 512px 3×2 master**（保留回退） |
| `berserker` | 180 | 264 | 1.47× | 512 | 2.84× | 目前仍繪製既有橫列 WebP |
| `crystal-sentinel` | 208 | 324 | 1.56× | 512 | 2.46× | 目前仍繪製既有橫列 WebP |

## 本次實作：Shadow Assassin／Frost Wraith 兩套現有 512px 來源直接使用

- 原有且已在 Git 的母圖：`src/assets/es2/production/enemies/masters/shadow-assassin-6-poses-3x2-master-1536x1024.webp` 及 `masters/frost-wraith-6poses-3x2-master-1536x1024.png`；均為三欄二列，每格 **512×512**，非既有 Runtime WebP 插值。
- Runtime 的 `highResBody` 透過 `NATIVE_MASTER_URLS` 提供上述兩個已存在來源；**一次**載入後，角色可見時用 `sourceX=(frame % 3)*512`、`sourceY=Math.floor(frame/3)*512`；Canvas 目的尺寸由 `FACTION_VISUAL_SIZE[kind]` 決定（Assassin **146px**、Frost Wraith **166px**），維持 `y=-size+5` 腳部錨點。
- 若高解析母圖未解碼或 1536×1024 格式不符，各自退回同一角色的既有六格 body WebP，維持原玩法和身分；不得拿其他角色的圖充當 fallback。
- 沒有更動英雄、怪物攻擊 AI、判定、HP、敵人數量、其餘 8 類素材、manifest 權威 SHA 或 QA `needs-human-approval`。
- 新增 `production-factions.test.ts` 覆蓋 Assassin frame 3、Frost Wraith frame 4、512px source rect、當前顯示尺寸／腳部錨點、母圖一次性載入與無效 master fallback；怪物可見範圍亦依各角色實際大小與 24px 預警安全邊界計算。
- CI: `.github/workflows/es2-enemy-art-browser-qa.yml` 獨立執行上述 renderer regression、十種敵人圖集/預警像素驗證及三組 Chromium 視窗 QA。確切通過結果請參照該 workflow 在目前 HEAD 的 run，不可把 pending 視為成功。
- 記憶體：增加兩張 1536×1024 的母圖，未壓縮 RGBA 合計約 **12 MiB**（未計 GPU/解碼暫存）；不在 rAF 中分配新 Image，仍須實測 130 怪物與手機記憶體，不宣稱已量測 FPS。


- QA 預覽目前已直接引用正式 `FACTION_VISUAL_SIZE`；Assassin／Frost Wraith 使用 512px 已提交 master 進行逐格預覽，其他八類顯示真實 1×尺寸與不足 3×的證據。專屬 source QA 可以因真正不合格的原生來源而失敗，但不得自動通過或自動更改核准。

## 未完成與下一步

- 其餘八類 body 的 Runtime 格寬低於當前 3×尺寸要求。必須逐種確認足夠細節的原生母圖、動畫腳步錨點，再做真正新來源裁切或重繪（不能升頻冒充）。
- 6×1 母圖格尺寸有 **362×724** 等非方形來源，不能直接當作 6×方形圖集繪製；必須確認真實人物完整範圍與 anchor 後才能轉換。
- 其餘 3×2 母圖雖是 512×512 原生格，但 Berserker 180px 和 Crystal Sentinel 208px 需要至少 540px／624px 單格；目前 512px 並不達標。新增常駐解碼需先量測手機記憶體與快取上限。
- 英雄 3 項另有獨立工作；4 位 Boss 仍待正式核准，**8 項場景與 17 項 UI 已獲專案擁有者明確視覺批准**，但其技術實測與 release CI 仍個別追蹤。
- **未完成人工審核者維持 `needs-human-approval`，不可為 CI 全綠修改標記。**
