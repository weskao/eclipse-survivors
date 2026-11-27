<script setup lang="ts">
import { t } from '../../../i18n'
import { computed } from 'vue'
import Es2DetailSurface from '../menu/Es2DetailSurface.vue'
import { useHoverDetails } from '../menu/useHoverDetails'
import { MODE_SIGILS } from '../menu/model'
import { objectiveModeIds, getObjectiveMode, type ObjectiveModeId } from '../../../game/content/modes/definitions'

withDefaults(defineProps<{ value: ObjectiveModeId | null; disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ select: [mode: ObjectiveModeId] }>()
const modeDetails = useHoverDetails<ObjectiveModeId>('[data-objective-mode]', el =>
  el.getAttribute('data-objective-mode') as ObjectiveModeId | null)
const { id: detailId, anchor: modeAnchor, tooltipId: modeTooltipId, events: modeHoverEvents } = modeDetails
const detail = computed(() => detailId.value ? getObjectiveMode(detailId.value) : null)
// The authored title contains both languages; display only the current one.
const modeTitle = (id: ObjectiveModeId) => t(getObjectiveMode(id).title).split(' · ')[0]!
const rewardText = (id: ObjectiveModeId) => t(id === 'endless-eclipse'
  ? '每 3 分鐘 +{embers} 餘燼（最高 1500）' : '勝利獎勵 {embers} 餘燼', { embers: getObjectiveMode(id).rewardEmbers })
</script>

<template>
  <section class="es2-objective-chooser" :aria-label="t('ES2 擴充遠征模式')">
    <header><span>{{ t("CHAPTER II · MODES") }}</span><h2>{{ t("選擇遠征試煉") }}</h2></header>
    <div class="es2-objective-grid" v-on="modeHoverEvents" role="radiogroup" :aria-label="t('ES2 遠征模式')">
      <div v-for="id in objectiveModeIds" :key="id" class="es2-objective-card-shell">
      <button
        type="button" role="radio" class="es2-objective-choice" data-ui-sfx="managed"
        :data-objective-mode="id" :disabled="disabled"
        :aria-checked="value === id"
        :aria-label="[modeTitle(id), t(getObjectiveMode(id).description), t(getObjectiveMode(id).victoryDescription), ...getObjectiveMode(id).preRunModifiers.map(modifier => t(modifier))].join(' · ')"
        :class="{ selected: value === id }"
        @click="emit('select', id)"
      >
        <span class="es2-objective-heading">
          <span class="es2-objective-sigil" aria-hidden="true">{{ MODE_SIGILS[id] }}</span>
          <strong>{{ modeTitle(id) }}</strong>
        </span>
        <span>{{ t(getObjectiveMode(id).description) }}</span>
        <small>{{ t(getObjectiveMode(id).victoryDescription) }}</small>
        <small v-for="modifier in getObjectiveMode(id).preRunModifiers" :key="modifier" class="modifier">◈ {{ t(modifier) }}</small>
        <small class="reward">✦ {{ rewardText(id) }}</small>
      </button>
      <button type="button" class="es2-mode-detail-trigger" :disabled="disabled"
        :data-es2-mode-details="id" :aria-label="t('查看模式詳情：{name}', { name: modeTitle(id) })"
        aria-haspopup="dialog" data-ui-sfx="select" @click="modeDetails.openModal(id)"><span aria-hidden="true">i</span></button>
      </div>
    </div>
    <Es2DetailSurface :active="detail !== null" :title="detailId ? modeTitle(detailId) : ''"
      :anchor="modeAnchor" :tooltip-id="modeTooltipId" @cancel="modeDetails.clear()" @hold="modeDetails.hold()" @leave="modeDetails.leave()">
      <div v-if="detail && detailId" class="es2-hero-detail-content">
        <p>{{ t(detail.description) }}</p>
        <p>{{ t(detail.victoryDescription) }}</p>
        <p v-for="modifier in detail.preRunModifiers" :key="modifier">◈ {{ t(modifier) }}</p>
        <p>✦ {{ rewardText(detailId) }}</p>
      </div>
    </Es2DetailSurface>
  </section>
</template>

<style scoped>
.es2-objective-chooser { color: #f1e4d3; width: 100%; }
.es2-objective-chooser header { margin-bottom: 0.85rem; }
.es2-objective-chooser header span { color: #c6a875; font-size: 0.7rem; letter-spacing: 0.16em; }
.es2-objective-chooser h2 { font-size: 1.3rem; margin: 0.35rem 0; }
.es2-objective-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,230px),1fr)); gap: 0.7rem; }
.es2-objective-card-shell { position: relative; display: flex; min-width: 0; }
@media (hover: hover) and (pointer: fine) { .es2-mode-detail-trigger { display: none; } }
.es2-objective-choice { width: 100%; display: flex; flex-direction: column; gap: 0.55rem; min-width: 0; padding: 1rem;
  text-align: left; color: inherit; border: 1px solid #6b584c; border-radius: 0.7rem;
  background: #211d2b; cursor: pointer; }
.es2-objective-choice strong { font-size: 1rem; min-width:0; overflow-wrap:anywhere; }
.es2-objective-choice .es2-objective-heading { display:flex; align-items:center; gap:6px; min-width:0; }
.es2-objective-choice .es2-objective-sigil {
  display:grid; place-items:center; flex:0 0 auto; width:clamp(20px,2.6vw,32px); aspect-ratio:1;
  clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);
  background:linear-gradient(145deg,#8d6a40,#342b35 65%,#70573a);
  color:#ffe3a6; font:700 clamp(15px,1.8vw,21px)/1 Georgia,serif; text-shadow:0 0 7px #e8b87070;
}
.es2-objective-choice.selected .es2-objective-sigil { background:linear-gradient(145deg,#af844b,#68492c 65%,#9b713c); color:#fff4cf; }
.es2-objective-choice span { font-size: 0.83rem; line-height: 1.45; }
.es2-objective-choice small { color: #c3b3a7; font-size: 0.75rem; line-height: 1.4; }
.es2-objective-choice .modifier { color: #e1d1b6; }
.es2-objective-choice .reward { color: #dfbe7f; }
.es2-objective-choice.selected { border-color: #edc679; background: #302538; box-shadow: inset 0 0 0 1px #edc679; }
.es2-objective-choice:focus-visible { outline: 3px solid #edc679; outline-offset: 3px; }
.es2-objective-choice:disabled { cursor: not-allowed; opacity: 0.55; }
@media (max-width: 560px) { .es2-objective-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .es2-objective-choice { transition: none; } }
</style>
