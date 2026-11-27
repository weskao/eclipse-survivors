<script setup lang="ts">
import { t, currentLocale } from '../../../i18n'
import { computed, ref, watch } from 'vue'
import Es2Dialog from './Es2Dialog.vue'
import Es2ChoiceCards from './Es2ChoiceCards.vue'
import { CHOICE_ARM_MS, shortcutIndex } from './model'
import type { ChoiceKind, MenuChoice } from './model'
import { treasureArtUrl } from '../../../game/render/es2/production-world'
import type { TreasureTier } from '../../../game/types'
const props = defineProps<{ active: boolean; kind: ChoiceKind; items: readonly MenuChoice[]; still?: boolean; tier?: TreasureTier; skipReveal?: boolean; chestId?: number; rerolls?: number }>()
const emit = defineEmits<{ choose: [id: string]; cancel: []; settings: []; skipReveal: [skip: boolean]; reroll: [chestId:number, expectedRerolls:number] }>()
const selecting = ref(false)
const revealSkipped = ref(false)
const skipChecked = ref(!!props.skipReveal)
watch(() => props.skipReveal, value => { skipChecked.value = !!value })
const uniqueItems = computed(() => props.items.filter((item, i, all) => all.findIndex(other => other.id === item.id) === i))
const revealKind = computed(() => !props.active || props.still ? undefined : props.kind === 'treasure' ? 'treasure' : props.kind === 'evolution' || uniqueItems.value.some(item => item.evolution && !item.disabled) ? 'evolution' : undefined)
const reveal = computed(() => revealSkipped.value ? undefined : revealKind.value)
const revealTier = computed<TreasureTier>(() => props.tier ?? (uniqueItems.value.some(item => item.cursed) ? 'cursed'
  : (['legendary', 'epic', 'rare'] as const).find(rarity => uniqueItems.value.some(item => item.rarity === rarity)) ?? 'common'))
const chestArt = computed(() => treasureArtUrl(revealTier.value))
const titles: Record<ChoiceKind, string> = { level: '獲得新的命運刻印', evolution: '命運覺醒 · 神兵進化', treasure: '打開遠古秘藏' }
const captions: Record<ChoiceKind, string> = { level: '選擇一項能力，繼續你的遠征', evolution: '一份傳說之力，改變戰鬥之道', treasure: '選擇並領取一項戰利品' }
function choose(id: string): void {
  if (!props.active || selecting.value || !uniqueItems.value.some(item => item.id === id && !item.disabled)) return
  selecting.value = true
  emit('choose', id)
}
// Checking skips the running reveal now; unchecking only affects the next one (never replays this one).
function toggleSkip(): void {
  skipChecked.value = !skipChecked.value
  if (skipChecked.value) revealSkipped.value = true
  emit('skipReveal', skipChecked.value)
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
  revealSkipped.value = skipChecked.value
  shownAt = performance.now()
  earlyTap = false
}, { immediate: true })
</script>
<template>
  <Es2Dialog :active="active" :title="t(titles[kind])" :subtitle="t(captions[kind])" :dismissible="kind !== 'level'"
    wide variant="choice" :tone="kind === 'evolution' ? 'legendary' : 'neutral'" @cancel="emit('cancel')" @shortcut="shortcut">
    <template #header-actions><button v-if="kind==='treasure' && chestId!==undefined && rerolls!==undefined" type="button" class="es2-secondary es2-dialog-settings" data-es4-reroll :disabled="!active || selecting || rerolls<=0" @click="emit('reroll',chestId,rerolls)">{{ currentLocale==='en' ? 'Reroll' : '重新抽選' }} · {{ rerolls }}</button><button v-if="kind === 'level'" type="button" class="es2-secondary es2-dialog-settings" @click="emit('settings')">{{ t("⚙ 遊戲設定") }}</button></template>
    <div class="es2-selection-scene" :class="{ 'es2-still': still }" :data-es3-reveal="reveal" :data-tier="kind === 'treasure' ? tier : undefined" @pointerdown.capture="pointerdown">
      <div v-if="reveal === 'treasure'" class="es3-chest-open" :data-tier="revealTier" aria-hidden="true">
        <span class="es3-chest-open__burst"></span><img :src="chestArt" data-es3-chest-reveal alt="" decoding="async" draggable="false" />
      </div>
      <Es2ChoiceCards :kind="kind" :items="uniqueItems" :disabled="selecting" :label="t(captions[kind])" @choose="tap" />
      <p class="es2-hint"><span class="es2-hint-text">{{ t(uniqueItems.length ? '點選卡牌或按 1–9 選擇' : '目前沒有可用的選項') }}</span><button
        v-if="revealKind" type="button" role="checkbox" class="es3-skip-reveal" data-es3-skip-reveal :aria-checked="skipChecked"
        @click="toggleSkip"><span class="es3-skip-reveal__box" aria-hidden="true"></span>{{ t('跳過揭曉動畫') }}</button></p>
    </div>
  </Es2Dialog>
</template>

<style scoped>
[data-es3-reveal] :deep(.es2-choice) { animation: es3-reveal 220ms ease-out both; }
[data-es3-reveal] :deep(.es2-rarity-rare) { animation-duration: 300ms; }
[data-es3-reveal] :deep(.es2-rarity-epic) { animation-duration: 420ms; }
[data-es3-reveal] :deep(.es2-rarity-legendary) { animation-duration: 550ms; }
[data-es3-reveal="evolution"] :deep(.es2-choice-evolution) { animation-duration: 650ms; }
@keyframes es3-reveal { from { opacity: .55; translate:0 8px; scale:.985; } to { opacity: 1; translate:0 0; scale:1; } }

