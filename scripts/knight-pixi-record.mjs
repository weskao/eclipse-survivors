import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const out='artifacts/knight-video'
await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const keys=[['d'],['d','s'],['s'],['a','s'],['a'],['a','w'],['w'],['d','w']]
const report={sourceCommit:'a50b9d044ff65640eb1d93be834812ed46d90e86',captures:[]}
try{
 for(const [name,viewport] of [['desktop',{width:960,height:540}],['mobile-landscape',{width:812,height:375}]]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:name!=='desktop',isMobile:name!=='desktop',recordVideo:{dir:out,size:viewport}})
  const page=await context.newPage()
  const video=page.video()
  const entry={name,errors:[],moves:[],attacks:[]};report.captures.push(entry)
  page.on('pageerror',e=>entry.errors.push(e.message))
  try{
   await page.goto('http://127.0.0.1:5173/?knightPixi=1&knightRigCandidates=1&knightPixiQA=1')
   await page.locator('.es2-start').waitFor({state:'visible',timeout:30000})
   const knight=page.locator('[data-hero-id="knight"]')
   if(await knight.count()&&await knight.first().isVisible())await knight.first().click()
   await page.waitForTimeout(1000)
   await page.locator('.es2-start').click()
   await page.waitForFunction(()=>window.__test?.mode==='play')
   assert.ok(await page.evaluate(()=>window.__test.prepareKnightPixiLocomotion()))
   const surface=page.locator('canvas[data-knight-renderer="pixi"][data-knight-rig-assets="directional"]')
   await surface.waitFor({state:'attached',timeout:30000})
   entry.actualRenderer=await surface.getAttribute('data-knight-renderer')
   entry.actualAssets=await surface.getAttribute('data-knight-rig-assets')
   await page.waitForTimeout(1200)
   for(let i=0;i<8;i++){
    for(const key of keys[i])await page.keyboard.down(key)
    try{
     await page.waitForFunction(i=>document.querySelector('canvas[data-knight-renderer="pixi"]')?.dataset.knightRigView===String(i),i,{timeout:5000})
     entry.moves.push({direction:i,rendered:true})
    }catch{entry.moves.push({direction:i,rendered:false})}
    await page.waitForTimeout(650)
    for(const key of keys[i])await page.keyboard.up(key)
    await page.waitForTimeout(250)
   }
   for(let i=0;i<8;i++){
    const ok=await page.evaluate(i=>window.__test.prepareKnightPixiAttack(i),i)
    let rendered=false
    if(ok)try{
     await page.waitForFunction(i=>{const d=document.querySelector('canvas[data-knight-renderer="pixi"]')?.dataset;return d?.knightRigView===String(i)&&d.knightRigPose==='attack'},i,{timeout:3000})
     rendered=true
    }catch{}
    entry.attacks.push({direction:i,realAttack:ok,rendered})
    await page.waitForTimeout(800)
   }
   await page.waitForTimeout(1000)
  }catch(e){entry.errors.push(String(e))}
  finally{
   await context.close()
   await video.saveAs(out+'/'+name+'.webm')
   await writeFile(out+'/capture-report.json',JSON.stringify(report,null,2))
  }
 }
}finally{await browser.close()}
if(report.captures.some(c=>c.actualRenderer!=='pixi'||c.actualAssets!=='directional'||c.errors.length||c.moves.some(m=>!m.rendered)||c.attacks.some(a=>!a.realAttack||!a.rendered)))process.exitCode=1
