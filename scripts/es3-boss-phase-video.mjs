/** Record the real game window + live audio while one genuine encounter enters P2/P3. */
import assert from 'node:assert/strict'
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { spawn, execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const id = process.env.BOSS_ID
assert.ok(['abyss-monarch','frost-sovereign','infernal-titan','eclipse-seraph'].includes(id))
assert.ok(process.env.DISPLAY)
const out = 'artifacts/boss-phase-video'
await mkdir(out,{recursive:true})
const file = out+'/'+id+'-phase-2-3-real-gameplay.mp4'
const url = new URL(process.env.PREVIEW_URL ?? 'http://127.0.0.1:4174/')
url.searchParams.set('showcase','1')
url.searchParams.set('es2BossArtQa',id)
url.searchParams.set('bossPhaseVideoQa','1')
const browser=await chromium.launch({headless:false,ignoreDefaultArgs:['--mute-audio'],
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--kiosk','--window-size=1280,720','--window-position=0,0']})
let recorder, completed, failure=''
const errors=[], transitions=[]
try {
  const page=await browser.newPage({viewport:null,reducedMotion:'no-preference'})
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:90000})
  await page.locator('.es2-start').click({timeout:60000})
  await page.waitForFunction(()=>window.__test?.mode==='play'&&window.__test.sceneArtLoaded&&window.__test.audio,null,{timeout:60000})
  await page.waitForFunction(()=>window.__test?.pixiVfx?.status==='ready',null,{timeout:60000})
  await page.evaluate(()=>window.__test.showcaseBoss(1))
  await page.waitForFunction(id=>window.__test?.bossPreview.id===id&&window.__test.bossPreview.phase===1,id,{timeout:15000})
  recorder=spawn('ffmpeg',['-hide_banner','-loglevel','warning','-y','-thread_queue_size','512','-f','x11grab','-draw_mouse','0','-framerate','30','-video_size','1280x720','-i',process.env.DISPLAY+'+0,0','-thread_queue_size','512','-f','pulse','-i','bossqa.monitor','-t','120','-c:v','libx264','-threads','2','-preset','ultrafast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ac','2','-movflags','+faststart','-progress','pipe:1',file])
  recorder.stderr.on('data',b=>{failure+=b.toString()})
  completed=new Promise(resolve=>{recorder.once('error',e=>resolve({code:-1,error:String(e)}));recorder.once('close',code=>resolve({code,error:failure}))})
  // Wait for a real encoded frame; a fixed sleep can miss the start of the transformation.
  await new Promise((resolve,reject)=>{
    let data=''
    const timeout=setTimeout(()=>reject(Error('No encoded video frame')),25000)
    recorder.stdout.on('data',b=>{data+=b.toString();if(/frame=\s*[1-9]\d*/.test(data)){clearTimeout(timeout);resolve()}})
    completed.then(r=>{clearTimeout(timeout);reject(Error('Recorder stopped: '+JSON.stringify(r)))})
  })
  const started=Date.now()
  await page.waitForTimeout(600)
  for(const phase of [2,3]){
    const before=await page.evaluate(()=>({frames:window.__test.frames,time:window.__test.time,passes:window.__test.pixiVfx.phasePasses??0}))
    assert.equal(await page.evaluate(p=>window.__test.captureBossPhase(p),phase),true)
    const reveal=page.locator('[data-boss-phase-reveal][data-phase="'+phase+'"]')
    await reveal.waitFor({state:'visible',timeout:15000})
    await page.waitForFunction(n=>window.__test?.pixiVfx?.phasePasses>n,before.passes,{timeout:15000})
    await page.screenshot({path:out+'/'+id+'-phase-'+phase+'.png'})
    const at=(Date.now()-started)/1000
    await page.waitForFunction(({time,frames})=>window.__test?.mode==='play'&&window.__test.time>=time+2.5&&window.__test.frames>frames+35,before,{timeout:40000})
    const after=await page.evaluate(()=>({frames:window.__test.frames,phase:window.__test.bossPreview.phase,passes:window.__test.pixiVfx.phasePasses??0}))
    assert.equal(after.phase,phase)
    assert.ok(after.passes>before.passes)
    transitions.push({phase,observedSeconds:at,canvasFrames:after.frames-before.frames,gpuPasses:after.passes-before.passes})
  }
  assert.equal(recorder.exitCode,null)
  recorder.stdin.write('q');recorder.stdin.end()
  const result=await completed
  assert.equal(result.code,0,result.error)
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}))
  assert.ok(probe.streams.some(s=>s.codec_type==='video'&&s.codec_name==='h264'&&s.width===1280&&s.height===720))
  assert.ok(probe.streams.some(s=>s.codec_type==='audio'&&s.codec_name==='aac'&&s.channels===2))
  assert.ok(Number(probe.format.duration)>=5)
  const detect=spawn('ffmpeg',['-nostdin','-hide_banner','-i',file,'-vn','-af','volumedetect','-f','null','-'])
  let logs='';detect.stderr.on('data',b=>{logs+=b.toString()})
  assert.equal(await new Promise(resolve=>detect.once('close',resolve)),0)
  const peak=Number(logs.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1])
  assert.ok(Number.isFinite(peak)&&peak>-50,'Silent recording')
  assert.deepEqual(errors,[])
  await writeFile(out+'/capture-evidence.json',JSON.stringify({sha:process.env.GITHUB_SHA,boss:id,transitions,bytes:(await stat(file)).size,duration:probe.format.duration,audioPeakDb:peak,source:'Actual Chromium game + PulseAudio; DEV HP staging only, same living boss, production transformation logic'},null,2))
}finally{
  if(recorder&&recorder.exitCode===null&&recorder.signalCode===null){recorder.stdin.end('q');await completed}
  await browser.close()
}
