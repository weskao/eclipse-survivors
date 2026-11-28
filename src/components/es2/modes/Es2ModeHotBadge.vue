<script setup lang="ts">
withDefaults(defineProps<{ hot?: boolean }>(), { hot: false })
</script>

<template>
  <span v-if="hot" class="es2-mode-hot" data-es2-mode-hot>HOT</span>
</template>

<style scoped>
/* Compact, in-flow recommendation; the decorative sweep never changes layout. */
.es2-mode-hot[data-es2-mode-hot] {
  position:relative; display:inline-flex; align-items:center; justify-content:center; gap:4px;
  flex:none; box-sizing:border-box; overflow:hidden; white-space:nowrap; pointer-events:none;
  padding:2px 7px 2px 5px; min-height:19px; border:1px solid #ffc278; border-radius:4px 8px 4px 8px;
  background:linear-gradient(135deg,#8b291c,#c04a24 55%,#91301b);
  color:#fff4cf; font:800 10px/1.2 system-ui,sans-serif; letter-spacing:.085em;
  text-shadow:0 1px 2px #4d190a; box-shadow:0 0 8px #ff87365c,inset 0 1px #ffe3a45c;
}
.es2-mode-hot::before {
  content:''; display:block; width:9px; height:12px; flex:none;
  background:linear-gradient(0deg,#ff9f45,#fff4b9 85%);
  clip-path:polygon(52% 0,62% 28%,90% 48%,100% 72%,84% 94%,50% 100%,16% 94%,0 72%,12% 48%,32% 60%,40% 32%);
}
.es2-mode-hot::after {
  content:''; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(115deg,transparent 35%,#fff4bc85 50%,transparent 65%);
  transform:translateX(-120%); opacity:0;
  animation:es2-mode-hot-sweep 1.8s ease-in-out 4;
}
@keyframes es2-mode-hot-sweep {
  0%,25% { transform:translateX(-120%); opacity:0; }
  35% { opacity:.85; }
  72%,100% { transform:translateX(120%); opacity:0; }
}
@media(prefers-reduced-motion:reduce),(forced-colors:active) {
  .es2-mode-hot::after { animation:none; }
}
:global([data-es2-reduce-motion="true"] .es2-mode-hot::after),
:global([data-es2-reduce-flashing="true"] .es2-mode-hot::after) { animation:none !important; }
@media(forced-colors:active) {
  .es2-mode-hot[data-es2-mode-hot] { color:CanvasText; background:Canvas; border-color:CanvasText; box-shadow:none; text-shadow:none; }
  .es2-mode-hot::before { background:CanvasText; }
}
</style>
