<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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

// One decorative flourish per real transition (ready gained, cast spent); never on mount.
const flourish = ref<'ready' | 'cast' | null>(null)
watch(ready, (now, was) => { if (now && !was) flourish.value = 'ready' })
watch(remaining, (now, was) => { if (was === 0 && now > 0) flourish.value = 'cast' })

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
    <button type="button" class="es2-hero-special__button" :data-ready="ready ? 'true' : 'false'" :data-flourish="flourish ?? undefined" data-hero-special data-ui-sfx="managed"
      :style="{ '--es2-special-cooldown': (progress / 100).toFixed(3) }"
      aria-keyshortcuts="Q" :aria-label="t(ready ? '{special}，可施放，按 Q' : '{special}，尚未就緒', { special: t(hero.special, hero.specialParams) })"
      :disabled="!ready" @click="trigger">
      <span class="es2-hero-special__content">
        <img data-hero-special-icon class="es2-hero-special__icon" :src="hero.specialIconSrc" alt=""
          width="44" height="44" decoding="async" draggable="false" />
        <span class="es2-hero-special__name">{{ t(hero.special.split('：')[0]) }}</span>
        <span class="es2-hero-special__hint">{{ ready ? t('Q · 施放') : active && Number.isFinite(remaining) ? remaining.toFixed(1) + 's' : t('不可施放') }}</span>
      </span>
      <span class="es2-hero-special__flourish" aria-hidden="true" @animationend.self="flourish = null"></span>
      <span class="es2-hero-special__fill" aria-hidden="true" :style="{ width: progress + '%' }"></span>
    </button>
    <div class="es2-hero-special__statuses">
      <span v-if="snapshot.stealth > 0" class="es2-hero-special__status" role="status">{{ t("潛行") }} {{ snapshot.stealth.toFixed(1) }} {{ t("秒") }}</span>
      <span v-if="snapshot.barrier > 0" class="es2-hero-special__status" role="status">{{ t("屏障") }} {{ Math.ceil(snapshot.barrier) }}</span>
      <span v-if="snapshot.companions.length" class="es2-hero-special__status" role="status">{{ t("靈體") }} {{ snapshot.companions.length }} / 3</span>
    </div>
  </div>
</template>

