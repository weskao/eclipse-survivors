<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface Option { value: string; label: string; lang?: string }
const props = withDefaults(defineProps<{
  id: string
  label: string
  modelValue: string
  options: readonly Option[]
  disabled?: boolean
  testId?: string
}>(), { disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const trigger = ref<HTMLButtonElement | null>(null)
const list = ref<HTMLUListElement | null>(null)
const opened = ref(false)
const activeIndex = ref(0)
const listId = `${props.id}-listbox`
const selected = computed(() => props.options.find(option => option.value === props.modelValue))
const popupStyle = ref<Record<string, string>>({})

function position(): void {
  if (!trigger.value) return
  const anchor = trigger.value.getBoundingClientRect()
  const viewport = window.visualViewport
  const leftEdge = viewport?.offsetLeft ?? 0
  const topEdge = viewport?.offsetTop ?? 0
  const viewportWidth = viewport?.width ?? window.innerWidth
  const viewportHeight = viewport?.height ?? window.innerHeight
  const width = Math.min(Math.max(anchor.width, 180), Math.max(0, viewportWidth - 16))
  const left = Math.max(leftEdge + 8, Math.min(anchor.left, leftEdge + viewportWidth - width - 8))
  const desiredHeight = Math.min(280, props.options.length * 48 + 8)
  const above = anchor.top - topEdge - 14
  const below = topEdge + viewportHeight - anchor.bottom - 14
  const placeAbove = below < Math.min(desiredHeight, 144) && above > below
  const height = Math.min(desiredHeight, Math.max(44, placeAbove ? above : below))
  const preferredTop = placeAbove ? anchor.top - height - 6 : anchor.bottom + 6
  const top = Math.max(topEdge + 8, Math.min(preferredTop, topEdge + viewportHeight - height - 8))
  popupStyle.value = { left: `${left}px`, top: `${top}px`, width: `${width}px`, maxHeight: `${height}px` }
}

function scrollActive(): void {
  const item = list.value?.children.item(activeIndex.value) as HTMLElement | null
  const root = list.value
  if (!item || !root) return
  if (item.offsetTop < root.scrollTop) root.scrollTop = item.offsetTop
  else if (item.offsetTop + item.offsetHeight > root.scrollTop + root.clientHeight)
    root.scrollTop = item.offsetTop + item.offsetHeight - root.clientHeight
}

function close(returnFocus = false): void {
  opened.value = false
  if (returnFocus) trigger.value?.focus({ preventScroll: true })
}
function open(): void {
  if (props.disabled || !props.options.length) return
  activeIndex.value = Math.max(0, props.options.findIndex(option => option.value === props.modelValue))
  position()
  opened.value = true
  void nextTick(scrollActive)
}
function move(index: number): void {
  activeIndex.value = Math.max(0, Math.min(index, props.options.length - 1))
  void nextTick(scrollActive)
}
function selectOption(value: string): void {
  if (value !== props.modelValue) emit('update:modelValue', value)
  close(true)
}
function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  if (event.key === 'Tab') { close(); return }
  if (event.key === 'Escape') {
    if (!opened.value) return
    event.preventDefault()
    event.stopPropagation()
    close(true)
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    event.stopPropagation()
    if (!opened.value) { open(); return }
    move(event.key === 'Home' ? 0 : event.key === 'End' ? props.options.length - 1
      : activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1))
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.stopPropagation()
    if (!opened.value) open()
    else if (props.options[activeIndex.value]) selectOption(props.options[activeIndex.value]!.value)
  }
}
function onOutside(event: Event): void {
  if (!opened.value || !(event.target instanceof Node)) return
  if (!trigger.value?.contains(event.target) && !list.value?.contains(event.target)) close()
}
function reposition(): void { if (opened.value) position() }

