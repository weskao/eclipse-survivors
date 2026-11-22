<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { HERO_DEFINITIONS, type SpecializationId } from '../../../game/content/heroes'
import type { JobId } from '../../../game/types'
import shadowAction from '../../../assets/es2/production/heroes/shadowblade-action@3x.webp'
import summonerAction from '../../../assets/es2/production/heroes/spirit-summoner-action@3x.webp'
import paladinAction from '../../../assets/es2/production/heroes/crimson-paladin-action@3x.webp'

const props = withDefaults(defineProps<{
  selectedId?: SpecializationId | JobId | null
  disabled?: boolean
}>(), { selectedId: null, disabled: false })
const emit = defineEmits<{ select: [id: SpecializationId] }>()
const heroes = Object.values(HERO_DEFINITIONS)
const actionSprites: Record<SpecializationId, string> = {
  shadowblade: shadowAction,
  'spirit-summoner': summonerAction,
  'crimson-paladin': paladinAction,
}
const root = ref<HTMLElement | null>(null)
function select(id: SpecializationId): void { if (!props.disabled) emit('select', id) }

async function move(event: KeyboardEvent, id: SpecializationId): Promise<void> {
  if (props.disabled || event.altKey || event.ctrlKey || event.metaKey) return
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
    : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  if (!direction) return
  event.preventDefault()
  const next = heroes[(heroes.findIndex(hero => hero.id === id) + direction + heroes.length) % heroes.length]
  if (!next) return
  emit('select', next.id)
  await nextTick()
  root.value?.querySelector<HTMLButtonElement>(`[data-hero-id="${next.id}"]`)?.focus()
}
</script>

<template>
  <section ref="root" class="es2-roster" role="group" aria-label="ES2 新英雄選擇">
    <button v-for="hero in heroes" :key="hero.id" type="button" class="es2-roster__card"
      :data-hero-id="hero.id" :aria-pressed="selectedId === hero.id" :disabled="disabled"
      :class="{ 'es2-roster__card--selected': selectedId === hero.id }"
      @click="select(hero.id)" @keydown="move($event, hero.id)">
      <span class="es2-hero-action-preview" :style="{ backgroundImage: `url(${actionSprites[hero.id]})` }" aria-hidden="true"></span>
      <img class="es2-roster__portrait" :src="hero.portraitSrc" :alt="hero.label + ' 角色插畫'"
        width="280" height="320" decoding="async" loading="lazy" draggable="false" />
      <span class="es2-roster__copy">
        <strong>{{ hero.label }}</strong>
        <span class="es2-roster__subtitle">{{ hero.subtitle }}</span>
        <span class="es2-roster__description">{{ hero.description }}</span>
        <span class="es2-roster__stats">生命 {{ hero.stats.hp }} · 攻擊 {{ hero.stats.damage }} · 速度 {{ hero.stats.speed }}</span>
        <span class="es2-roster__gear">起始武器 · {{ hero.startingEquipment }}</span>
        <span class="es2-roster__skill">主動技能 · {{ hero.special }}（冷卻 {{ hero.specialCooldown }} 秒）</span>
        <span class="es2-roster__traits">優勢 · {{ hero.strengths.join(' / ') }}</span>
        <span class="es2-roster__traits">弱點 · {{ hero.weaknesses.join(' / ') }}</span>
        <span class="es2-roster__selection">{{ selectedId === hero.id ? '✓ 已選擇' : '選擇英雄' }}</span>
      </span>
    </button>
  </section>
</template>

<style scoped>
.es2-roster { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1rem; width: 100%; }
.es2-roster__card { position: relative; min-width: 0; border: 1px solid #8e6d54; border-radius: 14px; background: #1d1827; color: #f6e7cf; cursor: pointer; padding: 0; text-align: left; overflow: hidden; touch-action: manipulation; }
.es2-roster__card:hover, .es2-roster__card:focus-visible, .es2-roster__card--selected { outline: 2px solid #e6bd7b; outline-offset: 2px; border-color: #e6bd7b; }
.es2-roster__card:disabled { cursor: not-allowed; opacity: .55; }
.es2-roster__portrait { display: block; width: 100%; height: 210px; object-fit: contain; background: #241b30; }
.es2-roster__copy { display: grid; gap: .3rem; padding: .75rem; }
.es2-roster__copy strong { font-size: 1.1rem; }
.es2-roster__subtitle, .es2-roster__traits { color: #cebeb6; font-size: .8rem; }
.es2-roster__description, .es2-roster__skill { font-size: .86rem; line-height: 1.45; }
.es2-roster__stats, .es2-roster__gear { color: #edc58e; font-size: .83rem; }
.es2-roster__selection { padding-top: .55rem; font-weight: 700; }
@media (max-width: 760px) { .es2-roster { grid-template-columns: 1fr; } .es2-roster__portrait { height: 180px; } }
@media (prefers-reduced-motion: reduce) { .es2-roster__card { transition: none; } }
</style>