<style scoped>
.es2-hero-special { position: fixed; right: max(112px, calc(18px + env(safe-area-inset-right))); bottom: calc(26px + env(safe-area-inset-bottom)); z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; color: #f7dfb9; }
@media (max-width: 760px) { .es2-hero-special { right: max(104px, calc(12px + env(safe-area-inset-right))); bottom: calc(24px + env(safe-area-inset-bottom)); } }
@media (max-height: 440px) { .es2-hero-special { bottom: max(5px, env(safe-area-inset-bottom)); } }
.es2-hero-special__button { appearance: none; position: relative; overflow: clip; width: 180px; min-height: 66px; border: 2px solid #daa676; border-radius: 12px; background: #2c1831; color: #fff2d8; font: inherit; font-weight: 700; cursor: pointer; touch-action: manipulation; padding: 6px 10px 10px; display: block; text-align: center; }
/* A non-native grid owns the content; button chrome and cooldown fill never participate in layout. */
.es2-hero-special__content { position: relative; z-index: 1; display: grid; grid-template-columns: 44px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: .5rem; align-items: center; min-height: 44px; }
.es2-hero-special__button:focus-visible { outline: 3px solid #ffe4a9; outline-offset: 3px; }
.es2-hero-special__button:disabled { opacity: .7; cursor: not-allowed; }
.es2-hero-special__icon { grid-column: 1; grid-row: 1 / 3; width: 44px; height: 44px; border-radius: 8px; object-fit: contain; position: relative; z-index: 1; }
.es2-hero-special__name, .es2-hero-special__hint { position: relative; z-index: 1; grid-column: 2; }
.es2-hero-special__name { grid-row: 1; min-width: 0; overflow-wrap: anywhere; font-size: .9rem; line-height: 1.2; }
.es2-hero-special__hint { grid-row: 2; white-space: nowrap; font-variant-numeric: tabular-nums; line-height: 1.2; }
@media (max-width: 760px), (orientation: landscape) and (max-height: 440px) {
  .es2-hero-special__button { width: 66px; min-height: 66px; padding: 3px 4px 6px; }
  .es2-hero-special__content { grid-template-columns: minmax(0, 1fr); grid-template-rows: 44px auto; justify-items: center; }
  .es2-hero-special__icon { grid-column: 1; grid-row: 1; }
  .es2-hero-special__name { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .es2-hero-special__hint { grid-column: 1; grid-row: 2; font-size: 11px; line-height: 1; white-space: normal; overflow-wrap: anywhere; }
}
.es2-hero-special__hint { font-weight: 500; }
@media (min-width: 761px) and (min-height: 441px) {
  .es2-hero-special__hint { font-size: .77rem; }
}
.es2-hero-special__fill { position: absolute; left: 0; bottom: 0; height: 5px; pointer-events: none; background: linear-gradient(90deg, var(--es2-special-accent), var(--es2-special-light)); transition: width .1s linear; }
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
/* Cooldown sweep over the icon: static paint driven by one custom property, no JS animation loop. */
.es2-hero-special__content::before { content: ''; grid-column: 1; grid-row: 1 / 3; width: 44px; height: 44px; border-radius: 8px; z-index: 2; pointer-events: none; background: conic-gradient(#0a0610b8 calc(var(--es2-special-cooldown, 0) * 360deg), transparent 0); }
@media (max-width: 760px), (orientation: landscape) and (max-height: 440px) { .es2-hero-special__content::before { grid-row: 1; } }
/* Hero-specific ready/cast flourish, clipped by the button; data-flourish clears on animationend. */
.es2-hero-special__flourish { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: 0; border-radius: inherit; }
.es2-hero-special__button[data-flourish] .es2-hero-special__flourish { animation: es2-special-shadow-slash .55s ease-out 1 both; background: linear-gradient(115deg, transparent 38%, var(--es2-special-accent) 46%, #fff 50%, var(--es2-special-light) 53%, transparent 62%); }
.es2-hero-special[data-hero="spirit-summoner"] .es2-hero-special__button[data-flourish] .es2-hero-special__flourish { animation-name: es2-special-spirit-rise; animation-duration: .7s; background: radial-gradient(ellipse 70% 80% at 50% 100%, var(--es2-special-light), color-mix(in srgb, var(--es2-special-accent) 50%, transparent) 45%, transparent 72%); }
.es2-hero-special[data-hero="crimson-paladin"] .es2-hero-special__button[data-flourish] .es2-hero-special__flourish { animation-name: es2-special-aegis-flare; animation-duration: .6s; background: radial-gradient(ellipse at 50% 50%, transparent 52%, color-mix(in srgb, #e04a5c 45%, transparent) 78%, var(--es2-special-light)); box-shadow: inset 0 0 0 2px var(--es2-special-light); }
.es2-hero-special__button[data-flourish="cast"] .es2-hero-special__flourish { animation-duration: .8s; }
@keyframes es2-special-shadow-slash { 0% { opacity: 0; transform: translateX(-110%) skewX(-12deg); } 30% { opacity: .95; } 100% { opacity: 0; transform: translateX(110%) skewX(-12deg); } }
@keyframes es2-special-spirit-rise { 0% { opacity: 0; transform: translateY(45%); } 40% { opacity: .85; } 100% { opacity: 0; transform: translateY(-35%); } }
@keyframes es2-special-aegis-flare { 0% { opacity: 0; transform: scale(1.12); } 35% { opacity: .95; transform: scale(1); } 100% { opacity: 0; transform: scale(1); } }
:global([data-es2-reduce-motion="true"]) .es2-hero-special__flourish, :global([data-es2-reduce-flashing="true"]) .es2-hero-special__flourish { display: none; }
/* Out of flow so chips appearing after a cast never move the button. */
.es2-hero-special__statuses { position: absolute; right: calc(100% + .45rem); bottom: 0; display: flex; flex-direction: column; align-items: flex-end; gap: .3rem; white-space: nowrap; pointer-events: none; }
.es2-hero-special__status { padding: .3rem .55rem; border: 1px solid #947f69; border-radius: 7px; background: #1c1b2a; font-size: .8rem; }
@media (prefers-reduced-motion: reduce) {
  .es2-hero-special__fill { transition: none; }
  .es2-hero-special__button[data-ready="true"]::before { animation: none; opacity: .18; }
  .es2-hero-special__button { transition: none; }
  .es2-hero-special__flourish { display: none; }
}
@media (orientation: portrait) and (max-width: 760px) {
  .es2-hero-special { right: max(12px, env(safe-area-inset-right)); bottom: calc(151px + env(safe-area-inset-bottom)); max-width: 112px; flex-direction: column; align-items: flex-end; }
  .es2-hero-special[data-side="right"] { right: auto; left: max(12px, env(safe-area-inset-left)); align-items: flex-start; }
  .es2-hero-special[data-side="right"] .es2-hero-special__statuses { right: auto; left: calc(100% + .45rem); align-items: flex-start; }
  .es2-hero-special__status { font-size: 10px; padding: 2px 5px; }
}
@media (orientation: landscape) and (max-height: 440px) {
  .es2-hero-special { right: max(8px, env(safe-area-inset-right)); bottom: calc(94px + env(safe-area-inset-bottom)); max-width: 100px; }
  .es2-hero-special[data-side="right"] { right: auto; left: max(8px, env(safe-area-inset-left)); }
  .es2-hero-special[data-side="right"] .es2-hero-special__statuses { right: auto; left: calc(100% + .45rem); align-items: flex-start; }
  .es2-hero-special__status { font-size: 10px; padding: 2px 5px; }
}
</style>
