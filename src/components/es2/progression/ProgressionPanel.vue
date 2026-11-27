<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, nextTick, ref } from 'vue'
import Es2EmberWallet from '../menu/Es2EmberWallet.vue'
import HallGrowthBoard from './HallGrowthBoard.vue'
import HallTalentExplorer from './HallTalentExplorer.vue'
import { researchHallNodes, unlockHallNodes, type HallNode } from './hall-model'
import { BALANCE } from '../../../game/config'
import { HERO_DEFINITIONS, isSpecializationId } from '../../../game/content/heroes'
import type { HeroId } from '../../../game/types'
import type { MetaState } from '../../../game/content/meta/state'
import {
  getAchievementStates,
} from '../../../game/content/meta/progression'

const props = withDefaults(defineProps<{
  state: MetaState
  hero: string
  heroId?: HeroId
  status: 'ready' | 'blocked'
  embedded?: boolean
  busy?: boolean
  error?: string
}>(), { embedded: false, busy: false, error: '' })

const emit = defineEmits<{
  research: [id: string]
  talent: [id:string,rank:number]
  attune: [universal:string[],signature:string|null,resonance:string|null]
  equipment: [id: string]
  bonus: [id: string]
}>()
const categories = [
  { id: 'research', label: '研究之樹', icon: '✧' },
  { id: 'mastery', label: '英雄專精', icon: '♜' },
  { id: 'unlocks', label: '起始裝備與祝福', icon: '◇' },
  { id: 'achievements', label: '永久成就', icon: '★' },
] as const
type Category = typeof categories[number]['id']
const category = ref<Category>('research')
const researchView = ref<'core'|'ascendancy'>('core')
const tabs = ref<HTMLElement | null>(null)
function moveCategory(event: KeyboardEvent, id: Category) {
  const index = categories.findIndex(tab => tab.id === id)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1
    : event.key === 'ArrowRight' ? (index + 1) % categories.length
    : event.key === 'ArrowLeft' ? (index + categories.length - 1) % categories.length : -1
  if (next < 0) return
  event.preventDefault()
  category.value = categories[next]!.id
  void nextTick(() => tabs.value?.querySelector<HTMLElement>('[data-hall-tab="' + category.value + '"]')?.focus({ preventScroll: true }))
}
const research = computed(() => researchHallNodes(props.state))
const unlocks = computed(() => unlockHallNodes(props.state, props.hero))
function unlock(node: HallNode) { if (node.kind === 'equipment') emit('equipment', node.id); else if (node.kind === 'bonus') emit('bonus', node.id) }
const achievements = computed(() => getAchievementStates(props.state))
const writable = computed(() => props.status === 'ready' && !props.busy)
const masteryHero = computed(() => props.heroId ?? props.hero)
const heroName = computed(() => {
  const id = masteryHero.value
  return isSpecializationId(id) ? HERO_DEFINITIONS[id].label : ({
    knight: '騎士', ranger: '遊俠', wizard: '法師',
  } as Record<string, string>)[id] ?? id
})
// Specialization receipts are persisted with the heroes: namespace by the engine.
const masteryKey = computed(() => isSpecializationId(masteryHero.value) ? 'heroes:' + masteryHero.value : masteryHero.value)
const mastery = computed(() => props.state.mastery[masteryKey.value] ?? { xp: 0, level: 1 })
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

    <div ref="tabs" class="hall-category-tabs" role="tablist" :aria-label="t('成長分類')">
      <button v-for="tab in categories" :key="tab.id" type="button" role="tab" data-ui-sfx="select"
        :id="'hall-tab-' + tab.id" :data-hall-tab="tab.id" :aria-selected="category === tab.id"
        :aria-controls="'hall-category-' + tab.id" :tabindex="category === tab.id ? 0 : -1"
        @click="category = tab.id" @keydown="moveCategory($event, tab.id)">
        <span aria-hidden="true">{{ tab.icon }}</span><span>{{ t(tab.label) }}</span>
      </button>
    </div>
    <section v-show="category === 'research'" id="hall-category-research" data-hall-category="research" role="tabpanel" aria-labelledby="hall-tab-research" :aria-label="t('永久研究')" class="es2-progression-section">
      <h3>{{ t("研究之樹") }}</h3>
      <div class="hall-research-nav" role="group" :aria-label="t('研究路線')">
        <button type="button" data-ui-sfx="select" :aria-pressed="researchView==='core'" @click="researchView='core'">{{ t('核心研究') }}</button>
        <button type="button" data-ui-sfx="select" :aria-pressed="researchView==='ascendancy'" @click="researchView='ascendancy'">{{ t('暮蝕昇華') }} <small>{{ t('預覽') }}</small></button>
      </div>
      <HallGrowthBoard v-show="researchView==='core'" :nodes="research" :writable="writable" :visible="category === 'research' && researchView==='core'" tree @purchase="emit('research', $event.id)" />
      <HallTalentExplorer v-if="researchView==='ascendancy'" :state="state" :hero="masteryHero" :visible="category==='research'" :writable="writable" @purchase="(id,rank)=>emit('talent',id,rank)" @attune="(u,s,r)=>emit('attune',u,s,r)"/>
    </section>

    <section v-show="category === 'mastery'" id="hall-category-mastery" data-hall-category="mastery" role="tabpanel" aria-labelledby="hall-tab-mastery" :aria-label="t('英雄專精')" class="es2-progression-section">
      <h3>{{ t("英雄專精") }}</h3>
      <div class="es2-progression-mastery">
        <span>{{ t(heroName) }}</span><strong>Lv. {{ mastery.level }} / {{ masteryCap }}</strong><small>{{ t("累積熟練度") }} {{ mastery.xp.toLocaleString() }} XP</small>
        <div class="hall-mastery-track" role="progressbar" :aria-label="t('英雄專精')" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="Math.round(masteryProgress.value * 100)"><i :style="{ width: masteryProgress.value * 100 + '%' }"><span :key="masteryKey + ':' + mastery.xp" class="hall-xp-sheen" aria-hidden="true"></span></i></div>
        <small>{{ mastery.level >= masteryCap ? t('已滿階') : t('距下一級尚需 {xp} XP', { xp: masteryProgress.next.toLocaleString() }) }}</small>
      </div>
    </section>

    <section v-show="category === 'unlocks'" id="hall-category-unlocks" data-hall-category="unlocks" role="tabpanel" aria-labelledby="hall-tab-unlocks" :aria-label="t('起始裝備與祝福')" class="es2-progression-section">
      <h3>{{ t("起始裝備與祝福") }}</h3>
      <p class="es2-progression-caption">{{ t("已解鎖的效果由遊戲整合層在開局時套用，不會改變進行中的戰鬥。") }}</p>
      <HallGrowthBoard :nodes="unlocks" :writable="writable" :visible="category === 'unlocks'" @purchase="unlock" />
    </section>

    <section v-show="category === 'achievements'" id="hall-category-achievements" data-hall-category="achievements" role="tabpanel" aria-labelledby="hall-tab-achievements" :aria-label="t('永久成就')" class="es2-progression-section">
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
.es2-progression-section{margin-top:16px}
.es2-progression-section h3{color:#f8d998;letter-spacing:.03em;margin:0 0 12px;font-size:1.15rem}
.es2-progression-mastery{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;padding:10px;background:#211d24;border-radius:10px}
.es2-progression-mastery strong{color:#f5cd89}
.es2-progression-mastery small{color:#c3b8a6}
.es2-progression-achievements{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:8px}
.es2-progression-achievements article{display:flex;align-items:center;gap:8px;padding:10px;background:#211d24;border-radius:8px}
.es2-progression-achievements article.locked{opacity:.62}
.es2-progression-achievements article strong{font-size:.84rem;flex:1}
.es2-progression-achievements small{font-size:.75rem}
@media(prefers-reduced-motion:reduce){.es2-progression-panel *{scroll-behavior:auto;transition:none!important;animation:none!important}}
.hall-mastery-track{position:relative;width:100%;height:12px;border:1px solid #90774b;border-radius:8px;background:#0c1722;overflow:hidden}
.hall-mastery-track i{position:relative;display:block;height:100%;overflow:hidden;border-radius:inherit;background:linear-gradient(90deg,#8b6a3a,#d2a95f 72%,#f1d08e);transition:width .65s cubic-bezier(.17,.76,.23,1)}
.hall-mastery-track .hall-xp-sheen{position:absolute;inset:0;background:linear-gradient(105deg,transparent 28%,#fff0c7a0 50%,transparent 72%);transform:translateX(-100%);animation:hall-xp-shimmer 1.05s .25s ease-out both}
@keyframes hall-xp-shimmer{to{transform:translateX(110%)}}
@media(prefers-reduced-motion:reduce){.hall-mastery-track .hall-xp-sheen{display:none}}
:global([data-es2-reduce-motion="true"] .hall-mastery-track i),:global([data-es2-reduce-flashing="true"] .hall-mastery-track i){transition:none}
:global([data-es2-reduce-motion="true"] .hall-mastery-track .hall-xp-sheen),:global([data-es2-reduce-flashing="true"] .hall-mastery-track .hall-xp-sheen){display:none}

.hall-category-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:4px;margin-bottom:12px;border:1px solid #a5885255;border-radius:8px;background:#111c28}
.hall-category-tabs button{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:44px;padding:5px 7px;color:#bfc9d4;background:#1b2a39;border:1px solid #6b7a8545;border-radius:5px;font:600 .8rem/1.3 system-ui;overflow-wrap:anywhere;cursor:pointer}
.hall-category-tabs button[aria-selected="true"]{color:#ffe4ae;border-color:#d6b575;background:linear-gradient(145deg,#594731,#29303a);box-shadow:inset 0 -2px #e5bd79}
.hall-category-tabs button:focus-visible{outline:2px solid #ffe0a0;outline-offset:1px}
.hall-category-tabs button>span:first-child{color:#e3c28d;font-size:1rem;flex:none}
@media(max-width:480px){.hall-category-tabs{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin-bottom:8px}.hall-category-tabs button{padding:4px 6px}}
.hall-research-nav{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 10px;border-bottom:1px solid #a5885255}
.hall-research-nav button{min-height:44px;flex:1;border:0;border-bottom:2px solid transparent;background:none;color:#b9c1c9;font:600 .85rem system-ui;cursor:pointer;padding:5px}
.hall-research-nav button[aria-pressed=true]{color:#f5d28e;border-color:#d5ae70;background:linear-gradient(0deg,#d8b16c15,transparent)}
.hall-research-nav small{font-size:.66rem;color:#c6b391}
.hall-research-nav button:focus-visible{outline:2px solid #ffde9d;outline-offset:1px}
</style>