/* Treasure: the tier's own world chest pops in, rattles, bursts open, then the cards rise out of it. */
.es2-selection-scene { position: relative; }
.es3-chest-open { --es3-chest-glow:#e2b779; position:absolute; inset:0; z-index:2; display:grid; place-items:center; pointer-events:none; }
.es3-chest-open[data-tier="rare"] { --es3-chest-glow:#8fc7ff; }
.es3-chest-open[data-tier="epic"] { --es3-chest-glow:#c5a1ff; }
.es3-chest-open[data-tier="legendary"] { --es3-chest-glow:#ffdc88; }
.es3-chest-open[data-tier="cursed"] { --es3-chest-glow:#f38cb9; }
.es3-chest-open > * { grid-area:1 / 1; }
.es3-chest-open img { width:clamp(88px,24vmin,176px); height:auto; object-fit:contain; filter:drop-shadow(0 0 14px var(--es3-chest-glow)); animation:es3-chest-open 900ms cubic-bezier(.3,.7,.4,1) both; }
.es3-chest-open__burst { width:clamp(120px,34vmin,260px); aspect-ratio:1; border-radius:50%; background:radial-gradient(circle,color-mix(in srgb,var(--es3-chest-glow) 85%,#fff) 0 18%,color-mix(in srgb,var(--es3-chest-glow) 45%,transparent) 42%,transparent 70%); opacity:0; animation:es3-chest-burst 900ms ease-out both; }
[data-es3-reveal="treasure"] :deep(.es2-choice) { animation:es3-chest-cards 360ms 600ms ease-out both; }
[data-es3-reveal="treasure"] :deep(.es2-choice:nth-child(2)) { animation-delay:660ms; }
[data-es3-reveal="treasure"] :deep(.es2-choice:nth-child(n+3)) { animation-delay:720ms; }
@keyframes es3-chest-open {
  0% { opacity:0; transform:translateY(14px) scale(.6); }
  18% { opacity:1; transform:translateY(0) scale(1.05); }
  30% { transform:scale(1) rotate(-4deg); }
  40% { transform:scale(1) rotate(4deg); }
  50% { transform:scale(1) rotate(-3deg); }
  58% { transform:scale(1) rotate(0); filter:drop-shadow(0 0 14px var(--es3-chest-glow)) brightness(1); }
  72% { opacity:1; transform:scale(1.12); filter:drop-shadow(0 0 26px var(--es3-chest-glow)) brightness(1.7); }
  100% { opacity:0; transform:translateY(-10px) scale(1.35); filter:drop-shadow(0 0 30px var(--es3-chest-glow)) brightness(2); }
}
@keyframes es3-chest-burst { 0%,58% { opacity:0; transform:scale(.2); } 74% { opacity:.9; } 100% { opacity:0; transform:scale(2.4); } }
@keyframes es3-chest-cards { from { opacity:0; translate:0 18px; scale:.94; } to { opacity:1; translate:0 0; scale:1; } }

/* Remembered skip checkbox, in the shared hint row under the cards. */
.es2-hint:has(.es3-skip-reveal) { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:4px 14px; }
button.es3-skip-reveal { appearance:none; display:inline-flex; align-items:center; gap:8px; min-height:44px; padding:0 14px; border:1px solid #e2b77955; border-radius:999px; background:#0d1220cc; box-shadow:none; color:#f1e3c8; font:600 .8125rem/1.2 system-ui,sans-serif; cursor:pointer; }
.es3-skip-reveal__box { position:relative; flex:0 0 18px; width:18px; height:18px; box-sizing:border-box; border:2px solid #c9a46a; border-radius:4px; background:#101a27; }
.es3-skip-reveal[aria-checked="true"] .es3-skip-reveal__box { border-color:#ffe6b0; background:linear-gradient(145deg,#fff1c9,#d7b47b 50%,#967044); }
.es3-skip-reveal[aria-checked="true"] .es3-skip-reveal__box::after { content:''; position:absolute; left:4px; top:0; width:5px; height:10px; border:solid #1a1208; border-width:0 2px 2px 0; transform:rotate(45deg); }
.es3-skip-reveal:focus-visible { outline:3px solid #ffe3a6; outline-offset:2px; }
@media (hover:hover) and (pointer:fine) { .es3-skip-reveal:hover { border-color:#e2b779; } }
/* Short touch landscape hides the hint text (menu.css); keep the checkbox reachable. */
@media (orientation:landscape) and (max-height:520px) and (pointer:coarse) {
  .es2-selection-scene .es2-hint:has(.es3-skip-reveal) { display:flex; margin:2px 0 0; }
  .es2-hint:has(.es3-skip-reveal) .es2-hint-text { display:none; }
}

@media (prefers-reduced-motion: reduce) { [data-es3-reveal] :deep(.es2-choice) { animation: none; } .es3-chest-open, .es3-skip-reveal { display: none; } }
:global([data-es2-reduce-motion="true"] [data-es3-reveal] .es2-choice), :global([data-es2-reduce-flashing="true"] [data-es3-reveal] .es2-choice) { animation: none; }
:global([data-es2-reduce-motion="true"] .es3-chest-open), :global([data-es2-reduce-flashing="true"] .es3-chest-open) { display: none; }
</style>
