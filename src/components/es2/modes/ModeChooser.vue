<script setup lang="ts">
import { t } from '../../../i18n'
import { objectiveModeIds, getObjectiveMode, type ObjectiveModeId } from '../../../game/content/modes/definitions'

withDefaults(defineProps<{ value: ObjectiveModeId | null; disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ select: [mode: ObjectiveModeId] }>()
</script>

<template>
  <section class="es2-objective-chooser" :aria-label="t('ES2 擴充遠征模式')">
    <header><span>{{ t("CHAPTER II · MODES") }}</span><h2>{{ t("選擇遠征試煉") }}</h2></header>
    <div class="es2-objective-grid" role="radiogroup" :aria-label="t('ES2 遠征模式')">
      <button
        v-for="id in objectiveModeIds" :key="id"
        type="button" role="radio" class="es2-objective-choice"
        :data-objective-mode="id" :disabled="disabled"
        :aria-checked="value === id"
        :aria-label="[t(getObjectiveMode(id).title), t(getObjectiveMode(id).description), t(getObjectiveMode(id).victoryDescription), ...getObjectiveMode(id).preRunModifiers.map(modifier => t(modifier))].join(' · ')"
        :class="{ selected: value === id }"
        @click="emit('select', id)"
      >
        <strong>{{ t(getObjectiveMode(id).title) }}</strong>
        <span>{{ t(getObjectiveMode(id).description) }}</span>
        <small>{{ t(getObjectiveMode(id).victoryDescription) }}</small>
        <small v-for="modifier in getObjectiveMode(id).preRunModifiers" :key="modifier" class="modifier">◈ {{ t(modifier) }}</small>
        <small class="reward">✦ {{ t(id === 'endless-eclipse'
          ? '每 3 分鐘 +' + getObjectiveMode(id).rewardEmbers + ' 餘燼（最高 1500）'
          : '勝利獎勵 ' + getObjectiveMode(id).rewardEmbers + ' 餘燼') }}</small>
      </button>
    </div>
  </section>
</template>

<style scoped>
.es2-objective-chooser { color: #f1e4d3; width: 100%; }
.es2-objective-chooser header { margin-bottom: 0.85rem; }
.es2-objective-chooser header span { color: #c6a875; font-size: 0.7rem; letter-spacing: 0.16em; }
.es2-objective-chooser h2 { font-size: 1.3rem; margin: 0.35rem 0; }
.es2-objective-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,230px),1fr)); gap: 0.7rem; }
.es2-objective-choice { display: flex; flex-direction: column; gap: 0.55rem; min-width: 0; padding: 1rem;
  text-align: left; color: inherit; border: 1px solid #6b584c; border-radius: 0.7rem;
  background: #211d2b; cursor: pointer; }
.es2-objective-choice strong { font-size: 1rem; }
.es2-objective-choice span { font-size: 0.83rem; line-height: 1.45; }
.es2-objective-choice small { color: #c3b3a7; font-size: 0.75rem; line-height: 1.4; }
.es2-objective-choice .modifier { color: #e1d1b6; }
.es2-objective-choice .reward { color: #dfbe7f; }
.es2-objective-choice.selected { border-color: #edc679; background: #302538; box-shadow: inset 0 0 0 1px #edc679; }
.es2-objective-choice:focus-visible { outline: 3px solid #edc679; outline-offset: 3px; }
.es2-objective-choice:disabled { cursor: not-allowed; opacity: 0.55; }
@media (max-width: 560px) { .es2-objective-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .es2-objective-choice { transition: none; } }
</style>
