/** Original, phase-aligned dark-fantasy boss orchestration.
 * Generates standard MIDI; release audio is rendered with a credited SoundFont.
 * No existing film/game melody, copyrighted score, or runtime dependency.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const THEMES = {
  'abyss-monarch': {
    bpm: 112, root: 38, chords: [0,-4,3,-5,0,-2,-4,-5],
    motif: [12,15,19,18,15,12,10,null,12,17,20,19,15,10,7,null],
    strings: 48, lead: 60, brass: 57, choir: 52, bell: 14,
  },
  'frost-sovereign': {
    bpm: 98, root: 42, chords: [0,-4,-2,-5,0,3,-4,-5],
    motif: [24,27,31,29,27,null,22,24,26,29,32,31,27,24,22,null],
    strings: 49, lead: 68, brass: 60, choir: 53, bell: 9,
  },
  'infernal-titan': {
    bpm: 142, root: 40, chords: [0,-4,3,-2,0,-5,-2,-1],
    motif: [12,15,19,22,19,15,12,10,13,17,20,24,22,20,17,15],
    strings: 48, lead: 61, brass: 57, choir: 52, bell: 14,
  },
  'eclipse-seraph': {
    bpm: 126, root: 45, chords: [0,-4,3,-5,0,1,-2,-5],
    motif: [12,16,19,23,21,19,16,null,14,18,21,24,23,19,16,12],
    strings: 49, lead: 60, brass: 61, choir: 52, bell: 14,
  },
}
const BEAT=480, BAR=BEAT*4
const part=(channel,program,volume=100,pan=64)=>({channel,program,volume,pan,events:[]})
const note=(p,pitch,start,length,velocity=80)=>{
  if (pitch==null) return
  const n=Math.max(0,Math.min(127,Math.round(pitch)))
  const t=Math.max(0,Math.round(start))
  const v=Math.max(1,Math.min(127,Math.round(velocity)))
  p.events.push({t,order:2,data:[0x90|p.channel,n,v]})
  p.events.push({t:t+Math.max(22,Math.round(length)),order:0,data:[0x80|p.channel,n,0]})
}
const percussion=(part,pitch,at,velocity=80)=>note(part,pitch,at,BEAT/9,velocity)
const vlq=n=>{
  const a=[Math.max(0,Math.floor(n))&0x7f]
  for(let x=n>>>7;x;x>>>=7)a.unshift((x&0x7f)|0x80)
  return a
}
function renderMidi(bpm,parts,bars){
  const tempo=Math.round(60000000/bpm)
  const head=Buffer.from([77,84,104,100,0,0,0,6,0,1,0,parts.length+1,BEAT>>8,BEAT&255])
  const chunk=(events)=>{
    const bytes=[]
    let previous=0
    for(const item of events.sort((a,b)=>a.t-b.t||a.order-b.order)){
      bytes.push(...vlq(item.t-previous),...item.data)
      previous=item.t
    }
    bytes.push(...vlq(bars*BAR-previous),255,47,0)
    const header=Buffer.alloc(8)
    header.write('MTrk',0)
    header.writeUInt32BE(bytes.length,4)
    return Buffer.concat([header,Buffer.from(bytes)])
  }
  const global=chunk([
    {t:0,order:0,data:[255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255]},
    {t:0,order:1,data:[255,88,4,4,2,24,8]},
  ])
  const chunks=parts.map(p=>chunk([
    {t:0,order:-3,data:[0xc0|p.channel,p.program]},
    {t:0,order:-2,data:[0xb0|p.channel,7,p.volume]},
    {t:0,order:-1,data:[0xb0|p.channel,10,p.pan]},
    ...p.events,
  ]))
  return Buffer.concat([head,global,...chunks])
}
function boss(id,phase){
  const t=THEMES[id], thickness=[0,.70,.88,1][phase]
  const p={
    bass:part(0,42,106,58), strings:part(1,t.strings,105,42),
    pulse:part(2,44,105,86), brass:part(3,t.brass,109,64),
    lead:part(4,t.lead,112,74), choir:part(5,t.choir,98,70),
    bells:part(6,t.bell,85,90), high:part(7,45,95,30),
    drums:part(9,0,115,64),
  }
  for(let b=0;b<24;b++){
    const at=b*BAR, root=t.root+t.chords[b%t.chords.length]
    const ramp=b>=16?1.16:b>=8?1.07:b<4?.85:1
    note(p.bass,root-12,at,BAR*.96,74*thickness*ramp)
    note(p.bass,root,at,BAR*.89,67*thickness*ramp)
    note(p.choir,root+24,at+BEAT*.04,BAR*.97,60*thickness*ramp)
    note(p.choir,root+31,at+BEAT*.13,BAR*.81,50*thickness*ramp)
    if(phase===3)note(p.choir,root+36,at+BEAT*.35,BAR*.75,50)
    for(let q=0;q<4;q++){
      note(p.strings,root+12+[0,7,12,3][q],at+q*BEAT,BEAT*.91,(72+q%2*6)*thickness*ramp)
      if(b>=2 || phase>=2){
        if(q===0||q===2||phase===3){
          note(p.brass,root+12+(q===2?7:0),at+q*BEAT,BEAT*1.25,79*thickness)
          if(phase>=2)note(p.brass,root+19,at+q*BEAT,BEAT*.85,52*thickness)
        }
      }
      percussion(p.drums,36,at+q*BEAT,(q===0?111:90)*thickness)
      if(q===1||q===3)percussion(p.drums,38,at+q*BEAT,93*thickness)
      if(phase>=2){
        percussion(p.drums,41,at+q*BEAT,78)
        percussion(p.drums,42,at+q*BEAT+BEAT/2,48)
      }
      if(phase===3)percussion(p.drums,36,at+q*BEAT+BEAT/2,77)
    }
    for(let n=0;n<8;n++){
      const pulse=root+12+[0,7,3,7,12,7,3,7][n]+(id==='frost-sovereign'?12:0)
      note(p.pulse,pulse,at+n*BEAT/2,BEAT*.31,(n%2?60:74)*thickness*ramp)
      if(phase>=2&&n%2===0)note(p.high,root+24+[0,3,7,5][n/2],at+n*BEAT/2,BEAT*.24,65)
      if(phase===3&&n%2===1)note(p.pulse,root+24+[0,3,7,10][Math.floor(n/2)],at+n*BEAT/2,BEAT*.26,57)
    }
    for(let q=0;q<4;q++){
      let pitch=t.motif[(b*4+q+(b%8<4?0:8))%t.motif.length]
      if(pitch==null)continue
      if(b>=16&&q===3)pitch+=12
      note(p.lead,t.root+pitch+12,at+q*BEAT,BEAT*(q===3?.87:.75),85*thickness*ramp)
    }
    if(b%4===0)percussion(p.drums,49,at,phase===3?112:92)
    if(b%4===3){
      note(p.bells,root+36,at+BEAT*3.1,BEAT*.8,phase===1?44:61)
      for(let n=0;n<8;n++)percussion(p.drums,45+n%3,at+3*BEAT+n*BEAT/8,52+n*6)
    }
    if(id==='infernal-titan')for(let n=0;n<8;n++)
      percussion(p.drums,43,at+n*BEAT/2,phase>=2?73:59)
    if(id==='frost-sovereign')for(let n=0;n<4;n++)
      note(p.bells,root+36+[0,7,12,7][n],at+n*BEAT,BEAT*1.5,47)
    if(id==='eclipse-seraph')note(p.choir,root+43,at+BEAT,BAR*.84,60*thickness)
    if(id==='abyss-monarch'&&b%2===1)note(p.bells,root+24,at+BEAT*2.4,BEAT*1.3,58)
  }
  return renderMidi(t.bpm,Object.values(p),24)
}
function warning(){
  const p={ strings:part(0,49,100,42), bass:part(1,42,108,60),
    choir:part(2,52,100,80), bells:part(3,14,87,64), drums:part(9,0,113,64) }
  // Eight bars at 128 BPM = exactly 15s of escalating pre-boss tension.
  for(let b=0;b<8;b++){
    const at=b*BAR,root=38+(b%4===3?-1:0)
    note(p.bass,root-12,at,BAR*.98,70+b*5)
    note(p.choir,root+24,at,BAR*.97,58+b*5)
    note(p.choir,root+31,at+BEAT/2,BAR*.77,42+b*6)
    for(let n=0;n<8;n++){
      note(p.strings,root+12+[0,3,7,8,10,8,7,3][n]+(b>=4?12:0),
        at+n*BEAT/2,BEAT*.29,54+b*4)
      if(n%2===0||b>=5)percussion(p.drums,41,at+n*BEAT/2,62+b*5)
    }
    percussion(p.drums,36,at,74+b*6)
    if(b>=4)percussion(p.drums,38,at+BEAT*2,66+b*5)
    if(b>=6)for(let n=0;n<8;n++)percussion(p.drums,45+n%4,at+3*BEAT+n*BEAT/8,54+n*6)
    if(b===7){percussion(p.drums,49,at+3*BEAT,114);note(p.bells,86,at+3*BEAT,BEAT*.86,88)}
    if(b===0||b===4)note(p.bells,74+b,at,BEAT*2,40+b*3)
  }
  return renderMidi(128,Object.values(p),8)
}
export function generateBossMidi(dir='public/audio/boss'){
  mkdirSync(dir,{recursive:true})
  for(const id of Object.keys(THEMES))for(const phase of [1,2,3])
    writeFileSync(resolve(dir,id+'-p'+phase+'.mid'),boss(id,phase))
  writeFileSync(resolve(dir,'arrival-warning.mid'),warning())
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname)
  generateBossMidi(resolve(process.argv[2]||'public/audio/boss'))
