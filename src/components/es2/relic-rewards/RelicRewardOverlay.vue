<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, nextTick, ref, watch } from 'vue'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import Es2Dialog from '../menu/Es2Dialog.vue'
import { RELIC_BY_ID, RELICS, TREASURE_UI, type RelicDefinition, type RelicId } from '../../../game/content/relics/catalog'
import type { TreasureOffer, inventorySnapshot } from '../../../game/content/relics/runtime'

type Inventory = ReturnType<typeof inventorySnapshot>
const props = defineProps<{ active: boolean; offer: TreasureOffer | null; inventory: Inventory }>()
const emit = defineEmits<{
  claim: [chestId: number, id: RelicId]
  reroll: [chestId: number]
  banish: [chestId: number, id: RelicId]
  decline: [chestId: number]
}>()

const busy = ref(false)
const choices = computed<RelicDefinition[]>(() => (props.offer?.options ?? [])
  .flatMap(id => { const relic = RELIC_BY_ID.get(id); return relic ? [relic] : [] }))
const inventoryIds = computed(() => new Set(props.inventory.items.map(item => item.id)))
const canBanish = (id: RelicId): boolean => props.inventory.banishes > 0 && !inventoryIds.value.has(id)
const hasRerollOptions = computed(() => {
  const current = new Set(props.offer?.options ?? [])
  const banned = new Set(props.inventory.banished)
  return RELICS.some(relic => !current.has(relic.id) && !banned.has(relic.id) &&
    (props.inventory.items.find(item => item.id === relic.id)?.stacks ?? 0) < relic.maxStacks &&
    (inventoryIds.value.has(relic.id) || props.inventory.items.length < props.inventory.capacity))
})
const canReroll = computed(() => !!props.offer && props.inventory.rerolls > 0 && hasRerollOptions.value)

watch(() => [props.active, props.offer?.chestId, props.offer?.options.join(','),
  props.inventory.rerolls, props.inventory.banishes, props.inventory.items.length], () => {
  busy.value = false
})

/** Guard against duplicate events in one turn; never soft-lock after a rejected host action. */
function lockTurn(): void {
  busy.value = true
  void nextTick(() => { busy.value = false })
}
function claim(id: RelicId): void {
  if (!props.active || busy.value || !props.offer || !choices.value.some(relic => relic.id === id)) return
  lockTurn()
  emit('claim', props.offer.chestId, id)
}
function reroll(): void {
  if (!props.active || busy.value || !canReroll.value || !props.offer) return
  lockTurn()
  emit('reroll', props.offer.chestId)
}
function banish(id: RelicId): void {
  if (!props.active || busy.value || !props.offer || !choices.value.some(relic => relic.id === id) || !canBanish(id)) return
  lockTurn()
  emit('banish', props.offer.chestId, id)
}
function decline(): void {
  if (!props.active || busy.value || !props.offer) return
  lockTurn()
  emit('decline', props.offer.chestId)
}
function shortcut(event: KeyboardEvent): void {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
  const index = ['1', '2', '3'].indexOf(event.key)
  if (index < 0 || index >= choices.value.length) return
  event.preventDefault()
  claim(choices.value[index]!.id)
}
</script>

<template>
  <Es2Dialog :active="active && !!offer" :title="t('遠古遺物寶箱')" :subtitle="t('選擇一項遺物，詛咒也會伴隨戰利品')"
    wide dismissible @cancel="decline" @shortcut="shortcut">
    <section class="relic-rewards" :style="{ '--relic-touch-size': TREASURE_UI.touchMinSizePx + 'px' }">
      <header class="relic-rewards__status" aria-live="polite">
        <span data-relic-inventory>{{ t("遺物") }} {{ inventory.items.length }}/{{ inventory.capacity }}</span>
        <span data-relic-rerolls>{{ t("重抽") }} {{ inventory.rerolls }}</span>
        <span data-relic-banishes>{{ t("放逐") }} {{ inventory.banishes }}</span>
      </header>
      <div v-if="choices.length" class="relic-rewards__grid" role="group" :aria-label="t('遺物選項')">
        <article v-for="(relic, index) in choices" :key="relic.id" class="relic-rewards__card"
          :class="['relic-rewards__card--' + relic.rarity, { 'relic-rewards__card--cursed': relic.cursed }]">
          <button type="button" class="relic-rewards__claim" :data-relic-claim="relic.id" :disabled="busy"
            :aria-label="t('領取 {title}，{description}', { title: t(relic.title), description: t(relic.description) })" @click="claim(relic.id)">
            <span class="relic-rewards__icon" aria-hidden="true"><img :src="relic.cursed ? WORLD_ART.ui['treasure-cursed'] : relic.rarity === 'legendary' ? WORLD_ART.ui['treasure-legendary'] : relic.rarity === 'rare' || relic.rarity === 'epic' ? WORLD_ART.ui['treasure-rare'] : WORLD_ART.ui['treasure-common']" alt="" decoding="async" /></span>
            <span class="relic-rewards__rarity">{{ t({ common: '普通', rare: '稀有', epic: '史詩', legendary: '傳說' }[relic.rarity]) }} · {{ index + 1 }}</span>
            <strong>{{ t(relic.title) }}</strong>
            <span class="relic-rewards__description">{{ t(relic.description) }}</span>
            <span v-if="relic.cursed" class="relic-rewards__curse">{{ t("⚠ 詛咒遺物：包含負面代價") }}</span>
            <span class="relic-rewards__obtain">{{ t("領取遺物") }}</span>
          </button>
          <button type="button" class="relic-rewards__banish" :data-relic-banish="relic.id"
            :disabled="busy || !canBanish(relic.id)" :aria-label="t('放逐 {title}', { title: t(relic.title) })" @click="banish(relic.id)">
            {{ t("放逐此遺物") }}
          </button>
        </article>
      </div>
      <p v-else data-relic-empty role="status">{{ t("目前沒有可領取的遺物，可關閉寶箱繼續遊戲。") }}</p>
      <footer class="relic-rewards__actions">
        <button type="button" data-relic-reroll :disabled="busy || !canReroll" @click="reroll">{{ t('重抽選項（') }}{{ inventory.rerolls }}{{ t('）') }}</button>
        <button type="button" :disabled="busy" @click="decline">{{ t("放棄寶箱") }}</button>
      </footer>
      <p class="relic-rewards__hint">{{ t("按 1–3 選取 · Tab 移動焦點 · Esc 關閉") }}</p>
    </section>
  </Es2Dialog>
