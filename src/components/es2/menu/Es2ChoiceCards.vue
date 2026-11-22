<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { MenuChoice } from './model'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import { nextIndex } from './model'
const props = withDefaults(defineProps<{
  items: readonly MenuChoice[]; selectedId?: string; disabled?: boolean; label?: string
}>(), { disabled: false, label: '可選擇項目' })
const emit = defineEmits<{ choose: [id: string] }>()
const focused = ref<string | null>(null)
const container = ref<HTMLElement | null>(null)
const rarityIcon = (rarity?: string) => rarity === 'legendary' ? WORLD_ART.ui['rarity-legendary'] : rarity === 'rare' || rarity === 'epic' ? WORLD_ART.ui['rarity-rare'] : WORLD_ART.ui['rarity-common']
function select(item: MenuChoice): void {
  if (!props.disabled && !item.disabled) emit('choose', item.id)
}
async function navigate(event: KeyboardEvent, id: string): Promise<void> {
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
    : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  if (!direction) return
  const enabled = props.items.filter(item => !item.disabled)
  if (!enabled.length) return
  event.preventDefault()
  const current = enabled.findIndex(item => item.id === id)
  const index = nextIndex(current < 0 ? 0 : current, direction, enabled.length)
  const next = enabled[index]
  if (!next) return
  focused.value = next.id
  await nextTick()
  const buttons = container.value?.querySelectorAll<HTMLButtonElement>('button[data-choice]')
  Array.from(buttons ?? []).find(button => button.dataset.choice === next.id)?.focus()
}
</script>
<template>
  <div ref="container" class="es2-choice-grid" role="group" :aria-label="label">
    <button v-for="(item, index) in items" :key="item.id" type="button" class="es2-choice"
      :class="[`es2-rarity-${item.rarity ?? 'common'}`, { 'es2-choice-selected': selectedId === item.id, 'es2-choice-focused': focused === item.id, 'es2-choice-evolution': item.evolution }]"
      :data-choice="item.id" :aria-pressed="selectedId === item.id" :disabled="disabled || item.disabled" @focus="focused = item.id"
      @keydown="navigate($event, item.id)" @click="select(item)">
      <div class="es2-card-art">
        <picture v-if="item.imageSrc">
          <source v-if="item.reducedMotionSrc" media="(prefers-reduced-motion: reduce)" :srcset="item.reducedMotionSrc" />
          <img :src="item.imageSrc" :alt="item.title + ' 插畫'" loading="lazy" decoding="async" draggable="false" />
        </picture>
        <span v-else class="es2-card-glyph" aria-hidden="true">{{ item.icon ?? '✦' }}</span>
        <span v-if="item.evolution" class="es2-evolution-sigil" aria-hidden="true">✧</span>
      </div>
      <span class="es2-card-meta"><img class="es2-rarity-icon" :src="rarityIcon(item.rarity)" data-es2-rarity-icon alt="" loading="lazy" decoding="async" /><span class="es2-rarity-label">{{ item.evolution ? '究極進化' : item.rarity === 'legendary' ? '傳說' : item.rarity === 'rare' ? '稀有' : '普通' }}</span><span v-if="index < 9" class="es2-key-hint" aria-hidden="true">{{ index + 1 }}</span></span>
      <strong class="es2-card-name">{{ item.title }}</strong>
      <span v-if="item.level !== undefined" class="es2-card-level">Lv.{{ item.level }} <template v-if="item.maxLevel">→ {{ Math.min(item.maxLevel, item.level + 1) }} / {{ item.maxLevel }}</template></span>
      <small v-if="item.description" class="es2-card-description">{{ item.description }}</small>
      <small v-if="item.requirements" class="es2-card-requirements">◈ {{ item.requirements }}</small>
      <span v-if="selectedId === item.id" class="es2-card-selected-text">✓ 已選擇</span>
    </button>
  </div>
</template>
