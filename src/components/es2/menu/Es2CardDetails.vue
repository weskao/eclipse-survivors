<script setup lang="ts">
import { computed, watch } from 'vue'
import Es2DetailSurface from './Es2DetailSurface.vue'
import { useHoverDetails } from './useHoverDetails'

export interface CardDetail { title: string; description: string; subtitle?: string; lines?: readonly string[] }
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
    </div>
  </Es2DetailSurface>
</template>
