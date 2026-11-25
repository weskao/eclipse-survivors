# ES2 Biomes 8 原生 3×：正式整合與專案擁有者人工美術核准

**Scope：** 4 種場景 × 地板／裝飾各一，共 8 個正式 WebP。  
**Target branch：** `feature/es2-release-readiness-integration`  
**來源：** [feature/es2-art-qa-biomes](https://github.com/weskao/eclipse-survivors/tree/0aef5017e8299376eeb4ce9bed86eeba91903144)，source HEAD `0aef5017e8299376eeb4ce9bed86eeba91903144`  
**人工視覺批准：** 專案擁有者 2026-11-24 明確授權：『Biomes 地板與裝飾，請標記為人工驗收通過』。  
**範圍排除：** 英雄、敵人／預警、魔王、人工作品驗收以外的效能或遊戲平衡，不被此項批准包含。

## 8 張正式 WebP（來源 Git blob 原樣套用）

| ID | 尺寸 | 來源 blob SHA | 來源 byte 上限 | 狀態 |
|---|---|---|---|---|
| `blood-moon-cathedral:ground` | 1152×1152 | `3184bab63e12cfa9a26b2a2b3103ca4ed3d3e2dd` | 1,100,000 | approved |
| `blood-moon-cathedral:decor` | 1320×330 | `f3f1eadbc541bca904f98d87f2b7dec34ca54799` | 180,000 | approved |
| `cursed-forest:ground` | 1152×1152 | `52b03e316cdfb56769d3b50ae5d31b0e04f76e75` | 1,100,000 | approved |
| `cursed-forest:decor` | 1320×330 | `dbef04f2d3fa126817e3032392a8132f3f71db36` | 180,000 | approved |
| `abyssal-necropolis:ground` | 1152×1152 | `2f18664f034e98b7e69b4467bed3429d89da3710` | 1,100,000 | approved |
| `abyssal-necropolis:decor` | 1320×330 | `7e91dab133c72f88fb71f9d1eb44345953d8338d` | 180,000 | approved |
| `celestial-rift:ground` | 1152×1152 | `a7394255a960ecf36ed4395a0fe902561748ab28` | 1,100,000 | approved |
| `celestial-rift:decor` | 1320×330 | `c176f5b3e1bbd7b28529aa430e27eedf7b678449` | 180,000 | approved |

## 原生來源與 Runtime

- Ground：實際新製作 1254px 母圖，源裁切／調整為 1152×1152，正式繪製為 384×384；名義來源 3.00×。
- Decor：每圖四格 330×330，總長 1320×330，正式 Canvas 繪製 110×110；名義來源 3.00×，每格透明安全邊界已於源工作流技術檢測。
- 保留原有 WORLD_ART 資源 ID、相對路徑、模組、碰撞與渲染 API；Vite 會自動採用八張新檔，`paintEnvironment()` 與 `loadWorldRuntimeImages()` 使用既有解碼快取。
- 四類美術總數仍為 49；其中 UI17＋Biomes8 已有 owner visual approval，Enem​ies20＋Bosses4 尚待審核（另有英雄3不在本工作範圍）。
- GitHub CI 的本地 SHA/Byte 驗證依 `src/assets/es2/production/biomes/manifest.json`，`src/assets/es2/production/biomes/native-3x-candidates.test.ts` 與 `human-approval.test.ts`；`world-art-candidates.test.ts` 僅對 **UI 與 Biomes** 接受嚴格 `project-owner` 批准紀錄，其他類仍不得假核准。

## 來源測試與整合驗證

- [來源 Chromium 實際四場景驗收 45247582857](https://github.com/weskao/eclipse-survivors/actions/runs/45247582857)：可追溯的桌面、手機直向與橫向原生場景 Canvas 截圖／影片。
- [來源 native 3× 驗證 45247582566](https://github.com/weskao/eclipse-survivors/actions/runs/45247582566)：各來源尺寸、SHA 及來源 QA 合約。
- 整合分支附帶獨立 `es2-biome-real-browser-qa.yml`，改為在**本分支**執行；必須再次依新的 HEAD 驗證成功，不能把來源分支成功當作目前 HEAD 驗收完成。
- Release-wide `production-art.test.ts` 的其餘未核准項目繼續阻擋全綠；不跳過、不更改英雄或 BOSS/敵人 status。
