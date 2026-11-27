<script setup lang="ts">
import { t } from '../i18n'
import { computed } from 'vue'
import { ACHIEVEMENTS } from '../meta/achievements'
import { MODES } from '../meta/modes'
import { MONSTER_ENTRIES } from '../meta/compendium'
import type { MonsterKills } from '../game/monster-catalog'
import type { RunRewards, RunStats } from '../meta/types'

const props = defineProps<{
  active: boolean; ending: string; summary: string
  runResult?: RunStats | null; rewards?: RunRewards | null
}>()
const emit = defineEmits<{ again: []; home: [] }>()
const monsterKills = computed<MonsterKills>(() => props.runResult?.monsterKills ?? props.runResult?.enemies ?? {})
const duration = computed(() => {
  const seconds = Math.floor(props.runResult?.seconds ?? 0)
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
})
</script>

<template>
  <div id="result" class="overlay" :class="{ active }">
    <div class="panel result-panel" :class="runResult?.victory ? 'result-victory' : 'result-defeat'">
      <span class="result-kicker">{{ t("✦ ECLIPSE SURVIVORS · EXPEDITION REPORT ✦") }}</span>
      <div class="result-emblem" aria-hidden="true">{{ runResult?.victory ? '♛' : '⚔' }}</div>
      <h2 id="ending">{{ t(ending) }}</h2>
      <p class="result-mode">{{ t(runResult ? MODES[runResult.mode].label : '遠征結算') }}</p>
      <p id="summary">{{ t(summary) }}</p>
      <div v-if="runResult" class="result-stats">
        <div><small>{{ t("存活時間") }}</small><strong>{{ duration }}</strong></div>
        <div><small>{{ t("魔物擊殺") }}</small><strong>{{ runResult.kills }}</strong></div>
        <div><small>{{ t("英雄等級") }}</small><strong>LV. {{ runResult.level }}</strong></div>
        <div><small>{{ t("造成傷害") }}</small><strong>{{ runResult.damageDealt.toLocaleString() }}</strong></div>
        <div><small>{{ t("承受傷害") }}</small><strong>{{ runResult.damageTaken.toLocaleString() }}</strong></div>
        <div><small>{{ t("剩餘生命") }}</small><strong>{{ runResult.remainingHp }}</strong></div>
      </div>
      <div v-if="runResult" class="result-breakdown">
        <strong>{{ t("征討紀錄") }}</strong>
        <span v-for="entry in MONSTER_ENTRIES.filter(m => monsterKills[m.id])" :key="entry.id">{{ t(entry.label) }} ×{{ monsterKills[entry.id] }}</span>
        <span v-if="!Object.values(monsterKills).some(Boolean)">{{ t("尚無魔物擊殺") }}</span>
      </div>
      <div v-if="runResult?.abilities.length" class="result-abilities"><strong>{{ t("覺醒能力") }}</strong><span>{{ runResult.abilities.length }} {{ t("種") }}</span></div>
      <div v-if="rewards" class="result-rewards">
        <strong>✦ +{{ rewards.embers }} {{ t("暮光餘燼") }}</strong>
        <div v-for="id in rewards.newAchievements" :key="id" class="result-award">
          <span>{{ t("🏅 新成就：") }}{{ t(ACHIEVEMENTS.find(a => a.id === id)?.title) }}</span>
        </div>
        <div v-for="id in rewards.newCosmetics" :key="id" class="result-award"><span>{{ t("✧ 新造型：") }}{{ id }}</span></div>
      </div>
      <div class="result-actions">
        <button class="cta" id="again" @click="emit('again')">{{ t("再次挑戰 ✦") }}</button>
        <button class="ghost" id="home" @click="emit('home')">{{ t("返回選角 · 殿堂") }}</button>
      </div>
    </div>
  </div>
</template>
