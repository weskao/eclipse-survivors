<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { createEngine, type Engine } from './game/engine'
import { inventorySnapshot } from './game/content/relics/runtime'
import { RELIC_BY_ID } from './game/content/relics/catalog'
import CombatHud from './components/es2/hud/CombatHud.vue'
import type { CombatHudActions, CombatHudFeed } from './components/es2/hud/model'
import Es2MenuSystem from './components/es2/menu/Es2MenuSystem.vue'
import MobileControls from './components/es2/accessibility/MobileControls.vue'
import {
  createAccessibilityPreferencesController,
  type AccessibilityPreferences,
} from './game/content/accessibility/preferences'
import PauseOverlay from './components/PauseOverlay.vue'
import ContentShowcase from './components/ContentShowcase.vue'
import './meta/ui.css'
import './visual-polish.css'
import './settings.css'
import './ui-fidelity.css'

const props = defineProps<{ engine?: Engine }>()
const engine = props.engine ?? createEngine()
const ui = engine.ui
const version = __APP_VERSION__
const devShowcase = import.meta.env.DEV && typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('content-showcase') === '1'

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const hudRef = useTemplateRef<InstanceType<typeof CombatHud>>('hud')
const touchActive = computed(() => ui.mode === 'play' && ui.coarsePointer)
const menuScreen = computed<'menu' | 'level' | 'result' | 'hidden'>(() =>
  ui.mode === 'menu' || ui.mode === 'level' || ui.mode === 'result' ? ui.mode : 'hidden')

const accessibility = createAccessibilityPreferencesController()
const accessibilityPreferences = shallowRef<AccessibilityPreferences>(accessibility.current)
const changeAccessibility = (next: AccessibilityPreferences): void => {
  accessibilityPreferences.value = accessibility.update(next)
}
const combatActions: CombatHudActions = {
  pause: engine.togglePause,
  settings: engine.openSettings,
  toggleMusic: engine.toggleMusic,
  toggleSfx: engine.toggleSfx,
  setMusicVolume: engine.setMusicVolume,
  setSfxVolume: engine.setSfxVolume,
}
const relicCollection = computed(() => {
  void ui.hud // Recompute after the engine emits its latest live HUD snapshot.
  return inventorySnapshot(engine.state).items.map(({ id }) => {
    const relic = RELIC_BY_ID.get(id)!
    return { id, title: relic.title, icon: relic.icon, rarity: relic.rarity,
      description: relic.description, owned: true, effect: relic.description }
  })
})
const combatFeed = computed<CombatHudFeed>(() => {
  void ui.hud // Live snapshot replaces every 125 ms; game state is intentionally not deep-reactive.
  const boss = engine.state.mobs.find(mob => mob.type === 'boss' && mob.hp > 0)
  return {
    boss: boss ? { name: '首領', phase: boss.bossPhase, totalPhases: 3 } : undefined,
    relics: relicCollection.value,
    notices: ui.toastVisible && ui.toastText
      ? [{ id: ui.toastText, kind: 'message', text: ui.toastText }]
      : [],
  }
})

let unmount: (() => void) | undefined
onMounted(() => {
  if (canvas.value) unmount = engine.mount(canvas.value, hudRef.value?.minimap ?? null)
})
onBeforeUnmount(() => unmount?.())
</script>

<template>
  <canvas id="game" ref="canvas" aria-label="奇幻生存戰遊戲畫面"></canvas>
  <CombatHud
    ref="hud"
    :active="ui.mode !== 'menu'"
    :hud="ui.hud"
    :choice="ui.choice"
    :music-on="ui.musicOn && ui.musicVolume > 0"
    :music-volume="ui.musicVolume"
    :sfx-volume="ui.sfxVolume"
    :audio-active="ui.mode === 'play' && !ui.settingsOpen"
    :sfx-on="ui.sfxOn && ui.sfxVolume > 0"
    :actions="combatActions"
    :feed="combatFeed"
  />
  <MobileControls
    :active="touchActive"
    :blocked="ui.settingsOpen || ui.mode !== 'play'"
    :preferences="accessibilityPreferences"
    @stick="engine.setStick"
    @dash="engine.dash"
  />
  <Es2MenuSystem
    :screen="menuScreen"
    :choice="ui.choice"
    :run-mode="ui.runMode"
    :version="version"
    :profile="ui.profile"
    :upgrades="ui.upgrades"
    :audio-unlocked="ui.audioUnlocked"
    :music-on="ui.musicOn && ui.musicVolume > 0"
    :sfx-on="ui.sfxOn && ui.sfxVolume > 0"
    :music-volume="ui.musicVolume"
    :sfx-volume="ui.sfxVolume"
    :settings-open="ui.settingsOpen"
    :upgrade-effect="ui.upgradeEffect"
    :camera-shake="ui.cameraShake"
    :ending="ui.ending"
    :summary="ui.summary"
    :run-result="ui.runResult"
    :rewards="ui.rewards"
    :relics="relicCollection"
    :special-choice="ui.specialChoice"
    :accessibility-preferences="accessibilityPreferences"
    @select="engine.selectJob"
    @mode="engine.selectRunMode"
    @start="engine.start"
    @choose="engine.chooseUpgrade"
    @special-choose="engine.chooseTreasure"
    @special-cancel="engine.cancelTreasure"
    @purchase="engine.buyPermanentUpgrade"
    @cosmetic="engine.selectCosmetic"
    @enable-audio="engine.enableMenuAudio"
    @reset="engine.resetProgress"
    @again="engine.start"
    @home="engine.goMenu"
    @settings="engine.openSettings"
    @close-settings="engine.closeSettings"
    @upgrade-effect="engine.setUpgradeEffect"
    @camera-shake="engine.setCameraShake"
    @toggle-music="engine.toggleMusic"
    @toggle-sfx="engine.toggleSfx"
    @music-volume="engine.setMusicVolume"
    @sfx-volume="engine.setSfxVolume"
    @accessibility="changeAccessibility"
  />
  <PauseOverlay :active="ui.mode === 'paused'" @resume="engine.togglePause" @leave="engine.goMenu" @settings="engine.openSettings" />
  <ContentShowcase v-if="devShowcase" :engine="engine" />
</template>
