<script setup lang="ts">
import { computed } from 'vue'
import { ART_URLS } from '../../../game/art'
import { skillImageSrc } from '../../../game/ui-art'
import { ACHIEVEMENTS } from '../../../meta/achievements'
import { WORLD_ART, WORLD_UI_IDS } from '../../../game/render/es2/production-world'
import { C104_SOURCES, C104_SURFACES } from '../../../game/render/es2/c104-source-art'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../../game/content/enemies/definitions'
import { BOSS_DEFINITIONS } from '../../../game/content/bosses/definitions'
import { BIOMES } from '../../../game/content/biomes'
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
const worldEnemies = (Object.keys(ENEMY_DEFINITIONS) as FactionKind[]).map(id => ({
  id, title: ENEMY_DEFINITIONS[id].title, ...WORLD_ART.enemies[id],
}))
const worldBosses = Object.values(BOSS_DEFINITIONS).map(boss => ({
  id: boss.id, title: boss.title, src: WORLD_ART.bosses[boss.id],
}))
const worldBiomes = BIOMES.map(biome => ({
  id: biome.id, title: biome.title, ...WORLD_ART.biomes[biome.id],
}))
const worldIcons = WORLD_UI_IDS.map(id => ({ id, src: WORLD_ART.ui[id] }))
const achievementArt: Record<string, string> = {
  'first-blood': WORLD_ART.ui['achievement-flawless'],
  'first-victory': WORLD_ART.ui['achievement-explorer'],
  'monster-hunter': WORLD_ART.ui['achievement-collector'],
  'boss-slayer': WORLD_ART.ui['achievement-boss'],
  'survivor': WORLD_ART.ui['achievement-survivor'],
  'three-heroes': WORLD_ART.ui['achievement-evolution'],
}
type C104Category = keyof typeof C104_SURFACES
const c104Gallery = (Object.keys(C104_SURFACES) as C104Category[]).flatMap(category =>
  C104_SURFACES[category].sources.map(id => ({ id, category, src: C104_SOURCES[id] })))
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
      <h3>暗蝕敵軍 · 美術圖鑑</h3>
      <p class="es2-hint">以下為實際入庫的 WebP 動畫及攻擊預警示意，尚待美術驗收；命中判定仍以遊戲規則為準。</p>
      <div class="es2-world-art-grid" aria-label="十種敵人及預警">
        <article v-for="entry in worldEnemies" :key="entry.id" class="es2-world-art-card" :data-es2-world-enemy="entry.id">
          <span class="es2-world-art-enemy" :style="{ backgroundImage: `url('${entry.body}')` }" aria-hidden="true"></span>
          <img class="es2-world-art-telegraph" :src="entry.telegraph" :data-es2-world-telegraph="entry.id"
            :alt="entry.title + ' 攻擊預警示意'" loading="lazy" decoding="async" />
          <strong>{{ entry.title }}</strong>
        </article>
      </div>
      <h3>四位首領 · 三階段視覺預覽</h3>
      <div class="es2-world-art-grid" aria-label="首領美術">
        <article v-for="entry in worldBosses" :key="entry.id" class="es2-world-art-card" :data-es2-world-boss="entry.id">
          <span class="es2-world-art-boss" :style="{ backgroundImage: `url('${entry.src}')` }" aria-hidden="true"></span>
          <strong>{{ entry.title }}</strong>
        </article>
      </div>
      <h3>暗蝕之地 · 地板與場景裝飾</h3>
      <div class="es2-world-art-grid" aria-label="四種場景美術">
        <article v-for="entry in worldBiomes" :key="entry.id" class="es2-world-art-card" :data-es2-world-biome="entry.id">
          <img class="es2-world-art-scene" :src="entry.scene" :alt="entry.title + ' 場景插畫'" data-es2-biome-scene loading="lazy" decoding="async" />
          <img class="es2-world-art-ground" :src="entry.ground" :alt="entry.title + ' 地板材質'" loading="lazy" decoding="async" />
          <span class="es2-world-art-decor" :style="{ backgroundImage: `url('${entry.decor}')` }" aria-hidden="true"></span>
          <strong>{{ entry.title }}</strong>
        </article>
      </div>
      <details data-es2-c104-gallery class="es2-c104-source-gallery">
        <summary>查看 c104 原始美術圖集（10 張 PNG · 待逐格驗收）</summary>
        <p class="es2-hint">原圖已存入專案並由本介面直接引用；尚未通過精靈邊界審核的接觸圖不得當成遊戲動作影格。</p>
        <div class="es2-c104-source-grid">
          <figure v-for="entry in c104Gallery" :key="entry.id">
            <img :src="entry.src" :data-es2-c104-source="entry.id"
              :alt="entry.category + ' 原始圖板 ' + entry.id" loading="lazy" decoding="async" draggable="false" />
            <figcaption>{{ entry.category }} · {{ entry.id }}</figcaption>
          </figure>
        </div>
      </details>
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
        <img class="es2-achievement-icon" :src="achievementArt[achievement.id]" :alt="achievement.title + ' 成就徽章'" data-es2-achievement-badge loading="lazy" decoding="async" />
        <strong>{{ achievement.title }}</strong><p>{{ achievement.hint }}</p>
        <small>{{ profile.achievements.includes(achievement.id) ? '✓ 已達成' : '尚未達成' }}</small>
      </article></div>
      <h3>寶箱、稀有度、HUD 與成就裝飾 · 美術預覽</h3>
      <p class="es2-hint">以下 17 張圖尚待美術驗收，展示不會增加成就或變更存檔。</p>
      <div class="es2-world-art-grid" aria-label="UI 美術素材">
        <article v-for="entry in worldIcons" :key="entry.id" class="es2-world-art-card" :data-es2-world-ui="entry.id">
          <img class="es2-world-art-icon" :src="entry.src" :alt="entry.id + ' 裝飾圖案'" loading="lazy" decoding="async" />
          <strong>{{ entry.id }}</strong>
        </article>
      </div>
    </section>
  </Es2Dialog>
