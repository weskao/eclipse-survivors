<script setup lang="ts">
import { formatNumber, t } from '../../../i18n'
import { computed } from 'vue'
import HeroPortrait from '../hero-roster/HeroPortrait.vue'
import { MODES } from '../../../meta/modes'
import { ACHIEVEMENTS as META_ACHIEVEMENTS } from '../../../game/content/meta/catalog'
import { ACHIEVEMENTS as LEGACY_ACHIEVEMENTS } from '../../../meta/achievements'
import { COSMETICS } from '../../../meta/cosmetics'
import type { RunRewards, RunStats } from '../../../meta/types'
import Es2Dialog from './Es2Dialog.vue'
import { formatDuration } from './model'
const props = defineProps<{ active: boolean; ending: string; summary: string; result?: RunStats | null; rewards?: RunRewards | null }>()
const emit = defineEmits<{ again: []; home: [] }>()
const victory = computed(() => props.result?.victory === true)
const achievementNames = new Map([...LEGACY_ACHIEVEMENTS, ...META_ACHIEVEMENTS].map(item => [item.id, item.title]))
const cosmeticNames = new Map(COSMETICS.map(item => [item.id, item.name]))
const subtitle = computed(() => {
  if (!props.result) return t(props.summary)
  const summary = t('存活 {seconds} 秒 · 擊敗 {kills} 隻魔物 · 等級 {level}', {
    seconds: props.result.seconds, kills: props.result.kills, level: props.result.level,
  })
  return props.summary.includes('儲存未確認')
    ? summary + t(' · ⚠ 儲存未確認，未發放永久獎勵') : summary
})
const stats = computed(() => props.result ? [
  { title: '存活時間', value: formatDuration(props.result.seconds) },
  { title: '魔物擊殺', value: String(props.result.kills) },
  { title: '英雄等級', value: `LV. ${props.result.level}` },
  { title: '造成傷害', value: formatNumber(props.result.damageDealt) },
  { title: '承受傷害', value: formatNumber(props.result.damageTaken) },
  { title: '剩餘生命', value: String(props.result.remainingHp) },
] : [])
</script>
<template>
  <Es2Dialog :active="active" :title="t(ending)" :subtitle="subtitle" wide :dismissible="false" :tone="victory ? 'victory' : 'defeat'">
    <div class="es2-result">
      <div class="es2-result-hero"><HeroPortrait v-if="result" :hero-id="result.specializationId ?? result.hero" :alt="t('本次遠征英雄：' + (result.specializationId ?? result.hero))" /><span class="es2-result-crown" aria-hidden="true">{{ victory ? '♛' : '⚔' }}</span></div>
      <p class="es2-result-status">{{ t(victory ? '✦ 勝利 · 黎明重現 ✦' : '✧ 戰敗 · 長夜未盡 ✧') }}</p>
      <p v-if="result">{{ t(MODES[result.mode].label) }}</p>
      <div class="es2-stat-strip es2-result-stats"><div v-for="stat in stats" :key="stat.title"><b>{{ stat.value }}</b><small>{{ t(stat.title) }}</small></div></div>
      <div v-if="rewards" class="es2-reward-strip"><strong>✧ +{{ rewards.embers }} {{ t("暮光餘燼") }}</strong><span v-for="id in rewards.newAchievements" :key="id">{{ t("新成就：") }}{{ t(achievementNames.get(id) ?? id) }}</span><span v-for="id in rewards.newCosmetics" :key="id">{{ t("新造型：") }}{{ t(cosmeticNames.get(id) ?? id) }}</span></div>
    </div>
    <template #actions><button type="button" class="es2-primary" @click="emit('again')">{{ t("再次挑戰 ✦") }}</button><button type="button" class="es2-secondary" @click="emit('home')">{{ t("返回主選單") }}</button></template>
  </Es2Dialog>
</template>
