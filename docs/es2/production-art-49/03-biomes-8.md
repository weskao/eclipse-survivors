# ES2 既有美術驗收與最小必要修復：4 種場景地板與裝飾（8 項）

> **可直接執行的 Agent Prompt｜繁體中文**  
> GitHub: https://github.com/weskao/eclipse-survivors  
> 程式整合目標：feature/es2-release-readiness-integration  
> 基準快照：c08e6a5268095e071e0ed15aafde99b2379b85c5（執行時須重新取得最新 HEAD）  
> 目前已有 49/49 項 WebP，請優先重用，禁止無故重製。  
> 英雄 3 項與英雄所有動畫交由其他對話負責，本工作不得修改。

## 任務與分支

- 原始庫：https://github.com/weskao/eclipse-survivors
- 建議獨立工作分支（平行代理才建立）：feature/es2-art-qa-biomes
- 工作完成後合回：feature/es2-release-readiness-integration（**不可**直接合 develop/main）
- Owned：src/assets/es2/production/biomes/**
- 僅供追蹤的既有 consumer（不得在分工分支擅自修改）：src/game/render/es2/production-world.ts、src/game/content/biomes/index.ts
- 既有測試／契約：src/game/render/es2/production-world.test.ts、src/assets/es2/production/world-art-candidates.test.ts
- 參考來源：assets/images/imgs1.png、assets/images/imgs9.png（地板含現有程序化修邊成果）

## 現有素材清單（全部已入庫；以 manifest 與 HEAD 重新確認）

| ID | Repo WebP 檔名 | 總像素 | 格數 | Alpha | 上限 bytes | 目前狀態 |
|---|---|---|---:|---|---:|---|
| blood-moon-cathedral:ground | blood-moon-cathedral-ground@3x.webp | 768×768 | 1 | 不透明 | 1100000 | needs-human-approval |
| blood-moon-cathedral:decor | blood-moon-cathedral-decor@3x.webp | 384×96 | 4 | 透明 | 180000 | needs-human-approval |
| cursed-forest:ground | cursed-forest-ground@3x.webp | 768×768 | 1 | 不透明 | 1100000 | needs-human-approval |
| cursed-forest:decor | cursed-forest-decor@3x.webp | 384×96 | 4 | 透明 | 180000 | needs-human-approval |
| abyssal-necropolis:ground | abyssal-necropolis-ground@3x.webp | 768×768 | 1 | 不透明 | 1100000 | needs-human-approval |
| abyssal-necropolis:decor | abyssal-necropolis-decor@3x.webp | 384×96 | 4 | 透明 | 180000 | needs-human-approval |
| celestial-rift:ground | celestial-rift-ground@3x.webp | 768×768 | 1 | 不透明 | 1100000 | needs-human-approval |
| celestial-rift:decor | celestial-rift-decor@3x.webp | 384×96 | 4 | 透明 | 180000 | needs-human-approval |

## 類別特有的視覺／Runtime 驗收

每種地板 768×768 不透明且必須在四周無明顯接縫（以真正遊戲 Canvas tile repeat 與不同縮放量測）；每種裝飾為 384×96／4 格透明圖集，檢查逐格裁切、透明邊界與場景接地。不改既有碰撞／路障／環境傷害。地板若以約 384px 顯示則 768px 僅 2×，必須以實際最高顯示尺寸與來源細節核對 3×，禁止僅重新取樣湊尺寸。

## 執行步驟

A. 在目前工作分支核對上列每個 WebP 的存在、hash、像素、alpha 與所屬使用位置；比對原始 contact sheet，建立逐素材的 reviewed／needs-fix／blocked 清單與可重現證據。
B. 對實際不合格的檔案才寫 RED 測試（包含 source rect、連續影格、方向／位移、邊界溢出、真正 3×來源細節、手機 1×觀感）；能原檔保留就不改動。
C. 只修復已證實的問題：必要時以官方既有來源重繪或調整精靈格，**先提交資產再整合 consumer**。不要憑插值升級 @3x，也不要改動未屬於自己 owned 的 shared 文件。
D. 以實際 Vue/Canvas 遊戲執行檢查手機直向／橫向、桌面、縮放、危險警示與相鄰素材層級。做獨立 code review；反覆修復至已負責範圍的測試通過。
E. 輸出：逐素材驗收證據、保留／修正清單、實際遊戲截圖或影片、commit SHA、整合提示。未通過者保留 pending，不能因為 CI 紅燈就亂改 status。

## 允收標準

- 本類現有 8 項映射仍正確，沒有新缺檔、重複 asset ID 或碰觸其他類別。
- 達到真正的幀尺寸與裁切安全；原生 3×若證據不足就報告缺口，**不虛報通過**。
- 真實遊戲看得清楚、不遮擋關鍵 HUD 或戰鬥；沒有變更原有 gameplay。
- 逐項的 QA 證據符合 approved 才能由獲授權的審核流程變更狀態；不能只因程式測試通過即通過。
## 所有工作一律遵守的規則

1. 先閱讀 CLAUDE.md、.claude/rules/character-art-3x.md、.claude/rules/realtime-performance.md、.claude/rules/ui-responsive-layout.md；使用 Superpowers（debugging、TDD、review）與 Ponytail（消除多餘複雜度）工作流程。
2. **先清點 Git 現有 WebP**，讀原始來源及 manifest。已存在且通過技術／實機視覺檢查者維持原檔與 SHA，不重新生成、不轉碼、不另建重複檔案。
3. 每項依序記錄：來源、真實原始細節解析度（不可只看 @3x 檔名）、實際 Canvas/UI 最高顯示尺寸、尺寸／透明／hash／bytes、來源裁切範圍／frame 幀數、實際遊戲使用處、比對截圖、是否通過人工視覺審核。
4. 發現確切不合格才修復；**先新增失敗測試並觀察 RED，再最小必要修復、GREEN、REFACTOR、code review、回歸測試**。需要重繪時先將真正原生 3×素材存入其最終 repo 路徑，再改代碼引用；不可僅放聊天附件或放大既有低解析素材宣稱原生三倍。
5. 不要修 engine、遊戲平衡、hitbox、獎勵、英雄、main/develop；不開 PR、不 force push、不部署、不放寬測試。多 agent 執行時只操作自己 owned 路徑，需共享 consumer 或驗收檔的變更交整合者處理。
6. 任一素材若未經實際逐格／實際遊戲畫面審核，保留 needs-human-approval 與 visual-review-required，並在報告記錄原因。**任何自動化測試通過都不能自動核准美術**。
7. 每一類最後需執行 pnpm test、pnpm typecheck、pnpm build、pnpm check-release（允許忠實回報其他類別的既有人工審核紅燈），輸出 committed SHA、真正修改的檔案、失敗及解決證據與真實截圖／必要 MP4。

