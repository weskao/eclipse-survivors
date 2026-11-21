<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { stickVector } from '../game/input'

const props = defineProps<{ active: boolean }>()
const emit = defineEmits<{ stick: [v: { x: number; y: number } | null]; dash: [] }>()

const pad = shallowRef<HTMLElement | null>(null)
const knobStyle = shallowRef('translate(0,0)')
// Active pointer id; not reactive (never rendered).
let stickId: number | null = null

function resetStick(): void {
  stickId = null
  knobStyle.value = 'translate(0,0)'
  emit('stick', null)
}

function movePad(e: PointerEvent): void {
  const el = pad.value
  if (!el || e.pointerId !== stickId) return
  const r = el.getBoundingClientRect()
  const v = stickVector(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2)
  knobStyle.value = `translate(${v.knobX}px,${v.knobY}px)`
  emit('stick', { x: v.x, y: v.y })
}

function downPad(e: PointerEvent): void {
  if (stickId !== null) return
  stickId = e.pointerId
  pad.value?.setPointerCapture(e.pointerId)
  movePad(e)
}

function upPad(e: PointerEvent): void {
  if (e.pointerId === stickId) resetStick()
}

// Original screen(): any non-play mode calls resetStick().
watch(() => props.active, on => { if (!on) resetStick() })
</script>

<template>
  <div id="touch" :class="{ active }"><div id="stick" ref="pad" @pointerdown="downPad" @pointermove="movePad" @pointerup="upPad" @pointercancel="upPad"><div id="knob" :style="{ transform: knobStyle }"></div></div><button id="dash" @pointerdown.prevent="emit('dash')">衝刺</button></div>
</template>
