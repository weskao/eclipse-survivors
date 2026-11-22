<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

type UpgradeEffect = 'soft' | 'still'
const props = defineProps<{
  active: boolean
  musicOn: boolean
  sfxOn: boolean
  musicVolume: number
  sfxVolume: number
  upgradeEffect: UpgradeEffect
  cameraShake: boolean
}>()
const emit = defineEmits<{
  close: []
  toggleMusic: []
  toggleSfx: []
  musicVolume: [value: number]
  sfxVolume: [value: number]
  upgradeEffect: [value: UpgradeEffect]
  cameraShake: [value: boolean]
}>()
const closeButton = ref<HTMLButtonElement | null>(null)
const dialog = ref<HTMLDivElement | null>(null)
const trapTab = (event: KeyboardEvent): void => {
  if (event.key !== 'Tab') return
  const controls = dialog.value?.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button:not(:disabled), input:not(:disabled)')
  if (!controls?.length) return
  const first = controls[0]!
  const last = controls[controls.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
let previousFocus: HTMLElement | null = null
watch(() => props.active, async (active) => {
  if (active) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    closeButton.value?.focus()
  } else {
    if (previousFocus?.isConnected) previousFocus.focus()
    previousFocus = null
  }
})
const amount = (event: Event): number => Number((event.target as HTMLInputElement).value)
</script>

<template>
  <div id="settings" ref="dialog" class="overlay settings-overlay" :class="{ active }" role="dialog" :aria-modal="active" aria-label="遊戲設定" @click.self="emit('close')" @keydown="trapTab">
    <section class="panel settings-panel" aria-labelledby="settingsTitle">
      <header class="settings-header">
        <div>
          <span class="settings-eyebrow">✦ SYSTEM · OPTIONS ✦</span>
          <h2 id="settingsTitle">遊戲設定</h2>
        </div>
        <button id="settingsClose" ref="closeButton" class="settings-close" type="button" aria-label="關閉設定" @click="emit('close')">×</button>
      </header>
      <div class="settings-content">
        <section class="settings-section" aria-labelledby="settingsAudioTitle">
          <h3 id="settingsAudioTitle"><span aria-hidden="true">♫</span> 音訊設定</h3>
          <p class="settings-hint">分別調整音樂與音效，也可隨時一鍵靜音。</p>
          <div class="settings-audio-row">
            <button id="settingsMusicMute" class="settings-mute" type="button" :aria-pressed="!musicOn" :aria-label="musicOn ? '靜音背景音樂' : '恢復背景音樂'" @click="emit('toggleMusic')">
              <span aria-hidden="true">{{ musicOn ? '♫' : '♪' }}</span><small>{{ musicOn ? '靜音' : '恢復' }}</small>
            </button>
            <div class="settings-volume">
              <label for="settingsMusicVolume">背景音樂 <output for="settingsMusicVolume">{{ musicVolume }}%</output></label>
              <input id="settingsMusicVolume" type="range" min="0" max="100" step="1" :value="musicVolume" :style="{ '--volume-fill': musicVolume + '%' }" @input="emit('musicVolume', amount($event))" />
            </div>
          </div>
          <div class="settings-audio-row">
            <button id="settingsSfxMute" class="settings-mute" type="button" :aria-pressed="!sfxOn" :aria-label="sfxOn ? '靜音遊戲音效' : '恢復遊戲音效'" @click="emit('toggleSfx')">
              <span aria-hidden="true">{{ sfxOn ? '♬' : '♩' }}</span><small>{{ sfxOn ? '靜音' : '恢復' }}</small>
            </button>
            <div class="settings-volume">
              <label for="settingsSfxVolume">遊戲音效 <output for="settingsSfxVolume">{{ sfxVolume }}%</output></label>
              <input id="settingsSfxVolume" type="range" min="0" max="100" step="1" :value="sfxVolume" :style="{ '--volume-fill': sfxVolume + '%' }" @input="emit('sfxVolume', amount($event))" />
            </div>
          </div>
        </section>
        <section class="settings-section" aria-labelledby="settingsMotionTitle">
          <h3 id="settingsMotionTitle"><span aria-hidden="true">✧</span> 畫面效果</h3>
          <p class="settings-hint">升級時不會晃動背景；可選擇保留柔和淡入或完全靜止。</p>
          <div class="settings-option-label">技能升級畫面</div>
          <div class="settings-segments" role="group" aria-label="技能升級畫面效果">
            <button id="settingsSoft" type="button" :aria-pressed="upgradeEffect === 'soft'" @click="emit('upgradeEffect', 'soft')">✧ 柔和淡入</button>
            <button id="settingsStill" type="button" :aria-pressed="upgradeEffect === 'still'" @click="emit('upgradeEffect', 'still')">▣ 無動畫</button>
          </div>
          <div class="settings-switch-row">
            <div><strong>戰鬥鏡頭震動</strong><small>戰鬥受到衝擊時的短暫回饋，不影響升級畫面</small></div>
            <button id="settingsCameraShake" type="button" class="settings-switch" :aria-pressed="cameraShake" :aria-label="cameraShake ? '關閉戰鬥鏡頭震動' : '開啟戰鬥鏡頭震動'" @click="emit('cameraShake', !cameraShake)"><span>{{ cameraShake ? '開啟' : '關閉' }}</span><i aria-hidden="true"></i></button>
          </div>
        </section>
      </div>
      <footer class="settings-footer">
        <p>設定會自動儲存至此瀏覽器。</p>
        <button type="button" class="settings-done" @click="emit('close')">完成設定</button>
      </footer>
    </section>
  </div>
</template>
