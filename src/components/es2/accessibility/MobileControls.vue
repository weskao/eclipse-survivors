<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { AccessibilityPreferences } from '../../../game/content/accessibility/preferences'
import { joystickVector } from '../../../game/content/accessibility/joystick'

const props = withDefaults(defineProps<{
  active: boolean
  blocked?: boolean
  preferences: Readonly<AccessibilityPreferences>
}>(), { blocked: false })
const emit = defineEmits<{ stick: [value: { x: number; y: number } | null]; dash: [] }>()

const pad = shallowRef<HTMLDivElement | null>(null)
const knob = shallowRef({ x: 0, y: 0 })
const pressed = shallowRef(false)
const usable = computed(() => props.active && !props.blocked)
const knobTransform = computed(() =>
  'translate(-50%, -50%) translate(' + knob.value.x + 'px,' + knob.value.y + 'px)')
let activePointer: number | null = null

function cancelStick(): void {
  if (activePointer === null) return
  const id = activePointer
  activePointer = null
  pressed.value = false
  knob.value = { x: 0, y: 0 }
  try { pad.value?.releasePointerCapture(id) } catch { /* Unsupported or already released */ }
  emit('stick', null)
}

function moveStick(event: PointerEvent): void {
  if (!usable.value || event.pointerId !== activePointer || !pad.value) return
  event.preventDefault()
  const rect = pad.value.getBoundingClientRect()
  const vector = joystickVector(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, rect.width)
  knob.value = { x: vector.knobX, y: vector.knobY }
  emit('stick', { x: vector.x, y: vector.y })
}

