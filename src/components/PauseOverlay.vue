<script setup lang="ts">
import { t } from '../i18n'
import SettingsButton from './SettingsButton.vue'
defineProps<{ active: boolean }>()
const emit = defineEmits<{ resume: []; leave: []; settings: [] }>()
</script>

<template>
  <div id="paused" class="overlay" :class="{ active }" role="dialog" aria-modal="true" :aria-label="t('遊戲暫停')"><div class="panel"><h2>{{ t("⏸ 冒險暫停") }}</h2><button class="cta" id="resume" @click="emit('resume')">{{ t("繼續遊戲") }}</button><div class="pause-settings-actions"><SettingsButton @open="emit('settings')" /><button class="ghost" id="leave" @click="emit('leave')">{{ t("返回選角") }}</button></div></div></div>
</template>
