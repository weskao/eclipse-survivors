# Crystal Sentinel 原生 3× 六格動畫 — 技術 QA（2026-11-24）

## 交付與使用處
- 角色：`crystal-sentinel`（保留既有紫晶／石質護甲、發光晶核與巨人輪廓）。
- 原始來源：`masters/crystal-sentinel-6poses-3x2-master-1536x1024.png`，1536×1024，真正獨立製作 3×2 × 512×512 RGBA 六姿勢，SHA-256 `bc93866daa95ab1e5e63db904b2b87ab587c12c52f9a9bda9d5fcf815cfb5556`。
- 正式遊戲 WebP：`crystal-sentinel-body@3x.webp`，1944×324，6×1 × 324×324，98436 bytes（上限 110000），SHA-256 `209753a63bc993ed19678ee3b760188b69225f93ccd456cebaa9530d71b2dc82`。
- 遊戲 Canvas 顯示：半徑 27 × 4 = 108px，324 / 108 = 3.00×；沿用 `production-factions.ts` 的六格切圖、左右鏡像與中心站位，無需修改物理、傷害或正式預警判定。
- 色彩 WebP 品質 60、Alpha 品質 40；使用重新解碼的 PNG/暗色/亮色 108px 預覽驗證，而不只看產圖母檔。

## 六格逐格技術結果
| 0-based frame | 解碼後 alpha 內容 bbox（x0,y0,x1,y1） | 邊界不透明像素 | 前一格完全重複 |
|---|---|---:|---|
| 0 | 29,6,295,305 | 0 | 否 |
| 1 | 35,10,300,306 | 0 | 否 |
| 2 | 34,10,312,304 | 0 | 否 |
| 3 | 13,16,301,305 | 0 | 否 |
| 4 | 20,14,297,312 | 0 | 否 |
| 5 | 9,9,311,316 | 0 | 否 |

本項 TDD 規範測試：`crystal-sentinel-native-source.test.ts`，同時保留專案 `world-art-candidates.test.ts` 原有 WebP checksum／真實尺寸／容量守門。

## 尚未通過的人工與正式環境驗收
- 新圖已接到原有 Vite 靜態素材路徑，但**不等於**逐敵人 6 格在實際戰鬥、桌面、手機直向／橫向、不同地圖都經過人工美術核准。
- 全部 20 項素材現在都有 3× 來源候選與既有遊戲路徑，但 **`status: needs-human-approval`、`visual-review-required` 不得改成已核准**。原有阻擋測試也不得刪除或放寬。
- 請以 Chromium 或實機截圖／影片驗證角色辨識、動作時間點、遠距離尺寸、局部過曝、與敵人血條／預警圖標遮擋，再由使用者簽核。
- 本次沒有修改三位英雄、Boss、美術以外的 Runtime、`develop`、`main` 或部署。
