<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, defineAsyncComponent } from 'vue'
import { ART_URLS } from '../../../game/art'
import { skillImageSrc } from '../../../game/ui-art'
import { ACHIEVEMENTS } from '../../../meta/achievements'
import { COSMETICS } from '../../../meta/cosmetics'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import { encyclopedia } from '../../../meta/compendium'
import type { Profile, PermanentUpgrade, CosmeticId } from '../../../meta/types'
import type { JobId, MobType } from '../../../game/types'
import ProgressionPanel from '../progression/ProgressionPanel.vue'
import { createMetaState, type MetaState } from '../../../game/content/meta/state'
import type { MenuView, RelicEntry } from './model'
import { upgradeCost } from './model'
const props = defineProps<{
  view: Exclude<MenuView, 'main'>; profile: Profile; hero: JobId; relics?: readonly RelicEntry[]
  metaState?: MetaState | null; metaStatus?: 'ready' | 'blocked' | null
}>()
const emit = defineEmits<{
  purchase: [id: PermanentUpgrade]
  reset: []; cosmetic: [hero: JobId, skin: CosmeticId]
  research: [id: string]; equipment: [id: string]; bonus: [id: string]
}>()
// Never include the review gallery (its template, CSS or source assets) in release builds.
const DevArtGallery = import.meta.env.DEV ? defineAsyncComponent(() => import('./Es2DevArtGallery.vue')) : null
const entries = computed(() => encyclopedia(props.profile))
const emptyMeta = createMetaState()
const title: Record<Exclude<MenuView, 'main'>, string> = {
  relics: '聖物收藏庫', progression: '永久強化 · 英雄傳承',
  monsters: '魔物圖鑑', skills: '覺醒能力圖鑑', achievements: '遠征成就殿堂',
}
const skins = COSMETICS
const upgrades: readonly { id: PermanentUpgrade; title: string; icon: string; bonus: string }[] = [
  { id: 'power', title: '破曉之刃', icon: '⚔', bonus: '永久傷害 +4% / 階' },
  { id: 'vitality', title: '不滅之心', icon: '✚', bonus: '永久生命 +12 / 階' },
]
const monsterImage = (id: MobType): string | undefined => id === 'warlock' ? undefined : ART_URLS[id]
const achievementArt: Record<string, string> = {
  'first-blood': WORLD_ART.ui['achievement-flawless'],
  'first-victory': WORLD_ART.ui['achievement-explorer'],
  'monster-hunter': WORLD_ART.ui['achievement-collector'],
  'boss-slayer': WORLD_ART.ui['achievement-boss'],
  'survivor': WORLD_ART.ui['achievement-survivor'],
  'three-heroes': WORLD_ART.ui['achievement-evolution'],
}
</script>
<template>
  <section class="es2-archive-page" :data-es2-archive-page="view" aria-labelledby="es2ArchiveHeading">
    <header class="es2-archive-page-heading">
      <span class="es2-eyebrow">{{ t('冒險者殿堂') }} · ✦</span>
      <h2 id="es2ArchiveHeading">{{ t(title[view]) }}</h2>
    </header>
    <section v-if="view === 'progression'" class="es2-archive-section" :aria-label="t('永久強化')">
      <ProgressionPanel v-if="metaStatus" :state="metaState ?? emptyMeta" :hero="hero"
        :status="metaStatus" @research="emit('research', $event)"
        @equipment="emit('equipment', $event)" @bonus="emit('bonus', $event)" />
      <div v-else>
      <div class="es2-stat-strip"><div><b>{{ profile.runs }}</b><small>{{ t("遠征次數") }}</small></div><div><b>{{ profile.wins }}</b><small>{{ t("勝利") }}</small></div><div><b>{{ profile.embers }}</b><small>{{ t("暮光餘燼") }}</small></div></div>
      <p class="es2-hint">{{ t("目前職業：") }}{{ t(hero) }} {{ t("· 永久能力於下一次遠征生效。") }}</p>
      <div class="es2-archive-grid"><article v-for="entry in upgrades" :key="entry.id" class="es2-archive-card">
        <div class="es2-archive-glyph" aria-hidden="true">{{ entry.icon }}</div><strong>{{ t(entry.title) }}</strong><p>{{ t(entry.bonus) }}</p><small>{{ t("第") }} {{ profile.upgrades[entry.id] }} {{ t("/ 3 階") }}</small>
        <button class="es2-secondary" type="button" data-ui-sfx="managed" :disabled="profile.upgrades[entry.id] >= 3 || profile.embers < upgradeCost(profile.upgrades[entry.id])"
          @click="emit('purchase', entry.id)">{{ t(profile.upgrades[entry.id] >= 3 ? '已滿階' : `升級 · ${upgradeCost(profile.upgrades[entry.id])} ✧`) }}</button>
      </article></div>
      </div>
      <h3>{{ t("英雄造型") }} <small>{{ t("只影響外觀 · 不影響戰鬥數值") }}</small></h3>
      <div class="es2-skins" role="group" :aria-label="t('英雄造型')">
        <button v-for="skin in skins.filter(item => item.hero === hero)" :key="skin.id" type="button" data-ui-sfx="managed"
          :disabled="!profile.unlockedCosmetics.includes(skin.id)"
          :aria-pressed="profile.equippedCosmetics[hero] === skin.id" @click="emit('cosmetic', hero, skin.id)">
          <strong>{{ t(skin.name) }}</strong><small>{{ t(profile.equippedCosmetics[hero] === skin.id ? '✓ 使用中' : profile.unlockedCosmetics.includes(skin.id) ? '套用造型' : '🔒 未解鎖') }}</small>
        </button>
      </div>
      <button class="es2-danger" type="button" @click="emit('reset')">{{ t("重置永久進度…") }}</button>
    </section>
    <section v-else-if="view === 'relics'" class="es2-archive-section" :aria-label="t('聖物庫')">
      <div v-if="relics?.length" class="es2-archive-grid"><article v-for="relic in relics" :key="relic.id" class="es2-archive-card" :class="`es2-rarity-${relic.rarity ?? 'common'}`">
        <img v-if="relic.imageSrc" :src="relic.imageSrc" :alt="t(relic.title + ' 插畫')" loading="lazy" /><div v-else class="es2-archive-glyph">{{ relic.icon ?? '✧' }}</div>
        <strong>{{ t(relic.owned ? relic.title : '未知聖物') }}</strong><p>{{ t(relic.owned ? relic.effect ?? relic.description : '尚未發現') }}</p>
      </article></div>
      <p v-else class="es2-empty">{{ t("遠征中發現的聖物將顯示於此。尚無聖物資料可供展示。") }}</p>
    </section>
    <section v-else-if="view === 'monsters'" class="es2-archive-section" :aria-label="t('魔物圖鑑')">
      <div class="es2-archive-grid"><article v-for="mob in entries.monsters" :key="mob.id" class="es2-archive-card" :class="{ 'es2-locked': !mob.count }">
        <img v-if="mob.count && monsterImage(mob.id)" :src="monsterImage(mob.id)" :alt="t(mob.label + ' 插畫')" loading="lazy" />
        <span v-else class="es2-archive-glyph">{{ mob.icon }}</span><strong>{{ t(mob.count ? mob.label : '???') }}</strong>
        <p>{{ t(mob.count ? mob.description : '尚未遭遇') }}</p><small v-if="mob.count">{{ t("擊倒") }} {{ mob.count }}</small>
      </article></div>
      <component v-if="DevArtGallery" :is="DevArtGallery" view="monsters" />
    </section>
    <section v-else-if="view === 'skills'" class="es2-archive-section" :aria-label="t('技能圖鑑')">
      <div class="es2-archive-grid"><article v-for="ability in entries.abilities" :key="ability.id" class="es2-archive-card" :class="{ 'es2-locked': !ability.discovered }">
        <img v-if="ability.discovered" :src="skillImageSrc(ability.id)" :alt="t(ability.title + ' 技能插畫')" loading="lazy" />
        <span v-else class="es2-archive-glyph">{{ ability.icon }}</span><strong>{{ t(ability.discovered ? ability.title : '???') }}</strong>
        <p>{{ t(ability.discovered ? ability.desc : '尚未覺醒') }}</p>
      </article></div>
    </section>
    <section v-else class="es2-archive-section" :aria-label="t('成就')">
      <div class="es2-stat-strip"><div><b>{{ profile.achievements.length }} / {{ ACHIEVEMENTS.length }}</b><small>{{ t("已達成") }}</small></div></div>
      <div class="es2-archive-grid"><article v-for="achievement in ACHIEVEMENTS" :key="achievement.id" class="es2-archive-card" :class="{ 'es2-locked': !profile.achievements.includes(achievement.id) }">
        <img class="es2-achievement-icon" :src="achievementArt[achievement.id]" :alt="t(achievement.title + ' 成就徽章')" data-es2-achievement-badge loading="lazy" decoding="async" />
        <strong>{{ t(achievement.title) }}</strong><p>{{ t(achievement.hint) }}</p>
        <small>{{ t(profile.achievements.includes(achievement.id) ? '✓ 已達成' : '尚未達成') }}</small>
      </article></div>
      <component v-if="DevArtGallery" :is="DevArtGallery" view="achievements" />
    </section>
  </section>
</template>

<style scoped>
.es2-achievement-icon{display:block;width:64px!important;height:64px;object-fit:contain}
</style>