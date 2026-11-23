# 49 項既有 Production Art 清點（無須整批重新產生）

> **2026-11-24 更新：UI 17/17 正式素材已由專案擁有者確認通過人工美術驗收，Manifest 已逐項改為 `approved`。** 簽核紀錄：[10-ui-17-owner-approval-2026-11-24.md](10-ui-17-owner-approval-2026-11-24.md)。下方 2026-11-23 以前的 `needs-human-approval`／`visual-review-required` 描述只代表歷史快照，**不能再用來表示目前 17 項 UI 的人工美術狀態**。此批准不等於其他 32 項素材、英雄、原生 3×來源或最新 HEAD 全專案 CI 已全部通過。


> **可直接執行的 Agent Prompt｜繁體中文**  
> GitHub: https://github.com/weskao/eclipse-survivors  
> 程式整合目標：feature/es2-release-readiness-integration  
> 基準快照：c08e6a5268095e071e0ed15aafde99b2379b85c5（執行時須重新取得最新 HEAD）  
> 目前已有 49/49 項 WebP，請優先重用，禁止無故重製。  
> 英雄 3 項與英雄所有動畫交由其他對話負責，本工作不得修改。

## 實際核對方法與範圍

在 c08e6a5268095e071e0ed15aafde99b2379b85c5 的 Git tree，enemies 20/20、bosses 4/4、biomes 8/8、ui 17/17；四類合計 **49/49 WebP 存在，0 項缺檔**。四份 manifest 都紀錄 SHA-256；既有 src/assets/es2/production/world-art-candidates.test.ts 比對 bytes、RIFF、尺寸、格數及 SHA，production-world.test.ts 檢查全部 49 個 URL 映射。這代表**檔案完整性已可追溯**，並不代表 49 項美術已人工核准或均具真正原生三倍細節。

已抽看實際 WebP：shadow-assassin-body、shadow-assassin-telegraph、abyss-monarch-phases、blood-moon-cathedral-ground／decor、treasure-legendary、hud-health；實際影格清晰度、身分一致性、動畫連續性與 1×效果尚需逐項審核。例：shadow-assassin 的 6 格出現相似／重複姿勢；enemy 每格目前 96×96，boss 每格 192×192，均不可單憑 @3x 檔名認定符合所有 runtime 1×尺寸的真正三倍來源。場景 ground 768×768 亦應以實際 tile 繪製尺寸判定倍率。

已知程式接線：
- src/game/render/es2/production-world.ts 統一 Vite 本機網址 WORLD_ART；4 boss、10 enemies×2、4 biomes×ground+decor、17 UI；既有場景 scene 屬額外檔案，不計入本次 49 項。
- src/game/render/es2/production-factions.ts 將敵人 Body/Telegraph 實際載入 Canvas，並以明確 6 格 source rect 繪製。原有效果／碰撞另由 authoritative runtime 處理。
- src/components/es2/menu/Es2Archive.vue、Es2ChoiceCards.vue、CombatHud.vue 已有 UI 本機美術使用處。
- 最終產物不可只在 gallery 可見；需確認正式遊戲對應狀態確實顯示並核對畫面。

## 數量與狀態

| 類別 | 已有 / 需求 | 目前 category status | 稽核結果 |
|---|---|---|---|
| enemies | 20/20 | visual-review-required | 已存在／待視覺 QA |
| bosses | 4/4 | visual-review-required | 已存在／待視覺 QA |
| biomes | 8/8 | visual-review-required | 已存在／待視覺 QA |
| ui | 17/17 | approved（2026-11-24 人工美術） | 17/17 專案擁有者核准；其他技術項目另驗 |

## 各項現有 ID 與檔名

### enemies

