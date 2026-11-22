<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { HERO_DEFINITIONS, type SpecializationId, type SpecializationSnapshot } from '../../../game/content/heroes'

const props = withDefaults(defineProps<{
  heroId: SpecializationId
  snapshot: SpecializationSnapshot
  active?: boolean
}>(), { active: false })
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
  <div class="es2-hero-special" :aria-label="hero.label + ' 主動技能'">
    <button type="button" class="es2-hero-special__button" data-hero-special
      aria-keyshortcuts="Q" :aria-label="hero.special + (ready ? '，可施放，按 Q' : '，尚未就緒')"
      :disabled="!ready" @click="trigger">
      <span class="es2-hero-special__name">{{ hero.special.split('：')[0] }}</span>
      <span class="es2-hero-special__hint">{{ ready ? 'Q · 施放' : !active ? '不可施放' : Number.isFinite(remaining) ? remaining.toFixed(1) + 's' : '不可施放' }}</span>
      <span class="es2-hero-special__fill" aria-hidden="true" :style="{ width: progress + '%' }"></span>
    </button>
    <span v-if="snapshot.stealth > 0" class="es2-hero-special__status" role="status">潛行 {{ snapshot.stealth.toFixed(1) }} 秒</span>
    <span v-if="snapshot.barrier > 0" class="es2-hero-special__status" role="status">屏障 {{ Math.ceil(snapshot.barrier) }}</span>
    <span v-if="snapshot.companions.length" class="es2-hero-special__status" role="status">靈體 {{ snapshot.companions.length }} / 3</span>
  </div>
</template>

<style scoped>
.es2-hero-special { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; color: #f7dfb9; }
.es2-hero-special__button { position: relative; overflow: hidden; min-width: 112px; min-height: 58px; border: 2px solid #daa676; border-radius: 12px; background: #2c1831; color: #fff2d8; font: inherit; font-weight: 700; cursor: pointer; touch-action: manipulation; padding: .55rem .9rem; display: grid; gap: .15rem; }
.es2-hero-special__button:focus-visible { outline: 3px solid #ffe4a9; outline-offset: 3px; }
.es2-hero-special__button:disabled { opacity: .7; cursor: not-allowed; }
.es2-hero-special__name, .es2-hero-special__hint { position: relative; z-index: 1; }
.es2-hero-special__hint { font-size: .77rem; font-weight: 500; }
.es2-hero-special__fill { position: absolute; inset: auto auto 0 0; height: 5px; background: #df5979; transition: width .1s linear; }
.es2-hero-special__status { padding: .3rem .55rem; border: 1px solid #947f69; border-radius: 7px; background: #1c1b2a; font-size: .8rem; }
@media (prefers-reduced-motion: reduce) { .es2-hero-special__fill { transition: none; } }
</style>
