// Original deterministic cinematic hero sound design; no third-party samples.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
export const HERO_SFX_DURATION = {
  "shadowblade-special": 1.35,
  "spirit-summoner-special": 2.1,
  "crimson-paladin-special": 1.85,
  "crimson-paladin-retribution": 1.3,
  "knight-special": 1.4,
  "ranger-special": 1.35,
  "wizard-special": 1.8
}
export function renderHeroSfx(cue, seconds) {
  const rate=32000, n=Math.round(seconds*rate), left=new Float32Array(n), right=new Float32Array(n);
  let seed=0x5e2a1234; const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1};
  const tau=2*Math.PI, sin=Math.sin, exp=Math.exp;
  const add=(start,duration,pan,fn)=>{const begin=Math.round(start*rate), count=Math.min(n-begin,Math.round(duration*rate));const lg=Math.sqrt((1-pan)/2),rg=Math.sqrt((1+pan)/2);for(let i=0;i<count;i++){const t=i/rate,u=i/count, edge=Math.min(1,i/96,(count-1-i)/160),v=fn(t,u)*edge;left[begin+i]+=v*lg;right[begin+i]+=v*rg}};
  const sweep=(start,duration,pan,gain,f0,f1,decay=3)=>{let phase=0;add(start,duration,pan,(t,u)=>{phase+=tau*(f0*Math.pow(f1/f0,u))/rate;return gain*exp(-decay*u)*(sin(phase)+.27*sin(2*phase)+.12*sin(3*phase))})};
  const noise=(start,duration,pan,gain,kind)=>{let lp=0,slow=0;add(start,duration,pan,(t,u)=>{const w=rnd();lp+=.18*(w-lp);slow+=.013*(w-slow);const band=kind==="air"?w-lp:kind==="rumble"?slow*6:lp-slow;const env=kind==="air"?Math.pow(Math.sin(Math.PI*u),1.5):exp(-5*u);return gain*band*env})};
  const metal=(start,duration,pan,gain,base)=>{const ratios=[1,1.414,2.137,2.91,4.06,5.31,7.17];add(start,duration,pan,(t,u)=>gain*ratios.reduce((v,k,i)=>v+sin(tau*base*k*t+0.19*i)*exp(-(3+i*.65)*u)/(1+i*.55),0)*.48)};
  const choir=(start,duration,pan,gain,f)=>{add(start,duration,pan,(t,u)=>{const env=Math.min(1,t/.10)*Math.pow(1-u,1.4);let p=tau*f*t+.45*sin(tau*4.1*t);return gain*env*(sin(p)+.34*sin(2*p)+.16*sin(3*p)+.14*sin(4*p)+.07*sin(5*p))})};
  if(cue==="shadowblade-special"){
    noise(0,.24,-.55,.78,"air"); sweep(0,.43,0,.76,125,39,3.1);
    for(const [t,p] of [[.035,-.6],[.17,.65]]){noise(t,.19,p,.88,"air");metal(t+.055,.48,p,.40,740);sweep(t+.025,.31,p,.37,540,115,3.6)}
    sweep(.20,.68,0,.48,82,35,3.4);noise(.21,.64,0,.32,"rumble");
    metal(.26,.75,.12,.13,340); 
  } else if(cue==="spirit-summoner-special"){
    noise(0,.82,-.55,.38,"air");noise(.10,.85,.55,.40,"air");
    sweep(0,.62,0,.39,85,176,0.8);sweep(.43,.83,0,.76,119,42,3.4);
    for(const [i,f] of [110,164.81,220,261.63,329.63].entries()){choir(.04+i*.085,1.52-i*.06, i%2? .57:-.57,.20,f);choir(.08+i*.085,1.42-i*.05,i%2?-.5:.5,.12,f*1.004)}
    noise(.41,.67,0,.59,"band");metal(.45,1.45,-.35,.29,392);metal(.66,1.25,.45,.20,523.25);sweep(.46,.45,.3,.18,760,240,2.5);
  } else if(cue==="crimson-paladin-special"){
    sweep(0,.68,0,.93,144,38,3.6);noise(0,.42,0,.83,"band");noise(0,.56,0,.56,"rumble");
    metal(.018,1.22,-.35,.65,196);metal(.028,1.13,.42,.48,277);sweep(.025,.27,0,.43,420,95,4.1);
    sweep(.18,.57,0,.49,101,43,3.2);noise(.15,.42,.25,.48,"air");
    for(const [i,f] of [98,146.83,196,246.94,293.66].entries()){choir(.10+i*.035,1.28-i*.045,i%2?.45:-.45,.18,f)}
    metal(.29,1.38,0,.23,392);
  } else if(cue==="crimson-paladin-retribution"){
    // Ward detonation: glass-metal fracture crack, low blast, fire roar, dark D-minor resonance tail.
    noise(0,.11,0,.95,"air");sweep(0,.78,0,1,170,30,3.0);noise(0,.66,0,.72,"rumble");noise(.004,.30,0,.70,"band");
    for(const [t,p,f] of [[0,-.5,1175],[.026,.55,1568],[.061,-.2,932],[.094,.35,1318]]){metal(t,.52,p,.34,f)}
    noise(.05,.82,-.4,.42,"band");noise(.07,.78,.4,.38,"band");sweep(.04,.36,0,.36,560,120,3.8);
    for(const [i,f] of [73.42,110,146.83,174.61].entries()){choir(.06+i*.02,1.05-i*.06,i%2?.4:-.4,.15,f)}
  } else if(cue==="knight-special"){
    noise(0,.22,-.28,.9,"air");sweep(.025,.76,0,.98,155,35,3.1);noise(.06,.7,0,.85,"rumble");
    for(const [t,p,f] of [[.035,-.48,310],[.095,.42,466],[.16,0,185]]){metal(t,.92,p,.62,f);noise(t,.25,p,.62,"band")}
    for(const [i,f] of [98,146.83,196,293.66].entries())choir(.12+i*.03,1.05-i*.03,i%2?.38:-.38,.22,f);
  } else if(cue==="ranger-special"){
    noise(0,.19,0,.55,"air");sweep(0,.3,0,.52,620,170,2.7);
    for(const [t,p,f] of [[.055,-.64,660],[.135,0,784],[.215,.64,988]]){noise(t,.24,p,.95,"air");sweep(t,.29,p,.62,950,145,2.5);metal(t+.045,.73,p,.45,f);noise(t+.08,.35,p,.58,"band")}
    sweep(.19,.78,0,.68,140,49,2.8);for(const [i,f] of [146.83,220,293.66].entries())choir(.2+i*.04,.9,i%2?.46:-.46,.21,f);
  } else if(cue==="wizard-special"){
    sweep(0,.45,0,.75,68,280,.65);noise(0,.48,-.45,.70,"air");noise(.04,.46,.45,.68,"air");
    for(const [i,f] of [110,164.81,261.63,311.13].entries())choir(.025+i*.05,1.42,i%2?.50:-.50,.29,f);
    sweep(.32,.88,0,1.0,190,28,2.7);noise(.32,.65,0,.83,"rumble");noise(.32,.42,0,.82,"band");
    for(const [t,p,f] of [[.32,-.45,392],[.36,.52,587],[.42,0,784]])metal(t,1.1,p,.40,f);
  } else throw Error("Unknown hero cast");
  // Baked stereo reflections: no live convolution, no extra nodes.
  const dryL=left.slice(),dryR=right.slice();
  for(const [delay,gain] of [[.047,.18],[.089,.14],[.137,.10],[.211,.085],[.319,.056],[.457,.035]]){const d=Math.round(delay*rate);for(let i=d;i<n;i++){left[i]+=dryR[i-d]*gain;right[i]+=dryL[i-d]*gain}}
  let peak=0,sum=0;for(let i=0;i<n;i++){const fade=Math.min(1,(n-1-i)/(rate*.13));left[i]=Math.tanh(left[i]*1.5)*fade;right[i]=Math.tanh(right[i]*1.5)*fade;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]))}
  const scale=.84/peak;
  const out=new Uint8Array(44+n*4), v=new DataView(out.buffer);
  const tag=(o,s)=>{for(let i=0;i<s.length;i++)out[o+i]=s.charCodeAt(i)};
  tag(0,"RIFF");v.setUint32(4,out.length-8,true);tag(8,"WAVE");tag(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);tag(36,"data");v.setUint32(40,n*4,true);
  for(let i=0;i<n;i++){const a=left[i]*scale,b=right[i]*scale;sum+=a*a+b*b;v.setInt16(44+i*4,Math.round(a*32767),true);v.setInt16(46+i*4,Math.round(b*32767),true)}
  return {bytes:out,peak:.84,rms:Math.sqrt(sum/(2*n)),seconds,rate};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = new URL('../public/audio/heroes/', import.meta.url)
  mkdirSync(dir, { recursive: true })
  for (const [cue, seconds] of Object.entries(HERO_SFX_DURATION)) {
    const result = renderHeroSfx(cue, seconds)
    writeFileSync(new URL(cue + '.wav', dir), result.bytes)
    console.log(cue, result.seconds, result.rms)
  }
}
