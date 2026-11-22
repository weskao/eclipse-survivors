# ES2 premium menu UX — integration handoff

Base: `9fd59c85e355909a6973cf93c116b8de5f9ca0df`.
Branch: `feature/es2-menu-ux`. No legacy/shared files were changed.

## Integration-owned wiring

`Es2MenuSystem.vue` is a controlled, opt-in replacement for **MenuScreen**, **LevelUpOverlay**, **ResultOverlay** and **SettingsOverlay**. It imports its own scoped CSS. The integration branch should replace the old four nodes in `App.vue` with **one** `Es2MenuSystem` (do not mount both copies or duplicate keyboard handling). Example:

```vue
<Es2MenuSystem
  :screen="ui.mode === 'menu' || ui.mode === 'level' || ui.mode === 'result' ? ui.mode : 'hidden'"
  :choice="ui.choice" :run-mode="ui.runMode" :version="version"
  :profile="ui.profile" :upgrades="ui.upgrades"
  :audio-unlocked="ui.audioUnlocked"
  :ending="ui.ending" :summary="ui.summary"
  :run-result="ui.runResult" :rewards="ui.rewards"
  :settings-open="ui.settingsOpen"
  :upgrade-effect="ui.upgradeEffect" :camera-shake="ui.cameraShake"
  :music-on="ui.musicOn" :sfx-on="ui.sfxOn"
  :music-volume="ui.musicVolume" :sfx-volume="ui.sfxVolume"
  @select="engine.selectJob" @mode="engine.selectRunMode" @start="engine.start"
  @choose="engine.chooseUpgrade" @purchase="engine.buyPermanentUpgrade"
  @cosmetic="engine.selectCosmetic" @enable-audio="engine.enableMenuAudio"
  @reset="engine.resetProgress" @again="engine.start" @home="engine.goMenu"
  @settings="engine.openSettings" @close-settings="engine.closeSettings"
  @upgrade-effect="engine.setUpgradeEffect" @camera-shake="engine.setCameraShake"
  @toggle-music="engine.toggleMusic" @toggle-sfx="engine.toggleSfx"
  @music-volume="engine.setMusicVolume" @sfx-volume="engine.setSfxVolume"
/>
```

Import `Es2MenuSystem` from `./components/es2/menu/Es2MenuSystem.vue` in `App.vue` **only on the integration branch**. Keep HUD, TouchControls, canvas, and engine untouched. Existing Profile v2, upgrades, cosmetics, audio unlock and legacy engine methods remain forwarded via named emits. The level-up screen includes a settings action.

The 16 presentations map to:
- Main menu, hero selection and mode selection: `Es2MainMenu`.
- Level-up, weapon evolution and treasure rewards: `Es2ChoiceDialog`.
- Relics, progression, monster and skill encyclopedia, achievements: `Es2Archive`.
- Victory and defeat results: `Es2Result`.
- Loading: `Es2Loading`.
- Settings: `Es2Settings`.
- Confirmation and notifications: `Es2Message`.

## Independent feature wiring

The foundation has no relic inventory, treasure selection or dedicated loading state. Integration must pass `relics`, `specialChoice`, `loading`, and optionally `notification` from real game state, and handle `specialChoose`, `specialCancel`, `dismissNotification` before enabling these presentations. Do not fabricate loot or unlocks; do not route custom choice IDs to `engine.chooseUpgrade` unless they are in `ui.upgrades`.

Artwork uses `ART_URLS` and `src/game/ui-art.ts`, or supplied content-pack `iconSrc` values; no new dependencies. Built-in generated skill animated WebP has static reduced-motion fallback. Dialogs block game keystrokes, trap focus, restore focus, respect mobile safe areas, and use scrollable layouts. Integration must ensure legacy dialogs are not simultaneously active.

## Verification

Run with dependencies installed:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

Tests are in `model.test.ts`, `Es2ChoiceDialog.test.ts`, and `Es2MenuSystem.test.ts`. Manually review 1440×900, 390×844, 320×568, mobile landscape, keyboard-only, and reduced motion after integration. This parallel branch intentionally does not rewrite `App.vue`, so the live game still uses legacy screens until integration occurs.
