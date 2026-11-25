<script setup lang="ts">
defineProps<{ checked: boolean; label: string; disabled?: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>
<template>
  <button type="button" class="es2-setting-switch" role="switch" :aria-label="label"
    :aria-checked="checked" :disabled="disabled" @click="emit('toggle')">
    <span aria-hidden="true"></span>
  </button>
</template>
<style scoped>
button.es2-setting-switch[role="switch"] {
  flex: 0 0 60px; display: grid; place-items: center; width: 60px; height: 44px;
  min-height: 44px; padding: 0; border: 0; border-radius: 8px; background: transparent;
  box-shadow: none; cursor: pointer;
}
.es2-setting-switch span {
  position: relative; display: block; width: 54px; height: 30px; border: 1px solid #8997a5;
  border-radius: 999px; background: #263545; box-sizing: border-box;
}
.es2-setting-switch span::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px;
  border-radius: 50%; background: #c4cbd3; box-shadow: 0 1px 3px #0008;
  transition: transform .16s ease;
}
.es2-setting-switch[aria-checked="true"] span { background: #315c46; border-color: #a8efbd; }
.es2-setting-switch[aria-checked="true"] span::after { transform: translateX(24px); background: #c5f5d0; }
.es2-setting-switch:focus-visible { outline: 3px solid #ffe3a6; outline-offset: 2px; }
.es2-setting-switch:disabled { opacity: .5; cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) {
  .es2-setting-switch span::after { transition: none; }
}
</style>
