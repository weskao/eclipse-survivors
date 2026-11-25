<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { animatedEs2ImageSrc, skillImageSrc } from '../../../game/ui-art'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import AudioControl from '../../AudioControl.vue'
import { t } from '../../../i18n'
import { LOW_HP_PCT } from '../../../game/constants'
import { healthBarColor } from '../../../game/render/health-bars'
import { lowHealthTier } from './low-health'
import '../../../styles/es2/low-health.css'
import HeroPortrait from '../hero-roster/HeroPortrait.vue'
import type { HudView } from '../../../game/store'
import type { HeroId, JobId } from '../../../game/types'
import { projectCombatHud, type CombatHudActions, type CombatHudFeed, type CombatHudSnapshot } from './model'
import '../../../styles/es2/hud.css'

const props = withDefaults(defineProps<{
  active: boolean
  choice: JobId
  heroId?: HeroId
  hud: HudView
  actions: CombatHudActions
  feed?: CombatHudFeed
  expectedFeed?: CombatHudSnapshot
  musicOn?: boolean
  sfxOn?: boolean
  musicVolume?: number
  sfxVolume?: number
  audioActive?: boolean
  canReturnHome?: boolean
}>(), { audioActive: true })

const view = computed(() => projectCombatHud(props.hud, props.choice, props.feed, props.expectedFeed))
const lifeTier = computed(() => props.active ? lowHealthTier(view.value.health.percent) : 'normal')
const lifeMessage = computed(() => lifeTier.value === 'warning' ? '血量偏低' : lifeTier.value === 'critical' ? '生命危急' : '瀕死')
const selectedId = ref<string | null>(null)
const hudRoot = shallowRef<HTMLElement | null>(null)
const infoOpen = ref(false)
const infoButton = shallowRef<HTMLElement | null>(null)
const infoPanel = shallowRef<HTMLElement | null>(null)
function closeInfo(restoreFocus = false): void {
  const wasOpen = infoOpen.value
  infoOpen.value = false
  if (wasOpen && restoreFocus) infoButton.value?.focus()
}
function onViewportChange(): void { closeInfo() }
function onDocumentPointer(event: PointerEvent): void {
  if (!infoOpen.value || !(event.target instanceof Node)) return
  if (!infoButton.value?.contains(event.target) && !infoPanel.value?.contains(event.target)) closeInfo()
}
function onDocumentKey(event: KeyboardEvent): void {
  if (infoOpen.value && event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    closeInfo(true)
  }
}
watch(() => [props.active, props.canReturnHome], ([active, canReturnHome]) => {
  if (!active || !canReturnHome) closeInfo()
}, { flush: 'sync' })
onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer)
  document.addEventListener('keydown', onDocumentKey)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('orientationchange', onViewportChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  document.removeEventListener('keydown', onDocumentKey)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('orientationchange', onViewportChange)
})
watch(() => props.active, active => {
  if (active) return
  selectedId.value = null
  if (typeof document !== 'undefined' && hudRoot.value?.contains(document.activeElement)) {
    (document.activeElement as HTMLElement).blur()
  }
}, { flush: 'sync' })
const liveAnnouncement = computed(() => {
  if (!props.active) return ''
  return view.value.notices.at(-1)?.text
    ?? (view.value.wave?.announcement
      ? '第 ' + view.value.wave.number + ' 波：' + view.value.wave.announcement
      : view.value.boss?.phase ? '首領進入第 ' + view.value.boss.phase + ' 階段' : '')
})
const selectedSkill = computed(() => view.value.skills.find(skill => skill.id === selectedId.value) ?? null)
watch(() => view.value.skills, skills => {
  if (selectedId.value && !skills.some(skill => skill.id === selectedId.value)) selectedId.value = null
})
/** Preserves engine.mount(canvas, minimap) without touching App.vue or shared engine. */
const minimap = shallowRef<HTMLCanvasElement | null>(null)
defineExpose({ minimap })

const skillDescription = (skill: (typeof view.value.skills)[number]): string =>
  [skill.title, '等級 ' + skill.level + '/' + skill.maxLevel,
    skill.evolved ? '已進化' : '',
    skill.cooldown > 0 ? '冷卻 ' + skill.cooldown.toFixed(1) + ' 秒' : '可用'].filter(Boolean).join(' · ')
</script>

