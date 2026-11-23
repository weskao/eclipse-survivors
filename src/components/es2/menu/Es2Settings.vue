<script setup lang="ts">
import Es2Dialog from './Es2Dialog.vue'
import Es2Select from './Es2Select.vue'
import { currentLocale, setLocale, t } from '../../../i18n'
import AccessibilitySettings from '../accessibility/AccessibilitySettings.vue'
import type { AccessibilityPreferences } from '../../../game/content/accessibility/preferences'
withDefaults(defineProps<{
  active: boolean; upgradeEffect: 'soft' | 'still'; cameraShake: boolean
  musicOn?: boolean; sfxOn?: boolean; musicVolume?: number; sfxVolume?: number
  accessibilityPreferences?: AccessibilityPreferences
}>(), { musicOn: true, sfxOn: true, musicVolume: 100, sfxVolume: 100 })
const emit = defineEmits<{
  close: []; upgradeEffect: [value: 'soft' | 'still']; cameraShake: [value: boolean]
  musicVolume: [value: number]; sfxVolume: [value: number]; toggleMusic: []; toggleSfx: []
  accessibility: [next: AccessibilityPreferences]
}>()
const languageOptions = [
  { value: 'zh-TW', label: '繁體中文', lang: 'zh-TW' },
  { value: 'en', label: 'English', lang: 'en' },
]
function changeLanguage(value: string): void { setLocale(value) }
function volume(e: Event): number { return Number((e.target as HTMLInputElement).value) }
</script>
<template>
  <Es2Dialog :active="active" :title="t('遊戲設定')" :subtitle="t('控制聲音、視覺效果與戰鬥體驗')" @cancel="emit('close')">
    <div class="es2-settings">
      <section :aria-label="t('語言設定')">
        <h3>{{ t('語言') }}</h3>
        <div class="es2-language-row"><span>{{ t('介面語言') }}</span>
          <Es2Select id="es2-language" :label="t('介面語言')" :model-value="currentLocale"
            :options="languageOptions" @update:model-value="changeLanguage" />
        </div>
        <p class="es2-hint">{{ t('初次使用時依系統語言顯示；手動選擇後將記住此瀏覽器的偏好。') }}</p>
      </section>
      <section :aria-label="t('音訊設定')"><h3>{{ t('音訊') }}</h3>
        <div class="es2-slider-row"><button type="button" :aria-pressed="!musicOn" :aria-label="t(musicOn ? '將背景音樂靜音' : '開啟背景音樂')" @click="emit('toggleMusic')">{{ musicOn ? '♫' : '♪' }}</button>
          <label>{{ t('背景音樂') }} <output>{{ musicVolume }}%</output><input type="range" min="0" max="100" :value="musicVolume" @input="emit('musicVolume', volume($event))" /></label>
        </div>
        <div class="es2-slider-row"><button type="button" :aria-pressed="!sfxOn" :aria-label="t(sfxOn ? '將遊戲音效靜音' : '開啟遊戲音效')" @click="emit('toggleSfx')">{{ sfxOn ? '♬' : '♩' }}</button>
          <label>{{ t('戰鬥音效') }} <output>{{ sfxVolume }}%</output><input type="range" min="0" max="100" :value="sfxVolume" @input="emit('sfxVolume', volume($event))" /></label>
        </div>
      </section>
      <section  :aria-label="t('畫面與動態效果設定')"><h3>{{ t('畫面與動態') }}</h3><p class="es2-hint">{{ t('技能選擇畫面不觸發鏡頭震動；系統減少動態效果設定會優先套用。') }}</p>
        <div class="es2-setting-option"><span>{{ t('升級動態效果') }}</span><div class="es2-toggle-set" role="group" :aria-label="t('升級動態效果')">
          <button type="button" :aria-pressed="upgradeEffect === 'soft'" @click="emit('upgradeEffect', 'soft')">{{ t('柔和淡入') }}</button>
          <button type="button" :aria-pressed="upgradeEffect === 'still'" @click="emit('upgradeEffect', 'still')">{{ t('完全靜止') }}</button>
        </div></div>
        <div class="es2-setting-option"><span>{{ t('戰鬥時鏡頭震動') }}</span><button type="button" class="es2-secondary" :aria-pressed="cameraShake" @click="emit('cameraShake', !cameraShake)">{{ t(cameraShake ? '已開啟' : '已關閉') }}</button></div>
      </section>
      <AccessibilitySettings v-if="accessibilityPreferences" :model-value="accessibilityPreferences"
        @update:model-value="emit('accessibility', $event)" />
    </div>
    <template #actions><button class="es2-primary" type="button" @click="emit('close')">{{ t('完成設定') }}</button></template>
  </Es2Dialog>
</template>

<style scoped>
.es2-language-row { display: grid; grid-template-columns: minmax(0,1fr) minmax(155px,210px);
  align-items: center; gap: .65rem; margin: .65rem 0; }
@media (max-width: 420px) { .es2-language-row { grid-template-columns: minmax(0,1fr); } }
</style>
