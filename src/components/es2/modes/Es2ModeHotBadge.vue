<script setup lang="ts">
withDefaults(defineProps<{ hot?: boolean }>(), { hot: false })
</script>

<template>
  <span v-if="hot" class="es2-mode-hot" data-es2-mode-hot>
    <svg class="es2-mode-hot-fire" viewBox="0 0 24 28" aria-hidden="true" focusable="false">
      <path class="es2-mode-hot-flame es2-mode-hot-flame-outer" fill="#f34a19"
        d="M12 1C15 6 12 10 17 12C19 10 19 7 19 6C23 12 24 18 21 23C18 28 7 28 3 23C-1 17 4 11 6 7C6 12 9 13 10 9C11 6 11 3 12 1Z"/>
      <path class="es2-mode-hot-flame es2-mode-hot-flame-middle" fill="#ffab26"
        d="M13 7C17 13 12 15 18 17C21 22 17 27 12 27C6 27 3 23 6 18C7 16 9 14 9 11C10 15 12 13 13 7Z"/>
      <path class="es2-mode-hot-flame es2-mode-hot-flame-core" fill="#fff2a8"
        d="M12 16C12 20 16 21 16 23C16 27 8 28 8 23C8 20 11 19 12 16Z"/>
      <circle class="es2-mode-hot-ember" cx="6" cy="17" r="1" fill="#ffc86b"/>
      <circle class="es2-mode-hot-ember" cx="17" cy="16" r=".8" fill="#fff0b3"/>
      <circle class="es2-mode-hot-ember" cx="12" cy="13" r=".7" fill="#ff8c39"/>
    </svg>
    <span class="es2-mode-hot-label">HOT</span>
  </span>
</template>

<style>
/* One shared gutter for corner badges, whether featured or not.
   HOT never changes a card's padding, height, width or content tracks. */
.es2-menu .es2-expedition-board .es2-mode-grid,
.mode-selector .mode-grid {
  --es2-hot-overhang:23px;
  row-gap:calc(var(--es2-hot-overhang) + 5px);
  padding-block-start:calc(var(--es2-hot-overhang) + 1px);
}
.es2-mode-hot[data-es2-mode-hot] {
  position:absolute; inset-block-start:calc(0px - var(--es2-hot-overhang,23px)); inset-inline-end:8px; z-index:1;
  display:inline-flex; align-items:center; justify-content:center; gap:5px;
  box-sizing:border-box; overflow:hidden; white-space:nowrap; pointer-events:none;
  padding:1px 7px 1px 5px; height:22px; border:1px solid #ffc278; border-radius:4px 9px 4px 9px;
  background:linear-gradient(155deg,#b53c17,#722018 70%,#9a3219);
  color:#fff4d2; font:900 12px/1.1 var(--es2-font-numeric),system-ui,sans-serif; letter-spacing:.08em;
  text-shadow:0 1px 2px #481309,0 0 4px #ff9b45; box-shadow:inset 0 1px 2px #ffd18b80,0 0 9px #ff752d65;
}
.es2-mode-hot-fire {
  display:block; width:16px; height:18px; flex:none; overflow:hidden;
  filter:drop-shadow(0 0 2px #ff922c);
}
.es2-mode-hot-label { position:relative; z-index:1; }
.es2-mode-hot-flame {
  transform-box:fill-box; transform-origin:50% 100%;
  animation:es2-mode-hot-flame .83s ease-in-out infinite alternate;
}
.es2-mode-hot-flame-middle { animation-duration:.67s; animation-delay:-.27s; }
.es2-mode-hot-flame-core { animation-duration:.49s; animation-delay:-.12s; }
.es2-mode-hot-ember {
  transform-box:fill-box; transform-origin:center; opacity:0;
  animation:es2-mode-hot-ember 1.45s linear infinite;
}
.es2-mode-hot-ember:nth-of-type(2) { animation-delay:-.51s; animation-duration:1.81s; }
.es2-mode-hot-ember:nth-of-type(3) { animation-delay:-1.03s; animation-duration:1.62s; }
.es2-mode-hot::after {
  content:''; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(115deg,transparent 35%,#fff4bc85 50%,transparent 65%);
  transform:translateX(-120%); opacity:0;
  animation:es2-mode-hot-sweep 3.8s ease-in-out infinite;
}
@keyframes es2-mode-hot-flame {
  0% { transform:scale(.93,.96) skewX(-6deg); }
  28% { transform:scale(1.05,1.04) skewX(3deg); }
  65% { transform:scale(.91,.90) skewX(-3deg); }
  100% { transform:scale(1.04,1.07) skewX(6deg); }
}
@keyframes es2-mode-hot-ember {
  0% { opacity:0; transform:translate(0,2px) scale(.7); }
  20% { opacity:.85; }
  100% { opacity:0; transform:translate(2px,-13px) scale(.25); }
}
@keyframes es2-mode-hot-sweep {
  0%,35% { transform:translateX(-120%); opacity:0; }
  45% { opacity:.6; }
  68%,100% { transform:translateX(120%); opacity:0; }
}
/* No active animation on hidden menu pages, or under reduced-motion/flashing. */
:is([data-es2-reduce-motion="true"], [data-es2-reduce-flashing="true"], .es2-menu[data-es2-menu-page="heroes"], .es2-menu--archive) .es2-mode-hot :is(.es2-mode-hot-flame,.es2-mode-hot-ember),
:is([data-es2-reduce-motion="true"], [data-es2-reduce-flashing="true"], .es2-menu[data-es2-menu-page="heroes"], .es2-menu--archive) .es2-mode-hot::after { animation:none !important; }
@media(prefers-reduced-motion:reduce),(forced-colors:active) {
  .es2-mode-hot :is(.es2-mode-hot-flame,.es2-mode-hot-ember),.es2-mode-hot::after { animation:none; }
}
@media(forced-colors:active) {
  .es2-mode-hot[data-es2-mode-hot] { color:CanvasText; background:Canvas; border-color:CanvasText; box-shadow:none; text-shadow:none; }
  .es2-mode-hot-fire { filter:none; }
  .es2-mode-hot-flame { fill:CanvasText; }
}
</style>
