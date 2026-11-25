<script setup lang="ts">
import { formatNumber, t } from '../../../i18n'
defineProps<{ embers: number }>()
</script>
<template>
  <span class="es2-embers" data-es2-ember-wallet>
    <span class="es2-embers-icon" aria-hidden="true">✧</span>
    <span class="es2-embers-copy">
      <strong class="es2-embers-value" data-es2-ember-value>{{ formatNumber(embers) }}</strong>
      <span class="es2-embers-label">{{ t('暮光餘燼') }}</span>
    </span>
  </span>
</template>
