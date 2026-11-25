# ES2 17 UI 素材 — 真實 Chromium 技術驗收證據（2026-11-23）

> **最新狀態（2026-11-24）：UI 17/17 已通過專案擁有者人工美術驗收。** `src/assets/es2/production/ui/manifest.json` 已改為逐檔 `approved` 並記錄人工確認。詳見 [10-ui-17-owner-approval-2026-11-24.md](10-ui-17-owner-approval-2026-11-24.md)。本文件舊的 `pending`／`needs-human-approval` 語句及歷史測試結果均保留作為當時快照，**不代表現在仍待人工美術核准**；實機技術驗證仍獨立，其他 32 項素材不受影響。


> **2026-11-23 歷史結果：4/4 裝置實際 Chromium 技術驗收成功；當時 0/17 正式人工美術核准。** 本檔不是美術簽核書。不得因此把 `needs-human-approval` 改成 `approved`，也不可將此結果當成全部 52 項世界／英雄美術驗收完成。

## 版本與權威原始資料

- 專案：https://github.com/weskao/eclipse-survivors
- 程式分支：`feature/es2-release-readiness-integration`
- **實測精確 SHA：`b74f7ddc987d3ece42a9c8dfdcba275f425a2578`**（後續 HEAD 可能繼續變更，必須分開驗證）
- 原始 Manifest：`src/assets/es2/production/ui/manifest.json`（17 unique IDs）
- Chrome workflow：[Run #45185792128](https://github.com/weskao/eclipse-survivors/actions/runs/45185792128)：success
- Evidence artifact：`es2-ui-17-real-browser-qa`（artifact ID `14823822742`；包含真實 screenshots 與 `report.json`）
- 工作流：`.github/workflows/es2-ui-17-browser-qa.yml`
- 真實瀏覽器測試腳本：`scripts/es2-ui-17-browser-qa.mjs`

## 執行範圍與實測結果

從 **production build + 真實 Chromium** 開啟 Vue 遊戲、進入成就圖鑑、逐一捲入檢查 17 張 UI 來源圖片，核對實際 URL、Manifest 尺寸、`HTMLImageElement.decode()` 後來源像素與 CSS 顯示尺寸至少 3:1、viewport 內邊界。其後返回主選單、開始真正的戰鬥畫面，檢查生命／經驗值 HUD；再利用既有 engine 測試介面觸發實際升級對話視窗，檢查稀有度徽章。未注入假 DOM、未以設計 mockup 取代實際遊戲。

| 裝置視窗 (CSS px) | 圖鑑圖片 | 成就徽章 | 實際 HP / XP HUD | 真實升級選項稀有度圖 | 結果 |
|---|---:|---:|---:|---:|---|
| 手機直向 320 × 640 | 17/17 | 6/6 | 2 | 3 | PASS |
| 手機直向 375 × 812 | 17/17 | 6/6 | 2 | 3 | PASS |
| 手機橫向 640 × 360 | 17/17 | 6/6 | 2 | 3 | PASS |
| 桌面 1440 × 900 | 17/17 | 6/6 | 2 | 3 | PASS |

- `report.json` 保存每個 render 圖示的 `naturalWidth`、`naturalHeight`、實際 DOM bounding rectangle、來源 URL 與裝置名稱。
- Artifacts 有 **20 張真正的 Chromium screenshots**：每裝置圖鑑頂部、圖鑑底部、成就、戰鬥 HUD、升級選項共五張。
- 實測無 DOM horizontal overflow、Chrome JS uncaught errors、圖片尺寸與 Manifest 不一致或已捲入視野的圖片超出 viewport 的情況。
- 首次 RED Run [#45184939621](https://github.com/weskao/eclipse-survivors/actions/runs/45184939621) 發現 320px 直向升級清單第二張卡片在螢幕下方、屬於**正常可捲動內容**。在 [`b74f7ddc`](https://github.com/weskao/eclipse-survivors/commit/b74f7ddc987d3ece42a9c8dfdcba275f425a2578) 修正測試腳本，先將每張卡片捲至可視位置後才量測，沒有為了修測試而更動正常遊戲排版。

## 17 張資產與來源處理

- 新增有實際高解析來源／正式 240×240 透明 WebP 的 **7 張**：`treasure-common`、`treasure-rare`、`treasure-legendary`、`treasure-cursed`、`rarity-common`、`rarity-legendary`、`achievement-flawless`。來源由各自 Manifest 的 `qa.masterPath` 等紀錄追溯。
- 維持既有 192×192 的 **10 張**：`rarity-rare`、`hud-health`、`hud-xp`、`hud-cooldown`、`hud-quest`、`achievement-boss`、`achievement-survivor`、`achievement-evolution`、`achievement-explorer`、`achievement-collector`。它們在此次已知的 **≤64 CSS px** 顯示情境中滿足*名目來源尺寸 3×*；但 **192px 的原生繪製細節無獨立母圖簽核，不能視為真實原生 3×已人工通過**。
- 先前已修復的詛咒寶箱物品對應由 `RELIC_BY_ID` 的 `cursed` 屬性決定，不以 item ID 字串猜測；元件測試另有回歸測試。四寶箱圖經正式 `WORLD_ART.ui` 路徑接入。

## 界線與未完成事項（必須維持 pending）

1. **所有 17 張仍是 `needs-human-approval`。** 這份實際截圖足以證明程式尺寸、載入與所測視窗沒有裁切，無法代替審核者判斷微小尺寸對比度、風格、真實原生美術細節與可辨識度。
2. 以上真實狀態只覆蓋「圖鑑 17、成就 6、HUD HP/XP、普通升級稀有度」。**沒有以真實戰鬥完整觸發並截圖四種寶箱獎勵狀態、冷卻特效與任務細節所有組合**；對應 consumer 的單元測試與靜態引用不等於全部 gameplay 場景驗證。
3. 其他 10 張仍需必要時與 `assets/images/imgs10.png` 原始圖比對細節；若實際 QA 發現不合格，依「先真實重繪來源、再 WebP、再 consumer、再測試」流程，不得純插值放大。
4. 完整整合分支 `pnpm test` 仍可因全專案 52 項人工審核 gate 及其他工作流正在進行的 RED 測試而失敗；**專屬 UI Chromium workflow 的 success 不代表整個專案 CI 全綠。**
5. 這次 QA 沒修改英雄、其他世界美術、遊戲平衡、`develop`、`main`，也沒有 PR、force push 或部署。

驗收者請直接從 Run #45185792128 的 artifact 檢視真實圖片及逐張 JSON，判斷是否通過美術，並逐一留下核准證據；不要直接批次變更 manifest status。
