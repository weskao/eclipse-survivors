<script setup lang="ts">
defineProps<{ channel: 'music' | 'sfx'; muted: boolean }>()
</script>

<template>
  <template v-if="!muted">{{ channel === 'music' ? '♫' : '♬' }}</template>
  <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    :data-audio-icon="channel + '-muted'" style="vertical-align: middle">
    <template v-if="channel === 'music'">
      <path d="M9 17V5l10-2v12M9 9l10-2" />
      <ellipse cx="6" cy="17" rx="3" ry="2" />
      <ellipse cx="16" cy="15" rx="3" ry="2" />
      <path data-mute-mark="" d="m3 3 18 18" />
    </template>
    <template v-else>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path data-mute-mark="" d="m17 9 5 6m0-6-5 6" />
    </template>
  </svg>
</template>
