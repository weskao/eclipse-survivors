<script setup lang="ts">
import { t } from '../../../i18n'
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
const props = withDefaults(defineProps<{
  active: boolean; title: string; subtitle?: string; dismissible?: boolean
  wide?: boolean; tone?: 'neutral' | 'legendary' | 'victory' | 'defeat'
}>(), { dismissible: true, wide: false, tone: 'neutral' })
const emit = defineEmits<{ cancel: []; shortcut: [event: KeyboardEvent] }>()
const headingId = useId()
const dialog = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null
const focusable = (): HTMLElement[] => Array.from(dialog.value?.querySelectorAll<HTMLElement>(
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
) ?? []).filter(element => element.getAttribute('aria-hidden') !== 'true')
async function focusIn(): Promise<void> {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  if (props.active) (focusable()[0] ?? dialog.value)?.focus()
}
function restoreFocus(): void {
  if (previousFocus?.isConnected) previousFocus.focus()
  previousFocus = null
}
function onKeydown(event: KeyboardEvent): void {
  if (!props.active) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (props.dismissible) emit('cancel')
    return
  }
  if (event.key === 'Tab') {
    const controls = focusable()
    if (!controls.length) { event.preventDefault(); dialog.value?.focus() }
    else {
      const first = controls[0]!
      const last = controls[controls.length - 1]!
      if (event.shiftKey && (document.activeElement === first || !dialog.value?.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.value?.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    event.stopPropagation()
    return
  }
  // The engine listens on window; stop modal keystrokes at document.
  event.stopPropagation()
  emit('shortcut', event)
}
function onOutside(): void { if (props.dismissible) emit('cancel') }
watch(() => props.active, active => { if (active) void focusIn(); else restoreFocus() }, { flush: 'post' })
onMounted(() => { document.addEventListener('keydown', onKeydown); if (props.active) void focusIn() })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKeydown); restoreFocus() })
</script>
<template>
  <Teleport to="body">
    <div v-if="active" class="es2-backdrop" @pointerdown.self="onOutside" @click.stop>
      <section ref="dialog" class="es2-dialog" :class="[`es2-tone-${tone}`, { 'es2-dialog-wide': wide }]"
        role="dialog" aria-modal="true" :aria-labelledby="headingId" tabindex="-1" @pointerdown.stop>
        <header class="es2-dialog-header">
          <div><span class="es2-eyebrow">✦ ECLIPSE SURVIVORS ✦</span><h2 :id="headingId">{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div>
          <button v-if="dismissible" type="button" class="es2-close" :aria-label="t("關閉對話視窗")" @click="emit('cancel')">×</button>
        </header>
        <div class="es2-dialog-body"><slot /></div>
        <footer v-if="$slots.actions" class="es2-dialog-actions"><slot name="actions" /></footer>
      </section>
    </div>
  </Teleport>
</template>
