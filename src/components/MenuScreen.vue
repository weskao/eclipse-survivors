<script setup lang="ts">
import { computed } from 'vue'
import { ART_URLS } from '../game/art'
import type { JobId } from '../game/types'
import MenuSceneArt from './MenuSceneArt.vue'
import ModeSelector from './modes/ModeSelector.vue'
import ProgressionPanel from './progression/ProgressionPanel.vue'
import SettingsButton from './SettingsButton.vue'
import type { Profile, RunModeId, PermanentUpgrade, CosmeticId } from '../meta/types'

const props = defineProps<{ active: boolean; choice: JobId; musicOn: boolean; audioUnlocked: boolean; sfxOn: boolean; version: string; runMode?: RunModeId; profile?: Profile }>()
const emit = defineEmits<{
  select: [job: JobId]
  start: []
  mode: [mode: RunModeId]
  purchase: [upgrade: PermanentUpgrade]
  cosmetic: [hero: JobId, skin: CosmeticId]
  reset: []
  toggleMusic: []
  enableAudio: []
  toggleSfx: []
  settings: []
}>()

interface JobCard { id: JobId; mark: string; name: string; role: string }
const CARDS: readonly JobCard[] = [
  { id: 'knight', mark: '01 / VANGUARD', name: '曙鋼騎士', role: '重甲反擊 · 近戰爆發' },
  { id: 'ranger', mark: '02 / HUNTER', name: '夜痕遊俠', role: '精準射擊 · 高機動' },
  { id: 'wizard', mark: '03 / ARCANIST', name: '虛空術士', role: '奧術魔彈 · 元素毀傷' },
]
const current = computed(() => CARDS.find(c => c.id === props.choice) ?? CARDS[0]!)
</script>

<template>
  <div id="menu" class="overlay" :class="{ active }">
    <main class="panel menu-panel">
      <div class="menu-scene">
        <MenuSceneArt />
      </div>
      <header class="menu-brand">
        <div class="menu-eyebrow"><span class="menu-diamond">✦</span> A DARK FANTASY SURVIVAL ADVENTURE <span class="menu-diamond">✦</span></div>
        <h1 class="game-title"><span>ECLIPSE</span><span>SURVIVORS</span></h1>
        <div class="menu-title-rule"><span>✧</span></div>
        <p class="menu-lede">黑夜吞沒失落王國，只有最後的冒險者能迎接黎明。<br>踏入幽暮遺跡，與無盡魔物決一死戰。</p>
        <div class="menu-chapter"><span class="chapter-icon">◈</span><span>CHAPTER I <b>·</b> THE FALLEN KINGDOM</span></div>
      </header>
      <div class="menu-showcase" aria-live="polite" :data-cosmetic="profile?.equippedCosmetics[choice]">
        <div class="showcase-halo" aria-hidden="true"></div>
        <img id="heroSpotlight" alt="目前選擇的英雄角色" :src="ART_URLS[choice]" />
        <div class="showcase-copy"><span>THE CHOSEN HERO</span><strong id="spotlightName">{{ current.name }}</strong><small id="spotlightRole">{{ current.role }}</small></div>
      </div>
      <section class="menu-selection" aria-label="選擇你的起始職業">
        <div class="menu-step">01 <span>／</span> 01 <i></i> PREPARE YOUR JOURNEY</div>
        <div class="menu-section-heading"><span>✧ SELECT YOUR HERO ✧</span><h2>選擇命運的繼承者</h2><p>三種戰鬥風格，選擇屬於你的生存之道。</p></div>
        <div class="cards" id="jobs">
          <button
            v-for="card in CARDS"
            :key="card.id"
            class="job"
            :data-cosmetic="profile?.equippedCosmetics[card.id]"
            :class="{ selected: card.id === choice }"
            :data-job="card.id"
            :aria-pressed="card.id === choice"
            @click="emit('select', card.id)"
          ><span class="job-mark">{{ card.mark }}</span><span class="portrait" :data-portrait="card.id"><img :src="ART_URLS[card.id]" :alt="card.id" /></span><strong>{{ card.name }}</strong><small>{{ card.role }}</small><span class="job-choose" aria-hidden="true">{{ card.id === choice ? "✓ 已選擇" : "點擊選擇" }}</span></button>
        </div>
        <ModeSelector :value="runMode ?? 'quick'" @select="emit('mode', $event)" />
        <div class="menu-cta-wrap"><button id="start" class="cta start-adventure" @click="emit('start')"><span>踏入幽暮之門</span><span class="start-spark" aria-hidden="true">✦</span></button><p>自動攻擊 · 收集精華 · 覺醒全新能力</p></div>
        <ProgressionPanel v-if="profile" :profile="profile" :hero="choice" @purchase="emit('purchase', $event)" @cosmetic="(hero, skin) => emit('cosmetic', hero, skin)" @reset="emit('reset')" />
      </section>
      <footer class="menu-bottom"><span class="menu-controls">⌨ WASD / 方向鍵移動 <b>·</b> SPACE 衝刺 <b>·</b> P 暫停 <b>·</b> 手機支援觸控操作 <span class="menu-version" id="gameVersion">v{{ version }}</span></span><div class="menu-audio-controls"><button v-if="musicOn && !audioUnlocked" id="enableMenuMusic" class="ghost" aria-label="啟用主題音樂" @click="emit('enableAudio')">▶ 啟用主題音樂</button><button id="menuMusic" class="ghost" :aria-pressed="musicOn" @click="emit('toggleMusic')">♫ 背景音樂：{{ musicOn ? (audioUnlocked ? '開' : '待啟用') : '關' }}</button><button id="menuSfx" class="ghost" :aria-pressed="sfxOn" @click="emit('toggleSfx')">♬ 音效：{{ sfxOn ? '開' : '關' }}</button><SettingsButton @open="emit('settings')" /></div></footer>
    </main>
  </div>
</template>
