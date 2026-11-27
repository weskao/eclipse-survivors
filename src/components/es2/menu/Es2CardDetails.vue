<script setup lang="ts">
import { computed, watch } from 'vue'
import { t } from '../../../i18n'
import type { MonsterGroup } from './monster-details'
import Es2DetailSurface from './Es2DetailSurface.vue'
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
      <template v-if="current.groups && !anchor">
        <p v-if="current.note" class="es2-monster-note">{{ current.note }}</p>
        <section v-for="group in current.groups" :key="group.id" class="es2-monster-dossier" :data-monster-group="group.id">
          <h3 v-if="group.title">{{ group.title }}</h3>
          <h4>{{ t('魔物基礎數值') }}</h4>
          <div class="es2-hero-stat-strip">
            <div v-for="stat in group.stats" :key="stat.label" class="es2-hero-stat" :data-monster-stat="stat.label"
              :aria-label="stat.name + ': ' + stat.value">
              <small class="es2-hero-stat-label">{{ stat.label }}</small>
              <strong class="es2-hero-stat-value">{{ stat.value }}</strong>
              <small class="es2-monster-stat-name">{{ stat.name }}</small>
            </div>
          </div>
          <h4>{{ t('魔物招式') }}</h4>
          <article v-for="skill in group.skills" :key="skill.id" class="es2-hero-detail-special es2-monster-skill" :data-monster-skill="skill.id">
            <img :src="skill.icon" alt="" width="44" height="44" decoding="async" />
            <div><strong>{{ skill.title }}</strong><p>{{ skill.description }}</p><small>{{ skill.detail }}</small></div>
          </article>
        </section>
      </template>
    </div>
  </Es2DetailSurface>
</template>
