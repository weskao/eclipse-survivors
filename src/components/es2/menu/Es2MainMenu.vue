<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, nextTick, ref, useTemplateRef, watchPostEffect } from 'vue'
import { JOB } from '../../../game/constants'
import { ART_URLS } from '../../../game/art'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import { HERO_DEFINITIONS } from '../../../game/content/heroes'
import type { HeroId, JobId } from '../../../game/types'
import HeroRoster from '../hero-roster/HeroRoster.vue'
import HeroStats from '../hero-roster/HeroStats.vue'
import Es2Dialog from './Es2Dialog.vue'
import ModeChooser from '../modes/ModeChooser.vue'
import { objectiveModeIds, type ObjectiveModeId } from '../../../game/content/modes/definitions'
import { modeIds, MODES } from '../../../meta/modes'
import type { Profile, RunModeId } from '../../../meta/types'
import type { MenuView } from './model'
const props = defineProps<{ choice: JobId; heroId?: HeroId; runMode: RunModeId; version: string; profile?: Profile; needsAudioUnlock?: boolean }>()
const titleParts = computed(() => t('暮境遠征').toUpperCase().split(' '))
const biomeScenes = [
  'blood-moon-cathedral', 'cursed-forest', 'abyssal-necropolis', 'celestial-rift',
] as const
const sceneIllustration = computed(() => {
  const index = Math.max(0, modeIds.indexOf(props.runMode))
  return WORLD_ART.biomes[biomeScenes[index % biomeScenes.length]!].scene
})
const objectiveSelection = computed<ObjectiveModeId | null>(() => objectiveModeIds.includes(props.runMode as ObjectiveModeId)
  ? props.runMode as ObjectiveModeId : null)
const emit = defineEmits<{
  select: [hero: JobId]; selectHero: [hero: HeroId]; mode: [mode: RunModeId]; start: []; navigate: [view: MenuView]; settings: []; enableAudio: []
}>()
const heroes: readonly { id: JobId; name: string; role: string; number: string }[] = [
  { id: 'knight', name: '曙鋼騎士', role: '重甲反擊 · 近戰爆發', number: '01' },
  { id: 'ranger', name: '夜痕遊俠', role: '精準射擊 · 高機動', number: '02' },
  { id: 'wizard', name: '虛空術士', role: '奧術魔彈 · 元素毀傷', number: '03' },
]
const links: readonly { id: MenuView; name: string; icon: string }[] = [
  { id: 'progression', name: '永久強化', icon: '◇' }, { id: 'relics', name: '聖物庫', icon: '✧' },
  { id: 'monsters', name: '魔物圖鑑', icon: '♜' }, { id: 'skills', name: '技能圖鑑', icon: '✦' },
  { id: 'achievements', name: '成就殿堂', icon: '♛' },
]
const detailHero = ref<HeroId | null>(null)
const detailClassic = computed(() => heroes.find(hero => hero.id === detailHero.value) ?? null)
const detailSpecialization = computed(() => detailHero.value && detailHero.value in HERO_DEFINITIONS
  ? HERO_DEFINITIONS[detailHero.value as keyof typeof HERO_DEFINITIONS] : null)
