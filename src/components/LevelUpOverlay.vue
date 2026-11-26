<script setup lang="ts">
import { t } from '../i18n'
import { fallbackSkillImage, resolveSkillChoiceArt } from '../game/ui-art'
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
          <div class="kicker">{{ t("LEVEL UP · CHOOSE YOUR BLESSING") }}</div>
          <h2>{{ t("獲得新的命運刻印") }}</h2>
        </div>
        <span class="level-seal" aria-hidden="true">✦</span>
      </header>
      <div class="cards" id="upgrades">
        <button v-for="(u, i) in upgrades" :key="u.id" class="upgrade" :class="[u.rarity, { evolution: u.isEvolution }]"
          :data-up="u.id" @click="emit('choose', u.id)">
          <span class="upgrade-rarity">{{ t(rarityLabel[u.rarity]) }}<span v-if="u.isEvolution"> {{ t("· EVOLUTION") }}</span></span>
          <span class="portrait skill-sigil" aria-hidden="true">
            <picture v-if="resolveSkillChoiceArt(u.id, u.iconSrc, effect === 'still').imageSrc">
              <source media="(prefers-reduced-motion: reduce)" :srcset="resolveSkillChoiceArt(u.id, u.iconSrc, true).imageSrc" />
              <img class="skill-art" draggable="false" decoding="async" :src="resolveSkillChoiceArt(u.id, u.iconSrc, effect === 'still').imageSrc" @error="fallbackSkillImage($event, u.id, resolveSkillChoiceArt(u.id, u.iconSrc, true).imageSrc)" alt="" />
            </picture>
            <span v-else class="skill-fallback-glyph">{{ u.icon }}</span>
          </span>
          <strong>{{ t(u.title) }}</strong>
          <span v-if="u.level !== undefined" class="upgrade-level">
            {{ t(u.isEvolution ? '究極進化' : `Lv.${u.level} → ${u.level + 1} / ${u.maxLevel}`) }}
          </span>
          <small class="upgrade-desc">{{ t(u.desc) }}</small>
          <small v-if="u.requirements" class="upgrade-requirements">{{ t(u.requirements) }}</small>
          <span class="upgrade-action"><small class="upgrade-key">{{ t("按") }} {{ i + 1 }} {{ t("選擇") }}</small><span class="upgrade-select-mark" aria-hidden="true">◆</span></span>
        </button>
      </div>
      <p>{{ t("選擇其中一項能力後繼續冒險") }}</p>
    </div>
  </div>
</template>
