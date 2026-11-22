<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Engine } from '../game/engine'
import type { ContentEvent, ContentId } from '../game/types'

const { engine } = defineProps<{ engine: Engine }>()
const abilities = engine.contentRegistry.abilities
const revision = ref(0)
/** GameState is intentionally non-reactive: snapshot only after a grant or screen change. */
const snapshot = computed(() => {
  void revision.value
  void engine.ui.mode
  return {
    levels: { ...engine.state.content.levels },
    eligible: new Set(engine.contentRegistry.eligible(engine.state).map(a => a.id)),
  }
})
const grant = (id: ContentId): void => { if (engine.showcaseGrant(id)) revision.value++ }
const simulate = (event: ContentEvent): void => { engine.showcaseEmit(event); revision.value++ }
</script>

<template>
  <aside class="content-showcase" aria-label="Content pack developer showcase">
    <header>CONTENT SHOWCASE <small>DEV ONLY</small></header>
    <p>Packs: {{ engine.contentRegistry.packs.map(p => p.id).join(', ') || 'None installed' }}</p>
    <div class="showcase-scroll">
      <button
        v-for="ability in abilities" :key="ability.id" type="button"
        :disabled="engine.ui.mode !== 'play' || !snapshot.eligible.has(ability.id)"
        :aria-label="'Grant ' + ability.title"
        @click="grant(ability.id)"
      >{{ ability.icon }} {{ ability.title }} · {{ snapshot.levels[ability.id] ?? 0 }}/{{ ability.maxLevel }}</button>
    </div>
    <div class="showcase-events">
      <button type="button" :disabled="engine.ui.mode !== 'play'" @click="simulate({ type: 'pickup', kind: 'world' })">Pickup event</button>
      <button type="button" :disabled="engine.ui.mode !== 'play'" @click="simulate({ type: 'scene-change', index: engine.state.currentScene })">Scene event</button>
    </div>
  </aside>
</template>

<style scoped>
.content-showcase { position: fixed; bottom: 16px; left: 16px; z-index: 150; width: min(320px, calc(100vw - 32px)); padding: 12px; color: #f0e7ce; background: #101522ed; border: 1px solid #8b77bd; border-radius: 12px; font: 12px/1.5 system-ui, sans-serif; box-shadow: 0 12px 36px #0009 }
header { display: flex; justify-content: space-between; font-weight: 800; letter-spacing: .08em }
small { color: #a9e5b3; font-size: 10px }
p { margin: 6px 0 }
.showcase-scroll { max-height: 30vh; overflow: auto }
.showcase-events { display: flex; gap: 6px; margin-top: 8px }
button { display: block; width: 100%; margin: 3px 0; padding: 7px; color: inherit; text-align: left; background: #28344b; border: 1px solid #495d7d; border-radius: 6px; cursor: pointer }
button:hover:not(:disabled) { background: #394e73 }
button:disabled { opacity: .45; cursor: not-allowed }
</style>
