import { describe, expect, it, vi } from 'vitest'
import { createState, createHero } from '../../state'
import type { GameHooks } from '../../types'
import { createBossEncounterController } from './controller'
import { BOSS_DEFINITIONS, BOSS_ATTACKS, type BossId } from './definitions'
import { ATTACK_PRESENTATION } from './attack-presentation'
const hooks: GameHooks = { end() {}, message() {}, offerUpgrades() {}, sfx() {} }

describe('authoritative attack choreography', () => {
  it.each(Object.keys(BOSS_DEFINITIONS) as BossId[])('%s releases each accepted warning exactly once', boss => {
    const events: string[] = []
    const cancel = vi.fn()
    const state = createState(); state.mode = 'play'; state.hero = createHero('knight')
    state.hero.hp = 100000; state.hero.max = 100000
    const controller = createBossEncounterController({ emit(e) { if(e.type==='warning'||e.type==='attack') events.push(e.type+':'+e.attack) }, cancelAttackAudio:cancel })
    const mob = controller.spawn(state,boss,{x:180,y:0},hooks)!
    controller.tick(state,0.01,hooks)
    const id = controller.snapshot(state).telegraphs[0]!.attackId as keyof typeof BOSS_ATTACKS
    expect(events).toEqual(['warning:'+id])
    controller.tick(state,BOSS_ATTACKS[id].windup,hooks)
    expect(events).toEqual(['warning:'+id,'attack:'+id])
    expect(state.cameraKick).toBeLessThanOrEqual(ATTACK_PRESENTATION[id].shake)
    mob.hp = mob.max * 0.6; controller.tick(state,0.01,hooks)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(events).toHaveLength(2)
  })
})
