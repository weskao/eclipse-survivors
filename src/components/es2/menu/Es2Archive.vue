<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, defineAsyncComponent } from 'vue'
import { ART_URLS } from '../../../game/art'
import { skillImageSrc } from '../../../game/ui-art'
import { ACHIEVEMENTS } from '../../../meta/achievements'
import { COSMETICS, cosmeticStyle } from '../../../meta/cosmetics'
import { ACHIEVEMENTS as META_ACHIEVEMENTS } from '../../../game/content/meta/catalog'
import { HERO_DEFINITIONS, isSpecializationId } from '../../../game/content/heroes'
import HeroPortrait from '../hero-roster/HeroPortrait.vue'
import HeroActiveSummary from '../hero-roster/HeroActiveSummary.vue'
import { ACTIVE_HERO_IDS } from '../hero-roster/active-presentation'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import { encyclopedia } from '../../../meta/compendium'
import type { Profile, PermanentUpgrade, CosmeticId } from '../../../meta/types'
import type { HeroId, JobId } from '../../../game/types'
import { isFactionMonster, isNamedBoss, type MonsterId } from '../../../game/monster-catalog'
import ProgressionPanel from '../progression/ProgressionPanel.vue'
import { createMetaState, type MetaState } from '../../../game/content/meta/state'
import type { MenuView, RelicEntry } from './model'
import HallGrowthBoard from '../progression/HallGrowthBoard.vue'
import { legacyHallNodes } from '../progression/hall-model'
import Es2CardDetails from './Es2CardDetails.vue'
import Es2ArchiveCard from './Es2ArchiveCard.vue'
import type { CardDetail } from './Es2CardDetails.vue'
import { monsterGroups } from './monster-details'
const props = defineProps<{
  view: Exclude<MenuView, 'main'>; profile: Profile; hero: JobId; heroId?: HeroId; relics?: readonly RelicEntry[]
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
const cardDetails = computed<Record<string, CardDetail>>(() => {
  const result: Record<string, CardDetail> = {}
  for (const relic of props.relics ?? []) {
    if (!relic.owned) continue
    const description = t(relic.effect ?? relic.description ?? '')
    if (description) result['relic:' + relic.id] = { title: t(relic.title), description,
      lines: relic.description && t(relic.description) !== description ? [t(relic.description)] : [] }
  }
  for (const mob of entries.value.monsters) {
    if (mob.count) result['monster:' + mob.id] = {
      title: t(mob.label), description: t(mob.description),
      groups: monsterGroups(mob.id),
      note: t(mob.id === 'boss' ? '歷史紀錄可能包含未區分的首領擊倒數。' : '基礎數值不含遠征難度、時間成長及菁英加成。'),
    }
  }
  for (const ability of entries.value.abilities) {
    if (ability.discovered) result['skill:' + ability.id] = { title: t(ability.title), description: t(ability.desc) }
  }
  for (const achievement of ACHIEVEMENTS) {
    result['achievement:' + achievement.id] = { title: t(achievement.title), description: t(achievement.hint),
      subtitle: t(props.profile.achievements.includes(achievement.id) ? '✓ 已達成' : '尚未達成') }
  }
  return result
})
const title: Record<Exclude<MenuView, 'main'>, string> = {
  relics: '聖物收藏庫', progression: '永久強化 · 英雄傳承',
  monsters: '魔物圖鑑', skills: '覺醒能力圖鑑', achievements: '遠征成就殿堂',
}
const selectedHeroId = computed(() => props.heroId ?? props.hero)
// Cosmetic ownership still uses the persisted legacy job; portraits use the real hero ID.
const cosmeticHero = computed(() => {
  const id = selectedHeroId.value
  return isSpecializationId(id) ? HERO_DEFINITIONS[id].legacyArtJob : id
})
const skins = computed(() => COSMETICS.filter(item => item.hero === cosmeticHero.value))
function unlockCondition(id: CosmeticId): string | undefined {
  return props.metaStatus
    ? META_ACHIEVEMENTS.find(a => a.cosmetic === id)?.description
    : ACHIEVEMENTS.find(a => a.cosmetic === id)?.hint
}
const legacyNodes = computed(() => legacyHallNodes(props.profile))
function monsterImage(id: MonsterId): string {
  if (isFactionMonster(id)) return WORLD_ART.enemies[id].body
  if (isNamedBoss(id)) return WORLD_ART.bosses[id]
  return ART_URLS[id === 'warlock' ? 'wizard' : id]
}
const monsterFrames = (id: MonsterId) => isFactionMonster(id) ? 6 : isNamedBoss(id) ? 3 : 1
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
      <p v-if="view === 'progression' && metaStatus" class="es2-archive-page-caption">{{ t('研究、裝備與祝福只在下一場遠征開始時生效。') }}</p>
    </header>
    <Es2CardDetails :entries="cardDetails" :scope="view" v-slot="{ open }">
    <section v-if="view === 'progression'" class="es2-archive-section" :aria-label="t('永久強化')">
      <ProgressionPanel v-if="metaStatus" embedded :state="metaState ?? emptyMeta" :hero="hero" :hero-id="selectedHeroId"
        :status="metaStatus" @research="emit('research', $event)"
        @equipment="emit('equipment', $event)" @bonus="emit('bonus', $event)" />
      <div v-else>
      <div class="es2-stat-strip"><div><b>{{ profile.runs }}</b><small>{{ t("遠征次數") }}</small></div><div><b>{{ profile.wins }}</b><small>{{ t("勝利") }}</small></div></div>
      <p class="es2-hint">{{ t("目前職業：") }}{{ t(hero) }} {{ t("· 永久能力於下一次遠征生效。") }}</p>
      <HallGrowthBoard :nodes="legacyNodes" @purchase="emit('purchase', $event.id as PermanentUpgrade)" />
      </div>
      <h3>{{ t("英雄造型") }} <small>{{ t("目前為光環造型 · 不影響戰鬥數值") }}</small></h3>
      <div class="es2-skins" role="group" :aria-label="t('英雄造型')">
        <button v-for="skin in skins" :key="skin.id" type="button" data-ui-sfx="managed"
          :data-es2-cosmetic-option="skin.id" :style="cosmeticStyle(skin.id)"
          :disabled="!profile.unlockedCosmetics.includes(skin.id)"
          :aria-pressed="profile.equippedCosmetics[cosmeticHero] === skin.id"
          :aria-disabled="profile.equippedCosmetics[cosmeticHero] === skin.id ? true : undefined"
          @click="profile.equippedCosmetics[cosmeticHero] !== skin.id && emit('cosmetic', cosmeticHero, skin.id)">
          <span class="es2-skin-preview" aria-hidden="true"><HeroPortrait :hero-id="selectedHeroId" alt="" /><span class="es2-skin-ring"></span>
            <span v-if="profile.equippedCosmetics[cosmeticHero] === skin.id" class="es2-skin-equipped-mark" data-es2-skin-equipped-mark>✓</span>
          </span>
          <strong>{{ t(skin.name) }}</strong>
          <small v-if="!profile.unlockedCosmetics.includes(skin.id)" class="es2-skin-locked"><span aria-hidden="true">🔒</span> {{ t('未解鎖') }}</small>
          <small v-if="!profile.unlockedCosmetics.includes(skin.id) && unlockCondition(skin.id)" class="es2-skin-unlock" data-es2-cosmetic-unlock>{{ t('解鎖條件：{condition}', { condition: t(unlockCondition(skin.id)) }) }}</small>
          <span v-if="profile.unlockedCosmetics.includes(skin.id)" class="es2-skin-status"
             :data-es2-skin-status="profile.equippedCosmetics[cosmeticHero] === skin.id ? 'equipped' : 'available'">
             <span class="es2-skin-status-icon" aria-hidden="true">{{ profile.equippedCosmetics[cosmeticHero] === skin.id ? '✓' : '✦' }}</span>
             <span>{{ t(profile.equippedCosmetics[cosmeticHero] === skin.id ? '✓ 使用中' : '套用造型').replace(/^✓\s*/, '') }}</span>
           </span>
        </button>
      </div>
      <button class="es2-danger" type="button" @click="emit('reset')">{{ t("重置永久進度…") }}</button>
    </section>
    <section v-else-if="view === 'relics'" class="es2-archive-section" :aria-label="t('聖物庫')">
      <div v-if="relics?.length" class="es2-archive-grid"><Es2ArchiveCard v-for="relic in relics" :key="relic.id" :class="`es2-rarity-${relic.rarity ?? 'common'}`"
        :title="t(relic.owned ? relic.title : '未知聖物')" :detail-id="cardDetails['relic:' + relic.id] ? 'relic:' + relic.id : undefined" @open="open">
        <template #art>
          <img v-if="relic.imageSrc" :src="relic.imageSrc" :alt="t('{name} 插畫', { name: t(relic.title) })" loading="lazy" decoding="async" />
          <span v-else class="es2-archive-glyph">{{ relic.icon ?? '✧' }}</span>
        </template>
        <p v-if="!relic.owned">{{ t('尚未發現') }}</p>
      </Es2ArchiveCard></div>
      <p v-else class="es2-empty">{{ t("遠征中發現的聖物將顯示於此。尚無聖物資料可供展示。") }}</p>
    </section>
    <section v-else-if="view === 'monsters'" class="es2-archive-section" :aria-label="t('魔物圖鑑')">
      <div class="es2-archive-grid"><Es2ArchiveCard v-for="mob in entries.monsters" :key="mob.id" :class="{ 'es2-locked': !mob.count }"
        :data-monster-entry="mob.id" :title="t(mob.count ? mob.label : '???')" :detail-id="mob.count ? 'monster:' + mob.id : undefined" @open="open">
        <template #art>
          <span v-if="mob.count && monsterFrames(mob.id) > 1" class="es2-archive-atlas" data-monster-portrait role="img"
            :aria-label="t('{name} 插畫', { name: t(mob.label) })"
            :style="{ backgroundImage: 'url(' + monsterImage(mob.id) + ')', backgroundSize: (monsterFrames(mob.id) * 100) + '% 100%' }" />
          <img v-else-if="mob.count" data-monster-portrait :class="{ 'es2-warlock-portrait': mob.id === 'warlock' }" :src="monsterImage(mob.id)" :alt="t('{name} 插畫', { name: t(mob.label) })" loading="lazy" />
          <span v-else class="es2-archive-glyph" aria-hidden="true">?</span>
        </template>
        <p v-if="!mob.count">{{ t('尚未遭遇') }}</p><small v-if="mob.count">{{ t("擊倒") }} {{ mob.count }}</small>
      </Es2ArchiveCard></div>
    </section>
    <section v-else-if="view === 'skills'" class="es2-archive-section" :aria-label="t('技能圖鑑')">
      <h3 class="es2-archive-active-heading">{{ t('英雄主動技能') }}</h3>
      <div class="es2-archive-active-grid" data-hero-active-catalog>
        <HeroActiveSummary v-for="id in ACTIVE_HERO_IDS" :key="id" :hero-id="id" show-hero />
      </div>
      <div class="es2-archive-grid"><Es2ArchiveCard v-for="ability in entries.abilities" :key="ability.id" :class="{ 'es2-locked': !ability.discovered }"
        :title="t(ability.discovered ? ability.title : '???')" :detail-id="ability.discovered ? 'skill:' + ability.id : undefined" @open="open">
        <template #art>
          <img v-if="ability.discovered" :src="skillImageSrc(ability.id)" :alt="t('{name} 技能插畫', { name: t(ability.title) })" loading="lazy" decoding="async" />
          <span v-else class="es2-archive-glyph">{{ ability.icon }}</span>
        </template>
        <p v-if="!ability.discovered">{{ t('尚未覺醒') }}</p>
      </Es2ArchiveCard></div>
    </section>
    <section v-else class="es2-archive-section" :aria-label="t('成就')">
      <div class="es2-stat-strip"><div><b>{{ profile.achievements.length }} / {{ ACHIEVEMENTS.length }}</b><small>{{ t("已達成") }}</small></div></div>
      <div class="es2-archive-grid"><Es2ArchiveCard v-for="achievement in ACHIEVEMENTS" :key="achievement.id" :class="{ 'es2-locked': !profile.achievements.includes(achievement.id) }"
        :title="t(achievement.title)" :detail-id="'achievement:' + achievement.id" @open="open">
        <template #art><img class="es2-achievement-icon" :src="achievementArt[achievement.id]" :alt="t('{name} 成就徽章', { name: t(achievement.title) })" data-es2-achievement-badge loading="lazy" decoding="async" /></template>
        <small>{{ t(profile.achievements.includes(achievement.id) ? '✓ 已達成' : '尚未達成') }}</small>
      </Es2ArchiveCard></div>
      <component v-if="DevArtGallery" :is="DevArtGallery" view="achievements" />
    </section>
    </Es2CardDetails>
  </section>
</template>

<style scoped>
.es2-archive-active-heading{color:#edcf97;margin:0 0 8px;font-size:1rem}
.es2-archive-active-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:8px;margin-bottom:18px}

</style>