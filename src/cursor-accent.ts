// Native cursors own input and positioning. This optional, single-node accent
// is triggered only by actionable pointer interactions; no pointermove or RAF.
const ACTION = 'button:not(:disabled), a[href], [role="button"]:not([aria-disabled="true"]), input[type="range"]:not(:disabled)'
const INACTIVE = ':disabled, [aria-disabled="true"], [inert]'

export function installCursorAccent(doc: Document): () => void {
  const view = doc.defaultView
  const accent = doc.createElement('span')
  accent.className = 'es2-cursor-accent'
  accent.setAttribute('data-es2-cursor-accent', '')
  accent.setAttribute('aria-hidden', 'true')
  doc.body.appendChild(accent)
  let animation: Animation | undefined
  let lastHover = -Infinity
  const canAnimate = () => !!view && typeof view.matchMedia === 'function' &&
    view.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !view.matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)').matches &&
    doc.documentElement.dataset.es2ReduceMotion !== 'true' &&
    doc.documentElement.dataset.es2ReduceFlashing !== 'true' &&
    typeof accent.animate === 'function'
  function onPointer(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !event.isPrimary || !canAnimate()) return
    if (!(event.target instanceof Element)) return
    const target = event.target.closest(ACTION)
    if (!target || target.closest(INACTIVE)) return
    const hover = event.type === 'pointerover'
    if (hover) {
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return
      // A moving pointer can cross many controls; at most one hover shimmer
      // per 2.5 seconds, regardless of pointer polling rate.
      if (event.timeStamp - lastHover < 2500) return
      lastHover = event.timeStamp
    } else if (event.button !== 0) return
    animation?.cancel()
    accent.style.left = Math.max(0, Math.min(event.clientX + 12, view!.innerWidth - 1)) + 'px'
    accent.style.top = Math.max(0, Math.min(event.clientY + 15, view!.innerHeight - 1)) + 'px'
    animation = accent.animate([
      { opacity: 0, transform: 'translate(-50%, -50%) scale(.45) rotate(-14deg)' },
      { opacity: hover ? .58 : .82, transform: 'translate(-50%, -50%) scale(.9) rotate(0deg)', offset: .23 },
      { opacity: 0, transform: 'translate(-50%, -50%) scale(1.18) rotate(12deg)' },
    ], { duration: hover ? 440 : 360, easing: 'ease-out' })
  }
  doc.addEventListener('pointerover', onPointer, { passive: true })
  doc.addEventListener('pointerdown', onPointer, { passive: true })
  return () => {
    doc.removeEventListener('pointerover', onPointer)
    doc.removeEventListener('pointerdown', onPointer)
    animation?.cancel()
    accent.remove()
  }
}
