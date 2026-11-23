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
| `frost-wraith` | 166 | 228 | 1.37× | 512 | 3.08× | 目前仍繪製既有橫列 WebP |
| `berserker` | 180 | 264 | 1.47× | 512 | 2.84× | 目前仍繪製既有橫列 WebP |
| `crystal-sentinel` | 208 | 324 | 1.56× | 512 | 2.46× | 目前仍繪製既有橫列 WebP |

## 本次實作：shadow-assassin 512px 來源直接使用

- 原有且已在 Git 的母圖：`src/assets/es2/production/enemies/masters/shadow-assassin-6-poses-3x2-master-1536x1024.webp`；三欄二列，單格 **512×512**，並非放大低畫質 Runtime WebP。
- Runtime 新增 `highResBody`：**一次**載入共享母圖，角色可見時使用 `sourceX=(frame % 3)*512`、`sourceY=Math.floor(frame/3)*512`；Canvas 目的尺寸從當前 `FACTION_VISUAL_SIZE['shadow-assassin']` 讀取（目前 **146×146**），腳部錨點維持 `y=-size+5`。
- 若來源尚未載入或 1536×1024 幾何不符，自動用原有 1296×216 六格 body WebP，保持行為及視覺連續。
- 沒有更動英雄、怪物攻擊 AI、判定、HP、敵人數量、其他 9 類素材、manifest 權威 SHA 或 QA `needs-human-approval`。
- 新增 `production-factions.test.ts` 針對 frame 3、512px source rect、尺寸／腳部錨點及非法 master 回退兩項回歸測試。
- CI: `.github/workflows/es2-enemy-art-browser-qa.yml` 獨立執行上述 renderer regression、十種敵人圖集/預警像素驗證及三組 Chromium 視窗 QA。確切通過結果請參照該 workflow 在目前 HEAD 的 run，不可把 pending 視為成功。
- 記憶體：只額外常駐一張 1536×1024 的原生母圖（未壓縮 RGBA 約 **6 MiB**），不在 rAF 中分配新 Image；需繼續做 130 怪物與實際手機記憶體壓力驗收，不能虛報已測 FPS。

## 未完成與下一步

- 其餘九類 body 的 Runtime 格寬仍應與現行顯示尺寸核對、視覺抽查、依母圖真正重新裁切（不可升頻假冒 3×）。
- 6×1 母圖格尺寸有 **362×724** 等非方形來源，不能直接當作 6×方形圖集繪製；必須確認真實人物完整範圍與 anchor 後才能轉換。
- 其餘 3×2 母圖雖是 512×512 原生格，檔案很大；任何加入常駐解碼都應先量測實體手機記憶體、同屏多敵人與快取上限。
- 英雄 3 張獨立工作；四位 Boss 和八項場景保留各自的品質/人工審核，17 UI 已有專案擁有者單獨的批准紀錄。
- **未完成人工審核者維持 `needs-human-approval`，不可為 CI 全綠修改標記。**
