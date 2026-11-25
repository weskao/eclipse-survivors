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
    el.style.maxHeight = Math.max(0, vh - edge * 2) + 'px'
    el.style.boxSizing = 'border-box'
    const p = el.getBoundingClientRect()
    const clamp = (v: number, max: number) => Math.max(edge, Math.min(v, Math.max(edge, max)))
    // Prefer an adjacent side; use the space above/below on narrower viewports.
    let x = a.right + gap, y = a.top
    if (x + p.width > vw - edge) {
      if (a.left - gap - p.width >= edge) x = a.left - gap - p.width
      else {
        x = a.left + (a.width - p.width) / 2
        y = vh - a.bottom >= a.top ? a.bottom + gap : a.top - p.height - gap
      }
    }
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
