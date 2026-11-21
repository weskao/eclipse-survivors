<script setup lang="ts">
import { skillImageSrc } from '../game/ui-art'
import { shallowRef } from 'vue'
import { ART_URLS } from '../game/art'
import type { HudView } from '../game/store'
import type { JobId } from '../game/types'

defineProps<{
  active: boolean
  hud: HudView
  choice: JobId
  musicOn: boolean
  sfxOn: boolean
  toastText: string
  toastVisible: boolean
}>()
const emit = defineEmits<{ toggleMusic: []; toggleSfx: []; pause: [] }>()

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
          <button id="music" aria-label="音樂切換" :aria-pressed="musicOn" @click="emit('toggleMusic')">{{ musicOn ? '♫' : '♪' }}</button>
          <button id="sfx" aria-label="音效切換" :aria-pressed="sfxOn" @click="emit('toggleSfx')">{{ sfxOn ? '♬' : '♩' }}</button>
          <button id="pauser" aria-label="暫停" @click="emit('pause')">Ⅱ</button>
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
          <span class="skill-sigil" aria-hidden="true"><img class="skill-art" draggable="false" decoding="async" :src="skillImageSrc(skill.id)" alt="" />{{ skill.icon }}</span>
          <span class="skill-cooldown" :style="{ height: skill.cooldownPct + '%' }"></span>
          <small class="skill-level">{{ skill.level }}</small>
          <span v-if="skill.evolved" class="skill-evolved" aria-hidden="true">✦</span>
        </div>
      </div>
      <div class="exp-track"><i id="xpTrack" :style="{ width: hud.xpPct + '%' }"></i></div>
    </div>
  </div>
</template>
