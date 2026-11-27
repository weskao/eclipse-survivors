<script setup lang="ts">
import { t } from '../i18n'
import { animatedEs2ImageSrc, hasGeneratedSkillArt, skillImageSrc } from '../game/ui-art'
import { shallowRef } from 'vue'
import { ART_URLS } from '../game/art'
import { LOW_HP_PCT } from '../game/constants'
import { healthBarColor } from '../game/render/health-bars'
import type { MotionSetting } from '../game/content/accessibility/preferences'
import { useHeroHealthMotion } from './es2/hud/hero-health-motion'
import SettingsButton from './SettingsButton.vue'
import AudioControl from './AudioControl.vue'
import type { HudView } from '../game/store'
import type { JobId } from '../game/types'

const props = defineProps<{
  active: boolean
  hud: HudView
  choice: JobId
  musicOn: boolean
  sfxOn: boolean
  musicVolume?: number
  sfxVolume?: number
  audioActive?: boolean
  healthMotion?: MotionSetting
  toastText: string
  toastVisible: boolean
}>()
const emit = defineEmits<{ toggleMusic: []; toggleSfx: []; musicVolume: [value: number]; sfxVolume: [value: number]; pause: []; settings: [] }>()

const healthMeter = shallowRef<HTMLElement | null>(null)
useHeroHealthMotion(healthMeter, () => props.hud.hpPct, () => props.active, () => props.healthMotion ?? 'system', () => props.hud.heroCriticalVersion ?? 0)
const bossMeter = shallowRef<HTMLElement | null>(null)
useHeroHealthMotion(bossMeter, () => props.hud.bossPct ?? 0, () => props.active && props.hud.bossPct !== null, () => props.healthMotion ?? 'system', () => props.hud.bossCriticalVersion ?? 0)
const minimap = shallowRef<HTMLCanvasElement | null>(null)
defineExpose({ minimap })
</script>

<template>
  <div id="hud" :class="{ active }">
    <div class="top">
      <div class="status" :class="{ 'status-critical': hud.hpPct <= LOW_HP_PCT }">
        <div class="hud-face" id="hudFace"><img :src="ART_URLS[choice]" :alt="choice" /></div>
        <b id="who">{{ t(hud.who) }}</b>
        <div ref="healthMeter" id="hudHealthMeter" class="bar" role="progressbar" :aria-label="t('生命值')" :aria-valuenow="Math.max(0, Math.min(100, hud.hpPct))" aria-valuemin="0" aria-valuemax="100" :style="{ '--es2-progress': Math.max(0, Math.min(100, hud.hpPct)) / 100 }"><i class="hero-hp-trail" aria-hidden="true"></i><i id="hpBar" aria-hidden="true"></i></div>
        <div class="sub" id="hpLabel">{{ t(hud.hpLabel) }}</div>
        <div id="hudExperienceMeter" class="bar exp" role="progressbar" :aria-label="t('經驗值')" :aria-valuenow="Math.max(0, Math.min(100, hud.xpPct))" aria-valuemin="0" aria-valuemax="100"><i id="xpBar" :style="{ width: hud.xpPct + '%' }"></i></div>
      </div>
      <div class="stats">
        <div class="chip" id="timer">{{ hud.timer }}</div>
        <div class="chip">☠ <span id="score">{{ hud.kill }}</span></div>
        <div class="chip hud-actions" role="group" :aria-label="t('遊戲快速操作')">
          <AudioControl context="hud" compact :active="active && (audioActive ?? true)" :music-on="musicOn" :sfx-on="sfxOn" :music-volume="musicVolume ?? 100" :sfx-volume="sfxVolume ?? 100" @toggle-music="emit('toggleMusic')" @toggle-sfx="emit('toggleSfx')" @music-volume="emit('musicVolume', $event)" @sfx-volume="emit('sfxVolume', $event)" />
          <SettingsButton compact @open="emit('settings')" />
          <button id="pauser" :aria-label="t('暫停')" aria-keyshortcuts="P" @click="emit('pause')">Ⅱ<kbd class="pause-shortcut" aria-hidden="true">P</kbd></button>
        </div>
      </div>
    </div>
    <div class="mini-wrap" id="minimapWrap">
      <span>{{ t("暮光遺跡 · 戰域") }}</span>
      <canvas id="minimap" ref="minimap" width="152" height="110" :aria-label="t('戰場小地圖')"></canvas>
    </div>
    <div class="boss-wrap" id="bossWrap" :class="{ show: hud.bossPct !== null }">
      <div class="boss-label">{{ t("☠ 墮落守望者 · MVP") }}</div>
      <div class="boss-meter-frame"><div ref="bossMeter" class="boss-track" :style="{ '--es2-progress': (hud.bossPct ?? 0) / 100 }"><i class="hero-hp-trail" aria-hidden="true"></i><i id="bossHealth" :style="{ background: `linear-gradient(180deg, #ffd1bc3d, transparent 40%, #240b20a6), ${healthBarColor((hud.bossPct ?? 0) / 100, 'boss')}` }"></i></div></div>
    </div>
    <div class="quest" id="quest">{{ t(hud.quest) }}</div>
    <div class="toast" id="toast" :style="{ opacity: toastVisible ? '1' : '0' }">{{ t(toastText) }}</div>
    <div class="bottom-ui">
      <div class="skill-slots" :aria-label="t('已裝備技能')">
        <div v-for="skill in hud.skills" :key="skill.id" class="skill" :class="[skill.rarity, { evolved: skill.evolved }]"
          :data-skill="skill.id" :title="t(`${skill.title} · Lv.${skill.level}/${skill.maxLevel}${skill.cooldown > 0 ? ' · 冷卻 ' + skill.cooldown.toFixed(1) + ' 秒' : ''}`)"
          :aria-label="t(`${skill.title} 等級 ${skill.level}，${skill.cooldown > 0 ? '冷卻 ' + skill.cooldown.toFixed(1) + ' 秒' : '可用'}`)">
          <span class="skill-sigil" aria-hidden="true">
            <picture v-if="animatedEs2ImageSrc(skill.id)">
              <source media="(prefers-reduced-motion: reduce)" :srcset="skill.iconSrc" />
              <img class="skill-art" draggable="false" decoding="async" :src="animatedEs2ImageSrc(skill.id)" alt="" />
            </picture>
            <img v-else-if="skill.iconSrc || (!skill.id.includes(':') && !hasGeneratedSkillArt(skill.id))"
              class="skill-art" draggable="false" decoding="async" :src="skill.iconSrc ?? skillImageSrc(skill.id)" alt="" />
            {{ skill.icon }}
          </span>
          <span class="skill-cooldown" :style="{ height: skill.cooldownPct + '%' }"></span>
          <small class="skill-level">{{ skill.level }}</small>
          <span v-if="skill.evolved" class="skill-evolved" aria-hidden="true">✦</span>
        </div>
      </div>
      <div class="exp-track"><i id="xpTrack" :style="{ width: hud.xpPct + '%' }"></i></div>
    </div>
  </div>
</template>
