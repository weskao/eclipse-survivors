import { shallowReactive } from 'vue'
import { createProfileStore, type ProfileStore } from '../meta/profile'
import { getMode, isObjectiveModeId } from '../meta/modes'
import type { RunStats, RunModeId, PermanentUpgrade, CosmeticId } from '../meta/types'
import { loadArtwork, BGM_URL, type Artwork } from './art'
import { createAudioSystem } from './audio/engine'
import { createEs2AudioAdapter } from './audio/es2/adapter'
import type { AudioSystem } from './audio/types'
import { dash as heroDash, hit } from './combat'
import { JOB, SCENE_SECONDS } from './constants'
import { createContentRegistry, type ContentRegistry } from './content/registry'
import { createHeroRosterAdapter, HERO_DEFINITIONS, isSpecializationId, type HeroSpecializationAdapter } from './content/heroes'
import type { VisualPresentationPolicy } from './content/accessibility/presentation'
import { CONTENT_PACKS } from './content/packs'
import { BOSS_DEFINITIONS, type BossId } from './content/bosses/definitions'
import { createBossEncounterController } from './content/bosses/controller'
import { createBossEncounterPack } from './content/packs/bosses'
import { createObjectiveRuntime, type ObjectiveRuntime } from './content/objectives/runtime'
import { createLiveWorldEvents, type LiveWorldEvents } from './content/world-events/runtime'
import { createMetaProgressionStore } from './content/meta/store'
import type { ContentPack } from './content/contracts'
import { RELIC_BY_ID, type RelicId } from './content/relics/catalog'
import { calculateRelicAttack, calculateRelicIncoming, claimTreasure, declineTreasure, inventorySnapshot, openTreasure, relicBonuses, tickRelicRecovery } from './content/relics/runtime'
import { trySpawnEvent } from './events'
import { impact } from './fx'
import { EVOLUTIONS } from './evolutions'
import { moveVector, PREVENT_DEFAULT_KEYS, upgradeKeyIndex, type KeyState } from './input'
import { minmax, random } from './math'
import { addXp, applyUpgrade, pickUpgrades } from './progression'
import { createRenderAssets, drawFrame, drawMiniMap, type RenderAssets } from './render'
import { createFactionBridge } from './content/enemies/integration'
import { ENEMY_DEFINITIONS, type FactionKind } from './content/enemies/definitions'
import { loadProductionFactionArt } from './render/es2/production-factions'
import { loadProductionHeroes } from './render/es2/production-heroes'
import { loadWorldRuntimeImages } from './render/es2/production-world'
import { setScene } from './scene'
import { spawnMob } from './spawn'
import { actorPose, createState, currentSceneInfo, resetRun, type Pose } from './state'
import { step } from './step'
import { emptyHud, equippedSkillHud, type GameCommands, type UiState } from './store'
import type { AbilityId, ContentEvent, ContentId, EvolutionId, GameHooks, GameMode, GameState, HeroId, JobId, MoveInput, Point, UpgradeId } from './types'

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
  readonly active: boolean
  readonly sceneArtLoaded: boolean
  readonly animated: boolean
  readonly position: Point | null
  readonly velocity: Point | null
  readonly pose: Pose
  readonly attackAnimation: boolean
  readonly vfxCount: number
  readonly frames: number
  readonly scene: string
  forceAttack(): void
  /** Browser-capture scenario, isolated from normal play. */
  showcaseBoss(phase?: 1 | 2 | 3): void
  /** Capture-only biome preview; requires ?showcase=1. */
  previewBiome(index: number): void
}

declare global {
  interface Window { __test?: TestApi }
}

