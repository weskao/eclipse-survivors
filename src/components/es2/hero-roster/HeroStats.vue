<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../../../i18n'

const props = defineProps<{
  stats: { hp: number; damage: number; speed: number; delay: number }
}>()

const values = computed(() => [
  { id: 'hp', label: 'HP', fullLabel: '生命', value: String(props.stats.hp) },
  { id: 'attack', label: 'ATK', fullLabel: '攻擊力', value: String(props.stats.damage) },
  { id: 'speed', label: 'SPD', fullLabel: '移動速度', value: String(props.stats.speed) },
  { id: 'attack-delay', label: 'ATK CD', fullLabel: '攻擊間隔', value: `${props.stats.delay}s` },
])
</script>

<template>
  <span class="es2-hero-stat-strip" :aria-label="t('英雄初始數值')">
    <span v-for="stat in values" :key="stat.id" class="es2-hero-stat" :data-hero-stat="stat.id"
      :title="t(stat.fullLabel)" :aria-label="t(stat.fullLabel) + ': ' + stat.value">
      <small class="es2-hero-stat-label">{{ stat.label }}</small>
      <strong class="es2-hero-stat-value">{{ stat.value }}</strong>
    </span>
  </span>
</template>
