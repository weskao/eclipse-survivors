<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { vImageShimmer } from '../../shared/image-shimmer'
import { ART_URLS } from '../../../game/art'
import { HERO_DEFINITIONS, isSpecializationId } from '../../../game/content/heroes'
import shadowFallback from '../../../game/content/heroes/portraits/shadowblade.svg?url'
import summonerFallback from '../../../game/content/heroes/portraits/spirit-summoner.svg?url'
import paladinFallback from '../../../game/content/heroes/portraits/crimson-paladin.svg?url'
import type { HeroId } from '../../../game/types'

const props = defineProps<{ heroId: HeroId; alt: string }>()
const failed = ref(false)
watch(() => props.heroId, () => { failed.value = false })
const originalPortraits = {
  shadowblade: shadowFallback,
  'spirit-summoner': summonerFallback,
  'crimson-paladin': paladinFallback,
} as const
const source = computed(() => isSpecializationId(props.heroId)
  ? HERO_DEFINITIONS[props.heroId].portraitSrc : ART_URLS[props.heroId])
const fallback = computed(() => isSpecializationId(props.heroId)
  ? originalPortraits[props.heroId] : ART_URLS[props.heroId])
</script>

<template>
  <img v-image-shimmer="failed ? fallback : source" :src="failed ? fallback : source" :alt="alt" :data-es2-specialization="isSpecializationId(heroId) ? '' : undefined"
    decoding="async" draggable="false"
    @error="failed = true" />
</template>
