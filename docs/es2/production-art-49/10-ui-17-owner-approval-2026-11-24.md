# ES2 17 項 UI 美術：專案擁有者人工視覺驗收紀錄（2026-11-24）

**最新狀態：17 / 17 人工美術驗收完成（owner-approved）。**

- 專案：[`weskao/eclipse-survivors`](https://github.com/weskao/eclipse-survivors)
- 分支：`feature/es2-release-readiness-integration`
- 審核者：專案擁有者（本對話明確聲明「這些項目已經通過我的人工美術驗收」，並要求更新狀態及文件）
- 確認日期：2026-11-24（Asia/Taipei）
- 範圍：`src/assets/es2/production/ui/manifest.json` 目前列出的 **全部 17 張**正式 UI WebP；僅為 **人工視覺／美術**認可。
- 命名與 Runtime：`WORLD_UI_IDS`／`WORLD_ART.ui` 的 17 個程式 ID、正式圖片路徑和 WebP SHA-256 **不變**。遊戲圖鑑使用新雙語名稱；HTML `data-es2-world-ui` 仍使用原 ID。
- 獨立技術憑證：2026-11-23 [UI 17 Chromium run 45185792128](https://github.com/weskao/eclipse-survivors/actions/runs/45185792128)（該特定舊 SHA 的 4/4 裝置驗證）；並非目前 HEAD 的全套 CI 驗證。

## 17 項逐筆簽核

| 穩定 ID | zh-TW / English 顯示名稱 | 正式 WebP | 目前尺寸 | 人工美術 |
|---|---|---|---:|---|
| `treasure-common` | 普通寶箱 / Common Chest | `treasure-common@3x.webp` | 240×240 | `approved` |
| `treasure-rare` | 稀有寶箱 / Rare Chest | `treasure-rare@3x.webp` | 240×240 | `approved` |
| `treasure-legendary` | 傳說寶箱 / Legendary Chest | `treasure-legendary@3x.webp` | 240×240 | `approved` |
| `treasure-cursed` | 詛咒寶箱 / Cursed Chest | `treasure-cursed@3x.webp` | 240×240 | `approved` |
| `rarity-common` | 普通品質徽記 / Common Rarity Badge | `rarity-common@3x.webp` | 240×240 | `approved` |
| `rarity-rare` | 稀有品質徽記 / Rare Rarity Badge | `rarity-rare@3x.webp` | 192×192 | `approved` |
| `rarity-legendary` | 傳說品質徽記 / Legendary Rarity Badge | `rarity-legendary@3x.webp` | 240×240 | `approved` |
| `hud-health` | 生命值圖示 / Health HUD Icon | `hud-health@3x.webp` | 240×240 | `approved` |
| `hud-xp` | 經驗值圖示 / Experience HUD Icon | `hud-xp@3x.webp` | 240×240 | `approved` |
| `hud-cooldown` | 冷卻時間圖示 / Cooldown HUD Icon | `hud-cooldown@3x.webp` | 240×240 | `approved` |
| `hud-quest` | 任務目標圖示 / Quest HUD Icon | `hud-quest@3x.webp` | 240×240 | `approved` |
| `achievement-boss` | 首領討伐徽章 / Boss Slayer Badge | `achievement-boss@3x.webp` | 192×192 | `approved` |
| `achievement-survivor` | 生存達人徽章 / Survivor Badge | `achievement-survivor@3x.webp` | 192×192 | `approved` |
| `achievement-evolution` | 能力進化徽章 / Evolution Badge | `achievement-evolution@3x.webp` | 192×192 | `approved` |
| `achievement-explorer` | 冒險探索徽章 / Explorer Badge | `achievement-explorer@3x.webp` | 192×192 | `approved` |
| `achievement-collector` | 收藏家徽章 / Collector Badge | `achievement-collector@3x.webp` | 192×192 | `approved` |
| `achievement-flawless` | 完美挑戰徽章 / Flawless Badge | `achievement-flawless@3x.webp` | 240×240 | `approved` |

## 人工簽核與技術驗證分界

本次 **不重繪、不更動圖片像素、來源 provenance、實際顯示尺寸、alpha 或檔案 SHA**。人工批准表示專案擁有者接受目前 17 張正式素材的視覺品質。原始技術 QA 可能指出 `rarity-rare` 與五張原版成就徽章只有 192px；這些歷史記錄與原生 3×來源證據仍如實保留，**不因人工簽核而宣稱有 240px／真實母圖**。

Manifest 類別與各素材狀態改為 `approved`，各素材附 `humanApproval`，`qa.visualReview` 依此確認設為 `approved`。原先 `qa.browserReview: "pending"` 等獨立技術追蹤欄位不應僅憑口頭批准改成 pass；以同 SHA 的實際測試紀錄為準。其他 32 項敵人／Boss／場景素材與英雄 art gate **不在這次批准範圍**，維持各自現況。

## 文件沿革

本項批准 **優先於** 2026-11-23 之前 QA 報告中描述的「0/17 人工核准」「needs-human-approval」；該等段落是當時的歷史快照，保留作為技術證據。更新後需在相關 README、QA 文件及整合計畫明確指向本紀錄。未經本次要求，不替其他素材批次變更狀態。
