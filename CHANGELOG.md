## [1.0.0] - 2026-11-22

### Gameplay and balance
- Integrate correctness fixes for single-award deaths, accurate projectile hits, boss-gated victories and class balance.
- Add elite and ranged enemies, distinct AI actions, hit telegraphs and three-stage boss fights.
- Provide five legendary skill evolutions, weighted upgrades, level caps and an equipped-skill HUD.
- Add four unique playable biomes, environmental collision/hazards and random world events.
- Add configurable Quick, Standard, Endless and Challenge modes with explicit victory requirements.

### Player experience
- Introduce versioned persistent profiles, records, achievements, hero cosmetics, modest permanent progression, encyclopedia and end-of-run statistics.
- Improve hero movement/attack effects, mobile controls, audio-interruption recovery and rendering work.
- Preserve the game's Vue 3, TypeScript, Vite and pnpm architecture.

### Verification
- Merge seven independently developed feature branches while retaining original functionality.
- Add cross-feature regression tests and automated real-game desktop/mobile screenshots and MP4 gameplay evidence.
- Keep GitHub Pages deployment subject to successful verification after promotion to main.

## [Unreleased]

### ⚠️ Breaking / 破壞性變更

- 遊戲改以 Vue 3、TypeScript 與 Vite 建置，發布內容由單一離線 `index.html` 改為 `dist/` 資料夾。直接從檔案（`file://`）開啟已無法遊玩，請使用 GitHub Pages 線上版或 `pnpm preview`。
- The game is now built with Vue 3, TypeScript and Vite, and ships as a `dist/` folder instead of a single offline `index.html`. Opening it straight from disk (`file://`) no longer works; play it on GitHub Pages or serve it with `pnpm preview`.

## [0.1.0] - 2026-11-21

### 🚀 Features

- Cinematic Eclipse Survivors character selection
- Cinematic menu audio, battle sound cues and current version
- Add dark-fantasy menu soundtrack, gameplay audio cues and visible version

### 🐛 Bug Fixes

- Declare correct PNG MIME type for the in-game knight favicon
- Show all three heroes in Eclipse Survivors social cover
- Feature knight, ranger and mage in authentic OG cover art

### 💼 Other

- Generate authentic in-game app icons, social cover and gameplay screenshots
- Use real in-game knight app icon and actual-game social preview
- Use the actual knight PNG icon, not the unrelated SVG placeholder
- Refresh authentic game icons, social image and gameplay captures
- Refresh authentic game icons, social image and gameplay captures
- Refresh authentic game icons, social image and gameplay captures
- Refresh authentic game icons, social image and gameplay captures
- Refresh authentic game icons, social image and gameplay captures

### 📚 Documentation

- Replace misleading concept art with actual desktop, mobile and level-up screenshots
- Explain cinematic menu audio, controls and version label
- Record menu soundtrack and gameplay SFX as unreleased
- Include displayed game version in release SOP

### 🧪 Testing

- Require real in-game artwork for mobile icon and social cover
- Cover menu version, soundtrack and event-specific audio
- Correct test regexes before implementation
- Fail releases when displayed game version diverges from changelog
- Correctly parse semver from changelog for menu release guard
- Require all three playable heroes on social cover

### ⚙️ Miscellaneous Tasks

- Fix unsupported Playwright runner and export real-game visuals
- Publish only when true screenshots and branded icons are available
- Stop tracking retired mismatched SVG marketing assets
- Remove obsolete non-game app icon SVG
- Remove obsolete non-game OG artwork SVG
- Validate standalone soundtrack and menu version
- Enforce audio and version tests before publishing
- Set menu version label to v0.1.0
## [Unreleased]

### 🎼 Audio / 音訊

- Add an original dark-fantasy menu motif that begins after a browser-permitted interaction, while preserving the embedded gameplay soundtrack.
- Add distinct musical cues and sound effects for hero selection, UI buttons, knight/ranger/wizard attacks, spells, dash, upgrades, experience pickups, damage, bosses, and win/loss.
- Provide independent music and SFX switches with saved preferences and cooldowns to avoid repeated loud cues during large enemy waves.
- Display the current released version (v0.0.3) on the hero selection screen and verify it against the changelog before release.

## [0.0.3] - 2026-11-21

### ⚙️ Miscellaneous Tasks

- Rename project to eclipse-survivors
## [0.0.2] - 2026-11-21

### 🚀 Features

- Add installable browser game manifest and home-screen icons
- Add mobile home-screen icon, web manifest and social preview metadata

### 🐛 Bug Fixes

- Keep scalable app-icon fallback available before PNG export

### 💼 Other

- Add scalable branded game icon
- Add cinematic cover artwork for README and social
- Export home-screen icons, social cover and true gameplay screenshots

### 📚 Documentation

- Present Eclipse Survivors as an original fantasy game
- Polish bilingual changelog and release availability
- Refresh Pages publishing options and GitHub About copy
- English-first README with key art and real gameplay screenshot gallery

### ⚙️ Miscellaneous Tasks

- Generate and commit mobile icons, OG PNG and screenshots
- Generate branding against current main and avoid stale-run push conflicts
- Deploy Pages from a single main-push job
- Publish manifest and icons with the game; document single deploy path
# 更新紀錄 / Changelog

這份更新紀錄描述已加入專案的功能。網站是否已公開發布，以 [GitHub Pages 部署狀態](https://github.com/weskao/eclipse-survivors/actions) 為準。

## v0.0.1 — 2026-11-21

### 遊戲內容 / Gameplay

- **三種職業**：騎士、遊俠與法師，具備各自的初始戰鬥能力。
- **生存玩法**：怪物群、自動攻擊、經驗拾取、三選一升級與首領遭遇。
- **多樣化能力**：15 種可持續強化的技能與被動能力，包括雷擊、冰霜、隕石、火焰及護盾。
- **場景氛圍**：晨光、暴風雨、雪景與灰燼等動態環境效果。
- **原創音訊**：背景配樂與戰鬥音效可在離線遊戲中播放。
- **角色動作調整**：減少不自然的分段變形，採用完整人物圖像與較平滑的加速、減速及貼地步態。

### 發布與可用性 / Availability

- 支援桌面鍵盤與手機觸控操作。
- 單一 `index.html` 即可離線執行，無須安裝套件。
- 加入 GitHub Pages 發布工作流程與離線完整性檢查。

### Notes

- Desktop and mobile controls are included in the playable prototype.
- Gameplay features and visual quality should be assessed from the actual game, not from concept illustrations.
- Public website availability depends on a successful GitHub Pages deployment.
