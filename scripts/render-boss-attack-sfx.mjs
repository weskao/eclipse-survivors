// Original deterministic offline sound design; no external samples.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
const profiles=JSON.parse(readFileSync(new URL('../src/game/content/bosses/attack-presentation.json',import.meta.url),'utf8'))
function renderBank(profiles){
 const rate=32000,tail=1.25,slot=2,frames=rate*3.25*profiles.length, a=new Float32Array(frames),tau=Math.PI*2;
 let peak=0;
 for(const p of profiles){
  const {boss,pitch,weight,pulses,windup,visual,offset}=p, start=Math.round(offset*rate), release=start+rate*slot;let seed=12345,low=0,high=0,phase=0;
  for(const ch of boss+visual+pitch)seed=(Math.imul(seed,33)+ch.charCodeAt(0))>>>0;
  const material=boss==='frost-sovereign'?1:boss==='infernal-titan'?2:boss==='eclipse-seraph'?3:0;
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1};
  const fade=(t,d)=>Math.min(1,t/.02,Math.max(0,(d-t)/.035));
  for(let i=0;i<Math.round(windup*rate);i++){const t=i/rate,u=t/windup,n=noise();low+=.025*(n-low);high+=.34*(n-high);phase+=tau*pitch*(.58+.7*u*u)/rate;
   const resonance=material===1?.25*Math.sin(phase*3.73)+.18*Math.sin(phase*6.12):material===2?.29*Math.sin(phase*1.5)+.14*Math.sin(phase*2.07):material===3?.24*Math.sin(phase*1.5)+.14*Math.sin(phase*2.01)+.08*Math.sin(phase*2.99):.24*Math.sin(phase*.5)+.17*Math.sin(phase*1.414);
   const air=material===1?(n-high)*.23:material===2?low*.95+(high-low)*.18:material===3?(high-low)*.15:low*.7+(high-low)*.18;
   a[start+i]=Math.pow(u,1.35)*fade(t,windup)*(.8+.2*Math.sin(tau*(2.3+pulses*.43)*t))*(.17*Math.sin(phase)+resonance+air)*(.65+.35*weight);}
  low=0;high=0;phase=0;
  for(let i=0;i<rate*tail;i++){const t=i/rate,n=noise();low+=.045*(n-low);high+=.43*(n-high);phase+=tau*pitch*(.52+1.8*Math.exp(-t*13))/rate;
   let hit=0;for(let j=0;j<pulses;j++){const dt=t-j*(visual==='fan'?.037:.09);if(dt>=0)hit+=Math.exp(-dt*(material===1?75:35))*Math.min(1,dt/.003)}
   const sub=Math.sin(tau*(38+pitch*.12)*t+1.5*(1-Math.exp(-t*18)))*Math.exp(-t*8);
   const body=material===0?.33*Math.sin(phase*.7)+.16*Math.sin(phase*1.414)+.22*low+.22*(high-low)*hit:material===1?.25*Math.sin(tau*pitch*2.71*t)*Math.exp(-t*4)+.19*Math.sin(tau*pitch*4.17*t)*Math.exp(-t*6)+.33*(n-high)*hit+.13*sub:material===2?.44*sub+.18*Math.sin(phase*1.73)+.5*low+.27*(high-low)*hit:.25*Math.sin(phase)+.18*Math.sin(tau*pitch*1.5*t)+.12*Math.sin(tau*pitch*2*t)+.12*Math.sin(tau*pitch*3*t)*Math.exp(-t*4)+.15*(high-low)*hit+.13*sub;
   let dry=fade(t,tail)*Math.exp(-t*(2.6+1.2*(1-weight)))*(body+weight*.25*sub+.14*hit*(n-high));if(i>rate*.071)dry+=a[release+i-Math.round(rate*.071)]*.23;if(i>rate*.137)dry+=a[release+i-Math.round(rate*.137)]*.12;a[release+i]=dry*fade(t,tail);}
  let local=0;for(let i=start;i<start+rate*3.25;i++)local=Math.max(local,Math.abs(a[i]));const scale=Math.min(2,.79/Math.max(local,.001));for(let i=start;i<start+rate*3.25;i++)a[i]*=scale;peak=Math.max(peak,local*scale);
 }
 const bytes=new Uint8Array(44+frames*2),d=new DataView(bytes.buffer);const str=(i,s)=>{for(let j=0;j<s.length;j++)bytes[i+j]=s.charCodeAt(j)};
 str(0,'RIFF');d.setUint32(4,bytes.length-8,true);str(8,'WAVE');str(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,rate,true);d.setUint32(28,rate*2,true);d.setUint16(32,2,true);d.setUint16(34,16,true);str(36,'data');d.setUint32(40,frames*2,true);for(let i=0;i<frames;i++)d.setInt16(44+i*2,Math.round(a[i]*32767),true);
 return {bytes,peak};
}
const directory=new URL('../public/audio/boss/attacks/',import.meta.url)
mkdirSync(directory,{recursive:true})
for(const boss of new Set(Object.values(profiles).map(p=>p.boss))){const {bytes,peak}=renderBank(Object.values(profiles).filter(p=>p.boss===boss));writeFileSync(new URL(boss+'.wav',directory),bytes);console.log(boss,bytes.length,peak.toFixed(3))}
