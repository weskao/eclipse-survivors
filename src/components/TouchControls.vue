<script setup lang="ts">
import { t } from '../i18n'
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { stickVector } from '../game/input'

const props = defineProps<{ active: boolean }>()
const emit = defineEmits<{ stick: [v: { x: number; y: number } | null]; dash: [] }>()

const pad = shallowRef<HTMLElement | null>(null)
const knobStyle = shallowRef('translate(0,0)')
let stickId: number | null = null

function resetStick(): void {
  if (stickId === null) return
  stickId = null
  knobStyle.value = 'translate(0,0)'
  emit('stick', null)
}

function movePad(e: PointerEvent): void {
  const el = pad.value
  if (!props.active || !el || e.pointerId !== stickId) return
  const r = el.getBoundingClientRect()
  const v = stickVector(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2)
  knobStyle.value = `translate(${v.knobX}px,${v.knobY}px)`
  emit('stick', { x: v.x, y: v.y })
}

function downPad(e: PointerEvent): void {
  if (!props.active || stickId !== null) return
  stickId = e.pointerId
  try { pad.value?.setPointerCapture(e.pointerId) } catch { /* capture unsupported: release on pointerup/cancel */ }
  movePad(e)
}

function upPad(e: PointerEvent): void {
  if (e.pointerId === stickId) resetStick()
}

function dash(): void {
  if (props.active) emit('dash')
}

watch(() => props.active, active => { if (!active) resetStick() })
onBeforeUnmount(resetStick)
</script>

<template>
  <div id="touch" :class="{ active }" :aria-label="t('行動裝置遊戲控制')">
    <div id="stick" ref="pad" :aria-label="t('方向搖桿')" @pointerdown.prevent="downPad" @pointermove="movePad" @pointerup="upPad" @pointercancel="upPad" @lostpointercapture="upPad">
      <div id="knob" :style="{ transform: knobStyle }"></div>
    </div>
    <button id="dash" type="button" :disabled="!active" :aria-label="t('衝刺')" @click="dash">{{ t("衝刺") }}</button>
  </div>
</template>
