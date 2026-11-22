<script setup lang="ts">
import { computed } from 'vue'
import { ART_URLS } from '../../../game/art'
import { MODES } from '../../../meta/modes'
import type { RunRewards, RunStats } from '../../../meta/types'
import Es2Dialog from './Es2Dialog.vue'
import { formatDuration } from './model'
const props = defineProps<{ active: boolean; ending: string; summary: string; result?: RunStats | null; rewards?: RunRewards | null }>()
const emit = defineEmits<{ again: []; home: [] }>()
const victory = computed(() => props.result?.victory === true)
const stats = computed(() => props.result ? [
  { title: '存活時間', value: formatDuration(props.result.seconds) },
  { title: '魔物擊殺', value: String(props.result.kills) },
  { title: '英雄等級', value: `LV. ${props.result.level}` },
  { title: '造成傷害', value: props.result.damageDealt.toLocaleString() },
  { title: '承受傷害', value: props.result.damageTaken.toLocaleString() },
  { title: '剩餘生命', value: String(props.result.remainingHp) },
] : [])
</script>
<template>
  <Es2Dialog :active="active" :title="ending" :subtitle="summary" wide :dismissible="false" :tone="victory ? 'victory' : 'defeat'">
    <div class="es2-result">
      <div class="es2-result-hero"><img v-if="result" :src="ART_URLS[result.hero]" :alt="'本次遠征英雄：' + result.hero" /><span class="es2-result-crown" aria-hidden="true">{{ victory ? '♛' : '⚔' }}</span></div>
      <p class="es2-result-status">{{ victory ? '✦ VICTORY · THE DAWN RETURNS ✦' : '✧ DEFEAT · THE NIGHT ENDURES ✧' }}</p>
      <p v-if="result">{{ MODES[result.mode].label }}</p>
      <div class="es2-stat-strip es2-result-stats"><div v-for="stat in stats" :key="stat.title"><b>{{ stat.value }}</b><small>{{ stat.title }}</small></div></div>
      <div v-if="rewards" class="es2-reward-strip"><strong>✧ +{{ rewards.embers }} 暮光餘燼</strong><span v-for="id in rewards.newAchievements" :key="id">新成就：{{ id }}</span><span v-for="id in rewards.newCosmetics" :key="id">新造型：{{ id }}</span></div>
    </div>
    <template #actions><button type="button" class="es2-primary" @click="emit('again')">再次挑戰 ✦</button><button type="button" class="es2-secondary" @click="emit('home')">返回主選單</button></template>
  </Es2Dialog>
</template>
