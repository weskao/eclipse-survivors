<script setup lang="ts">
import { t } from '../../../i18n'
import { WORLD_ART, WORLD_UI_IDS, WORLD_UI_LABELS } from '../../../game/render/es2/production-world'
import { C104_SOURCES, C104_SURFACES } from '../../../game/render/es2/c104-source-art'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../../game/content/enemies/definitions'
import { BOSS_DEFINITIONS } from '../../../game/content/bosses/definitions'
import { BIOMES } from '../../../game/content/biomes'

defineProps<{ view: 'monsters' | 'achievements' }>()
const worldEnemies = (Object.keys(ENEMY_DEFINITIONS) as FactionKind[]).map(id => ({
  id, title: ENEMY_DEFINITIONS[id].title, ...WORLD_ART.enemies[id],
}))
const worldBosses = Object.values(BOSS_DEFINITIONS).map(boss => ({
  id: boss.id, title: boss.title, src: WORLD_ART.bosses[boss.id],
}))
const worldBiomes = BIOMES.map(biome => ({
  id: biome.id, title: biome.title, ...WORLD_ART.biomes[biome.id],
}))
const worldIcons = WORLD_UI_IDS.map(id => ({ id, title: WORLD_UI_LABELS[id], src: WORLD_ART.ui[id] }))
type C104Category = keyof typeof C104_SURFACES
const c104Gallery = (Object.keys(C104_SURFACES) as C104Category[]).flatMap(category =>
  C104_SURFACES[category].sources.map(id => ({ id, category, src: C104_SOURCES[id] })))
</script>
<template>
  <div v-if="view === 'monsters'">
      <h3>{{ t("暗蝕敵軍 · 美術圖鑑") }}</h3>
      <p class="es2-hint">{{ t("以下為實際入庫的 WebP 動畫及攻擊預警示意，尚待美術驗收；命中判定仍以遊戲規則為準。") }}</p>
      <div class="es2-world-art-grid" :aria-label="t('十種敵人及預警')">
        <article v-for="entry in worldEnemies" :key="entry.id" class="es2-world-art-card" :data-es2-world-enemy="entry.id">
          <span class="es2-world-art-enemy" :style="{ backgroundImage: `url('${entry.body}')` }" aria-hidden="true"></span>
          <img class="es2-world-art-telegraph" :src="entry.telegraph" :data-es2-world-telegraph="entry.id"
            :alt="t('{name} 攻擊預警示意', { name: t(entry.title) })" loading="lazy" decoding="async" />
          <strong>{{ t(entry.title) }}</strong>
        </article>
      </div>
      <h3>{{ t("四位首領 · 三階段視覺預覽") }}</h3>
      <div class="es2-world-art-grid" :aria-label="t('首領美術')">
        <article v-for="entry in worldBosses" :key="entry.id" class="es2-world-art-card" :data-es2-world-boss="entry.id">
          <span class="es2-world-art-boss" :style="{ backgroundImage: `url('${entry.src}')` }" aria-hidden="true"></span>
          <strong>{{ t(entry.title) }}</strong>
        </article>
      </div>
      <h3>{{ t("暗蝕之地 · 地板與場景裝飾") }}</h3>
      <div class="es2-world-art-grid" :aria-label="t('四種場景美術')">
        <article v-for="entry in worldBiomes" :key="entry.id" class="es2-world-art-card" :data-es2-world-biome="entry.id">
          <img class="es2-world-art-scene" :src="entry.scene" :alt="t('{name} 場景插畫', { name: t(entry.title) })" data-es2-biome-scene loading="lazy" decoding="async" />
          <img class="es2-world-art-ground" :src="entry.ground" :alt="t('{name} 地板材質', { name: t(entry.title) })" loading="lazy" decoding="async" />
          <span class="es2-world-art-decor" :style="{ backgroundImage: `url('${entry.decor}')` }" aria-hidden="true"></span>
          <strong>{{ t(entry.title) }}</strong>
        </article>
      </div>
      <div data-es2-c104-gallery class="es2-c104-source-gallery">
        <h3>{{ t("c104 原始美術圖集（10 張 PNG · 待逐格驗收）") }}</h3>
        <p class="es2-hint">{{ t("原圖已存入專案並由本介面直接引用；尚未通過精靈邊界審核的接觸圖不得當成遊戲動作影格。") }}</p>
        <div class="es2-c104-source-grid">
          <figure v-for="entry in c104Gallery" :key="entry.id">
            <img :src="entry.src" :data-es2-c104-source="entry.id"
              :alt="t('{category} 原始圖板 {id}', { category: t(entry.category), id: entry.id })" loading="lazy" decoding="async" draggable="false" />
            <figcaption>{{ t(entry.category) }} · {{ entry.id }}</figcaption>
          </figure>
        </div>
      </div>
  </div>
  <div v-else>
      <h3>{{ t("寶箱、稀有度、HUD 與成就裝飾 · 美術預覽") }}</h3>
      <div class="es2-world-art-grid" :aria-label="t('UI 美術素材')">
        <article v-for="entry in worldIcons" :key="entry.id" class="es2-world-art-card" :data-es2-world-ui="entry.id">
          <img class="es2-world-art-icon" :src="entry.src" :alt="t('{name} 裝飾圖案', { name: t(entry.title) })" loading="lazy" decoding="async" />
          <strong>{{ t(entry.title) }}</strong>
        </article>
      </div>
  </div>