export interface Engine extends GameCommands {
  readonly contentRegistry: ContentRegistry
  setVisualPresentationPolicy(policy: VisualPresentationPolicy): void
  /** Only active in development with ?content-showcase=1. */
  showcaseGrant(id: ContentId): boolean
  showcaseEmit(event: ContentEvent): void
  readonly ui: UiState
  readonly state: GameState
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
  const bosses = requestedPacks.some(pack => pack.id === 'bosses') ? createBossEncounterController() : null
  const contentRegistry = createContentRegistry(
    bosses ? requestedPacks.map(pack => pack.id === 'bosses' ? createBossEncounterPack(bosses) : pack) : requestedPacks,
    random,
  )
  const bossIds = Object.keys(BOSS_DEFINITIONS) as BossId[]
  const factionIds = Object.keys(ENEMY_DEFINITIONS) as FactionKind[]
  const factions = requestedPacks.some(pack => pack.id === 'factions') ? createFactionBridge({ random }) : null
  let factionSequence = 0
  let factionWindow = 0
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
  const profileStore = opts.profileStore ?? createProfileStore()
  // Injected legacy stores are retained for existing compatibility tests.
  // In production the v3 writer owns all currency and run settlements.
  const metaStore = opts.profileStore ? null : createMetaProgressionStore()
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
  const audio = opts.audio ?? createAudioSystem({
    bgm: createBgm(BGM_URL),
    menuBgm: createBgm(`${import.meta.env.BASE_URL}audio/eclipse-overture.wav`),
  })
  // The original audio owner provides the context and buses. Never start a second BGM.
  // Older injected AudioSystem fakes retain their original behaviour unchanged.
  const es2Port = audio.createEs2Port?.()
  const es2Audio = es2Port && audio.setExternalScoreActive
    ? createEs2AudioAdapter({
      audio, ...es2Port,
      tone: (...args) => {
        try { es2Port.tone(...args) }
        catch (error) {
          // The adapter falls back to legacy scheduling after any synthesis failure.
          audio.setExternalScoreActive?.(false)
          throw error
        }
      },
    }) : null
  if (es2Audio) audio.setExternalScoreActive?.(true)
  const settingsStorage = (() => { try { return localStorage } catch { return null } })()
  let initialEffect: 'soft' | 'still' = 'soft'
  let initialShake = true
  try {
    if (settingsStorage?.getItem('eclipseUpgradeEffect') === 'still') initialEffect = 'still'
    if (settingsStorage?.getItem('eclipseCameraShake') === 'off') initialShake = false
  } catch { /* private browsing may block settings */ }
  const ui = shallowReactive<UiState>({
    mode: 'menu', choice: s.choice, heroId: s.heroId, heroSpecial: null, musicOn: audio.musicOn, audioUnlocked: audio.unlocked, sfxOn: audio.sfxOn,
    musicVolume: audio.musicVolume, sfxVolume: audio.sfxVolume,
    settingsOpen: false, upgradeEffect: initialEffect, cameraShake: initialShake, hud: emptyHud(),
    upgrades: [], specialChoice: null, toastText: '', toastVisible: false, ending: '冒險結束', summary: '', coarsePointer: false,
    runMode: 'quick', objectiveProgress: null, worldEventMarkers: [], worldEventChoice: null,
    profile: displayProfile(), metaState: metaStore?.get().state ?? null,
    metaStatus: metaStore?.get().status ?? null, runResult: null, rewards: null,
  })
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
  let presentationPolicy: VisualPresentationPolicy | null = null
  let resizeRenderer: () => void = () => {}
  let art: Artwork | null = null
  let heroSpecialization: HeroSpecializationAdapter | null = null
  let objectiveRuntime: ObjectiveRuntime | null = null
  let worldEvents: LiveWorldEvents | null = null
  let ending = false

  function wakeAudio(): void {
    if (es2Audio) es2Audio.wakeFromGesture()
    else audio.wake()
    ui.audioUnlocked = audio.unlocked
  }

