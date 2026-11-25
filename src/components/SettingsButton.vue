<script setup lang="ts">
import { t } from '../i18n'
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <button class="settings-trigger" :class="{ compact }" type="button" :aria-label="t('開啟遊戲設定')" :title="t('遊戲設定')" @click="emit('open')">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10.1 2.8h3.8l.6 2.3a7.5 7.5 0 0 1 1.8.8l2-.9 2.7 2.7-.9 2a7.5 7.5 0 0 1 .8 1.8l2.3.6v3.8l-2.3.6a7.5 7.5 0 0 1-.8 1.8l.9 2-2.7 2.7-2-.9a7.5 7.5 0 0 1-1.8.8l-.6 2.3h-3.8l-.6-2.3a7.5 7.5 0 0 1-1.8-.8l-2 .9-2.7-2.7.9-2a7.5 7.5 0 0 1-.8-1.8l-2.3-.6v-3.8l2.3-.6a7.5 7.5 0 0 1 .8-1.8l-.9-2 2.7-2.7 2 .9a7.5 7.5 0 0 1 1.8-.8z" transform="translate(0 -1) scale(.94)" />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
    <span v-if="!compact">{{ t("設定") }}</span>
  </button>
</template>
