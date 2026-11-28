<script setup lang="ts">
import { computed } from 'vue'
import { vImageShimmer } from '../../shared/image-shimmer'
import { getHeroActiveDefinition } from '../../../game/content/heroes/classic-active'
import { t } from '../../../i18n'
import { HERO_DEFINITIONS, isSpecializationId } from '../../../game/content/heroes'
import { PRODUCTION_HERO_POSE_SOURCES } from '../../../game/render/es2/production-heroes'
import { cosmeticStyle } from '../../../meta/cosmetics'
import type { HeroId } from '../../../game/types'
import type { CosmeticId } from '../../../meta/types'
import HeroPortrait from './HeroPortrait.vue'
import HeroStats from './HeroStats.vue'
import HeroActiveSummary from './HeroActiveSummary.vue'

const props = defineProps<{
  heroId: HeroId
  name: string
  subtitle: string
  stats: { hp: number; damage: number; speed: number; delay: number }
  selected: boolean
  disabled?: boolean
  cosmetic?: CosmeticId
}>()
const emit = defineEmits<{ select: []; details: []; keydown: [event: KeyboardEvent] }>()
const specialization = computed(() => isSpecializationId(props.heroId) ? HERO_DEFINITIONS[props.heroId] : null)
const activeSkill = computed(() => getHeroActiveDefinition(props.heroId))
const accessibleName = computed(() => {
  const hero = specialization.value
  const parts = [t(props.name), t(props.subtitle), t(activeSkill.value.special, activeSkill.value.specialParams)]
  if (hero) parts.push(t(hero.description), t(hero.strengths.join(' / ')), t(hero.weaknesses.join(' / ')))
  return parts.join(' · ')
})
</script>

<template>
  <div :class="specialization ? 'es2-roster__card-shell' : 'es2-hero-card-shell'">
    <button type="button" class="es2-hero-select-card" data-ui-sfx="managed"
      :class="[specialization ? 'es2-roster__card' : 'es2-hero-card',
        { 'es2-roster__card--selected': specialization && selected, 'es2-hero-active': !specialization && selected }]"
      :data-hero="specialization ? undefined : heroId" :data-hero-id="specialization ? heroId : undefined"
      :data-es2-cosmetic="specialization ? undefined : (cosmetic ?? heroId + '-default')"
      :style="specialization ? undefined : cosmeticStyle(cosmetic)"
      :aria-pressed="selected" :disabled="disabled" :aria-label="accessibleName"
      @click="!disabled && emit('select')" @keydown="!disabled && emit('keydown', $event)">
      <span v-if="specialization" v-image-shimmer="PRODUCTION_HERO_POSE_SOURCES[specialization.id].action" class="es2-hero-action-preview"
        :style="{ backgroundImage: 'url(' + PRODUCTION_HERO_POSE_SOURCES[specialization.id].action + ')' }" aria-hidden="true"></span>
      <HeroPortrait :class="specialization ? 'es2-roster__portrait' : undefined" :hero-id="heroId"
        :alt="t(specialization ? '{name} 角色插畫' : '{name} 原始角色插畫', { name: t(name) })" />
      <span class="es2-hero-copy">
        <strong>{{ t(name) }}</strong>
        <span v-if="specialization" class="es2-roster__subtitle">{{ t(subtitle) }}</span>
        <small v-else>{{ t(subtitle) }}</small>
        <span v-if="specialization" class="es2-roster__description">{{ t(specialization.description) }}</span>
        <HeroStats class="es2-roster__stats" :data-es2-classic-preview="specialization ? undefined : ''" :stats="stats" />
        <template v-if="specialization">
          <span class="es2-roster__gear">{{ t("起始武器 ·") }} {{ t(specialization.startingEquipment) }}</span>
        </template>
        <HeroActiveSummary :hero-id="heroId" compact />
        <template v-if="specialization">
          <span class="es2-roster__traits">{{ t("優勢 ·") }} {{ t(specialization.strengths.join(' / ')) }}</span>
          <span class="es2-roster__traits">{{ t("弱點 ·") }} {{ t(specialization.weaknesses.join(' / ')) }}</span>
        </template>
        <span class="es2-hero-selection-status" :class="specialization ? 'es2-roster__selection' : 'es2-hero-selection'"
          :data-es2-hero-selected="selected ? '' : undefined">{{ t(selected ? '✓ 已選擇' : '選擇英雄') }}</span>
      </span>
    </button>
    <button type="button" class="es2-hero-detail-trigger" data-ui-sfx="select"
      :data-es2-hero-details="heroId" :aria-label="t('查看英雄詳情') + ' · ' + t(name)"
      aria-haspopup="dialog" @click="emit('details')"><span aria-hidden="true">i</span></button>
  </div>
</template>

<style scoped>
.es2-roster__card:disabled { cursor: not-allowed; opacity: .55; }
.es2-roster__portrait { display: block; width: 100%; height: clamp(165px,27vw,360px); object-fit: contain; }
.es2-roster__subtitle, .es2-roster__traits { color: #cebeb6; font-size: .8rem; }
.es2-roster__description { font-size: .86rem; line-height: 1.45; }
.es2-roster__card .es2-roster__stats, .es2-roster__gear { color: #edc58e; font-size: .83rem; }
.es2-roster__selection { padding-top: .55rem; font-weight: 700; }
@media (max-width: 760px) { .es2-roster__portrait { height: 180px; } }
@media (prefers-reduced-motion: reduce) { .es2-roster__card { transition: none; } }
</style>
