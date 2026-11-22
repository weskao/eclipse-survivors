<script setup lang="ts">
import { t } from '../../../i18n'
import { computed, nextTick, ref, watch } from 'vue'
import Es2Dialog from '../menu/Es2Dialog.vue'
import { WORLD_EVENT_DEFINITIONS } from '../../../game/content/world-events/definitions'
import type { WorldEventOption } from '../../../game/content/world-events/runtime'
import type { ActiveWorldEvent } from '../../../game/content/world-events/types'

const props = withDefaults(defineProps<{
  event: ActiveWorldEvent | null
  options: readonly WorldEventOption[]
  feedback?: string | null
  still?: boolean
}>(), { feedback: null, still: false })
const emit = defineEmits<{ choose: [eventId: string, choiceId: string]; close: [] }>()
const submitting = ref(false)
const title = computed(() =>
  WORLD_EVENT_DEFINITIONS.find(def => def.id === props.event?.kind)?.title ?? 'World Event')

watch(() => [props.event?.id, props.feedback], () => { submitting.value = false })

function choose(option: WorldEventOption): void {
  if (!props.event || !option.available || submitting.value) return
  submitting.value = true
  emit('choose', props.event.id, option.id)
  // Commits are synchronous; a failed transaction may be retried on the next UI turn.
  void nextTick(() => { submitting.value = false })
}

function shortcut(event: KeyboardEvent): void {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement) return
  const match = /^(?:Digit|Numpad)?([1-9])$/.exec(event.code || event.key)
  if (!match) return
  const option = props.options[Number(match[1]) - 1]
  if (!option?.available) return
  event.preventDefault()
  choose(option)
}
</script>

<template>
  <Es2Dialog :active="event !== null" :title="t(title)"
    subtitle="Inspect the cost and danger before making your choice"
    wide :dismissible="true" @cancel="emit('close')" @shortcut="shortcut">
    <div class="world-event-panel" :class="{ 'world-event-still': still }">
      <p class="world-event-eyebrow">✧ CELESTIAL ENCOUNTER ✧</p>
      <div class="world-event-options" role="group" aria-label="World event choices">
        <button v-for="(option, index) in options" :key="option.id" type="button"
          class="world-event-choice" :class="{ 'world-event-choice-disabled': !option.available }"
          :data-world-choice="option.id" :disabled="!option.available || submitting"
          :aria-label="t(option.title + '. Risk: ' + option.risk + '. Reward: ' + option.reward +
            (option.reason ? '. Unavailable: ' + option.reason : ''))"
          @click="choose(option)">
          <span class="world-event-number" aria-hidden="true">{{ index + 1 }}</span>
          <span class="world-event-choice-body">
            <strong>{{ t(option.title) }}</strong>
            <span v-if="option.costs.length" class="world-event-cost">
              Cost: {{ option.costs.join(' · ') }}
            </span>
            <span class="world-event-risk"><b>Risk</b> {{ option.risk }}</span>
            <span class="world-event-reward"><b>Reward</b> {{ option.reward }}</span>
            <span v-if="option.reason" class="world-event-reason">{{ option.reason }}</span>
          </span>
        </button>
      </div>
      <p v-if="feedback" role="alert" class="world-event-feedback">{{ t(feedback) }}</p>
      <p class="world-event-hint">Choose by touch, click or number keys 1–9 · Tab to navigate · Esc to close</p>
    </div>
  </Es2Dialog>
</template>

<style scoped>
.world-event-panel {
  color: #f5ebd7;
  max-width: 860px;
  margin-inline: auto;
}
.world-event-eyebrow {
  color: #d9ba87;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .22em;
  text-align: center;
  margin: 0 0 1rem;
}
.world-event-options {
  display: grid;
  gap: .7rem;
}
.world-event-choice {
  display: flex;
  gap: 1rem;
  width: 100%;
  min-height: 72px;
  padding: 1rem;
  text-align: start;
  color: #f7f0e4;
  background: linear-gradient(125deg, rgba(39, 31, 53, .96), rgba(18, 20, 31, .97));
  border: 1px solid rgba(218, 174, 103, .38);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease, transform .15s ease;
}
.world-event-choice:not(:disabled):hover {
  border-color: #f1d49a;
  transform: translateY(-1px);
}
.world-event-choice:focus-visible {
  outline: 3px solid #ffe3a0;
  outline-offset: 3px;
}
.world-event-choice-disabled {
  cursor: not-allowed;
  opacity: .69;
}
.world-event-number {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 50%;
  background: #52405d;
  color: #ffe0a3;
  font-weight: 700;
}
.world-event-choice-body {
  display: flex;
  flex-direction: column;
  gap: .3rem;
  min-width: 0;
}
.world-event-choice-body strong { font-size: 1rem; }
.world-event-choice-body span { font-size: .83rem; line-height: 1.4; }
.world-event-choice-body b { margin-inline-end: .4rem; }
.world-event-cost, .world-event-risk { color: #e6b5aa; }
.world-event-reward { color: #b5ebce; }
.world-event-reason { color: #ffd6a4; font-weight: 700; }
.world-event-feedback { color: #ffddb0; text-align: center; margin: 1rem 0; }
.world-event-hint { color: #d4cedb; text-align: center; font-size: .75rem; margin: 1rem 0 0; }
.world-event-still .world-event-choice { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .world-event-choice { transition: none; }
  .world-event-choice:not(:disabled):hover { transform: none; }
}
@media (max-width: 560px) {
  .world-event-choice { min-height: 52px; padding: .8rem; }
  .world-event-number { width: 1.7rem; height: 1.7rem; }
  .world-event-choice-body span { font-size: .8rem; }
}
</style>
