<script setup lang="ts">
import Es2Dialog from './Es2Dialog.vue'
withDefaults(defineProps<{
  active: boolean; kind: 'confirmation' | 'notification'; title: string; message: string
  confirmLabel?: string; destructive?: boolean
}>(), { confirmLabel: '確認', destructive: false })
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>
<template>
  <Es2Dialog :active="active" :title="title" :subtitle="message" @cancel="emit('cancel')">
    <p v-if="destructive" class="es2-warning">注意：此操作無法復原。</p>
    <template #actions>
      <button v-if="kind === 'confirmation'" class="es2-secondary" type="button" @click="emit('cancel')">取消</button>
      <button type="button" :class="destructive ? 'es2-danger-filled' : 'es2-primary'" @click="emit('confirm')">{{ kind === 'notification' ? '知道了' : confirmLabel }}</button>
    </template>
  </Es2Dialog>
</template>
