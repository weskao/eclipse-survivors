import { Application, CanvasSource, Container, Graphics, ImageSource, Sprite, Texture } from 'pixi.js'
import { ATTACK_PRESENTATION } from '../../content/bosses/attack-presentation'
import { bossMaterialKind, bossVfxImages } from '../../content/bosses/render'
import type { BossAttackId } from '../../content/bosses/definitions'
import { MAX_BOSS_IMPACTS, MAX_BOSS_PROJECTILES } from '../../content/bosses/controller'
import { impactGeometry, visibleImpact, type ImpactGeometry } from './plan'
import type { HeroVfxFrame, VfxFrame } from './bridge'
import { heroSpecialImages } from '../es2/hero-special-vfx'
import {
  HERO_ART_SLOTS, HERO_MOTE_SLOTS, HERO_TARGET_SLOTS, heroTargetLimit, heroArtPose, heroMoteBudget, heroMotePose, type HeroCast, type HeroPose,
} from './hero-choreography'
import { choreography, particlePose, particleFrame, releaseEnvelope, type ParticleKind, type ParticlePose } from './choreography'

export interface PixiBossRenderer {
  projectiles(frame: VfxFrame): boolean; impacts(frame: VfxFrame): boolean; lastReleaseIds(): readonly BossAttackId[]
  heroSpecial(frame: HeroVfxFrame): boolean; dispose(): void
}
type Surface = Pick<VfxFrame, 'ctx' | 'width' | 'height' | 'dpr'>
// Bound the caster and distant arrow impacts, including their trailing sprites.
const HERO_CULL = 420
const TAU = Math.PI * 2, SAFE = Math.PI / 5, MAX_PARTICLES = 64
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const palette = { abyss: 0xc393ff, frost: 0xc3f3ff, infernal: 0xffb45a, seraph: 0xffdf91 }
// Six pre-baked GPU particle textures, generated once; no per-frame Canvas gradients.
function particleTextures(): Record<ParticleKind, Texture> {
  const result = {} as Record<ParticleKind, Texture>
  for (const kind of ['void','crystal','ember','feather','mist','spark'] as const) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64
    const ctx = c.getContext('2d')!
    const glow = ctx.createRadialGradient(64,32,0,64,32,32)
    glow.addColorStop(0,'#ffffffcc');glow.addColorStop(.35,'#ffffff55');glow.addColorStop(1,'#ffffff00')
    ctx.save();ctx.translate(64,32);ctx.scale(2,1);ctx.translate(-64,-32);ctx.fillStyle=glow;ctx.fillRect(32,0,64,64);ctx.restore()
    if(kind!=='mist'){
      const g=ctx.createLinearGradient(12,32,116,32);g.addColorStop(0,'#ffffff00');g.addColorStop(.46,'#ffffff88');g.addColorStop(.78,'#fff');g.addColorStop(1,'#ffffff22')
      ctx.fillStyle=g;ctx.beginPath()
      if(kind==='crystal'){ctx.moveTo(15,32);ctx.lineTo(65,14);ctx.lineTo(119,32);ctx.lineTo(65,50)}
      else if(kind==='feather'){ctx.moveTo(10,42);ctx.bezierCurveTo(42,5,100,10,119,25);ctx.bezierCurveTo(90,47,49,55,10,42)}
      else if(kind==='void'){ctx.moveTo(8,42);ctx.bezierCurveTo(55,2,94,14,120,28);ctx.bezierCurveTo(83,23,52,47,8,42)}
      else {ctx.moveTo(12,32);ctx.quadraticCurveTo(60,7,119,32);ctx.quadraticCurveTo(60,55,12,32)}
      ctx.closePath();ctx.fill()
      if(kind==='crystal'){ctx.fillStyle='#ffffffbb';ctx.beginPath();ctx.moveTo(15,32);ctx.lineTo(65,14);ctx.lineTo(119,32);ctx.closePath();ctx.fill()}
      if(kind==='feather'){ctx.strokeStyle='#ffffffaa';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(14,42);ctx.quadraticCurveTo(65,22,115,25);for(let i=0;i<8;i++){const x=25+i*10;ctx.moveTo(x,38-i);ctx.lineTo(x+8,18+i*.3);ctx.moveTo(x,38-i);ctx.lineTo(x+12,46-i*.6)}ctx.stroke()}
    }
    result[kind]=new Texture({source:new CanvasSource({resource:c})})
  }
  return result
}
function sprite(texture = Texture.EMPTY): Sprite {
  const s = new Sprite(texture); s.anchor.set(.5); s.visible = false; return s
}
function setMask(mask: Graphics, g: ImpactGeometry): void {
  mask.clear()
  if (g.shape === 'beam') mask.roundRect(-g.width, -g.width, g.length + g.width * 2, g.width * 2, g.width).fill(0xffffff)
  else if (g.shape === 'arena') mask.moveTo(0, 0).arc(0, 0, g.radius, SAFE, TAU - SAFE).closePath().fill(0xffffff)
  else {
    mask.circle(0, 0, g.radius).fill(0xffffff)
    if (g.shape === 'ring' && g.innerRadius > 0) mask.circle(0, 0, g.innerRadius).cut()
  }
}
function slot(mote: Texture) {
  const root = new Container(), layer = new Container(), mask = new Graphics()
  const material = sprite(), detail = sprite()
  const particles = Array.from({ length: MAX_PARTICLES }, () => {
    const s = sprite(mote); s.blendMode = 'add'; return s
  })
  layer.addChild(material, detail, ...particles)
  root.addChild(layer, mask); layer.mask = mask
  root.visible = false
  return { root, mask, material, detail, particles, geometryKey: '' }
}
export async function createPixiBossRenderer(): Promise<PixiBossRenderer> {
  const app = new Application()
  // Offscreen GPU canvas, same frame loop and DPR as the gameplay canvas.
  await app.init({ preference: ['webgl'], backgroundAlpha: 0, autoStart: false, sharedTicker: false,
    antialias: false, width: 1, height: 1, resolution: 1, powerPreference: 'low-power' })
  app.stop()
  const canvas = app.canvas as HTMLCanvasElement
  let lost = false, disposed = false, width = 0, height = 0, dpr = 0
  const onLost = (e: Event) => { e.preventDefault(); lost = true }
  canvas.addEventListener('webglcontextlost', onLost)
  const owned = new Map<HTMLImageElement, Texture>()
  const motes = particleTextures()
  const pose: ParticlePose = { x:0,y:0,rotation:0,width:0,height:0,alpha:0,kind:'spark' }
  const lastReleaseIds: BossAttackId[] = []
  const impacts = Array.from({ length: MAX_BOSS_IMPACTS }, () => slot(motes.spark))
  const missiles = Array.from({ length: MAX_BOSS_PROJECTILES }, () => sprite())
  const impactLayer = new Container(), missileLayer = new Container()
  impactLayer.addChild(...impacts.map(x => x.root)); missileLayer.addChild(...missiles)
  // Hero Q layer shares this WebGL context; it is visible only during its own composite.
  const heroArt = Array.from({ length: HERO_ART_SLOTS }, () => sprite())
  const heroMotes = Array.from({ length: HERO_MOTE_SLOTS }, () => sprite())
  const heroLayer = new Container()
  heroLayer.addChild(...heroArt, ...heroMotes); heroLayer.visible = false
  const heroPose: HeroPose = { x: 0, y: 0, rotation: 0, width: 0, height: 0, alpha: 0, tint: 0, texture: 'spark', additive: true }
  const heroTargetPool = Array.from({ length: HERO_TARGET_SLOTS }, () => ({ x: 0, y: 0 }))
  const heroTargets = [] as { x: number; y: number }[]
  const heroCast: HeroCast = { kind: 'hero-shadowblade', elapsed: 0, life: 0, targets: heroTargets, reduced: false }
  app.stage.addChild(missileLayer, impactLayer, heroLayer)
  function texture(image?: HTMLImageElement): Texture | undefined {
    if (!image?.complete || !image.naturalWidth) return undefined
    let t = owned.get(image)
    if (!t) { t = new Texture({ source: new ImageSource({ resource: image }) }); owned.set(image, t) }
    return t
  }
  function prepare(f: Surface): boolean {
    if (disposed || lost) return false
    if (width !== f.width || height !== f.height || dpr !== f.dpr) {
      width = f.width; height = f.height; dpr = f.dpr
      app.renderer.resize(width, height, dpr)
    }
    return true
  }
  function composite(f: Surface): boolean {
    if (lost || disposed) return false
    app.render()
    if (lost) return false
    // A single composite per nonempty pass preserves existing Canvas z-order and damage text.
    // No getImageData/readPixels. Browser may still synchronize GPU/CPU; measure on real devices.
    f.ctx.drawImage(canvas, 0, 0, f.width, f.height)
    return true
  }
  function projectiles(f: VfxFrame): boolean {
    if (!f.snapshot.projectiles.length && !f.snapshot.telegraphs.length) return true
    if (!prepare(f)) return false
    const sources = bossVfxImages()
    let count = 0
    for (const p of f.snapshot.projectiles) {
      const x = p.x + f.ox, y = p.y + f.oy, r = p.radius, margin = Math.max(48, r * 4.6)
      if (x < -margin || y < -margin || x > f.width + margin || y > f.height + margin) continue
      const tex = p.attackId ? texture(sources.missiles?.[p.attackId]) : undefined
      if (!tex || count >= missiles.length) return false
      const s = missiles[count++]!
      s.texture = tex; s.anchor.set(4.5 / 5.7, .5)
      s.position.set(x, y); s.rotation = Math.atan2(p.vy, p.vx)
      s.width = r * 5.7; s.height = r * 2.5; s.alpha = f.policy?.reduceFlashing ? .72 : .94; s.visible = true
    }
    for (let i = count; i < missiles.length; i++) missiles[i]!.visible = false
    const lower = paintSurfaces(f, true)
    if (lower < 0) return false
    if (!count && !lower) return true
    missileLayer.visible = count > 0; impactLayer.visible = lower > 0
    return composite(f)
  }
  function paintSurfaces(f: VfxFrame, lower: boolean): number {
    const sources = bossVfxImages()
    let count = 0, budget = particleFrame(f.policy?.quality, f.reduced)
    const strength = f.policy?.vfxOpacity ?? 1
    if (strength <= 0) return 0
    const list = lower ? f.snapshot.telegraphs : f.snapshot.impacts ?? []
    for (const event of list) {
      const stage = lower ? event.stage ?? 'warning' : 'release'
      if (lower && stage === 'active' && f.snapshot.impacts?.some(i => i.life>0 && i.attackId===event.attackId && i.x===event.x && i.y===event.y && i.angle===event.angle)) continue
      const t = 'life' in event ? event as import('../../content/bosses/controller').BossImpact : {...event,life:1,max:1}
      if (t.life <= 0 || t.max <= 0) continue
      const g = lower ? {shape:t.shape,radius:t.radius,innerRadius:t.innerRadius,width:t.width,length:t.length,rotation:t.shape==='arena'?t.safeAngle:t.shape==='beam'?t.angle:0} : impactGeometry(t)
      if (!g || !visibleImpact(t, g, f.ox, f.oy, f.width, f.height)) continue
      const id = t.attackId as BossAttackId, profile = ATTACK_PRESENTATION[id], kind = bossMaterialKind(id), choreo = choreography(id)
      const surface = texture(sources.materials?.[kind]), accent = texture(sources.attacks?.[id])
      if (!surface || !accent || count >= impacts.length) return -1
      if (!lower) lastReleaseIds.push(id)
      const s = impacts[count++]!, p = lower ? clamp(event.progress ?? 0) : clamp(1 - t.life / t.max), motion = f.reduced ? .5 : p
      s.root.visible = true; s.root.position.set(t.x + f.ox, t.y + f.oy); s.root.rotation = g.rotation
      const key = [g.shape, g.radius, g.innerRadius, g.width, g.length].join(':')
      if (key !== s.geometryKey) { setMask(s.mask, g); s.geometryKey = key }
      const alpha = strength * Math.min(f.reduced || f.policy?.reduceFlashing ? .43 : .84, lower ? (stage==='active'?.46:.14+p*.38) : (.65 + profile.weight * .21) * releaseEnvelope(choreo,p))
      const collapse = kind === 'abyss' && (profile.visual === 'collapse' || profile.visual === 'vortex')
      const scale = g.shape !== 'circle' ? 1 : stage === 'warning' ? .72 + motion * .28 : collapse ? 1.06 - motion * .18 : .88 + motion * .12
      for (const [sprite, tex, isDetail] of [[s.material, surface, false], [s.detail, accent, true]] as const) {
        sprite.texture = tex; sprite.visible = true; sprite.alpha = alpha * (isDetail ? .62 : 1)
        if (g.shape === 'beam') {
          sprite.position.set(g.length / 2, 0); sprite.rotation = 0
          sprite.width = g.length + g.width * 2; sprite.height = g.width * 2
        } else {
          sprite.position.set(0, 0)
          sprite.width = sprite.height = g.radius * 2 * (isDetail ? (g.shape === 'circle' ? .86 + motion * .14 : 1) : scale)
          sprite.rotation = f.reduced || isDetail || kind === 'infernal' ? 0 : (kind === 'abyss' ? -1.3 : kind === 'seraph' ? .45 : .12) * motion
        }
      }
      const n = Math.min(budget, lower ? Math.ceil(choreo.count*.48) : choreo.count)
      budget -= n
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const spark = s.particles[i]!
        spark.visible = i < n
        if (i >= n) continue
        particlePose(pose,choreo,g,stage,p,i)
        spark.texture = motes[pose.kind]
        spark.position.set(pose.x,pose.y);spark.rotation=pose.rotation
        spark.width=pose.width;spark.height=pose.height
        spark.tint=palette[kind];spark.alpha=alpha*pose.alpha*(f.policy?.reduceFlashing ? .55 : 1)
        spark.blendMode=pose.kind==='mist'?'normal':'add'
      }
    }
    for (let i = count; i < impacts.length; i++) impacts[i]!.root.visible = false
    return count
  }
  function release(f: VfxFrame): boolean {
    lastReleaseIds.length=0
    if (!f.snapshot.impacts?.length || f.policy?.vfxOpacity===0) return true
    if (!prepare(f)) return false
    const count=paintSurfaces(f,false)
    if(count<0)return false
    if(!count)return true
    missileLayer.visible=false;impactLayer.visible=true
    return composite(f)
  }
  function paintHero(s: Sprite, tex: Texture, cap: number): void {
    s.texture = tex; s.position.set(heroPose.x, heroPose.y); s.rotation = heroPose.rotation
    s.width = heroPose.width; s.height = heroPose.height; s.alpha = heroPose.alpha * cap
    s.tint = heroPose.tint; s.blendMode = heroPose.additive ? 'add' : 'normal'; s.visible = true
  }
  function heroSpecial(f: HeroVfxFrame): boolean {
    const e = f.effect, strength = f.policy?.vfxOpacity ?? 1
    const cx = e.x + f.ox, cy = e.y + f.oy - 24
    if (strength <= 0 || !(e.max > 0) || !(e.life > 0)) return false
    const cull = f.kind === 'hero-ranger' ? 600 : HERO_CULL
    if (cx < -cull || cy < -cull || cx > f.width + cull || cy > f.height + cull) return true
    if (!prepare(f)) return false
    const images = heroSpecialImages()
    const struck = (e as { targets?: readonly { x: number; y: number }[] }).targets ?? []
    heroTargets.length = 0
    for (let i = 0; i < struck.length && i < heroTargetLimit(f.kind); i++) {
      const p = heroTargetPool[i]!
      p.x = struck[i]!.x - e.x; p.y = struck[i]!.y - e.y + 24
      heroTargets.push(p)
    }
    heroCast.kind = f.kind; heroCast.elapsed = e.max - e.life; heroCast.life = e.life; heroCast.reduced = f.reduced
    const cap = strength * (f.policy?.reduceFlashing ? .55 : 1)
    for (let i = 0; i < HERO_ART_SLOTS; i++) {
      const s = heroArt[i]!
      s.visible = false
      if (!heroArtPose(heroPose, heroCast, i)) continue
      const tex = heroPose.texture in motes ? motes[heroPose.texture as ParticleKind]
        : texture(images[heroPose.texture as keyof typeof images])
      if (!tex) return false // An undecoded authored texture keeps the Canvas fallback as sole owner.
      paintHero(s, tex, cap)
    }
    const budget = heroMoteBudget(f.reduced, f.policy?.quality)
    for (let i = 0; i < HERO_MOTE_SLOTS; i++) {
      const s = heroMotes[i]!
      s.visible = false
      if (i < budget && heroMotePose(heroPose, heroCast, i)) paintHero(s, motes[heroPose.texture as ParticleKind], cap)
    }
    heroLayer.position.set(cx, cy)
    missileLayer.visible = false; impactLayer.visible = false; heroLayer.visible = true
    try { return composite(f) } finally { heroLayer.visible = false }
  }
  return { projectiles, impacts: release, lastReleaseIds: () => lastReleaseIds, heroSpecial, dispose() {
    if (disposed) return
    disposed = true
    canvas.removeEventListener('webglcontextlost', onLost)
    app.destroy(false, { children: true })
    for (const t of owned.values()) t.destroy(true)
    owned.clear(); for(const mote of Object.values(motes)) mote.destroy(true)
  } }
}
