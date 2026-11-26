import { shallowReactive } from 'vue'
import { accountStorage } from '../cloud/account-storage'
import { cloudRuntime } from '../cloud/cloud-runtime'
import type { CloudWallet } from '../cloud/wallet-policy'
import { createProfileStore, type ProfileStore } from '../meta/profile'
import { MODES, isObjectiveModeId } from '../meta/modes'
import type { RunStats, RunModeId, PermanentUpgrade, CosmeticId } from '../meta/types'
import { loadArtwork, BGM_URL, type Artwork } from './art'
import { createAudioSystem } from './audio/engine'
import { createEs2AudioAdapter } from './audio/es2/adapter'
import type { AudioSystem } from './audio/types'
import { attack, dash as heroDash, hit } from './combat'
import { clearHeroImpact, healthCriticalVersion, rollIncomingCritical } from './health-impact'
import { getFiringOrigin } from './weapon-geometry'
import { BALANCE } from './config'
import { countLivingEnemies } from './combat-telemetry'
import { JOB, SCENE_SECONDS } from './constants'
import { createContentRegistry, type ContentRegistry } from './content/registry'
import { createHeroRosterAdapter, HERO_DEFINITIONS, isSpecializationId, type HeroSpecializationAdapter } from './content/heroes'
import type { VisualPresentationPolicy } from './content/accessibility/presentation'
import { CONTENT_PACKS } from './content/packs'
import { BOSS_DEFINITIONS, type BossId } from './content/bosses/definitions'
import { getBossArrivalWarning, type BossArrivalWarning } from './bosses/countdown'
import { createBossEncounterController } from './content/bosses/controller'
import { createBossEncounterPack } from './content/packs/bosses'
import { createObjectiveRuntime, type ObjectiveRuntime } from './content/objectives/runtime'
import { createLiveWorldEvents, type LiveWorldEvents } from './content/world-events/runtime'
import { createMetaProgressionStore } from './content/meta/store'
import { createUnlockedPlaytestMetaStorage, createUnlockedPlaytestProfileStorage } from './content/meta/dev-unlocked'
import type { ContentPack } from './content/contracts'
import { RELIC_BY_ID, type RelicId } from './content/relics/catalog'
import { calculateRelicAttack, calculateRelicIncoming, claimTreasure, declineTreasure, inventorySnapshot, openTreasure, relicBonuses, tickRelicRecovery } from './content/relics/runtime'
import { trySpawnEvent } from './events'
import { burst, impact } from './fx'
import { emitCombatVfx, followHeroSpecialFx } from './content/packs/combat-vfx'
import { EVOLUTIONS } from './evolutions'
import { moveVector, PREVENT_DEFAULT_KEYS, upgradeKeyIndex, type KeyState } from './input'
import { minmax, random } from './math'
import { addXp, applyUpgrade, pickUpgrades } from './progression'
import { createRenderAssets, drawFrame, drawMiniMap, type RenderAssets } from './render'
import { createPixiVfxBridge, type PixiVfxBridge, type PixiVfxStats } from './render/pixi-vfx/bridge'
import { createFactionBridge } from './content/enemies/integration'
import { loadProductionFactionArt } from './render/es2/production-factions'
import { loadProductionHeroes } from './render/es2/production-heroes'
import { markHeroSpecialAnimation } from './render/animation'
import { loadWorldRuntimeImages } from './render/es2/production-world'
import { setScene } from './scene'
import { spawnOpeningWave, spawnMob } from './spawn'
import { actorPose, createState, currentSceneInfo, resetRun, type Pose } from './state'
import { step } from './step'
import { emptyHud, equippedSkillHud, type GameCommands, type UiState } from './store'
import type { AbilityId, ContentEvent, ContentId, EvolutionId, GameHooks, GameMode, GameState, HeroId, JobId, MoveInput, Point, UpgradeId } from './types'

const TREASURE_AUDIO_TIERS = ['common', 'rare', 'epic', 'legendary', 'cursed'] as const

/** Debug/automation API kept name-for-name from the original (`scripts/export-brand-assets.py` uses it). */
export interface TestApi {
  readonly mode: GameMode
  readonly enemies: number
  readonly audio: boolean
  readonly music: boolean
  readonly time: number
  level(): void
  /** Stage an evolution for browser capture without changing normal play. */
  prepareEvolution(id: EvolutionId): void
  readonly hp: number | undefined
  /** Vite DEV + explicit showcase flags only; capture true Canvas/HUD states without cheats in production. */
  previewLowHealth(percent: number): void
  readonly active: boolean
  readonly sceneArtLoaded: boolean
  readonly animated: boolean
  readonly position: Point | null
  readonly velocity: Point | null
  readonly pose: Pose
  readonly attackAnimation: boolean
  readonly vfxCount: number
  readonly pixiVfx?: PixiVfxStats
  readonly frames: number
  readonly scene: string
  /** Live encounter identity and phase for browser QA; not a player setting. */
  readonly bossPreview: { id: BossId | null; phase: 1 | 2 | 3 | null }
  /** Dev capture reads which real boss attack is currently telegraphing. */
  readonly bossAttackPreview: { id: string | null; activeImpacts: number }
  forceAttack(): void
  /** DEV art capture only: stage a real East target and invoke normal combat. */
  prepareHeroArtEastAttack(): boolean
  /** Browser-capture scenario, isolated from normal play. */
  showcaseBoss(phase?: 1 | 2 | 3): void
  /** Capture-only biome preview; requires ?showcase=1. */
  previewBiome(index: number): void
}

declare global {
  interface Window { __test?: TestApi }
}

export interface Engine extends GameCommands {
  readonly cloudWallet?: {
    select(uid: string | null): boolean
    apply(wallet: CloudWallet, expectedBalance: number, preserveBalance: boolean): boolean
  }
  readonly contentRegistry: ContentRegistry
  setVisualPresentationPolicy(policy: VisualPresentationPolicy): void
  /** Only active in development with ?content-showcase=1. */
  showcaseGrant(id: ContentId): boolean
  showcaseEmit(event: ContentEvent): void
  readonly ui: UiState
  readonly state: GameState
  readonly bossArrivalWarning: BossArrivalWarning | null
  readonly testApi: TestApi
  /** Original `update()` tail run by `frame()`: clock, step, toast, 8 Hz hud. */
  advance(dt: number): void
  /** Keyboard / focus / global pointer listeners. Returns a cleanup. */
  listen(win?: Window): () => void
  /** Canvas, resize, rAF loop, listeners and `window.__test`. Returns a cleanup. */
  mount(canvas: HTMLCanvasElement, minimap: HTMLCanvasElement | null): () => void
}

