<script setup lang="ts">
import { t } from '../../i18n'
import Es2ModeSigil from '../es2/modes/Es2ModeSigil.vue'
import Es2ModeHotBadge from '../es2/modes/Es2ModeHotBadge.vue'
import { MODES, modeIds } from '../../meta/modes'
import type { RunModeId } from '../../meta/types'

defineProps<{ value: RunModeId }>()
const emit = defineEmits<{ select: [mode: RunModeId] }>()
</script>

<template>
  <section class="mode-selector" :aria-label="t('遊戲模式')">
    <div class="mode-heading"><span>{{ t("02 / SELECT YOUR JOURNEY") }}</span><strong>{{ t("選擇遠征模式") }}</strong></div>
    <div class="mode-grid" role="radiogroup" :aria-label="t('遠征模式')">
      <button
        v-for="id in modeIds" :key="id"
        type="button" role="radio"
        :data-mode="id" class="mode-choice" :class="{ selected: id === value }"
        :aria-checked="id === value"
        @click="emit('select', id)"
      >
        <Es2ModeSigil :mode="id" class="mode-icon" />
        <span class="mode-copy"><span class="es2-mode-title-line"><strong>{{ t(MODES[id].label) }}</strong><Es2ModeHotBadge :hot="MODES[id].hot" /></span><small>{{ t(MODES[id].description) }}</small></span>
        <span class="mode-duration">{{ MODES[id].duration === null ? '∞' : Math.ceil((MODES[id].duration ?? 0) / 60) + ' MIN' }}</span>
      </button>
    </div>
  </section>
</template>
