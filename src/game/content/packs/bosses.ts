import type { ContentPack } from '../contracts'
import type { ContentEffectDefinition } from '../contracts'
import { BOSS_DEFINITIONS } from '../bosses/definitions'
import type { BossEncounterController } from '../bosses/controller'

function pulse(id: `bosses:${string}`, title: string, color: string, radius: number): ContentEffectDefinition {
  return {
    id, title,
    draw(ctx, _state, effect, ox, oy) {
      const alpha = effect.life / effect.max
      ctx.beginPath()
      ctx.arc(effect.x + ox, effect.y + oy, radius * (1.3 - alpha * 0.3), 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.globalAlpha = alpha * 0.8
      ctx.lineWidth = 4
      ctx.stroke()
    },
  }
}

/**
 * Independently registered metadata and draw effects. Registration never
 * silently changes legacy enemy AI or the main game's boss spawn schedule.
 */
export const BOSS_PACK: ContentPack = {
  id: 'bosses',
  enemies: Object.values(BOSS_DEFINITIONS).map(definition => ({
    id: `bosses:${definition.id}` as const,
    title: definition.title,
  })),
  effects: [
    pulse('bosses:abyss-glow', 'Abyss warning', '#9974fc', 115),
    pulse('bosses:frost-glow', 'Frost warning', '#9bddff', 115),
    pulse('bosses:infernal-glow', 'Infernal warning', '#ff8a4a', 132),
    pulse('bosses:seraph-glow', 'Eclipse warning', '#ffe5a2', 120),
    pulse('bosses:seraph-light-break', 'Shattered halo', '#fff0bc', 130),
    pulse('bosses:seraph-dark-collapse', 'Umbra collapse', '#8259bd', 155),
    pulse('bosses:finishing-flare', 'Seraph finishing flare', '#fff2bd', 190),
  ],
}

/**
 * Explicit bridge for integration-owned engine configuration. Hosts still call
 * controller.tick(state, dt, hooks) AFTER legacy enemy AI and use its renderer.
 */
export function createBossEncounterPack(controller: BossEncounterController): ContentPack {
  return {
    ...BOSS_PACK,
    onEvent(ctx, event) {
      controller.onContentEvent(ctx.state, event, ctx.hooks)
    },
  }
}
