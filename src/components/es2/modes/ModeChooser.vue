<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, nextTick, watch, useId } from 'vue'
import Es2DetailSurface from '../menu/Es2DetailSurface.vue'
import { useHoverDetails } from '../menu/useHoverDetails'
import Es2ModeSigil from './Es2ModeSigil.vue'
import Es2ModeHotBadge from './Es2ModeHotBadge.vue'
import Es2ModeDuration from './Es2ModeDuration.vue'
import { MODES, modeIds, getModeBrief } from '../../../meta/modes'
import { getModeDetails } from './mode-details'
import type { RunModeId } from '../../../meta/types'
import { objectiveModeIds } from '../../../game/content/modes/definitions'

const props = withDefaults(defineProps<{ value: RunModeId | null; disabled?: boolean; visible?: boolean }>(), { disabled: false, visible: true })
const emit = defineEmits<{ select: [mode: RunModeId] }>()
const instructionId = useId()
const groups = [
  { id: 'classic', chapter: '第一章', title: '經典遠征', cards: modeIds.map(id => ({ id, objective: false })) },
  { id: 'advanced', chapter: '第二章', title: '進階試煉', cards: objectiveModeIds.map(id => ({ id, objective: true })) },
] as const
const allIds: RunModeId[] = groups.flatMap(group => group.cards.map(card => card.id))
const focusId = computed(() => props.value ?? allIds[0])
async function moveMode(event: KeyboardEvent, id: RunModeId): Promise<void> {
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
    : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  if (!direction || props.disabled) return
  const board = (event.currentTarget as HTMLElement | null)?.closest('[data-es2-expedition-board]')
  event.preventDefault()
  const next = allIds[(allIds.indexOf(id) + direction + allIds.length) % allIds.length]
  if (!next) return
  emit('select', next)
  await nextTick()
  board?.querySelector<HTMLButtonElement>(`[data-mode="${next}"], [data-objective-mode="${next}"]`)?.focus()
}
const modeDetails = useHoverDetails<RunModeId>('[data-es2-mode-id], [data-es2-mode-details]', el =>
  (el.getAttribute('data-es2-mode-id') ?? el.getAttribute('data-es2-mode-details')) as RunModeId | null)
const { id: detailId, anchor: modeAnchor, tooltipId: modeTooltipId, events: modeHoverEvents } = modeDetails
watch(() => props.visible, visible => { if (!visible) modeDetails.clear() })
const detail = computed(() => detailId.value ? getModeDetails(detailId.value) : null)
// The authored title contains both languages; display only the current one.
const modeTitle = (id: RunModeId) => t(MODES[id].label).split(' · ')[0]!
</script>

<template>
  <div class="es2-expedition-board" data-es2-expedition-board role="radiogroup"
    :aria-label="t('選擇遠征命運')" :aria-describedby="instructionId" v-on="modeHoverEvents">
    <div class="es2-expedition-board-header">
      <div><h2 id="es2ModeTitle">{{ t('選擇遠征命運') }}</h2>
        <p :id="instructionId">{{ t('從 {count} 種遠征中選擇 1 種', { count: allIds.length }) }}</p></div>
      <span class="es2-expedition-current" :data-es2-mode-theme="value ?? undefined">
        <span>{{ t('目前遠征') }}<strong>{{ value ? modeTitle(value) : '—' }}</strong></span>
      </span>
    </div>
    <div v-for="group in groups" :key="group.id" class="es2-expedition-chapter" :data-es2-mode-chapter="group.id">
      <div class="es2-expedition-chapter-heading">
        <span>{{ t(group.chapter) }}</span><h3>{{ t(group.title) }}</h3><span class="es2-chapter-count">{{ t('{count} 種模式', { count: group.cards.length }) }}</span>
      </div>
      <div class="es2-mode-grid" :class="{ 'es2-objective-grid': group.id === 'advanced' }">
        <div v-for="card in group.cards" :key="card.id" class="es2-mode-card-shell" :class="{ 'es2-objective-card-shell': card.objective }">
          <button type="button" role="radio" class="es2-mode-card" data-ui-sfx="managed"
            :class="{ 'es2-objective-choice': card.objective, 'es2-mode-active': value === card.id, selected: value === card.id, 'es2-mode-has-hot': MODES[card.id].hot }"
            :data-es2-mode-id="card.id" :data-mode="card.objective ? undefined : card.id" :data-objective-mode="card.objective ? card.id : undefined"
            :data-es2-mode-theme="card.id" :aria-checked="value === card.id" :disabled="disabled"
            :tabindex="focusId === card.id ? 0 : -1"
            :aria-label="[modeTitle(card.id), ...(MODES[card.id].hot ? [t('熱門遠征')] : []), t(getModeBrief(card.id)), MODES[card.id].duration === null ? t('無時間限制') : t('{minutes} 分鐘', { minutes: Math.ceil((MODES[card.id].duration ?? 0) / 60) })].join(' · ')"
            @click="emit('select', card.id)" @keydown="moveMode($event, card.id)">
            <Es2ModeSigil :mode="card.id" :class="card.objective ? 'es2-objective-sigil' : 'es2-mode-mark'" />
            <span class="es2-mode-copy">
              <span class="es2-mode-title-line" :class="{ 'es2-objective-heading': card.objective }">
                <strong>{{ modeTitle(card.id) }}</strong>
              </span>
              <small>{{ t(getModeBrief(card.id)) }}</small>
            </span>
            <Es2ModeDuration :duration="MODES[card.id].duration" />
            <Es2ModeHotBadge :hot="MODES[card.id].hot" />
          </button>
          <button type="button" class="es2-mode-detail-trigger" :disabled="disabled"
            :data-es2-mode-details="card.id" :data-es2-mode-theme="card.id" :aria-label="t('查看模式詳情：{name}', { name: modeTitle(card.id) })"
            aria-haspopup="dialog" data-ui-sfx="select" @click="modeDetails.openModal(card.id)"><span aria-hidden="true">i</span></button>
        </div>
      </div>
    </div>
    <Es2DetailSurface :active="detail !== null" :title="detailId ? modeTitle(detailId) : ''" :mode-theme="detailId ?? undefined"
      :anchor="modeAnchor" :tooltip-id="modeTooltipId" @cancel="modeDetails.clear()" @hold="modeDetails.hold()" @leave="modeDetails.leave()">
      <template #leading><Es2ModeSigil v-if="detailId" :mode="detailId" class="es2-mode-detail-sigil" /></template>
      <div v-if="detail && detailId" class="es2-mode-detail">
        <p class="es2-mode-detail-intro">{{ detail.description }}</p>
        <div class="es2-mode-detail-block" data-es2-mode-detail="objective">
          <strong>{{ t('遠征目標') }}</strong>
          <p>{{ detail.victoryDescription }}</p>
        </div>
        <div class="es2-mode-detail-block" data-es2-mode-detail="rules">
          <strong>{{ t('特殊規則') }}</strong>
          <ul><li v-for="modifier in detail.preRunModifiers" :key="modifier">{{ modifier }}</li></ul>
        </div>
        <div class="es2-mode-detail-block" data-es2-mode-detail="reward">
          <strong>{{ t('獎勵') }}</strong>
          <p>{{ detail.rewardText }}</p>
        </div>
      </div>
    </Es2DetailSurface>
  </div>
</template>

