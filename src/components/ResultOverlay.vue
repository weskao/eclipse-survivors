<script setup lang="ts">
import { computed } from 'vue'
import { ACHIEVEMENTS } from '../meta/achievements'
import { MODES } from '../meta/modes'
import { MONSTER_ENTRIES } from '../meta/compendium'
import type { RunRewards, RunStats } from '../meta/types'

const props = defineProps<{
  active: boolean; ending: string; summary: string
  runResult?: RunStats | null; rewards?: RunRewards | null
}>()
const emit = defineEmits<{ again: []; home: [] }>()
const duration = computed(() => {
  const seconds = Math.floor(props.runResult?.seconds ?? 0)
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
})
</script>

<template>
  <div id="result" class="overlay" :class="{ active }">
    <div class="panel result-panel" :class="runResult?.victory ? 'result-victory' : 'result-defeat'">
      <span class="result-kicker">✦ ECLIPSE SURVIVORS · EXPEDITION REPORT ✦</span>
      <div class="result-emblem" aria-hidden="true">{{ runResult?.victory ? '♛' : '⚔' }}</div>
      <h2 id="ending">{{ ending }}</h2>
      <p class="result-mode">{{ runResult ? MODES[runResult.mode].label : '遠征結算' }}</p>
      <p id="summary">{{ summary }}</p>
      <div v-if="runResult" class="result-stats">
        <div><small>存活時間</small><strong>{{ duration }}</strong></div>
        <div><small>魔物擊殺</small><strong>{{ runResult.kills }}</strong></div>
        <div><small>英雄等級</small><strong>LV. {{ runResult.level }}</strong></div>
        <div><small>造成傷害</small><strong>{{ runResult.damageDealt.toLocaleString() }}</strong></div>
        <div><small>承受傷害</small><strong>{{ runResult.damageTaken.toLocaleString() }}</strong></div>
        <div><small>剩餘生命</small><strong>{{ runResult.remainingHp }}</strong></div>
      </div>
      <div v-if="runResult" class="result-breakdown">
        <strong>征討紀錄</strong>
        <span v-for="entry in MONSTER_ENTRIES.filter(m => runResult?.enemies[m.id])" :key="entry.id">{{ entry.label }} ×{{ runResult.enemies[entry.id] }}</span>
        <span v-if="!Object.values(runResult.enemies).some(Boolean)">尚無魔物擊殺</span>
      </div>
      <div v-if="runResult?.abilities.length" class="result-abilities"><strong>覺醒能力</strong><span>{{ runResult.abilities.length }} 種</span></div>
      <div v-if="rewards" class="result-rewards">
        <strong>✦ +{{ rewards.embers }} 暮光餘燼</strong>
        <div v-for="id in rewards.newAchievements" :key="id" class="result-award">
          <span>🏅 新成就：{{ ACHIEVEMENTS.find(a => a.id === id)?.title }}</span>
        </div>
        <div v-for="id in rewards.newCosmetics" :key="id" class="result-award"><span>✧ 新造型：{{ id }}</span></div>
      </div>
      <div class="result-actions">
        <button class="cta" id="again" @click="emit('again')">再次挑戰 ✦</button>
        <button class="ghost" id="home" @click="emit('home')">返回選角 · 殿堂</button>
      </div>
    </div>
  </div>
</template>
