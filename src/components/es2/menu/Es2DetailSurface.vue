<script setup lang="ts">
import { ref, watchPostEffect } from 'vue'
import Es2Dialog from './Es2Dialog.vue'

const props = defineProps<{ active: boolean; title: string; subtitle?: string; anchor: HTMLElement | null; tooltipId: string }>()
const emit = defineEmits<{ cancel: []; hold: []; leave: [] }>()
const panel = ref<HTMLElement | null>(null)
const position = ref({ left: '0px', top: '0px', visibility: 'hidden' as const } as { left: string; top: string; visibility: 'hidden' | 'visible' })
watchPostEffect(onCleanup => {
  const el = panel.value
  const anchor = props.anchor
  if (!el || !anchor) return
  const place = () => {
    const a = anchor.getBoundingClientRect()
    const edge = 12, gap = 10
    const vw = document.documentElement.clientWidth
    // A hover dossier must never intercept the fixed expedition action dock.
    const dock = anchor.closest('.es2-menu')?.querySelector('.es2-menu-action-bar')
    const viewportHeight = document.documentElement.clientHeight
    const dockTop = dock?.getBoundingClientRect().top ?? viewportHeight
    const vh = dockTop > edge * 2 ? Math.min(viewportHeight, dockTop) : viewportHeight
    const clamp = (v: number, max: number) => Math.max(edge, Math.min(v, Math.max(edge, max)))
    const preferredWidth = Math.min(340, vw - edge * 2)
    const right = Math.max(0, vw - edge - a.right - gap)
    const left = Math.max(0, a.left - gap - edge)
    const above = Math.max(0, a.top - gap - edge)
    const below = Math.max(0, vh - edge - a.bottom - gap)
    // Shrink the scrollable panel to the available side before falling back
    // vertically. Clamping a full-size panel after placement can cover its own
    // trigger (especially at 200% zoom), making the card impossible to hover.
    const side = right >= preferredWidth || (left < preferredWidth && right >= left) ? 'right' : 'left'
    const sideWidth = side === 'right' ? right : left
    const vertical = sideWidth < Math.min(160, preferredWidth) && Math.max(above, below) > 0
    const useBelow = below >= above
    el.style.boxSizing = 'border-box'
    el.style.maxWidth = Math.max(0, vertical ? preferredWidth : Math.min(preferredWidth, sideWidth)) + 'px'
    el.style.maxHeight = Math.max(0, vertical ? (useBelow ? below : above) : vh - edge * 2) + 'px'
    const p = el.getBoundingClientRect()
    const x = vertical ? a.left + (a.width - p.width) / 2 : side === 'right' ? a.right + gap : a.left - gap - p.width
    const y = vertical ? (useBelow ? a.bottom + gap : a.top - p.height - gap) : a.top
    position.value = { left: clamp(x, vw - p.width - edge) + 'px', top: clamp(y, vh - p.height - edge) + 'px', visibility: 'visible' }
  }
  place()
  if (typeof ResizeObserver === 'undefined') return
  const observer = new ResizeObserver(place)
  observer.observe(el)
  onCleanup(() => observer.disconnect())
})
</script>

<template>
  <Teleport v-if="active && anchor" to="body">
    <aside :id="tooltipId" ref="panel" class="es2-hover-details" data-es2-hover-details role="tooltip"
      :style="position" @pointerenter="emit('hold')" @pointerleave="emit('leave')">
      <header class="es2-hover-details__header">
        <span class="es2-hover-details__seal" aria-hidden="true">✧</span>
        <div><h2>{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div>
      </header>
      <div class="es2-hover-details__body"><slot /></div>
    </aside>
  </Teleport>
  <Es2Dialog v-else :active="active" :title="title" :subtitle="subtitle" @cancel="emit('cancel')">
    <slot />
  </Es2Dialog>
</template>
