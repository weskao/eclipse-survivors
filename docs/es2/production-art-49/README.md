# ES2 49 項既有美術：檢查、分工與整合

**Repository:** https://github.com/weskao/eclipse-survivors  
**Target:** feature/es2-release-readiness-integration  
**Audit baseline:** c08e6a5268095e071e0ed15aafde99b2379b85c5

## 先看結論

**49/49 項現有 WebP 已存在；不要無故重新生成。** Enemy 20、Boss 4、Biome 8、UI 17；所有檔案在此基準分支已由 manifest 紀錄 SHA-256，且有現有 WORLD_ART 資源引用。它們的 technical integrity 與 human visual approval 是兩件事：目前四個類別均為 visual-review-required，不能直接把 status 改成 approved。

## 完整可執行 Prompts

- [00-inventory.md](00-inventory.md)：49 項現有素材逐檔清單、使用處、目前缺口。
- [01-enemies-20.md](01-enemies-20.md)：10 敵人 + 10 攻擊預警；平行工作 A。
- [02-bosses-4.md](02-bosses-4.md)：4 boss × 3 phase；平行工作 B。
- [03-biomes-8.md](03-biomes-8.md)：4 場景地板／裝飾；平行工作 C。
- [04-ui-17.md](04-ui-17.md)：寶箱、稀有度、HUD、成就；平行工作 D。
- [05-integration.md](05-integration.md)：單線整合、code consumer、CI 與真正 1×畫面驗收。

## 依賴圖

~~~text
當前整合分支／既有資產清點（49/49）
      ├─ A 敵人 + 預警 QA（20） ────┐
      ├─ B 魔王三階段 QA（4） ──────┤
      ├─ C 場景地板 + 裝飾 QA（8） ─┤──> 單線整合／真實畫面審查 ──┐
      └─ D UI 圖示 QA（17） ────────┘                             │
                                                                    ├──> 最終全綠 CI／正式核准
另一個對話：英雄 3 項 QA（獨立，不可碰觸）───────────────────────┘
~~~

四類可平行 QA，合回目標分支時需逐一以最新 HEAD 驗證，不用同時寫 shared 文件。不動 develop/main；不開 PR、不 force-push、不部署。若現有素材合格，只保存審核證據並重用，不需要重複產圖。沒有人工視覺核准，不得冒充全綠 CI。
