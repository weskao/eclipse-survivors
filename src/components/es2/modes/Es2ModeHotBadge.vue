<script setup lang="ts">
withDefaults(defineProps<{ hot?: boolean }>(), { hot: false })
</script>

<template>
  <span v-if="hot" class="es2-mode-hot" data-es2-mode-hot>HOT</span>
</template>

<style scoped>
/* Both card surfaces share one clearance rule; only featured cards reserve it. */
:global(.es2-expedition-board .es2-mode-card.es2-mode-has-hot),
:global(.mode-choice.es2-mode-has-hot) { padding-block-start:34px; min-height:96px; }
/* Fixed corner, independent of title length. The card reserves the top strip. */
.es2-mode-hot[data-es2-mode-hot] {
  position:absolute; inset-block-start:5px; inset-inline-end:8px; z-index:1;
  display:inline-flex; align-items:center; justify-content:center; gap:5px;
  box-sizing:border-box; overflow:hidden; white-space:nowrap; pointer-events:none;
  padding:3px 8px 3px 6px; min-height:23px; border:1px solid #ffc278; border-radius:4px 9px 4px 9px;
  background:linear-gradient(155deg,#b53c17,#722018 70%,#9a3219);
  color:#fff4d2; font:900 12px/1.1 var(--es2-font-numeric),system-ui,sans-serif; letter-spacing:.08em;
  text-shadow:0 1px 2px #481309,0 0 4px #ff9b45; box-shadow:inset 0 1px 2px #ffd18b80,0 0 9px #ff752d65;
}
.es2-mode-hot::before {
  content:''; display:block; width:11px; height:15px; flex:none;
  background:radial-gradient(ellipse at 50% 78%,#fff4b9 0 20%,#ffba37 37%,#ff721f 68%,#ee451d 95%);
  clip-path:polygon(51% 0,63% 27%,82% 39%,79% 17%,98% 58%,100% 76%,83% 94%,50% 100%,17% 94%,0 76%,8% 50%,26% 60%,39% 30%);
  transform-origin:50% 95%;
  animation:es2-mode-hot-flame .92s ease-in-out infinite alternate;
}
.es2-mode-hot::after {
  content:''; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(115deg,transparent 35%,#fff4bc85 50%,transparent 65%);
  transform:translateX(-120%); opacity:0;
  animation:es2-mode-hot-sweep 3.8s ease-in-out infinite;
}
@keyframes es2-mode-hot-flame {
  0% { transform:scale(.92,1) rotate(-5deg); }
  45% { transform:scale(1.08,.88) rotate(3deg); }
  100% { transform:scale(.95,1.08) rotate(5deg); }
}
@keyframes es2-mode-hot-sweep {
  0%,35% { transform:translateX(-120%); opacity:0; }
  45% { opacity:.7; }
  68%,100% { transform:translateX(120%); opacity:0; }
}
@media(prefers-reduced-motion:reduce),(forced-colors:active) {
  .es2-mode-hot::before,.es2-mode-hot::after { animation:none; }
}
:global([data-es2-reduce-motion="true"] .es2-mode-hot::before),
:global([data-es2-reduce-motion="true"] .es2-mode-hot::after),
:global([data-es2-reduce-flashing="true"] .es2-mode-hot::before),
:global([data-es2-reduce-flashing="true"] .es2-mode-hot::after),
:global(.es2-menu[data-es2-menu-page="heroes"] .es2-mode-hot::before),
:global(.es2-menu[data-es2-menu-page="heroes"] .es2-mode-hot::after),
:global(.es2-menu--archive .es2-mode-hot::before),
:global(.es2-menu--archive .es2-mode-hot::after) { animation:none !important; }
@media(forced-colors:active) {
  .es2-mode-hot[data-es2-mode-hot] { color:CanvasText; background:Canvas; border-color:CanvasText; box-shadow:none; text-shadow:none; }
  .es2-mode-hot::before { background:CanvasText; }
}
</style>
