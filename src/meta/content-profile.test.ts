import { describe, expect, it } from 'vitest'
import { emptyProfile, migrateProfile } from './profile'

describe('optional content save compatibility', () => {
  it('preserves a valid namespaced ability ID even when its pack is absent', () => {
    const raw = { ...emptyProfile(), discoveredAbilities: ['frost', 'arcane:bolt'] }
    expect(migrateProfile(raw)?.discoveredAbilities).toEqual(['frost', 'arcane:bolt'])
  })

  it('keeps rejecting malformed or non-namespaced unknown ability IDs', () => {
    const raw = { ...emptyProfile(), discoveredAbilities: ['unknown-ability'] }
    expect(migrateProfile(raw)).toBeNull()
  })
})
