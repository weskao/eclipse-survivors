<script setup lang="ts">
defineProps<{ active: boolean }>()
const emit = defineEmits<{ resume: []; leave: [] }>()
</script>

<template>
  <div id="paused" class="overlay" :class="{ active }"><div class="panel"><h2>⏸ 冒險暫停</h2><button class="cta" id="resume" @click="emit('resume')">繼續遊戲</button><div><button class="ghost" id="leave" @click="emit('leave')">返回選角</button></div></div></div>
</template>
