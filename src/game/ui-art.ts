import type { AbilityId } from './types'

/** Generated 3x artwork for frequently used skills; keep original SVGs for everything else. */
const generatedIcons = new Set<AbilityId>([
  'damage', 'multi', 'blaze', 'frost', 'chain',
  'vortex', 'meteor', 'orb', 'shield', 'heal',
])

export function hasGeneratedSkillArt(id: AbilityId): boolean {
  return generatedIcons.has(id)
}

export function skillImageSrc(id: AbilityId): string {
  return `./assets/skill-icons/${id}${hasGeneratedSkillArt(id) ? '@3x.webp' : '.svg'}`
}

/** Browser-native animated WebP; static art is kept for reduced-motion fallback. */
export function animatedSkillImageSrc(id: AbilityId): string {
  return hasGeneratedSkillArt(id) ? `./assets/skill-icons/${id}@3x-animated.webp` : skillImageSrc(id)
}
