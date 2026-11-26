<script setup lang="ts">
import { t } from '../../../i18n'
import { fallbackSkillImage } from '../../../game/ui-art'
import { ref } from 'vue'
import type { ChoiceKind, MenuChoice } from './model'
import { WORLD_ART } from '../../../game/render/es2/production-world'
const props = withDefaults(defineProps<{
  items: readonly MenuChoice[]; selectedId?: string; disabled?: boolean; label?: string; kind?: ChoiceKind
}>(), { disabled: false, label: '可選擇項目' })
const emit = defineEmits<{ choose: [id: string] }>()
const focused = ref<string | null>(null)
const rarityIcon = (rarity?: string) => rarity === 'legendary' ? WORLD_ART.ui['rarity-legendary'] : rarity === 'rare' || rarity === 'epic' ? WORLD_ART.ui['rarity-rare'] : WORLD_ART.ui['rarity-common']
function select(item: MenuChoice): void {
  if (!props.disabled && !item.disabled) emit('choose', item.id)
}
</script>
<template>
  <div class="es2-choice-grid" role="group" :aria-label="t(label)">
    <button v-for="(item, index) in items" :key="item.id" type="button" class="es2-choice" data-ui-sfx="managed"
      :class="[`es2-rarity-${item.rarity ?? 'common'}`, { 'es2-choice-selected': selectedId === item.id, 'es2-choice-focused': focused === item.id, 'es2-choice-evolution': item.evolution, 'es2-skill-card': kind !== undefined }]"
      :data-choice="item.id" :aria-pressed="selectedId === item.id" :disabled="disabled || item.disabled" @focus="focused = item.id"
      @click="select(item)">
      <div class="es2-card-art">
        <picture v-if="item.imageSrc">
          <source v-if="item.reducedMotionSrc" media="(prefers-reduced-motion: reduce)" :srcset="item.reducedMotionSrc" />
          <img :src="item.imageSrc" @error="fallbackSkillImage($event, item.id, item.reducedMotionSrc)" :alt="t(item.title + ' 插畫')" loading="lazy" decoding="async" draggable="false" />
        </picture>
        <span v-else class="es2-card-glyph" aria-hidden="true">{{ item.icon ?? '✦' }}</span>
        <span v-if="item.evolution" class="es2-evolution-sigil" aria-hidden="true">✧</span>
      </div>
      <span class="es2-card-meta"><img class="es2-rarity-icon" :src="rarityIcon(item.rarity)" data-es2-rarity-icon alt="" loading="lazy" decoding="async" /><span class="es2-rarity-label">{{ t(item.evolution ? '究極進化' : item.rarity === 'legendary' ? '傳說' : item.rarity === 'epic' ? '史詩' : item.rarity === 'rare' ? '稀有' : '普通') }}</span><span v-if="index < 9" class="es2-key-hint" aria-hidden="true">{{ index + 1 }}</span></span>
      <small v-if="item.cursed" class="es3-curse-warning" data-es3-cursed>{{ t('詛咒 · 有代價') }}</small>
      <strong class="es2-card-name">{{ t(item.title) }}</strong>
      <span v-if="item.level !== undefined" class="es2-card-level">Lv.{{ item.level }} <template v-if="item.maxLevel">→ {{ Math.min(item.maxLevel, item.level + 1) }} / {{ item.maxLevel }}</template></span>
      <small v-if="item.description" class="es2-card-description">{{ t(item.description) }}</small>
      <span v-if="item.statChanges?.length" class="es2-mastery-stats">
        <span v-for="stat in item.statChanges" :key="stat.label" class="es2-mastery-stat">
          <span>{{ t(stat.label) }}</span>
          <span class="es2-mastery-values">{{ stat.before }} → <strong>{{ stat.after }}</strong></span>
        </span>
      </span>
      <small v-if="item.requirements" class="es2-card-requirements">◈ {{ t(item.requirements) }}</small>
      <span v-if="selectedId === item.id" class="es2-card-selected-text">{{ t("✓ 已選擇") }}</span>
    </button>
  </div>
</template>

<style scoped>
.es3-curse-warning { color: #ffd4e7; border: 1px solid #9d4e83; border-radius: .25rem; padding: .16rem .45rem; background: #351d36; font-weight: 600; }
</style>
