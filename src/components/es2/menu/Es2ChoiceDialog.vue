<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, ref, watch } from 'vue'
import Es2Dialog from './Es2Dialog.vue'
import Es2ChoiceCards from './Es2ChoiceCards.vue'
import { shortcutIndex } from './model'
import type { ChoiceKind, MenuChoice } from './model'
const props = defineProps<{ active: boolean; kind: ChoiceKind; items: readonly MenuChoice[]; still?: boolean }>()
const emit = defineEmits<{ choose: [id: string]; cancel: []; settings: [] }>()
const selecting = ref(false)
const uniqueItems = computed(() => props.items.filter((item, i, all) => all.findIndex(other => other.id === item.id) === i))
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
watch(() => [props.active, uniqueItems.value.map(item => item.id).join('|'), props.kind], () => { selecting.value = false })
</script>
<template>
  <Es2Dialog :active="active" :title="t(titles[kind])" :subtitle="t(captions[kind])" :dismissible="kind !== 'level'"
    wide variant="choice" :tone="kind === 'evolution' ? 'legendary' : 'neutral'" @cancel="emit('cancel')" @shortcut="shortcut">
    <template #header-actions><button v-if="kind === 'level'" type="button" class="es2-secondary es2-dialog-settings" @click="emit('settings')">{{ t("⚙ 遊戲設定") }}</button></template>
    <div class="es2-selection-scene" :class="{ 'es2-still': still }">
      <Es2ChoiceCards :items="uniqueItems" :disabled="selecting" :label="t(captions[kind])" @choose="choose" />
      <p class="es2-hint">{{ t(uniqueItems.length ? '點選卡牌或按 1–9 選擇 · 方向鍵切換焦點 · Enter 確認' : '目前沒有可用的選項') }}</p>
    </div>
  </Es2Dialog>
</template>
