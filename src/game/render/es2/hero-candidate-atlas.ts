/** QA-only image sources; never replace the live production hero atlas while QA_PENDING. */
import shadowRun from '../../../assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/run-east-4frames@3x.webp'
import shadowSouthRun from '../../../assets/es2/production/heroes/shadowblade/candidates/south-2026-11-23/run-south-4frames@3x.webp'
import shadowAttack from '../../../assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/attack-east-4frames@3x.webp'
import shadowSpecial from '../../../assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/special-east-4frames@3x.webp'
import summonerRun from '../../../assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/run-east-4frames@3x.webp'
import summonerSouthRun from '../../../assets/es2/production/heroes/spirit-summoner/candidates/south-2026-11-23/run-south-4frames@3x.webp'
import summonerAttack from '../../../assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/attack-east-4frames@3x.webp'
import summonerSpecial from '../../../assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/special-east-4frames@3x.webp'
import paladinRun from '../../../assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/run-east-4frames@3x.webp'
import paladinSouthRun from '../../../assets/es2/production/heroes/crimson-paladin/candidates/south-2026-11-23/run-south-4frames@3x.webp'
import paladinAttack from '../../../assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/attack-east-4frames@3x.webp'
import paladinSpecial from '../../../assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/special-east-4frames@3x.webp'

export const HERO_CANDIDATE_ATLASES = [
  { hero: 'shadowblade', pose: 'run', direction: 'E', cellPixels: 704, url: shadowRun },
  { hero: 'shadowblade', pose: 'attack', direction: 'E', cellPixels: 704, url: shadowAttack },
  { hero: 'shadowblade', pose: 'special', direction: 'E', cellPixels: 704, url: shadowSpecial },
  { hero: 'spirit-summoner', pose: 'run', direction: 'E', cellPixels: 704, url: summonerRun },
  { hero: 'spirit-summoner', pose: 'attack', direction: 'E', cellPixels: 704, url: summonerAttack },
  { hero: 'spirit-summoner', pose: 'special', direction: 'E', cellPixels: 704, url: summonerSpecial },
  { hero: 'crimson-paladin', pose: 'run', direction: 'E', cellPixels: 704, url: paladinRun },
  { hero: 'crimson-paladin', pose: 'attack', direction: 'E', cellPixels: 704, url: paladinAttack },
  { hero: 'crimson-paladin', pose: 'special', direction: 'E', cellPixels: 704, url: paladinSpecial },
  { hero: 'shadowblade', pose: 'run', direction: 'S', cellPixels: 768, url: shadowSouthRun },
  { hero: 'spirit-summoner', pose: 'run', direction: 'S', cellPixels: 768, url: summonerSouthRun },
  { hero: 'crimson-paladin', pose: 'run', direction: 'S', cellPixels: 768, url: paladinSouthRun },
] as const

/** Each isolated 2×2 atlas is sampled using its declared exact source-cell size. */
export function heroCandidateRect(index: number, size: 704 | 768 = 704): { x: number; y: number; size: 704 | 768 } | null {
  if (!Number.isInteger(index) || index < 0 || index >= 4) return null
  return { x: (index % 2) * size, y: Math.floor(index / 2) * size, size }
}