function createBgm(source: string): HTMLAudioElement {
  const bgm = new Audio(source)
  bgm.loop = true
  bgm.preload = 'auto'
  bgm.volume = 0.38
  return bgm
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

export function createEngine(opts: { audio?: AudioSystem; profileStore?: ProfileStore; contentPacks?: readonly ContentPack[] } = {}): Engine {
  const s = createState()
  const requestedPacks = opts.contentPacks ?? CONTENT_PACKS
  const relicsEnabled = requestedPacks.some(pack => pack.id === 'relics')
  const bosses = requestedPacks.some(pack => pack.id === 'bosses') ? createBossEncounterController({
    emit(event) {
      if (event.type === 'intro') audio.prepareBossAttackAudio?.(event.boss)
      else if (event.type === 'warning' || event.type === 'attack')
        audio.playBossAttack?.(event.attack, event.type === 'warning' ? 'warning' : 'release')
    },
    cancelAttackAudio: () => audio.cancelBossAttackAudio?.(),
  }) : null
  const contentRegistry = createContentRegistry(
    bosses ? requestedPacks.map(pack => pack.id === 'bosses' ? createBossEncounterPack(bosses) : pack) : requestedPacks,
    random,
  )
  const bossIds = Object.keys(BOSS_DEFINITIONS) as BossId[]
  const factions = requestedPacks.some(pack => pack.id === 'factions') ? createFactionBridge({ random }) : null
  let bossSequence = 0
  const bossAdapter = bosses ? {
    spawn(state: GameState, hooks: GameHooks): void {
      const id = bossIds[bossSequence % bossIds.length]!
      const hero = state.hero
      if (!hero) return
      const spawned = bosses.spawn(state, id, { x: hero.x + 245, y: hero.y }, hooks)
      if (spawned) {
        bossSequence++
        hooks.message(`⚠ ${BOSS_DEFINITIONS[id].title} 降臨！`)
      }
    },
    tick(state: GameState, dt: number, hooks: GameHooks): void { bosses.tick(state, dt, hooks) },
  } : undefined
  // The unlocked mode exists only in Vite dev, and uses disposable saves.
  // Even a build with VITE_ES2_UNLOCKED=1 cannot enable it in production.
  const unlockedPlaytest = import.meta.env.DEV && import.meta.env.VITE_ES2_UNLOCKED === '1'
  const runtime = cloudRuntime()
  const emulator = runtime.mode === 'emulator'
  const namespace = emulator ? 'emulator.' + runtime.projectId : 'account'
  const scopedStorage = (uid: string | null) => {
    if (!uid && !emulator) return undefined
    return accountStorage(localStorage, uid ?? 'guest', namespace + (emulator ? (uid ? '.uid' : '.guest') : ''))
  }
  // Unlocked test profiles remain in memory even when authenticated. A dedicated
  // demo project owns their test currency; live phone sign-in is identity-only.
  const guestProfileStorage = unlockedPlaytest ? createUnlockedPlaytestProfileStorage() : scopedStorage(null)
  const guestMetaStorage = unlockedPlaytest ? createUnlockedPlaytestMetaStorage() : scopedStorage(null)
  const unlockedAccounts = new Map<string, { profile: ReturnType<typeof createUnlockedPlaytestProfileStorage>; meta: ReturnType<typeof createUnlockedPlaytestMetaStorage> }>()
  let profileStore = opts.profileStore ?? createProfileStore(guestProfileStorage)
  // Injected legacy stores are retained for existing compatibility tests.
  // In production the v3 writer owns all currency and run settlements.
  let metaStore = opts.profileStore ? null : createMetaProgressionStore(guestMetaStorage)
  let walletAccount: string | null = null
  const walletReady = (): boolean => !walletAccount || !!metaStore?.get().state?.cloudWallet
  function displayProfile() {
    const legacy = profileStore.get()
    const persisted = metaStore?.get()
    if (persisted?.status === 'ready' && persisted.state) {
      const v3 = persisted.state
      legacy.runs = v3.runs
      legacy.wins = v3.wins
      legacy.embers = v3.embers
      legacy.upgrades.power = v3.research.power ?? 0
      legacy.upgrades.vitality = v3.research.vitality ?? 0
      legacy.achievements = [...new Set([...legacy.achievements, ...v3.achievements])]
      const compatible = v3.cosmetics.filter(id =>
        id === 'knight-gilded' || id === 'ranger-moonlit' || id === 'wizard-astral') as CosmeticId[]
      legacy.unlockedCosmetics = [...new Set([...legacy.unlockedCosmetics, ...compatible])]
      for (const hero of ['knight', 'ranger', 'wizard'] as const) {
        const selected = v3.equippedCosmetics?.[hero] as CosmeticId | undefined
        if (selected && legacy.unlockedCosmetics.includes(selected)) legacy.equippedCosmetics[hero] = selected
      }
    } else if (metaStore) {
      // A corrupt committed v3 save cannot expose the old wallet for spending.
      legacy.embers = 0
    }
    return legacy
  }
  const bossTrackUrls = Object.fromEntries(bossIds.map(id => [
    id, [1, 2, 3].map(phase => import.meta.env.BASE_URL + 'audio/boss/' + id + '-p' + phase + '.mp3') as [string, string, string],
  ]))
  const audio = opts.audio ?? createAudioSystem({
    bgm: createBgm(BGM_URL),
    menuBgm: createBgm(`${import.meta.env.BASE_URL}audio/eclipse-overture.wav`),
    bossTracks: bossTrackUrls,
    warningTrack: import.meta.env.BASE_URL + 'audio/boss/arrival-warning.mp3',
    victoryTrack: import.meta.env.BASE_URL + 'audio/eclipse-victory.wav',
  })
  // The original audio owner provides the context and buses. Never start a second BGM.
  // Older injected AudioSystem fakes retain their original behaviour unchanged.
  let adaptiveScoreActive = false
  let adaptiveScoreFailed = false
  function setAdaptiveScore(active: boolean): void {
    const next = !!es2Audio && !adaptiveScoreFailed && active
    if (adaptiveScoreActive === next) return
    adaptiveScoreActive = next
    audio.setExternalScoreActive?.(next)
  }
  const es2Port = audio.createEs2Port?.()
  const es2Audio = es2Port && audio.setExternalScoreActive
    ? createEs2AudioAdapter({
      audio, ...es2Port,
      tone: (...args) => {
        try { es2Port.tone(...args) }
        catch (error) {
          // The adapter falls back to legacy scheduling after any synthesis failure.
          adaptiveScoreFailed = true
          setAdaptiveScore(false)
          throw error
        }
      },
    }) : null
  const settingsStorage = (() => { try { return localStorage } catch { return null } })()
  type SelectionKey = 'eclipseSelectedHero' | 'eclipseSelectedRunMode'
  const pendingSelectionWrites = new Set<SelectionKey>()
  // A failed write must not replace a newer in-memory choice with stale storage on Home.
  function readSelection(key: SelectionKey, fallback: string): string {
    if (pendingSelectionWrites.has(key)) return fallback
    try { return settingsStorage?.getItem(key) ?? fallback } catch { return fallback }
  }
  function saveSelection(key: SelectionKey, value: string): void {
    try {
      if (!settingsStorage) throw new Error('Storage unavailable')
      settingsStorage.setItem(key, value)
      pendingSelectionWrites.delete(key)
    } catch { pendingSelectionWrites.add(key) }
  }
  // The current roster has no account-specific hero/mode entitlements.
  // Keep restoration and explicit selection on the same availability checks.
  function canSelectHero(id: unknown): id is HeroId {
    return isSpecializationId(id)
      ? !!contentRegistry.getAbility(HERO_DEFINITIONS[id].startingAbility)
      : typeof id === 'string' && Object.prototype.hasOwnProperty.call(JOB, id)
  }
  function isRunModeId(id: unknown): id is RunModeId {
    return typeof id === 'string' && Object.prototype.hasOwnProperty.call(MODES, id)
  }
  function applyHeroChoice(id: HeroId): void {
    s.heroId = id
    s.choice = isSpecializationId(id) ? HERO_DEFINITIONS[id].legacyArtJob : id
    s.cosmetic = displayProfile().equippedCosmetics[s.choice]
  }
  // Restore silently: reopening the page is not a player gesture or a new selection.
  function restoreMenuSelection(): void {
    const hero = readSelection('eclipseSelectedHero', s.heroId)
    const mode = readSelection('eclipseSelectedRunMode', s.runMode)
    applyHeroChoice(canSelectHero(hero) ? hero : 'knight')
    s.runMode = isRunModeId(mode) ? mode : 'quick'
  }
  restoreMenuSelection()
  let initialEffect: 'soft' | 'still' = 'soft'
  let initialShake = false
  try {
    if (settingsStorage?.getItem('eclipseUpgradeEffect') === 'still') initialEffect = 'still'
    if (settingsStorage?.getItem('eclipseCameraShake') === 'on') initialShake = true
  } catch { /* private browsing may block settings */ }
  const ui = shallowReactive<UiState>({
    mode: 'menu', choice: s.choice, heroId: s.heroId, heroSpecial: null, musicOn: audio.musicOn, audioUnlocked: audio.unlocked, sfxOn: audio.sfxOn,
    musicVolume: audio.musicVolume, sfxVolume: audio.sfxVolume,
    settingsOpen: false, upgradeEffect: initialEffect, cameraShake: initialShake, hud: emptyHud(),
    upgrades: [], specialChoice: null, toastText: '', toastVisible: false, ending: '冒險結束', summary: '', coarsePointer: false,
    runMode: s.runMode, objectiveProgress: null, worldEventMarkers: [], worldEventChoice: null,
    profile: displayProfile(), metaState: metaStore?.get().state ?? null,
    metaStatus: metaStore?.get().status ?? null, runResult: null, rewards: null,
  })
  function syncMenuSelection(): void {
    restoreMenuSelection()
    ui.heroId = s.heroId
    ui.choice = s.choice
    ui.runMode = s.runMode
  }
  function refreshMeta(): void {
    const snapshot = metaStore?.get()
    ui.metaState = snapshot?.state ?? null
    ui.metaStatus = snapshot?.status ?? null
    ui.profile = displayProfile()
  }
  let resumeAfterSettings = false
  let toastTimer = 0
  let keys: KeyState = {}
  let stick: MoveInput = { x: 0, y: 0 }
  let runSequence = 0
  let runReceiptId: string | null = null
  let frameDrawn = 0
  let pixiVfx: PixiVfxBridge | undefined
  let presentationPolicy: VisualPresentationPolicy | null = null
  let lastHapticAt = -Infinity
  let resizeRenderer: () => void = () => {}
  let art: Artwork | null = null
  let heroSpecialization: HeroSpecializationAdapter | null = null
  let objectiveRuntime: ObjectiveRuntime | null = null
  const arrivalWarning = () => getBossArrivalWarning(s, objectiveRuntime?.snapshot() ?? null,
    bosses ? bossIds[bossSequence % bossIds.length]! : null)
  let worldEvents: LiveWorldEvents | null = null
  let ending = false
  let lastCritical = false

  function wakeAudio(): void {
    if (es2Audio) es2Audio.wakeFromGesture()
    else audio.wake()
    ui.audioUnlocked = audio.unlocked
  }

  const hooks: GameHooks = {
    otherLivingActors: () => factions?.runtime.enemies.length ?? 0,
    factions: () => factions ?? undefined,
    contactSfx: cue => audio.playSfx(cue),
    sfx: (cue, milestone) => {
      if (milestone === undefined) audio.playSfx(cue)
      else audio.playSfx(cue, milestone)
      if (s.mode !== 'play' || !presentationPolicy?.haptics || !ui.coarsePointer || s.time - lastHapticAt < 0.65) return
      const duration = cue === 'bossDefeat' ? 45 : cue === 'bossStagger' || cue === 'killStreak' ? 30 : cue === 'massKill' || cue.endsWith('-special') ? 18 : 0
      if (!duration || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
      lastHapticAt = s.time
      try { navigator.vibrate(duration) } catch { /* unsupported or blocked by browser */ }
    },
    message,
    offerUpgrades,
    end,
    modifyOutgoingDamage: (amount, target) => {
      lastCritical = false
      const modified = heroSpecialization?.modifyOutgoingDamage(amount) ?? amount
      if (!s.hero || s.mode !== 'play' || !Number.isFinite(modified) || modified <= 0) return modified
      const result = calculateRelicAttack(s, modified, {
        relicsEnabled,
        baseCritChance: s.heroId === 'shadowblade' ? 0 : BALANCE.combat.baseCriticalChance,
        moving: s.hero.moveAmount > 0,
        boss: target?.type === 'boss',
        targetHp: target?.hp,
        targetHpFraction: target && target.max > 0 ? target.hp / target.max : undefined,
      }, random)
      lastCritical = result.critical
      return result.execute && target ? Math.max(result.damage, target.hp) : result.damage
    },
    consumeCriticalHit: () => {
      const heroCritical = heroSpecialization?.consumeCriticalHit() ?? false
      const critical = heroCritical || lastCritical
      lastCritical = false
      return critical
    },
    rollIncomingCritical: rank => rollIncomingCritical(rank, random),
    mitigateIncomingDamage: amount => {
      const modified = heroSpecialization?.mitigateIncomingDamage(amount) ?? amount
      if (!relicsEnabled || !s.hero || s.mode !== 'play' || modified <= 0) return modified
      return calculateRelicIncoming(s, modified, random).damage
    },
    afterDamage: (amount, source) => {
      heroSpecialization?.afterDamage(amount)
      if (!relicsEnabled || !source || source.hp <= 0 || !s.hero || s.hero.hp <= 0 ||
        s.mode !== 'play' || amount <= 0) return
      const reflect = relicBonuses(s).reflect ?? 0
      if (reflect > 0) {
        // Only the original colliding Mob receives reflected damage.
        // Do not roll relic critical hits a second time for the reflected strike.
        hit(s, source, amount * reflect, { ...hooks, contactKind: 'hero', modifyOutgoingDamage: undefined, consumeCriticalHit: undefined })
      }
    },
    canTargetHero: () => heroSpecialization?.canBeTargeted() ?? true,
    // Skip all event-object allocation in the default empty-pack game.
    content: contentRegistry.packs.some(pack => pack.onEvent)
      ? (state, event) => {
        contentRegistry.emit(state, event, hooks)
        if (state === s) worldEvents?.onContentEvent(event)
        if (state === s && event.type === 'kill' && event.mob.type === 'boss' && factions) {
          factions.runtime.projectiles.length = 0
          factions.runtime.zones.length = 0
        }
        // Only an actual finalized kill can advance an objective. The existing
        // boss controller gets first chance to account for its original XP/reward.
        if (state === s && event.type === 'kill' && objectiveRuntime) {
          objectiveRuntime.defeatMob(event.mob)
          // The controller retains the defeated pose and accepts the next scheduled boss.
        }
      }
      : undefined,
    openTreasure: relicsEnabled ? (state, chestId, tier) => {
      const offer = openTreasure(state, chestId, random, undefined, tier)
      if (!offer) return false
      ui.specialChoice = { kind: 'treasure', tier: offer.tier, items: offer.options.map(id => {
        const relic = RELIC_BY_ID.get(id)!
        return { id, title: relic.title, description: relic.description, icon: relic.icon, rarity: relic.rarity, cursed: relic.cursed }
      }) }
      ui.upgrades = []
      screen('level')
      const reveal = TREASURE_AUDIO_TIERS.indexOf(offer.tier ?? 'common')
      audio.playSfx('treasureReveal', reveal)
      return true
    } : undefined,
  }

  // All 12 world events use the existing HP/XP, relic and combat writers.
  // The adapter owns the per-run transaction ledger, never another game loop.
  worldEvents = createLiveWorldEvents(s, hooks, { random, otherActors: () => factions?.runtime.enemies.length ?? 0 })

  // Special attacks and companion hits already own their damage; do not apply the normal
  // attack critical/modifier hook a second time when they call legacy hit().
  const heroHooks: GameHooks = {
    ...hooks, modifyOutgoingDamage: undefined, consumeCriticalHit: undefined, mitigateIncomingDamage: undefined, afterDamage: undefined,
  }

  function screen(name: GameMode): void {
    // A level-up freezes gameplay: discard pending hit recoil before the picker opens.
    if (name === 'level') s.cameraKick = 0
    if (name !== 'play' && s.hero) clearHeroImpact(s.hero)
    s.mode = name
    ui.mode = name
    ui.coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches
    // Switch back to the host after entering the title screen so the battle track stays paused.
    audio.onScreen(name)
    if (name === 'menu' || (name === 'result' && audio.setResultTheme)) setAdaptiveScore(false)
    else if (name === 'result') setAdaptiveScore(true)
    if (name === 'menu') es2Audio?.setScene('menu')
    else if (name === 'play') es2Audio?.setScene('exploration')
    if (name !== 'play') {
      keys = {}
      stick = { x: 0, y: 0 }
    }
  }

  function message(text: string): void {
    ui.toastText = text
    ui.toastVisible = true
    toastTimer = 1.7
  }

  function hud(): void {
    const hero = s.hero
    if (!hero) return
    const sc = currentSceneInfo(s)
    const sceneTitle = `${sc.name} · ${sc.label}`
    const boss = s.mobs.find(e => e.type === 'boss' && e.hp > 0)
    const xpPct = minmax(hero.xp / hero.need * 100, 0, 100)
    ui.hud = {
      who: `${isSpecializationId(s.heroId) ? HERO_DEFINITIONS[s.heroId].label : JOB[s.choice].label} · LV.${hero.level}`,
      hpPct: minmax(hero.hp / hero.max * 100, 0, 100),
      heroCriticalVersion: healthCriticalVersion(hero),
      hpLabel: `生命 ${Math.ceil(hero.hp)} / ${hero.max}`,
      xpPct,
      kill: s.kill,
      combo: s.killStreak.current > 1 ? { count: s.killStreak.current } : undefined,
      timer: `${pad2(Math.floor(s.time / 60))}:${pad2(Math.floor(s.time % 60))}`,
      bossPct: boss ? Math.max(0, boss.hp / boss.max * 100) : null,
      bossCriticalVersion: boss ? healthCriticalVersion(boss) : 0,
      sceneTitle,
      quest: boss ? `最終決戰 · ${sc.name}` : sceneTitle,
      skills: equippedSkillHud(hero, contentRegistry, s),
    }
    ui.heroSpecial = heroSpecialization?.snapshot() ?? null
    ui.objectiveProgress = objectiveRuntime?.snapshot() ?? null
    ui.worldEventMarkers = worldEvents?.director.active ?? []
  }

  function offerUpgrades(): void {
    const choices = pickUpgrades(s.hero ?? undefined, random, contentRegistry, s)
    if (!choices.length) {
      s.levelQueue = 0
      screen('play')
      message('所有祝福已達到最高等級')
      return
    }
    ui.upgrades = choices
    screen('level')
    audio.playSfx('level')
  }

  function end(win: boolean): void {
    if (s.mode === 'result' || ending) return
    // Objective modes never accept a forged timed-boss victory.
    if (objectiveRuntime && win && objectiveRuntime.snapshot().status !== 'victory') return
    ending = true
    if (!win && objectiveRuntime?.snapshot().status === 'active') {
      if (s.hero && s.hero.hp <= 0) objectiveRuntime.heroDefeated(s.hero)
      else objectiveRuntime.withdraw()
    }
    hooks.content?.(s, { type: 'run-complete', win })
    const h = s.hero
    const stats: RunStats = {
      id: runReceiptId ?? `unsettled-${++runSequence}`,
      mode: s.runMode, hero: s.choice,
      specializationId: isSpecializationId(s.heroId) ? s.heroId : undefined,
      victory: win, seconds: Math.floor(s.time),
      bestKillStreak: s.killStreak.best, bestMultiKill: s.killStreak.bestBurst,
      xpEarned: Math.round(s.combatTelemetry.xpEarned), firstUpgradeSeconds: s.combatTelemetry.firstUpgradeAt ?? undefined,
      kills: s.kill, level: h?.level ?? 1, remainingHp: Math.max(0, Math.ceil(h?.hp ?? 0)),
      damageDealt: Math.round(s.damageDealt), damageTaken: Math.round(s.damageTaken),
      bossDefeated: s.bossDefeated, enemies: { ...s.defeatedTypes },
      abilities: [
        ...(Object.keys(h?.skills ?? {}) as UpgradeId[]),
        ...(Object.keys(s.content.levels) as ContentId[]),
        ...(Object.entries(h?.evolutions ?? {}).filter(([, active]) => active).map(([id]) => id as EvolutionId)),
      ],
    }
    ui.runResult = stats
    let saveWarning = ''
    if (metaStore) {
      const before = metaStore.get()
      const settled = runReceiptId && before.status === 'ready'
        ? metaStore.settle({
          stats,
          modeId: isObjectiveModeId(stats.mode) ? 'modes:' + stats.mode : stats.mode,
          heroId: stats.specializationId ? 'heroes:' + stats.specializationId : stats.hero,
          relicIds: inventorySnapshot(s).items.map(item => item.id),
        }) : null
      const previousCosmetics = new Set(before.state?.cosmetics ?? [])
      ui.rewards = {
        embers: settled?.ok ? settled.rewards.reduce((sum, reward) => sum + reward.embers, 0) : 0,
        newAchievements: settled?.ok
          ? settled.rewards.filter(reward => reward.type === 'achievement').map(reward => reward.id) : [],
        newCosmetics: settled?.ok && settled.state
          ? settled.state.cosmetics.filter(id => !previousCosmetics.has(id) &&
            (id === 'knight-gilded' || id === 'ranger-moonlit' || id === 'wizard-astral')) as CosmeticId[] : [],
      }
      if (!settled?.ok) saveWarning = ' · ⚠ 儲存未確認，未發放永久獎勵'
    } else {
      ui.rewards = profileStore.recordRun(stats)
    }
    refreshMeta()
    audio.setResultTheme?.(win ? 'victory' : 'defeat')
    screen('result')
    es2Audio?.setScene(win ? 'victory' : 'defeat')
    audio.playSfx(win ? 'victory' : 'defeat')
    ui.ending = win ? '🏆 遠征勝利！' : '💀 冒險結束'
    ui.summary = `存活 ${Math.floor(s.time)} 秒 · 擊敗 ${s.kill} 隻魔物 · 等級 ${s.hero?.level ?? 1}` + saveWarning
    hud()
  }

  function selectHero(id: HeroId): void {
    if (s.mode !== 'menu' || !canSelectHero(id)) return
    applyHeroChoice(id)
    ui.heroId = s.heroId
    ui.choice = s.choice
    ui.heroSpecial = null
    saveSelection('eclipseSelectedHero', id)
    wakeAudio()
    audio.playSfx('select')
  }

  function start(): void {
    if (!walletReady()) return
    // Account changes at results must not rewrite a completed run. Restore only
    // when the player starts another run or returns to the menu.
    if (s.mode === 'result') syncMenuSelection()
    ending = false
    if (metaStore && typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const entropy = new Uint8Array(16)
      crypto.getRandomValues(entropy)
      runReceiptId = Array.from(entropy, byte => byte.toString(16).padStart(2, '0')).join('')
    } else {
      runReceiptId = metaStore ? null : String(Date.now()) + '-' + String(++runSequence) + '-' + Math.random().toString(36).slice(2)
    }
    ui.worldEventChoice = null
    ui.worldEventMarkers = []
    resetRun(s)
    s.directorSeed = Math.floor(random() * 0x100000000)
    lastHapticAt = -Infinity
    factions?.reset()
    objectiveRuntime = isObjectiveModeId(ui.runMode)
      ? createObjectiveRuntime(ui.runMode, (_state, evaluation) => {
        if (s.mode === 'play') end(evaluation.status === 'victory')
      })
      : null
    if (objectiveRuntime) bossSequence = 0
    heroSpecialization = createHeroRosterAdapter(s, s.heroId, heroHooks, random)
    heroSpecialization?.reset()
    // Start decoding the GPU hero pass before the first Q, not on the cast frame.
    if (heroSpecialization) pixiVfx?.warm()
    hooks.content?.(s, { type: 'reset' })
    s.runMode = ui.runMode
    s.cosmetic = displayProfile().equippedCosmetics[s.choice]
    const saved = metaStore?.get()
    const unlocked = saved?.status === 'ready' ? saved.state : null
    const permanent = metaStore
      ? { power: unlocked?.research.power ?? 0, vitality: unlocked?.research.vitality ?? 0 }
      : profileStore.get().upgrades
    if (s.hero) {
      s.hero.need = BALANCE.progression.initialXpByMode[s.runMode]
      const bonusHp = BALANCE.meta.research.vitality.benefitPerRank * permanent.vitality
      s.hero.damage *= 1 + BALANCE.meta.research.power.benefitPerRank * permanent.power
      s.hero.max += bonusHp
      s.hero.hp += bonusHp
      if (unlocked) {
        const bonuses = unlocked.bonuses
        const startBonuses = BALANCE.meta.startingBonuses
        s.xpGainMultiplier = 1 + (unlocked.research.insight ?? 0) * BALANCE.meta.research.insight.benefitPerRank
          + (bonuses.includes('ember-spark') ? startBonuses['ember-spark'].bonus : 0)
        s.pickupGainMultiplier = 1 + (unlocked.research.scavenging ?? 0) * BALANCE.meta.research.scavenging.benefitPerRank
          + (bonuses.includes('wanderer-kit') ? startBonuses['wanderer-kit'].bonus : 0)
        if (bonuses.includes('guardian-vow')) {
          const extra = Math.round(s.hero.max * startBonuses['guardian-vow'].bonus)
          s.hero.max += extra
          s.hero.hp += extra
        }
      }
    }
    ui.runResult = null
    ui.rewards = null
    ui.specialChoice = null
    keys = {}
    stick = { x: 0, y: 0 }
    audio.setCombatIntensity('calm')
    audio.setBossTheme?.(null)
    audio.setBossWarning?.(null)
    setAdaptiveScore(true) // before wake: never restart the overture
    wakeAudio()
    if (bosses) audio.prepareBossAttackAudio?.(bossIds[bossSequence % bossIds.length]!)
    screen('play')
    hooks.content?.(s, { type: 'start' })
    audio.playSfx('start')
    audio.resetBattleClock(0.06)
    message('幽暮之門已開啟')
    setScene(s, 0, false, hooks)
    spawnOpeningWave(s, factions ?? undefined)
    hud()
  }

  function chooseUpgrade(id: AbilityId): void {
    if (s.mode !== 'level' || !s.hero || ui.specialChoice || !ui.upgrades.some(up => up.id === id)) return
    const evolved = ui.upgrades.some(up => up.id === id && up.isEvolution)
    if (!applyUpgrade(s, id, hooks, contentRegistry)) return
    screen('play')
    if (s.levelQueue) offerUpgrades()
    if (!evolved) audio.playSfx('upgrade')
    hud()
  }

  function chooseTreasure(id: string): void {
    const offer = inventorySnapshot(s).pending
    if (!offer || s.mode !== 'level' || !ui.specialChoice ||
        !ui.specialChoice.items.some(item => item.id === id)) return
    if (!claimTreasure(s, offer.chestId, id as RelicId)) return
    ui.specialChoice = null
    const relic = RELIC_BY_ID.get(id as RelicId)!
    audio.playSfx('treasureClaim', TREASURE_AUDIO_TIERS.indexOf(relic.cursed ? 'cursed' : relic.rarity))
    message('✦ 已獲得聖物：' + relic.title)
    screen('play')
    if (s.hero) {
      const color = relic.cursed ? '#ef8db5' : relic.rarity === 'legendary' ? '#ffdb86' : relic.rarity === 'epic' ? '#c5a1ff' : '#8fc7ff'
      impact(s, s.hero.x, s.hero.y, relic.rarity === 'legendary' ? 160 : 96, color, .8)
      burst(s, s.hero.x, s.hero.y, color, relic.rarity === 'legendary' ? 24 : 12)
    }
    if (s.levelQueue) offerUpgrades()
    hud()
  }

  function cancelTreasure(): void {
    const offer = inventorySnapshot(s).pending
    if (!offer || s.mode !== 'level' || !ui.specialChoice || !declineTreasure(s, offer.chestId)) return
    ui.specialChoice = null
    screen('play')
    if (s.levelQueue) offerUpgrades()
    hud()
  }

  function togglePause(): void {
    if (s.mode === 'play') {
      audio.playSfx('pause')
      screen('paused')
    } else if (s.mode === 'paused') {
      wakeAudio()
      audio.playSfx('resume')
      audio.resetBattleClock(0.05)
      screen('play')
    }
  }

  function openSettings(): void {
    if (ui.settingsOpen) return
    resumeAfterSettings = s.mode === 'play'
    if (resumeAfterSettings) togglePause()
    ui.settingsOpen = true
  }

  function closeSettings(): void {
    if (!ui.settingsOpen) return
    ui.settingsOpen = false
    if (resumeAfterSettings && s.mode === 'paused') togglePause()
    resumeAfterSettings = false
  }

  function saveSetting(key: string, value: string): void {
    try { settingsStorage?.setItem(key, value) } catch { /* unavailable */ }
  }

  // Sound only after the transaction is accepted, never on a disabled/failed purchase.
  function finishPurchase(ok: boolean, reason: string): void {
    if (ok) {
      refreshMeta()
      audio.playSfx('upgrade')
    } else {
      message(reason)
      audio.playSfx('deny')
    }
  }

  function advance(dt: number): void {
    // Event choices are deliberate atomic transactions; gameplay cannot run
    // underneath the modal, even when the underlying screen is still 'play'.
    if (ui.worldEventChoice) return
    // Preserve gentle ambient life by default; keep the upgrade backdrop fully still when requested.
    s.worldClock += s.mode === 'play' || (s.mode === 'level' && ui.upgradeEffect === 'still') ? 0 : dt * 0.3
    if (s.mode !== 'play') return
    step(s, dt, moveVector(keys, stick), hooks, contentRegistry, bossAdapter, factions ?? undefined)
    if (s.mode !== 'play') return
    heroSpecialization?.tick(dt)
    if (heroSpecialization?.id === 'crimson-paladin' && s.hero && s.content.effects.length) {
      followHeroSpecialFx(s.content.effects, 'hero-crimson-paladin', s.hero.x, s.hero.y, heroSpecialization.snapshot().barrier > 0)
    }
    worldEvents?.tick()
    if (objectiveRuntime) {
      objectiveRuntime.tick(dt, true)
      if (s.mode !== 'play') return
      // The first scheduled boss is a real controller-owned actor. A registered
      // mob death, never a timer or a metadata-only ID, advances the objective.
      // Endless events only advance on a real, committed world interaction.
      const eventIndex = objectiveRuntime.plan().eventIndex
      if (eventIndex !== null && worldEvents) {
        const marker = worldEvents.director.active[0]
        if (marker) objectiveRuntime.registerEvent(eventIndex, marker)
      }
      const stage = objectiveRuntime.plan().bossStage
      const hero = s.hero
      if (stage !== null && hero && bosses) {
        const id = bossIds[(stage - 1) % bossIds.length]!
        const spawned = bosses.spawn(s, id, { x: hero.x + 245, y: hero.y }, hooks)
        if (spawned) {
          objectiveRuntime.spawnBoss(stage, spawned)
          hooks.message(`⚠ ${BOSS_DEFINITIONS[id].title} 降臨！`)
        }
      }
    }
    if (relicsEnabled && s.mode === 'play') tickRelicRecovery(s, dt)
    if (Math.floor(s.time * 4) !== Math.floor((s.time - dt) * 4)) {
      const liveBoss = s.mobs.find(m => m.type === 'boss' && m.hp > 0)
      const upcoming = arrivalWarning()
      audio.setBossWarning?.(upcoming?.seconds ?? null)
      if (liveBoss?.bossArtId) audio.prepareBossAttackAudio?.(liveBoss.bossArtId)
      else if (upcoming?.bossId && bosses) audio.prepareBossAttackAudio?.(upcoming.bossId)
      audio.setBossTheme?.(liveBoss ? (liveBoss.bossArtId ?? 'abyss-monarch') : null, liveBoss?.bossPhase ?? 1)
      const phase = liveBoss ? 'boss' : countLivingEnemies(s.mobs, factions?.runtime.enemies) >= 16 ? 'combat' : 'calm'
      audio.setCombatIntensity(phase)
      setAdaptiveScore(
        !(liveBoss && audio.setBossTheme) && !(upcoming && audio.setBossWarning),
      )
      es2Audio?.setScene(phase === 'boss' ? 'boss' : phase === 'combat' ? 'combat' : 'exploration')
    }
    if (toastTimer > 0) {
      toastTimer -= dt
      if (toastTimer <= 0) ui.toastVisible = false
    }
    if (Math.floor(s.time * 8) !== Math.floor((s.time - dt) * 8)) hud()
  }

  function openWorldEvent(id: string): boolean {
    if (s.mode !== 'play' || ui.settingsOpen || ui.worldEventChoice || !s.hero || !worldEvents) return false
    const marker = worldEvents.director.active.find(event => event.id === id)
    if (!marker) return false
    const dx = marker.x - s.hero.x
    const dy = marker.y - s.hero.y
    if (dx * dx + dy * dy > 64 * 64) {
      audio.playSfx('deny')
      return false
    }
    ui.worldEventChoice = { event: marker, options: worldEvents.options(id), feedback: null }
    audio.playSfx('scene')
    keys = {}
    stick = { x: 0, y: 0 }
    return true
  }

  function chooseWorldEvent(eventId: string, choiceId: string): void {
    if (!worldEvents || s.mode !== 'play' || !ui.worldEventChoice ||
        ui.worldEventChoice.event.id !== eventId) return
    const selected = ui.worldEventChoice.event
    const outcome = worldEvents.choose(eventId, choiceId)
    if (outcome === 'applied') {
      objectiveRuntime?.resolveEvent(selected, true)
      ui.worldEventChoice = null
      audio.playSfx('upgrade')
    } else {
      audio.playSfx('deny')
      const feedback = outcome === 'retry' ? '獎勵無法領取，請重新選擇'
        : outcome === 'out-of-range' ? '請靠近事件' : '目前無法選擇此項目'
      ui.worldEventChoice = { event: selected, options: worldEvents.options(eventId), feedback }
    }
    hud()
  }

  function closeWorldEvent(): void { ui.worldEventChoice = null }

  const testApi: TestApi = {
    get mode() { return s.mode },
    get enemies() { return s.mobs.length },
    get audio() { return audio.unlocked },
    get music() { return audio.musicOn },
    get time() { return s.time },
    level() { if (s.hero) addXp(s, s.hero.need, hooks) },
    prepareEvolution(id: EvolutionId) {
      if (!s.hero || s.mode !== 'play') return
      const evo = EVOLUTIONS.find(e => e.id === id)
      if (!evo) return
      for (const required of evo.requires) {
        s.hero.skills[required] = Math.max(3, s.hero.skills[required] ?? 0)
      }
      // Stable, visible targets for the capture harness; no game-rule changes.
      for (const [i, mob] of s.mobs.slice(0, 5).entries()) {
        mob.x = s.hero.x + 45 + i * 25
        mob.y = s.hero.y + (i % 2 ? 35 : -35)
        mob.speed = 0
        mob.dmg = 0
        mob.hp = mob.max = 3000
      }
      s.hero.attack = 1
      s.hero.hp = Math.min(s.hero.max, s.hero.hp)
      hud()
    },
    get hp() { return s.hero?.hp },
    previewLowHealth(percent: number) {
      const params = import.meta.env.DEV && typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search) : null
      if (params?.get('showcase') !== '1' || params.get('lowHpQa') !== '1' ||
          s.mode !== 'play' || !s.hero || !Number.isFinite(percent) || percent <= 0 || percent > 100) return
      s.hero.hp = s.hero.max * percent / 100
      s.hero.inv = Math.max(s.hero.inv, 20) // Keep automated real-canvas comparison stable.
      hud()
    },
    get active() { return s.hero != null },
    get sceneArtLoaded() { return !!art?.courtyard.complete && art.courtyard.naturalWidth > 0 },
    get animated() { return !!s.hero },
    get position() { return s.hero ? { x: s.hero.x, y: s.hero.y } : null },
    get velocity() { return s.hero ? { x: s.hero.vx, y: s.hero.vy } : null },
    get pose() { return actorPose(s.hero) },
    get attackAnimation() { return !!s.hero && s.hero.strike > 0 },
    get vfxCount() { return s.impactWaves.length + s.lightningFx.length + s.swipes.length + s.fx.length },
    get frames() { return frameDrawn },
    get pixiVfx() { return pixiVfx?.stats() },
    get scene() { return currentSceneInfo(s).name },
    get bossPreview() {
      const boss = bosses?.snapshot(s)
      return { id: boss?.id ?? null, phase: boss?.phase ?? null }
    },
    get bossAttackPreview() {
      const snapshot = bosses?.snapshot(s)
      return {
        id: snapshot?.telegraphs.find(warning => warning.stage === 'warning')?.attackId ?? null,
        activeImpacts: snapshot?.impacts?.length ?? 0,
      }
    },
    previewBiome(index: number) {
      if (window.location.search.indexOf('showcase=1') < 0 || s.mode !== 'play' ||
          !s.hero || !Number.isInteger(index) || index < 0 || index > 3) return
      s.hero.x = 0; s.hero.y = 0; s.hero.hp = s.hero.max; s.hero.inv = 0; s.hero.need = 99999
      s.hero.attack = 0.45
      s.cam.x = 0; s.cam.y = 0
      s.time = index * SCENE_SECONDS + 2
      s.worldClock = s.time
      s.spawnT = 999; s.bossSpawned = true
      s.mobs = []; s.shots = []; s.enemyShots = []; s.stars = []; s.fx = []
      setScene(s, index, false, hooks)
      s.nextEventAt = Infinity
      for (let i = 0; i < 8; i++) spawnMob(s)
      trySpawnEvent(s, index % 2 ? 'shrine' : 'chest')
      hud()
    },
    prepareHeroArtEastAttack() {
      const hero = s.hero
      if (!import.meta.env.DEV || typeof window === 'undefined' ||
          new URLSearchParams(window.location.search).get('es2HeroArtQA') !== '1' ||
          s.mode !== 'play' || !hero || !isSpecializationId(s.heroId)) return false
      // Isolate a real target in this explicit QA scenario. No fabricated pose,
      // altered skill implementation, production cheat, or renderer override.
      s.mobs = []
      s.enemyShots = []
      factions?.reset()
      s.spawnT = 999
      spawnMob(s)
      const target = s.mobs[0]
      if (!target) return false
      // Ranged aim starts at the real weapon grip, not at ground contact.
      const grip = s.choice === 'knight' ? { x: 0, y: 0 } : getFiringOrigin(s.choice, 1)
      target.x = hero.x + Math.min(140, Math.max(64, hero.range * 0.75))
      target.y = hero.y + grip.y
      target.speed = 0
      hero.attack = 2
      hero.inv = 0
      attack(s, hooks, factions ?? undefined)
      return hero.strike > 0 && Math.abs(hero.aimAngle) < Math.PI / 8
    },
    forceAttack() {
      const hero = s.hero
      if (!hero) return
      hero.strike = 0.29
      s.swipes.push({ x: hero.x, y: hero.y, a: 0, life: 0.29, max: 0.29, r: 75 })
      impact(s, hero.x + 80, hero.y, 45)
    },
    showcaseBoss(phase: 1 | 2 | 3 = 1) {
      const hero = s.hero
      if (!hero || s.mode !== 'play' || ![1, 2, 3].includes(phase)) return
      // Only explicit Vite DEV art QA may select a specific real encounter.
      // Production gameplay and the original generic showcase remain unchanged.
      const params = import.meta.env.DEV && typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search) : null
      const requested = params?.get('showcase') === '1' ? params.get('es2BossArtQa') : null
      const qaBossId = requested && Object.hasOwn(BOSS_DEFINITIONS, requested)
        ? requested as BossId : null
      // The default camera follows the hero. Place QA actors inside the real
      // 236px visual bounds, including short landscape viewports.
      const bossOffsetX = qaBossId ? Math.min(165, s.W * 0.16) : 165
      const bossOffsetY = qaBossId && s.H < 500 ? Math.round(s.H * 0.4) : -8
      if (qaBossId) bosses?.reset(s)
      s.mobs = []
      s.enemyShots = []
      s.time = 96
      s.spawnT = 10000
      s.bossSpawned = true
      hero.inv = 120
      hero.attack = 10000
      if (qaBossId && bosses)
        bosses.spawn(s, qaBossId, { x: hero.x + bossOffsetX, y: hero.y + bossOffsetY }, hooks)
      else spawnMob(s, 'boss')
      const boss = s.mobs.find(e => e.type === 'boss')
      if (!boss) return
      boss.x = hero.x + bossOffsetX
      boss.y = hero.y + bossOffsetY
      boss.hp = boss.max * (phase === 1 ? 1 : phase === 2 ? 0.56 : 0.25)
      if (qaBossId && phase > 1) bosses?.tick(s, 1 / 60, hooks)
      s.cam.x = hero.x
      s.cam.y = hero.y
    },
  }

  function listen(win: Window = window): () => void {
    const doc = win.document
    const onKeyDown = (e: KeyboardEvent): void => {
      if (ui.settingsOpen) {
        if (e.code === 'Escape') { e.preventDefault(); closeSettings() }
        return
      }
      if ((s.mode === 'menu' && audio.musicOn) || s.mode === 'play') wakeAudio()
      if (s.mode === 'play' && PREVENT_DEFAULT_KEYS.includes(e.code)) e.preventDefault()
      if (s.mode === 'play') keys[e.code] = true
      if (e.repeat) return
      if (e.code === 'Space' && s.mode === 'play') heroDash(s, hooks)
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause()
      const n = upgradeKeyIndex(e.code)
      if (s.mode === 'level' && ui.specialChoice) {
        const choice = ui.specialChoice.items[n]
        if (choice) chooseTreasure(choice.id)
      } else {
        const pick = ui.upgrades[n]
        if (s.mode === 'level' && pick) chooseUpgrade(pick.id)
      }
    }
    const onKeyUp = (e: KeyboardEvent): void => { keys[e.code] = false }
    const onBlur = (): void => {
      // Release held controls without changing the player's pause state.
      keys = {}
      stick = { x: 0, y: 0 }
    }
    const onVisibility = (): void => {
      if (doc.hidden) {
        onBlur()
        if (es2Audio) es2Audio.interrupt()
        else audio.interrupt()
      }
    }
    const onPageHide = (): void => {
      onBlur()
      if (es2Audio) es2Audio.interrupt()
      else audio.interrupt()
    }
    const onPointerDown = (): void => { wakeAudio() }
    // Click covers touch, mouse and keyboard activation, including teleported dialogs.
    // Explicitly managed controls already play their semantic cue in the engine.
    const onUiClick = (e: MouseEvent): void => {
      if (!(e.target instanceof Element)) return
      const control = e.target.closest<HTMLElement>('button, [role="option"]')
      if (!control || (control instanceof HTMLButtonElement && control.disabled) ||
          control.getAttribute('aria-disabled') === 'true') return
      const cue = control.dataset.uiSfx
      if (cue === 'managed' || cue === 'silent') return
      if (e.detail === 0 || !audio.unlocked) wakeAudio()
      audio.playSfx(cue === 'select' || cue === 'scene' || cue === 'pause' ? cue : 'ui')
    }
    const onPointerOver = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse' || !(e.target instanceof Element)) return
      const button = e.target.closest<HTMLButtonElement>('button:not(:disabled)')
      if (!button || button.dataset.uiSfx === 'silent' ||
          (e.relatedTarget instanceof Node && button.contains(e.relatedTarget))) return
      audio.playSfx('hover')
    }
    win.addEventListener('keydown', onKeyDown)
    win.addEventListener('keyup', onKeyUp)
    win.addEventListener('blur', onBlur)
    win.addEventListener('pagehide', onPageHide)
    doc.addEventListener('visibilitychange', onVisibility)
    doc.addEventListener('pointerdown', onPointerDown)
    doc.addEventListener('click', onUiClick, true)
    doc.addEventListener('pointerover', onPointerOver)
    return () => {
      win.removeEventListener('keydown', onKeyDown)
      win.removeEventListener('keyup', onKeyUp)
      win.removeEventListener('blur', onBlur)
      win.removeEventListener('pagehide', onPageHide)
      doc.removeEventListener('visibilitychange', onVisibility)
      doc.removeEventListener('pointerdown', onPointerDown)
      doc.removeEventListener('click', onUiClick, true)
      doc.removeEventListener('pointerover', onPointerOver)
    }
  }

  function mount(canvas: HTMLCanvasElement, minimap: HTMLCanvasElement | null): () => void {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2D canvas context unavailable')
    const mini = minimap?.getContext('2d') ?? null
    art = loadArtwork()
    const assets: RenderAssets = createRenderAssets(art)
    assets.pixiVfx = pixiVfx = createPixiVfxBridge()
    assets.productionHeroes = loadProductionHeroes()
    const bossArtQaId = import.meta.env.DEV && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('es2BossArtQa') : null
    assets.productionWorld = loadWorldRuntimeImages(
      undefined, bossArtQaId && Object.hasOwn(BOSS_DEFINITIONS, bossArtQaId) ? bossArtQaId as BossId : undefined,
      import.meta.env.DEV && typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('es2BossMotionQa') === '3' ? 'native'
          : new URLSearchParams(window.location.search).get('es2BossMotionQa') === '2' ? 'sheet'
          : new URLSearchParams(window.location.search).get('es2BossMotionQa') === '1')
        : false,
    )
    if (factions) {
      assets.factions = factions
      assets.factionArtwork = loadProductionFactionArt()
    }
    if (contentRegistry.packs.some(pack => pack.effects?.length)) assets.content = contentRegistry
    if (bosses) assets.bosses = bosses
    assets.cameraShakeEnabled = () => ui.cameraShake
    assets.presentation = () => presentationPolicy
    let dpr = 1
    let last = 0
    let raf = 0
    const resize = (): void => {
      s.W = innerWidth
      s.H = innerHeight
      dpr = Math.min(devicePixelRatio || 1, presentationPolicy?.pixelRatioCap ?? 1.5)
      const width = Math.round(s.W * dpr)
      const height = Math.round(s.H * dpr)
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const frame = (t: number): void => {
      const dt = last ? Math.min((t - last) / 1000, 0.033) : 0
      last = t
      advance(dt)
      frameDrawn++
      drawFrame(ctx, s, dpr, assets)
      if (s.hero && mini && frameDrawn % 7 === 0) drawMiniMap(mini, s, assets)
      if (es2Audio && adaptiveScoreActive) es2Audio.tick(s.mode)
      else audio.tick(s.mode)
      raf = requestAnimationFrame(frame)
    }
    resizeRenderer = resize
    addEventListener('resize', resize)
    resize()
    const unlisten = listen()
    window.__test = testApi
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      assets.pixiVfx?.dispose()
      if (pixiVfx === assets.pixiVfx) pixiVfx = undefined
      resizeRenderer = () => {}
      removeEventListener('resize', resize)
      unlisten()
      delete window.__test
      es2Audio?.dispose()
      audio.dispose()
    }
  }

  const devShowcase = (): boolean => import.meta.env.DEV && typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('content-showcase') === '1'

  return {
    ...(!opts.profileStore && (!unlockedPlaytest || emulator) ? { cloudWallet: {
      select(uid: string | null) {
        if (s.mode !== 'menu' && s.mode !== 'result') return false
        if (uid === walletAccount) return true
        try {
          let profileStorage = uid ? scopedStorage(uid) : guestProfileStorage
          let metaStorage = uid ? profileStorage : guestMetaStorage
          if (uid && unlockedPlaytest) {
            let saved = unlockedAccounts.get(uid)
            if (!saved) {
              saved = { profile: createUnlockedPlaytestProfileStorage(), meta: createUnlockedPlaytestMetaStorage(0) }
              unlockedAccounts.set(uid, saved)
            }
            profileStorage = saved.profile
            metaStorage = saved.meta
          }
          const nextMeta = createMetaProgressionStore(metaStorage)
          if (uid && nextMeta.get().status !== 'ready') return false
          profileStore = createProfileStore(profileStorage)
          metaStore = nextMeta
          walletAccount = uid
          refreshMeta()
          if (s.mode === 'menu') syncMenuSelection()
          return true
        } catch { return false }
      },
      apply(wallet: CloudWallet, expectedBalance: number, preserveBalance: boolean) {
        if (!walletAccount || !metaStore) return false
        const result = metaStore.applyCloudWallet(wallet, expectedBalance, preserveBalance)
        refreshMeta()
        return result.ok
      },
    } } : {}),
    contentRegistry,
    setVisualPresentationPolicy(policy) { presentationPolicy = policy; resizeRenderer() },
    showcaseGrant(id) {
      if (!devShowcase() || s.mode !== 'play' || !s.hero) return false
      const ok = contentRegistry.acquire(s, id, hooks)
      if (ok) hud()
      return ok
    },
    showcaseEmit(event) { if (devShowcase() && s.mode === 'play') hooks.content?.(s, event) },
    ui,
    state: s,
    get bossArrivalWarning() { return arrivalWarning() },
    testApi,
    advance,
    listen,
    mount,
    enableMenuAudio() { if (s.mode === 'menu' && audio.musicOn) wakeAudio() },
    selectRunMode(mode: RunModeId) {
      if (s.mode !== 'menu' || !isRunModeId(mode)) return
      saveSelection('eclipseSelectedRunMode', mode)
      s.runMode = mode
      if (ui.runMode === mode) return
      ui.runMode = mode
      wakeAudio()
      audio.playSfx('select')
    },
    buyPermanentUpgrade(id: PermanentUpgrade) {
      if (s.mode !== 'menu' || !walletReady()) return
      if (metaStore) {
        finishPurchase(metaStore.purchaseResearch(id).ok, '永久研究未完成：儲存失敗或條件不足')
      } else {
        finishPurchase(profileStore.buyUpgrade(id), '餘燼不足或已達最高階')
      }
    },
    purchaseResearch(id: string) {
      if (s.mode !== 'menu' || !walletReady() || !metaStore) return
      finishPurchase(metaStore.purchaseResearch(id).ok, '研究未解鎖或儲存失敗')
    },
    purchaseEquipment(id: string) {
      if (s.mode !== 'menu' || !walletReady() || !metaStore) return
      finishPurchase(metaStore.purchaseEquipment(id).ok, '裝備未解鎖或儲存失敗')
    },
    purchaseBonus(id: string) {
      if (s.mode !== 'menu' || !walletReady() || !metaStore) return
      finishPurchase(metaStore.purchaseBonus(id).ok, '祝福未解鎖或儲存失敗')
    },
    selectCosmetic(hero: JobId, skin: CosmeticId) {
      if (s.mode !== 'menu') return
      if (metaStore) {
        const ok = metaStore.selectCosmetic(hero, skin).ok
        if (ok) { refreshMeta(); audio.playSfx('select') }
        else { message('造型尚未解鎖或儲存失敗'); audio.playSfx('deny') }
      } else {
        const ok = profileStore.selectCosmetic(hero, skin)
        if (ok) { refreshMeta(); audio.playSfx('select') }
        else audio.playSfx('deny')
      }
    },
    resetProgress() {
      if (s.mode !== 'menu' || !walletReady()) return
      if (metaStore && !metaStore.reset().ok) {
        message('永久資料無法安全重置，原有紀錄已保留')
        return
      }
      profileStore.reset()
      refreshMeta()
      audio.playSfx('scene')
    },
    selectJob(job: JobId) { selectHero(job) },
    selectHero,
    activateHeroSpecial() {
      if (s.mode !== 'play' || ui.settingsOpen || !heroSpecialization) return false
      const activated = heroSpecialization.activate()
      if (activated && s.hero) {
        markHeroSpecialAnimation(s.hero, s.worldClock)
        // Snapshot the authoritative cast position; a dash/movement cannot drag the effect.
        emitCombatVfx(effect => contentRegistry.addEffect(s, effect),
          `hero-${heroSpecialization.id}`, s.hero.x, s.hero.y, { targets: heroSpecialization.castTargets() })
      }
      if (activated) hud()
      return activated
    },
    start,
    openWorldEvent,
    chooseWorldEvent,
    closeWorldEvent,
    chooseUpgrade,
    chooseTreasure,
    cancelTreasure,
    togglePause,
    dash: () => heroDash(s, hooks),
    toggleMusic() {
      ui.musicOn = audio.toggleMusic(s.mode)
      ui.audioUnlocked = audio.unlocked
      ui.musicVolume = audio.musicVolume
    },
    toggleSfx() {
      ui.sfxOn = audio.toggleSfx()
      ui.audioUnlocked = audio.unlocked
      ui.sfxVolume = audio.sfxVolume
    },
    setMusicVolume(value) { audio.setMusicVolume(value); ui.musicVolume = audio.musicVolume },
    setSfxVolume(value) { audio.setSfxVolume(value); ui.sfxVolume = audio.sfxVolume },
    setUpgradeEffect(effect) {
      if (effect !== 'soft' && effect !== 'still') return
      ui.upgradeEffect = effect
      saveSetting('eclipseUpgradeEffect', effect)
    },
    setCameraShake(enabled) {
      ui.cameraShake = enabled
      saveSetting('eclipseCameraShake', enabled ? 'on' : 'off')
      if (!enabled) s.cameraKick = 0
    },
    openSettings,
    closeSettings,
    goMenu: () => {
      if (s.mode !== 'menu') audio.playSfx('scene')
      ui.worldEventChoice = null
      ui.worldEventMarkers = []
      worldEvents?.reset()
      heroSpecialization = null
      ui.heroSpecial = null
      syncMenuSelection()
      screen('menu')
    },
    setStick(v) { stick = v ?? { x: 0, y: 0 } },
  }
}

