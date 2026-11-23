<script setup lang="ts">
import { t } from '../../../i18n'
import { computed } from 'vue'
import { ART_URLS } from '../../../game/art'
import type { JobId } from '../../../game/types'
const props = withDefaults(defineProps<{ active: boolean; hero?: JobId; message?: string; progress?: number }>(), { message: '世界正在甦醒…' })
const percentage = computed(() => props.progress === undefined ? null : Math.min(100, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0)))
</script>
<template>
  <div v-if="active" class="es2-loading" role="status" aria-live="polite" :aria-label="t('載入遊戲中')">
    <img v-if="hero" :src="ART_URLS[hero]" :alt="t('即將出征的英雄')" />
    <div><span class="es2-eyebrow">✦ ECLIPSE SURVIVORS ✦</span><h2>{{ t(message) }}</h2>
      <div class="es2-loading-track" :class="{ 'es2-loading-indeterminate': percentage === null }" :role="percentage === null ? undefined : 'progressbar'" :aria-valuenow="percentage ?? undefined" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: percentage === null ? '36%' : percentage + '%' }"></span>
      </div>
      <p v-if="percentage !== null">{{ Math.round(percentage) }}%</p>
    </div>
  </div>
</template>
