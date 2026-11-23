# ES2 world-art frame pixel QA — 2026-11-23

> **IN PROGRESS / NOT ART-APPROVED.** 本紀錄不改變 49 項正式素材的 `needs-human-approval` 狀態，也不取代遊戲中的 1× 動態與原生 3× 母圖審核。

## 已提交到整合分支的測試與程式

- [RED contract](https://github.com/weskao/eclipse-survivors/commit/ea85b06348e192fe661910850e8910800225bb15)：每張 WebP 在正式 Chromium 解碼後，必須依 manifest 格數回報每個來源格的可見邊界與有效畫素。
- [GREEN implementation](https://github.com/weskao/eclipse-survivors/commit/d5f272340540531747cf2b29daa3c8a386b32ffb)：`scripts/es2-world-art-browser-qa.mjs` 在真實 production build 的圖鑑 URL 上，以 Canvas `getImageData` 計算每格 `visiblePixels`、`bounds`、`edgePixels` 與 FNV 指紋，並輸出 `artifacts/es2-mobile-browser/world-art/browser-decode-49.json`。對空白格/無可見邊界維持嚴格斷言；指紋相同僅標記「疑似重複」而非自動認定品質不合格。
- [Review refactor](https://github.com/weskao/eclipse-survivors/commit/4a02fa34874fae20701139a37cfa020fab37e7c5)：地板四周必然有不透明畫素，故不應列入透明圖集邊緣污染警示；四張 ground 仍保留平鋪 RGB 色差獨立量測。
- 上述修改不改任何既有 `*.webp`、`manifest.json`、遊戲權威碰撞邏輯或英雄素材；不修改 `develop`/`main`。

## 舊版正式建置樣本的獨立像素檢查

以當前工作容器中先前保存的 `es2_built_preview/assets`（**舊版建置、不能冒充最新 HEAD**）作為交叉參考，用 Pillow 對 49 個既有資產的全部來源格逐一比較 RGBA；結果：

| 檢查 | 舊版樣本結果 | 解釋 |
|---|---|---|
| 49 項檔案可讀 | 49/49 | 僅為建置像素驗證 |
| 有完全空白的來源格 | 0 | 不能證明攻擊動作表演足夠 |
| 相同素材中完全一致的 RGBA 影格對 | 0 | 相似姿勢依然需要真人觀看連續性 |
| 透明影格接觸格線 | 0 | 四張不透明 ground 的四邊接觸為預期 |
| 真正原生 3× 與最終美術批准 | **未通過／待審** | 舊素材檔名 `@3x` 不代表 3× 細節來源 |

**注意：**本表的獨立像素結果只支援舊版樣本；須以最新 `browser-decode-49.json` 再確認 current HEAD 的結果。避免拿前一版通過資料冒充新版本已綠燈。

## 有條件重繪的決策

Shadow Assassin 正式 `body` 原有六格各 96×96，與最大遊戲顯示尺寸相比欠缺原生 3× 母圖細節。曾產生 6 pose 新高解析候選，但縮至遊戲實際尺寸時，部分攻擊特效及披風出現裁切／縮放比例不一致，未達可替代原本六格圖集的品質。**因此未把不合格候選覆蓋 canonical WebP，也未假稱已套用到正式 Runtime。** 正式重新繪製仍需維持原本黑兜帽、紫色披風／雙刃輪廓、六個動作獨立性及畫面內一致的腳部錨點；新來源應經逐格與實際戰鬥截圖驗收後，才可更新 manifest／source rect。

本次也未重新繪製已存在而無確證不合格的其他 UI 圖示。英雄三項繼續由其他對話單獨負責。

## 下一輪真正的 acceptance gate

- 現有 49 項中每個 body、telegraph、boss phase、ground、decor、UI icon：需以目前最大 1× 畫面尺寸核對原生 3× 細節；不合格者真正重畫，**不可只做影像插值放大**。
- 維持畫布/遊戲 consumer 使用真實資產與來源格；逐步補齊四 boss 3 phase、全部敵人動作及 UI 在真實遊戲中的證據。
- 每次更新原圖時以 RED → GREEN → REFACTOR、實際手機/桌面擷取、獨立 review、完整 CI 與 asset SHA 證明；沒有人體視覺核准不得將 pending 改 approved。
- 完整 CI 目前即使 `typecheck/build/check-release` 都通過，`production-art.test.ts` 仍應誠實保留對 52 項（其中 3 heroes 屬別的對話）的阻塞狀態。

**Reference:** [Chromium workflow](https://github.com/weskao/eclipse-survivors/actions/workflows/es2-mobile-browser-smoke.yml) · [Integration workflow](https://github.com/weskao/eclipse-survivors/actions).
