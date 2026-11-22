<script setup lang="ts">
import { nextTick } from 'vue'
import { ART_URLS } from '../../../game/art'
import type { HeroId, JobId } from '../../../game/types'
import { HERO_DEFINITIONS } from '../../../game/content/heroes'
import shadowAction from '../../../assets/es2/production/heroes/shadowblade-action@3x.webp'
import spiritAction from '../../../assets/es2/production/heroes/spirit-summoner-action@3x.webp'
import paladinAction from '../../../assets/es2/production/heroes/crimson-paladin-action@3x.webp'
import { modeIds, MODES } from '../../../meta/modes'
import type { Profile, RunModeId } from '../../../meta/types'
import type { MenuView } from './model'
defineProps<{ choice: JobId; heroId?: HeroId; runMode: RunModeId; version: string; profile?: Profile; needsAudioUnlock?: boolean }>()
const emit = defineEmits<{
  select: [hero: JobId]; selectHero: [hero: HeroId]; mode: [mode: RunModeId]; start: []; navigate: [view: MenuView]; settings: []; enableAudio: []
}>()
const heroes: readonly { id: HeroId; name: string; role: string; number: string; image: string; actionSrc?: string }[] = [
  { id: 'knight', name: '曙鋼騎士', role: '重甲反擊 · 近戰爆發', number: '01', image: ART_URLS.knight },
  { id: 'ranger', name: '夜痕遊俠', role: '精準射擊 · 高機動', number: '02', image: ART_URLS.ranger },
  { id: 'wizard', name: '虛空術士', role: '奧術魔彈 · 元素毀傷', number: '03', image: ART_URLS.wizard },
  { id: 'shadowblade', name: HERO_DEFINITIONS.shadowblade.label, role: '雙刃潛襲 · 暗影暴擊', number: '04', image: HERO_DEFINITIONS.shadowblade.portraitSrc, actionSrc: shadowAction },
  { id: 'spirit-summoner', name: HERO_DEFINITIONS['spirit-summoner'].label, role: '靈體召喚 · 奧術支援', number: '05', image: HERO_DEFINITIONS['spirit-summoner'].portraitSrc, actionSrc: spiritAction },
  { id: 'crimson-paladin', name: HERO_DEFINITIONS['crimson-paladin'].label, role: '血誓屏障 · 聖盾反擊', number: '06', image: HERO_DEFINITIONS['crimson-paladin'].portraitSrc, actionSrc: paladinAction },
]
function chooseHero(id: HeroId): void {
  if (id === 'shadowblade' || id === 'spirit-summoner' || id === 'crimson-paladin') emit('selectHero', id)
  else emit('select', id)
}
const links: readonly { id: MenuView; name: string; icon: string }[] = [
  { id: 'progression', name: '永久強化', icon: '◇' }, { id: 'relics', name: '聖物庫', icon: '✧' },
  { id: 'monsters', name: '魔物圖鑑', icon: '♜' }, { id: 'skills', name: '技能圖鑑', icon: '✦' },
  { id: 'achievements', name: '成就殿堂', icon: '♛' },
]
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
const moveHero = (event: KeyboardEvent, id: HeroId): void => { void moveChoice(event, id, heroes.map(hero => hero.id), '.es2-hero-card', next => chooseHero(next as HeroId)) }
const moveMode = (event: KeyboardEvent, id: RunModeId): void => { void moveChoice(event, id, modeIds, '.es2-mode-card', next => emit('mode', next as RunModeId)) }
</script>
<template>
  <main class="es2-menu" aria-label="Eclipse Survivors 主選單">
    <div class="es2-menu-backdrop" aria-hidden="true"><img :src="ART_URLS.courtyard" alt="" /></div>
    <div class="es2-menu-shell">
      <header class="es2-menu-header">
        <div class="es2-menu-brand"><span class="es2-eyebrow">✦ THE CELESTIAL ECLIPSE ✦</span><h1>ECLIPSE <em>SURVIVORS</em></h1><p>穿越失落的國度，成為黑夜之後的第一道曙光。</p></div>
        <div class="es2-top-actions"><span id="gameVersion" class="es2-version menu-version">v{{ version }}</span>
          <button v-if="needsAudioUnlock" type="button" class="es2-icon-button" @click="emit('enableAudio')">♫ 啟用音樂</button>
          <button type="button" class="es2-icon-button" aria-label="開啟遊戲設定" @click="emit('settings')">⚙ <span>設定</span></button>
        </div>
      </header>
      <div class="es2-menu-layout">
        <section class="es2-hero-section" aria-labelledby="es2HeroTitle">
          <div class="es2-section-heading"><span>01 / THE CHOSEN</span><h2 id="es2HeroTitle">選擇命運的繼承者</h2><p>每位英雄都擁有專屬的戰鬥風格。</p></div>
          <div class="es2-hero-grid" role="group" aria-label="選擇英雄">
            <button v-for="hero in heroes" :key="hero.id" type="button" :data-hero="hero.id" class="es2-hero-card"
              :class="{ 'es2-hero-active': (heroId ?? choice) === hero.id }" :aria-pressed="(heroId ?? choice) === hero.id"
              @click="chooseHero(hero.id)" @keydown="moveHero($event, hero.id)">
              <span class="es2-hero-number">{{ hero.number }} / HERO</span>
              <img :src="hero.image" :alt="hero.name + ' 角色肖像'" decoding="async" draggable="false" />
              <span v-if="hero.actionSrc" class="es2-hero-action-preview" :style="{ backgroundImage: `url(${hero.actionSrc})` }" aria-hidden="true"></span>
              <span class="es2-hero-copy"><strong>{{ hero.name }}</strong><small>{{ hero.role }}</small><span class="es2-hero-selection">{{ (heroId ?? choice) === hero.id ? '✓ 已選擇' : '選擇英雄' }}</span></span>
            </button>
          </div>
        </section>
        <section class="es2-mode-section" aria-labelledby="es2ModeTitle">
          <div class="es2-section-heading"><span>02 / THE EXPEDITION</span><h2 id="es2ModeTitle">選擇遠征命運</h2><p>每一條道路都通往不同的試煉。</p></div>
          <div class="es2-mode-grid" role="radiogroup" aria-label="遠征模式">
            <button v-for="id in modeIds" :key="id" type="button" role="radio" :data-mode="id" class="es2-mode-card"
              :aria-checked="runMode === id" :class="{ 'es2-mode-active': runMode === id }"
              @click="emit('mode', id)" @keydown="moveMode($event, id)">
              <span class="es2-mode-mark" aria-hidden="true">{{ id === 'endless' ? '∞' : id === 'challenge' ? '⚡' : id === 'standard' ? '♜' : '✦' }}</span>
              <span class="es2-mode-copy"><strong>{{ MODES[id].label }}</strong><small>{{ MODES[id].description }}</small></span>
              <span class="es2-mode-time">{{ MODES[id].duration === null ? '∞' : Math.ceil((MODES[id].duration ?? 0) / 60) + ' MIN' }}</span>
            </button>
          </div>
          <button class="es2-primary es2-start" type="button" @click="emit('start')">踏入幽暮之門 <span aria-hidden="true">✦</span></button>
          <p class="es2-hint">WASD / 方向鍵移動 · SPACE 衝刺 · 手機支援觸控操作</p>
        </section>
      </div>
      <footer class="es2-menu-footer"><div class="es2-hall-links"><button v-for="link in links" :key="link.id" type="button" @click="emit('navigate', link.id)"><span aria-hidden="true">{{ link.icon }}</span>{{ link.name }}</button></div><span class="es2-embers">✧ {{ profile?.embers ?? 0 }} 暮光餘燼</span></footer>
    </div>
  </main>
</template>
