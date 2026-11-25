import type { ContentPack } from '../contracts'
import { WEAPON_ABILITIES } from '../weapons/abilities'
import { drawArsenal } from '../weapons/render'
import { sharedProjectileSprites } from '../../render/projectile-art'
import { resetRuntime } from '../weapons/runtime'

/**
 * Optional twelve-weapon expansion. The integration owner adds this pack to
 * CONTENT_PACKS; feature branches must never touch that shared manifest.
 */
export const WEAPONS_PACK: ContentPack = {
  id: 'weapons',
  abilities: WEAPON_ABILITIES,
  effects: [{
    id: 'weapons:arsenal-vfx',
    title: 'Weapon Arsenal Combat Effects',
    draw(ctx, state, _effect, ox, oy) { drawArsenal(ctx, state, ox, oy, sharedProjectileSprites()) },
  }],
  onEvent({ state }, event) {
    if (event.type === 'reset') resetRuntime(state)
  },
}
