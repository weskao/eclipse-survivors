<script setup lang="ts">
import { computed } from 'vue'
import { ART_URLS } from '../../../game/art'
import { skillImageSrc } from '../../../game/ui-art'
import { ACHIEVEMENTS } from '../../../meta/achievements'
import { encyclopedia } from '../../../meta/compendium'
import type { Profile, PermanentUpgrade, CosmeticId } from '../../../meta/types'
import type { JobId, MobType } from '../../../game/types'
import Es2Dialog from './Es2Dialog.vue'
import ProgressionPanel from '../progression/ProgressionPanel.vue'
import { createMetaState, type MetaState } from '../../../game/content/meta/state'
import type { MenuView, RelicEntry } from './model'
import { upgradeCost } from './model'
const props = defineProps<{
  active: boolean; view: Exclude<MenuView, 'main'>; profile: Profile; hero: JobId; relics?: readonly RelicEntry[]
  metaState?: MetaState | null; metaStatus?: 'ready' | 'blocked' | null
}>()
const emit = defineEmits<{
  close: []; navigate: [view: Exclude<MenuView, 'main'>]; purchase: [id: PermanentUpgrade]
  reset: []; cosmetic: [hero: JobId, skin: CosmeticId]
  research: [id: string]; equipment: [id: string]; bonus: [id: string]
}>()
const entries = computed(() => encyclopedia(props.profile))
const emptyMeta = createMetaState()
const title: Record<Exclude<MenuView, 'main'>, string> = {
  relics: '聖物收藏庫', progression: '永久強化 · 英雄傳承',
  monsters: '魔物圖鑑', skills: '覺醒能力圖鑑', achievements: '遠征成就殿堂',
}
const tabs: readonly { id: Exclude<MenuView, 'main'>; title: string }[] = [
  { id: 'progression', title: '永久強化' }, { id: 'relics', title: '聖物' },
  { id: 'monsters', title: '魔物' }, { id: 'skills', title: '能力' }, { id: 'achievements', title: '成就' },
]
const skins: readonly { id: CosmeticId; hero: JobId; name: string }[] = [
  { id: 'knight-default', hero: 'knight', name: '原初鎧甲' },
  { id: 'knight-gilded', hero: 'knight', name: '曙光鎏金' },
  { id: 'ranger-default', hero: 'ranger', name: '森林斗篷' },
  { id: 'ranger-moonlit', hero: 'ranger', name: '月影獵裝' },
  { id: 'wizard-default', hero: 'wizard', name: '初學星袍' },
  { id: 'wizard-astral', hero: 'wizard', name: '星界法衣' },
]
const upgrades: readonly { id: PermanentUpgrade; title: string; icon: string; bonus: string }[] = [
  { id: 'power', title: '破曉之刃', icon: '⚔', bonus: '永久傷害 +4% / 階' },
  { id: 'vitality', title: '不滅之心', icon: '✚', bonus: '永久生命 +12 / 階' },
]
const monsterImage = (id: MobType): string | undefined => id === 'warlock' ? undefined : ART_URLS[id]
</script>
<template>
  <Es2Dialog :active="active" :title="title[view]" subtitle="冒險者殿堂 · 記錄每一場遠征留下的印記" wide @cancel="emit('close')">
    <nav class="es2-archive-tabs" aria-label="殿堂分類">
      <button v-for="tab in tabs" :key="tab.id" type="button" :aria-current="view === tab.id ? 'page' : undefined"
        :class="{ 'es2-tab-current': view === tab.id }" @click="emit('navigate', tab.id)">{{ tab.title }}</button>
    </nav>
    <section v-if="view === 'progression'" class="es2-archive-section" aria-label="永久強化">
      <ProgressionPanel v-if="metaStatus" :state="metaState ?? emptyMeta" :hero="hero"
        :status="metaStatus" @research="emit('research', $event)"
        @equipment="emit('equipment', $event)" @bonus="emit('bonus', $event)" />
      <div v-else>
      <div class="es2-stat-strip"><div><b>{{ profile.runs }}</b><small>遠征次數</small></div><div><b>{{ profile.wins }}</b><small>勝利</small></div><div><b>{{ profile.embers }}</b><small>暮光餘燼</small></div></div>
      <p class="es2-hint">目前職業：{{ hero }} · 永久能力於下一次遠征生效。</p>
      <div class="es2-archive-grid"><article v-for="entry in upgrades" :key="entry.id" class="es2-archive-card">
        <div class="es2-archive-glyph" aria-hidden="true">{{ entry.icon }}</div><strong>{{ entry.title }}</strong><p>{{ entry.bonus }}</p><small>第 {{ profile.upgrades[entry.id] }} / 3 階</small>
        <button class="es2-secondary" type="button" :disabled="profile.upgrades[entry.id] >= 3 || profile.embers < upgradeCost(profile.upgrades[entry.id])"
          @click="emit('purchase', entry.id)">{{ profile.upgrades[entry.id] >= 3 ? '已滿階' : `升級 · ${upgradeCost(profile.upgrades[entry.id])} ✧` }}</button>
      </article></div>
      </div>
      <h3>英雄造型 <small>只影響外觀 · 不影響戰鬥數值</small></h3>
      <div class="es2-skins" role="group" aria-label="英雄造型">
        <button v-for="skin in skins.filter(item => item.hero === hero)" :key="skin.id" type="button"
          :disabled="!profile.unlockedCosmetics.includes(skin.id)"
          :aria-pressed="profile.equippedCosmetics[hero] === skin.id" @click="emit('cosmetic', hero, skin.id)">
          <strong>{{ skin.name }}</strong><small>{{ profile.equippedCosmetics[hero] === skin.id ? '✓ 使用中' : profile.unlockedCosmetics.includes(skin.id) ? '套用造型' : '🔒 未解鎖' }}</small>
        </button>
      </div>
      <button class="es2-danger" type="button" @click="emit('reset')">重置永久進度…</button>
    </section>
    <section v-else-if="view === 'relics'" class="es2-archive-section" aria-label="聖物庫">
      <div v-if="relics?.length" class="es2-archive-grid"><article v-for="relic in relics" :key="relic.id" class="es2-archive-card" :class="`es2-rarity-${relic.rarity ?? 'common'}`">
        <img v-if="relic.imageSrc" :src="relic.imageSrc" :alt="relic.title + ' 插畫'" loading="lazy" /><div v-else class="es2-archive-glyph">{{ relic.icon ?? '✧' }}</div>
        <strong>{{ relic.owned ? relic.title : '未知聖物' }}</strong><p>{{ relic.owned ? relic.effect ?? relic.description : '尚未發現' }}</p>
      </article></div>
      <p v-else class="es2-empty">遠征中發現的聖物將顯示於此。尚無聖物資料可供展示。</p>
    </section>
    <section v-else-if="view === 'monsters'" class="es2-archive-section" aria-label="魔物圖鑑">
      <div class="es2-archive-grid"><article v-for="mob in entries.monsters" :key="mob.id" class="es2-archive-card" :class="{ 'es2-locked': !mob.count }">
        <img v-if="mob.count && monsterImage(mob.id)" :src="monsterImage(mob.id)" :alt="mob.label + ' 插畫'" loading="lazy" />
        <span v-else class="es2-archive-glyph">{{ mob.icon }}</span><strong>{{ mob.count ? mob.label : '???' }}</strong>
        <p>{{ mob.count ? mob.description : '尚未遭遇' }}</p><small v-if="mob.count">擊倒 {{ mob.count }}</small>
      </article></div>
    </section>
    <section v-else-if="view === 'skills'" class="es2-archive-section" aria-label="技能圖鑑">
      <div class="es2-archive-grid"><article v-for="ability in entries.abilities" :key="ability.id" class="es2-archive-card" :class="{ 'es2-locked': !ability.discovered }">
        <img v-if="ability.discovered" :src="skillImageSrc(ability.id)" :alt="ability.title + ' 技能插畫'" loading="lazy" />
        <span v-else class="es2-archive-glyph">{{ ability.icon }}</span><strong>{{ ability.discovered ? ability.title : '???' }}</strong>
        <p>{{ ability.discovered ? ability.desc : '尚未覺醒' }}</p>
      </article></div>
    </section>
    <section v-else class="es2-archive-section" aria-label="成就">
      <div class="es2-stat-strip"><div><b>{{ profile.achievements.length }} / {{ ACHIEVEMENTS.length }}</b><small>已達成</small></div></div>
      <div class="es2-archive-grid"><article v-for="achievement in ACHIEVEMENTS" :key="achievement.id" class="es2-archive-card" :class="{ 'es2-locked': !profile.achievements.includes(achievement.id) }">
        <span class="es2-archive-glyph">{{ achievement.icon }}</span><strong>{{ achievement.title }}</strong><p>{{ achievement.hint }}</p>
        <small>{{ profile.achievements.includes(achievement.id) ? '✓ 已達成' : '尚未達成' }}</small>
      </article></div>
    </section>
  </Es2Dialog>
</template>
