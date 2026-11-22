<script setup lang="ts">
import Es2Dialog from './Es2Dialog.vue'
withDefaults(defineProps<{
  active: boolean; upgradeEffect: 'soft' | 'still'; cameraShake: boolean
  musicOn?: boolean; sfxOn?: boolean; musicVolume?: number; sfxVolume?: number
}>(), { musicOn: true, sfxOn: true, musicVolume: 100, sfxVolume: 100 })
const emit = defineEmits<{
  close: []; upgradeEffect: [value: 'soft' | 'still']; cameraShake: [value: boolean]
  musicVolume: [value: number]; sfxVolume: [value: number]; toggleMusic: []; toggleSfx: []
}>()
function volume(e: Event): number { return Number((e.target as HTMLInputElement).value) }
</script>
<template>
  <Es2Dialog :active="active" title="遊戲設定" subtitle="控制聲音、視覺效果與戰鬥體驗" @cancel="emit('close')">
    <div class="es2-settings">
      <section aria-label="音訊設定"><h3>音訊</h3>
        <div class="es2-slider-row"><button type="button" :aria-pressed="!musicOn" :aria-label="musicOn ? '將背景音樂靜音' : '開啟背景音樂'" @click="emit('toggleMusic')">{{ musicOn ? '♫' : '♪' }}</button>
          <label>背景音樂 <output>{{ musicVolume }}%</output><input type="range" min="0" max="100" :value="musicVolume" @input="emit('musicVolume', volume($event))" /></label>
        </div>
        <div class="es2-slider-row"><button type="button" :aria-pressed="!sfxOn" :aria-label="sfxOn ? '將遊戲音效靜音' : '開啟遊戲音效'" @click="emit('toggleSfx')">{{ sfxOn ? '♬' : '♩' }}</button>
          <label>戰鬥音效 <output>{{ sfxVolume }}%</output><input type="range" min="0" max="100" :value="sfxVolume" @input="emit('sfxVolume', volume($event))" /></label>
        </div>
      </section>
      <section aria-label="畫面與動態效果設定"><h3>畫面與動態</h3><p class="es2-hint">技能選擇畫面不觸發鏡頭震動；系統減少動態效果設定會優先套用。</p>
        <div class="es2-setting-option"><span>升級動態效果</span><div class="es2-toggle-set" role="group" aria-label="升級動態效果">
          <button type="button" :aria-pressed="upgradeEffect === 'soft'" @click="emit('upgradeEffect', 'soft')">柔和淡入</button>
          <button type="button" :aria-pressed="upgradeEffect === 'still'" @click="emit('upgradeEffect', 'still')">完全靜止</button>
        </div></div>
        <div class="es2-setting-option"><span>戰鬥時鏡頭震動</span><button type="button" class="es2-secondary" :aria-pressed="cameraShake" @click="emit('cameraShake', !cameraShake)">{{ cameraShake ? '已開啟' : '已關閉' }}</button></div>
      </section>
    </div>
    <template #actions><button class="es2-primary" type="button" @click="emit('close')">完成設定</button></template>
  </Es2Dialog>
</template>
