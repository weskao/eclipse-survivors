<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { ART_URLS } from '../../../game/art'
import { skillImageSrc } from '../../../game/ui-art'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import AudioControl from '../../AudioControl.vue'
import type { HudView } from '../../../game/store'
import type { HeroId, JobId } from '../../../game/types'
import { HERO_DEFINITIONS, isSpecializationId } from '../../../game/content/heroes'
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
}>(), { audioActive: true })

const view = computed(() => projectCombatHud(props.hud, props.choice, props.feed, props.expectedFeed))
const portrait = computed(() => props.heroId && isSpecializationId(props.heroId)
  ? HERO_DEFINITIONS[props.heroId].portraitSrc : ART_URLS[props.choice])
const selectedId = ref<string | null>(null)
const hudRoot = shallowRef<HTMLElement | null>(null)
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
  <aside ref="hudRoot" class="es2-hud" :class="{ 'es2-hud--active': active }" :aria-hidden="!active" :inert="!active" aria-label="戰鬥資訊">
    <span data-es2-announcement class="es2-hud__sr-only" role="status" aria-live="polite" aria-atomic="true">{{ liveAnnouncement }}</span>
    <header class="es2-hud__top">
      <div class="es2-hud__hero es2-hud__plate">
        <div class="es2-hud__portrait">
          <img :src="portrait" alt="" decoding="async" draggable="false" />
          <span aria-hidden="true" class="es2-hud__portrait-corner">✧</span>
        </div>
        <div class="es2-hud__vitals">
          <div class="es2-hud__identity">
            <span class="es2-hud__eyebrow">ECLIPSE · HERO</span>
            <strong>{{ view.identity }}</strong>
          </div>
          <div class="es2-hud__health-head"><span><img class="es2-world-hud-icon" :src="WORLD_ART.ui['hud-health']" alt="" />生命值</span><span>{{ view.health.label }}</span></div>
          <div class="es2-hud__track es2-hud__track--health" role="progressbar" aria-label="生命值"
            :aria-valuenow="view.health.percent" aria-valuemin="0" aria-valuemax="100">
            <span :style="{ width: view.health.percent + '%' }"></span>
          </div>
          <div class="es2-hud__health-head es2-hud__health-head--xp"><span><img class="es2-world-hud-icon" :src="WORLD_ART.ui['hud-xp']" alt="" />經驗值</span><span>{{ Math.round(view.experience) }}%</span></div>
          <div class="es2-hud__track es2-hud__track--xp" role="progressbar" aria-label="經驗值"
            :aria-valuenow="view.experience" aria-valuemin="0" aria-valuemax="100">
            <span :style="{ width: view.experience + '%' }"></span>
          </div>
        </div>
      </div>
      <div class="es2-hud__top-right">
        <div class="es2-hud__counters es2-hud__plate" aria-label="戰鬥統計">
          <div class="es2-hud__counter"><span aria-hidden="true">◷</span><span>{{ view.timer }}</span><small>TIME</small></div>
          <div class="es2-hud__counter"><span aria-hidden="true">☠</span><span>{{ view.kills }}</span><small>KILLS</small></div>
          <div v-if="view.combo && view.combo.count > 1" class="es2-hud__counter es2-hud__counter--combo" data-es2-combo>
            <span aria-hidden="true">✦</span><span>{{ view.combo.count }}×</span><small>COMBO</small>
          </div>
        </div>
        <nav class="es2-hud__controls es2-hud__plate" aria-label="戰鬥操作">
          <AudioControl v-if="actions.toggleMusic && actions.toggleSfx && actions.setMusicVolume && actions.setSfxVolume && musicOn !== undefined && sfxOn !== undefined && musicVolume !== undefined && sfxVolume !== undefined"
            context="hud" compact :active="active && (audioActive ?? true)"
            :music-on="musicOn ?? false" :sfx-on="sfxOn ?? false"
            :music-volume="musicVolume!" :sfx-volume="sfxVolume!"
            @toggle-music="actions.toggleMusic?.()" @toggle-sfx="actions.toggleSfx?.()"
            @music-volume="actions.setMusicVolume?.($event)" @sfx-volume="actions.setSfxVolume?.($event)" />
          <button type="button" data-es2-settings aria-label="開啟設定" title="設定" @click="actions.settings()">⚙</button>
          <button type="button" data-es2-pause aria-label="暫停遊戲" aria-keyshortcuts="P" title="暫停（P）" @click="actions.pause()">Ⅱ</button>
        </nav>
        <div class="es2-hud__map es2-hud__plate">
          <span class="es2-hud__eyebrow">✦ 戰場地圖</span>
          <canvas ref="minimap" width="152" height="110" aria-label="戰場小地圖"></canvas>
        </div>
      </div>
    </header>
    <section v-if="view.boss" class="es2-hud__boss es2-hud__plate" data-es2-boss aria-label="首領生命">
      <div class="es2-hud__boss-heading">
        <span>☠ {{ view.boss.name }}</span>
        <span v-if="view.boss.phase !== undefined" class="es2-hud__boss-phase">
          PHASE {{ view.boss.phase }}<template v-if="view.boss.totalPhases !== undefined"> / {{ view.boss.totalPhases }}</template>
        </span>
      </div>
      <div class="es2-hud__track es2-hud__track--boss" role="progressbar" aria-label="首領生命值"
        :aria-valuenow="view.boss.percent" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: view.boss.percent + '%' }"></span>
      </div>
    </section>
    <div v-if="view.wave" class="es2-hud__wave es2-hud__plate" data-es2-wave aria-label="波次">
      <span class="es2-hud__eyebrow">WAVE {{ view.wave.number }}</span>
      <strong v-if="view.wave.announcement">{{ view.wave.announcement }}</strong>
      <div v-if="view.wave.progressPct !== undefined" class="es2-hud__wave-track" role="progressbar" aria-label="波次進度"
        :aria-valuenow="view.wave.progressPct" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: view.wave.progressPct + '%' }"></span>
      </div>
    </div>
    <section v-if="view.objective || view.objectives.length" class="es2-hud__objectives es2-hud__plate" aria-label="任務目標">
      <div class="es2-hud__section-label"><img class="es2-world-hud-icon" :src="WORLD_ART.ui['hud-quest']" alt="" />目前目標</div>
      <p v-if="view.objective">{{ view.objective }}</p>
      <ul v-if="view.objectives.length">
        <li v-for="item in view.objectives" :key="item.id" :class="{ 'es2-hud__complete': item.complete }">
          <span>{{ item.complete ? '✓' : '◇' }} {{ item.title }}</span>
          <span v-if="item.progress !== undefined && item.target !== undefined">{{ item.progress }}/{{ item.target }}</span>
        </li>
      </ul>
    </section>
    <section v-if="view.statuses.length" class="es2-hud__statuses es2-hud__plate" aria-label="暫時效果">
      <span v-for="status in view.statuses" :key="status.id" :data-es2-status="status.id"
        class="es2-hud__status" :class="'es2-hud__status--' + status.kind"
        :title="status.title + (status.remainingSeconds !== undefined ? ' · ' + status.remainingSeconds.toFixed(1) + ' 秒' : '')">
        <span aria-hidden="true">{{ status.icon ?? (status.kind === 'buff' ? '✦' : '◆') }}</span>
        {{ status.title }}
        <small v-if="status.remainingSeconds !== undefined">{{ status.remainingSeconds.toFixed(1) }}s</small>
      </span>
    </section>
    <section v-if="view.notices.length" class="es2-hud__notices" aria-label="戰鬥通知">
      <div v-for="notice in view.notices" :key="notice.id" class="es2-hud__notice"
        :class="'es2-hud__notice--' + notice.kind">{{ notice.text }}</div>
    </section>
    <footer class="es2-hud__bottom">
      <div v-if="view.relics.length" class="es2-hud__relics es2-hud__plate" aria-label="已裝備遺物">
        <span class="es2-hud__eyebrow">RELICS</span>
        <div class="es2-hud__relic-grid">
          <span v-for="relic in view.relics" :key="relic.id" :data-es2-relic="relic.id"
            class="es2-hud__relic" :class="'es2-hud__rarity--' + relic.rarity" :title="relic.title" :aria-label="relic.title">
            <img v-if="relic.iconSrc" :src="relic.iconSrc" alt="" decoding="async" />
            <span v-else aria-hidden="true">{{ relic.icon }}</span>
            <small v-if="relic.stacks && relic.stacks > 1" class="es2-hud__relic-stack" aria-label="疊加數量">×{{ relic.stacks }}</small>
          </span>
        </div>
      </div>
      <div class="es2-hud__equipment es2-hud__plate">
        <div class="es2-hud__equipment-head"><span class="es2-hud__section-label">✧ 武器與技能</span><small>{{ view.skills.length }} EQUIPPED</small></div>
        <div class="es2-hud__skills" role="group" aria-label="已裝備技能">
          <button v-for="skill in view.skills" :key="skill.id" type="button" :data-es2-skill="skill.id"
            class="es2-hud__skill" :class="['es2-hud__rarity--' + skill.rarity, { 'es2-hud__skill--evolved': skill.evolved }]"
            :aria-label="skillDescription(skill)" :title="skillDescription(skill)"
            :aria-pressed="selectedId === skill.id" @click="selectedId = selectedId === skill.id ? null : skill.id">
            <img v-if="skill.iconSrc || !skill.id.includes(':')" :src="skill.iconSrc ?? skillImageSrc(skill.id)" alt="" decoding="async" />
            <span v-else aria-hidden="true" class="es2-hud__skill-glyph">{{ skill.icon }}</span>
            <span class="es2-hud__cooldown" aria-hidden="true" :style="{ '--es2-cooldown': skill.cooldownPct + '%' }"></span>
            <img v-if="skill.cooldown > 0" class="es2-hud__cooldown-icon" :src="WORLD_ART.ui['hud-cooldown']" data-es2-cooldown-art alt="" loading="lazy" decoding="async" />
            <span class="es2-hud__skill-level">Lv.{{ skill.level }}</span>
            <span v-if="skill.evolved" class="es2-hud__evolved" aria-hidden="true">✦</span>
          </button>
          <span v-if="view.skills.length === 0" class="es2-hud__no-skills">尚未取得技能</span>
        </div>
        <div v-if="selectedSkill" class="es2-hud__selected" data-es2-skill-detail>
          <strong>{{ selectedSkill.title }} · Lv.{{ selectedSkill.level }}/{{ selectedSkill.maxLevel }}</strong>
          <span>{{ selectedSkill.cooldown > 0 ? '冷卻 ' + selectedSkill.cooldown.toFixed(1) + ' 秒' : '可用' }}</span>
        </div>
      </div>
    </footer>
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
@media (max-width: 700px) {
  .es2-hud__objectives {
    top: max(250px, calc(env(safe-area-inset-top) + 245px));
    left: max(8px, env(safe-area-inset-left)); right: auto;
    width: min(45vw, 205px); max-height: 21vh;
  }
  .es2-hud__statuses {
    top: max(250px, calc(env(safe-area-inset-top) + 245px));
    right: max(8px, env(safe-area-inset-right)); left: auto;
    max-width: 45vw; max-height: 21vh; overflow-y: auto;
  }
  .es2-hud__notices {
    right: max(8px, env(safe-area-inset-right));
    bottom: max(155px, calc(env(safe-area-inset-bottom) + 145px));
    max-width: 50vw;
  }
}
.es2-world-hud-icon{width:15px;height:15px;object-fit:contain;vertical-align:middle;margin-right:4px}
.es2-hud__cooldown-icon{position:absolute;right:2px;top:2px;width:15px;height:15px;object-fit:contain;pointer-events:none;z-index:2}
</style>
