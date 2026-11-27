import type { BossAttackId } from '../../content/bosses/definitions'
import profiles from '../../content/bosses/choreography.json'
import type { ImpactGeometry } from './plan'

export type ParticleKind = 'void' | 'crystal' | 'ember' | 'feather' | 'mist' | 'spark'
export type Stage = 'warning' | 'active' | 'release'
export interface Choreography { material: ParticleKind; motion: string; duration: number; count: number; spin: number; energy: number }
export interface ParticlePose { x: number; y: number; rotation: number; width: number; height: number; alpha: number; kind: ParticleKind }
export const choreography = (id: BossAttackId): Choreography => profiles[id] as Choreography
const TAU = Math.PI * 2, SAFE = Math.PI / 5
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const seeds = Array.from({length:64}, (_, i) => {
  const r = (k: number) => ((Math.sin((i+1)*k)*43758.5453)%1+1)%1
  return { a:r(12.9898), b:r(78.233), c:r(45.164), d:r(19.13) }
})
export function particleFrame(quality: string | undefined, reduced: boolean): number {
  return reduced ? 0 : quality === 'low' ? 48 : quality === 'medium' ? 96 : 160
}
export function releaseEnvelope(c: Choreography, t: number): number {
  const p = clamp(t)
  return (.66 + .34 * Math.sin(Math.PI * Math.min(1, p * 2.8))) * (1-p)**(1.05 + (1-c.energy)*.6)
}
/** Reused output record; no per-particle allocation, clock or RNG in the render loop. */
export function particlePose(out: ParticlePose, c: Choreography, g: ImpactGeometry, stage: Stage, time: number, i: number): void {
  const s = seeds[i % seeds.length]!, p = clamp(time), release = stage === 'release'
  const q = release ? clamp(p * (.76+s.c*.24)) : (s.d+p*(stage==='warning'?.55:1.45))%1
  const inward = c.motion==='collapse'||c.motion==='vortex'||c.motion==='portal'
  const wave = c.motion==='wave'||c.motion==='fracture'||c.motion==='shatter'
  const progress = stage==='warning' ? 1-q : inward ? 1-q : 1-(1-q)**(wave?2.4:1.4)
  let a = 0, x = 0, y = 0
  if(g.shape==='beam'){
    x = g.length*(stage==='warning'?1-q:q)
    y = Math.sin(q*TAU*(c.motion==='sweep'?.8:1.6)+s.a*TAU)*g.width*(.2+.52*s.b)
    a = Math.atan2(y*.09,Math.max(1,g.length*.13))
  }else{
    const start=g.shape==='arena'?SAFE+.08:0, span=g.shape==='arena'?TAU-2*start:TAU
    const base=c.motion==='cross'?Math.floor(s.a*4)/4+s.b*.04:c.motion==='jet'?s.a*.32:s.a
    a=start+((base+(inward?-1:1)*q*c.spin*.18+s.c*.08)%1+1)%1*span
    const inner=g.shape==='ring'?g.innerRadius:0, thickness=g.radius-inner
    const r=inner+thickness*clamp(.08+progress*.76+s.b*.1)
    x=Math.cos(a)*r;y=Math.sin(a)*r
  }
  const size=Math.max(2,Math.min(16,(g.shape==='beam'?g.width:g.radius)*(.025+s.c*.045)))*(release?1-p*.58:.7)
  const kind=i%9===0?'mist':i%5===0?'spark':c.material
  out.x=x;out.y=y;out.rotation=a+(c.material==='feather'?Math.sin(q*5+s.a*TAU)*.7:0)
  out.width=size*(kind==='mist'?5.5:kind==='feather'?3.8:kind==='crystal'?2.8:kind==='void'?4.2:2.2)
  out.height=size*(kind==='mist'?3.2:kind==='feather'?1.45:kind==='crystal'?1.3:1.5)
  out.alpha=clamp((release?(1-p)**.9:stage==='warning'?.22+.48*p:.42)*(.45+s.b*.55)*(kind==='mist'?.42:1))
  out.kind=kind
}
