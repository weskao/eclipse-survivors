<script setup lang="ts">
import { t } from '../../../i18n'
import { computed } from 'vue'
import type { MetaState } from '../../../game/content/meta/state'
import {
  getAchievementStates, getBonusStates, getEquipmentStates, getResearchStates,
} from '../../../game/content/meta/progression'

const props = withDefaults(defineProps<{
  state: MetaState
  hero: string
  status: 'ready' | 'blocked'
  busy?: boolean
  error?: string
}>(), { busy: false, error: '' })

const emit = defineEmits<{
  research: [id: string]
  equipment: [id: string]
  bonus: [id: string]
}>()
const research = computed(() => getResearchStates(props.state))
const equipment = computed(() => getEquipmentStates(props.state, props.hero))
const bonuses = computed(() => getBonusStates(props.state))
const achievements = computed(() => getAchievementStates(props.state))
const writable = computed(() => props.status === 'ready' && !props.busy)
const heroName = computed(() => ({
  knight: '騎士', ranger: '遊俠', wizard: '法師',
} as Record<string, string>)[props.hero] ?? props.hero)
const mastery = computed(() => props.state.mastery[props.hero] ?? { xp: 0, level: 1 })
</script>

<template>
  <article class="es2-progression-panel" :aria-label="t('永久成長 v3')">
    <header class="es2-progression-header">
      <div><p class="es2-progression-overline">✦ CELESTIAL LEGACY ✦</p>
        <h2>{{ t("永久成長 · 英雄傳承") }}</h2>
        <p>{{ t("研究、裝備與祝福只在下一場遠征開始時生效。") }}</p>
      </div>
      <div class="es2-progression-wallet"><strong>{{ state.embers.toLocaleString() }}</strong><span>{{ t("✧ 暮光餘燼") }}</span></div>
    </header>
    <p v-if="status !== 'ready' || error" role="alert" class="es2-progression-error">
      {{ t(error || '儲存狀態無法驗證，目前已停用永久獎勵與消費，避免遺失進度。') }}
    </p>

    <section :aria-label="t('永久研究')" class="es2-progression-section">
      <h3>{{ t("研究之樹") }}</h3>
      <div class="es2-progression-grid">
        <article v-for="node in research" :key="node.id" class="es2-progression-item" :class="{ locked: node.locked }">
          <span class="es2-progression-icon" aria-hidden="true">{{ node.icon }}</span>
          <strong>{{ t(node.title) }}</strong><p>{{ t(node.description) }}</p>
          <small>{{ t("等級") }} {{ node.rank }} / {{ node.maxRank }}<span v-if="node.locked"> {{ t("· 前置研究未解鎖") }}</span></small>
          <button type="button" :data-research="node.id" :disabled="!writable || !node.canBuy"
            @click="emit('research', node.id)">
            {{ t(node.nextCost === null ? '已滿階' : node.locked ? '尚未解鎖' : '研究 · ' + node.nextCost + ' ✧') }}
          </button>
        </article>
      </div>
    </section>

    <section :aria-label="t('英雄專精')" class="es2-progression-section">
      <h3>{{ t("英雄專精") }}</h3>
      <div class="es2-progression-mastery">
        <span>{{ t(heroName) }}</span><strong>Lv. {{ mastery.level }}</strong><small>{{ t("累積熟練度") }} {{ mastery.xp.toLocaleString() }} XP</small>
      </div>
    </section>

    <section :aria-label="t('起始裝備與祝福')" class="es2-progression-section">
      <h3>{{ t("起始裝備與祝福") }}</h3>
      <p class="es2-progression-caption">{{ t("已解鎖的效果由遊戲整合層在開局時套用，不會改變進行中的戰鬥。") }}</p>
      <div class="es2-progression-grid">
        <article v-for="item in equipment" :key="item.id" class="es2-progression-item">
          <span class="es2-progression-icon" aria-hidden="true">{{ item.icon }}</span>
          <strong>{{ t(item.title) }}</strong><p>{{ t(item.description) }}</p>
          <button type="button" :data-equipment="item.id"
            :disabled="!writable || !item.canBuy"
            @click="emit('equipment', item.id)">
            {{ t(item.unlocked ? '已解鎖' : item.locked ? '熟練度不足' : '解鎖 · ' + item.cost + ' ✧') }}
          </button>
        </article>
        <article v-for="item in bonuses" :key="item.id" class="es2-progression-item">
          <span class="es2-progression-icon" aria-hidden="true">{{ item.icon }}</span>
          <strong>{{ t(item.title) }}</strong><p>{{ t(item.description) }}</p>
          <button type="button" :data-bonus="item.id"
            :disabled="!writable || !item.canBuy"
            @click="emit('bonus', item.id)">
            {{ t(item.unlocked ? '已解鎖' : item.locked ? '研究尚未達標' : '解鎖 · ' + item.cost + ' ✧') }}
          </button>
        </article>
      </div>
    </section>

    <section :aria-label="t('永久成就')" class="es2-progression-section">
      <h3>{{ t("永久成就 ·") }} {{ state.achievements.length }} / {{ achievements.length }}</h3>
      <div class="es2-progression-achievements">
        <article v-for="entry in achievements" :key="entry.id" :data-achievement="entry.id"
          :class="{ locked: !entry.unlocked }">
          <span aria-hidden="true">{{ entry.icon }}</span><strong>{{ t(entry.title) }}</strong>
          <small>{{ t(entry.unlocked ? '✓ 已達成' : '未達成') }}</small>
        </article>
      </div>
    </section>
  </article>
