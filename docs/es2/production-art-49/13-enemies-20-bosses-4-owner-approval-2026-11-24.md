# ES2 敵人 20 項／Boss 4 項：專案擁有者人工美術驗收紀錄（2026-11-24）

**結果：正式遊戲 canonical 敵人與 Boss 合計 24/24 項人工美術驗收完成。**

- 專案：[`weskao/eclipse-survivors`](https://github.com/weskao/eclipse-survivors)
- 目標分支：`feature/es2-release-readiness-integration`
- 確認日期：2026-11-24（Asia/Taipei）
- 核准者：專案擁有者；明確聲明「敵人及魔王 我已經人工驗收通過測試 請進行相關檔案標記為完成」。
- 範圍：`enemies/manifest.json` 的 10 種敵人 body + 10 種 attack telegraph，以及 `bosses/manifest.json` 的 4 個正式三階段 atlas。
- 變更：類別及逐項 `status: approved`，逐項 `humanApproval`，保留既有正式圖片路徑與原始 SHA-256。

## 敵人與攻擊預警（20/20）

| ID | 正式圖片 | 尺寸 | SHA-256 前綴 | 人工視覺 |
|---|---|---:|---|---|
| `shadow-assassin` | `shadow-assassin-body@3x.webp` | 1296×216 | `dda7977af81276b5…` | approved |
| `shadow-assassin:telegraph` | `shadow-assassin-telegraph@3x.webp` | 150×150 | `178db65bf5ff8ab7…` | approved |
| `necromancer` | `necromancer-body@3x.webp` | 1656×276 | `e99625ccb1272ca8…` | approved |
| `necromancer:telegraph` | `necromancer-telegraph@3x.webp` | 150×150 | `bc2e48341114d254…` | approved |
| `dark-archer` | `dark-archer-body@3x.webp` | 1368×228 | `3e17fad169f32ef7…` | approved |
| `dark-archer:telegraph` | `dark-archer-telegraph@3x.webp` | 150×150 | `474e8adab28280e8…` | approved |
| `plague-carrier` | `plague-carrier-body@3x.webp` | 1728×288 | `fc43843a35375b58…` | approved |
| `plague-carrier:telegraph` | `plague-carrier-telegraph@3x.webp` | 150×150 | `fef8d3ec7cc4eb83…` | approved |
| `shield-guardian` | `shield-guardian-body@3x.webp` | 2016×336 | `280962d0a50d5e5e…` | approved |
| `shield-guardian:telegraph` | `shield-guardian-telegraph@3x.webp` | 150×150 | `5e9d397a0d491e0c…` | approved |
| `phantom` | `phantom-body@3x.webp` | 1260×210 | `e2c8a22041edd7ed…` | approved |
| `phantom:telegraph` | `phantom-telegraph@3x.webp` | 150×150 | `0c5f9135ee4b9c2e…` | approved |
| `fire-imp` | `fire-imp-body@3x.webp` | 1260×210 | `51c566c3709fc331…` | approved |
| `fire-imp:telegraph` | `fire-imp-telegraph@3x.webp` | 150×150 | `b1482f43f5736afd…` | approved |
| `frost-wraith` | `frost-wraith-body@3x.webp` | 1368×228 | `d7043cca5de7e967…` | approved |
| `frost-wraith:telegraph` | `frost-wraith-telegraph@3x.webp` | 150×150 | `8b5dc72243911e91…` | approved |
| `berserker` | `berserker-body@3x.webp` | 1584×264 | `06962c0607e56852…` | approved |
| `berserker:telegraph` | `berserker-telegraph@3x.webp` | 150×150 | `e0050d1bbcd1fa44…` | approved |
| `crystal-sentinel` | `crystal-sentinel-body@3x.webp` | 1944×324 | `209753a63bc993ed…` | approved |
| `crystal-sentinel:telegraph` | `crystal-sentinel-telegraph@3x.webp` | 150×150 | `c000b6bc2df57255…` | approved |

## Boss 三階段圖集（4/4）

| ID | 正式圖片 | 尺寸 | SHA-256 前綴 | 人工視覺 |
|---|---|---:|---|---|
| `abyss-monarch` | `abyss-monarch-phases@3x.webp` | 576×192 | `546c059559e95155…` | approved |
| `frost-sovereign` | `frost-sovereign-phases@3x.webp` | 576×192 | `aded9d53c76c5484…` | approved |
| `infernal-titan` | `infernal-titan-phases@3x.webp` | 576×192 | `59db59f3f2ed0e00…` | approved |
| `eclipse-seraph` | `eclipse-seraph-phases@3x.webp` | 576×192 | `d399d64a21969d75…` | approved |

## 不因人工簽核自動通過的項目

- **原生解析度：** `native3x`、實際圖集像素、source provenance 保持原值。Boss 現有正式 192px 素材即使 visually approved，仍不能被描述成具備 708px 的原生細節；其他技術缺口仍獨立追蹤。
- **執行證據：** Boss `qa.realGameplayReview`、跨裝置截圖、六格動畫連續性、性能測試和 CI 狀態維持各自原本的技術紀錄；這次不虛稱全面 PASS。
- **隔離候選：** `bosses/candidates/*-QA-PENDING.webp`、`enemies/candidates/*` 是獨立開發候選，不在本次正式 WebP 的 visual approval 範圍，仍維持原本待審狀態。
- **其他資產：** UI 17 和 Biomes 8 先前已批准；英雄 3 項並未包含在本次授權，相關美術與 release gate 不可繞過。
- **完整性：** 本次未覆寫或重新產生 WebP、未改動玩法／攻擊／hitbox、未更新 main/develop、未合併或部署。

本紀錄是最新版正式美術「人工視覺核准」的權威狀態；2026-11-23 QA_REVIEW 關於缺乏人工批准的字句屬**歷史記錄**，但其 technical findings 仍有效。
