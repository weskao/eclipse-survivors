<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../../../i18n'
import type { HeroId } from '../../../game/types'
import { getHeroActiveDefinition } from '../../../game/content/heroes/classic-active'
import { heroActiveTheme } from './active-presentation'
import Es2SkillSummary from '../menu/Es2SkillSummary.vue'
const props = withDefaults(defineProps<{ heroId: HeroId; compact?: boolean; showHero?: boolean }>(), { compact: false, showHero: false })
const skill = computed(() => getHeroActiveDefinition(props.heroId))
const name = computed(() => t(skill.value.special.split('：')[0]))
</script>
<template>
  <Es2SkillSummary :data-hero-active-summary="compact ? 'compact' : 'full'" :data-active-hero="heroId" :style="heroActiveTheme(heroId)"
    :icon="skill.specialIconSrc" :icon-alt="t('{name} 主動技能圖示', { name: t(skill.label) })"
    :title="name" :detail="skill.specialCooldown + 's'" :detail-label="t('冷卻 {seconds} 秒', { seconds: skill.specialCooldown })"
    :description="t(skill.special, skill.specialParams)" :eyebrow="t('主動技能')" :owner="showHero ? t(skill.label) : undefined" :compact="compact" />
</template>
