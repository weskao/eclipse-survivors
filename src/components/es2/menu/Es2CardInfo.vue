<script setup lang="ts">
import { t } from '../../../i18n'
defineProps<{ id: string; title: string }>()
const emit = defineEmits<{ open: [id: string] }>()
</script>
<template>
  <button type="button" class="es2-card-info-trigger" :data-es2-card-info="id"
    :aria-label="t('查看詳情：{name}', { name: title })" aria-haspopup="dialog"
    data-ui-sfx="select" @click.stop="emit('open', id)"><span class="es2-info-glyph" aria-hidden="true">i</span></button>
</template>
