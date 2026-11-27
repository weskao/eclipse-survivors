<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { auraMode } from './legendary-aura'
import type { AuraRect, LegendaryAuraHandle } from './legendary-aura-pixi'

// One decorative GPU layer above the grid; cards keep their own DOM, focus and click handling.
const host = ref<HTMLElement>()
let handle: LegendaryAuraHandle | null = null, alive = true, resize: ResizeObserver | undefined, flags: MutationObserver | undefined
const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined

function mode() {
  const root = document.documentElement
  return auraMode({
    reduceMotion: root.dataset.es2ReduceMotion === 'true' || motionQuery?.matches === true,
    reduceFlashing: root.dataset.es2ReduceFlashing === 'true',
    still: host.value?.closest('.es2-still') != null,
  })
}
function measure(): void {
  const grid = host.value?.parentElement
  if (!handle || !grid) return
  const cards: AuraRect[] = []
  for (const el of grid.querySelectorAll<HTMLElement>('.es2-rarity-legendary')) {
    cards.push({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 })
  }
  handle.layout(grid.clientWidth, grid.clientHeight, cards, mode())
}
let starting = false
async function start(): Promise<void> {
  // Resize/flag observers can fire while the lazy Pixi chunk loads; acquire exactly once.
  if (handle || starting || mode() === 'off' || !host.value) return
  starting = true
  try {
    const { acquireLegendaryAura } = await import('./legendary-aura-pixi')
    const next = host.value ? await acquireLegendaryAura(host.value) : null
    if (!alive) { next?.release(); return }
    handle = next; measure()
  } finally { starting = false }
}
function refresh(): void { if (handle) measure(); else void start() }

onMounted(() => {
  void start()
  if (typeof ResizeObserver === 'function' && host.value?.parentElement) {
    resize = new ResizeObserver(refresh); resize.observe(host.value.parentElement)
  }
  if (typeof MutationObserver === 'function') {
    flags = new MutationObserver(refresh)
    flags.observe(document.documentElement, { attributes: true, attributeFilter: ['data-es2-reduce-motion', 'data-es2-reduce-flashing'] })
  }
  motionQuery?.addEventListener?.('change', refresh)
})
onBeforeUnmount(() => {
  alive = false; resize?.disconnect(); flags?.disconnect(); motionQuery?.removeEventListener?.('change', refresh)
  handle?.release(); handle = null
})
</script>
<template>
  <span ref="host" class="es3-legend-aura" data-es3-legend-aura aria-hidden="true"></span>
</template>
