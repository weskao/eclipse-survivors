// Adapted from skyline-rush/src/ios-touch-guard.ts.
// iOS can show the long-press loupe even with user-select: none.
// Native interactive elements must keep touchstart so Safari synthesizes clicks.
const NATIVE_TOUCH_TARGETS = 'button, a, input, textarea, select, option, label, summary, [contenteditable], [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="slider"], [role="tab"], [role="option"], [tabindex]:not([tabindex="-1"])'

export function installGameTouchGuard(root: Document = document): () => void {
  const onTouchStart = (event: TouchEvent): void => {
    if (!event.cancelable || event.touches.length !== 1) return
    const target = event.target as Node | null
    const element = target?.nodeType === 1 ? target as Element : target?.parentElement
    if (!element || element.closest(NATIVE_TOUCH_TARGETS)) return
    // Leave native scrolling intact for panels, menus and settings.
    for (let parent: Element | null = element; parent; parent = parent.parentElement) {
      const style = root.defaultView?.getComputedStyle(parent)
      if ((parent.scrollHeight > parent.clientHeight && /^(auto|scroll)$/.test(style?.overflowY ?? '')) ||
          (parent.scrollWidth > parent.clientWidth && /^(auto|scroll)$/.test(style?.overflowX ?? ''))) return
    }
    event.preventDefault()
  }
  root.addEventListener('touchstart', onTouchStart, { capture: true, passive: false })
  return () => root.removeEventListener('touchstart', onTouchStart, true)
}
