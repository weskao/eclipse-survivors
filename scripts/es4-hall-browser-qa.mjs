import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit } from 'playwright'

const target=process.env.PREVIEW_URL??'http://127.0.0.1:4173/'
const dir='artifacts/es4-hall-browser'
const sizes=[['portrait-320',320,640,true],['portrait-390',390,844,true],['landscape-640',640,320,true],['landscape-844',844,390,true],['foldable-540',540,720,true],['tablet-768',768,1024,true],['desktop-1440',1440,900,false]]
const report=[]
await mkdir(dir,{recursive:true})
async function assertHit(button,label){
  await button.scrollIntoViewIfNeeded()
  const info=await button.evaluate(el=>{
    const r=el.getBoundingClientRect()
    const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,width:r.width,vw:innerWidth,vh:innerHeight,hit:!!hit&&el.contains(hit)}
  })
  assert.ok(info.height>=43&&info.width>0&&info.left>=-1&&info.right<=info.vw+1&&info.top>=-1&&info.bottom<=info.vh+1&&info.hit,label+': '+JSON.stringify(info))
}
for(const [name,driver] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await driver.launch({headless:true,...(name==='chromium'?{args:['--no-sandbox']}:{})})
  try{
    for(const [device,width,height,touch] of sizes){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:touch,isMobile:touch,locale:'zh-TW'})
      try{
        const page=await context.newPage()
        const errors=[]
        page.on('pageerror',e=>errors.push(e.message))
        await page.goto(target,{waitUntil:'domcontentloaded'})
        await page.locator('.es2-start').waitFor({state:'visible',timeout:30000})
        await page.locator('.es2-hall-links button').first().click()
        const archive=page.locator('[data-es2-archive-page]')
        await archive.waitFor({state:'visible'})
        if(await archive.getAttribute('data-es2-archive-page')!=='progression'){
          const buttons=page.locator('.es2-hall-links button')
          for(let i=0;i<await buttons.count();i++){
            await buttons.nth(i).click()
            if(await archive.getAttribute('data-es2-archive-page')==='progression')break
          }
        }
        await page.locator('[data-es4-entry]').click()
        const hall=page.locator('.es4-constellation')
        const node=hall.locator('[data-hall-inspect="offense-edge"]')
        await assertHit(node,name+'/'+device+'/edge')
        await node.click()
        const confirm=page.locator('[data-hall-confirm]:visible')
        await confirm.waitFor({state:'visible'})
        await assertHit(confirm,name+'/'+device+'/confirm')
        assert.equal(await confirm.isEnabled(),true,'Requires isolated V4 dev-unlocked mode')
        await confirm.click()
        await page.locator('[data-hall-upgraded="offense-edge"]').waitFor()
        await assertHit(confirm,name+'/'+device+'/after purchase')
        await page.screenshot({path:dir+'/'+name+'-'+device+'-purchase.png'})
        const floating=page.locator('.hall-detail--floating[data-open="true"]')
        if(await floating.count()){
          const close=floating.locator('[data-hall-close]')
          await assertHit(close,name+'/'+device+'/close')
          await close.click()
        }
        for(const kind of ['hero','synergy','discipline']){
          await hall.locator('[data-es4-tree="'+kind+'"]').click()
          const first=hall.locator('.hall-inspect').first()
          await assertHit(first,name+'/'+device+'/'+kind)
          await first.locator('img').evaluate(img=>img.decode())
          const overflow=await hall.locator('.hall-map').evaluate(el=>el.scrollWidth-el.clientWidth)
          assert.ok(overflow<=2,name+'/'+device+'/'+kind+' graph overflow '+overflow)
        }
        for(const attr of ['data-es2-reduce-motion','data-es2-reduce-flashing']){
          await page.evaluate(a=>document.documentElement.setAttribute(a,'true'),attr)
          assert.equal(await hall.isVisible(),true)
          assert.equal(await page.locator('[data-es4-entry]').isVisible(),true)
          await page.evaluate(a=>document.documentElement.removeAttribute(a),attr)
        }
        assert.deepEqual(errors,[],name+'/'+device)
        report.push({engine:name,device,width,height,status:'passed'})
        await writeFile(dir+'/report.json',JSON.stringify(report,null,2))
      }finally{await context.close()}
    }
  }finally{await browser.close()}
}
console.log('PASS '+report.length+' real application viewport checks')
