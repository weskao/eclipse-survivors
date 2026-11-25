<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, ref, watch } from 'vue'
import Es2Dialog from './Es2Dialog.vue'
import Es2ChoiceCards from './Es2ChoiceCards.vue'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import { CHOICE_ARM_MS, shortcutIndex } from './model'
import type { ChoiceKind, MenuChoice } from './model'
const props = defineProps<{ active: boolean; kind: ChoiceKind; items: readonly MenuChoice[]; still?: boolean }>()
const emit = defineEmits<{ choose: [id: string]; cancel: []; settings: [] }>()
const selecting = ref(false)
const revealSkipped = ref(false)
const uniqueItems = computed(() => props.items.filter((item, i, all) => all.findIndex(other => other.id === item.id) === i))
const reveal = computed(() => !props.active || props.still || revealSkipped.value ? undefined : props.kind === 'treasure' ? 'treasure' : props.kind === 'evolution' || uniqueItems.value.some(item => item.evolution && !item.disabled) ? 'evolution' : undefined)
const revealTier = computed(() => uniqueItems.value.some(i => i.cursed) ? 'cursed' : uniqueItems.value.some(i => i.rarity === 'legendary') ? 'legendary' : uniqueItems.value.some(i => i.rarity === 'epic') ? 'epic' : uniqueItems.value.some(i => i.rarity === 'rare') ? 'rare' : 'common')
const chestArt = computed(() => WORLD_ART.ui[revealTier.value === 'epic' ? 'treasure-rare' : ('treasure-' + revealTier.value) as keyof typeof WORLD_ART.ui])
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
    <template #header-actions><button v-if="kind === 'level'" type="button" class="es2-secondary es2-dialog-settings" @click="emit('settings')">{{ t("⚙ 遊戲設定") }}</button></template>
    <div class="es2-selection-scene" :class="{ 'es2-still': still }" :data-es3-reveal="reveal" @pointerdown.capture="pointerdown">
      <div v-if="reveal === 'treasure'" class="es3-chest-seal" :data-tier="revealTier" aria-hidden="true"><img :src="chestArt" data-es3-chest-reveal alt="" /></div>
      <Es2ChoiceCards :kind="kind" :items="uniqueItems" :disabled="selecting" :label="t(captions[kind])" @choose="tap" />
      <button v-if="reveal" type="button" class="es2-secondary es3-skip-reveal" data-es3-skip-reveal @click="revealSkipped = true">{{ t('跳過揭曉動畫') }}</button>
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
.es3-chest-seal { --seal-glow:#e2b779; display:grid; place-items:center; height:clamp(40px,8vh,74px); margin:0 auto .35rem; pointer-events:none; }
.es3-chest-seal[data-tier="rare"] { --seal-glow:#8fc7ff; }
.es3-chest-seal[data-tier="epic"] { --seal-glow:#c5a1ff; }
.es3-chest-seal[data-tier="legendary"] { --seal-glow:#ffdc88; }
.es3-chest-seal[data-tier="cursed"] { --seal-glow:#f38cb9; }
.es3-chest-seal img { height:100%; max-height:74px; max-width:100%; aspect-ratio:1; object-fit:contain; filter:drop-shadow(0 0 10px var(--seal-glow)); animation:es3-seal .55s cubic-bezier(.16,1,.3,1) both; }
@keyframes es3-seal { from { opacity:.2; transform:translateY(-8px) scale(.82); } to { opacity:1; transform:none; } }
@media (max-height:480px) { .es3-chest-seal { height:32px; margin-bottom:2px; } }
@media (prefers-reduced-motion: reduce) { .es3-chest-seal img { animation:none; } }
:global([data-es2-reduce-motion="true"]) .es3-chest-seal img, :global([data-es2-reduce-flashing="true"]) .es3-chest-seal img { animation:none; filter:none; }
.es3-skip-reveal { display: block; margin: .5rem auto 0; }
@keyframes es3-reveal { from { opacity: .55; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { [data-es3-reveal] :deep(.es2-choice) { animation: none; } .es3-skip-reveal { display: none; } }
:global([data-es2-reduce-motion="true"]) [data-es3-reveal] :deep(.es2-choice), :global([data-es2-reduce-flashing="true"]) [data-es3-reveal] :deep(.es2-choice) { animation: none; }
</style>
