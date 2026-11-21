# 發布流程與 GitHub About / Release Process and Repository About

本專案使用單一 `index.html` 運作，不需要額外的編譯工具。發布流程參考 [Skyline Rush](https://github.com/weskao/skyline-rush) 的核心原則：**先驗證、再部署、最後確認公開網址能載入遊戲**；不複製大型專案無關的建置需求。

## GitHub 儲存庫資訊

- **儲存庫**：<https://github.com/weskao/eclipse-survivors>
- **目前可見性**：Public
- **預設分支**：`main`
- **網站網址**：<https://weskao.github.io/eclipse-survivors/>
- **遊戲入口**：根目錄 `index.html`

### GitHub About 建議內容

在儲存庫首頁右側 **About → 編輯（齒輪）** 中使用下列資訊。**文件內容不會自動修改 GitHub About 欄位**。

**Description**

> A fantasy survival-action browser game with auto combat, evolving skills, dynamic weather, boss encounters, original music, and desktop/mobile controls.

**Website**

`https://weskao.github.io/eclipse-survivors/`

**Topics**

`survivor-game`, `browser-game`, `html5-game`, `javascript`, `canvas`, `fantasy-game`, `action-game`, `roguelite`, `offline-game`, `mobile-friendly`

## GitHub Pages 設定

目前採用 **B. GitHub Actions**（唯一部署路徑）；A 僅作為備案說明，勿與 B 同時啟用，否則兩條部署會互相排隊或取消。

### A. Deploy from a branch（未使用）

- **Source**：Deploy from a branch
- **Branch**：`main`
- **Folder**：`/(root)`
- **Save** 後由 GitHub 自動發布 `index.html`。
- 本專案的 `.nojekyll` 可直接供靜態檔案使用。

**注意**：Branch 部署在推送後可能直接更新公開頁面，不會等待自訂驗證工作完成。若必須嚴格遵守「測試成功才發布」，應採用 GitHub Actions 作為 Pages 發布來源。

### B. GitHub Actions（目前使用，具驗證關卡）

- **Source**：GitHub Actions
- 工作流程：`.github/workflows/release.yml`，單一工作完成驗證與部署。
- Push 至 `main`（唯一部署觸發）：檢查入口檔案、內嵌 JavaScript 語法、音訊與資源路徑；發布 `index.html`、`manifest.webmanifest`、`assets/`；最後確認公開網址回傳遊戲入口。
- `v*` tag 不會觸發部署；版本標籤與 GitHub Release 由 `/release` 建立。
- 手動重部署：**Actions → Verify and publish Eclipse Survivors → Run workflow**，分支選 `main`。

## 版本發布 / Versioned Release

1. 確認欲宣告的遊戲功能已在 `index.html` 真正實作。
2. 更新 `CHANGELOG.md`，只描述玩家現在可體驗的功能，繁體中文與英文並列。
3. 執行 `/release <版本>`：提交 changelog、推送 `main`（觸發部署）、建立標籤與 GitHub Release。
4. 確認該次 `main` 的 **Verify and publish Eclipse Survivors** 成功。
5. 使用桌面與手機確認「開始冒險」、移動、升級選單、音效及暫停能正常運作。

## 常見問題 / Troubleshooting

- 公開網址回傳 404：檢查 Pages 設定是否正確、最近一次部署是否成功，以及 `main` 根目錄是否含 `index.html`。
- Actions 工作流程失敗：查看 [Actions](https://github.com/weskao/eclipse-survivors/actions) 的實際錯誤紀錄，勿宣告已上線。
- 無背景音樂：瀏覽器通常必須先收到使用者互動；請按「開始冒險」後確認音樂選項。
- 重要視覺原則：任何設計概念圖都不能當作已完成的真實遊戲截圖使用。
