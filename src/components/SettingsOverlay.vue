<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

type UpgradeEffect = 'soft' | 'still'
const props = defineProps<{
  active: boolean
  upgradeEffect: UpgradeEffect
  cameraShake: boolean
}>()
const emit = defineEmits<{
  close: []
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
        <section class="settings-section" aria-labelledby="settingsMotionTitle">
          <h3 id="settingsMotionTitle"><span aria-hidden="true">✧</span> 畫面效果</h3>
          <p class="settings-hint">升級時不會晃動背景；可選擇保留柔和淡入或完全靜止。</p>
          <div class="settings-option-label">技能升級畫面</div>
          <div class="settings-segments" role="group" aria-label="技能升級畫面效果">
            <button id="settingsSoft" type="button" :aria-pressed="upgradeEffect === 'soft'" @click="emit('upgradeEffect', 'soft')"><span class="settings-choice-icon" aria-hidden="true">✧</span><span class="settings-choice-copy"><strong>柔和淡入</strong><small>只顯示輕柔過場效果</small></span></button>
            <button id="settingsStill" type="button" :aria-pressed="upgradeEffect === 'still'" @click="emit('upgradeEffect', 'still')"><span class="settings-choice-icon" aria-hidden="true">▣</span><span class="settings-choice-copy"><strong>無動畫</strong><small>靜止畫面，專注選擇</small></span></button>
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
