import { nextTick } from 'vue'
import type { HeroId } from '../../../game/types'

/** Keep navigation inside the originating hero group, with no second scroll jump. */
export async function moveHeroSelection<T extends HeroId>(
  event: KeyboardEvent, id: T, ids: readonly T[], select: (id: T) => void,
): Promise<void> {
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
    : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  if (!direction || !ids.length) return
  const group = (event.currentTarget as HTMLElement | null)?.closest('[role="group"]')
  event.preventDefault()
  const next = ids[(ids.indexOf(id) + direction + ids.length) % ids.length]
  if (!next) return
  select(next)
  await nextTick()
  group?.querySelector<HTMLButtonElement>(`[data-hero="${next}"], [data-hero-id="${next}"]`)?.focus({ preventScroll: true })
}
