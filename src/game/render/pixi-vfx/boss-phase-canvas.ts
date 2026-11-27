import type { Ctx2D } from '../ctx'
import type { BossSnapshot } from '../../content/bosses/controller'
import { bossPhasePose, bossPhaseBudget, bossPhaseTint, phaseVisible, type BossPhasePose, type PhaseTexture } from './boss-phase-choreography'

const pose: BossPhasePose = { x:0,y:0,width:0,height:0,rotation:0,alpha:0,texture:'seal',additive:false }
/** Normalized rune / aura. GPU bakes it once; Canvas uses the same paths. */
export function drawPhaseGlyph(ctx: Ctx2D, kind: PhaseTexture): void {
  ctx.lineWidth=.045
  if (kind==='seal'||kind==='halo') {
    ctx.beginPath();ctx.ellipse(0,0,.96,.96,0,0,Math.PI*2);ctx.stroke()
    ctx.beginPath();ctx.ellipse(0,0,.78,.78,0,0,Math.PI*2);ctx.stroke()
    if (kind==='seal') {
      for(let j=0;j<12;j++){const a=j*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.cos(a)*.77,Math.sin(a)*.77);ctx.lineTo(Math.cos(a)*.96,Math.sin(a)*.96);ctx.stroke()}
      ctx.beginPath();for(let j=0;j<=6;j++){const a=j*Math.PI/3;ctx.lineTo(Math.cos(a)*.72,Math.sin(a)*.72)}ctx.closePath();ctx.stroke()
    }
  } else {
    ctx.beginPath();ctx.moveTo(-.9,0);ctx.lineTo(.25,-.72);ctx.lineTo(.95,0);ctx.lineTo(.25,.72);ctx.closePath();ctx.fill()
  }
}
export function drawBossPhaseCanvas(ctx: Ctx2D, snapshot: BossSnapshot, ox: number, oy: number,
  w: number, h: number, reduced: boolean, opacity: number, quality?: string): void {
  if (opacity <= 0 || !phaseVisible(snapshot, ox, oy, w, h)) return
  const b=snapshot.bodyMotion!, tint='#'+bossPhaseTint(snapshot.id!).toString(16).padStart(6,'0')
  ctx.save()
  try {
    ctx.translate(b.x+ox,b.y+oy)
    for (let i=0;i<bossPhaseBudget(reduced,quality);i++) {
      if (!bossPhasePose(pose,snapshot,i,reduced)) continue
      ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.rotation);ctx.scale(pose.width/2,pose.height/2)
      ctx.globalAlpha=pose.alpha*opacity;ctx.globalCompositeOperation=pose.additive?'lighter':'source-over'
      ctx.strokeStyle=tint;ctx.fillStyle=tint;drawPhaseGlyph(ctx,pose.texture);ctx.restore()
    }
  } finally {ctx.restore()}
}
