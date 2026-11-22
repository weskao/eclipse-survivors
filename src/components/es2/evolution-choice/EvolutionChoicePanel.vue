<script setup lang="ts">
import { computed } from 'vue'
import type { ContentId, GameState } from '../../../game/types'
import { evolutionChoices, type EvolutionChoice } from './model'

const props = defineProps<{ state: GameState; active: boolean }>()
const emit = defineEmits<{ choose: [id: ContentId] }>()
const choices = computed(() => evolutionChoices(props.state))

function choose(choice: EvolutionChoice): void {
  if (props.active && choice.eligible) emit('choose', choice.id)
}
</script>

<template>
  <section v-if="active" class="es2-evolution-choices" aria-label="神兵進化配方">
    <header class="es2-evolution-head">
      <h2>✦ 命運進化</h2>
      <p>將武器與被動技能提升至指定等級，即可解鎖傳說之力。</p>
    </header>
    <ul class="es2-evolution-grid">
      <li v-for="choice in choices" :key="choice.id">
        <button type="button" class="es2-evolution-card"
          :class="{ 'is-ready': choice.eligible, 'is-unlocked': choice.unlocked }"
          :disabled="!choice.eligible"
          :aria-label="`${choice.title}：${choice.weaponTitle} ${choice.weaponLevel} / ${choice.requiredWeaponLevel}，${choice.passiveTitle} ${choice.passiveLevel} / ${choice.requiredPassiveLevel}`"
          @click="choose(choice)">
          <span class="es2-evolution-icon" aria-hidden="true">{{ choice.icon }}</span>
          <span class="es2-evolution-title">{{ choice.title }}</span>
          <span class="es2-evolution-desc">{{ choice.description }}</span>
          <span class="es2-evolution-gates">
            <span>{{ choice.weaponTitle }} <strong>{{ choice.weaponLevel }} / {{ choice.requiredWeaponLevel }}</strong></span>
            <span>{{ choice.passiveTitle }} <strong>{{ choice.passiveLevel }} / {{ choice.requiredPassiveLevel }}</strong></span>
          </span>
          <span class="es2-evolution-status">{{ choice.unlocked ? '✓ 已解鎖' : choice.eligible ? '✦ 可進化' : '尚未達成條件' }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.es2-evolution-choices {
  color: #f8ebdd;
  max-height: min(75vh, 760px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
}
.es2-evolution-head { text-align: center; margin-bottom: 16px; }
.es2-evolution-head h2 { margin: 0 0 7px; font-size: 1.35rem; letter-spacing: .08em; color: #f9dfb0; }
.es2-evolution-head p { margin: 0; color: #cbbdb4; font-size: .86rem; }
.es2-evolution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.es2-evolution-card {
  width: 100%;
  height: 100%;
  min-height: 222px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 16px;
  border: 1px solid #7d6262;
  border-radius: 14px;
  background: linear-gradient(145deg, #302532, #15121e);
  color: inherit;
  text-align: center;
  font: inherit;
}
.es2-evolution-card:disabled { cursor: not-allowed; opacity: .72; }
.es2-evolution-card.is-ready {
  cursor: pointer;
  border-color: #eac782;
  box-shadow: inset 0 0 18px #e0ae5540;
}
.es2-evolution-card.is-ready:hover { background: #3c2c3e; }
.es2-evolution-card:focus-visible { outline: 3px solid #ffe8ab; outline-offset: 3px; }
.es2-evolution-card.is-unlocked { border-color: #9fbeaa; }
.es2-evolution-icon { font-size: 2rem; color: #f9dc9e; }
.es2-evolution-title { font-weight: 700; font-size: 1rem; }
.es2-evolution-desc { color: #e0d1c9; font-size: .78rem; line-height: 1.4; }
.es2-evolution-gates { display: grid; gap: 4px; width: 100%; margin-top: auto; font-size: .78rem; }
.es2-evolution-gates > span { display: flex; justify-content: space-between; gap: 8px; }
.es2-evolution-gates strong { color: #fce1a7; white-space: nowrap; }
.es2-evolution-status { color: #ffdda0; font-size: .8rem; }
@media (max-width: 480px) {
  .es2-evolution-choices { padding: 10px; }
  .es2-evolution-card { min-height: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .es2-evolution-card { transition: none; }
}
</style>
