const TAU = Math.PI * 2
const clamp = x => Math.max(0, Math.min(1, x))
const ease = x => { const t = clamp(x); return t*t*(3-2*t) }
const wrap = x => Math.atan2(Math.sin(x),Math.cos(x))
const blend = (a,b,t) => a+(b-a)*t
export const SOURCE_BLADE_ANGLE = 2.3 // down-left in the canonical illustration; visual QA pending
export function movementSlot(vx,vy,move) {
  if (move <= .15 || vx*vx+vy*vy < 1e-8) return 8
  return (Math.round(Math.atan2(vy,vx)*8/TAU)+8)%8
}
// Direction of travel and aim are deliberately independent. No mirrored equipment.
export function advanceKnightMotion(old,s) {
  const slot=movementSlot(s.vx,s.vy,s.move)
  const reset=!old || s.clock<old.clock || s.clock-old.clock>.25 || s.reducedMotion || old.reducedMotion
  const t=reset?1:1-Math.exp(-18*Math.max(0,s.clock-old.clock))
  const target=slot===8?(old?.heading??s.aim):Math.atan2(s.vy,s.vx)
  const heading=reset?target:old.heading+wrap(target-old.heading)*t
  const stride=reset?(slot===8?0:clamp(s.move)):blend(old.stride,slot===8?0:clamp(s.move),t)
  const attack=s.pose==='attack'||s.pose==='cast'
  // Engine strike begins at contact; aim alignment is immediate, recovery eased.
  const blade=attack?wrap(s.aim-SOURCE_BLADE_ANGLE)*(1-ease((s.phase-.16)/.84)) + .35*Math.sin(Math.PI*s.phase)*(1-s.phase):0
  const attackStart=attack&&(!old||old.pose!==s.pose||s.phase<old.phase)
  const handBlend=reset||attackStart?1:t
  const p={...s,slot,heading,stride,blade: s.reducedMotion?0:blade}
  for(const k of ['handX','handY','elbowX','elbowY','supportX','supportY','supportElbowX','supportElbowY']) p[k]=s.reducedMotion?0:blend(old?.[k]??s[k],s[k],handBlend)
  return p
}
const near=(u,v,x,y,rx,ry)=>1-ease(Math.hypot((u-x)/rx,(v-y)/ry))
// Precompute the visual joint regions once. One illustration, not authored rear art.
export function createKnightSkin(rest,width,height,grip) {
  const weights=new Float32Array(rest.length/2*9)
  for(let i=0;i<rest.length;i+=2){
    const u=rest[i]/width,v=rest[i+1]/height,j=i/2*9
    const hand=near(u,v,...grip,.23,.24), free=1-hand
    weights.set([hand,free*near(u,v,.27,.41,.20,.23),free*near(u,v,.75,.56,.23,.25),free*near(u,v,.72,.41,.19,.24),free*near(u,v,.52,.45,.32,.31),free*near(u,v,.54,.11,.20,.23),free*near(u,v,.36,.82,.24,.30),free*near(u,v,.72,.90,.24,.30),free*near(u,v,.90,.55,.25,.35)],j)
  }
  return {rest:rest.slice(),weights}
}
export function deformKnight({rest,weights},out,p){
  if(p.reducedMotion){out.set(rest);return}
  const phase=clamp(p.phase),cycle=Math.sin(p.step),lift=Math.abs(cycle),stride=p.stride
  const x=Math.cos(p.heading),y=Math.sin(p.heading)
  const idle=Math.sin(phase*TAU)*.7, pulse=Math.sin(phase*Math.PI)
  const lean=p.pose==='dash'?6*(1-phase):p.pose==='hurt'?-4*(1-phase):0
  const fall=p.pose==='death'?phase:0, triumph=p.pose==='victory'?pulse*3:0
  const attack=p.pose==='attack'||p.pose==='cast'?pulse:0
  const bodyX=x*lean+attack*Math.cos(p.aim)*1.8+fall*5
  const bodyY=y*lean+fall*8-triumph-lift*stride*1.4+(p.pose==='idle'?idle:0)
  for(let i=0;i<rest.length;i+=2){
    const j=i/2*9,h=weights[j],e=weights[j+1],sh=weights[j+2],se=weights[j+3],torso=weights[j+4],head=weights[j+5],legs=weights[j+6]-weights[j+7],cape=weights[j+8]
    out[i]=rest[i]+h*p.handX+e*p.elbowX+sh*p.supportX+se*p.supportElbowX+(torso+head)*bodyX+legs*cycle*stride*4.3*x+cape*(cycle*stride*3-x*lean*.5)
    out[i+1]=rest[i+1]+h*p.handY+e*p.elbowY+sh*p.supportY+se*p.supportElbowY+(torso+head)*bodyY+legs*cycle*stride*(2.2+2*y)+cape*(Math.sin(p.step-.8)*stride*2+fall*4+(p.pose==='idle'?idle:0))
  }
}
