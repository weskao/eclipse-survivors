<script setup lang="ts">
export interface DetailStat { id: string; label: string; name: string; value: string | number }
defineProps<{ values: readonly DetailStat[]; kind: 'hero' | 'monster'; label: string; showNames?: boolean }>()
</script>
<template>
  <span class="es2-hero-stat-strip" :aria-label="label">
    <span v-for="stat in values" :key="stat.id" class="es2-hero-stat"
      :data-hero-stat="kind === 'hero' ? stat.id : undefined" :data-monster-stat="kind === 'monster' ? stat.id : undefined"
      :title="stat.name" :aria-label="stat.name + ': ' + stat.value">
      <small class="es2-hero-stat-label">{{ stat.label }}</small>
      <strong class="es2-hero-stat-value">{{ stat.value }}</strong>
      <small v-if="showNames" class="es2-monster-stat-name">{{ stat.name }}</small>
    </span>
  </span>
</template>
