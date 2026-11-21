<script setup lang="ts">
defineProps<{ active: boolean; ending: string; summary: string }>()
const emit = defineEmits<{ again: []; home: [] }>()
</script>

<template>
  <div id="result" class="overlay" :class="{ active }"><div class="panel"><h2 id="ending">{{ ending }}</h2><p id="summary">{{ summary }}</p><button class="cta" id="again" @click="emit('again')">再次挑戰</button><div><button class="ghost" id="home" @click="emit('home')">返回選角</button></div></div></div>
</template>
