<script setup lang="ts">
import { MODES, modeIds } from '../../meta/modes'
import type { RunModeId } from '../../meta/types'

defineProps<{ value: RunModeId }>()
const emit = defineEmits<{ select: [mode: RunModeId] }>()
</script>

<template>
  <section class="mode-selector" aria-label="遊戲模式">
    <div class="mode-heading"><span>02 / SELECT YOUR JOURNEY</span><strong>選擇遠征模式</strong></div>
    <div class="mode-grid" role="radiogroup" aria-label="遠征模式">
      <button
        v-for="id in modeIds" :key="id"
        type="button" role="radio"
        class="mode-choice" :class="{ selected: id === value }"
        :aria-checked="id === value"
        @click="emit('select', id)"
      >
        <span class="mode-icon" aria-hidden="true">{{ id === 'quick' ? '✦' : id === 'standard' ? '♜' : id === 'endless' ? '∞' : '⚡' }}</span>
        <span class="mode-copy"><strong>{{ MODES[id].label }}</strong><small>{{ MODES[id].description }}</small></span>
        <span class="mode-duration">{{ MODES[id].duration === null ? '∞' : Math.ceil(MODES[id].duration! / 60) + ' MIN' }}</span>
      </button>
    </div>
  </section>
</template>
