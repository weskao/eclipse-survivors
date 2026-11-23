<script setup lang="ts">
import { t } from '../i18n'
import Es2Dialog from './es2/menu/Es2Dialog.vue'
import SettingsButton from './SettingsButton.vue'
defineProps<{ active: boolean }>()
const emit = defineEmits<{ resume: []; leave: []; settings: [] }>()
function shortcut(event: KeyboardEvent): void {
  if (event.code !== 'KeyP' || event.repeat || event.isComposing ||
    event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const target = event.target
  if (target instanceof HTMLElement && (target.isContentEditable ||
    target.closest('input, textarea, select, [contenteditable]'))) return
  event.preventDefault()
  emit('resume')
}
</script>

<template>
  <Es2Dialog :active="active" :title="t('⏸ 冒險暫停')" :dismissible="false" @shortcut="shortcut">
    <div id="paused" class="active" :aria-label="t('遊戲暫停')">
      <p>{{ t('遊戲暫停') }}</p>
    </div>
    <template #actions>
      <button id="resume" type="button" class="es2-primary" @click="emit('resume')">{{ t('繼續遊戲') }}</button>
      <SettingsButton @open="emit('settings')" />
      <button id="leave" type="button" class="es2-secondary" @click="emit('leave')">{{ t('返回選角') }}</button>
    </template>
  </Es2Dialog>
</template>
