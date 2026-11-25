import type { BossSnapshot } from '../../content/bosses/controller'
import type { Ctx2D } from '../ctx'

// Provisional alpha128 bottom-center anchors from the committed manifests.
// These are isolated candidate poses, not an approved sequence or phase assignment.
export const BOSS_NATIVE_KEYFRAMES = {
  idle: ['batch-01/infernal-titan/sources/idle-stance-a.webp', 1312, 1199, 624.5, 1185],
  windup: ['batch-01/infernal-titan/sources/windup-key-a.webp', 1262, 1246, 675, 1218],
  move: ['batch-02/infernal-titan/move/stride-key-a.webp', 1312, 1199, 656, 1175],
  slam: ['batch-02/infernal-titan/attack/ground-slam-key-a.webp', 1437, 1095, 724.5, 1087],
  hurt: ['batch-02/infernal-titan/hurt/recoil-key-b.webp', 1312, 1199, 657.5, 1178],
  transform: ['batch-02/infernal-titan/transform/overload-key-a.webp', 1312, 1199, 656, 1195],
  transformPhase2: ['batch-06/infernal-titan/transform/phase-2-awakening-key-a.webp', 1374, 1145, 699, 1114],
  death: ['batch-03/infernal-titan/death/collapse-key-a.webp', 1312, 1199, 659, 1112],
  windupB: ['batch-04/infernal-titan/windup/crouch-key-b.webp', 1312, 1199, 653, 1186],
  slamB: ['batch-04/infernal-titan/attack/ground-slam-key-b.webp', 1312, 1199, 658, 1193],
  recover: ['batch-04/infernal-titan/recover/ground-slam-retract-key-a.webp', 1312, 1199, 654.5, 1149],
  deathDim: ['batch-04/infernal-titan/death/core-dimming-key-b.webp', 1312, 1199, 659, 1154],
  deathRubble: ['batch-04/infernal-titan/death/rubble-key-c.webp', 1448, 1086, 722, 889],
  abyssWindup: ['batch-07/abyss-monarch/windup/shadow-orb-windup-key-a.webp', 1303, 1207, 652, 1194],
  abyssWindupB: ['batch-08/abyss-monarch/windup/shadow-orb-windup-key-b.webp', 1374, 1145, 690, 1130],
  abyssReleaseA: ['batch-08/abyss-monarch/attack/shadow-fan-release-key-a.webp', 1312, 1199, 660.5, 1190],
  abyssReleaseB: ['batch-08/abyss-monarch/attack/shadow-fan-release-key-b.webp', 1312, 1199, 656, 1180],
  frostWindup: ['batch-10/frost-sovereign/windup/ice-fan-windup-key-a.webp', 1254, 1254, 611, 1243],
} as const
export type NativeBossKeyframe = keyof typeof BOSS_NATIVE_KEYFRAMES
const registered = new WeakMap<HTMLImageElement, NativeBossKeyframe>()

export function registerBossNativeKeyframe(image: HTMLImageElement, key: NativeBossKeyframe): void {
  registered.set(image, key)
}
export function isBossNativeKeyframe(image: HTMLImageElement): boolean {
  return registered.has(image)
}

export function selectBossNativeKeyframe(snapshot: BossSnapshot): NativeBossKeyframe | null {
  const motion = snapshot.bodyMotion
  if (!snapshot.phase || !motion || motion.phase !== snapshot.phase
      || !Number.isFinite(motion.progress) || motion.progress < 0 || motion.progress > 1) return null
  if (snapshot.id === 'abyss-monarch') {
    if (motion.phase !== 1) return null
    if (motion.pose === 'windup' && snapshot.telegraphs.some(t => t.stage === 'warning' && t.attackId === 'shadow-fan'))
      return motion.progress < .5 ? 'abyssWindup' : 'abyssWindupB'
    if (motion.pose === 'attack' && snapshot.impacts?.at(-1)?.attackId === 'shadow-fan')
      return motion.progress < .5 ? 'abyssReleaseA' : 'abyssReleaseB'
    return null
  }
  if (snapshot.id === 'frost-sovereign') return motion.phase === 1 && motion.pose === 'windup'
    && snapshot.telegraphs.some(t => t.stage === 'warning' && t.attackId === 'ice-fan') ? 'frostWindup' : null
  if (snapshot.id !== 'infernal-titan') return null
  switch (motion.pose) {
    case 'windup': return snapshot.telegraphs.some(t => t.stage === 'warning' && t.attackId === 'titan-slam') ? (motion.progress < .5 ? 'windup' : 'windupB') : null
    case 'attack': return snapshot.impacts?.at(-1)?.attackId === 'titan-slam' ? (motion.progress < .5 ? 'slam' : 'slamB') : null
    case 'recover': return snapshot.impacts?.at(-1)?.attackId === 'titan-slam' ? 'recover' : null
    case 'transform': return motion.phase === 2 ? 'transformPhase2' : motion.phase === 3 ? 'transform' : null
    case 'death': return motion.progress < 1 / 3 ? 'death' : motion.progress < 2 / 3 ? 'deathDim' : 'deathRubble'
    default: return motion.pose
  }
}

export function drawBossNativeKeyframe(ctx: Ctx2D, image: HTMLImageElement, snapshot: BossSnapshot,
  scaledDisplaySize: number, reducedMotion = false): boolean {
  const key = registered.get(image)
  if (reducedMotion || !key || key !== selectBossNativeKeyframe(snapshot) || !image.complete
      || !Number.isFinite(scaledDisplaySize) || scaledDisplaySize <= 0) return false
  const [, width, height, anchorX, anchorY] = BOSS_NATIVE_KEYFRAMES[key]
  if (image.naturalWidth !== width || image.naturalHeight !== height) return false
  // Common source scale: do not resize each pose to its changing bounding box.
  const scale = scaledDisplaySize / 1200
  ctx.drawImage(image, 0, 0, width, height, -anchorX * scale, 4 - anchorY * scale, width * scale, height * scale)
  return true
}