| ID | 檔案 | 尺寸 | frames | SHA-256（既有 manifest） |
|---|---|---|---:|---|
| shadow-assassin | shadow-assassin-body@3x.webp | 576×96 | 6 | 9e28e4801e8bc4df9c744a7ce30d6de9f1cd721ce7205f5f8f7bdf542b43af29 |
| shadow-assassin:telegraph | shadow-assassin-telegraph@3x.webp | 96×96 | 1 | bb1dddb40b86eaf47aa36a24a69389c7c7ff2b01f332c612344ebef5d058509e |
| necromancer | necromancer-body@3x.webp | 576×96 | 6 | 56fc06dc490b7f51c71f994aa3b72464111bcfe9a9dbb37714aa5bef3682918e |
| necromancer:telegraph | necromancer-telegraph@3x.webp | 96×96 | 1 | d0a8c75ec72ef9668f98dae541be58f4bc9db54b312f5d09b8380784d9a4a063 |
| dark-archer | dark-archer-body@3x.webp | 576×96 | 6 | 3beb62ea74b6f619f3fa632f454de9fd6969a4ffb8071b6484bd5cb71e703f65 |
| dark-archer:telegraph | dark-archer-telegraph@3x.webp | 96×96 | 1 | d41d7b6ff01ee13e06d54c8098d3939243abe6d92c32ee034e032bc4f17098a5 |
| plague-carrier | plague-carrier-body@3x.webp | 576×96 | 6 | 8de0311486c093deef00d22ff3fd8ceca353e548c7c97ac8691272ca45f7692e |
| plague-carrier:telegraph | plague-carrier-telegraph@3x.webp | 96×96 | 1 | 89f1a97d59674ee89b57117c302138d1b0ba377c9bdc7609f0155263159c43c6 |
| shield-guardian | shield-guardian-body@3x.webp | 576×96 | 6 | bc84ebd2a669e315cc36306a32b24c4308a0a3b02c0077944a6e540d65d40f11 |
| shield-guardian:telegraph | shield-guardian-telegraph@3x.webp | 96×96 | 1 | 28ab6f430aef6ff27a2c7cc6e08d30f77d88a69f204bd1db3816d0242bb48ee6 |
| phantom | phantom-body@3x.webp | 576×96 | 6 | 12b2477da7dc74b33e353c2c6a450c34baf86a210a83867d3c83625a426bd854 |
| phantom:telegraph | phantom-telegraph@3x.webp | 96×96 | 1 | 105e1b8a00f5eeb5db03452204dc94ce1962b87dab12b40f19d78ec2f958544c |
| fire-imp | fire-imp-body@3x.webp | 576×96 | 6 | f8199e36e2b3098862b8bdffb3814c024a1a35e292854a20b9dd405ed5edbce2 |
| fire-imp:telegraph | fire-imp-telegraph@3x.webp | 96×96 | 1 | 7e6b3c36007afe952a5b8f5deffdecf1740d39ee001408b262b789d913c5e64b |
| frost-wraith | frost-wraith-body@3x.webp | 576×96 | 6 | ee347e3bd72a2dc86bffe3fb3b7d638465978ff91f53c558151247b52fa0f6d1 |
| frost-wraith:telegraph | frost-wraith-telegraph@3x.webp | 96×96 | 1 | 3b73712ecbb906607b9374e98298734ee95e0d9d5d0afba20831f4010806cc29 |
| berserker | berserker-body@3x.webp | 576×96 | 6 | 5c2f4a803d520f9cb46c82b21552cb99504bba37ce5081abd2de8e68a1365e8c |
| berserker:telegraph | berserker-telegraph@3x.webp | 96×96 | 1 | a04468f75374b65971096ba418b3dda3be6d77e1856e2b270670ae2feb85c685 |
| crystal-sentinel | crystal-sentinel-body@3x.webp | 576×96 | 6 | f0212487c17b3b6a7405878dbd7854497533eea2b2d1fb85472612712e1d8278 |
| crystal-sentinel:telegraph | crystal-sentinel-telegraph@3x.webp | 96×96 | 1 | a3a1cb35f929c27d24dc840b48b33ed1314b70ceb63dd5ced2860c2d9f70f570 |

### bosses

| ID | 檔案 | 尺寸 | frames | SHA-256（既有 manifest） |
|---|---|---|---:|---|
| abyss-monarch | abyss-monarch-phases@3x.webp | 576×192 | 3 | 546c059559e95155f9aac0b4fc2561953fb83bd556d227e0664c7f5b77216023 |
| frost-sovereign | frost-sovereign-phases@3x.webp | 576×192 | 3 | aded9d53c76c5484946051290e37965c6759a43cef3e1468608c26ed99236281 |
| infernal-titan | infernal-titan-phases@3x.webp | 576×192 | 3 | 59db59f3f2ed0e0053b543172d33e05c98058846b8c23c6499f0ccd7932e7235 |
| eclipse-seraph | eclipse-seraph-phases@3x.webp | 576×192 | 3 | d399d64a21969d75827f528882c0e99b55a651ff3843ca2e69ada63ce5296148 |

### biomes

| ID | 檔案 | 尺寸 | frames | SHA-256（既有 manifest） |
|---|---|---|---:|---|
| blood-moon-cathedral:ground | blood-moon-cathedral-ground@3x.webp | 768×768 | 1 | 59c995409daa2ef6abde00d260ace6ee5d6e333f0cc47ada470dbe04192d8e67 |
| blood-moon-cathedral:decor | blood-moon-cathedral-decor@3x.webp | 384×96 | 4 | 02dcd88838c02fb7a4d430be4b88820f6d96cc5e1d7967515ef247fe6c865004 |
| cursed-forest:ground | cursed-forest-ground@3x.webp | 768×768 | 1 | 2d9d5d31e09466abc5b5e30794691059d93482dc7c830c21320c09033a859df2 |
| cursed-forest:decor | cursed-forest-decor@3x.webp | 384×96 | 4 | b59308fe657ceb5ba7fa6b9ec3b343cbc28528ebfd80f2e3787160c610153df1 |
| abyssal-necropolis:ground | abyssal-necropolis-ground@3x.webp | 768×768 | 1 | 6a749d94b1f4f39f571cff3b2d210ece345239e570a9990c68d3704e627fa981 |
| abyssal-necropolis:decor | abyssal-necropolis-decor@3x.webp | 384×96 | 4 | 9de12d25e3cf61b388b33e16126847d850a022a64abc8399141e4ec79c04860b |
| celestial-rift:ground | celestial-rift-ground@3x.webp | 768×768 | 1 | 8c9f673a02d75e35c10b3f98ef0f5f35e22e1329f9b8338b349feaa71cdfcb92 |
| celestial-rift:decor | celestial-rift-decor@3x.webp | 384×96 | 4 | 79bed9709eff585ca4070a46720de67407a1145527f63f9c247cd48cec7967e2 |

