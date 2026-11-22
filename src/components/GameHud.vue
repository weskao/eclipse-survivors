<script setup lang="ts">
import { hasGeneratedSkillArt, skillImageSrc } from '../game/ui-art'
import { shallowRef } from 'vue'
import { ART_URLS } from '../game/art'
import SettingsButton from './SettingsButton.vue'
import AudioControl from './AudioControl.vue'
import type { HudView } from '../game/store'
import type { JobId } from '../game/types'

defineProps<{
  active: boolean
  hud: HudView
  choice: JobId
  musicOn: boolean
  sfxOn: boolean
  musicVolume?: number
  sfxVolume?: number
  audioActive?: boolean
  toastText: string
  toastVisible: boolean
}>()
const emit = defineEmits<{ toggleMusic: []; toggleSfx: []; musicVolume: [value: number]; sfxVolume: [value: number]; pause: []; settings: [] }>()

const minimap = shallowRef<HTMLCanvasElement | null>(null)
defineExpose({ minimap })
</script>

<template>
  <div id="hud" :class="{ active }">
    <div class="top">
      <div class="status">
        <div class="hud-face" id="hudFace"><img :src="ART_URLS[choice]" :alt="choice" /></div>
        <b id="who">{{ hud.who }}</b>
        <div class="bar"><i id="hpBar" :style="{ width: hud.hpPct + '%' }"></i></div>
        <div class="sub" id="hpLabel">{{ hud.hpLabel }}</div>
        <div class="bar exp"><i id="xpBar" :style="{ width: hud.xpPct + '%' }"></i></div>
      </div>
      <div class="stats">
        <div class="chip" id="timer">{{ hud.timer }}</div>
        <div class="chip">☠ <span id="score">{{ hud.kill }}</span></div>
        <div class="chip">
          <AudioControl context="hud" compact :active="active && (audioActive ?? true)" :music-on="musicOn" :sfx-on="sfxOn" :music-volume="musicVolume ?? 100" :sfx-volume="sfxVolume ?? 100" @toggle-music="emit('toggleMusic')" @toggle-sfx="emit('toggleSfx')" @music-volume="emit('musicVolume', $event)" @sfx-volume="emit('sfxVolume', $event)" />
          <SettingsButton compact @open="emit('settings')" />
          <button id="pauser" aria-label="暫停" aria-keyshortcuts="P" @click="emit('pause')">Ⅱ<kbd class="pause-shortcut" aria-hidden="true">P</kbd></button>
        </div>
      </div>
    </div>
    <div class="mini-wrap" id="minimapWrap">
      <span>暮光遺跡 · 戰域</span>
      <canvas id="minimap" ref="minimap" width="152" height="110" aria-label="戰場小地圖"></canvas>
    </div>
    <div class="boss-wrap" id="bossWrap" :class="{ show: hud.bossPct !== null }">
      <div class="boss-label">☠ 墮落守望者 · MVP</div>
      <div class="boss-track"><i id="bossHealth" :style="{ width: (hud.bossPct ?? 0) + '%' }"></i></div>
    </div>
    <div class="quest" id="quest">{{ hud.quest }}</div>
    <div class="toast" id="toast" :style="{ opacity: toastVisible ? '1' : '0' }">{{ toastText }}</div>
    <div class="bottom-ui">
      <div class="skill-slots" aria-label="已裝備技能">
        <div v-for="skill in hud.skills" :key="skill.id" class="skill" :class="[skill.rarity, { evolved: skill.evolved }]"
          :data-skill="skill.id" :title="`${skill.title} · Lv.${skill.level}/${skill.maxLevel}${skill.cooldown > 0 ? ' · 冷卻 ' + skill.cooldown.toFixed(1) + ' 秒' : ''}`"
          :aria-label="`${skill.title} 等級 ${skill.level}，${skill.cooldown > 0 ? '冷卻 ' + skill.cooldown.toFixed(1) + ' 秒' : '可用'}`">
          <span class="skill-sigil" aria-hidden="true"><img v-if="skill.iconSrc || (!skill.id.includes(':') && !hasGeneratedSkillArt(skill.id))" class="skill-art" draggable="false" decoding="async" :src="skill.iconSrc ?? skillImageSrc(skill.id)" alt="" />{{ skill.icon }}</span>
          <span class="skill-cooldown" :style="{ height: skill.cooldownPct + '%' }"></span>
          <small class="skill-level">{{ skill.level }}</small>
          <span v-if="skill.evolved" class="skill-evolved" aria-hidden="true">✦</span>
        </div>
      </div>
      <div class="exp-track"><i id="xpTrack" :style="{ width: hud.xpPct + '%' }"></i></div>
    </div>
  </div>
</template>