const detailStats = computed(() => detailClassic.value ? JOB[detailClassic.value.id] : detailSpecialization.value?.stats)
const detailName = computed(() => detailClassic.value?.name ?? detailSpecialization.value?.label ?? '')
const detailRole = computed(() => detailClassic.value?.role ?? detailSpecialization.value?.subtitle ?? '')
const selectedHeroLabel = computed(() => {
  const selected = props.heroId ?? props.choice
  return heroes.find(hero => hero.id === selected)?.name
    ?? Object.values(HERO_DEFINITIONS).find(hero => hero.id === selected)?.label
    ?? selected
})
const page = ref<'heroes' | 'modes'>('heroes')
function toggleExpeditionPage(): void {
  page.value = page.value === 'heroes' ? 'modes' : 'heroes'
  void nextTick(() => { if (menu.value) menu.value.scrollTop = 0 })
}
const menu = useTemplateRef('menu')
const actionBar = useTemplateRef('actionBar')
watchPostEffect(onCleanup => {
  const scrollArea = menu.value
  const bar = actionBar.value
  if (!scrollArea || !bar) return
  const reserveSpace = () => scrollArea.style.setProperty('--es2-action-bar-height', Math.ceil(bar.getBoundingClientRect().height) + 'px')
  reserveSpace()
  if (typeof ResizeObserver === 'undefined') return
  const observer = new ResizeObserver(reserveSpace)
  observer.observe(bar, { box: 'border-box' })
  onCleanup(() => observer.disconnect())
})
async function moveChoice(event: KeyboardEvent, value: string, items: readonly string[], selector: string, update: (id: string) => void): Promise<void> {
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  if (!direction) return
  event.preventDefault()
  const next = items[(items.indexOf(value) + direction + items.length) % items.length]
  if (!next) return
  update(next)
  await nextTick()
  document.querySelector<HTMLButtonElement>(`${selector}[data-${selector === '.es2-hero-card' ? 'hero' : 'mode'}="${next}"]`)?.focus()
}
const moveHero = (event: KeyboardEvent, id: JobId): void => { void moveChoice(event, id, heroes.map(hero => hero.id), '.es2-hero-card', next => emit('select', next as JobId)) }
const moveMode = (event: KeyboardEvent, id: RunModeId): void => { void moveChoice(event, id, modeIds, '.es2-mode-card', next => emit('mode', next as RunModeId)) }
</script>
<template>
  <main ref="menu" class="es2-menu" :data-es2-menu-page="page"
    :aria-label="t('Eclipse Survivors 主選單')">
    <div class="es2-menu-backdrop" aria-hidden="true"><img :src="ART_URLS.courtyard" alt="" /><img class="es2-menu-scene" :src="sceneIllustration" data-es2-biome-scene alt="" decoding="async" /></div>
    <div class="es2-menu-shell">
      <header class="es2-menu-header">
        <div class="es2-menu-brand"><span class="es2-eyebrow">{{ t('✦ 天穹星蝕 ✦') }}</span><h1>{{ titleParts[0] }}<em v-if="titleParts.length > 1">{{ ' ' + titleParts.slice(1).join(' ') }}</em></h1><p>{{ t("穿越失落的國度，成為黑夜之後的第一道曙光。") }}</p></div>
        <div class="es2-top-actions"><span id="gameVersion" class="es2-version menu-version">v{{ version }}</span>
          <button type="button" class="es2-icon-button" data-es2-settings :aria-label="t('開啟遊戲設定')" @click="emit('settings')">⚙ <span>{{ t("設定") }}</span></button>
          <button v-if="needsAudioUnlock" type="button" class="es2-icon-button" data-es2-audio-unlock @click="emit('enableAudio')">{{ t("♫ 啟用音樂") }}</button>
        </div>
      </header>
      <nav class="es2-hall-navigation" data-es2-hall-navigation :aria-label="t('冒險者殿堂')">
        <div class="es2-hall-heading"><strong>{{ t('冒險者殿堂') }}</strong><span class="es2-embers">✧ {{ profile?.embers ?? 0 }} {{ t("暮光餘燼") }}</span></div>
        <div class="es2-hall-links"><button v-for="link in links" :key="link.id" type="button" data-ui-sfx="select" @click="emit('navigate', link.id)"><span aria-hidden="true">{{ link.icon }}</span>{{ t(link.name) }}</button></div>
      </nav>
      <div class="es2-menu-layout">
        <section v-show="page === 'heroes'" class="es2-hero-section" aria-labelledby="es2HeroTitle">
          <div class="es2-section-heading"><span>{{ t('01 / 命運繼承者') }}</span><h2 id="es2HeroTitle">{{ t("選擇命運的繼承者") }}</h2><p>{{ t("每位英雄都擁有專屬的戰鬥風格。") }}</p></div>
          <div class="es2-hero-grid" role="group" :aria-label="t('選擇英雄')">
            <div v-for="hero in heroes" :key="hero.id" class="es2-hero-card-shell">
              <button type="button" :data-hero="hero.id" class="es2-hero-card es2-hero-select-card" data-ui-sfx="managed"
              :class="{ 'es2-hero-active': (heroId ?? choice) === hero.id }" :aria-pressed="(heroId ?? choice) === hero.id"
              :aria-label="t(hero.name) + ' · ' + t(hero.role)"
              @click="emit('select', hero.id)" @keydown="moveHero($event, hero.id)">
              <span class="es2-hero-number">{{ hero.number }} / {{ t('HERO') }}</span>
              <img :src="ART_URLS[hero.id]" :alt="t('{name} 原始角色插畫', { name: t(hero.name) })" decoding="async" draggable="false" />
              <span class="es2-hero-copy"><strong>{{ t(hero.name) }}</strong><small>{{ t(hero.role) }}</small>
                <HeroStats class="es2-roster__stats" data-es2-classic-preview :stats="JOB[hero.id]" />
                <span class="es2-hero-selection">{{ t((heroId ?? choice) === hero.id ? '✓ 已選擇' : '選擇英雄') }}</span></span>
              </button>
              <button type="button" class="es2-hero-detail-trigger" data-ui-sfx="select"
                :data-es2-hero-details="hero.id" :aria-label="t('查看英雄詳情') + ' · ' + t(hero.name)"
                @click="detailHero = hero.id" aria-haspopup="dialog"><span aria-hidden="true">i</span></button>
            </div>
          </div>
          <HeroRoster :selected-id="heroId ?? choice" @select="emit('selectHero', $event)" @details="detailHero = $event" />
        </section>
        <section v-show="page === 'modes'" class="es2-mode-section" aria-labelledby="es2ModeTitle">
          <div class="es2-section-heading"><span>{{ t('02 / 遠征') }}</span><h2 id="es2ModeTitle">{{ t("選擇遠征命運") }}</h2><p>{{ t("每一條道路都通往不同的試煉。") }}</p></div>
          <div class="es2-mode-grid" role="radiogroup" :aria-label="t('遠征模式')">
            <button v-for="id in modeIds" :key="id" type="button" role="radio" :data-mode="id" class="es2-mode-card" data-ui-sfx="managed"
              :aria-checked="runMode === id" :class="{ 'es2-mode-active': runMode === id }"
              @click="emit('mode', id)" @keydown="moveMode($event, id)">
              <span class="es2-mode-mark" aria-hidden="true">{{ id === 'endless' ? '∞' : id === 'challenge' ? '⚡' : id === 'standard' ? '♜' : '✦' }}</span>
              <span class="es2-mode-copy"><strong>{{ t(MODES[id].label) }}</strong><small>{{ t(MODES[id].description) }}</small></span>
              <span class="es2-mode-time">{{ MODES[id].duration === null ? '∞' : Math.ceil((MODES[id].duration ?? 0) / 60) + ' MIN' }}</span>
            </button>
          </div>
          <ModeChooser :value="objectiveSelection" @select="emit('mode', $event)" />
        </section>
      </div>
      <div ref="actionBar" class="es2-menu-action-bar">
        <p class="es2-mobile-selected-mode" aria-live="polite">
          <span :data-es2-selected-hero="heroId ?? choice">{{ t(selectedHeroLabel) }}</span> · {{ t(MODES[runMode].label).split(' · ')[0] }}
        </p>
        <div class="es2-menu-actions">
          <button class="es2-secondary es2-expedition-navigation" type="button" data-es2-expedition-navigation
            data-ui-sfx="select" :aria-label="t(page === 'heroes' ? '選擇遠征模式' : '返回英雄選擇')" @click="toggleExpeditionPage">
            {{ t(page === 'heroes' ? '選擇遠征模式' : '返回英雄選擇') }} <span aria-hidden="true">{{ page === 'heroes' ? '›' : '‹' }}</span>
          </button>
          <button class="es2-primary es2-start" type="button" data-ui-sfx="managed" @click="emit('start')">{{ t("踏入幽暮之門") }} <span aria-hidden="true">✦</span></button>
        </div>
        <p class="es2-hint">{{ t("WASD / 方向鍵移動 · SPACE 衝刺 · 手機支援觸控操作") }}</p>
      </div>
    </div>
    <Es2Dialog :active="detailHero !== null" :title="t(detailName)" :subtitle="t(detailRole)"
      @cancel="detailHero = null">
      <div v-if="detailStats" class="es2-hero-detail-content">
        <HeroStats class="es2-roster__stats" :stats="detailStats" />
        <template v-if="detailSpecialization">
          <p>{{ t(detailSpecialization.description) }}</p>
          <p>{{ t('起始武器 ·') }} {{ t(detailSpecialization.startingEquipment) }}</p>
          <div class="es2-hero-detail-special">
            <img :src="detailSpecialization.specialIconSrc" :alt="t('{name} 主動技能圖示', { name: t(detailSpecialization.label) })"
              width="44" height="44" decoding="async" />
            <span>{{ t('主動技能 ·') }} {{ t(detailSpecialization.special) }}{{ t('（冷卻') }} {{ detailSpecialization.specialCooldown }} {{ t('秒）') }}</span>
          </div>
          <p>{{ t('優勢 ·') }} {{ t(detailSpecialization.strengths.join(' / ')) }}</p>
          <p>{{ t('弱點 ·') }} {{ t(detailSpecialization.weaknesses.join(' / ')) }}</p>
        </template>
      </div>
    </Es2Dialog>
  </main>
</template>