<template>
  <!-- Always mount minimap: engine.mount captures its ref before the first run. -->
  <aside ref="hudRoot" class="es2-hud" :class="{ 'es2-hud--active': active, 'es2-hud--details-open': infoOpen }" :data-es2-life-tier="lifeTier" :aria-hidden="!active" :inert="!active" :aria-label="t('戰鬥資訊')">
    <div v-if="lifeTier === 'critical' || lifeTier === 'emergency'" class="es2-hud__life-vignette" data-es2-life-vignette aria-hidden="true"></div>
    <span data-es2-announcement class="es2-hud__sr-only" role="status" aria-live="polite" aria-atomic="true">{{ t(liveAnnouncement) }}</span>
    <header class="es2-hud__top">
      <div class="es2-hud__hero es2-hud__plate">
        <div class="es2-hud__portrait">
          <HeroPortrait :hero-id="heroId ?? choice" alt="" />
          <span aria-hidden="true" class="es2-hud__portrait-corner">✧</span>
          <span v-if="lifeTier === 'warning' || lifeTier === 'critical' || lifeTier === 'emergency'" class="es2-hud__life-alert" data-es2-life-alert role="status" :aria-label="t(lifeMessage)"><span aria-hidden="true">♥</span></span>
        </div>
        <div class="es2-hud__vitals">
          <div class="es2-hud__identity">
            <span v-if="lifeTier === 'warning' || lifeTier === 'critical' || lifeTier === 'emergency'" class="es2-hud__eyebrow es2-hud__life-message" data-es2-life-message>{{ t(lifeMessage) }}</span>
            <span v-else class="es2-hud__eyebrow">{{ t('ECLIPSE · 英雄') }}</span>
            <strong>{{ t(view.identity) }}</strong>
          </div>
          <div class="es2-hud__health-head"><span><img class="es2-world-hud-icon" :src="WORLD_ART.ui['hud-health']" alt="" />{{ t("生命值") }}</span><span>{{ t(view.health.label) }}</span></div>
          <div class="es2-hud__track es2-hud__track--health" :class="{ 'es2-hud__track--critical': view.health.percent <= LOW_HP_PCT }"
            role="progressbar" :aria-label="t('生命值')" :aria-valuenow="view.health.percent"
            aria-valuemin="0" aria-valuemax="100" :style="{ '--es2-progress': view.health.percent / 100 }">
            <span class="es2-hud__track-trail" aria-hidden="true"></span>
            <span class="es2-hud__track-fill" aria-hidden="true"></span>
          </div>
          <div class="es2-hud__health-head es2-hud__health-head--xp"><span><img class="es2-world-hud-icon" :src="WORLD_ART.ui['hud-xp']" alt="" />{{ t("經驗值") }}</span><span>{{ Math.round(view.experience) }}%</span></div>
          <div :key="view.identity" class="es2-hud__track es2-hud__track--xp" role="progressbar"
            :aria-label="t('經驗值')" :aria-valuenow="view.experience"
            aria-valuemin="0" aria-valuemax="100" :style="{ '--es2-progress': view.experience / 100 }">
            <span class="es2-hud__track-fill" aria-hidden="true"></span>
          </div>
        </div>
      </div>
      <div class="es2-hud__top-right">
        <div class="es2-hud__counters es2-hud__plate" :aria-label="t('戰鬥統計')">
          <div class="es2-hud__counter"><span aria-hidden="true">◷</span><span>{{ view.timer }}</span><small>{{ t('TIME') }}</small></div>
          <div class="es2-hud__counter"><span aria-hidden="true">☠</span><span>{{ view.kills }}</span><small>{{ t('KILLS') }}</small></div>
          <div v-if="view.combo && view.combo.count > 1" class="es2-hud__counter es2-hud__counter--combo" data-es2-combo>
            <span aria-hidden="true">✦</span><span>{{ view.combo.count }}×</span><small>{{ t('COMBO') }}</small>
          </div>
        </div>
        <nav class="es2-hud__controls es2-hud__plate" :aria-label="t('戰鬥操作')">
          <AudioControl v-if="actions.toggleMusic && actions.toggleSfx && actions.setMusicVolume && actions.setSfxVolume && musicOn !== undefined && sfxOn !== undefined && musicVolume !== undefined && sfxVolume !== undefined"
            context="hud" compact :active="active && (audioActive ?? true)"
            :music-on="musicOn ?? false" :sfx-on="sfxOn ?? false"
            :music-volume="musicVolume!" :sfx-volume="sfxVolume!"
            @toggle-music="actions.toggleMusic?.()" @toggle-sfx="actions.toggleSfx?.()"
            @music-volume="actions.setMusicVolume?.($event)" @sfx-volume="actions.setSfxVolume?.($event)" />
          <button v-if="canReturnHome && actions.home" type="button" class="es2-hud__control-button" data-es2-home data-ui-sfx="managed" :aria-label="t('返回主選單')" :title="t('返回主選單')" @click="actions.home()">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9.5 21v-7h5v7"/></svg>
          </button>
          <button type="button" class="es2-hud__control-button" data-es2-settings data-ui-sfx="managed" :aria-label="t('開啟設定')" :title="t('設定')" @click="actions.settings()">⚙</button>
          <button type="button" class="es2-hud__control-button" data-es2-pause data-ui-sfx="managed" :aria-label="t('暫停遊戲')" aria-keyshortcuts="P" :title="t('暫停（P）')" @click="actions.pause()">Ⅱ</button>
        </nav>
        <div class="es2-hud__map es2-hud__plate">
          <span class="es2-hud__eyebrow">{{ t("✦ 戰場地圖") }}</span>
          <canvas ref="minimap" width="152" height="110" :aria-label="t('戰場小地圖')"></canvas>
        </div>
      </div>
      <div class="es2-hud__encounter-stack">
        <div v-if="view.boss || view.wave || view.bossWarning" class="es2-hud__encounter" data-es2-encounter>
          <section v-if="!view.boss && view.bossWarning" class="es2-hud__boss-warning es2-hud__plate"
            data-es2-boss-warning :class="{ 'es2-hud__boss-warning--urgent': view.bossWarning.urgent }"
            :style="{ '--es2-warning-accent': view.bossWarning.color }"
            :aria-label="t('首領即將降臨') + ' · ' + t(view.bossWarning.name) + ' · ' + view.bossWarning.seconds + ' ' + t('秒')">
            <div class="es2-hud__boss-warning-row">
              <span class="es2-hud__boss-warning-sigil" aria-hidden="true">⚠</span>
              <div class="es2-hud__boss-warning-text">
                <span>{{ t('首領即將降臨') }}</span>
                <strong>{{ t(view.bossWarning.name) }}</strong>
              </div>
              <div class="es2-hud__boss-warning-count" aria-hidden="true">
                <b>{{ String(view.bossWarning.seconds).padStart(2, '0') }}</b><small>SEC</small>
              </div>
            </div>
            <div class="es2-hud__boss-warning-track" aria-hidden="true">
              <span :style="{ transform: 'scaleX(' + view.bossWarning.progress + ')' }"></span>
            </div>
          </section>
          <section v-if="view.boss" class="es2-hud__boss es2-hud__plate" data-es2-boss :aria-label="t('首領生命')">
            <div class="es2-hud__boss-heading">
              <span>☠ {{ t(view.boss.name) }}</span>
              <span v-if="view.boss.phase !== undefined" class="es2-hud__boss-phase">
                {{ t('PHASE') }} {{ view.boss.phase }}<template v-if="view.boss.totalPhases !== undefined"> / {{ view.boss.totalPhases }}</template>
              </span>
            </div>
            <div class="boss-meter-frame">
            <div class="es2-hud__track es2-hud__track--boss" role="progressbar" :aria-label="t('首領生命值')"
              :aria-valuenow="view.boss.percent" aria-valuemin="0" aria-valuemax="100"
              :style="{ '--es2-progress': view.boss.percent / 100, '--es2-boss-hp-color': healthBarColor(view.boss.percent / 100, 'boss') }">
              <span class="es2-hud__track-trail" aria-hidden="true"></span>
              <span class="es2-hud__track-fill" aria-hidden="true"></span>
            </div>
            </div>
          </section>
          <div v-if="view.wave" class="es2-hud__wave es2-hud__plate" data-es2-wave :aria-label="t('波次')">
            <span class="es2-hud__eyebrow">{{ t('WAVE') }} {{ view.wave.number }}</span>
            <strong v-if="view.wave.announcement">{{ t(view.wave.announcement) }}</strong>
            <div v-if="view.wave.progressPct !== undefined" class="es2-hud__wave-track" role="progressbar" :aria-label="t('波次進度')"
              :aria-valuenow="view.wave.progressPct" aria-valuemin="0" aria-valuemax="100"
              :style="{ '--es2-progress': view.wave.progressPct / 100 }">
              <span aria-hidden="true"></span>
            </div>
          </div>
        </div>
        <div v-if="hud.sceneTitle" class="es2-hud__scene-title" data-es2-scene-title>{{ t(hud.sceneTitle) }}</div>
      </div>
    </header>
    <div v-if="active && view.boss?.offscreen && !infoOpen" class="es2-hud__boss-pointer" data-es2-boss-pointer
      role="img" :aria-label="t(view.boss.name) + ' · ' + t('距離') + ' ' + view.boss.offscreen.distance"
      :style="{
        left: view.boss.offscreen.left + 'px',
        top: view.boss.offscreen.top + 'px',
        '--es2-bearing': view.boss.offscreen.angle + 'deg',
      }">
      <svg class="es2-hud__boss-pointer-arrow" viewBox="0 0 24 24" aria-hidden="true" fill="none"
        stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12h17m-7-7 7 7-7 7" />
      </svg>
      <span class="es2-hud__boss-pointer-icon" data-es2-boss-icon aria-hidden="true"
        :class="{ 'es2-hud__boss-pointer-icon--atlas': view.boss.offscreen.atlas }"
        :style="{ backgroundImage: 'url(' + view.boss.offscreen.artSrc + ')' }"></span>
      <span class="es2-hud__boss-pointer-distance" aria-hidden="true">{{ t('距離') }} {{ view.boss.offscreen.distance }}</span>
    </div>
    <button v-if="active && canReturnHome" ref="infoButton" type="button" class="es2-hud__info-toggle"
      data-es2-info-toggle aria-controls="es2-combat-info-panel" :aria-expanded="infoOpen"
      :aria-label="t('戰鬥資訊')" @click="infoOpen = !infoOpen">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false">
        <path d="M4 6h2m4 0h10M4 12h2m4 0h10M4 18h2m4 0h10" />
      </svg>
    </button>
    <div v-if="view.notices.some(notice => notice.kind === 'critical')" class="es2-hud__urgent-notice" aria-hidden="true">
      {{ t(view.notices.find(notice => notice.kind === 'critical')?.text ?? '') }}
    </div>
    <div id="es2-combat-info-panel" ref="infoPanel" class="es2-hud__info-drawer"
      data-es2-info-panel :aria-label="t('戰鬥資訊')">
      <div class="es2-hud__info-heading">
        <strong>{{ t('戰鬥資訊') }}</strong>
        <button type="button" data-es2-info-close :aria-label="t('關閉對話視窗')" @click="closeInfo(true)">×</button>
      </div>
    <section v-if="view.statuses.length" class="es2-hud__statuses es2-hud__plate" :aria-label="t('暫時效果')">
      <span v-for="status in view.statuses" :key="status.id" :data-es2-status="status.id"
        class="es2-hud__status" :class="'es2-hud__status--' + status.kind"
        :title="t(status.title + (status.remainingSeconds !== undefined ? ' · ' + status.remainingSeconds.toFixed(1) + ' 秒' : ''))">
        <span aria-hidden="true">{{ status.icon ?? (status.kind === 'buff' ? '✦' : '◆') }}</span>
        {{ t(status.title) }}
        <small v-if="status.remainingSeconds !== undefined">{{ status.remainingSeconds.toFixed(1) }}s</small>
      </span>
    </section>
    <div v-if="$slots['mode-progress'] || view.objective || view.objectives.length || view.notices.length"
      class="es2-hud__side" data-es2-information-rail>
      <div v-if="$slots['mode-progress']" class="es2-hud__mode-progress"><slot name="mode-progress" /></div>
      <section v-if="view.objective || view.objectives.length" class="es2-hud__objectives es2-hud__plate" :aria-label="t('任務目標')">
        <div class="es2-hud__section-label"><img class="es2-world-hud-icon" :src="WORLD_ART.ui['hud-quest']" alt="" />{{ t("目前目標") }}</div>
        <p v-if="view.objective">{{ t(view.objective) }}</p>
        <ul v-if="view.objectives.length">
          <li v-for="item in view.objectives" :key="item.id" :class="{ 'es2-hud__complete': item.complete }">
            <span>{{ item.complete ? '✓' : '◇' }} {{ t(item.title) }}</span>
            <span v-if="item.progress !== undefined && item.target !== undefined">{{ item.progress }}/{{ item.target }}</span>
          </li>
        </ul>
      </section>
      <section v-if="view.notices.length" class="es2-hud__notices" :aria-label="t('戰鬥通知')">
        <div v-for="notice in view.notices" :key="notice.id" class="es2-hud__notice"
          :class="'es2-hud__notice--' + notice.kind">{{ t(notice.text) }}</div>
      </section>
    </div>
    <footer class="es2-hud__bottom">
      <div v-if="view.relics.length" class="es2-hud__relics es2-hud__plate" :aria-label="t('已裝備遺物')">
        <span class="es2-hud__eyebrow">{{ t('RELICS') }}</span>
        <div class="es2-hud__relic-grid">
          <span v-for="relic in view.relics" :key="relic.id" :data-es2-relic="relic.id"
            class="es2-hud__relic" :class="'es2-hud__rarity--' + relic.rarity" :title="t(relic.title)" :aria-label="t(relic.title)">
            <img v-if="relic.iconSrc" :src="relic.iconSrc" alt="" decoding="async" />
            <span v-else aria-hidden="true">{{ relic.icon }}</span>
            <small v-if="relic.stacks && relic.stacks > 1" class="es2-hud__relic-stack" :aria-label="t('疊加數量')">×{{ relic.stacks }}</small>
          </span>
        </div>
      </div>
      <div class="es2-hud__equipment es2-hud__plate">
        <div class="es2-hud__equipment-head"><span class="es2-hud__section-label">{{ t("✧ 武器與技能") }}</span><small>{{ view.skills.length }} {{ t('EQUIPPED') }}</small></div>
        <div class="es2-hud__skills" role="group" :aria-label="t('已裝備技能')">
          <button v-for="skill in view.skills" :key="skill.id" type="button" :data-es2-skill="skill.id"
            class="es2-hud__skill" :class="['es2-hud__rarity--' + skill.rarity, { 'es2-hud__skill--evolved': skill.evolved }]"
            :aria-label="t(skillDescription(skill))" :title="t(skillDescription(skill))"
            :aria-pressed="selectedId === skill.id" @click="selectedId = selectedId === skill.id ? null : skill.id">
            <picture v-if="animatedEs2ImageSrc(skill.id)">
              <source media="(prefers-reduced-motion: reduce)" :srcset="skill.iconSrc" />
              <img :src="animatedEs2ImageSrc(skill.id)" alt="" decoding="async" draggable="false" />
            </picture>
            <img v-else-if="skill.iconSrc || !skill.id.includes(':')" :src="skill.iconSrc ?? skillImageSrc(skill.id)" alt="" decoding="async" />
            <span v-else aria-hidden="true" class="es2-hud__skill-glyph">{{ skill.icon }}</span>
            <span class="es2-hud__cooldown" aria-hidden="true" :style="{ '--es2-cooldown': skill.cooldownPct + '%' }"></span>
            <img v-if="skill.cooldown > 0" class="es2-hud__cooldown-icon" :src="WORLD_ART.ui['hud-cooldown']" data-es2-cooldown-art alt="" loading="lazy" decoding="async" />
            <span class="es2-hud__skill-level">Lv.{{ skill.level }}</span>
            <span v-if="skill.evolved" class="es2-hud__evolved" aria-hidden="true">✦</span>
          </button>
          <span v-if="view.skills.length === 0" class="es2-hud__no-skills">{{ t("尚未取得技能") }}</span>
        </div>
        <div v-if="selectedSkill" class="es2-hud__selected" data-es2-skill-detail>
          <strong>{{ t(selectedSkill.title) }} · Lv.{{ selectedSkill.level }}/{{ selectedSkill.maxLevel }}</strong>
          <span>{{ t(selectedSkill.cooldown > 0 ? '冷卻 ' + selectedSkill.cooldown.toFixed(1) + ' 秒' : '可用') }}</span>
        </div>
      </div>
    </footer>
    </div>
  </aside>
</template>

<style scoped>
/* Only HUD-owned overrides: leave the legacy stylesheet, engine canvas and controls untouched. */
.es2-hud__wave-track {
  width: min(200px, 35vw); height: 5px; overflow: hidden; margin: 6px auto 0;
  border-radius: 6px; background: #070d17; border: 1px solid #d8b78366;
}
.es2-hud__wave-track > span {
  display: block; height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, #b78b57, #f7deb0);
  transition: width .12s linear;
}
@media (prefers-reduced-motion: reduce) {
  .es2-hud__wave-track > span { transition: none; }
}
.es2-hud__sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.es2-hud__relic { position: relative; }
.es2-hud__relic-stack {
  position: absolute; right: 0; bottom: 0; padding: 0 2px;
  border-radius: 3px; background: #070b13e8; color: #fff4d1; font: 700 10px/1.25 system-ui;
}
.es2-world-hud-icon{width:15px;height:15px;object-fit:contain;vertical-align:middle;margin-right:4px}
.es2-hud__cooldown-icon{position:absolute;right:2px;top:2px;width:15px;height:15px;object-fit:contain;pointer-events:none;z-index:2}
</style>
