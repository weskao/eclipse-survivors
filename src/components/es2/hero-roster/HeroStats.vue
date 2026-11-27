<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../../../i18n'
import Es2StatStrip from '../menu/Es2StatStrip.vue'

const props = defineProps<{
  stats: { hp: number; damage: number; speed: number; delay: number }
}>()

const values = computed(() => [
  { id: 'hp', label: 'HP', fullLabel: '生命', value: String(props.stats.hp) },
  { id: 'attack', label: 'ATK', fullLabel: '攻擊力', value: String(props.stats.damage) },
  { id: 'speed', label: 'SPD', fullLabel: '移動速度', value: String(props.stats.speed) },
  { id: 'attack-delay', label: 'ATK CD', fullLabel: '攻擊間隔', value: `${props.stats.delay}s` },
].map(stat => ({ ...stat, name: t(stat.fullLabel) })))
</script>

<template>
  <Es2StatStrip :values="values" kind="hero" :label="t('英雄初始數值')" />
</template>
