<script setup lang="ts">
import { animatedEs2ImageSrc, stillEs2ImageSrc, animatedSkillImageSrc, hasGeneratedSkillArt, skillImageSrc } from '../game/ui-art'
import type { AbilityId, UpgradeDef } from '../game/types'
import SettingsButton from './SettingsButton.vue'

defineProps<{ active: boolean; upgrades: readonly UpgradeDef[]; effect?: 'soft' | 'still' }>()
const emit = defineEmits<{ choose: [id: AbilityId]; settings: [] }>()
const rarityLabel = { common: '普通', rare: '稀有', legendary: '傳說' } as const
</script>

<template>
  <div id="level" class="overlay" :class="{ active, 'still-upgrades': effect === 'still' }">
    <div class="panel">
      <SettingsButton compact class="level-settings-button" @open="emit('settings')" />
      <header class="level-headline">
        <span class="level-seal" aria-hidden="true">✦</span>
        <div class="level-heading-copy">
          <div class="kicker">LEVEL UP · CHOOSE YOUR BLESSING</div>
          <h2>獲得新的命運刻印</h2>
        </div>
        <span class="level-seal" aria-hidden="true">✦</span>
      </header>
      <div class="cards" id="upgrades">
        <button v-for="(u, i) in upgrades" :key="u.id" class="upgrade" :class="[u.rarity, { evolution: u.isEvolution }]"
          :data-up="u.id" @click="emit('choose', u.id)">
          <span class="upgrade-rarity">{{ rarityLabel[u.rarity] }}<span v-if="u.isEvolution"> · EVOLUTION</span></span>
          <span class="portrait skill-sigil" aria-hidden="true">
            <picture v-if="animatedEs2ImageSrc(u.id)">
              <source media="(prefers-reduced-motion: reduce)" :srcset="u.iconSrc ?? stillEs2ImageSrc(u.id)" />
              <img class="skill-art" draggable="false" decoding="async"
                :src="effect === 'still' ? (u.iconSrc ?? stillEs2ImageSrc(u.id)) : animatedEs2ImageSrc(u.id)" alt="" />
            </picture>
            <picture v-else-if="hasGeneratedSkillArt(u.id)">
              <source media="(prefers-reduced-motion: reduce)" :srcset="skillImageSrc(u.id)" />
              <img class="skill-art" draggable="false" decoding="async" :src="effect === 'still' ? skillImageSrc(u.id) : animatedSkillImageSrc(u.id)" alt="" />
            </picture>
            <img v-else-if="u.iconSrc || !u.id.includes(':')" class="skill-art" draggable="false" decoding="async" :src="u.iconSrc ?? skillImageSrc(u.id)" alt="" />
            {{ u.icon }}
          </span>
          <strong>{{ u.title }}</strong>
          <span v-if="u.level !== undefined" class="upgrade-level">
            {{ u.isEvolution ? '究極進化' : `Lv.${u.level} → ${u.level + 1} / ${u.maxLevel}` }}
          </span>
          <small class="upgrade-desc">{{ u.desc }}</small>
          <small v-if="u.requirements" class="upgrade-requirements">{{ u.requirements }}</small>
          <span class="upgrade-action"><small class="upgrade-key">按 {{ i + 1 }} 選擇</small><span class="upgrade-select-mark" aria-hidden="true">◆</span></span>
        </button>
      </div>
      <p>選擇其中一項能力後繼續冒險</p>
    </div>
  </div>
</template>
