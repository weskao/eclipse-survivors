import type { AbilityId } from './types'
import shadowSpecialIcon from '../assets/es2/production/heroes/shadowblade-special@3x.webp'
import summonerSpecialIcon from '../assets/es2/production/heroes/spirit-summoner-special@3x.webp'
import paladinSpecialIcon from '../assets/es2/production/heroes/crimson-paladin-special@3x.webp'
import shadowMastery from '../assets/es2/production/heroes/shadowblade-portrait@3x.webp'
import spiritMastery from '../assets/es2/production/heroes/spirit-summoner-portrait@3x.webp'
import paladinMastery from '../assets/es2/production/heroes/crimson-paladin-portrait@3x.webp'

/** Hero starting skills and passive rank-ups share their authored identity. */
const heroChoiceArt: Readonly<Record<string, string>> = {
  'heroes:shadow-daggers': shadowSpecialIcon,
  'heroes:shadow-precision': shadowMastery,
  'heroes:spirit-orb': summonerSpecialIcon,
  'heroes:spirit-bond': spiritMastery,
  'heroes:crimson-guard': paladinSpecialIcon,
  'heroes:crimson-vow': paladinMastery,
}


/** Generated 3x artwork for frequently used skills; keep original SVGs for everything else. */
const generatedIcons = new Set<AbilityId>([
  'damage', 'multi', 'blaze', 'frost', 'chain',
  'vortex', 'meteor', 'orb', 'shield', 'heal',
])

const additionalIcons = new Set<AbilityId>([
  'speed', 'haste', 'maxhp', 'magnet', 'bolt', 'frozen-thunderstorm',
  'infernal-singularity', 'apocalypse-rain', 'blade-tempest', 'guardian-sanctuary',
])

export function hasGeneratedSkillArt(id: AbilityId): boolean {
  return generatedIcons.has(id)
}

export function skillImageSrc(id: AbilityId): string {
  return `./assets/skill-icons/${id}${(hasGeneratedSkillArt(id) || additionalIcons.has(id)) ? '@3x.webp' : '.svg'}`
}

/** Browser-native animated WebP; static art is kept for reduced-motion fallback. */
export function animatedSkillImageSrc(id: AbilityId): string {
  return (hasGeneratedSkillArt(id) || additionalIcons.has(id)) ? `./assets/skill-icons/${id}@3x-animated.webp` : skillImageSrc(id)
}

/** Canonical ES2 stills remain the source of truth; animated WebP is presentation-only. */
const es2StaticArt = import.meta.glob('../assets/es2/production/{weapons,evolutions}/*@3x.webp', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>
const es2AnimatedArt = import.meta.glob('../assets/es2/production/{weapons,evolutions}/*@3x-animated.webp', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

function es2ArtKey(id: AbilityId, animated: boolean): string | undefined {
  const colon = id.indexOf(':')
  if (colon < 0) return undefined
  const namespace = id.slice(0, colon)
  const slug = id.slice(colon + 1)
  if ((namespace !== 'weapons' && namespace !== 'evolution2') || !/^[a-z][a-z0-9-]*$/.test(slug)) return undefined
  return `../assets/es2/production/${namespace === 'weapons' ? 'weapons' : 'evolutions'}/${slug}@3x${animated ? '-animated' : ''}.webp`
}

export function stillEs2ImageSrc(id: AbilityId): string | undefined {
  const key = es2ArtKey(id, false)
  return key ? es2StaticArt[key] : undefined
}

export function animatedEs2ImageSrc(id: AbilityId): string | undefined {
  const key = es2ArtKey(id, true)
  return key ? es2AnimatedArt[key] : undefined
}

/** One art-resolution path for every upgrade: legacy, weapon, evolution and future packs. */
export function resolveSkillChoiceArt(
  id: AbilityId, suppliedSrc?: string, still = false,
): { imageSrc?: string; reducedMotionSrc?: string } {
  const builtIn = !id.includes(':')
  const reducedMotionSrc = stillEs2ImageSrc(id) ?? heroChoiceArt[id] ?? suppliedSrc ??
    (builtIn ? skillImageSrc(id) : undefined)
  const animated = animatedEs2ImageSrc(id) ??
    (builtIn ? animatedSkillImageSrc(id) : undefined)
  return { imageSrc: still ? reducedMotionSrc : (animated ?? reducedMotionSrc), reducedMotionSrc }
}

/** Fall back to the still, then the original legacy SVG if an image cannot load. */
export function fallbackSkillImage(event: Event, id: string, still?: string): void {
  const img = event.target as HTMLImageElement
  img.parentElement?.querySelector('source')?.remove()
  const current = img.getAttribute('src')
  if (still && !img.dataset.fallbackStill && current !== still) {
    img.dataset.fallbackStill = 'true'
    img.src = still
  } else if (!id.includes(':') && current !== `./assets/skill-icons/${id}.svg`) img.src = `./assets/skill-icons/${id}.svg`
  else img.style.display = 'none'
}
