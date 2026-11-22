<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ART_URLS } from '../../../game/art'
import { HERO_DEFINITIONS, isSpecializationId } from '../../../game/content/heroes'
import { C104_HERO_ATLASES, PRODUCTION_HERO_SOURCES, heroBodyBox } from '../../../game/render/es2/production-heroes'
import type { HeroId } from '../../../game/types'

const props = defineProps<{ heroId: HeroId; alt: string }>()
const failed = ref(false)
watch(() => props.heroId, () => { failed.value = false })

// South-facing (row 2) first run frame, framed inside that single atlas cell.
const atlas = computed(() => isSpecializationId(props.heroId)
  ? { src: PRODUCTION_HERO_SOURCES[props.heroId], meta: C104_HERO_ATLASES[props.heroId] } : null)
const viewBox = computed(() => {
  if (!atlas.value) return ''
  const box = heroBodyBox(atlas.value.meta, 2)
  return `${box.x} ${box.y} ${box.side} ${box.side}`
})
const fallback = computed(() => isSpecializationId(props.heroId)
  ? HERO_DEFINITIONS[props.heroId].portraitSrc : ART_URLS[props.heroId])
</script>

<template>
  <svg v-if="atlas && !failed" :viewBox="viewBox" preserveAspectRatio="xMidYMid meet"
    role="img" :aria-label="alt || undefined" :aria-hidden="!alt">
    <image :href="atlas.src" :width="atlas.meta.width" :height="atlas.meta.height" @error="failed = true" />
  </svg>
  <img v-else :src="fallback" :alt="alt" decoding="async" draggable="false" />
</template>
