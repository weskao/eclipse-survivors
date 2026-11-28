<script setup lang="ts">
import { computed } from 'vue'
import type { RunModeId } from '../../../meta/types'
import { vImageShimmer } from '../../shared/image-shimmer'

const props = defineProps<{ mode: RunModeId }>()
const images = import.meta.glob<string>('../../../assets/es2/production/modes/*@3x.webp', {
  eager: true, query: '?url', import: 'default',
})
const src = computed(() => images[`../../../assets/es2/production/modes/${props.mode}@3x.webp`])
</script>

<template>
  <span class="es2-mode-sigil" :data-es2-mode-icon="mode" :data-es2-mode-theme="mode" aria-hidden="true">
    <img v-image-shimmer="src" :key="mode" :src="src" alt="" width="192" height="192" decoding="async" draggable="false" />
  </span>
</template>

<style scoped>
:where(.es2-mode-sigil) { display:inline-grid; place-items:center; flex:none; width:32px; aspect-ratio:1; line-height:1; vertical-align:middle; }
.es2-mode-sigil img { display:block; width:100%; height:100%; min-width:0; min-height:0; object-fit:contain; pointer-events:none; }
</style>
