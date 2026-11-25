# ES2 Boss 動畫參考素材包（QA_PENDING）

此包包含本輪生成的 7 張原始 PNG，未放大、未去背、未轉檔。涵蓋 Abyss Monarch、Frost Sovereign、Infernal Titan、Eclipse Seraph 的待機、移動、攻擊、收招、受傷、變身、死亡動作概念。

**不是正式可用動畫圖集。** PNG 中的標籤、格數及解析度文字是生成圖的一部分，不是實測規格。實際整張圖只有 1536×1024 或 1983×793，單格遠小於正式第三形態的最低 949px 原生來源需求。背景未達乾淨透明要求，格線/文字及角色一致性需要重製。Frost Sovereign 的角色外觀有明顯偏離既有美術，不可直接套用。

## 專案內位置與命名

僅供人工審閱，存放於本目錄（`src/assets/es2/production/bosses/candidates/motion/reference-review/`），不覆蓋正式 WebP，也不接入 runtime loader（`production-world.ts` 只 glob `motion/*-attack-source-reference.webp`，不含本子目錄）。

檔名僅加上 `-QA-PENDING` 後綴（使 `scripts/check-release.mjs` 的 `-QA-PENDING` 檢查涵蓋）；位元組與 SHA-256 與原始檔相同，`manifest.json` 的 `path` 已更新為新檔名。這些 PNG 為不可變的生成來源證據，因此依 CLAUDE.md 的來源/出處例外保留 PNG，未轉 WebP（轉檔會使 SHA-256 失效）。

待真正原生單格、透明邊距、連續動作、角色一致性與人工 QA 通過後，再依專案規則轉 WebP、建立 atlas manifest、TDD 與 runtime 接線。

基準 HEAD: `4fc463b0a6981a0371518ec393f1dd91be2e7b65`。未執行遊戲測試。`manifest.json` 為實際檔案尺寸、alpha 統計及 SHA-256。
