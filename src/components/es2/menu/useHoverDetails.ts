import { onBeforeUnmount, onMounted, shallowRef, useId } from 'vue'

/** One active detail target per board. Touch uses the existing modal; mouse and
 * keyboard focus use the same content in a non-modal anchored information panel. */
export function useHoverDetails<T extends string>(selector: string, resolveId: (el: HTMLElement) => T | null) {
  const id = shallowRef<T | null>(null)
  const anchor = shallowRef<HTMLElement | null>(null)
  const tooltipId = useId()
  let timer: ReturnType<typeof setTimeout> | undefined
  let previousDescription: string | null = null
  const canHover = () => typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  function hold(): void {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  function clear(): void {
    hold()
    if (anchor.value) {
      if (previousDescription === null) anchor.value.removeAttribute('aria-describedby')
      else anchor.value.setAttribute('aria-describedby', previousDescription)
    }
    previousDescription = null
    anchor.value = null
    id.value = null
  }
  function leave(): void {
    if (!anchor.value) return
    hold()
    timer = setTimeout(clear, 220)
  }
  function target(event: Event): HTMLElement | null {
    return event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null
  }
  function show(el: HTMLElement): void {
    if (!canHover() || (id.value !== null && !anchor.value) || el.matches(':disabled')) return
    hold()
    if (anchor.value === el) return
    const next = resolveId(el)
    if (!next) return
    clear()
    previousDescription = el.getAttribute('aria-describedby')
    el.setAttribute('aria-describedby', [previousDescription, tooltipId].filter(Boolean).join(' '))
    id.value = next
    anchor.value = el
  }
  function openModal(next: T): void { clear(); id.value = next }
  function pointerover(event: PointerEvent): void {
    if (event.pointerType === 'touch') return
    const el = target(event)
    if (el) show(el)
  }
  function pointerout(event: PointerEvent): void {
    if (!anchor.value || target(event) !== anchor.value) return
    const next = event.relatedTarget
    if (next instanceof Node && anchor.value.contains(next)) return
    leave()
  }
  function focusin(event: FocusEvent): void {
    const el = target(event)
    if (el?.matches(':focus-visible')) show(el)
  }
  function focusout(event: FocusEvent): void {
    if (anchor.value && target(event) === anchor.value) leave()
  }
  function onEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && anchor.value) {
      clear()
      event.preventDefault()
      event.stopPropagation()
    }
  }
  function onScroll(event: Event): void {
    const el = anchor.value
    if (!el || (event.target instanceof Element && event.target.closest('[data-es2-hover-details]'))) return
    // A scroll-to-view event may arrive after pointerover/focusin. Keep an
    // actively inspected card open; the surface follows its new position.
    if (el.matches(':hover') || document.activeElement === el) return
    clear()
  }
  function onPointerDown(event: PointerEvent): void {
    if (!anchor.value || !(event.target instanceof Element)) return
    if (!anchor.value.contains(event.target) && !event.target.closest('[data-es2-hover-details]')) clear()
  }
  function closeHover(): void { if (anchor.value) clear() }
  onMounted(() => {
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', closeHover)
    document.addEventListener('keydown', onEscape, true)
    document.addEventListener('pointerdown', onPointerDown, true)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', closeHover)
    document.removeEventListener('keydown', onEscape, true)
    document.removeEventListener('pointerdown', onPointerDown, true)
    clear()
  })
  return { id, anchor, tooltipId, openModal, clear, hold, leave, events: { pointerover, pointerout, focusin, focusout } }
}
