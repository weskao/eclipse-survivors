<script setup lang="ts">
import { t } from '../../i18n'
import { ref, computed } from 'vue'
import { ACHIEVEMENTS } from '../../meta/achievements'
import { encyclopedia } from '../../meta/compendium'
import { modeIds, MODES } from '../../meta/modes'
import type { Profile, PermanentUpgrade, CosmeticId } from '../../meta/types'
import type { JobId } from '../../game/types'

const props = defineProps<{ profile: Profile; hero: JobId }>()
const emit = defineEmits<{
  purchase: [upgrade: PermanentUpgrade]
  cosmetic: [hero: JobId, skin: CosmeticId]
  reset: []
}>()
const confirmReset = ref(false)
const catalogue = computed(() => encyclopedia(props.profile))
const upgradeDetails = [
  { id: 'power' as const, icon: '⚔', title: '破曉之刃', effect: '永久攻擊傷害 +4% / 階' },
  { id: 'vitality' as const, icon: '✚', title: '不滅之心', effect: '永久最大生命 +12 / 階' },
]
const cosmeticDetails: { id: CosmeticId; hero: JobId; title: string; desc: string }[] = [
  { id: 'knight-default', hero: 'knight', title: '原初鎧甲', desc: '初始外觀' },
  { id: 'knight-gilded', hero: 'knight', title: '曙光鎏金', desc: '首勝解鎖' },
  { id: 'ranger-default', hero: 'ranger', title: '森林斗篷', desc: '初始外觀' },
  { id: 'ranger-moonlit', hero: 'ranger', title: '月影獵裝', desc: '百魔斬解鎖' },
  { id: 'wizard-default', hero: 'wizard', title: '初學星袍', desc: '初始外觀' },
  { id: 'wizard-astral', hero: 'wizard', title: '星界法衣', desc: '魔王終結者解鎖' },
]
const cost = (id: PermanentUpgrade): number => 25 * (props.profile.upgrades[id] + 1)
</script>

<template>
  <details class="progression-drawer">
    <summary>{{ t("✧ 冒險者殿堂") }} <span>{{ t("戰績 · 永久強化 · 成就 · 圖鑑") }}</span></summary>
    <div class="progression-content">
      <div class="progression-totals" :aria-label="t('冒險者總紀錄')">
        <div><b>{{ profile.runs }}</b><small>{{ t("總遠征") }}</small></div>
        <div><b>{{ profile.wins }}</b><small>{{ t("勝利") }}</small></div>
        <div><b>{{ profile.embers }}</b><small>{{ t("✦ 暮光餘燼") }}</small></div>
        <div><b>{{ profile.achievements.length }} / {{ ACHIEVEMENTS.length }}</b><small>{{ t("成就") }}</small></div>
      </div>

      <h3>{{ t("永久強化") }} <span>{{ t("於下一次遠征生效") }}</span></h3>
      <div class="progression-upgrades">
        <div v-for="item in upgradeDetails" :key="item.id" class="progression-upgrade">
          <span aria-hidden="true">{{ item.icon }}</span>
          <div><strong>{{ t(item.title) }} · {{ profile.upgrades[item.id] }}/3</strong><small>{{ t(item.effect) }}</small></div>
          <button type="button" :disabled="profile.upgrades[item.id] >= 3 || profile.embers < cost(item.id)"
            @click="emit('purchase', item.id)">{{ t(profile.upgrades[item.id] >= 3 ? '已滿階' : cost(item.id) + ' ✦') }}</button>
        </div>
      </div>

      <h3>{{ t("英雄造型") }} <span>{{ t("僅影響外觀，不影響戰鬥數值") }}</span></h3>
      <div class="cosmetic-list">
        <button v-for="skin in cosmeticDetails.filter(s => s.hero === hero)" :key="skin.id" type="button"
          :disabled="!profile.unlockedCosmetics.includes(skin.id)" :aria-pressed="profile.equippedCosmetics[hero] === skin.id"
          @click="emit('cosmetic', hero, skin.id)">
          <strong>{{ t(skin.title) }}</strong><small>{{ t(profile.equippedCosmetics[hero] === skin.id ? '使用中' : profile.unlockedCosmetics.includes(skin.id) ? '點擊套用' : '🔒 ' + skin.desc) }}</small>
        </button>
      </div>

      <h3>{{ t("個人最佳紀錄") }}</h3>
      <div class="progression-records">
        <div v-for="mode in modeIds" :key="mode"><strong>{{ t(MODES[mode].label) }}</strong>
          <span v-if="profile.best[mode]">{{ profile.best[mode]?.kills }} {{ t("擊殺 ·") }} {{ profile.best[mode]?.seconds }} {{ t("秒 · Lv.") }}{{ profile.best[mode]?.level }}</span>
          <span v-else>{{ t("尚未挑戰") }}</span>
        </div>
      </div>

      <h3>{{ t("冒險成就") }}</h3>
      <div class="achievement-grid">
        <div v-for="achievement in ACHIEVEMENTS" :key="achievement.id" class="achievement"
          :class="{ locked: !profile.achievements.includes(achievement.id) }">
          <span aria-hidden="true">{{ achievement.icon }}</span>
          <strong>{{ t(achievement.title) }}</strong><small>{{ t(achievement.hint) }}</small>
        </div>
      </div>

      <h3>{{ t("魔物圖鑑") }} <span>{{ t("首次擊倒後公開資料") }}</span></h3>
      <div class="codex-grid">
        <div v-for="monster in catalogue.monsters" :key="monster.id" class="codex-entry" :class="{ locked: !monster.count }">
          <span>{{ monster.icon }}</span><strong>{{ monster.count ? t(monster.label) : '???' }}</strong>
          <small>{{ t(monster.count ? monster.description + ' · ' + monster.count + ' 擊倒' : '尚未發現') }}</small>
        </div>
      </div>
      <h3>{{ t("能力圖鑑") }}</h3>
      <div class="codex-grid">
        <div v-for="ability in catalogue.abilities" :key="ability.id" class="codex-entry" :class="{ locked: !ability.discovered }">
          <span>{{ ability.icon }}</span><strong>{{ ability.discovered ? t(ability.title) : '???' }}</strong>
          <small>{{ t(ability.discovered ? ability.desc : '尚未覺醒') }}</small>
        </div>
      </div>
      <footer class="progression-reset">
        <button type="button" class="ghost" @click="confirmReset = !confirmReset">{{ t("重置所有進度") }}</button>
        <div v-if="confirmReset" class="reset-confirm"><p>{{ t("確定永久刪除成就、餘燼、紀錄及造型嗎？") }}</p>
          <button type="button" @click="emit('reset'); confirmReset = false">{{ t("確認刪除") }}</button>
          <button type="button" @click="confirmReset = false">{{ t("取消") }}</button>
        </div>
      </footer>
    </div>
  </details>
</template>