watch(() => props.disabled, disabled => { if (disabled) close() })
watch(() => props.options, () => { if (opened.value) void nextTick(reposition) })
onMounted(() => {
  document.addEventListener('pointerdown', onOutside, true)
  document.addEventListener('click', onOutside, true)
  window.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', reposition)
  window.visualViewport?.addEventListener('resize', reposition)
  window.visualViewport?.addEventListener('scroll', reposition)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, true)
  document.removeEventListener('click', onOutside, true)
  window.removeEventListener('scroll', reposition, true)
  window.removeEventListener('resize', reposition)
  window.visualViewport?.removeEventListener('resize', reposition)
  window.visualViewport?.removeEventListener('scroll', reposition)
})
</script>

<template>
  <div class="es2-select">
    <button :id="id" ref="trigger" type="button" class="es2-select-trigger" role="combobox"
      aria-haspopup="listbox" :aria-controls="listId" :aria-expanded="opened"
      :aria-activedescendant="opened ? `${id}-option-${activeIndex}` : undefined"
      :aria-label="`${label}: ${selected?.label ?? ''}`" :disabled="disabled" :data-testid="testId"
      @click="opened ? close() : open()" @keydown="onKeydown">
      <span :lang="selected?.lang">{{ selected?.label ?? modelValue }}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <Teleport to="body">
      <ul v-if="opened" :id="listId" ref="list" class="es2-select-listbox" role="listbox"
        :aria-label="label" :style="popupStyle" @mousedown.prevent>
        <li v-for="(option, index) in options" :id="`${id}-option-${index}`" :key="option.value"
          role="option" data-ui-sfx="select" :data-es2-value="option.value" :lang="option.lang"
          :aria-selected="modelValue === option.value" :class="{ 'is-active': activeIndex === index }"
          @pointermove="activeIndex = index" @click.stop="selectOption(option.value)">
          <span>{{ option.label }}</span><span v-if="modelValue === option.value" aria-hidden="true">✓</span>
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<style scoped>
.es2-select { width: 100%; min-width: 0; }
.es2-select-trigger { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; min-width: 0; min-height: 44px; padding: 9px 12px;
  border: 1px solid #bda27b; border-radius: 9px;
  background: linear-gradient(155deg,#2e3c4d,#152232);
  box-shadow: inset 0 1px 0 #ffffff20,0 2px 8px #0005;
  color: #fff0d2; font: 700 13px/1.35 system-ui,sans-serif; text-align: left; cursor: pointer;
  touch-action: manipulation; }
.es2-select-trigger span { min-width: 0; overflow-wrap: anywhere; }
.es2-select-trigger svg { width: 18px; height: 18px; flex: none; color: #e6c48a; }
.es2-select-trigger:hover,.es2-select-trigger[aria-expanded="true"] {
  border-color: #f5d69d; background: #304052; box-shadow: 0 0 0 1px #cfac6955,0 6px 18px #0007; }
.es2-select-trigger:focus-visible { outline: 3px solid #ffe0a0; outline-offset: 2px; }
.es2-select-trigger:disabled { opacity: .5; cursor: not-allowed; }
.es2-select-listbox { position: fixed; z-index: 360; box-sizing: border-box; margin: 0; padding: 5px;
  overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #caa878 #192432;
  list-style: none; background: linear-gradient(155deg,#263648,#111b29);
  border: 1px solid #dabd86; border-radius: 10px; color: #f8e8ce;
  box-shadow: 0 12px 36px #000e,inset 0 1px 0 #ffffff1b; font: 650 13px/1.4 system-ui,sans-serif;
  touch-action: pan-y; }
.es2-select-listbox [role="option"] { display: flex; align-items: center; justify-content: space-between;
  gap: 8px; min-height: 44px; padding: 9px 11px; border-radius: 6px;
  cursor: pointer; overflow-wrap: anywhere; }
.es2-select-listbox [role="option"] span:last-child { flex-shrink: 0; }
.es2-select-listbox [role="option"]:is(:hover,.is-active) { background: #45526a; color: #fff5dc; }
.es2-select-listbox [role="option"][aria-selected="true"] { color: #ffdb95; background: #453c33; }
@media (prefers-reduced-motion: no-preference) {
  .es2-select-trigger { transition: border-color .16s ease,background-color .16s ease; }
}
</style>
