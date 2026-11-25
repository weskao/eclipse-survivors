import { describe, expect, it } from 'vitest'
import { BOSS_ATTACKS } from './definitions'
import { ATTACK_PRESENTATION } from './attack-presentation'
import { loadBossAttackSprites, drawBossImpacts, drawBossTelegraphs } from './render'
import type { BossTelegraph, BossSnapshot } from './controller'
import { createFakeCtx } from '../../render/fakes'
describe('authored boss combat art', () => {
  it('loads 25 separate textures and uses exactly one release painting rather than fallback paths', () => {
    const sprites = loadBossAttackSprites(() => ({complete:true,naturalWidth:768}) as HTMLImageElement)
    expect(Object.keys(sprites).sort()).toEqual(Object.keys(BOSS_ATTACKS).sort())
    for (const id of Object.keys(BOSS_ATTACKS) as (keyof typeof BOSS_ATTACKS)[]) {
      const a=BOSS_ATTACKS[id], p=ATTACK_PRESENTATION[id]
      const t: BossTelegraph={attackId:id,shape:a.shape,x:400,y:300,radius:a.radius,innerRadius:a.innerRadius??0,width:a.width??0,length:a.length??0,angle:0,safeAngle:0,damage:a.damage,color:'#fff',harmless:a.kind==='summon',stage:'warning',progress:0.5}
      const snapshot: BossSnapshot={id:p.boss,phase:3,telegraphs:[t],projectiles:[],impacts:[{...t,life:0.4,max:0.56}]}
      for(const reduced of [false,true]){
        const release=createFakeCtx()
        drawBossImpacts(release.ctx,snapshot,0,0,reduced,800,600,sprites)
        expect(release.drawn).toEqual([sprites[id]])
        expect(release.calls).not.toContain('stroke')
        expect(release.calls.filter(call => call === 'fill').length).toBeLessThanOrEqual(reduced ? 0 : 2)
        const off=createFakeCtx()
        drawBossImpacts(off.ctx,snapshot,-5000,-5000,reduced,800,600,sprites)
        expect(off.drawn).toHaveLength(0)
        const warn=createFakeCtx()
        drawBossTelegraphs(warn.ctx,snapshot,0,0,reduced,800,600,undefined,sprites)
        expect(warn.calls).toContain('stroke')
      }
    }
  })
})
