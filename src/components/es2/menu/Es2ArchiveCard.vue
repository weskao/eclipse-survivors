<script setup lang="ts">
import Es2CardInfo from './Es2CardInfo.vue'
defineProps<{ title: string; detailId?: string }>()
const emit = defineEmits<{ open: [id: string] }>()
</script>

<template>
  <article class="es2-archive-card" :class="{ 'es2-context-card': !!detailId }"
    :data-es2-context-card="detailId" :tabindex="detailId ? 0 : undefined">
    <div class="es2-archive-art"><slot name="art" /></div>
    <strong>{{ title }}</strong>
    <Es2CardInfo v-if="detailId" :id="detailId" :title="title" @open="emit('open', $event)" />
    <slot />
  </article>
</template>
