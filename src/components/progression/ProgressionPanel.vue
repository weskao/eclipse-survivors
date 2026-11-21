<script setup lang="ts">
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
    <summary>✧ 冒險者殿堂 <span>戰績 · 永久強化 · 成就 · 圖鑑</span></summary>
    <div class="progression-content">
      <div class="progression-totals" aria-label="冒險者總紀錄">
        <div><b>{{ profile.runs }}</b><small>總遠征</small></div>
        <div><b>{{ profile.wins }}</b><small>勝利</small></div>
        <div><b>{{ profile.embers }}</b><small>✦ 暮光餘燼</small></div>
        <div><b>{{ profile.achievements.length }} / {{ ACHIEVEMENTS.length }}</b><small>成就</small></div>
      </div>

      <h3>永久強化 <span>於下一次遠征生效</span></h3>
      <div class="progression-upgrades">
        <div v-for="item in upgradeDetails" :key="item.id" class="progression-upgrade">
          <span aria-hidden="true">{{ item.icon }}</span>
          <div><strong>{{ item.title }} · {{ profile.upgrades[item.id] }}/3</strong><small>{{ item.effect }}</small></div>
          <button type="button" :disabled="profile.upgrades[item.id] >= 3 || profile.embers < cost(item.id)"
            @click="emit('purchase', item.id)">{{ profile.upgrades[item.id] >= 3 ? '已滿階' : cost(item.id) + ' ✦' }}</button>
        </div>
      </div>

      <h3>英雄造型 <span>僅影響外觀，不影響戰鬥數值</span></h3>
      <div class="cosmetic-list">
        <button v-for="skin in cosmeticDetails.filter(s => s.hero === hero)" :key="skin.id" type="button"
          :disabled="!profile.unlockedCosmetics.includes(skin.id)" :aria-pressed="profile.equippedCosmetics[hero] === skin.id"
          @click="emit('cosmetic', hero, skin.id)">
          <strong>{{ skin.title }}</strong><small>{{ profile.equippedCosmetics[hero] === skin.id ? '使用中' : profile.unlockedCosmetics.includes(skin.id) ? '點擊套用' : '🔒 ' + skin.desc }}</small>
        </button>
      </div>

      <h3>個人最佳紀錄</h3>
      <div class="progression-records">
        <div v-for="mode in modeIds" :key="mode"><strong>{{ MODES[mode].label }}</strong>
          <span v-if="profile.best[mode]">{{ profile.best[mode]?.kills }} 擊殺 · {{ profile.best[mode]?.seconds }} 秒 · Lv.{{ profile.best[mode]?.level }}</span>
          <span v-else>尚未挑戰</span>
        </div>
      </div>

      <h3>冒險成就</h3>
      <div class="achievement-grid">
        <div v-for="achievement in ACHIEVEMENTS" :key="achievement.id" class="achievement"
          :class="{ locked: !profile.achievements.includes(achievement.id) }">
          <span aria-hidden="true">{{ achievement.icon }}</span>
          <strong>{{ achievement.title }}</strong><small>{{ achievement.hint }}</small>
        </div>
      </div>

      <h3>魔物圖鑑 <span>首次擊倒後公開資料</span></h3>
      <div class="codex-grid">
        <div v-for="monster in catalogue.monsters" :key="monster.id" class="codex-entry" :class="{ locked: !monster.count }">
          <span>{{ monster.icon }}</span><strong>{{ monster.count ? monster.label : '???' }}</strong>
          <small>{{ monster.count ? monster.description + ' · ' + monster.count + ' 擊倒' : '尚未發現' }}</small>
        </div>
      </div>
      <h3>能力圖鑑</h3>
      <div class="codex-grid">
        <div v-for="ability in catalogue.abilities" :key="ability.id" class="codex-entry" :class="{ locked: !ability.discovered }">
          <span>{{ ability.icon }}</span><strong>{{ ability.discovered ? ability.title : '???' }}</strong>
          <small>{{ ability.discovered ? ability.desc : '尚未覺醒' }}</small>
        </div>
      </div>
      <footer class="progression-reset">
        <button type="button" class="ghost" @click="confirmReset = !confirmReset">重置所有進度</button>
        <div v-if="confirmReset" class="reset-confirm"><p>確定永久刪除成就、餘燼、紀錄及造型嗎？</p>
          <button type="button" @click="emit('reset'); confirmReset = false">確認刪除</button>
          <button type="button" @click="confirmReset = false">取消</button>
        </div>
      </footer>
    </div>
  </details>
</template>
