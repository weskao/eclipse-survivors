<script setup lang="ts">
import { t } from '../../../i18n'
import { nextTick, ref } from 'vue'
import { HERO_DEFINITIONS, type SpecializationId } from '../../../game/content/heroes'
import { PRODUCTION_HERO_POSE_SOURCES } from '../../../game/render/es2/production-heroes'
import HeroPortrait from './HeroPortrait.vue'
import HeroStats from './HeroStats.vue'
import type { JobId } from '../../../game/types'

const props = withDefaults(defineProps<{
  selectedId?: SpecializationId | JobId | null
  disabled?: boolean
}>(), { selectedId: null, disabled: false })
const emit = defineEmits<{ select: [id: SpecializationId]; details: [id: SpecializationId] }>()
const heroes = Object.values(HERO_DEFINITIONS)
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
  root.value?.querySelector<HTMLButtonElement>(`[data-hero-id="${next.id}"]`)?.focus({ preventScroll: true })
}
</script>

<template>
  <section ref="root" class="es2-roster" role="group" :aria-label="t('ES2 新英雄選擇')">
    <div v-for="hero in heroes" :key="hero.id" class="es2-roster__card-shell">
      <button type="button" class="es2-roster__card es2-hero-select-card" data-ui-sfx="managed"
      :data-hero-id="hero.id" :aria-pressed="selectedId === hero.id" :disabled="disabled"
      :class="{ 'es2-roster__card--selected': selectedId === hero.id }"
      :aria-label="[t(hero.label), t(hero.subtitle), t(hero.description), t(hero.strengths.join(' / ')), t(hero.weaknesses.join(' / '))].join(' · ')"
      @click="select(hero.id)" @keydown="move($event, hero.id)">
      <span class="es2-hero-action-preview" :style="{ backgroundImage: `url(${PRODUCTION_HERO_POSE_SOURCES[hero.id].action})` }" aria-hidden="true"></span>
      <HeroPortrait class="es2-roster__portrait" :hero-id="hero.id" :alt="t('{name} 角色插畫', { name: t(hero.label) })" />
      <span class="es2-hero-copy">
        <strong>{{ t(hero.label) }}</strong>
        <span class="es2-roster__subtitle">{{ t(hero.subtitle) }}</span>
        <span class="es2-roster__description">{{ t(hero.description) }}</span>
        <HeroStats class="es2-roster__stats" :stats="hero.stats" />
        <span class="es2-roster__gear">{{ t("起始武器 ·") }} {{ t(hero.startingEquipment) }}</span>
        <span class="es2-roster__skill">
          <img data-hero-skill-icon class="es2-roster__skill-icon" :src="hero.specialIconSrc"
            :alt="t('{name} 主動技能圖示', { name: t(hero.label) })" width="44" height="44"
            loading="lazy" decoding="async" draggable="false" />
          <span>{{ t("主動技能 ·") }} {{ t(hero.special, hero.specialParams) }}{{ t("（冷卻") }} {{ hero.specialCooldown }} {{ t("秒）") }}</span>
        </span>
        <span class="es2-roster__traits">{{ t("優勢 ·") }} {{ t(hero.strengths.join(' / ')) }}</span>
        <span class="es2-roster__traits">{{ t("弱點 ·") }} {{ t(hero.weaknesses.join(' / ')) }}</span>
        <span class="es2-roster__selection es2-hero-selection-status" :data-es2-hero-selected="selectedId === hero.id ? '' : undefined">{{ t(selectedId === hero.id ? '✓ 已選擇' : '選擇英雄') }}</span>
      </span>
      </button>
      <button type="button" class="es2-hero-detail-trigger" data-ui-sfx="select"
        :data-es2-hero-details="hero.id" :aria-label="t('查看英雄詳情') + ' · ' + t(hero.label)"
        aria-haspopup="dialog" @click="emit('details', hero.id)"><span aria-hidden="true">i</span></button>
    </div>
  </section>
</template>

<style scoped>
.es2-roster { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1rem; width: 100%; }
.es2-roster__card:disabled { cursor: not-allowed; opacity: .55; }
.es2-roster__portrait { display: block; width: 100%; height: clamp(165px,27vw,360px); object-fit: contain; }
.es2-roster__subtitle, .es2-roster__traits { color: #cebeb6; font-size: .8rem; }
.es2-roster__description, .es2-roster__skill { font-size: .86rem; line-height: 1.45; }
.es2-roster__skill { display: flex; align-items: center; gap: .65rem; }
.es2-roster__skill-icon { width: 44px; height: 44px; flex: 0 0 44px; object-fit: contain; border-radius: 8px; background: #100f20; }
.es2-roster__stats, .es2-roster__gear { color: #edc58e; font-size: .83rem; }
.es2-roster__selection { padding-top: .55rem; font-weight: 700; }
@media (max-width: 760px) { .es2-roster { grid-template-columns: 1fr; } .es2-roster__portrait { height: 180px; } }
@media (prefers-reduced-motion: reduce) { .es2-roster__card { transition: none; } }
</style>
