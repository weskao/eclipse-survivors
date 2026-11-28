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
  abyssRecover: ['batch-16/abyss-monarch/recover/shadow-fan-recover-key-a.webp', 1254, 1254, 603.5, 1225],
  abyssHurt: ['batch-17/abyss-monarch/hurt/recoil-key-a.webp', 1254, 1254, 638.5, 1231],
  abyssDeath: ['batch-18/abyss-monarch/death/dissolve-key-a.webp', 1254, 1254, 632.5, 1217],
  frostWindup: ['batch-10/frost-sovereign/windup/ice-fan-windup-key-a.webp', 1254, 1254, 611, 1243],
  frostRecover: ['batch-11/frost-sovereign/recover/staff-lower-key-a.webp', 1315, 1196, 654, 1147],
  frostHurt: ['batch-11/frost-sovereign/hurt/recoil-key-a.webp', 1313, 1198, 650.5, 1151],
  // Batch 12 paths are optional until the artist's WebP package is installed.
  abyssIdle: ['batch-12/abyss-monarch/idle/eclipse-hover-key-a.webp', 1254, 1254, 621.5, 1239],
  frostRelease: ['batch-12/frost-sovereign/attack/ice-fan-release-key-a.webp', 1254, 1254, 639.5, 1245],
  seraphWindup: ['batch-12/eclipse-seraph/windup/light-ring-windup-key-a.webp', 1254, 1254, 628, 1251],
  seraphRelease: ['batch-17/eclipse-seraph/attack/light-ring-release-key-a.webp', 1254, 1254, 624, 1235],
  seraphHurt: ['batch-21/eclipse-seraph/hurt/seraph-hurt-key-a.webp', 1197, 1452, 597, 1363],
  seraphDeath: ['batch-14/eclipse-seraph/death/fallen-key-a.webp', 1254, 1254, 614.5, 1225],
  // East-facing glides, mirrorAllowed: false.
  abyssMove: ['batch-09-revision-01/abyss-monarch/move/glide-east-key-a.webp', 1313, 1198, 598, 1171],
  seraphMove: ['batch-13/eclipse-seraph/move/glide-east-key-a.webp', 1312, 1199, 652.5, 1179],
  seraphMoveB: ['batch-13/eclipse-seraph/move/glide-east-key-b.webp', 1312, 1199, 650, 1167],
  abyssAwakening: ['batch-22/abyss-monarch/transform/awakening-key-a.webp', 1318, 1318, 657, 1274],
  frostDeath: ['batch-22/frost-sovereign/death/shatter-collapse-key-a.webp', 1318, 1318, 662, 1170],
  seraphRecover: ['batch-23/eclipse-seraph/recover/seraph-recover-key-a.webp', 1197, 1452, 589, 1394],
  seraphIdle: ['batch-23/eclipse-seraph/idle/seraph-eclipse-idle-key-a.webp', 1194, 1456, 597, 1422],
  seraphAscension: ['batch-23/eclipse-seraph/transform/seraph-ascension-key-a.webp', 1263, 1376, 633, 1342],
  frostAwakening: ['batch-24/frost-sovereign/transform/frost-crystal-awakening-key-a.webp', 1235, 1407, 610, 1346],
  abyssAwakeningPhase2: ['batch-25/abyss-monarch/transform/abyss-phase2-awakening-key-a.webp', 1376, 1263, 643.5, 1218],
  abyssAwakeningPhase2B: ['batch-25/abyss-monarch/transform/abyss-phase2-awakening-key-b.webp', 1359, 1278, 668.5, 1223],
  frostAwakeningPhase2: ['batch-27/frost-sovereign/transform/frost-phase2-awakening-study-a.webp', 1318, 1318, 657, 1273],
  seraphAwakeningPhase2: ['batch-27/eclipse-seraph/transform/seraph-phase2-awakening-study-a.webp', 1318, 1318, 660, 1277],
  frostHurtPhase2: ['batch-28/frost-sovereign/hurt/frost-phase2-hurt-study-a.webp', 1318, 1318, 640.5, 1266],
  // Batch 31: provisional DEV-only phase 2 ice-fan poses; alternate windup B stays review-only.
  frostPhase2Ready: ['batch-31/frost-sovereign/windup/frost-phase2-ice-fan-ready-study-a.webp', 1376, 1263, 658.5, 1215],
  frostPhase2Windup: ['batch-31/frost-sovereign/windup/frost-phase2-ice-fan-windup-study-a.webp', 1338, 1299, 660, 1245],
  frostPhase2Release: ['batch-31/frost-sovereign/attack/frost-phase2-ice-fan-release-study-a.webp', 1367, 1271, 700.5, 1217],
  // Optional Batch 32 review art: missing assets keep the canonical phase atlas.
  frostPhase2Recover: ['batch-32/frost-sovereign/recover/frost-phase2-ice-fan-recover-study-a.webp', 1348, 1289, 678.5, 1243],
  frostPhase2Idle: ['batch-32/frost-sovereign/idle/frost-phase2-idle-study-a.webp', 1348, 1289, 690.5, 1244],
  // Not wired: batch-24 frost-glide-key-a (directional move, direction/phase unapproved) and
  // batch-26 titan studies (armor/horn/skirt identity mismatch); both stay QA_PENDING review art.
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
  // Abyss/Seraph glides are east-only (mirrorAllowed: false); other facings keep the phase frame.
  const eastGlide = motion.pose === 'move' && motion.facingX === 1
  if (snapshot.id === 'abyss-monarch') {
    if (motion.pose === 'transform') {
      if (motion.phase === 2) return motion.progress < .5 ? 'abyssAwakeningPhase2' : 'abyssAwakeningPhase2B'
      if (motion.phase === 3) return 'abyssAwakening'
    }
    if (motion.phase === 3 && motion.pose === 'death') return 'abyssDeath'
    if (motion.phase !== 1) return null
    if (motion.pose === 'idle') return 'abyssIdle'
    if (motion.pose === 'move') return eastGlide ? 'abyssMove' : null
    if (motion.pose === 'hurt') return 'abyssHurt'
    if (motion.pose === 'windup' && snapshot.telegraphs.some(t => t.stage === 'warning' && t.attackId === 'shadow-fan'))
      return motion.progress < .5 ? 'abyssWindup' : 'abyssWindupB'
    if (snapshot.impacts?.at(-1)?.attackId === 'shadow-fan') {
      if (motion.pose === 'attack') return motion.progress < .5 ? 'abyssReleaseA' : 'abyssReleaseB'
      if (motion.pose === 'recover') return 'abyssRecover'
    }
    return null
  }
  if (snapshot.id === 'frost-sovereign') {
    if (motion.phase === 2 && motion.pose === 'transform') return 'frostAwakeningPhase2'
    if (motion.phase === 2 && motion.pose === 'hurt') return 'frostHurtPhase2'
    if (motion.phase === 2) {
      if (motion.pose === 'windup' && snapshot.telegraphs.some(t => t.stage === 'warning' && t.attackId === 'ice-fan'))
        return motion.progress < .5 ? 'frostPhase2Ready' : 'frostPhase2Windup'
      if (motion.pose === 'attack' && snapshot.impacts?.at(-1)?.attackId === 'ice-fan') return 'frostPhase2Release'
      if (motion.pose === 'recover' && snapshot.impacts?.at(-1)?.attackId === 'ice-fan') return 'frostPhase2Recover'
      if (motion.pose === 'idle') return 'frostPhase2Idle'
      return null
    }
    if (motion.phase === 3 && motion.pose === 'death') return 'frostDeath'
    if (motion.phase === 3 && motion.pose === 'transform') return 'frostAwakening'
    if (motion.phase !== 1) return null
    if (motion.pose === 'hurt') return 'frostHurt'
    if (motion.pose === 'windup' && snapshot.telegraphs.some(t => t.stage === 'warning' && t.attackId === 'ice-fan')) return 'frostWindup'
    if (snapshot.impacts?.at(-1)?.attackId === 'ice-fan') {
      if (motion.pose === 'attack') return 'frostRelease'
      if (motion.pose === 'recover') return 'frostRecover'
    }
    return null
  }
  if (snapshot.id === 'eclipse-seraph') {
    if (motion.phase === 2 && motion.pose === 'transform') return 'seraphAwakeningPhase2'
    if (motion.phase === 3) {
      if (motion.pose === 'death') return 'seraphDeath'
      if (motion.pose === 'idle') return 'seraphIdle'
      if (motion.pose === 'transform') return 'seraphAscension'
    }
    if (motion.phase !== 1) return null
    if (motion.pose === 'hurt') return 'seraphHurt'
    if (motion.pose === 'move') return eastGlide ? (motion.progress < .5 ? 'seraphMove' : 'seraphMoveB') : null
    if (motion.pose === 'windup' && snapshot.telegraphs.some(t => t.stage === 'warning' && t.attackId === 'light-ring')) return 'seraphWindup'
    if (snapshot.impacts?.at(-1)?.attackId === 'light-ring') {
      if (motion.pose === 'attack') return 'seraphRelease'
      if (motion.pose === 'recover') return 'seraphRecover'
    }
    return null
  }
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