### ui

| ID | 檔案 | 尺寸 | frames | SHA-256（既有 manifest） |
|---|---|---|---:|---|
| treasure-common | treasure-common@3x.webp | 192×192 | 1 | 1616cb472bb36a82e05956de0e637169ea92cfcbbdd0f963c9b4b809c60c9759 |
| treasure-rare | treasure-rare@3x.webp | 192×192 | 1 | dec80e8459e594f578e5fc4d25a438b93d9df169eb357ad13d9fb66d91c4d61f |
| treasure-legendary | treasure-legendary@3x.webp | 192×192 | 1 | 8e03144be06b23aa7e6b46aa333d84b5e8986b4f0e9d633bb09cda85d071a050 |
| treasure-cursed | treasure-cursed@3x.webp | 192×192 | 1 | 10d724a7fa6d6ddc33cd58aed84ca77c4a75371befa3ab241ae9e94cd415b0a3 |
| rarity-common | rarity-common@3x.webp | 192×192 | 1 | 8e616f8d705b465324b27da89bfd376ad776954c289d771244f17a1c3b6c62bc |
| rarity-rare | rarity-rare@3x.webp | 192×192 | 1 | 3c07ca5eeb2025daccf1becf2102b15a1308e3e8fea363ad42837ea289734695 |
| rarity-legendary | rarity-legendary@3x.webp | 192×192 | 1 | 5ef5630631c525c3970f017acc0c421f5cb30bd18400719fc5c70f525973e05c |
| hud-health | hud-health@3x.webp | 192×192 | 1 | 59a58f1f4018c6606baf04a4a808c051c792d3ab9990ef9ab3dec16b8cf550be |
| hud-xp | hud-xp@3x.webp | 192×192 | 1 | b8c396c67d8da45cde11603a771e2c2f49cde578e30faef996221292505a47c6 |
| hud-cooldown | hud-cooldown@3x.webp | 192×192 | 1 | d6278ecd2ffd71a1731ec06e299d987de62b4748ae6f6d20f7422506db5f53f8 |
| hud-quest | hud-quest@3x.webp | 192×192 | 1 | 2d5c6374b85dc9a38dcd4780c76533ae2522ab0af1123e20a3e7ecb598edde1b |
| achievement-boss | achievement-boss@3x.webp | 192×192 | 1 | 4ce725a455b99e471447032528abd55b9df308b83ef5c7b9f8c072b39a6a8e99 |
| achievement-survivor | achievement-survivor@3x.webp | 192×192 | 1 | 7ff4cbbd66d4915103c7b66533d2cfe47eb0ce676fd3b3632674cc935ae68e12 |
| achievement-evolution | achievement-evolution@3x.webp | 192×192 | 1 | fe6c8a323a4dabbafde1bcd1101345eec0bdcd10de19917f05c864b159fb5231 |
| achievement-explorer | achievement-explorer@3x.webp | 192×192 | 1 | bc3da4afb758ba50ea463a70ddba095d20aa8bdd9b626728a30acdac340a2469 |
| achievement-collector | achievement-collector@3x.webp | 192×192 | 1 | 7a56f968ff6ca4299b74808487a41cd473833781772e19a7e456aacb15f3d5e8 |
| achievement-flawless | achievement-flawless@3x.webp | 192×192 | 1 | 0046b453fe538510d39db81d7b010b4dd1463fb8066de047db960981919f8e30 |

## 特別注意既有品質門檻

- src/assets/es2/production/heroes/production-art.test.ts 的 blocking gate 同時檢查 heroes + 上述四類。英雄由獨立工作負責；不可為了讓 CI 變綠而略過英雄。
- src/assets/es2/production/world-art-candidates.test.ts 目前明確要求候選狀態 visual-review-required／needs-human-approval；**將來正式視覺審核完成時，整合者必須同步修改這個技術性舊狀態斷言**，讓它根據實際審核紀錄檢查狀態，不得把 blocking gate 移除。
- 四類 49 項先 review，不符合要求才 conditional redraw。單純在 manifest 改成 approved 不算完成。

## 執行順序

1. 讀本文件與各 Prompt，確認最新 HEAD、現有素材及程式映射。
2. 01／02／03／04 四個可平行執行，各有 own paths；英雄工作完全獨立。
3. 每個 source 工作的驗收證據與修復提交確認後，05 Integration 按最新 HEAD 依序匯入，不改已經通過 QA 的相同 WebP。
4. 最終人工視覺審核、所有 consumer 真實畫面與驗收證據完成後，才更新狀態並嘗試全綠 CI。英雄完成是**最終 blocking gate** 的外部前置條件。