</template>

<style scoped>
.es2-c104-source-gallery{border:1px solid #88779155;border-radius:11px;padding:12px;margin:20px 0}
.es2-c104-source-gallery summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:#e2c895}
.es2-c104-source-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}
.es2-c104-source-grid figure{margin:0;padding:8px;border:1px solid #a3889455;background:#11131e;border-radius:8px}
.es2-c104-source-grid img{display:block;width:100%;max-height:230px;object-fit:contain;aspect-ratio:1.4}
.es2-c104-source-grid figcaption{font:500 .75rem/1.5 system-ui,sans-serif;color:#d8c9df;margin-top:5px}
.es2-world-art-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,155px),1fr));gap:12px;margin:10px 0 20px}
.es2-world-art-card{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:8px;border:1px solid #8a67855e;background:#1b1726;border-radius:12px;padding:10px;text-align:center;color:#f2e3d1}
.es2-world-art-card strong{font-size:.78rem;overflow-wrap:anywhere}
.es2-world-art-enemy,.es2-world-art-boss,.es2-world-art-decor{display:block;background-repeat:no-repeat;background-position:0 0;background-color:#252239;border-radius:9px;max-width:100%}
.es2-world-art-enemy{width:96px;height:96px;background-size:600% 100%;animation:es2-world-enemy-preview 1.25s steps(6,end) infinite}
.es2-world-art-boss{width:120px;height:120px;background-size:300% 100%;animation:es2-world-boss-preview 1.8s steps(3,end) infinite}
.es2-world-art-telegraph{width:70px;height:70px;object-fit:contain}
.es2-world-art-ground{width:100%;max-width:140px;aspect-ratio:1;object-fit:cover;border-radius:8px}
.es2-world-art-scene{width:100%;max-width:180px;aspect-ratio:16/9;object-fit:contain;border-radius:8px}
.es2-achievement-icon{display:block;width:72px!important;height:72px;object-fit:contain}

.es2-world-art-decor{width:96px;height:96px;background-size:400% 100%;animation:es2-world-decor-preview 2s steps(4,end) infinite}
.es2-world-art-icon{width:72px;height:72px;object-fit:contain}
@keyframes es2-world-enemy-preview{to{background-position:-576px 0}}
@keyframes es2-world-boss-preview{to{background-position:-360px 0}}
@keyframes es2-world-decor-preview{to{background-position:-384px 0}}
@media(prefers-reduced-motion:reduce){.es2-world-art-enemy,.es2-world-art-boss,.es2-world-art-decor{animation:none}}
</style>