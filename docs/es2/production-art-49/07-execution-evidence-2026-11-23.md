# ES2 49 項世界美術 — 實際執行、整合與驗收證據（2026-11-23）

> **驗收判定：TECHNICAL QA PASS；ART RELEASE BLOCKED。** 本報告不是人工美術核准書。沒有任何 WebP、英雄素材或原有 gameplay hitbox 因本次世界美術 QA 被替換、重繪或修改。

Repository: https://github.com/weskao/eclipse-survivors  
Target: `feature/es2-release-readiness-integration`

## 一、四組獨立工作與已完成單線整合

| Workstream | Source branch | 來源 QA commit | 整合 commit | 影像異動 |
|---|---|---|---|---|
| 20 敵人與預警 | `feature/es2-art-qa-enemies` | [9cbc070c](https://github.com/weskao/eclipse-survivors/commit/9cbc070cfb6271cfaa4b949b42fa6d673436e341) | [281a8a68](https://github.com/weskao/eclipse-survivors/commit/281a8a6868437c72253ff82dcc6b6cacf3cf4210) | 0 |
| 4 魔王三階段 | `feature/es2-art-qa-bosses` | [12890bc9](https://github.com/weskao/eclipse-survivors/commit/12890bc99e4d9d78a78fa5ad77eee1557ac5e86f) | [1c54d968](https://github.com/weskao/eclipse-survivors/commit/1c54d968a130a867240dc8e92cdb50c6559ba406) | 0 |
| 8 場景地板與裝飾 | `feature/es2-art-qa-biomes` | [643f516d](https://github.com/weskao/eclipse-survivors/commit/643f516ddeb16f8503c0934518626cab4a92ba71) | [5c683bd7](https://github.com/weskao/eclipse-survivors/commit/5c683bd79cf2dc2d4723a09b65b2aac68fc793e8) | 0 |
| 17 UI 素材 | `feature/es2-art-qa-ui` | [6e8d9f81](https://github.com/weskao/eclipse-survivors/commit/6e8d9f81d5acb3696f4da2a341533693a6389594) | [6abf2b4e](https://github.com/weskao/eclipse-survivors/commit/6abf2b4e1eabc23e719c4c66e810e3717b57b64d) | 0 |

四組皆建立獨立 branch；`compare_commits` 確認每分支只有該類別的 `QA_REVIEW_2026-11-23.md`；逐一以當時最新目標 HEAD 建立雙 parent merge commit，`expected_sha` 且未 force push；不改 develop/main，也不碰英雄素材。每類在 `src/assets/es2/production/<category>/QA_REVIEW_2026-11-23.md` 保存完整逐項技術／視覺待辦。

## 二、49/49 項真正 production Chromium 技術驗證

[成功的 GitHub Actions Run 45170008905](https://github.com/weskao/eclipse-survivors/actions/runs/45170008905)（**commit `7aa0c0bf699fbb1005e8f7d225b92c27dfe42daf`，不可誤當成後續 HEAD 的 CI）：

- `scripts/es2-world-art-browser-qa.mjs` 進入**真實 production build 的本機預覽頁**，操作實際圖鑑並逐一取得 URL；10 body +10 telegraph +4 bosses +4 ground +4 decor +17 UI = **49 個唯一資產**。
- 透過 Chromium `new Image().decode()` 真正解碼、以 Canvas 2D `drawImage / getImageData` 確認來源尺寸、alpha、非空畫素；49/49 PASS。結果 JSON 為 Actions screenshot artifact `es2-mobile-browser-screenshots` 內 `world-art/browser-decode-49.json`（artifact ID `14817215162`）。
- 真實 Playwright 圖鑑 screenshots：`world-art/enemies-archive-real-browser.png`、`bosses-archive-real-browser.png`、`biomes-archive-real-browser.png`、`ui-archive-real-browser.png` 和 `ui-archive-bottom-real-browser.png`；另有**當前戰鬥** screenshot `world-art/gameplay-current-encounter-real-browser.png`。
- 這證明資產在正式 Vue UI 中可被瀏覽器載入並顯示，但**並不能**證明 10 種敵人/所有警示/4 位魔王 3 個階段已在每個真實 gameplay state 逐項出現，也不是人工作品簽核。
- 同一 workflow 有 `es2-world-art-source-review`（原始 `imgs*.png`、四份 manifest、49 WebP）和 `es2-built-preview-for-qa`（`dist/`；唯讀 QA、**沒有部署**）供重現。
- 瀏覽器前置 RWD 測試曾在 [Run 45169796873](https://github.com/weskao/eclipse-survivors/actions/runs/45169796873) 的 640×360 等效放大視窗失敗，原因是圖鑑入場 animation 尚未完成就取邊界。已於 [48108f66](https://github.com/weskao/eclipse-survivors/commit/48108f6610f7c30eb667163faa1f3aafaca23dee) 先等待 animation finish；[Run 45170008905](https://github.com/weskao/eclipse-survivors/actions/runs/45170008905) 的含世界美術驗收 Chromium workflow 已完成 success。

## 三、源圖 pixels 與幀／接縫技術判斷

- 敵人：十張 body，每張 `6×96` 長條 WebP。對每張的六個 RGBA 格逐格比較，**未發現像素完全相同的兩格**；個別幀輪廓／動作可能非常相似，角色連續動畫品質仍須真人檢查。原有 `production-factions.ts` 依真實 state 使用六格 source rect，warning 影像為裝飾，傷害幾何仍來自遊戲權威 runtime。
- 魔王：四張 `3×192` 三階段圖集；`production-world.ts` 與 `characters.ts` 有 phase source sampling 和原始圖解碼 fallback。個別相位的邊緣離散粒子／來源裁切風險須同原始 source sheet 比對。
- 場景：四張 768×768 地板、四張 4×96 decor。解碼後第一與最後列／欄 RGB 通道平均絕對差（非完整無縫保證）：

| 地板 | 左右接合 H | 上下接合 V |
|---|---:|---:|
| blood-moon-cathedral | 3.33 | 3.14 |
| cursed-forest | 3.08 | 3.21 |
| abyssal-necropolis | 2.69 | 2.66 |
| celestial-rift | 3.19 | 3.02 |

- UI：17 張 192×192 透明圖全部正常解碼，並在圖鑑中顯示；先前 GitHub 縮圖曾疑似顯示 `rarity-legendary`、`hud-xp` 的水平雜線，但**對原始 WebP 放大檢視時未能確認是原圖殘片**，因此不以此臆測為理由覆蓋已存在的圖像。

## 四、無法藉由補測試或插值解決的 Native 3× 缺口

| 類別 | 現有真正來源格 | 已知最大／典型 1× 顯示 | 名義 3× 最低需求（單格） | 本次判定 |
|---|---:|---:|---:|---|
| 10 敵人 body | 96 px | 70–112 px | 210–336 px | 未達 |
| 10 敵人 telegraph | 96 px | 40 px | 120 px | 未達 |
| 4 魔王 phase | 192 px | 236 px | 708 px | 未達 |
| 4 地板 | 768 px | 384 px | 1152 px | 未達 |
| 4 decor | 96 px | 110 px | 330 px | 未達 |
| 17 UI icon | 192 px | 圖鑑 72 px（其他消費者不同） | 圖鑑 216 px | 此使用情境未達 |

**關鍵：**只把現有 96／192 像素放大到上述尺寸並重新命名 `@3x`，完全無法證明新的「原生 3 倍細節」，而且違反 CLAUDE.md／character-art-3x.md。本次保留原檔與原 hash，沒有用假的放大圖蓋掉目前可用圖像。真正重畫需具體對照既有母圖、逐幀重新繪製、更新 manifest 的 provenance 和 runtime rect，並留存人眼品質簽核。

## 五、CI 與誠實的阻塞狀態

[整合 CI Run 45170972374](https://github.com/weskao/eclipse-survivors/actions/runs/45170972374)（commit `d9317edf9121671529d58e41062e99cc657dba9f`）：

- `pnpm typecheck` = SUCCESS；`pnpm build` = SUCCESS；`pnpm check-release` = SUCCESS。
- `pnpm test` = **151 個測試檔通過，1 個失敗；1122 tests pass、1 fail、1 skip**。
- 唯一 fail：`src/assets/es2/production/heroes/production-art.test.ts` 的真實人工作品 approval gate，阻塞 3 heroes（交由其他對話處理）+ 49 world assets。本次不能跳過 gate 或擅自改所有 asset.status = approved。
- 其他分支上的新 hero work 曾造成暫時 typecheck import 問題，已由英雄工作另行處理；本世界美術任務不修改英雄。

**狀態矩陣：**

| 項目 | 結果 |
|---|---|
| 實際 WebP 存在／SHA／尺寸／Alpha／budget | 技術確認 |
| 49 個 production UI 映射／Chromium 真正解碼 | PASS |
| 各類 Source QA 紀錄及四分支合併 | 完成 |
| 真實遊戲目前場景截圖 | 已取得一個實際 encounter |
| 10 敵人所有動作、4 魔王完整 phase、4 場景全部實際 gameplay／每個 UI 使用場景 | 尚未全面簽核 |
| 確實原生 3×母圖／全方向與逐格連續性 | 未達規範，仍需視覺製作 |
| 49 項 `needs-human-approval` 最終正式核准 | 尚未取得 |
| 完整 CI 全綠 | **未達，保留正式美術 gate** |

請保留全部原始 WebP。若之後各來源高解析重繪獲得可驗證的人工核准，依 [05-integration.md](05-integration.md) 的 asset first → TDD → runtime consumer → screenshots → review → CI 流程逐項更新，絕不可用批次更改 status 取得假綠燈。英雄仍是其他聊天的獨立前置依賴。


## 六、後續真實修正與驗證（2026-11-23）

- [05e6cef0](https://github.com/weskao/eclipse-survivors/commit/05e6cef0962673088f52de6f2f4e80ddc84cd947)：已將原有 `treasure-common@3x.webp` 接入實際 Canvas 世界地圖的古代寶箱標記；圖片載入時以 192px 原圖繪製為 48px（4×），載入失敗時保留既有 ◆ fallback。對應 `environment.world-art.test.ts` 與 `production-world.test.ts` 已經在 CI 中由失敗轉為通過。沒有重新生成既有寶箱圖。
- [f6af207c](https://github.com/weskao/eclipse-survivors/commit/f6af207cba8028c43f28f83987bd62a1eaad4a8c)：`achievement-flawless` 舊圖 192px 來源透明內容主體僅 47px 寬。已針對此可量化問題繪製新的黃金星芒徽章，將真正原生 1254px master（SHA256 `454a88b645054f769d24dfe03b81f9504d4b2c18c1edb3e8bcefeeca94c0933b`）和 240px 正式透明 WebP（SHA256 `d071d42a11ec82317b71c1f70f51416f592d2dd8dbfd1a03efe3ea7f9ceaf701`）都提交入庫。
- [Chromium Run 45177106201](https://github.com/weskao/eclipse-survivors/actions/runs/45177106201)：正式建置成功；真實 UI 圖鑑底部可看到新版本獎章，並完成 49/49 WebP browser decode。此 run 不等於對所有戰鬥狀態的逐角色審核。
- [9bf21fde](https://github.com/weskao/eclipse-survivors/commit/9bf21fdea24354f0e49e84304af1e11f07cb9b2a)：修正新增的 strict TS master-metadata assertion，不變更遊戲行為。

**仍然 pending：**其他敵人、魔王、地板／裝飾等真正原生 3×來源及完整各狀態戰鬥視覺 QA；另一對話的英雄；全部 52 項美術正式人工核准門檻。不可為了讓 CI 全綠擅自修改 status。
