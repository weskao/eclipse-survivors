<script setup lang="ts">
import { t } from '../../../i18n'
import { computed } from 'vue'
import Es2EmberWallet from '../menu/Es2EmberWallet.vue'
import HallGrowthBoard from './HallGrowthBoard.vue'
import { researchHallNodes, unlockHallNodes, type HallNode } from './hall-model'
import { BALANCE } from '../../../game/config'
import type { MetaState } from '../../../game/content/meta/state'
import {
  getAchievementStates,
} from '../../../game/content/meta/progression'

const props = withDefaults(defineProps<{
  state: MetaState
  hero: string
  status: 'ready' | 'blocked'
  embedded?: boolean
  busy?: boolean
  error?: string
}>(), { embedded: false, busy: false, error: '' })

const emit = defineEmits<{
  research: [id: string]
  equipment: [id: string]
  bonus: [id: string]
}>()
const research = computed(() => researchHallNodes(props.state))
const unlocks = computed(() => unlockHallNodes(props.state, props.hero))
function unlock(node: HallNode) { if (node.kind === 'equipment') emit('equipment', node.id); else if (node.kind === 'bonus') emit('bonus', node.id) }
const achievements = computed(() => getAchievementStates(props.state))
const writable = computed(() => props.status === 'ready' && !props.busy)
const heroName = computed(() => ({
  knight: '騎士', ranger: '遊俠', wizard: '法師',
} as Record<string, string>)[props.hero] ?? props.hero)
const mastery = computed(() => props.state.mastery[props.hero] ?? { xp: 0, level: 1 })
const masteryCap = BALANCE.meta.runRewards.masteryMaxLevel
const masteryProgress = computed(() => {
  const level = mastery.value.level, step = BALANCE.meta.runRewards.masteryLevelDivisor
  if (level >= masteryCap) return { value: 1, next: 0 }
  const lower = (level - 1) ** 2 * step, upper = level ** 2 * step
  return { value: Math.min(1, Math.max(0, (mastery.value.xp - lower) / (upper - lower))), next: Math.max(0, upper - mastery.value.xp) }
})
</script>

<template>
  <article class="es2-progression-panel" :class="{ 'es2-progression-panel--embedded': embedded }" :aria-label="t('永久成長 v3')">
    <header v-if="!embedded" class="es2-progression-header">
      <div><p class="es2-progression-overline">{{ t("✦ CELESTIAL LEGACY ✦") }}</p>
        <h2>{{ t("永久成長 · 英雄傳承") }}</h2>
        <p>{{ t("研究、裝備與祝福只在下一場遠征開始時生效。") }}</p>
      </div>
      <Es2EmberWallet :embers="state.embers" />
    </header>
    <p v-if="status !== 'ready' || error" role="alert" class="es2-progression-error">
      {{ t(error || '儲存狀態無法驗證，目前已停用永久獎勵與消費，避免遺失進度。') }}
    </p>

    <section :aria-label="t('永久研究')" class="es2-progression-section">
      <h3>{{ t("研究之樹") }}</h3>
      <HallGrowthBoard :nodes="research" :writable="writable" tree @purchase="emit('research', $event.id)" />
    </section>

    <section :aria-label="t('英雄專精')" class="es2-progression-section">
      <h3>{{ t("英雄專精") }}</h3>
      <div class="es2-progression-mastery">
        <span>{{ t(heroName) }}</span><strong>Lv. {{ mastery.level }} / {{ masteryCap }}</strong><small>{{ t("累積熟練度") }} {{ mastery.xp.toLocaleString() }} XP</small>
        <div class="hall-mastery-track" role="progressbar" :aria-label="t('英雄專精')" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="Math.round(masteryProgress.value * 100)"><i :style="{ width: masteryProgress.value * 100 + '%' }"></i></div>
        <small>{{ mastery.level >= masteryCap ? t('已滿階') : t('距下一級尚需 {xp} XP', { xp: masteryProgress.next.toLocaleString() }) }}</small>
      </div>
    </section>

    <section :aria-label="t('起始裝備與祝福')" class="es2-progression-section">
      <h3>{{ t("起始裝備與祝福") }}</h3>
      <p class="es2-progression-caption">{{ t("已解鎖的效果由遊戲整合層在開局時套用，不會改變進行中的戰鬥。") }}</p>
      <HallGrowthBoard :nodes="unlocks" :writable="writable" @purchase="unlock" />
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
.es2-progression-panel--embedded{padding:0}
.es2-progression-panel--embedded>.es2-progression-section:first-of-type{margin-top:0}
.es2-progression-header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid #a588524f}
.es2-progression-header h2{font-size:clamp(1.35rem,3vw,2rem);margin:4px 0 8px}
.es2-progression-header p,.es2-progression-caption{color:#c8bda8;margin:5px 0}
.es2-progression-overline{letter-spacing:.15em;font-size:.75rem;color:#d5b675}
.es2-progression-error{border:1px solid #dd8875;padding:12px;border-radius:8px;color:#ffdbd3}
.es2-progression-section{margin-top:24px}
.es2-progression-section h3{color:#f8d998;letter-spacing:.03em;margin:0 0 12px;font-size:1.15rem}
.es2-progression-mastery{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding:14px;background:#211d24;border-radius:10px}
.es2-progression-mastery strong{color:#f5cd89}
.es2-progression-mastery small{color:#c3b8a6}
.es2-progression-achievements{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:8px}
.es2-progression-achievements article{display:flex;align-items:center;gap:8px;padding:10px;background:#211d24;border-radius:8px}
.es2-progression-achievements article.locked{opacity:.62}
.es2-progression-achievements article strong{font-size:.84rem;flex:1}
.es2-progression-achievements small{font-size:.75rem}
@media(prefers-reduced-motion:reduce){.es2-progression-panel *{scroll-behavior:auto;transition:none!important;animation:none!important}}
.hall-mastery-track{width:100%;height:10px;border:1px solid #90774b;border-radius:8px;background:#0c1722;overflow:hidden}.hall-mastery-track i{display:block;height:100%;background:linear-gradient(90deg,#8b6a3a,#f1d08e)}
</style>