</template>

<style scoped>
.relic-rewards { color: #f2edf8; padding: 0.4rem 0.15rem; }
.relic-rewards__status, .relic-rewards__actions { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; }
.relic-rewards__status { margin-bottom: 1rem; font-size: 0.88rem; color: #e6d3b4; }
.relic-rewards__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.9rem; }
.relic-rewards__card { min-width: 0; display: flex; flex-direction: column; border: 1px solid #7b879b; border-radius: 12px; background: linear-gradient(145deg, #20263a, #131522); }
.relic-rewards__card--rare { border-color: #55b4ff; }
.relic-rewards__card--epic { border-color: #c895ff; }
.relic-rewards__card--legendary { border-color: #ffca69; }
.relic-rewards__card--cursed { background: linear-gradient(150deg, #3d1b3e, #18131f); }
.relic-rewards__claim, .relic-rewards__banish, .relic-rewards__actions button { min-height: var(--relic-touch-size); border: 0; color: inherit; cursor: pointer; }
.relic-rewards__claim { width: 100%; display: flex; flex: 1; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.9rem; text-align: center; background: transparent; }
.relic-rewards__claim:focus-visible, .relic-rewards__banish:focus-visible, .relic-rewards__actions button:focus-visible { outline: 3px solid #fff1a5; outline-offset: 3px; }
.relic-rewards__icon { font-size: 2.5rem; }
.relic-rewards__icon img{display:block;width:64px;height:64px;object-fit:contain}
.relic-rewards__rarity { color: #dbcfaa; font-size: 0.85rem; }
.relic-rewards__description { font-size: 0.9rem; line-height: 1.45; }
.relic-rewards__curse { color: #ffb5b5; font-size: 0.8rem; }
.relic-rewards__obtain { margin-top: auto; font-weight: 700; color: #f9d48a; }
.relic-rewards__banish { margin: 0 0.55rem 0.55rem; border: 1px solid #a87993; border-radius: 8px; background: #302334; }
.relic-rewards__actions { justify-content: center; margin-top: 1rem; }
.relic-rewards__actions button { border-radius: 8px; padding: 0.6rem 1rem; background: #40364c; }
button:disabled { opacity: 0.45; cursor: not-allowed; }
.relic-rewards__hint { text-align: center; color: #c6bdcb; font-size: 0.82rem; margin: 0.9rem 0 0; }
@media (max-width: 640px) {
  .relic-rewards__grid { grid-template-columns: 1fr; gap: .5rem; }
  .relic-rewards__card { display:grid;grid-template-columns:minmax(0,1fr) 82px;align-items:center; }
  .relic-rewards__claim { display:grid;grid-template-columns:54px minmax(0,1fr);align-items:center;gap:.2rem .5rem;text-align:start;padding:.5rem; }
  .relic-rewards__icon { grid-row:1/span 6;grid-column:1;align-self:center; }
  .relic-rewards__icon img { width:50px;height:50px; }
  .relic-rewards__claim>:not(.relic-rewards__icon) { grid-column:2;min-width:0; }
  .relic-rewards__rarity { font-size:.75rem; }
  .relic-rewards__description { font-size:.75rem;line-height:1.3;overflow-wrap:anywhere; }
  .relic-rewards__curse { font-size:.72rem; }
  .relic-rewards__banish { min-height:44px;margin:0 .4rem;padding:.25rem;font-size:.75rem; }
  .relic-rewards__status { margin-bottom:.5rem;gap:.5rem; }
  .relic-rewards__actions { margin-top:.5rem;gap:.5rem; }
  .relic-rewards__hint { margin:.5rem 0 0; }
}
@media (orientation:landscape) and (max-height:520px) {
  .relic-rewards { padding:0; }
  .relic-rewards__grid { grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem; }
  .relic-rewards__card { display:flex; }
  .relic-rewards__claim { display:flex;flex-direction:column;text-align:center;gap:3px;padding:.4rem; }
  .relic-rewards__icon img { width:40px;height:40px; }
  .relic-rewards__rarity,.relic-rewards__description,.relic-rewards__curse { font-size:.7rem;line-height:1.2; }
  .relic-rewards__banish { width:calc(100% - .8rem);margin:.3rem .4rem; }
  .relic-rewards__status { margin-bottom:.4rem; }
  .relic-rewards__actions { margin-top:.4rem; }
  .relic-rewards__hint { margin:.3rem 0 0;font-size:.7rem; }
}
@media (prefers-reduced-motion: reduce) { .relic-rewards * { transition: none !important; animation: none !important; } }
</style>