</template>

<style scoped>
.es2-progression-panel{color:#f3e9d2;padding:clamp(12px,2.5vw,28px);font:inherit;min-width:0}
.es2-progression-header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid #a588524f}
.es2-progression-header h2{font-size:clamp(1.35rem,3vw,2rem);margin:4px 0 8px}
.es2-progression-header p,.es2-progression-caption{color:#c8bda8;margin:5px 0}
.es2-progression-overline{letter-spacing:.15em;font-size:.75rem;color:#d5b675}
.es2-progression-wallet{padding:12px 18px;border:1px solid #b99a55a6;border-radius:12px;background:#261f22;display:flex;flex-direction:column;align-items:center;gap:4px}
.es2-progression-wallet strong{font-variant-numeric:tabular-nums;font-size:1.7rem}
.es2-progression-wallet span{color:#edcb82;font-size:.85rem}
.es2-progression-error{border:1px solid #dd8875;padding:12px;border-radius:8px;color:#ffdbd3}
.es2-progression-section{margin-top:24px}
.es2-progression-section h3{color:#f8d998;letter-spacing:.03em;margin:0 0 12px;font-size:1.15rem}
.es2-progression-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px}
.es2-progression-item{display:flex;flex-direction:column;gap:8px;padding:14px;background:#211d24;border:1px solid #8c74564d;border-radius:12px;min-width:0}
.es2-progression-item.locked{border-color:#665b5a}
.es2-progression-item p{margin:0;color:#bcb1a7;font-size:.86rem;flex:1}
.es2-progression-item small{color:#d0b78a}
.es2-progression-icon{font-size:1.4rem;color:#eac384}
.es2-progression-item button{min-height:44px;border:1px solid #cfae68;border-radius:8px;background:#513b31;color:#fff0ca;font:inherit;cursor:pointer}
.es2-progression-item button:disabled{background:#27252a;border-color:#6c6160;color:#a7a0a0;cursor:not-allowed}
.es2-progression-item button:focus-visible{outline:3px solid #fff0bc;outline-offset:3px}
.es2-progression-mastery{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding:14px;background:#211d24;border-radius:10px}
.es2-progression-mastery strong{color:#f5cd89}
.es2-progression-mastery small{color:#c3b8a6}
.es2-progression-achievements{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:8px}
.es2-progression-achievements article{display:flex;align-items:center;gap:8px;padding:10px;background:#211d24;border-radius:8px}
.es2-progression-achievements article.locked{opacity:.62}
.es2-progression-achievements article strong{font-size:.84rem;flex:1}
.es2-progression-achievements small{font-size:.75rem}
@media(max-width:540px){.es2-progression-grid{grid-template-columns:1fr}.es2-progression-wallet{width:100%}}
@media(prefers-reduced-motion:reduce){.es2-progression-panel *{scroll-behavior:auto;transition:none!important;animation:none!important}}
</style>
