# Eclipse Survivors — ES3 runtime art upload

目標：`weskao/eclipse-survivors` / `feature/es3-combat-juice-power-pacing-rewards`。
程式串接 commit：`8f721a100d7f797440f5a9e61e68339455a2302d`。

## 放置方式
將本 ZIP 解壓至專案根目錄（ZIP 的 `src/` 與專案的 `src/` 合併）。不覆蓋任何原有 ES2 美術。

```sh
git switch feature/es3-combat-juice-power-pacing-rewards
git pull --ff-only
unzip -o ~/Downloads/es3-runtime-art-upload.zip -d .
git add src/assets/es3/production
git diff --cached --stat
git commit -m 'art(es3): import epic chest and legacy enemy dissolution atlases'
git push origin feature/es3-combat-juice-power-pacing-rewards
```

ZIP 內說明檔為 README-ES3-ART.md，不會覆蓋專案 README.md。若只想解壓素材，可用：

```sh
unzip -o ~/Downloads/es3-runtime-art-upload.zip 'src/*' -d .
```

**建議使用上面這條只解壓 `src/*` 的指令。**

## 素材規格
- Epic 寶箱：240×240 透明 WebP，原始 1254×1254；UI / 地圖共用。
- 五張 Legacy 敵人：872×872、2×2 格，每格 436×436、8px gutter、有效內容 420×420；原生每格 627×627，無上採樣。
- 順序：左上 → 右上 → 左下 → 右下；死亡時一次播放，不循環；沿用遊戲既有死亡時間及 1× 顯示尺度。
- 各檔 SHA-256、尺寸、大小、來源與 QA 狀態見 `src/assets/es3/production/manifest.json`。

## 驗收
```sh
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```
確認地圖上的史詩寶箱及遺物選擇卡使用紫晶圖；擊殺 slime/bat/goblin/golem/warlock 可看到四階段消散；Boss、Faction 與存活敵人不被替換；Reduced Motion 維持既有簡化路徑。

## 限制
目前未以專案原始角色圖作為生成參照，素材的形象一致性、個別原始格邊界（可能有觸邊或鄰格內容）、死亡動作與實機視覺皆尚未驗收；所有項目維持 QA_PENDING。8px gutter 可防止運行時採樣跨格，但不能證明原始生成圖沒有跨格。這是五種 Legacy 敵人消散動畫，不是 10 種 Faction 敵人的素材，也不包含獨立受擊或倒地分鏡。原始 PNG 已存在於對話，保留其 SHA-256 供追溯。