</template>

<style scoped>
.es2-c104-source-gallery{border:1px solid #88779155;border-radius:11px;padding:12px;margin:20px 0}
.es2-c104-source-gallery h3{margin:0 0 12px;color:#e2c895}
.es2-c104-source-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}
.es2-c104-source-grid figure{margin:0;padding:8px;border:1px solid #a3889455;background:#11131e;border-radius:8px}
.es2-c104-source-grid img{display:block;width:100%;max-height:230px;object-fit:contain;aspect-ratio:1.4}
.es2-c104-source-grid figcaption{font:500 .75rem/1.5 var(--es2-font-numeric), system-ui,sans-serif;color:#d8c9df;margin-top:5px}
.es2-world-art-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,155px),1fr));gap:12px;margin:10px 0 20px}
.es2-world-art-card{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:8px;border:1px solid #8a67855e;background:#1b1726;border-radius:12px;padding:10px;text-align:center;color:#f2e3d1}
.es2-world-art-card strong{font-size:.78rem;overflow-wrap:anywhere}
.es2-world-art-enemy,.es2-world-art-boss,.es2-world-art-decor{display:block;background-repeat:no-repeat;background-position:0 0;background-color:#252239;border-radius:9px;max-width:100%}
.es2-world-art-enemy{width:96px;height:96px;background-size:600% 100%;animation:es2-world-enemy-preview 1.25s steps(6,end) infinite}
.es2-world-art-boss{width:120px;height:120px;background-size:300% 100%;animation:es2-world-boss-preview 1.8s steps(3,end) infinite}
.es2-world-art-telegraph{width:70px;height:70px;object-fit:contain}
.es2-world-art-ground{width:100%;max-width:140px;aspect-ratio:1;object-fit:cover;border-radius:8px}
.es2-world-art-scene{width:100%;max-width:180px;aspect-ratio:16/9;object-fit:contain;border-radius:8px}

.es2-world-art-decor{width:96px;height:96px;background-size:400% 100%;animation:es2-world-decor-preview 2s steps(4,end) infinite}
.es2-world-art-icon{width:64px;height:64px;object-fit:contain}
@keyframes es2-world-enemy-preview{to{background-position:-576px 0}}
@keyframes es2-world-boss-preview{to{background-position:-360px 0}}
@keyframes es2-world-decor-preview{to{background-position:-384px 0}}
@media(prefers-reduced-motion:reduce){.es2-world-art-enemy,.es2-world-art-boss,.es2-world-art-decor{animation:none}}
</style>
