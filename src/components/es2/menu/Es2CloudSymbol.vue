<script setup lang="ts">
defineProps<{ state: 'success' | 'error' | 'unavailable' | 'loading' | 'guest' | 'playtest' | 'syncing' | 'synced' | 'conflict' }>()
</script>
<template>
  <svg data-es2-cloud-symbol :data-state="state" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-if="state === 'success'">
      <path d="m5 12 4.5 4.5L19 7" />
    </template>
    <template v-else-if="state === 'error' || state === 'conflict'">
      <path d="M12 4 21 20H3L12 4Z" /><path d="M12 10v4m0 3h.01" />
    </template>
    <template v-else-if="state === 'syncing' || state === 'loading'">
      <path d="M20 10a8 8 0 0 0-13-4L4 9m0-5v5h5m-5 5a8 8 0 0 0 13 4l3-3m0 5v-5h-5" />
    </template>
    <template v-else-if="state === 'playtest'">
      <path d="m12 3 7 9-7 9-7-9 7-9Z" /><path d="M12 8v8m-3-4h6" />
    </template>
    <template v-else>
      <path d="M7 18a5 5 0 1 1 1-9.9 6 6 0 0 1 11.2 3A3.5 3.5 0 0 1 18.5 18" />
      <path v-if="state === 'synced'" d="m9 16 2.5 2.5L16 14" />
      <path v-else-if="state === 'unavailable'" d="m8 14 8 6m0-6-8 6" />
      <path v-else d="M9 18h6" />
    </template>
  </svg>
</template>
