# ES2 49 項既有美術整合、Runtime 驗證與最終 CI Gate

> **2026-11-24 更新：UI 17/17 正式素材已由專案擁有者確認通過人工美術驗收，Manifest 已逐項改為 `approved`。** 簽核紀錄：[10-ui-17-owner-approval-2026-11-24.md](10-ui-17-owner-approval-2026-11-24.md)。下方 2026-11-23 以前的 `needs-human-approval`／`visual-review-required` 描述只代表歷史快照，**不能再用來表示目前 17 項 UI 的人工美術狀態**。此批准不等於其他 32 項素材、英雄、原生 3×來源或最新 HEAD 全專案 CI 已全部通過。


> **可直接執行的 Agent Prompt｜繁體中文**  
> GitHub: https://github.com/weskao/eclipse-survivors  
> 程式整合目標：feature/es2-release-readiness-integration  
> 基準快照：c08e6a5268095e071e0ed15aafde99b2379b85c5（執行時須重新取得最新 HEAD）  
> 目前已有 49/49 項 WebP，請優先重用，禁止無故重製。  
> 英雄 3 項與英雄所有動畫交由其他對話負責，本工作不得修改。

## 目標與邊界

**直接修改** feature/es2-release-readiness-integration（若來源工作並行進行，源分支按下述順序整合）。這不是產生素材的任務；全部 49 項已在目標分支，不要重新創建或覆寫相同圖檔，也不要重做既有 WORLD_ART 系統。

GitHub：https://github.com/weskao/eclipse-survivors
當前快照：c08e6a5268095e071e0ed15aafde99b2379b85c5；開始時重新取得最新 HEAD，嚴格遵守 expected HEAD 防併發覆蓋。

## 依賴關係

Phase 0（已完成清點） → 四組獨立 QA，可**平行**：
- A：01-enemies-20.md（20）
- B：02-bosses-4.md（4）
- C：03-biomes-8.md（8）
- D：04-ui-17.md（17）
英雄 3 項在另一對話獨立處理，禁止本整合者更動英雄素材。

Phase 1：A/B/C/D 各自交付已審查清單、修復測試、artifact 與 SHA。未發現問題時只提交 evidence，**不可為了有 commit 而重製現有素材**。

Phase 2（嚴格單線整合）：重新讀取目標 branch HEAD，逐來源驗證 ancestry、檔案清單、CI 和 reviewer evidence。先整合修正完成的 C（場景）、A（敵人）、B（魔王）、D（UI），亦可依完成先後調整順序；**這是衝突管理順序，不是遊戲功能依賴**。合每個來源前需先取得最新整合 HEAD 並重跑相關測試。若沒有源分支修正，保持原有 49 檔不變，只完成 QA 紀錄。

Phase 3（runtime／資源驗證）：
- 保留 src/game/render/es2/production-world.ts 的 WORLD_ART 49 URL，保留既有 biome scene 額外圖檔；
- 保留 src/game/render/es2/production-factions.ts 的即時 enemy body/telegraph、alpha/source rect、鏡向、cache/visibility 行為；
- 檢查四 boss 3 phase 繪製、四 biome ground/decor，並確認 17 UI icon 全部用在實際場景而不只是圖鑑；
- 若 QA 有真正需要替換的圖集幀大小／source rect，先 RED 測試，再同步更新圖集 manifest、Canvas 消費者與測試。不得更動權威 hitbox、boss 招式、傷害、AI 或碰撞；
- 檢查 src/assets/es2/production/world-art-candidates.test.ts 的現有狀態斷言：此測試目前寫死「尚待審核」，一旦某類經授權正式變更為 approved，應修成**逐檔證據驅動**的狀態驗證（並仍強制 hash/尺寸/bytes 等），不能用 accept-any-status／skip／fake evidence 讓它變綠；
- 保留 src/assets/es2/production/heroes/production-art.test.ts 的最終 blocking acceptance gate，不得屏蔽或改為無條件 pass。若仍有英雄或世界美術未經 QA，真實回報 CI blocked。

Phase 4（真實畫面 QA）：
- 實際 Chrome / Playwright 跑手機直向 320×640、375×812、390×844，短橫向 640×320、812×375，平板 768×1024、1024×768，桌面 1280×720、1920×1080；
- 敵人 10 種真正出現在戰鬥畫面並可見 body／telegraph；魔王四位的 3 個真實階段；4 場景無地板縫、裝飾裁切正確；17 圖示全數對應可見消費場景；
- 不得用 gallery、mock、合成圖、source-only screenshot 作為 runtime 證據；提供 commit、viewport、branch、截圖／MP4、測試命令輸出；
- 用獨立 reviewer 檢視品質／相同素材重繪、對比、動畫連續、最高實際 1×顯示解析度與來源原生 3×細節，修復任何真正失敗。

Phase 5（最終驗收）：執行
~~~bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
~~~
核對同一個整合 HEAD 的 GitHub Actions。只有四組 49 項和另一對話交付的 3 項英雄**全部正式完成 QA**，且測試與真實畫面均達標，才可把對應 manifest 改成 approved；若仍有 pending，回報 blocked。維持 no PR / no force-push / no main / no deploy / no develop merge。

## 必要交付

1. 4 個來源分工的通過／不通過列表與來源 commit、QA 證據；對已通過的 49 項沒有多餘重產。
2. 最終整合 SHA 與變更清單（如非必要，不變動現有 WebP）。
3. assets→typed WORLD_ART→actual game consumer→截圖／影片→CI 的 traceability。
4. 待審核與失敗原因逐項清楚列出；對英雄的外部依賴保持獨立，不污染已核准世界素材。
## 所有工作一律遵守的規則

1. 先閱讀 CLAUDE.md、.claude/rules/character-art-3x.md、.claude/rules/realtime-performance.md、.claude/rules/ui-responsive-layout.md；使用 Superpowers（debugging、TDD、review）與 Ponytail（消除多餘複雜度）工作流程。
2. **先清點 Git 現有 WebP**，讀原始來源及 manifest。已存在且通過技術／實機視覺檢查者維持原檔與 SHA，不重新生成、不轉碼、不另建重複檔案。
3. 每項依序記錄：來源、真實原始細節解析度（不可只看 @3x 檔名）、實際 Canvas/UI 最高顯示尺寸、尺寸／透明／hash／bytes、來源裁切範圍／frame 幀數、實際遊戲使用處、比對截圖、是否通過人工視覺審核。
4. 發現確切不合格才修復；**先新增失敗測試並觀察 RED，再最小必要修復、GREEN、REFACTOR、code review、回歸測試**。需要重繪時先將真正原生 3×素材存入其最終 repo 路徑，再改代碼引用；不可僅放聊天附件或放大既有低解析素材宣稱原生三倍。
5. 不要修 engine、遊戲平衡、hitbox、獎勵、英雄、main/develop；不開 PR、不 force push、不部署、不放寬測試。多 agent 執行時只操作自己 owned 路徑，需共享 consumer 或驗收檔的變更交整合者處理。
6. 任一素材若未經實際逐格／實際遊戲畫面審核，保留 needs-human-approval 與 visual-review-required，並在報告記錄原因。**任何自動化測試通過都不能自動核准美術**。
7. 每一類最後需執行 pnpm test、pnpm typecheck、pnpm build、pnpm check-release（允許忠實回報其他類別的既有人工審核紅燈），輸出 committed SHA、真正修改的檔案、失敗及解決證據與真實截圖／必要 MP4。

