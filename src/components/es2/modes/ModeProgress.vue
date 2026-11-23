<script setup lang="ts">
import { t } from '../../../i18n'
import { computed } from 'vue'
import { getObjectiveMode } from '../../../game/content/modes/definitions'
import { evaluateObjective, getObjectiveDifficulty, type ObjectiveState } from '../../../game/content/objectives/evaluator'

const props = defineProps<{ state: ObjectiveState }>()
const rule = computed(() => getObjectiveMode(props.state.mode))
const result = computed(() => evaluateObjective(props.state))
const difficulty = computed(() => getObjectiveDifficulty(props.state))
const outcome = computed(() => props.state.status === 'victory' ? '挑戰勝利'
  : props.state.status === 'withdrawn' ? '主動撤退'
  : props.state.status === 'defeat' ? '挑戰失敗'
  : props.state.mode === 'endless-eclipse' ? '持續求生' : '挑戰進行中')
const progressLabel = computed(() => result.value.progress.required === null
  ? `${result.value.progress.current} 次事件 · 持續求生`
  : `${result.value.progress.current} / ${result.value.progress.required}`)
</script>

<template>
  <section class="es2-mode-progress" :aria-label="t('ES2 模式進度')" aria-live="polite">
    <header><span>{{ t(rule.title) }}</span><strong>{{ t(outcome) }}</strong></header>
    <div class="es2-mode-progress-detail">
      <span>{{ t(result.progress.label) }}</span>
      <output>{{ t(progressLabel) }}</output>
    </div>
    <progress v-if="result.progress.required !== null"
      :value="result.progress.current" :max="result.progress.required"
      :aria-label="t(result.progress.label)" />
    <div class="es2-mode-progress-extra">
      <small v-if="state.mode === 'relic-hunt'">{{ t("聖物完整度") }} {{ state.relicIntegrity }}%</small>
      <small v-if="difficulty.activeModifier">{{ t("目前異變：") }}{{ t(difficulty.activeModifier) }}</small>
      <small v-if="state.status !== 'active'">{{ t("預估餘燼：") }}{{ result.rewards.embers }}</small>
    </div>
  </section>
</template>

<style scoped>
.es2-mode-progress { max-width: min(420px,100%); box-sizing: border-box; padding: 0.75rem 0.9rem;
  border: 1px solid #8b715e; border-radius: 0.65rem; background: #201a2ad9; color: #f4e8d8; }
.es2-mode-progress header, .es2-mode-progress-detail { display: flex; justify-content: space-between;
  align-items: baseline; flex-wrap: wrap; gap: 0.3rem; }
.es2-mode-progress header span { font-weight: 700; }
.es2-mode-progress header strong { color: #e9c17c; font-size: 0.8rem; }
.es2-mode-progress-detail { margin: 0.5rem 0; font-size: 0.8rem; }
.es2-mode-progress-detail output { font-variant-numeric: tabular-nums; }
.es2-mode-progress progress { display: block; width: 100%; height: 0.6rem; accent-color: #dca66e; }
.es2-mode-progress-extra { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.45rem; }
.es2-mode-progress-extra small { color: #d2c0b2; }
@media (prefers-reduced-motion: reduce) { .es2-mode-progress * { transition: none; animation: none; } }
</style>
