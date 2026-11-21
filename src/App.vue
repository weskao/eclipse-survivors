<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { createEngine, type Engine } from './game/engine'
import MenuScreen from './components/MenuScreen.vue'
import GameHud from './components/GameHud.vue'
import LevelUpOverlay from './components/LevelUpOverlay.vue'
import PauseOverlay from './components/PauseOverlay.vue'
import ResultOverlay from './components/ResultOverlay.vue'
import TouchControls from './components/TouchControls.vue'

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
    :music-on="ui.musicOn"
    :sfx-on="ui.sfxOn"
    :toast-text="ui.toastText"
    :toast-visible="ui.toastVisible"
    @toggle-music="engine.toggleMusic"
    @toggle-sfx="engine.toggleSfx"
    @pause="engine.togglePause"
  />
  <TouchControls :active="touchActive" @stick="engine.setStick" @dash="engine.dash" />
  <MenuScreen
    :active="ui.mode === 'menu'"
    :choice="ui.choice"
    :music-on="ui.musicOn"
    :sfx-on="ui.sfxOn"
    :version="version"
    @select="engine.selectJob"
    @start="engine.start"
    @toggle-music="engine.toggleMusic"
    @toggle-sfx="engine.toggleSfx"
  />
  <LevelUpOverlay :active="ui.mode === 'level'" :upgrades="ui.upgrades" @choose="engine.chooseUpgrade" />
  <PauseOverlay :active="ui.mode === 'paused'" @resume="engine.togglePause" @leave="engine.goMenu" />
  <ResultOverlay
    :active="ui.mode === 'result'"
    :ending="ui.ending"
    :summary="ui.summary"
    @again="engine.start"
    @home="engine.goMenu"
  />
</template>
