import type { BossSnapshot } from '../../content/bosses/controller'
import type { BossId } from '../../content/bosses/definitions'
import type { ParticleKind } from './choreography'

export const BOSS_PHASE_SLOTS = 50
export type PhaseTexture = 'seal' | 'halo' | ParticleKind
export interface BossPhasePose { x: number; y: number; width: number; height: number; rotation: number; alpha: number; texture: PhaseTexture; additive: boolean }
const TAU = Math.PI * 2
const profiles = {
  'abyss-monarch': { tint: 0xb194ff, mote: 'void', twist: -3.6, rise: 84, spread: 1 },
  'frost-sovereign': { tint: 0xb4ebff, mote: 'crystal', twist: 1.8, rise: 106, spread: .93 },
  'infernal-titan': { tint: 0xffa04d, mote: 'ember', twist: .85, rise: 126, spread: 1.08 },
  'eclipse-seraph': { tint: 0xffe0a0, mote: 'feather', twist: 2.8, rise: 148, spread: 1.04 },
} as const
export const bossPhaseTint = (id: BossId): number => profiles[id].tint
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => { const t = clamp(n); return t*t*(3-2*t) }
export const bossPhaseBudget = (reduced: boolean, quality?: string): number =>
  reduced ? 2 : quality === 'low' ? 14 : quality === 'medium' ? 30 : BOSS_PHASE_SLOTS
export function activeBossPhase(snapshot: BossSnapshot): boolean {
  const b = snapshot.bodyMotion
  return !!snapshot.id && b?.pose === 'transform' && (b.phase === 2 || b.phase === 3) && Number.isFinite(b.progress)
}
export function phaseVisible(snapshot: BossSnapshot, ox: number, oy: number, w: number, h: number): boolean {
  if (!activeBossPhase(snapshot)) return false
  const b = snapshot.bodyMotion!, x = b.x + ox, y = b.y + oy
  return x >= -450 && y >= -450 && x <= w + 450 && y <= h + 450
}
// All animation comes from the existing authoritative body clock.
export function bossPhasePose(out: BossPhasePose, snapshot: BossSnapshot, slot: number, reduced: boolean): boolean {
  if (!activeBossPhase(snapshot) || slot < 0 || slot >= BOSS_PHASE_SLOTS || (reduced && slot >= 2)) return false
  const b = snapshot.bodyMotion!, profile = profiles[snapshot.id!], final = b.phase === 3
  const p = reduced ? .38 : clamp(b.progress), gather = ease(p / .36), release = ease((p - .36) / .64)
  const fade = reduced ? .65 : ease(p / .10) * (1 - ease((p - .74) / .26))
  const radius = (final ? 172 : 117) * profile.spread
  let x=0, y=0, width=0, height=0, rotation=0, alpha=0
  let texture: PhaseTexture='seal', additive=true
  if (slot === 0) {
    width = radius * (1.12 + gather * .36 + release * .62); height = width * .44
    y = -2; alpha = .72 * fade
  } else if (slot === 1) {
    texture='halo'; y=-101; width=radius*(1.34 + release*.65); height=width*1.14; rotation=reduced?0:profile.twist*p*.22; alpha=.48*fade
  } else if (slot === 2 || slot === 3) {
    if (slot === 3 && !final) return false
    const r = ease((p - (slot===2?.32:.48)) / (slot===2?.55:.46))
    if (r <= 0 || r >= 1) return false
    texture='halo'; width=radius*(.65+2.12*r); height=width*.48; y=-5; alpha=.76*(1-r)*fade
  } else {
    const i=slot-4, angle=i*2.399963 + profile.twist*p, stagger=(i%7)*.018
    const travel=ease((p-.34-stagger)/.57), orbit=radius*(.82-.49*gather+1.08*travel)
    x=Math.cos(angle)*orbit; y=-76 + Math.sin(angle)*orbit*.57-profile.rise*travel*(.45+(i%5)*.12)
    if (snapshot.id==='frost-sovereign') { x=Math.cos(Math.round(angle/ (TAU/6))*(TAU/6))*orbit; y-=travel*30 }
    else if (snapshot.id==='infernal-titan') { x*=.69; y-=Math.sin(Math.PI*travel)*65 }
    else if (snapshot.id==='eclipse-seraph') { x*=1.25; y-=travel*46 }
    width=(final?33:24)*(.72+(i%4)*.19)*(1-.35*travel); height=width*(profile.mote==='crystal'?.65:.43)
    rotation=angle+(profile.mote==='feather'?-.7:0); alpha=(.38+(i%5)*.09)*fade*(1-.56*travel)
    texture=profile.mote; additive=profile.mote!=='void'
  }
  if (alpha <= .006) return false
  out.x=x;out.y=y;out.width=width;out.height=height;out.rotation=rotation;out.alpha=Math.min(.85,alpha)
  out.texture=texture;out.additive=additive
  return true
}
