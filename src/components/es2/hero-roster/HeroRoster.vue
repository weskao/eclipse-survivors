<script setup lang="ts">
import { t } from '../../../i18n'
import { HERO_DEFINITIONS, type SpecializationId } from '../../../game/content/heroes'
import HeroSelectionCard from './HeroSelectionCard.vue'
import { moveHeroSelection } from './hero-selection'
import type { JobId } from '../../../game/types'

const props = withDefaults(defineProps<{
  selectedId?: SpecializationId | JobId | null
  disabled?: boolean
}>(), { selectedId: null, disabled: false })
const emit = defineEmits<{ select: [id: SpecializationId]; details: [id: SpecializationId] }>()
const heroes = Object.values(HERO_DEFINITIONS)
const heroIds = heroes.map(hero => hero.id)
function select(id: SpecializationId): void { if (!props.disabled) emit('select', id) }
function move(event: KeyboardEvent, id: SpecializationId): void {
  if (props.disabled || event.altKey || event.ctrlKey || event.metaKey) return
  void moveHeroSelection(event, id, heroIds, select)
}
</script>

<template>
  <section class="es2-roster" role="group" :aria-label="t('ES2 新英雄選擇')">
    <HeroSelectionCard v-for="hero in heroes" :key="hero.id" :hero-id="hero.id"
      :name="hero.label" :subtitle="hero.subtitle" :stats="hero.stats"
      :selected="selectedId === hero.id" :disabled="disabled"
      @select="select(hero.id)" @keydown="move($event, hero.id)" @details="emit('details', hero.id)" />
  </section>
</template>

<style scoped>
.es2-roster { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1rem; width: 100%; }
@media (max-width: 760px) { .es2-roster { grid-template-columns: 1fr; } }
</style>
