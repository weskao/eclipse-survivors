<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, onMounted, onUnmounted } from 'vue'
import { HERO_DEFINITIONS, type SpecializationId, type SpecializationSnapshot } from '../../../game/content/heroes'

const props = withDefaults(defineProps<{
  heroId: SpecializationId
  snapshot: SpecializationSnapshot
  active?: boolean
  joystickSide?: 'left' | 'right'
}>(), { active: false, joystickSide: 'left' })
const emit = defineEmits<{ activate: [] }>()
const hero = computed(() => HERO_DEFINITIONS[props.heroId])
const remaining = computed(() => Number.isFinite(props.snapshot.cooldown) ? Math.max(0, props.snapshot.cooldown) : Infinity)
const ready = computed(() => props.active && remaining.value === 0)
const progress = computed(() => Number.isFinite(remaining.value)
  ? Math.min(100, Math.max(0, 100 * remaining.value / hero.value.specialCooldown)) : 100)

function trigger(): void { if (ready.value) emit('activate') }
function keydown(event: KeyboardEvent): void {
  if (!ready.value || event.code !== 'KeyQ' || event.repeat || event.isComposing
    || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const target = event.target
  if (target instanceof HTMLElement && (target.isContentEditable
    || !!target.closest('input, textarea, select, [contenteditable="true"]'))) return
  event.preventDefault()
  trigger()
}
onMounted(() => window.addEventListener('keydown', keydown))
onUnmounted(() => window.removeEventListener('keydown', keydown))
</script>

<template>
  <div class="es2-hero-special" :data-hero="heroId" :data-side="joystickSide" :aria-label="t('{name} 主動技能', { name: t(hero.label) })">
    <button type="button" class="es2-hero-special__button" :data-ready="ready ? 'true' : 'false'" data-hero-special data-ui-sfx="managed"
      aria-keyshortcuts="Q" :aria-label="t(hero.special + (ready ? '，可施放，按 Q' : '，尚未就緒'))"
      :disabled="!ready" @click="trigger">
      <img data-hero-special-icon class="es2-hero-special__icon" :src="hero.specialIconSrc" alt=""
        width="44" height="44" decoding="async" draggable="false" />
      <span class="es2-hero-special__name">{{ t(hero.special.split('：')[0]) }}</span>
      <span class="es2-hero-special__hint">{{ t(ready ? 'Q · 施放' : !active ? '不可施放' : Number.isFinite(remaining) ? remaining.toFixed(1) + 's' : '不可施放') }}</span>
      <span class="es2-hero-special__fill" aria-hidden="true" :style="{ width: progress + '%' }"></span>
    </button>
    <span v-if="snapshot.stealth > 0" class="es2-hero-special__status" role="status">{{ t("潛行") }} {{ snapshot.stealth.toFixed(1) }} {{ t("秒") }}</span>
    <span v-if="snapshot.barrier > 0" class="es2-hero-special__status" role="status">{{ t("屏障") }} {{ Math.ceil(snapshot.barrier) }}</span>
    <span v-if="snapshot.companions.length" class="es2-hero-special__status" role="status">{{ t("靈體") }} {{ snapshot.companions.length }} / 3</span>
  </div>
</template>

<style scoped>
.es2-hero-special { position: fixed; right: max(112px, calc(18px + env(safe-area-inset-right))); bottom: calc(26px + env(safe-area-inset-bottom)); z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; color: #f7dfb9; }
@media (max-width: 760px) { .es2-hero-special { right: max(104px, calc(12px + env(safe-area-inset-right))); bottom: calc(24px + env(safe-area-inset-bottom)); } }
@media (max-height: 440px) { .es2-hero-special { bottom: max(5px, env(safe-area-inset-bottom)); } }
.es2-hero-special__button { position: relative; overflow: hidden; min-width: 160px; min-height: 62px; border: 2px solid #daa676; border-radius: 12px; background: #2c1831; color: #fff2d8; font: inherit; font-weight: 700; cursor: pointer; touch-action: manipulation; padding: .4rem .65rem; display: grid; grid-template-columns: 44px 1fr; grid-template-rows: auto auto; column-gap: .5rem; align-items: center; }
.es2-hero-special__button:focus-visible { outline: 3px solid #ffe4a9; outline-offset: 3px; }
.es2-hero-special__button:disabled { opacity: .7; cursor: not-allowed; }
.es2-hero-special__icon { grid-column: 1; grid-row: 1 / 3; width: 44px; height: 44px; border-radius: 8px; object-fit: contain; position: relative; z-index: 1; }
.es2-hero-special__name, .es2-hero-special__hint { position: relative; z-index: 1; grid-column: 2; }
.es2-hero-special__name { grid-row: 1; }
.es2-hero-special__hint { grid-row: 2; }
@media (max-width: 760px) {
  .es2-hero-special__button { min-width: 66px; width: 66px; min-height: 66px; grid-template-columns: 1fr; grid-template-rows: 44px auto; justify-items: center; padding: .25rem; }
  .es2-hero-special__icon { grid-column: 1; grid-row: 1; }
  .es2-hero-special__name { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .es2-hero-special__hint { grid-column: 1; grid-row: 2; font-size: .64rem; line-height: 1; }
}
.es2-hero-special__hint { font-size: .77rem; font-weight: 500; }
.es2-hero-special__fill { position: absolute; inset: auto auto 0 0; height: 5px; background: linear-gradient(90deg, var(--es2-special-accent), var(--es2-special-light)); transition: width .1s linear; }
/* A bounded single-button reveal; no animated sprites or filters in the game canvas. */
.es2-hero-special {
  --es2-special-accent: #aaa0b4;
  --es2-special-light: #e5dce4;
  --es2-special-panel: #241731;
}
.es2-hero-special[data-hero="spirit-summoner"] {
  --es2-special-accent: #85b6b0;
  --es2-special-light: #c3ddd4;
  --es2-special-panel: #122c3b;
}
.es2-hero-special[data-hero="crimson-paladin"] {
  --es2-special-accent: #b99a74;
  --es2-special-light: #ebd2a7;
  --es2-special-panel: #371d2a;
}
.es2-hero-special__button {
  isolation: isolate;
  border-color: var(--es2-special-accent);
  background: radial-gradient(ellipse at 18% 10%, #ffffff16, transparent 65%), var(--es2-special-panel);
  box-shadow: inset 0 1px 0 #ffffff36, 0 3px 12px #05091055;
  transition: border-color .18s ease, box-shadow .18s ease, transform .15s ease;
}
.es2-hero-special__button::before {
  content: '';
  position: absolute;
  inset: -54%;
  pointer-events: none;
  background: linear-gradient(108deg, transparent 20%, #fff3db19 42%, var(--es2-special-light) 50%, transparent 70%);
  opacity: .035;
}
.es2-hero-special__button[data-ready="true"] {
  box-shadow: inset 0 1px 0 #ffffff55, 0 0 0 1px #ffffff18, 0 0 18px color-mix(in srgb, var(--es2-special-accent) 38%, transparent);
}
.es2-hero-special__button[data-ready="true"]::before {
  opacity: .14;
  animation: es2-special-sheen 6.5s ease-in-out infinite;
}
.es2-hero-special__button:active:not(:disabled) { transform: translateY(1px) scale(.98); }
.es2-hero-special__button:disabled { opacity: .86; }
.es2-hero-special__hint { color: var(--es2-special-light); }
.es2-hero-special__icon { filter: drop-shadow(0 0 4px #ffffff44); }
@keyframes es2-special-sheen { 0%, 63%, 100% { transform: translateX(-90%); } 85% { transform: translateX(90%); } }
.es2-hero-special__status { padding: .3rem .55rem; border: 1px solid #947f69; border-radius: 7px; background: #1c1b2a; font-size: .8rem; }
@media (prefers-reduced-motion: reduce) {
  .es2-hero-special__fill { transition: none; }
  .es2-hero-special__button[data-ready="true"]::before { animation: none; opacity: .18; }
  .es2-hero-special__button { transition: none; }
}
@media (orientation: portrait) and (max-width: 760px) {
  .es2-hero-special { right: max(12px, env(safe-area-inset-right)); bottom: calc(151px + env(safe-area-inset-bottom)); max-width: 112px; flex-direction: column; align-items: flex-end; }
  .es2-hero-special[data-side="right"] { right: auto; left: max(12px, env(safe-area-inset-left)); align-items: flex-start; }
  .es2-hero-special__status { font-size: 10px; padding: 2px 5px; }
}
@media (orientation: landscape) and (max-height: 440px) {
  .es2-hero-special { right: max(8px, env(safe-area-inset-right)); bottom: calc(94px + env(safe-area-inset-bottom)); max-width: 100px; }
  .es2-hero-special[data-side="right"] { right: auto; left: max(8px, env(safe-area-inset-left)); }
  .es2-hero-special__status { font-size: 10px; padding: 2px 5px; }
}
</style>
