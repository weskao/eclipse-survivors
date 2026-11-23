/** QA-only image sources; never replace the live production hero atlas while QA_PENDING. */
import shadowRun from '../../../assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/run-east-4frames@3x.webp'
import shadowAttack from '../../../assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/attack-east-4frames@3x.webp'
import shadowSpecial from '../../../assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/special-east-4frames@3x.webp'
import summonerRun from '../../../assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/run-east-4frames@3x.webp'
import summonerAttack from '../../../assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/attack-east-4frames@3x.webp'
import summonerSpecial from '../../../assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/special-east-4frames@3x.webp'
import paladinRun from '../../../assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/run-east-4frames@3x.webp'
import paladinAttack from '../../../assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/attack-east-4frames@3x.webp'
import paladinSpecial from '../../../assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/special-east-4frames@3x.webp'

export const HERO_CANDIDATE_ATLASES = [
  { hero: 'shadowblade', pose: 'run', url: shadowRun },
  { hero: 'shadowblade', pose: 'attack', url: shadowAttack },
  { hero: 'shadowblade', pose: 'special', url: shadowSpecial },
  { hero: 'spirit-summoner', pose: 'run', url: summonerRun },
  { hero: 'spirit-summoner', pose: 'attack', url: summonerAttack },
  { hero: 'spirit-summoner', pose: 'special', url: summonerSpecial },
  { hero: 'crimson-paladin', pose: 'run', url: paladinRun },
  { hero: 'crimson-paladin', pose: 'attack', url: paladinAttack },
  { hero: 'crimson-paladin', pose: 'special', url: paladinSpecial },
] as const

/** 1408×1408 atlas: precisely four 704×704 cells; east-facing only. */
export function heroCandidateRect(index: number): { x: number; y: number; size: 704 } | null {
  if (!Number.isInteger(index) || index < 0 || index >= 4) return null
  return { x: (index % 2) * 704, y: Math.floor(index / 2) * 704, size: 704 }
}