  const hooks: GameHooks = {
    sfx: cue => audio.playSfx(cue),
    message,
    offerUpgrades,
    end,
    modifyOutgoingDamage: (amount, target) => {
      const modified = heroSpecialization?.modifyOutgoingDamage(amount) ?? amount
      if (!relicsEnabled || !s.hero || s.mode !== 'play' || modified <= 0) return modified
      const result = calculateRelicAttack(s, modified, {
        moving: s.hero.moveAmount > 0,
        boss: target?.type === 'boss',
        targetHp: target?.hp,
        targetHpFraction: target && target.max > 0 ? target.hp / target.max : undefined,
      }, random)
      return result.execute && target ? Math.max(result.damage, target.hp) : result.damage
    },
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
        hit(s, source, amount * reflect, { ...hooks, modifyOutgoingDamage: undefined })
      }
    },
    canTargetHero: () => heroSpecialization?.canBeTargeted() ?? true,
    // Skip all event-object allocation in the default empty-pack game.
    content: contentRegistry.packs.some(pack => pack.onEvent)
      ? (state, event) => {
        contentRegistry.emit(state, event, hooks)
        if (state === s) worldEvents?.onContentEvent(event)
        // Only an actual finalized kill can advance an objective. The existing
        // boss controller gets first chance to account for its original XP/reward.
        if (state === s && event.type === 'kill' && objectiveRuntime) {
          const accepted = objectiveRuntime.defeatMob(event.mob)
          if (accepted && event.mob.type === 'boss') bosses?.reset(state)
        }
      }
      : undefined,
    openTreasure: relicsEnabled ? (state, chestId) => {
      const offer = openTreasure(state, chestId, random)
      if (!offer) return false
      ui.specialChoice = { kind: 'treasure', items: offer.options.map(id => {
        const relic = RELIC_BY_ID.get(id)!
        return { id, title: relic.title, description: relic.description, icon: relic.icon, rarity: relic.rarity }
      }) }
      ui.upgrades = []
      screen('level')
      return true
    } : undefined,
  }

  // All 12 world events use the existing HP/XP, relic and combat writers.
  // The adapter owns the per-run transaction ledger, never another game loop.
  worldEvents = createLiveWorldEvents(s, hooks, { random })

  // Special attacks and companion hits already own their damage; do not apply the normal
  // attack critical/modifier hook a second time when they call legacy hit().
  const heroHooks: GameHooks = {
    ...hooks, modifyOutgoingDamage: undefined, mitigateIncomingDamage: undefined, afterDamage: undefined,
  }

  function screen(name: GameMode): void {
    // A level-up freezes gameplay: discard pending hit recoil before the picker opens.
    if (name === 'level') s.cameraKick = 0
    s.mode = name
    ui.mode = name
    ui.coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches
    audio.onScreen(name)
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
    const boss = s.mobs.find(e => e.type === 'boss' && e.hp > 0)
    const xpPct = minmax(hero.xp / hero.need * 100, 0, 100)
    ui.hud = {
      who: `${isSpecializationId(s.heroId) ? HERO_DEFINITIONS[s.heroId].label : JOB[s.choice].label} · LV.${hero.level}`,
      hpPct: minmax(hero.hp / hero.max * 100, 0, 100),
      hpLabel: `生命 ${Math.ceil(hero.hp)} / ${hero.max}`,
      xpPct,
      kill: s.kill,
      timer: `${pad2(Math.floor(s.time / 60))}:${pad2(Math.floor(s.time % 60))}`,
      bossPct: boss ? Math.max(0, boss.hp / boss.max * 100) : null,
      quest: boss ? `最終決戰 · ${sc.name}` : `${sc.name} · ${sc.label}`,
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
    screen('result')
    es2Audio?.setScene(win ? 'victory' : 'defeat')
    audio.playSfx(win ? 'victory' : 'defeat')
    ui.ending = win ? '🏆 遠征勝利！' : '💀 冒險結束'
    ui.summary = `存活 ${Math.floor(s.time)} 秒 · 擊敗 ${s.kill} 隻魔物 · 等級 ${s.hero?.level ?? 1}` + saveWarning
    hud()
  }

  function selectHero(id: HeroId): void {
    if (s.mode !== 'menu' || ( !isSpecializationId(id) && !Object.prototype.hasOwnProperty.call(JOB, id))) return
    const fallback = isSpecializationId(id) ? HERO_DEFINITIONS[id].legacyArtJob : id as JobId
    s.heroId = id
    ui.heroId = id
    s.choice = fallback
    ui.choice = fallback
    s.cosmetic = displayProfile().equippedCosmetics[fallback]
    ui.heroSpecial = null
    wakeAudio()
    audio.playSfx('select')
  }

  function start(): void {
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
    factions?.reset()
    factionSequence = 0
    factionWindow = 0
    objectiveRuntime = isObjectiveModeId(ui.runMode)
      ? createObjectiveRuntime(ui.runMode, (_state, evaluation) => {
        if (s.mode === 'play') end(evaluation.status === 'victory')
      })
      : null
    if (objectiveRuntime) bossSequence = 0
    heroSpecialization = createHeroRosterAdapter(s, s.heroId, heroHooks, random)
    heroSpecialization?.reset()
    hooks.content?.(s, { type: 'reset' })
    s.runMode = ui.runMode
    s.cosmetic = displayProfile().equippedCosmetics[s.choice]
    const saved = metaStore?.get()
    const permanent = metaStore
      ? (saved?.status === 'ready' && saved.state
        ? { power: saved.state.research.power ?? 0, vitality: saved.state.research.vitality ?? 0 }
        : { power: 0, vitality: 0 })
      : profileStore.get().upgrades
    if (s.hero) {
      s.hero.damage *= 1 + 0.04 * permanent.power
      s.hero.max += 12 * permanent.vitality
      s.hero.hp += 12 * permanent.vitality
    }
    ui.runResult = null
    ui.rewards = null
    ui.specialChoice = null
    keys = {}
    stick = { x: 0, y: 0 }
    audio.setCombatIntensity('calm')
    wakeAudio()
    screen('play')
    hooks.content?.(s, { type: 'start' })
    audio.playSfx('start')
    audio.resetBattleClock(0.06)
    message('幽暮之門已開啟')
    setScene(s, 0, false, hooks)
    for (let i = 0; i < 12; i++) spawnMob(s)
    if (factions && s.hero) {
      for (let i = 0; i < 4 && factions.availableSpawnSlots(s) > 0; i++) {
        const theta = i * Math.PI / 2
        factions.spawn(s, factionIds[factionSequence++ % factionIds.length]!,
          s.hero.x + Math.cos(theta) * 320, s.hero.y + Math.sin(theta) * 230)
      }
    }
    hud()
  }

  function chooseUpgrade(id: AbilityId): void {
    if (s.mode !== 'level' || !s.hero || ui.specialChoice || !ui.upgrades.some(up => up.id === id)) return
    if (!applyUpgrade(s, id, hooks, contentRegistry)) return
    screen('play')
    if (s.levelQueue) offerUpgrades()
    audio.playSfx('upgrade')
    hud()
  }

  function chooseTreasure(id: string): void {
    const offer = inventorySnapshot(s).pending
    if (!offer || s.mode !== 'level' || !ui.specialChoice ||
        !ui.specialChoice.items.some(item => item.id === id)) return
    if (!claimTreasure(s, offer.chestId, id as RelicId)) return
    ui.specialChoice = null
    audio.playSfx('upgrade')
    message('✦ 已獲得聖物：' + RELIC_BY_ID.get(id as RelicId)!.title)
    screen('play')
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

  function advance(dt: number): void {
    // Event choices are deliberate atomic transactions; gameplay cannot run
    // underneath the modal, even when the underlying screen is still 'play'.
    if (ui.worldEventChoice) return
    // Preserve gentle ambient life by default; keep the upgrade backdrop fully still when requested.
    s.worldClock += s.mode === 'play' || (s.mode === 'level' && ui.upgradeEffect === 'still') ? 0 : dt * 0.3
    if (s.mode !== 'play') return
    step(s, dt, moveVector(keys, stick), hooks, contentRegistry, bossAdapter, factions ?? undefined)
    if (factions && s.mode === 'play' && s.hero) {
      const window = Math.floor(s.time / 8)
      if (window > factionWindow) {
        factionWindow = window
        if (factions.availableSpawnSlots(s) > 0) {
          const theta = factionSequence * 2.399963229728653
          factions.spawn(s, factionIds[factionSequence++ % factionIds.length]!,
            s.hero.x + Math.cos(theta) * 315, s.hero.y + Math.sin(theta) * 230)
        }
      }
    }
    if (s.mode !== 'play') return
    heroSpecialization?.tick(dt)
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
      const bossAlive = s.mobs.some(m => m.type === 'boss' && m.hp > 0)
      const phase = bossAlive ? 'boss' : s.mobs.length >= 16 ? 'combat' : 'calm'
      audio.setCombatIntensity(phase)
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
    if (dx * dx + dy * dy > 64 * 64) return false
    ui.worldEventChoice = { event: marker, options: worldEvents.options(id), feedback: null }
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
    } else {
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
    get active() { return s.hero != null },
    get sceneArtLoaded() { return !!art?.courtyard.complete && art.courtyard.naturalWidth > 0 },
    get animated() { return !!s.hero },
    get position() { return s.hero ? { x: s.hero.x, y: s.hero.y } : null },
    get velocity() { return s.hero ? { x: s.hero.vx, y: s.hero.vy } : null },
    get pose() { return actorPose(s.hero) },
    get attackAnimation() { return !!s.hero && s.hero.strike > 0 },
    get vfxCount() { return s.impactWaves.length + s.lightningFx.length + s.swipes.length + s.fx.length },
    get frames() { return frameDrawn },
    get scene() { return currentSceneInfo(s).name },
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
    forceAttack() {
      const hero = s.hero
      if (!hero) return
      hero.strike = 0.29
      s.swipes.push({ x: hero.x, y: hero.y, a: 0, life: 0.29, max: 0.29, r: 75 })
      impact(s, hero.x + 80, hero.y, 45)
    },
    showcaseBoss(phase: 1 | 2 | 3 = 1) {
      const hero = s.hero
      if (!hero || s.mode !== 'play') return
      s.mobs = []
      s.enemyShots = []
      s.time = 96
      s.spawnT = 10000
      s.bossSpawned = true
      hero.inv = 120
      hero.attack = 10000
      spawnMob(s, 'boss')
      const boss = s.mobs.find(e => e.type === 'boss')
      if (!boss) return
      boss.x = hero.x + 165
      boss.y = hero.y - 8
      boss.hp = boss.max * (phase === 1 ? 1 : phase === 2 ? 0.56 : 0.25)
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
    const onPointerDown = (e: PointerEvent): void => {
      wakeAudio()
      if (e.target instanceof Element && e.target.closest('button')) audio.playSfx('ui')
    }
    const onPointerOver = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' && e.target instanceof Element && e.target.closest('button')) audio.playSfx('hover')
    }
    win.addEventListener('keydown', onKeyDown)
    win.addEventListener('keyup', onKeyUp)
    win.addEventListener('blur', onBlur)
    win.addEventListener('pagehide', onPageHide)
    doc.addEventListener('visibilitychange', onVisibility)
    doc.addEventListener('pointerdown', onPointerDown)
    doc.addEventListener('pointerover', onPointerOver)
    return () => {
      win.removeEventListener('keydown', onKeyDown)
      win.removeEventListener('keyup', onKeyUp)
      win.removeEventListener('blur', onBlur)
      win.removeEventListener('pagehide', onPageHide)
      doc.removeEventListener('visibilitychange', onVisibility)
      doc.removeEventListener('pointerdown', onPointerDown)
      doc.removeEventListener('pointerover', onPointerOver)
    }
  }

  function mount(canvas: HTMLCanvasElement, minimap: HTMLCanvasElement | null): () => void {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2D canvas context unavailable')
    const mini = minimap?.getContext('2d') ?? null
    art = loadArtwork()
    const assets: RenderAssets = createRenderAssets(art)
    assets.productionHeroes = loadProductionHeroes()
    assets.productionWorld = loadWorldRuntimeImages()
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
      if (es2Audio) es2Audio.tick(s.mode)
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
    testApi,
    advance,
    listen,
    mount,
    enableMenuAudio() { if (s.mode === 'menu' && audio.musicOn) wakeAudio() },
    selectRunMode(mode: RunModeId) { if (getMode(mode)) ui.runMode = mode },
    buyPermanentUpgrade(id: PermanentUpgrade) {
      if (s.mode !== 'menu') return
      if (metaStore) {
        const result = metaStore.purchaseResearch(id)
        if (!result.ok) message('永久研究未完成：儲存失敗或條件不足')
        else refreshMeta()
      } else if (profileStore.buyUpgrade(id)) refreshMeta()
    },
    purchaseResearch(id: string) {
      if (s.mode !== 'menu' || !metaStore) return
      if (metaStore.purchaseResearch(id).ok) refreshMeta()
      else message('研究未解鎖或儲存失敗')
    },
    purchaseEquipment(id: string) {
      if (s.mode !== 'menu' || !metaStore) return
      if (metaStore.purchaseEquipment(id).ok) refreshMeta()
      else message('裝備未解鎖或儲存失敗')
    },
    purchaseBonus(id: string) {
      if (s.mode !== 'menu' || !metaStore) return
      if (metaStore.purchaseBonus(id).ok) refreshMeta()
      else message('祝福未解鎖或儲存失敗')
    },
    selectCosmetic(hero: JobId, skin: CosmeticId) {
      if (s.mode !== 'menu') return
      if (metaStore) {
        if (metaStore.selectCosmetic(hero, skin).ok) refreshMeta()
        else message('造型尚未解鎖或儲存失敗')
      } else if (profileStore.selectCosmetic(hero, skin)) refreshMeta()
    },
    resetProgress() {
      if (s.mode !== 'menu') return
      if (metaStore && !metaStore.reset().ok) {
        message('永久資料無法安全重置，原有紀錄已保留')
        return
      }
      profileStore.reset()
      refreshMeta()
    },
    selectJob(job: JobId) { selectHero(job) },
    selectHero,
    activateHeroSpecial() {
      if (s.mode !== 'play' || ui.settingsOpen || !heroSpecialization) return false
      const activated = heroSpecialization.activate()
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
      ui.worldEventChoice = null
      ui.worldEventMarkers = []
      worldEvents?.reset()
      heroSpecialization = null
      ui.heroSpecial = null
      screen('menu')
    },
    setStick(v) { stick = v ?? { x: 0, y: 0 } },
  }
}

