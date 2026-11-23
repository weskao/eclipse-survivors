<script setup lang="ts">
import { t } from '../i18n'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  context: 'menu' | 'hud'
  active: boolean
  musicOn: boolean
  sfxOn: boolean
  musicVolume: number
  sfxVolume: number
  compact?: boolean
}>(), { compact: false })

const emit = defineEmits<{
  toggleMusic: []
  toggleSfx: []
  musicVolume: [value: number]
  sfxVolume: [value: number]
}>()

const opened = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const popover = ref<HTMLDivElement | null>(null)
const position = ref({ left: '8px', top: '8px', width: '288px' })
const id = (name: string): string => props.context + name
const volume = (event: Event): number => Number((event.target as HTMLInputElement).value)

function place(): void {
  if (!trigger.value || typeof window === 'undefined') return
  const r = trigger.value.getBoundingClientRect()
  const width = Math.min(288, window.innerWidth - 16)
  const height = popover.value?.offsetHeight || 228
  const x = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8))
  const proposed = r.top >= height + 16 ? r.top - height - 8 : r.bottom + 8
  const y = Math.max(8, Math.min(proposed, window.innerHeight - Math.min(height, window.innerHeight - 16) - 8))
  position.value = { left: x + 'px', top: y + 'px', width: width + 'px' }
}

function close(returnFocus = false): void {
  opened.value = false
  if (returnFocus) trigger.value?.focus()
}
function toggle(): void {
  if (opened.value) close()
  else {
    opened.value = true
    place()
  }
}
function onOutside(event: PointerEvent): void {
  if (!(event.target instanceof Node)) return
  if (trigger.value?.contains(event.target) || popover.value?.contains(event.target)) return
  close()
}
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close(true)
  }
}
function detach(): void {
  window.removeEventListener('resize', place)
  document.removeEventListener('scroll', place, true)
  document.removeEventListener('pointerdown', onOutside)
  document.removeEventListener('keydown', onKeydown)
}
watch(opened, (visible) => {
  if (visible) {
    void nextTick(place)
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('keydown', onKeydown)
  } else detach()
})
watch(() => props.active, (active) => { if (!active) close() })
onBeforeUnmount(detach)
</script>

<template>
  <span class="audio-control">
    <button
      :id="id('AudioTrigger')"
      ref="trigger"
      type="button"
      class="audio-trigger"
      :class="{ compact, 'es2-hud__control-button': context === 'hud' }"
      :aria-expanded="opened"
      :aria-controls="id('AudioPopover')"
      :aria-label="t('音量與音效調整')"
      :title="t('音量與音效調整')"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <path v-if="musicOn || sfxOn" d="M16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12" />
        <path v-else d="m17 9 5 6m0-6-5 6" />
      </svg>
      <span v-if="!compact">{{ t("音量") }}</span>
    </button>
    <Teleport to="body">
      <div v-if="opened && active" :id="id('AudioPopover')" ref="popover" class="audio-popover" :style="position" role="group" :aria-label="t('即時音量控制')">
        <div class="audio-popover-heading"><strong>{{ t("音訊控制") }}</strong><button type="button" class="audio-popover-close" :aria-label="t('關閉音訊控制')" @click="close(true)">×</button></div>
        <div class="audio-popover-row">
          <button :id="id('MusicMute')" type="button" class="audio-mute" :aria-pressed="!musicOn" :aria-label="t(musicOn ? '靜音背景音樂' : '恢復背景音樂')" @click="emit('toggleMusic')">{{ musicOn ? '♫' : '♪' }}</button>
          <div class="audio-volume">
            <label :for="id('MusicVolume')">{{ t("背景音樂") }} <output>{{ musicVolume }}%</output></label>
            <input :id="id('MusicVolume')" type="range" min="0" max="100" step="1" :value="musicVolume" :style="{ '--audio-fill': musicVolume + '%' }" @input="emit('musicVolume', volume($event))" />
          </div>
        </div>
        <div class="audio-popover-row">
          <button :id="id('SfxMute')" type="button" class="audio-mute" :aria-pressed="!sfxOn" :aria-label="t(sfxOn ? '靜音遊戲音效' : '恢復遊戲音效')" @click="emit('toggleSfx')">{{ sfxOn ? '♬' : '♩' }}</button>
          <div class="audio-volume">
            <label :for="id('SfxVolume')">{{ t("遊戲音效") }} <output>{{ sfxVolume }}%</output></label>
            <input :id="id('SfxVolume')" type="range" min="0" max="100" step="1" :value="sfxVolume" :style="{ '--audio-fill': sfxVolume + '%' }" @input="emit('sfxVolume', volume($event))" />
          </div>
        </div>
        <p class="audio-popover-hint">{{ t("拖曳即時生效 · 點擊音符即可靜音") }}</p>
      </div>
    </Teleport>
  </span>
</template>
