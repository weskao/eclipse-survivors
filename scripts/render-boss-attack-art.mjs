// Original authored deterministic transparent world-space VFX textures (not actor artwork).
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
const profiles=JSON.parse(readFileSync(new URL('../src/game/content/bosses/attack-presentation.json',import.meta.url),'utf8'))
const attacks=JSON.parse(readFileSync(new URL('../src/game/balance/bosses.json',import.meta.url),'utf8')).attacks
function art(id,p,attack){
 const tau=Math.PI*2, color=p.boss==='abyss-monarch'?['#ead9ff','#a976f7','#42205d']:p.boss==='frost-sovereign'?['#f0ffff','#66c5f4','#1f5285']:p.boss==='infernal-titan'?['#ffe8b8','#f98037','#60271e']:['#fff3cc','#e7bb64','#64417d'];
 if(id.includes('void')||id.includes('shadow-sweep')||id.includes('twilight')||id.includes('eclipse-wedge')){color[0]='#e9d6ff';color[1]='#b88cf5';color[2]='#51406f'}
 const [core,edge,dark]=color;
 const f=n=>n.toFixed(1), pt=(r,a)=>`${f(192+Math.cos(a)*r)} ${f(192+Math.sin(a)*r)}`;
 let seed=0;for(const c of id)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 if(attack.shape==='beam'&&attack.kind!=='projectile'){
  let strands='',sparks='';
  for(let i=0;i<7;i++){let y=14+rnd()*100,z=48+rnd()*36;strands+=`<path d="M0 64Q${f(90+rnd()*75)} ${f(y)} ${f(220+rnd()*50)} ${f(z)}T610 ${f(55+rnd()*18)}L640 64" stroke="${i%3===0?core:edge}" stroke-width="${f(1.8+rnd()*3.6)}" fill="none" opacity="${f(.35+rnd()*.55)}"/>`}
  for(let i=0;i<42;i++){const x=10+rnd()*620,y=15+rnd()*98,s=2+rnd()*4;sparks+=`<path d="M${f(x)} ${f(y)}l${f(s*3)} -${f(s)} -${f(s)} ${f(s)} -${f(s*2)} ${f(s*.6)}z" fill="${i%3===0?core:edge}" opacity="${f(.3+rnd()*.6)}"/>`}
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="192" viewBox="0 0 640 128"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${dark}" stop-opacity="0"/><stop offset=".28" stop-color="${edge}" stop-opacity=".55"/><stop offset=".5" stop-color="${core}"/><stop offset=".72" stop-color="${edge}" stop-opacity=".55"/><stop offset="1" stop-color="${dark}" stop-opacity="0"/></linearGradient></defs><path d="M0 58Q100 3 240 32Q420 13 640 64Q400 111 240 96Q100 125 0 70Z" fill="url(#g)"/><path d="M0 64Q180 54 320 61T640 64" fill="none" stroke="${core}" stroke-width="3" opacity=".95"/>${strands}${sparks}</svg>\n`;
 }
 const ring=attack.shape==='ring',arena=attack.shape==='arena',fan=attack.kind==='projectile',inner=ring?184*attack.innerRadius/attack.radius:0;
 const clip=ring?`<path fill-rule="evenodd" clip-rule="evenodd" d="M192 8A184 184 0 1 1 191.99 8Z M192 ${f(192-inner)}A${f(inner)} ${f(inner)} 0 1 0 192.01 ${f(192-inner)}Z"/>`:arena?`<path d="M192 192L${pt(184,Math.PI/5)}A184 184 0 1 1 ${pt(184,tau-Math.PI/5)}Z"/>`:`<circle cx="192" cy="192" r="184"/>`;
 let marks='',secondary='',particles='';const count=fan?12:12+p.pulses*3;
 for(let i=0;i<count;i++){const a=i*tau/count+(rnd()-.5)*.15,outer=154+rnd()*28,from=ring?inner+5+rnd()*(outer-inner-5):22+rnd()*82;
  if(p.visual==='crystal'){
   const rr=ring?Math.max(inner+4,outer-38):from, d=outer-rr;
   marks+=`<path d="M${pt(rr,a-.055)}L${pt(outer,a)}L${pt(rr+d*.48,a+.08)}L${pt(rr-2,a+.04)}Z" fill="url(#material)" stroke="${core}" stroke-width="1.4"/><path d="M${pt(rr,a)}L${pt(outer,a)}" stroke="${core}" stroke-width="1.2" opacity=".72"/>`;
  }else if(p.visual==='fracture'){
   marks+=`<path d="M${pt(from,a)}L${pt((from+outer)*.46,a+.12)}L${pt(outer*.76,a-.055)}L${pt(outer,a)}L${pt(outer*.8,a+.065)}L${pt((from+outer)*.46,a+.17)}Z" fill="url(#material)" opacity=".88"/><path d="M${pt(from,a)}L${pt(outer*.68,a+.1)}L${pt(outer,a)}" fill="none" stroke="${core}" stroke-width="2" opacity=".8"/>`;
  }else if(p.visual==='vortex'||p.visual==='collapse'||p.visual==='portal'){
   marks+=`<path d="M${pt(from,a+.42)}Q${pt(outer*.82,a-.35)} ${pt(outer,a)}Q${pt(outer*.71,a+.12)} ${pt(from,a+.62)}Z" fill="url(#material)" opacity=".85"/><path d="M${pt(from,a+.42)}Q${pt(outer*.82,a-.35)} ${pt(outer,a)}" stroke="${core}" stroke-width="1.5" opacity=".55" fill="none"/>`;
  }else if(p.visual==='halo'){
   marks+=`<path d="M${pt(from,a)}L${pt(outer*.86,a-.065)}L${pt(outer,a)}L${pt(outer*.86,a+.065)}Z" fill="url(#material)" stroke="${edge}" stroke-width="1.2"/><path d="M${pt(outer*.79,a-.11)}L${pt(outer*.94,a)}L${pt(outer*.79,a+.11)}" stroke="${core}" stroke-width="1.6" fill="none"/>`;
  }else{
   marks+=`<path d="M${pt(18,a)}Q${pt(outer*.65,a-.14)} ${pt(outer,a)}Q${pt(outer*.7,a+.13)} ${pt(18,a+.07)}Z" fill="url(#material)"/><path d="M${pt(22,a)}Q${pt(outer*.65,a-.14)} ${pt(outer,a)}" stroke="${core}" opacity=".72" stroke-width="2" fill="none"/>`;
  }
 }
 for(let i=0;i<60;i++){const a=rnd()*tau,r=(ring?inner:24)+rnd()*(180-(ring?inner:24)),x=192+Math.cos(a)*r,y=192+Math.sin(a)*r,s=1.2+rnd()*3.2;particles+=`<path d="M${f(x)} ${f(y-s*2)}l${f(s)} ${f(s*2)} -${f(s)} ${f(s*2)} -${f(s)} -${f(s*2)}z" fill="${i%4?edge:core}" opacity="${f(.25+rnd()*.63)}"/>`}
 if(p.visual==='portal'||p.visual==='halo')secondary=`<circle cx="192" cy="192" r="${ring?f((inner+184)/2):'122'}" fill="none" stroke="${core}" stroke-dasharray="14 7 3 7" stroke-width="2.2" opacity=".65"/>`;
 if(p.visual==='collapse')secondary=`<circle cx="192" cy="192" r="48" fill="${dark}" stroke="${edge}" stroke-width="4" opacity=".8"/><circle cx="192" cy="192" r="37" fill="#0b0713" stroke="${core}" stroke-width="1.2" opacity=".85"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 384 384"><defs><clipPath id="bounds">${clip}</clipPath><radialGradient id="field"><stop offset="${ring?f(inner/184):'0'}" stop-color="${dark}" stop-opacity=".04"/><stop offset=".7" stop-color="${dark}" stop-opacity=".58"/><stop offset=".92" stop-color="${edge}" stop-opacity=".36"/><stop offset="1" stop-color="${edge}" stop-opacity="0"/></radialGradient><radialGradient id="material"><stop stop-color="${dark}" stop-opacity=".1"/><stop offset=".55" stop-color="${edge}" stop-opacity=".55"/><stop offset=".87" stop-color="${edge}" stop-opacity=".8"/><stop offset="1" stop-color="${core}"/></radialGradient></defs><g clip-path="url(#bounds)"><circle cx="192" cy="192" r="184" fill="url(#field)"/>${marks}${secondary}${particles}</g></svg>\n`;
}
const dir=new URL('../src/assets/es2/production/skills/boss-attacks/',import.meta.url)
mkdirSync(dir,{recursive:true})
for(const [id,p] of Object.entries(profiles))writeFileSync(new URL(id+'.svg',dir),art(id,p,attacks[id]))
