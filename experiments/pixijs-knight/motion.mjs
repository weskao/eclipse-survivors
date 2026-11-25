import { KNIGHT_RIG } from './rig.mjs'
const TAU = Math.PI * 2
const clamp = x => Math.max(0, Math.min(1, x))
const ease = x => { const t = clamp(x); return t*t*(3-2*t) }
const wrap = x => Math.atan2(Math.sin(x),Math.cos(x))
const blend = (a,b,t) => a+(b-a)*t
export const SOURCE_BLADE_ANGLE = KNIGHT_RIG.sourceAngle
export function movementSlot(vx,vy,move) {
  if (move <= .15 || vx*vx+vy*vy < 1e-8) return 8
  return (Math.round(Math.atan2(vy,vx)*8/TAU)+8)%8
}
// Direction of travel and aim are deliberately independent. No mirrored equipment.
export function advanceRigMotion(old,s,profile) {
  const slot=movementSlot(s.vx,s.vy,s.move)
  const reset=!old || s.clock<old.clock || s.clock-old.clock>.25 || s.reducedMotion || old.reducedMotion
  const t=reset?1:1-Math.exp(-18*Math.max(0,s.clock-old.clock))
  const target=slot===8?(old?.heading??s.aim):Math.atan2(s.vy,s.vx)
  const heading=reset?target:old.heading+wrap(target-old.heading)*t
  const stride=reset?(slot===8?0:clamp(s.move)):blend(old.stride,slot===8?0:clamp(s.move),t)
  const attack=s.pose==='attack'||s.pose==='cast'
  // Engine strike begins at contact; aim alignment is immediate, recovery eased.
  const windup=!attack&&(s.actionStage==='windup'||s.actionStage==='hold')
  const contact=wrap(s.aim-profile.sourceAngle)
  const follow=Math.sin(Math.PI*clamp((s.phase-.08)/.92))*(1-s.phase)*.65
  const targetBlade=attack?contact*(1-ease((s.phase-.24)/.76))+follow:windup?-.48:0
  // Contact remains synchronous with attack(); blend anticipation and idle recovery only.
  const blade=attack||reset?targetBlade:blend(old.blade,targetBlade,Math.max(t,.18))
  const attackStart=attack&&(!old||old.pose!==s.pose||s.phase<old.phase)
  const handBlend=reset||attackStart?1:t
  const p={...s,slot,heading,stride,blade: s.reducedMotion?0:blade}
  for(const k of ['handX','handY','elbowX','elbowY','supportX','supportY','supportElbowX','supportElbowY']) p[k]=s.reducedMotion?0:blend(old?.[k]??s[k],s[k],handBlend)
  return p
}
const near=(u,v,x,y,rx,ry)=>1-ease(Math.hypot((u-x)/rx,(v-y)/ry))
// A full step cycle is tied to distance (hero.step), not render time. The
// stance portion moves rearward linearly; swing returns with a smooth lift.
export function sampleGait(cycle,side,stride){
 const u=((cycle+side*.5)%1+1)%1, stance=.60
 const travel=u<stance?1-2*u/stance:-1+2*ease((u-stance)/(1-stance))
 const lift=u<stance?0:Math.sin(Math.PI*(u-stance)/(1-stance))**2
 return {travel:travel*stride,lift:lift*stride}
}
export function sampleLegBones(side,width,height,step,heading,stride,profile=KNIGHT_RIG){
 const [hip,knee,foot]=profile.legJoints[side].map(([x,y])=>({x:x*width,y:y*height}))
 if(stride===0)return {hip,knee,foot}
 const gait=sampleGait(step*1.5/TAU,side==='right'?1:0,stride)
 const upper=Math.hypot(knee.x-hip.x,knee.y-hip.y),lower=Math.hypot(foot.x-knee.x,foot.y-knee.y)
 // Use the authored view's own limb proportions. Shorter foreshortened views
 // use a smaller excursion, preserving armor shape and avoiding overextension.
 const excursion=Math.min(14,(upper+lower)*.26)
 const tx=foot.x+Math.cos(heading)*gait.travel*excursion
 const ty=foot.y+Math.sin(heading)*gait.travel*excursion*.52-gait.lift*Math.min(8,lower*.32)
 const dx=tx-hip.x,dy=ty-hip.y,len=Math.hypot(dx,dy)
 const ux=len>1e-8?dx/len:0,uy=len>1e-8?dy/len:1
 const d=Math.max(Math.abs(upper-lower)+1e-5,Math.min(upper+lower-1e-5,len))
 const along=(upper*upper+d*d-lower*lower)/(2*d)
 const bend=Math.sign((knee.x-hip.x)*(foot.y-hip.y)-(knee.y-hip.y)*(foot.x-hip.x))|| (side==='left'?1:-1)
 const away=Math.sqrt(Math.max(0,upper*upper-along*along))*bend
 return {hip,knee:{x:hip.x+ux*along+uy*away,y:hip.y+uy*along-ux*away},foot:{x:hip.x+ux*d,y:hip.y+uy*d}}
}
// Same diagonal as Pixi PlaneGeometry (top-left, top-right, bottom-left).
export function meshPoint(vertices,columns,rows,u,v){
  const x=clamp(u)*(columns-1),y=clamp(v)*(rows-1)
  const col=Math.min(columns-2,Math.floor(x)),row=Math.min(rows-2,Math.floor(y)),a=x-col,b=y-row
  const tl=(row*columns+col)*2,tr=tl+2,bl=tl+columns*2,br=bl+2
  const at=k=>a+b<=1?vertices[tl+k]*(1-a-b)+vertices[tr+k]*a+vertices[bl+k]*b:
    vertices[tr+k]*(1-b)+vertices[bl+k]*(1-a)+vertices[br+k]*(a+b-1)
  return {x:at(0),y:at(1)}
}
// Precompute the visual joint regions once. One illustration, not authored rear art.
export function createRigSkin(rest,width,height,grip,profile) {
  const weights=new Float32Array(rest.length/2*11)
  for(let i=0;i<rest.length;i+=2){
    const u=rest[i]/width,v=rest[i+1]/height,j=i/2*11
    const hand=near(u,v,...grip,.23,.24), free=1-hand
    weights[j]=hand
    for(let k=0;k<profile.regions.length;k++) weights[j+k+1]=free*near(u,v,...profile.regions[k])
  }
  return {rest:rest.slice(),weights,width,height,profile,legRest:[sampleLegBones('left',width,height,0,0,0,profile),sampleLegBones('right',width,height,0,0,0,profile)]}
}
export function deformRig({rest,weights,width,height,legRest,profile},out,p){
  if(p.reducedMotion){out.set(rest);return}
  const phase=clamp(p.phase),cycle=Math.sin(p.step*1.5),stride=p.stride
  const lift=sampleGait(p.step*1.5/TAU,0,stride).lift+sampleGait(p.step*1.5/TAU,1,stride).lift
  const x=Math.cos(p.heading),y=Math.sin(p.heading)
  const idle=Math.sin(phase*TAU)*.7, pulse=Math.sin(phase*Math.PI)
  const lean=p.pose==='dash'?6*(1-phase):p.pose==='hurt'?-4*(1-phase):0
  const fall=p.pose==='death'?phase:0, triumph=p.pose==='victory'?pulse*3:0
  const attack=p.pose==='attack'||p.pose==='cast'?pulse:0
  const bodyX=x*lean+attack*Math.cos(p.aim)*1.8+fall*5
  const bodyY=y*lean+fall*8-triumph-lift*2.4+(p.pose==='idle'?idle*(1-stride):0)
  const left=sampleLegBones('left',width,height,p.step,p.heading,stride,profile),right=sampleLegBones('right',width,height,p.step,p.heading,stride,profile)
  const [l0,r0]=legRest
  const lx=left.knee.x-l0.knee.x,ly=left.knee.y-l0.knee.y,lfx=left.foot.x-l0.foot.x,lfy=left.foot.y-l0.foot.y
  const rx=right.knee.x-r0.knee.x,ry=right.knee.y-r0.knee.y,rfx=right.foot.x-r0.foot.x,rfy=right.foot.y-r0.foot.y
  for(let i=0;i<rest.length;i+=2){
    const j=i/2*11,h=weights[j],e=weights[j+1],sh=weights[j+2],se=weights[j+3],torso=weights[j+4],head=weights[j+5],l=weights[j+6],lf=weights[j+7],r=weights[j+8],rf=weights[j+9],cape=weights[j+10]
    out[i]=rest[i]+h*p.handX+e*p.elbowX+sh*p.supportX+se*p.supportElbowX+(torso+head)*bodyX+l*lx+lf*lfx+r*rx+rf*rfx+cape*(cycle*stride*3-x*lean*.5)
    out[i+1]=rest[i+1]+h*p.handY+e*p.elbowY+sh*p.supportY+se*p.supportElbowY+(torso+head)*bodyY+l*ly+lf*lfy+r*ry+rf*rfy+cape*(Math.sin(p.step*1.5-.8)*stride*2+fall*4+(p.pose==='idle'?idle:0))
  }
}

export const advanceKnightMotion = (old,s) => advanceRigMotion(old,s,KNIGHT_RIG)
export const createKnightSkin = (rest,width,height,grip) => createRigSkin(rest,width,height,grip,KNIGHT_RIG)
export const deformKnight = deformRig
