<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { createEngine, type Engine } from './game/engine'
import MenuScreen from './components/MenuScreen.vue'
import GameHud from './components/GameHud.vue'
import LevelUpOverlay from './components/LevelUpOverlay.vue'
import PauseOverlay from './components/PauseOverlay.vue'
import ResultOverlay from './components/ResultOverlay.vue'
import TouchControls from './components/TouchControls.vue'
import SettingsOverlay from './components/SettingsOverlay.vue'
import './meta/ui.css'
import './visual-polish.css'
import './settings.css'
import './ui-fidelity.css'

const props = defineProps<{ engine?: Engine }>()
const engine = props.engine ?? createEngine()
const ui = engine.ui
const version = __APP_VERSION__

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const hudRef = useTemplateRef<InstanceType<typeof GameHud>>('hud')
const touchActive = computed(() => ui.mode === 'play' && ui.coarsePointer)

let unmount: (() => void) | undefined
onMounted(() => {
  if (canvas.value) unmount = engine.mount(canvas.value, hudRef.value?.minimap ?? null)
})
onBeforeUnmount(() => unmount?.())
</script>

<template>
  <canvas id="game" ref="canvas" aria-label="奇幻生存戰遊戲畫面"></canvas>
  <GameHud
    ref="hud"
    :active="ui.mode !== 'menu'"
    :hud="ui.hud"
    :choice="ui.choice"
    :music-on="ui.musicOn && ui.musicVolume > 0"
    :music-volume="ui.musicVolume"
    :sfx-volume="ui.sfxVolume"
    :audio-active="ui.mode === 'play' && !ui.settingsOpen"
    :sfx-on="ui.sfxOn && ui.sfxVolume > 0"
    :toast-text="ui.toastText"
    :toast-visible="ui.toastVisible"
    @toggle-music="engine.toggleMusic"
    @toggle-sfx="engine.toggleSfx"
    @pause="engine.togglePause"
    @music-volume="engine.setMusicVolume"
    @sfx-volume="engine.setSfxVolume"
    @settings="engine.openSettings"
  />
  <TouchControls :active="touchActive" @stick="engine.setStick" @dash="engine.dash" />
  <MenuScreen
    :active="ui.mode === 'menu'"
    :choice="ui.choice"
    :music-on="ui.musicOn && ui.musicVolume > 0"
    :music-volume="ui.musicVolume"
    :sfx-volume="ui.sfxVolume"
    :audio-active="ui.mode === 'menu' && !ui.settingsOpen"
    :audio-unlocked="ui.audioUnlocked"
    :sfx-on="ui.sfxOn && ui.sfxVolume > 0"
    :version="version"
    :run-mode="ui.runMode"
    :profile="ui.profile"
    @mode="engine.selectRunMode"
    @purchase="engine.buyPermanentUpgrade"
    @cosmetic="engine.selectCosmetic"
    @reset="engine.resetProgress"
    @select="engine.selectJob"
    @start="engine.start"
    @music-volume="engine.setMusicVolume"
    @sfx-volume="engine.setSfxVolume"
    @settings="engine.openSettings"
    @toggle-music="engine.toggleMusic"
    @toggle-sfx="engine.toggleSfx"
    @enable-audio="engine.enableMenuAudio"
  />
  <LevelUpOverlay :active="ui.mode === 'level'" :upgrades="ui.upgrades" :effect="ui.upgradeEffect" @choose="engine.chooseUpgrade" @settings="engine.openSettings" />
  <PauseOverlay :active="ui.mode === 'paused'" @resume="engine.togglePause" @leave="engine.goMenu" @settings="engine.openSettings" />
  <ResultOverlay
    :active="ui.mode === 'result'"
    :ending="ui.ending"
    :summary="ui.summary"
    :run-result="ui.runResult"
    :rewards="ui.rewards"
    @again="engine.start"
    @home="engine.goMenu"
  />
  <SettingsOverlay
    :active="ui.settingsOpen"
    :upgrade-effect="ui.upgradeEffect"
    :camera-shake="ui.cameraShake"
    @close="engine.closeSettings"
    @upgrade-effect="engine.setUpgradeEffect"
    @camera-shake="engine.setCameraShake"
  />
</template>
