import { onBeforeUnmount, watch, type Ref } from 'vue'
import type { MotionSetting } from '../../../game/content/accessibility/preferences'
import { sampleHealthBar, type HealthBarFrame, type HealthBarMotion } from '../../../game/render/health-bars'

interface FrameClock {
  now(): number
  request(callback: FrameRequestCallback): number
  cancel(id: number): void
}

/** Presentation only. Idle, hidden and reduced-motion meters schedule no frames. */
export function createHeroHealthMotion(
  paint: (frame: HealthBarFrame) => void,
  clock: FrameClock = {
    now: () => performance.now(),
    request: callback => requestAnimationFrame(callback),
    cancel: id => cancelAnimationFrame(id),
  },
) {
  const target = { hp: 100, max: 100 }
  const cache = new WeakMap<typeof target, HealthBarMotion>()
  let pending: number | null = null
  let active = false
  let reduced = false
  let criticalVersion: number = 0
  const stop = () => {
    if (pending !== null) clock.cancel(pending)
    pending = null
  }
  const draw = (at: number) => {
    const frame = sampleHealthBar(target, at / 1000, cache, reduced, criticalVersion)
    paint(frame)
    if (active && !reduced && (frame.front !== frame.target || frame.trail !== frame.target) && pending === null) {
      pending = clock.request(time => { pending = null; draw(time) })
    }
  }
  return {
    update(percent: number, visible: boolean, reduceMotion: boolean, nextCriticalVersion = 0) {
      const hp = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0
      if (active && visible && hp === target.hp && reduced === reduceMotion && criticalVersion === nextCriticalVersion) return
      const now = clock.now()
      if (!active || !visible || reduceMotion) {
        stop()
        cache.delete(target)
      } else {
        // Settle the old target to the event time before applying the new HP.
        sampleHealthBar(target, now / 1000, cache, false, criticalVersion)
      }
      active = visible
      reduced = reduceMotion
      criticalVersion = nextCriticalVersion
      target.hp = hp
      draw(now)
    },
    dispose() { stop(); active = false; cache.delete(target) },
  }
}

/** Shared DOM health-meter adapter: mutate only transform variables, never the full Vue HUD. */
export function useHeroHealthMotion(
  meter: Ref<HTMLElement | null>, percent: () => number, active: () => boolean,
  preference: () => MotionSetting, criticalVersion: () => number = () => 0,
): void {
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
  let current: HTMLElement | null = null
  const motion = createHeroHealthMotion(frame => {
    if (!current) return
    current.style.setProperty('--hero-hp-front', String(frame.front))
    current.style.setProperty('--hero-hp-trail', String(frame.trail))
    const damaged = frame.trail > frame.front + .002
    current.toggleAttribute('data-hero-hp-damage', damaged)
    if (damaged && frame.impact) current.setAttribute('data-hp-impact', frame.impact)
    else current.removeAttribute('data-hp-impact')
  })
  const sync = () => {
    if (current !== meter.value) {
      motion.dispose()
      current = meter.value
    }
    if (!current) return
    const setting = preference()
    motion.update(percent(), active(), setting === 'on' || (setting === 'system' && !!media?.matches), criticalVersion())
  }
  watch([meter, percent, active, preference, criticalVersion], sync, { flush: 'post', immediate: true })
  media?.addEventListener?.('change', sync)
  onBeforeUnmount(() => {
    media?.removeEventListener?.('change', sync)
    motion.dispose()
    current = null
  })
}
