/** QA-only image sources; never replace the live production hero atlas while QA_PENDING. */
const shadowRun = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/run-east-4frames@3x.webp' : ''
const shadowSouthRun = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/south-2026-11-24-batch-2/run-south-4frames@3x.webp' : ''
const shadowAttack = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/attack-east-4frames@3x.webp' : ''
const shadowSpecial = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/east-2026-11-23/special-east-4frames@3x.webp' : ''
const summonerRun = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/run-east-4frames@3x.webp' : ''
const summonerSouthRun = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/spirit-summoner/candidates/south-2026-11-24-mist-repair/run-south-4frames@3x.webp' : ''
const summonerAttack = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/attack-east-4frames@3x.webp' : ''
const summonerSpecial = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/spirit-summoner/candidates/east-2026-11-23/special-east-4frames@3x.webp' : ''
const paladinRun = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/run-east-4frames@3x.webp' : ''
const paladinSouthRun = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/south-2026-11-24-batch-2/run-south-4frames@3x.webp' : ''
const paladinAttack = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/attack-east-4frames@3x.webp' : ''
const paladinSpecial = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/east-2026-11-23/special-east-4frames@3x.webp' : ''

const shadowSE = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/se-2026-11-24-batch-3/run-se-4frames@3x.webp' : ''
import shadowSEManifest from '../../../assets/es2/production/heroes/shadowblade/candidates/se-2026-11-24-batch-3/manifest.json'
const shadowSW = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/sw-2026-11-24-batch-3/run-sw-4frames@3x.webp' : ''
import shadowSWManifest from '../../../assets/es2/production/heroes/shadowblade/candidates/sw-2026-11-24-batch-3/manifest.json'
const summonerSE = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/spirit-summoner/candidates/se-2026-11-24-batch-3/run-se-4frames@3x.webp' : ''
import summonerSEManifest from '../../../assets/es2/production/heroes/spirit-summoner/candidates/se-2026-11-24-batch-3/manifest.json'
const summonerSW = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/spirit-summoner/candidates/sw-2026-11-24-batch-3/run-sw-4frames@3x.webp' : ''
import summonerSWManifest from '../../../assets/es2/production/heroes/spirit-summoner/candidates/sw-2026-11-24-batch-3/manifest.json'
const paladinSE = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/se-2026-11-24-batch-3/run-se-4frames@3x.webp' : ''
import paladinSEManifest from '../../../assets/es2/production/heroes/crimson-paladin/candidates/se-2026-11-24-batch-3/manifest.json'
const paladinSW = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/sw-2026-11-24-batch-3/run-sw-4frames@3x.webp' : ''
import paladinSWManifest from '../../../assets/es2/production/heroes/crimson-paladin/candidates/sw-2026-11-24-batch-3/manifest.json'

const shadowNE = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/ne-2026-11-24-batch-4/run-ne-4frames@3x.webp' : ''
import shadowNEManifest from '../../../assets/es2/production/heroes/shadowblade/candidates/ne-2026-11-24-batch-4/manifest.json'
const shadowNW = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/nw-2026-11-24-batch-4/run-nw-4frames@3x.webp' : ''
import shadowNWManifest from '../../../assets/es2/production/heroes/shadowblade/candidates/nw-2026-11-24-batch-4/manifest.json'
const summonerN = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/spirit-summoner/candidates/n-2026-11-24-batch-4/run-n-4frames@3x.webp' : ''
import summonerNManifest from '../../../assets/es2/production/heroes/spirit-summoner/candidates/n-2026-11-24-batch-4/manifest.json'
const paladinN = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/n-2026-11-24-batch-4/run-n-4frames@3x.webp' : ''
import paladinNManifest from '../../../assets/es2/production/heroes/crimson-paladin/candidates/n-2026-11-24-batch-4/manifest.json'

/** The current South review clips; older candidate originals remain archived. */
export const HERO_SOUTH_RUN_DIRS = {
  shadowblade: 'south-2026-11-24-batch-2',
  'spirit-summoner': 'south-2026-11-24-mist-repair',
  'crimson-paladin': 'south-2026-11-24-batch-2',
} as const

export const HERO_DIAGONAL_RUN_ATLASES = [
  { hero: 'shadowblade', pose: 'run', direction: 'SE', cellPixels: 768, url: shadowSE, footBottoms: shadowSEManifest.footBottoms },
  { hero: 'shadowblade', pose: 'run', direction: 'SW', cellPixels: 768, url: shadowSW, footBottoms: shadowSWManifest.footBottoms },
  { hero: 'spirit-summoner', pose: 'run', direction: 'SE', cellPixels: 768, url: summonerSE, footBottoms: summonerSEManifest.footBottoms },
  { hero: 'spirit-summoner', pose: 'run', direction: 'SW', cellPixels: 768, url: summonerSW, footBottoms: summonerSWManifest.footBottoms },
  { hero: 'crimson-paladin', pose: 'run', direction: 'SE', cellPixels: 768, url: paladinSE, footBottoms: paladinSEManifest.footBottoms },
  { hero: 'crimson-paladin', pose: 'run', direction: 'SW', cellPixels: 768, url: paladinSW, footBottoms: paladinSWManifest.footBottoms },
] as const

