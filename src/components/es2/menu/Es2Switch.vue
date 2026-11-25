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
  position: relative; display: block; width: 54px; height: 30px; border: 1px solid #8192a5;
  border-radius: 9px; background: linear-gradient(155deg, #253446, #101a27);
  box-shadow: inset 0 1px #ffffff18, inset 0 -2px 5px #0008, 0 2px 5px #0006;
  box-sizing: border-box;
}
.es2-setting-switch span::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px;
  border: 1px solid #a6b4c2; border-radius: 6px; box-sizing: border-box;
  background: linear-gradient(145deg, #b3c0ce, #718398 55%, #425366);
  box-shadow: inset 0 1px #fff5, 0 2px 4px #0009;
  transition: transform .16s ease;
}
.es2-setting-switch[aria-checked="true"] span {
  background: linear-gradient(110deg, #493322, #795b35 50%, #37271c);
  border-color: #e5c48e; box-shadow: inset 0 1px #ffe4aa66, inset 0 -2px 5px #0008, 0 0 9px #d8aa5a55;
}
.es2-setting-switch[aria-checked="true"] span::after {
  transform: translateX(24px); border-color: #ffe6b0;
  background: linear-gradient(145deg, #fff1c9, #d7b47b 50%, #967044);
}
.es2-setting-switch:focus-visible { outline: 3px solid #ffe3a6; outline-offset: 2px; }
.es2-setting-switch:disabled { opacity: .5; cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) {
  .es2-setting-switch span::after { transition: none; }
}
</style>
