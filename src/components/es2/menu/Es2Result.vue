<script setup lang="ts">
import { formatNumber, t } from '../../../i18n'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import HeroPortrait from '../hero-roster/HeroPortrait.vue'
import { MODES } from '../../../meta/modes'
import { ACHIEVEMENTS as META_ACHIEVEMENTS } from '../../../game/content/meta/catalog'
import { ACHIEVEMENTS as LEGACY_ACHIEVEMENTS } from '../../../meta/achievements'
import { COSMETICS } from '../../../meta/cosmetics'
import type { RunRewards, RunStats } from '../../../meta/types'
import Es2Dialog from './Es2Dialog.vue'
import '../../../styles/es2/result-celebration.css'
import { formatDuration } from './model'
import { JOB } from '../../../game/constants'
import { HERO_DEFINITIONS } from '../../../game/content/heroes'
const props = defineProps<{ active: boolean; ending: string; summary: string; result?: RunStats | null; rewards?: RunRewards | null; still?: boolean }>()
const emit = defineEmits<{ again: []; home: [] }>()
const victory = computed(() => props.result?.victory === true)
const heroName = computed(() => !props.result ? '' : t(props.result.specializationId
  ? HERO_DEFINITIONS[props.result.specializationId].label : JOB[props.result.hero].label))
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
const progress = ref(1)
const revealing = computed(() => progress.value < 1)
let frame: number | undefined
let revealedRun: string | undefined
function finishReveal(): void {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
  progress.value = 1
}
watch(() => [props.active, props.result?.id, props.still] as const, ([active,id,still]) => {
  finishReveal()
  if (!active || !id || id === revealedRun) return
  revealedRun = id
  if (still || typeof requestAnimationFrame !== 'function') return
  progress.value = 0
  let start: number | undefined
  const tick = (now: number) => {
    start ??= now
    progress.value = Math.min(1, (now - start) / 1800)
    if (progress.value < 1) frame = requestAnimationFrame(tick)
    else frame = undefined
  }
  frame = requestAnimationFrame(tick)
}, { immediate: true })
onBeforeUnmount(finishReveal)
const count = (value: number, delay = 0, decimal = false): number => {
  if (progress.value === 1) return value
  const p = Math.max(0, Math.min(1, (progress.value - delay) / (.92 - delay)))
  const n = value * (1 - (1 - p) ** 3)
  return decimal ? Math.floor(n * 10) / 10 : Math.floor(n)
}
const stat = (id: string, title: string, value: number, format: (n: number) => string = formatNumber, decimal = false) =>
  ({ id, title, value, format, decimal })
const stats = computed(() => props.result ? [
  stat('time','存活時間',props.result.seconds,formatDuration),
  stat('kills','魔物擊殺',props.result.kills,String),
  stat('level','英雄等級',props.result.level,n => `LV. ${n}`),
  stat('damage','造成傷害',props.result.damageDealt),
  stat('taken','承受傷害',props.result.damageTaken),
  stat('hp','剩餘生命',props.result.remainingHp,String),
  ...(props.result.xpEarned === undefined ? [] : [
    stat('xp','經驗值獲得',props.result.xpEarned),
    stat('dps','平均每秒傷害',Math.round(props.result.damageDealt / Math.max(1,props.result.seconds))),
    stat('kpm','每分鐘擊殺',Math.round(props.result.kills * 60 / Math.max(1,props.result.seconds))),
  ]),
  ...(props.result.firstUpgradeSeconds === undefined ? [] : [stat('first-upgrade','首次升級時間',props.result.firstUpgradeSeconds,n => n.toFixed(1) + 's',true)]),
  ...(props.result.bestKillStreak === undefined ? [] : [stat('streak','最高連殺',props.result.bestKillStreak)]),
  ...(props.result.bestMultiKill === undefined ? [] : [stat('multikill','最高瞬間多殺',props.result.bestMultiKill)]),
] : [])
</script>
<template>
  <Es2Dialog :active="active" :title="t(ending)" :subtitle="subtitle" wide variant="result" :dismissible="false" :tone="victory ? 'victory' : 'defeat'">
    <template #header-actions><button type="button" class="es2-close es2-result-skip" :disabled="!revealing" :style="{ visibility: revealing ? 'visible' : 'hidden' }" :aria-label="t('跳過結算動畫')" :title="t('跳過結算動畫')" @click="finishReveal">»</button></template>
    <div class="es2-result" :class="{ 'es2-result--victory': victory }" :data-result-revealing="revealing ? 'true' : undefined" @click="finishReveal">
      <div v-if="active && victory" class="es2-victory-celebration" data-es2-victory-celebration aria-hidden="true">
        <span class="es2-victory-halo"></span>
        <span v-for="index in 16" :key="index" class="es2-victory-spark" data-es2-victory-spark
          :style="{ '--spark-angle': `${(index - 1) * 22.5}deg`, '--spark-distance': `${110 + (index % 3) * 23}px`, '--spark-delay': `${(index % 4) * 0.07}s` }"></span>
      </div>
      <div class="es2-result-banner">
        <span class="es2-result-crown" aria-hidden="true">{{ victory ? '♛' : '⚔' }}</span>
        <div class="es2-result-hero"><HeroPortrait v-if="result" :hero-id="result.specializationId ?? result.hero" :alt="t('本次遠征英雄：{name}', { name: heroName })" /></div>
        <p class="es2-result-status">{{ t(victory ? '✦ 勝利 · 黎明重現 ✦' : '✧ 戰敗 · 長夜未盡 ✧') }}</p>
        <p v-if="result" class="es2-result-mode">{{ t(MODES[result.mode].label) }}</p>
      </div>
      <div class="es2-result-report">
        <div class="es2-stat-strip es2-result-stats"><div v-for="(entry,index) in stats" :key="entry.id" :data-result-stat="entry.id" :style="{ '--result-delay': Math.min(index,5)*65 + 'ms' }"><b :aria-label="entry.format(entry.value)" :data-result-target="entry.format(entry.value)">{{ entry.format(count(entry.value,Math.min(index,5)*.025,entry.decimal)) }}</b><small>{{ t(entry.title) }}</small></div></div>
        <div v-if="rewards" class="es2-reward-strip"><strong>✧ +<span class="es2-result-ember-value" data-result-reward :aria-label="String(rewards.embers)">{{ count(rewards.embers,.24) }}</span> {{ t("暮光餘燼") }}</strong>
          <p v-if="rewards.newAchievements.length" class="es2-reward-group"><small>{{ t("新成就：") }}</small><span v-for="id in rewards.newAchievements" :key="id">{{ t(achievementNames.get(id) ?? id) }}</span></p>
          <p v-if="rewards.newCosmetics.length" class="es2-reward-group"><small>{{ t("新造型：") }}</small><span v-for="id in rewards.newCosmetics" :key="id">{{ t(cosmeticNames.get(id) ?? id) }}</span></p>
        </div>
        <slot name="cloud" />
      </div>
    </div>
    <template #actions><button type="button" class="es2-primary" data-ui-sfx="managed" @click="finishReveal(); emit('again')">{{ t("再次挑戰 ✦") }}</button><button type="button" class="es2-secondary" data-ui-sfx="managed" @click="finishReveal(); emit('home')">{{ t("返回主選單") }}</button></template>
  </Es2Dialog>
</template>
