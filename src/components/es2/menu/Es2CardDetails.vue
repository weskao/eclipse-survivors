<script setup lang="ts">
import { computed, watch } from 'vue'
import { t } from '../../../i18n'
import type { MonsterGroup } from './monster-details'
import Es2DetailSurface from './Es2DetailSurface.vue'
import Es2StatStrip from './Es2StatStrip.vue'
import Es2SkillSummary from './Es2SkillSummary.vue'
import { useHoverDetails } from './useHoverDetails'

export interface CardDetail { title: string; description: string; subtitle?: string; lines?: readonly string[]; groups?: readonly MonsterGroup[]; note?: string }
const props = defineProps<{ entries: Readonly<Record<string, CardDetail>>; scope?: string }>()
const details = useHoverDetails<string>('[data-es2-context-card]', el => {
  const id = el.getAttribute('data-es2-context-card')
  return id && props.entries[id] ? id : null
})
const { id, anchor, tooltipId, events } = details
const current = computed(() => id.value === null ? undefined : props.entries[id.value])
watch(() => props.scope, () => details.clear())
watch(current, entry => { if (!entry && id.value !== null) details.clear() })
function open(key: string): void { if (props.entries[key]) details.openModal(key) }
</script>
<template>
  <div class="es2-context-board" v-on="events">
    <slot :open="open" />
  </div>
  <Es2DetailSurface :active="!!current" :title="current?.title ?? ''" :subtitle="current?.subtitle"
    :anchor="anchor" :tooltip-id="tooltipId" @cancel="details.clear()" @hold="details.hold()" @leave="details.leave()">
    <div v-if="current" class="es2-hero-detail-content es2-context-description">
      <p>{{ current.description }}</p>
      <p v-for="(line, index) in current.lines" :key="index">{{ line }}</p>
      <template v-if="current.groups">
        <p v-if="current.note" class="es2-monster-note">{{ current.note }}</p>
        <section v-for="group in current.groups" :key="group.id" class="es2-monster-dossier" :data-monster-group="group.id">
          <h3 v-if="group.title">{{ group.title }}</h3>
          <h4>{{ t('魔物基礎數值') }}</h4>
          <Es2StatStrip :values="group.stats.map(stat => ({ ...stat, id: stat.label }))" kind="monster" :label="t('魔物基礎數值')" show-names />
          <h4>{{ t('魔物招式') }}</h4>
          <Es2SkillSummary v-for="skill in group.skills" :key="skill.id" class="es2-hero-detail-special es2-monster-skill"
            :data-monster-skill="skill.id" :icon="skill.icon" :title="skill.title" :description="skill.description" :detail="skill.detail"
            :style="group.color ? { '--es2-special-accent': group.color } : undefined" />
        </section>
      </template>
    </div>
  </Es2DetailSurface>
</template>
