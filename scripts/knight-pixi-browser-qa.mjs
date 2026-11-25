import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const root = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173/'
const out = 'artifacts/knight-pixi'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] })
const directions = [['d'], ['d','s'], ['s'], ['a','s'], ['a'], ['a','w'], ['w'], ['d','w']]
const viewports = [
  { name:'desktop', width:960, height:540, dpr:1 },
  { name:'portrait-320', width:320, height:640, dpr:2 },
  { name:'portrait-375', width:375, height:812, dpr:3 },
  { name:'landscape-640', width:640, height:320, dpr:2 },
  { name:'landscape-812', width:812, height:375, dpr:3 },
]
try {
  for(const viewport of viewports) {
    const mobile=viewport.name!=='desktop'
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:viewport.dpr,isMobile:mobile,hasTouch:mobile,
      reducedMotion:viewport.name==='portrait-320'?'reduce':'no-preference'})
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    try {
      await page.goto(new URL('?knightPixi=1&knightPixiQA=1',root).href)
      await page.locator('.es2-start').waitFor({state:'visible',timeout:30000})
      const knight=page.locator('[data-hero-id="knight"]')
      if(await knight.count() && await knight.first().isVisible()) await knight.first().click()
      await page.locator('.es2-start').click()
      await page.waitForFunction(()=>window.__test?.mode==='play')
      await page.locator('canvas[data-knight-renderer="pixi"]').waitFor({state:'attached',timeout:30000})
      await page.screenshot({path:out+'/'+viewport.name+'-idle.png'})
      if(!mobile) {
        for(let i=0;i<8;i++) {
          const keys=directions[i], x=Math.cos(i*Math.PI/4), y=Math.sin(i*Math.PI/4)
          // Real input and real engine velocity; never drive the rig directly.
          for(const key of keys)await page.keyboard.down(key)
          await page.waitForFunction(({x,y})=>{
            const v=window.__test?.velocity
            return v && (Math.abs(x)<.1||v.x*x>2) && (Math.abs(y)<.1||v.y*y>2)
          },{x,y})
          await page.screenshot({path:out+'/move-'+i+'.png'})
          for(const key of keys)await page.keyboard.up(key)
        }
        for(let i=0;i<8;i++){
          assert.ok(await page.evaluate(i=>window.__test.prepareKnightPixiAttack(i),i),'real attack failed for '+i)
          await page.screenshot({path:out+'/attack-'+i+'.png'})
        }
      }
      assert.equal(await page.locator('canvas[data-knight-renderer="pixi"]').count(),1)
      assert.deepEqual(errors,[])
    }finally{await page.close()}
  }
  for(const preset of ['desktop','mobile-low']) for(const mode of ['canvas','pixi']){
    const page=await browser.newPage({viewport:preset==='desktop'?{width:960,height:540}:{width:390,height:844},deviceScaleFactor:2})
    try{
      await page.goto(new URL('tests/es2/performance/browser-harness.html?preset='+preset+'&knightPixi='+(mode==='pixi'?'1':'0'),root).href)
      await page.waitForFunction(()=>window.__es2BenchmarkResult||window.__es2BenchmarkError,null,{timeout:120000})
      const {result,error}=await page.evaluate(()=>({result:window.__es2BenchmarkResult,error:window.__es2BenchmarkError}))
      assert.ifError(error);assert.equal(result.renderer,mode);assert.equal(result.initialMobs,130);assert.equal(result.frames,120)
      for(const key of ['simulationMs','canvas2dRenderMs','requestAnimationFrameIntervalMs'])for(const statistic of ['median','p95','p99']) assert.ok(Number.isFinite(result[key][statistic]))
      await writeFile(out+'/'+preset+'-'+mode+'.json',JSON.stringify(result,null,2))
      await page.screenshot({path:out+'/'+preset+'-'+mode+'-crowd.png'})
      console.log(preset+' '+mode+' '+JSON.stringify(result))
    }finally{await page.close()}
  }
}finally{await browser.close()}
