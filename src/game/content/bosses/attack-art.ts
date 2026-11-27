import type { BossAttackId } from './definitions'

export const ATTACK_ART = import.meta.glob('../../../assets/es2/production/skills/boss-attacks/*@3x.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

// Dossier icons are independent from world-space telegraph geometry.
const DOSSIER_ART = import.meta.glob('../../../assets/es2/production/skills/boss-dossier/*@3x.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export function bossAttackImageSrc(id: BossAttackId): string | undefined {
  return DOSSIER_ART[`../../../assets/es2/production/skills/boss-dossier/${id}@3x.webp`] ?? ATTACK_ART[`../../../assets/es2/production/skills/boss-attacks/${id}@3x.webp`]
}
