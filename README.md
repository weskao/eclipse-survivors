# 暮境遠征 · Eclipse Survivors

**一款可在瀏覽器直接遊玩的奇幻生存動作遊戲。** 在幽暮遺跡中選擇冒險職業，穿梭於怪物群間，自動施放攻擊、蒐集經驗、組合技能，挑戰逐步升高的生存難度。

*An atmospheric fantasy survival-action game featuring automatic combat, evolving abilities, boss encounters, and original music. Play instantly on desktop or mobile.*

[**開啟線上遊戲 / Play Online**](https://weskao.github.io/survivor-game/) · [檢視更新紀錄 / Changelog](CHANGELOG.md) · [發布流程 / Release Process](docs/release-process.md)

> 線上網址由 GitHub Pages 提供；若無法開啟，請確認儲存庫的 Pages 部署已成功。遊戲原型也能下載 `index.html` 離線遊玩。

## 遊戲特色 / Features

- **三種冒險職業**：騎士、遊俠、法師，各自具有不同的攻擊方式與初始能力。
- **割草生存戰鬥**：面對持續出現的怪物，移動閃避、自動攻擊、拾取經驗結晶。
- **持續成長**：升級時從三項強化中選擇一項，累積並組合多達 15 種能力。
- **元素技能特效**：落雷、連鎖雷擊、冰霜、隕石、火焰、渦流與護盾等技能。
- **動態戰場氛圍**：不同時間階段呈現晨光、暴雨、飛雪與灰燼環境效果。
- **精英與首領挑戰**：在不斷增強的敵群中設法存活。
- **原創音樂與音效**：音訊和遊戲圖片都內嵌於單一 HTML 檔案。
- **跨裝置遊玩**：支援桌面瀏覽器與手機觸控操作，無需安裝額外套件。

## 開始遊玩 / Getting Started

### 線上遊玩 / Online

直接開啟：**https://weskao.github.io/survivor-game/**

### 離線遊玩 / Offline

1. 下載專案中的 `index.html`。
2. 使用 Chrome、Edge 或其他支援現代 JavaScript 的瀏覽器開啟。
3. 選擇職業，點選 **「開始冒險」**。

不需要 Node.js、後端服務或網路連線。瀏覽器通常要求使用者先點擊按鈕才能播放音樂，因此遊戲背景音樂會在開始冒險後啟動。

## 操作方式 / Controls

| 裝置 | 操作 |
| --- | --- |
| 電腦 | `WASD` / 方向鍵移動 |
| 電腦 | `Space` 衝刺 |
| 電腦 | `P` / `Esc` 暫停或繼續 |
| 電腦 | 升級選單按 `1`、`2`、`3` 選擇 |
| 手機 | 虛擬搖桿移動、畫面上的衝刺按鈕 |
| 全平台 | 自動尋敵與攻擊；移動拾取經驗結晶 |

## 專案結構 / Project Structure

```text
index.html                    # 遊戲、介面、圖片及音樂（單一檔案）
README.md                     # 專案介紹與操作方式
CHANGELOG.md                  # 玩家可讀的版本更新紀錄
.github/workflows/release.yml # 發布檢查及 GitHub Pages 工作流程
scripts/check-release.mjs     # 離線完整性與 JavaScript 語法檢查
docs/release-process.md       # 發布與 GitHub About 維護說明
```

## 開發狀態 / Development Status

本專案仍處於**可玩原型**階段，角色動畫、場景表現與技能演出會持續改進。設計討論中的高精緻度概念圖不代表目前遊戲已具備相同視覺品質。遊戲進度以儲存庫內的 `index.html` 為準。

*This is a playable prototype. Visual concepts shared during development are not necessarily implemented in the current game.*

## 授權 / License

此儲存庫目前未提供開放原始碼授權條款；除非另行授權，所有權利均予保留。
