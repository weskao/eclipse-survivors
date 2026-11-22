<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { createEngine, type Engine } from './game/engine'
import { applyPresentation, resolvePresentationPolicy } from './game/content/accessibility/presentation'
import './game/content/accessibility/presentation.css'
import { inventorySnapshot } from './game/content/relics/runtime'
import { RELIC_BY_ID } from './game/content/relics/catalog'
import CombatHud from './components/es2/hud/CombatHud.vue'
import Es2Dialog from './components/es2/menu/Es2Dialog.vue'
import { t, applyDocumentLocale } from './i18n'
import HeroSpecialAction from './components/es2/hero-roster/HeroSpecialAction.vue'
import ModeProgress from './components/es2/modes/ModeProgress.vue'
import WorldEventPanel from './components/es2/world-event-ui/WorldEventPanel.vue'
import { isSpecializationId } from './game/content/heroes'
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
const worldMarkerButtons = computed(() => {
  void ui.hud
  return ui.worldEventMarkers.flatMap(event => {
    const state = engine.state
    const x = event.x - state.cam.x + state.W * 0.5
    const y = event.y - state.cam.y + state.H * 0.53
    return x >= 20 && x <= state.W - 20 && y >= 80 && y <= state.H - 25
      ? [{ event, left: (x / state.W * 100) + '%', top: (y / state.H * 100) + '%' }] : []
  })
})
const menuScreen = computed<'menu' | 'level' | 'result' | 'hidden'>(() =>
  ui.mode === 'menu' || ui.mode === 'level' || ui.mode === 'result' ? ui.mode : 'hidden')

