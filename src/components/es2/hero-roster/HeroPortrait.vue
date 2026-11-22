<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ART_URLS } from '../../../game/art'
import { HERO_DEFINITIONS, isSpecializationId } from '../../../game/content/heroes'
import { PRODUCTION_HERO_SOURCES } from '../../../game/render/es2/production-heroes'
import type { HeroId } from '../../../game/types'

const props = defineProps<{ heroId: HeroId; alt: string }>()
const failed = ref(false)
watch(() => props.heroId, () => { failed.value = false })

const source = computed(() => isSpecializationId(props.heroId)
  ? PRODUCTION_HERO_SOURCES[props.heroId] : null)
const fallback = computed(() => isSpecializationId(props.heroId)
  ? HERO_DEFINITIONS[props.heroId].portraitSrc : ART_URLS[props.heroId])
</script>

<template>
  <!-- The source rectangle stays entirely inside the atlas's first 128×128 idle cell. -->
  <svg v-if="source && !failed" viewBox="22 28 88 76" preserveAspectRatio="xMidYMid meet"
    role="img" :aria-label="alt || undefined" :aria-hidden="!alt">
    <image :href="source" width="1024" height="512" @error="failed = true" />
  </svg>
  <img v-else :src="fallback" :alt="alt" decoding="async" draggable="false" />
</template>