function downStick(event: PointerEvent): void {
  if (!usable.value || activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
  event.preventDefault()
  event.stopPropagation()
  activePointer = event.pointerId
  pressed.value = true
  try { pad.value?.setPointerCapture(event.pointerId) } catch { /* Still release via global cancellation */ }
  moveStick(event)
}

function endStick(event: PointerEvent): void {
  if (event.pointerId === activePointer) cancelStick()
}

// Pointer capture can fail in embedded browsers; keep dragging and release outside the pad.
function moveOutside(event: PointerEvent): void {
  if (event.target instanceof Node && pad.value?.contains(event.target)) return
  moveStick(event)
}

function onVisibilityChange(): void {
  if (document.hidden) cancelStick()
}

function triggerDash(): void {
  if (usable.value) emit('dash')
}

/** Resizing and navigating away always neutralize the previous input. */
watch(() => [
  props.active, props.blocked, props.preferences.touchScale,
  props.preferences.joystickSide, props.preferences.joystickBottom,
], cancelStick, { flush: 'sync' })

onMounted(() => {
  window.addEventListener('blur', cancelStick)
  window.addEventListener('resize', cancelStick)
  window.addEventListener('orientationchange', cancelStick)
  window.addEventListener('pagehide', cancelStick)
  window.addEventListener('pointermove', moveOutside)
  window.addEventListener('pointerup', endStick)
  window.addEventListener('pointercancel', endStick)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onBeforeUnmount(() => {
  cancelStick()
  window.removeEventListener('blur', cancelStick)
  window.removeEventListener('resize', cancelStick)
  window.removeEventListener('orientationchange', cancelStick)
  window.removeEventListener('pagehide', cancelStick)
  window.removeEventListener('pointermove', moveOutside)
  window.removeEventListener('pointerup', endStick)
  window.removeEventListener('pointercancel', endStick)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div
    class="es2-mobile-controls"
    :data-active="usable"
    :data-side="preferences.joystickSide"
    :style="{ '--es2-touch-scale': preferences.touchScale, '--es2-stick-offset': preferences.joystickBottom + 'px' }"
    :aria-hidden="!usable"
    @contextmenu.prevent
  >
    <div
      ref="pad"
      data-testid="es2-stick"
      class="es2-stick"
      :class="{ pressed }"
      role="group"
      :aria-label="t('虛擬方向搖桿，鍵盤仍可使用方向鍵或 WASD')"
      @pointerdown="downStick"
      @pointermove="moveStick"
      @pointerup="endStick"
      @pointercancel="endStick"
      @touchcancel="cancelStick"
      @lostpointercapture="endStick"
    >
      <div class="es2-stick-ring" aria-hidden="true"></div>
      <div class="es2-stick-knob" aria-hidden="true" :style="{ transform: knobTransform }"></div>
    </div>
    <button
      data-testid="es2-dash"
      class="es2-dash"
      type="button"
      :aria-label="t('衝刺，鍵盤可用空白鍵')"
      :disabled="!usable"
      @keydown.space.stop
      @keyup.space.stop
      @click.stop="triggerDash"
    ><span aria-hidden="true">✧</span> {{ t("衝刺") }}</button>
  </div>
</template>

<style scoped>
.es2-mobile-controls {
  --es2-touch-scale: 1;
  --es2-stick-offset: 30px;
  position: fixed;
  z-index: 3;
  left: max(12px, env(safe-area-inset-left));
  right: max(12px, env(safe-area-inset-right));
  bottom: calc(env(safe-area-inset-bottom) + 24px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: end;
  gap: clamp(12px, 4vw, 32px);
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.es2-mobile-controls[data-active="false"] { display: none; }
.es2-stick, .es2-dash {
  box-sizing: border-box;
  touch-action: none;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
}
.es2-stick {
  position: relative;
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
  width: min(calc(122px * var(--es2-touch-scale)), 100%);
  aspect-ratio: 1;
  border: 2px solid #dac191;
  border-radius: 50%;
  background: radial-gradient(circle, #34485dc9, #0f192cdd 76%);
  box-shadow: inset 0 0 22px #000a, 0 0 0 6px #d4ba8a24, 0 6px 18px #0009;
  cursor: grab;
  transform: translateY(calc(24px - var(--es2-stick-offset)));
}
.es2-stick.pressed {
  border-color: #fff2cb;
  background: radial-gradient(circle, #4b6480e8, #152139eb 76%);
  cursor: grabbing;
}
.es2-stick-ring {
  position: absolute;
  inset: 17%;
  border: 1px solid #d7d3ba66;
  border-radius: 50%;
  pointer-events: none;
}
.es2-stick-knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 30%;
  aspect-ratio: 1;
  border: 2px solid #fff1c9;
  border-radius: 50%;
  background: linear-gradient(155deg, #98abb9, #344358);
  box-shadow: inset 0 2px 6px #fff3, 0 5px 13px #0009;
  pointer-events: none;
}
.es2-dash {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  width: min(calc(82px * var(--es2-touch-scale)), 100%);
  aspect-ratio: 1;
  padding: 3px;
  border: 2px solid #e3bd7e;
  border-radius: 50%;
  background: radial-gradient(circle at 33% 25%, #6c6473, #2a2d3c 65%, #151821);
  box-shadow: 0 0 0 5px #d6b17824, 0 7px 17px #000b;
  color: #fff0cf;
  font: 800 clamp(11px, 2.6vw, 15px)/1.3 system-ui, sans-serif;
  text-shadow: 0 1px 5px #000c;
}
.es2-dash span { display: block; color: #f4c67b; font-size: 18px; }
.es2-dash:active:not(:disabled) { background: #66513a; }
.es2-dash:disabled { opacity: .35; pointer-events: none; }
.es2-stick:focus-visible, .es2-dash:focus-visible {
  outline: 3px solid #fff1bf;
  outline-offset: 5px;
}
.es2-mobile-controls[data-side="right"] .es2-stick { grid-column: 2; justify-self: end; }
.es2-mobile-controls[data-side="right"] .es2-dash { grid-column: 1; justify-self: start; }
@media (max-height: 440px) {
  .es2-mobile-controls { bottom: max(5px, env(safe-area-inset-bottom)); }
  .es2-stick { width: min(calc(122px * var(--es2-touch-scale)), max(44px, 23dvh), 100%); }
  .es2-dash { width: min(calc(82px * var(--es2-touch-scale)), max(44px, 21dvh), 100%); }
}
@media (prefers-reduced-motion: reduce) {
  .es2-stick, .es2-dash { animation: none; transition: none; }
}
</style>