const accessibility = createAccessibilityPreferencesController()
const accessibilityPreferences = shallowRef<AccessibilityPreferences>(accessibility.current)
const changeAccessibility = (next: AccessibilityPreferences): void => {
  accessibilityPreferences.value = accessibility.update(next)
}
const homeConfirmOpen = ref(false)
let resumeAfterHomeCancel = false
function requestHome(): void {
  if (homeConfirmOpen.value || (ui.mode !== 'play' && ui.mode !== 'paused') || ui.settingsOpen || !!ui.worldEventChoice) return
  resumeAfterHomeCancel = ui.mode === 'play'
  if (resumeAfterHomeCancel) engine.togglePause()
  homeConfirmOpen.value = ui.mode === 'paused'
}
function cancelHome(): void {
  homeConfirmOpen.value = false
  if (resumeAfterHomeCancel && ui.mode === 'paused') engine.togglePause()
  resumeAfterHomeCancel = false
}
function confirmHome(): void {
  homeConfirmOpen.value = false
  resumeAfterHomeCancel = false
  engine.goMenu()
}
watch(() => ui.mode, mode => { if (mode !== 'paused') homeConfirmOpen.value = false })
const combatActions: CombatHudActions = {
  home: requestHome,
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
let clearPresentation: () => void = () => {}
function syncPresentation(): void {
  clearPresentation()
  const policy = resolvePresentationPolicy(accessibilityPreferences.value, {
    prefersReducedMotion: typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches,
    hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
    coarsePointer: ui.coarsePointer,
  })
  engine.setVisualPresentationPolicy(policy)
  clearPresentation = applyPresentation(document.documentElement, policy, accessibilityPreferences.value)
}
watch(accessibilityPreferences, syncPresentation)
onMounted(() => {
  syncPresentation()
  applyDocumentLocale()
  if (canvas.value) unmount = engine.mount(canvas.value, hudRef.value?.minimap ?? null)
})
onBeforeUnmount(() => {
  clearPresentation()
  unmount?.()
})
</script>

<template>
  <canvas id="game" ref="canvas" :aria-label="t('奇幻生存戰遊戲畫面')"></canvas>
  <CombatHud
    ref="hud"
    :active="ui.mode !== 'menu'"
    :can-return-home="ui.mode === 'play' && !ui.settingsOpen && !ui.worldEventChoice"
    :hud="ui.hud"
    :choice="ui.choice"
    :hero-id="ui.heroId"
    :music-on="ui.musicOn && ui.musicVolume > 0"
    :music-volume="ui.musicVolume"
    :sfx-volume="ui.sfxVolume"
    :audio-active="ui.mode === 'play' && !ui.settingsOpen"
    :sfx-on="ui.sfxOn && ui.sfxVolume > 0"
    :actions="combatActions"
    :feed="combatFeed"
  >
    <template v-if="ui.mode === 'play' && ui.objectiveProgress" #mode-progress>
      <ModeProgress :state="ui.objectiveProgress" />
    </template>
  </CombatHud>
  <HeroSpecialAction
    v-if="isSpecializationId(ui.heroId) && ui.heroSpecial"
    :hero-id="ui.heroId"
    :snapshot="ui.heroSpecial"
    :active="ui.mode === 'play' && !ui.settingsOpen"
    @activate="engine.activateHeroSpecial"
  />
  <div v-if="ui.mode === 'play' && !ui.settingsOpen" class="es2-world-markers" :aria-label="t('世界事件標記')">
    <button v-for="marker in worldMarkerButtons" :key="marker.event.id" type="button"
      class="es2-world-marker" :style="{ left: marker.left, top: marker.top }"
      :aria-label="t('互動世界事件 ' + marker.event.kind.slice(7))"
      @click="engine.openWorldEvent(marker.event.id)">✧</button>
  </div>
  <WorldEventPanel :event="ui.worldEventChoice?.event ?? null"
    :options="ui.worldEventChoice?.options ?? []" :feedback="ui.worldEventChoice?.feedback"
    @choose="engine.chooseWorldEvent" @close="engine.closeWorldEvent" />
  <MobileControls
    :active="touchActive"
    :blocked="ui.settingsOpen || ui.mode !== 'play' || !!ui.worldEventChoice"
    :preferences="accessibilityPreferences"
    @stick="engine.setStick"
    @dash="engine.dash"
  />
  <Es2MenuSystem
    :screen="menuScreen"
    :choice="ui.choice"
    :hero-id="ui.heroId"
    :run-mode="ui.runMode"
    :version="version"
    :profile="ui.profile"
    :meta-state="ui.metaState"
    :meta-status="ui.metaStatus"
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
    @select-hero="engine.selectHero"
    @mode="engine.selectRunMode"
    @start="engine.start"
    @choose="engine.chooseUpgrade"
    @special-choose="engine.chooseTreasure"
    @special-cancel="engine.cancelTreasure"
    @purchase="engine.buyPermanentUpgrade"
    @research="engine.purchaseResearch"
    @equipment="engine.purchaseEquipment"
    @bonus="engine.purchaseBonus"
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
  <PauseOverlay :active="ui.mode === 'paused' && !homeConfirmOpen" @resume="engine.togglePause" @leave="requestHome" @settings="engine.openSettings" />
  <Es2Dialog :active="homeConfirmOpen" :title="t('返回主選單？')"
    :subtitle="t('戰鬥已暫停。返回主選單將結束本次遠征，未結算的戰鬥進度不會保留。確定要離開嗎？')"
    @cancel="cancelHome">
    <p data-es2-home-confirm class="es2-warning">{{ t('離開後將無法繼續本次遠征。') }}</p>
    <template #actions>
      <button type="button" data-es2-home-cancel class="es2-secondary" @click="cancelHome">{{ t('繼續戰鬥') }}</button>
      <button type="button" data-es2-home-accept class="es2-danger-filled" @click="confirmHome">{{ t('結束遠征並返回') }}</button>
    </template>
  </Es2Dialog>
  <ContentShowcase v-if="devShowcase" :engine="engine" />
</template>

<style scoped>
 .es2-world-markers { position: fixed; inset: 0; z-index: 9; pointer-events: none; }
.es2-world-marker { position: absolute; transform: translate(-50%, -50%); pointer-events: auto;
  min-height: 44px; min-width: 44px; border-radius: 50%; border: 2px solid #efd49f;
  background: #34213bea; color: #fff0ba; font-size: 1.45rem; cursor: pointer;
  box-shadow: 0 0 14px #b6787a88; }
.es2-world-marker:focus-visible { outline: 3px solid white; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .es2-world-marker { transition: none; } }
</style>
