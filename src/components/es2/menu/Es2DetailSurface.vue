<script setup lang="ts">
import { ref, watchPostEffect } from 'vue'
import Es2Dialog from './Es2Dialog.vue'
import type { RunModeId } from '../../../meta/types'

const props = defineProps<{ active: boolean; title: string; subtitle?: string; anchor: HTMLElement | null; tooltipId: string; modeTheme?: RunModeId }>()
const emit = defineEmits<{ cancel: []; hold: []; leave: [] }>()
const panel = ref<HTMLElement | null>(null)
const position = ref({ left: '0px', top: '0px', visibility: 'hidden' as const } as { left: string; top: string; visibility: 'hidden' | 'visible' })
watchPostEffect(onCleanup => {
  const el = panel.value
  const anchor = props.anchor
  if (!el || !anchor) return
  const place = () => {
    const a = anchor.getBoundingClientRect()
    const board = anchor.closest('.es2-hero-section, .es2-mode-grid, .es2-archive-grid')
    const boardRect = board?.getBoundingClientRect() ?? a
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
    const outsideRight = Math.max(0, vw - edge - boardRect.right - gap)
    const outsideLeft = Math.max(0, boardRect.left - gap - edge)
    const outside = outsideRight >= preferredWidth || outsideLeft >= preferredWidth
    const side = outside ? (outsideRight >= preferredWidth ? 'right' : 'left') : right >= preferredWidth || (left < preferredWidth && right >= left) ? 'right' : 'left'
    const sideWidth = outside ? (side === 'right' ? outsideRight : outsideLeft) : side === 'right' ? right : left
    const vertical = sideWidth < Math.min(160, preferredWidth) && Math.max(above, below) > 0
    const useBelow = below >= above
    el.style.boxSizing = 'border-box'
    el.style.maxWidth = Math.max(0, vertical ? preferredWidth : Math.min(preferredWidth, sideWidth)) + 'px'
    el.style.maxHeight = Math.max(0, vertical ? (useBelow ? below : above) : vh - edge * 2) + 'px'
    const p = el.getBoundingClientRect()
    const boundary = outside ? boardRect : a
    const x = vertical ? a.left + (a.width - p.width) / 2 : side === 'right' ? boundary.right + gap : boundary.left - gap - p.width
    const y = vertical ? (useBelow ? a.bottom + gap : a.top - p.height - gap) : a.top
    position.value = { left: clamp(x, vw - p.width - edge) + 'px', top: clamp(y, vh - p.height - edge) + 'px', visibility: 'visible' }
  }
  place()
  const onScroll = (event: Event) => {
    if (!(event.target instanceof Node && el.contains(event.target))) place()
  }
  window.addEventListener('scroll', onScroll, true)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
  observer?.observe(el)
  onCleanup(() => {
    observer?.disconnect()
    window.removeEventListener('scroll', onScroll, true)
  })
})
</script>

<template>
  <Teleport v-if="active && anchor" to="body">
    <aside :id="tooltipId" ref="panel" class="es2-hover-details" data-es2-hover-details :data-es2-mode-theme="modeTheme" role="tooltip"
      :style="position" @pointerenter="emit('hold')" @pointerleave="emit('leave')">
      <header class="es2-hover-details__header">
        <slot name="leading"><span class="es2-hover-details__seal" aria-hidden="true">✧</span></slot>
        <div><h2>{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div>
      </header>
      <div class="es2-hover-details__body"><slot /></div>
    </aside>
  </Teleport>
  <Es2Dialog v-else :active="active" :title="title" :subtitle="subtitle" :mode-theme="modeTheme" @cancel="emit('cancel')">
    <template v-if="$slots.leading" #title-leading><slot name="leading" /></template>
    <slot />
  </Es2Dialog>
</template>
