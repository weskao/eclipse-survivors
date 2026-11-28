<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RunModeId } from '../../../meta/types'
import { MODE_SIGILS } from '../menu/model'

const props = defineProps<{ mode: RunModeId }>()
const images = import.meta.glob<string>('../../../assets/es2/production/modes/*@3x.webp', {
  eager: true, query: '?url', import: 'default',
})
const src = computed(() => images[`../../../assets/es2/production/modes/${props.mode}@3x.webp`])
const failed = ref(false)
watch(() => props.mode, () => { failed.value = false }, { flush: 'sync' })
const showArt = computed(() => Boolean(src.value) && !failed.value)
</script>

<template>
  <span class="es2-mode-sigil" :class="{ 'es2-mode-sigil--fallback': !showArt }" :data-es2-mode-icon="mode"
    :data-es2-mode-theme="mode" aria-hidden="true">
    <img v-if="showArt" :key="mode" :src="src" alt="" width="192" height="192" decoding="async" draggable="false" @error="failed = true" />
    <template v-else>{{ MODE_SIGILS[mode] }}</template>
  </span>
</template>

<style scoped>
:where(.es2-mode-sigil) { display:inline-grid; place-items:center; flex:none; width:32px; aspect-ratio:1; line-height:1; vertical-align:middle; }
.es2-mode-sigil img { display:block; width:100%; height:100%; min-width:0; min-height:0; object-fit:contain; pointer-events:none; }
.es2-mode-sigil--fallback {
  clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);
  background:linear-gradient(145deg,var(--es2-mode-ink,#4a6080),#192337 65%,var(--es2-mode-ink,#4a6080));
  color:var(--es2-mode-accent,#d8e7fa); font-family:Georgia,serif; font-weight:700; text-shadow:0 1px 3px #0b101b;
}
@media(forced-colors:active) {
  .es2-mode-sigil--fallback { clip-path:none; border:1px solid ButtonText; background:ButtonFace; color:ButtonText; text-shadow:none; }
}
</style>
