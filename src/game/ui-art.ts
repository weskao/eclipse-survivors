import type { AbilityId } from './types'

/** Generated 3x artwork for frequently used skills; keep original SVGs for everything else. */
const generatedIcons = new Set<AbilityId>([
  'damage', 'multi', 'blaze', 'frost', 'chain',
  'vortex', 'meteor', 'orb', 'shield', 'heal',
])

export function skillImageSrc(id: AbilityId): string {
  return `./assets/skill-icons/${id}${generatedIcons.has(id) ? '@3x.webp' : '.svg'}`
}