const shadowN = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/shadowblade/candidates/n-2026-11-24-batch-5/run-n-4frames@3x.webp' : ''
import shadowNManifest from '../../../assets/es2/production/heroes/shadowblade/candidates/n-2026-11-24-batch-5/manifest.json'
const summonerNE = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/spirit-summoner/candidates/ne-2026-11-24-batch-5/run-ne-4frames@3x.webp' : ''
import summonerNEManifest from '../../../assets/es2/production/heroes/spirit-summoner/candidates/ne-2026-11-24-batch-5/manifest.json'
const paladinNE = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/run-ne-2026-11-25-batch-14/run-ne-4frames@3x.webp' : ''
import paladinNEManifest from '../../../assets/es2/production/heroes/crimson-paladin/candidates/run-ne-2026-11-25-batch-14/manifest.json'
const paladinNW = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/run-nw-2026-11-25-batch-14/run-nw-4frames@3x.webp' : ''
import paladinNWManifest from '../../../assets/es2/production/heroes/crimson-paladin/candidates/run-nw-2026-11-25-batch-14/manifest.json'

/** Explicitly selected northern candidates; DEV review only, not approved production art. */
export const HERO_NORTHERN_RUN_ATLASES = [
  { hero: 'shadowblade', pose: 'run', direction: 'N', cellPixels: 768, url: shadowN, footBottoms: shadowNManifest.footBottoms, folder: 'n-2026-11-24-batch-5' },
  { hero: 'spirit-summoner', pose: 'run', direction: 'NE', cellPixels: 768, url: summonerNE, footBottoms: summonerNEManifest.footBottoms, folder: 'ne-2026-11-24-batch-5' },
  { hero: 'shadowblade', pose: 'run', direction: 'NE', cellPixels: 768, url: shadowNE, footBottoms: shadowNEManifest.footBottoms },
  { hero: 'shadowblade', pose: 'run', direction: 'NW', cellPixels: 768, url: shadowNW, footBottoms: shadowNWManifest.footBottoms },
  { hero: 'spirit-summoner', pose: 'run', direction: 'N', cellPixels: 768, url: summonerN, footBottoms: summonerNManifest.footBottoms },
  { hero: 'crimson-paladin', pose: 'run', direction: 'N', cellPixels: 768, url: paladinN, footBottoms: paladinNManifest.footBottoms },
  { hero: 'crimson-paladin', pose: 'run', direction: 'NE', cellPixels: 768, url: paladinNE, footBottoms: paladinNEManifest.footBottoms, folder: 'run-ne-2026-11-25-batch-14' },
  { hero: 'crimson-paladin', pose: 'run', direction: 'NW', cellPixels: 768, url: paladinNW, footBottoms: paladinNWManifest.footBottoms, folder: 'run-nw-2026-11-25-batch-14' },
] as const

const paladinW = import.meta.env.DEV ? import.meta.env.BASE_URL + 'src/assets/es2/production/heroes/crimson-paladin/candidates/run-w-2026-11-25-batch-14/run-w-4frames@3x.webp' : ''
import paladinWManifest from '../../../assets/es2/production/heroes/crimson-paladin/candidates/run-w-2026-11-25-batch-14/manifest.json'

/** Independently authored West run; the sword/shield must never reuse a mirrored East clip. */
export const HERO_WEST_RUN_ATLASES = [
  { hero: 'crimson-paladin', pose: 'run', direction: 'W', cellPixels: 768, url: paladinW, footBottoms: paladinWManifest.footBottoms, folder: 'run-w-2026-11-25-batch-14' },
] as const

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
  ...HERO_DIAGONAL_RUN_ATLASES,
  ...HERO_NORTHERN_RUN_ATLASES,
  ...HERO_WEST_RUN_ATLASES,
] as const

/** Each isolated 2×2 atlas is sampled using its declared exact source-cell size. */
export function heroCandidateRect(index: number, size: 704 | 768 = 704): { x: number; y: number; size: 704 | 768 } | null {
  if (!Number.isInteger(index) || index < 0 || index >= 4) return null
  return { x: (index % 2) * size, y: Math.floor(index / 2) * size, size }
}
