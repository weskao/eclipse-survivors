<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { animatedSkillImageSrc, hasGeneratedSkillArt, skillImageSrc } from '../../../game/ui-art'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import type { AbilityId, HeroId, JobId, UpgradeDef } from '../../../game/types'
import type { AccessibilityPreferences } from '../../../game/content/accessibility/preferences'
import { emptyProfile } from '../../../meta/profile'
import type { MetaState } from '../../../game/content/meta/state'
import type { Profile, PermanentUpgrade, CosmeticId, RunModeId, RunRewards, RunStats } from '../../../meta/types'
import '../../../styles/es2/menu.css'
import Es2MainMenu from './Es2MainMenu.vue'
import Es2Archive from './Es2Archive.vue'
import Es2ChoiceDialog from './Es2ChoiceDialog.vue'
import Es2Result from './Es2Result.vue'
import Es2Settings from './Es2Settings.vue'
import Es2Message from './Es2Message.vue'
import Es2Loading from './Es2Loading.vue'
import { abilityChoiceId } from './model'
import type { MenuChoice, MenuView, RelicEntry } from './model'

const props = withDefaults(defineProps<{
  screen: 'menu' | 'level' | 'result' | 'hidden'
  choice: JobId; heroId?: HeroId; runMode: RunModeId; version: string
  profile?: Profile; metaState?: MetaState | null; metaStatus?: 'ready' | 'blocked' | null
  upgrades?: readonly UpgradeDef[]
  ending?: string; summary?: string; runResult?: RunStats | null; rewards?: RunRewards | null
  settingsOpen?: boolean; upgradeEffect?: 'soft' | 'still'; cameraShake?: boolean
  audioUnlocked?: boolean; musicOn?: boolean; sfxOn?: boolean
  musicVolume?: number; sfxVolume?: number
  accessibilityPreferences?: AccessibilityPreferences
  specialChoice?: { kind: 'evolution' | 'treasure'; items: readonly MenuChoice[] } | null
  relics?: readonly RelicEntry[]
  notification?: { title: string; message: string } | null
  loading?: { message?: string; hero?: JobId; progress?: number } | null
}>(), {
  upgrades: () => [], ending: '', summary: '', settingsOpen: false,
  upgradeEffect: 'soft', cameraShake: true, audioUnlocked: true,
  musicOn: true, sfxOn: true, musicVolume: 100, sfxVolume: 100,
})
const emit = defineEmits<{
  select: [job: JobId]; selectHero: [hero: HeroId]; mode: [mode: RunModeId]; start: []; choose: [id: AbilityId]
  specialChoose: [id: string]; specialCancel: []
  purchase: [upgrade: PermanentUpgrade]; cosmetic: [hero: JobId, skin: CosmeticId]
  research: [id: string]; equipment: [id: string]; bonus: [id: string]
  enableAudio: []; reset: []; again: []; home: []; settings: []; closeSettings: []
  upgradeEffect: [effect: 'soft' | 'still']; cameraShake: [enabled: boolean]
  musicVolume: [value: number]; sfxVolume: [value: number]
  toggleMusic: []; toggleSfx: []; dismissNotification: []
  accessibility: [next: AccessibilityPreferences]
}>()
const fallbackProfile = emptyProfile()
const currentProfile = computed(() => props.profile ?? fallbackProfile)
const archive = ref<MenuView>('main')
const resetOpen = ref(false)
watch(() => props.screen, screen => { if (screen !== 'menu') { archive.value = 'main'; resetOpen.value = false } })
const archiveActive = computed(() => props.screen === 'menu' && archive.value !== 'main' && !resetOpen.value && !props.settingsOpen && !props.notification && !props.loading)
const levelActive = computed(() => props.screen === 'level' && !props.specialChoice && !props.settingsOpen && !props.notification && !props.loading)
const specialActive = computed(() => !!props.specialChoice && !props.settingsOpen && !props.notification && !props.loading)
const levelCards = computed<MenuChoice[]>(() => props.upgrades.map(upgrade => {
  const native = !upgrade.id.includes(':')
  const stillSrc = native ? skillImageSrc(upgrade.id) : upgrade.iconSrc
  const movingSrc = native && hasGeneratedSkillArt(upgrade.id) ? animatedSkillImageSrc(upgrade.id) : stillSrc
  return {
    id: upgrade.id, title: upgrade.title, description: upgrade.desc, icon: upgrade.icon,
    imageSrc: props.upgradeEffect === 'still' ? stillSrc : movingSrc,
    reducedMotionSrc: stillSrc, rarity: upgrade.rarity, level: upgrade.level,
    maxLevel: upgrade.maxLevel, requirements: upgrade.requirements, evolution: upgrade.isEvolution,
  }
}))
const specialCards = computed(() => {
  const offer = props.specialChoice
  if (!offer || offer.kind !== 'treasure') return offer
  return { ...offer, items: offer.items.map(item => ({
    ...item,
    imageSrc: /cursed|curse/i.test(item.id) ? WORLD_ART.ui['treasure-cursed']
      : item.rarity === 'legendary' ? WORLD_ART.ui['treasure-legendary']
        : item.rarity === 'rare' || item.rarity === 'epic' ? WORLD_ART.ui['treasure-rare']
          : WORLD_ART.ui['treasure-common'],
  })) }
})
function chooseUpgrade(id: string): void {
  const valid = abilityChoiceId(id, props.upgrades)
  if (valid !== null) emit('choose', valid)
}
function navigate(view: MenuView): void { archive.value = view }
function confirmReset(): void { resetOpen.value = false; emit('reset') }
</script>
<template>
  <div class="es2-system" :class="{ 'es2-system-still': upgradeEffect === 'still' }">
    <Es2MainMenu v-if="screen === 'menu' && !loading" :choice="choice" :hero-id="heroId" :run-mode="runMode" :version="version"
      :profile="currentProfile" :needs-audio-unlock="musicOn && !audioUnlocked"
      @select="emit('select', $event)" @select-hero="emit('selectHero', $event)" @mode="emit('mode', $event)" @start="emit('start')"
      @navigate="navigate" @settings="emit('settings')" @enable-audio="emit('enableAudio')" />
    <Es2Archive :active="archiveActive" :view="archive === 'main' ? 'progression' : archive" :profile="currentProfile"
      :hero="choice" :relics="relics" :meta-state="metaState" :meta-status="metaStatus"
      @close="archive = 'main'" @navigate="navigate"
      @purchase="emit('purchase', $event)" @cosmetic="(hero, skin) => emit('cosmetic', hero, skin)"
      @research="emit('research', $event)" @equipment="emit('equipment', $event)"
      @bonus="emit('bonus', $event)" @reset="resetOpen = true" />
    <Es2ChoiceDialog :active="levelActive" kind="level" :items="levelCards" :still="upgradeEffect === 'still'"
      @choose="chooseUpgrade" @settings="emit('settings')" />
    <Es2ChoiceDialog v-if="specialCards" :active="specialActive" :kind="specialCards.kind" :items="specialCards.items"
      :still="upgradeEffect === 'still'" @choose="emit('specialChoose', $event)" @cancel="emit('specialCancel')" />
    <Es2Result :active="screen === 'result' && !settingsOpen && !notification && !loading" :ending="ending"
      :summary="summary" :result="runResult" :rewards="rewards" @again="emit('again')" @home="emit('home')" />
    <Es2Message :active="resetOpen && !settingsOpen" kind="confirmation" title="重置所有遠征紀錄？"
      message="成就、餘燼、戰績、造型及永久升級將全部刪除。" confirm-label="永久刪除" destructive
      @confirm="confirmReset" @cancel="resetOpen = false" />
    <Es2Message :active="!!notification && !settingsOpen" kind="notification"
      :title="notification?.title ?? ''" :message="notification?.message ?? ''"
      @confirm="emit('dismissNotification')" @cancel="emit('dismissNotification')" />
    <Es2Settings :active="settingsOpen && !loading" :upgrade-effect="upgradeEffect" :camera-shake="cameraShake"
      :music-on="musicOn" :sfx-on="sfxOn" :music-volume="musicVolume" :sfx-volume="sfxVolume"
      :accessibility-preferences="accessibilityPreferences"
      @close="emit('closeSettings')" @upgrade-effect="emit('upgradeEffect', $event)"
      @camera-shake="emit('cameraShake', $event)" @toggle-music="emit('toggleMusic')" @toggle-sfx="emit('toggleSfx')"
      @music-volume="emit('musicVolume', $event)" @sfx-volume="emit('sfxVolume', $event)"
      @accessibility="emit('accessibility', $event)" />
    <Es2Loading :active="!!loading" :message="loading?.message" :hero="loading?.hero" :progress="loading?.progress" />
  </div>
</template>
