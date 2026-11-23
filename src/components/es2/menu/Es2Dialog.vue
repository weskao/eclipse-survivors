<script setup lang="ts">
import { t } from '../../../i18n'
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
const props = withDefaults(defineProps<{
  active: boolean; title: string; subtitle?: string; dismissible?: boolean
  wide?: boolean; variant?: 'default' | 'choice'; tone?: 'neutral' | 'legendary' | 'victory' | 'defeat'
}>(), { dismissible: true, wide: false, variant: 'default', tone: 'neutral' })
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
// Choice cards accept pointer clicks and 1–9 shortcuts only; Space/Enter must
// not synthesize a native click on whichever button happens to have focus.
function suppressChoiceActivation(event: KeyboardEvent): boolean {
  if (!props.active || props.variant !== 'choice' ||
      !(event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter' ||
        event.key === ' ' || event.key === 'Enter')) return false
  event.preventDefault()
  event.stopPropagation()
  return true
}
function onKeyup(event: KeyboardEvent): void { suppressChoiceActivation(event) }
function onKeydown(event: KeyboardEvent): void {
  if (!props.active || suppressChoiceActivation(event)) return
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
  // Horizontal arrows never navigate dialog choices; editable controls keep native behavior.
  if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
    !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable))) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  // The engine listens on window; stop modal keystrokes at document.
  event.stopPropagation()
  emit('shortcut', event)
}
function onOutside(): void { if (props.dismissible) emit('cancel') }
watch(() => props.active, active => { if (active) void focusIn(); else restoreFocus() }, { flush: 'post' })
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('keyup', onKeyup)
  if (props.active) void focusIn()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('keyup', onKeyup)
  restoreFocus()
})
</script>
<template>
  <Teleport to="body">
    <div v-if="active" class="es2-backdrop" @pointerdown.self="onOutside" @click.stop>
      <section ref="dialog" class="es2-dialog" :class="[`es2-tone-${tone}`, { 'es2-dialog-wide': wide, 'es2-dialog-choice': variant === 'choice' }]"
        role="dialog" aria-modal="true" :aria-labelledby="headingId" tabindex="-1" @pointerdown.stop>
        <header class="es2-dialog-header">
          <div><span class="es2-eyebrow">✦ ECLIPSE SURVIVORS ✦</span><h2 :id="headingId">{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div>
          <div class="es2-dialog-header-actions"><slot name="header-actions" /><button v-if="dismissible" type="button" class="es2-close" :aria-label="t('關閉對話視窗')" @click="emit('cancel')">×</button></div>
        </header>
        <div class="es2-dialog-body"><slot /></div>
        <footer v-if="$slots.actions" class="es2-dialog-actions"><slot name="actions" /></footer>
      </section>
    </div>
  </Teleport>
</template>
