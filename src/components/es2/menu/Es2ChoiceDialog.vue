<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, ref, watch } from 'vue'
import Es2Dialog from './Es2Dialog.vue'
import Es2ChoiceCards from './Es2ChoiceCards.vue'
import { CHOICE_ARM_MS, shortcutIndex } from './model'
import type { ChoiceKind, MenuChoice } from './model'
const props = defineProps<{ active: boolean; kind: ChoiceKind; items: readonly MenuChoice[]; still?: boolean; tier?: import('../../../game/types').TreasureTier }>()
const emit = defineEmits<{ choose: [id: string]; cancel: []; settings: [] }>()
const selecting = ref(false)
const revealSkipped = ref(false)
const uniqueItems = computed(() => props.items.filter((item, i, all) => all.findIndex(other => other.id === item.id) === i))
const reveal = computed(() => !props.active || props.still || revealSkipped.value ? undefined : props.kind === 'treasure' ? 'treasure' : props.kind === 'evolution' || uniqueItems.value.some(item => item.evolution && !item.disabled) ? 'evolution' : undefined)
const titles: Record<ChoiceKind, string> = { level: '獲得新的命運刻印', evolution: '命運覺醒 · 神兵進化', treasure: '打開遠古秘藏' }
const captions: Record<ChoiceKind, string> = { level: '選擇一項能力，繼續你的遠征', evolution: '一份傳說之力，改變戰鬥之道', treasure: '選擇並領取一項戰利品' }
function choose(id: string): void {
  if (!props.active || selecting.value || !uniqueItems.value.some(item => item.id === id && !item.disabled)) return
  selecting.value = true
  emit('choose', id)
}
function shortcut(event: KeyboardEvent): void {
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
  const index = shortcutIndex(event, uniqueItems.value.length)
  if (index < 0) return
  event.preventDefault()
  const item = uniqueItems.value[index]
  if (item) choose(item.id)
}
// Pointer only: a thumb aimed at joystick/dash/special as the cards pop in must not pick one.
let shownAt = -Infinity
let earlyTap = false
function pointerdown(): void { earlyTap = performance.now() - shownAt < CHOICE_ARM_MS }
function tap(id: string): void {
  if (earlyTap) { earlyTap = false; return }
  choose(id)
}
watch(() => [props.active, uniqueItems.value.map(item => item.id).join('|'), props.kind], () => {
  selecting.value = false
  revealSkipped.value = false
  shownAt = performance.now()
  earlyTap = false
}, { immediate: true })
</script>
<template>
  <Es2Dialog :active="active" :title="t(titles[kind])" :subtitle="t(captions[kind])" :dismissible="kind !== 'level'"
    wide variant="choice" :tone="kind === 'evolution' ? 'legendary' : 'neutral'" @cancel="emit('cancel')" @shortcut="shortcut">
    <template #header-actions><button v-if="kind === 'level'" type="button" class="es2-secondary es2-dialog-settings" @click="emit('settings')">{{ t("⚙ 遊戲設定") }}</button><button v-if="reveal" type="button" class="es2-close es3-skip-reveal" data-es3-skip-reveal :aria-label="t('跳過揭曉動畫')" :title="t('跳過揭曉動畫')" @click="revealSkipped = true">»</button></template>
    <div class="es2-selection-scene" :class="{ 'es2-still': still }" :data-es3-reveal="reveal" :data-tier="kind === 'treasure' ? tier : undefined" @pointerdown.capture="pointerdown">
      <Es2ChoiceCards :kind="kind" :items="uniqueItems" :disabled="selecting" :label="t(captions[kind])" @choose="tap" />
      <p class="es2-hint">{{ t(uniqueItems.length ? '點選卡牌或按 1–9 選擇' : '目前沒有可用的選項') }}</p>
    </div>
  </Es2Dialog>
</template>

<style scoped>
[data-es3-reveal] :deep(.es2-choice) { animation: es3-reveal 220ms ease-out both; }
[data-es3-reveal] :deep(.es2-rarity-rare) { animation-duration: 300ms; }
[data-es3-reveal] :deep(.es2-rarity-epic) { animation-duration: 420ms; }
[data-es3-reveal] :deep(.es2-rarity-legendary) { animation-duration: 550ms; }
[data-es3-reveal="evolution"] :deep(.es2-choice-evolution) { animation-duration: 650ms; }
.es3-skip-reveal { font-size:1.35rem!important; }
@keyframes es3-reveal { from { opacity: .55; translate:0 8px; scale:.985; } to { opacity: 1; translate:0 0; scale:1; } }
@media (prefers-reduced-motion: reduce) { [data-es3-reveal] :deep(.es2-choice) { animation: none; } .es3-skip-reveal { display: none; } }
:global([data-es2-reduce-motion="true"] [data-es3-reveal] .es2-choice), :global([data-es2-reduce-flashing="true"] [data-es3-reveal] .es2-choice) { animation: none; }
</style>
