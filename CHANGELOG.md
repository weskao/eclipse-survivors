## [1.1.0] - 2026-11-21

### 🚀 Features

- **art:** Add original scalable fantasy spell sigil atlas
- **ui:** Apply fantasy rarity, selection, focus and icon art styles
- **ui:** Load gothic visual art layer
- **ui:** Label selected and unselected heroes visibly
- **art:** Add ten genuine transparent 3x generated skill WebPs and optimized atlas
- **ui:** Share generated WebP icon path mapping with SVG fallback
- **ui:** Display generated transparent WebP abilities in upgrade cards
- **ui:** Display generated transparent WebP abilities in combat HUD
- **ui:** Integrate generated WebP art and cinematic responsive fantasy UI motion
- **ui:** Expose mode identity for thematic card styling
- **combat:** Use shared hand origin and articulated two-bone weapon kinematics
- **render:** Animate original artwork with aim-aware two-bone skinning and weapon recoil
- **ui:** Render native animated WebP skills with accessible static fallback
- **ui:** Render native animated WebP skills with accessible static fallback
- **ui:** Render native animated WebP skills with accessible static fallback
- **art:** Reproducible 12-frame transparent WebP animations for ten skills and HUD atlas

### 🐛 Bug Fixes

- **ui:** Target generated sprite pseudo-element for every ability
- **ui:** Fit all three upgrade cards on mobile landscape screens
- **animation:** Match articulated weapon joints to each hero's actual illustrated grip
- **render:** Preserve weapon aim in attack animation

### 💼 Other

- Refresh authentic game icons, social image and gameplay captures
- **ui:** Commit ten transparent animated WebPs and one HUD atlas
- Refresh authentic game icons, social image and gameplay captures

### 🚜 Refactor

- **ui:** Improve mobile label readability and tactile touch controls without duplicate lock icons
- **art:** Remove unused vector draft after real WebP artwork integration
- **art:** Expose shared generated art detection

### 📚 Documentation

- **animation:** Record per-hero grip mapping, physics and visual limitations
- Enforce reusable real-time performance policy in Claude Code rules

### ⚡ Performance

- **ui:** Avoid per-frame backdrop filters over moving game canvas
- **hud:** Draw generated skills from atlas without loading redundant image files
- Cache terrain cells and cull mobs before depth sorting (GREEN)
- **render:** Prepaint magic glow, cache vignette, cull offscreen effects (GREEN)
- Render bolt glow at 3x and document crowd stress-test evidence (GREEN)
- Cache static hazard cells and weather noise; avoid orbit distance square roots
- Reuse distance calculations and gradient paint; document realtime rules
- Broad-phase star and AoE checks without unnecessary distance roots

### 🧪 Testing

- **ui:** Define selected-state and generated art acceptance checks
- **ui:** Validate scalable generated arcana sprite asset
- **ui:** Capture real selected hero, mode and upgrade states
- **ui:** Verify three upgrade choices fit short landscape viewports
- **ui:** Require @3x transparent WebP art and richer interactive overlays
- **ui:** Assert optimized WebP atlas instead of original vector draft
- **ui:** Capture progression windows and confirm real WebP artwork loads in browser
- **art:** Verify genuine 3x WebP dimensions and alpha transparency
- **ui:** Prevent duplicate per-icon image fetches when HUD uses WebP atlas
- **animation:** Specify joint constraints and projectile aim before implementation
- **render:** Verify articulated weapon cells; optimize transforms and record video evidence
- **combat:** Measure projectile intercept from its new weapon-hand origin
- **render:** Prove aimed bow and staff change visual direction vertically
- **ui:** Require genuine multi-frame raster spell animations and reduced-motion stills
- **ui:** Complete UpgradeDef fixture in animated skill test
- **ui:** Assert native WebP motion and reduced-motion still without breaking SVG fallbacks
- **ui:** Reset open progression drawer without clicking a clipped-offscreen summary
- **perf:** Reproduce crowd cache and render overwork (RED)
- **perf:** Reproduce avoidable per-frame canvas allocations and offscreen effects (RED)
- **perf:** Require sprite-cached bolt glow with correct per-shot positioning (RED)
- **perf:** Require high-density glow cache to preserve retina clarity (RED)
- **perf:** RED contracts for cached hazards, storm samples and orb distances
- **perf:** RED budgets for nearest sorting, enemy motion, despawn and cached glow
- **perf:** Isolate measured nearest sort from expected-value setup
- **perf:** RED budgets for star pickup, AoE and vortex distance work

### ⚙️ Miscellaneous Tasks

- **ui:** Verify new fantasy art branch with full Vue checks
- **ui:** Capture desktop and mobile real-game visual evidence
- Verify physical hero attack animations on feature branch
- **ui:** Generate, test, commit animated WebPs and verify in actual Chromium
## [1.0.0] - 2026-11-22

### 繁體中文重點

- 完整整合七個功能分支，保留 Vue 3、TypeScript、Vite 架構。
- 修正戰鬥重複擊殺獎勵與 Boss 勝利判定，加入遠程、精英敵人及多階段 Boss 戰。
- 新增五種傳說技能進化、裝備中技能 HUD 與更公平的升級選項。
- 加入四種場景、生態障礙與隨機事件，提供四種遊戲模式。
- 加入持久化進度、成就、個人最佳紀錄、角色造型、圖鑑及詳細結算。
- 改善角色動畫、音樂與音效中斷恢復、手機操作及渲染效能。

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
