<script setup lang="ts">
import { t } from '../../../i18n'
import Es2Select from '../menu/Es2Select.vue'
import { computed } from 'vue'
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  updateAccessibilityPreferences,
  type AccessibilityPreferences,
  type QualitySetting,
  type VfxIntensity,
} from '../../../game/content/accessibility/preferences'
import { resolvePresentationPolicy } from '../../../game/content/accessibility/presentation'

const props = withDefaults(defineProps<{
  modelValue: Readonly<AccessibilityPreferences>
  disabled?: boolean
}>(), { disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: AccessibilityPreferences] }>()

const policy = computed(() => resolvePresentationPolicy(props.modelValue, {
  prefersReducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
}))

function update(changes: Partial<AccessibilityPreferences>): void {
  if (!props.disabled) emit('update:modelValue', updateAccessibilityPreferences(props.modelValue as AccessibilityPreferences, changes))
}
const sideOptions = computed(() => [
  { value: 'left', label: t('左側') }, { value: 'right', label: t('右側') },
])
const qualityOptions = computed(() => [
  { value: 'auto', label: t('自動') }, { value: 'low', label: t('低') },
  { value: 'medium', label: t('中') }, { value: 'high', label: t('高') },
])
const vfxOptions = computed(() => [
  { value: 'full', label: t('完整') }, { value: 'medium', label: t('中等') },
  { value: 'low', label: t('低') }, { value: 'off', label: t('關閉非必要特效') },
])
function selectQuality(value: string): void { update({ quality: value as QualitySetting }) }
function selectVfx(value: string): void { update({ vfxIntensity: value as VfxIntensity }) }
function selectSide(value: string): void { update({ joystickSide: value as 'left' | 'right' }) }
function updateNumber(field: 'touchScale' | 'interfaceScale' | 'joystickBottom', event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (field === 'touchScale') update({ touchScale: value })
  if (field === 'interfaceScale') update({ interfaceScale: value })
  if (field === 'joystickBottom') update({ joystickBottom: value })
}
function reset(): void { update({ ...DEFAULT_ACCESSIBILITY_PREFERENCES }) }
</script>

<template>
  <section class="es2-settings" :aria-label="t('手機操控與無障礙設定')" :aria-disabled="disabled">
    <header class="es2-settings-head">
      <div>
        <p class="es2-eyebrow">{{ t("MOBILE · ACCESSIBILITY") }}</p>
        <h3>{{ t("操控與畫面輔助") }}</h3>
        <p>{{ t("立即預覽變更；儲存由遊戲設定整合層處理。") }}</p>
      </div>
      <button type="button" class="es2-reset" :disabled="disabled" @click="reset">{{ t("回復預設") }}</button>
    </header>

    <div class="es2-options">
      <div class="es2-field">
        <label for="es2-side">{{ t("搖桿位置") }}</label>
        <Es2Select id="es2-side" :label="t('搖桿位置')" :model-value="modelValue.joystickSide"
          :options="sideOptions" :disabled="disabled" @update:model-value="selectSide" />
      </div>
      <div class="es2-field">
        <label for="es2-bottom">{{ t("離底部距離") }} <output>{{ modelValue.joystickBottom }}px</output></label>
        <input id="es2-bottom" type="range" min="0" max="120" step="2" :value="modelValue.joystickBottom" :disabled="disabled" @input="updateNumber('joystickBottom', $event)" />
      </div>
      <div class="es2-field">
        <label for="es2-touch-size">{{ t("觸控尺寸") }} <output>{{ Math.round(modelValue.touchScale * 100) }}%</output></label>
        <input id="es2-touch-size" type="range" min="0.85" max="1.35" step="0.05" :value="modelValue.touchScale" :disabled="disabled" @input="updateNumber('touchScale', $event)" />
      </div>
      <div class="es2-field">
        <label for="es2-interface-scale">{{ t("介面縮放") }} <output>{{ Math.round(modelValue.interfaceScale * 100) }}%</output></label>
        <input id="es2-interface-scale" data-testid="es2-ui-scale" type="range" min="0.85" max="1.25" step="0.05" :value="modelValue.interfaceScale" :disabled="disabled" @input="updateNumber('interfaceScale', $event)" />
      </div>
      <div class="es2-field">
        <label for="es2-quality">{{ t("畫質") }}</label>
        <Es2Select id="es2-quality" test-id="es2-quality" :label="t('畫質')"
          :model-value="modelValue.quality" :options="qualityOptions" :disabled="disabled"
          @update:model-value="selectQuality" />
      </div>
      <div class="es2-field">
        <label for="es2-vfx">{{ t("戰鬥特效強度") }}</label>
        <Es2Select id="es2-vfx" :label="t('戰鬥特效強度')" :model-value="modelValue.vfxIntensity"
          :options="vfxOptions" :disabled="disabled" @update:model-value="selectVfx" />
      </div>
    </div>

    <div class="es2-switches">
      <div class="es2-switch-row">
        <div><strong>{{ t("減少動態") }}</strong><small>{{ t("減少 UI 移動與過渡動畫") }}</small></div>
        <div class="es2-switch-group" role="group" :aria-label="t('減少動態')">
          <button data-testid="es2-motion" type="button" :disabled="disabled" :aria-pressed="modelValue.reducedMotion === 'on'" @click="update({ reducedMotion: modelValue.reducedMotion === 'on' ? 'off' : 'on' })">{{ t(modelValue.reducedMotion === 'on' ? '開啟' : '關閉') }}</button>
          <button type="button" :disabled="disabled" :aria-pressed="modelValue.reducedMotion === 'system'" @click="update({ reducedMotion: 'system' })">{{ t("依系統") }}</button>
        </div>
      </div>
      <div class="es2-switch-row">
        <div><strong>{{ t("降低閃光") }}</strong><small>{{ t("避免頻繁閃爍；保留必要攻擊警示") }}</small></div>
        <button type="button" :aria-label="t('降低閃光')" :disabled="disabled" :aria-pressed="modelValue.reducedFlashing" @click="update({ reducedFlashing: !modelValue.reducedFlashing })">{{ t(modelValue.reducedFlashing ? '開啟' : '關閉') }}</button>
      </div>
      <div class="es2-switch-row">
        <div><strong>{{ t("色覺輔助") }}</strong><small>{{ t("以符號及文字區分狀態，不只靠顏色") }}</small></div>
        <button type="button" :aria-label="t('色覺輔助')" :disabled="disabled" :aria-pressed="modelValue.colorblindIndicators" @click="update({ colorblindIndicators: !modelValue.colorblindIndicators })">{{ t(modelValue.colorblindIndicators ? '開啟' : '關閉') }}</button>
      </div>
      <div class="es2-switch-row">
        <div><strong>{{ t("傷害數字") }}</strong><small>{{ t("顯示或隱藏戰鬥傷害浮字") }}</small></div>
        <button type="button" :aria-label="t('傷害數字')" :disabled="disabled" :aria-pressed="modelValue.showDamageNumbers" @click="update({ showDamageNumbers: !modelValue.showDamageNumbers })">{{ t(modelValue.showDamageNumbers ? '顯示' : '隱藏') }}</button>
      </div>
      <div class="es2-switch-row">
        <div><strong>{{ t("滿血時顯示怪物血條") }}</strong><small>{{ t("關閉時僅隱藏滿血怪物頭頂的血條；首領 HUD 保持顯示") }}</small></div>
        <button data-testid="es2-full-enemy-health-bars" type="button" :aria-label="t('滿血時顯示怪物血條')" :disabled="disabled" :aria-pressed="modelValue.showFullEnemyHealthBars" @click="update({ showFullEnemyHealthBars: !modelValue.showFullEnemyHealthBars })">{{ t(modelValue.showFullEnemyHealthBars ? '開啟' : '關閉') }}</button>
      </div>
    </div>

    <div data-testid="es2-preview" class="es2-preview" aria-live="polite" aria-atomic="true">
      <strong>{{ t("即時預覽 ·") }} {{ policy.quality.toUpperCase() }}</strong>
      <div class="es2-mobile-preview" :data-side="modelValue.joystickSide" :style="{ '--es2-mini-scale': modelValue.touchScale }" :aria-label="t('預覽左右控制鈕位置')">
        <span class="es2-mini-stick" aria-hidden="true">◎</span>
        <span class="es2-mini-dash" aria-hidden="true">✧</span>
      </div>
      <div class="es2-preview-demo" :style="{ fontSize: 'calc(14px * ' + modelValue.interfaceScale + ')' }">
        <span>♥ HP</span><span>✦ XP</span>
        <span v-if="modelValue.showDamageNumbers" class="es2-preview-damage">−24</span>
        <span v-if="modelValue.colorblindIndicators">{{ t("● 狀態正常") }}</span>
      </div>
      <small>{{ t("搖桿：") }}{{ t(modelValue.joystickSide === 'left' ? '左' : '右') }}{{ t("側 ·") }} {{ Math.round(modelValue.touchScale * 100) }}{{ t("%｜畫面動態：") }}{{ t(policy.reduceMotion ? '已減少' : '一般') }}</small>
    </div>
  </section>
</template>

<style scoped>
.es2-settings {
  width: 100%;
  min-width: 0;
  padding: 12px 0;
  color: #f6e8cd;
  text-align: left;
  font-family: system-ui, sans-serif;
}
.es2-settings-head { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
.es2-eyebrow { color: #d6b777; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; }
.es2-settings h3 { margin: 4px 0 8px; font: 700 18px/1.4 Georgia, serif; color: #ffe4ad; }
.es2-settings p, .es2-settings small { color: #b7c5cf; font-size: 12px; line-height: 1.5; }
.es2-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 18px; margin: 17px 0; }
.es2-field { display: flex; flex-direction: column; min-width: 0; gap: 7px; }
.es2-field label { color: #f1dfc0; font-size: 13px; font-weight: 650; }
.es2-field output { float: right; color: #ffdb97; font-variant-numeric: tabular-nums; }
.es2-field input[type="range"] { width: 100%; min-width: 0; color: #f9ebd3; accent-color: #e4bf7d; }
.es2-field input[type="range"] { min-height: 40px; cursor: pointer; touch-action: pan-x; }
.es2-switches { border-block: 1px solid #b7a17955; }
.es2-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; }
.es2-switch-row + .es2-switch-row { border-top: 1px solid #b7a17935; }
.es2-switch-row strong, .es2-switch-row small { display: block; }
.es2-switch-row strong { font-size: 13px; margin-bottom: 4px; }
.es2-switch-row small { max-width: 260px; }
.es2-switch-group { display: flex; flex: none; gap: 6px; }
.es2-settings button { min-height: 44px; border: 1px solid #a9997d; border-radius: 8px; padding: 8px 12px; background: #243345; color: #e5e6e7; font: 700 12px/1.3 system-ui, sans-serif; cursor: pointer; }
.es2-settings button[aria-pressed="true"] { border-color: #e9c98e; background: #534936; color: #fff0cc; box-shadow: inset 0 0 0 1px #f4c37c44; }
.es2-settings :is(button, input):focus-visible { outline: 3px solid #ffe3a6; outline-offset: 2px; }
.es2-settings :is(button, input):disabled { opacity: .5; cursor: not-allowed; }
.es2-reset { white-space: nowrap; }
.es2-preview { margin-top: 16px; padding: 12px 14px; border: 1px solid #d4b57a80; border-radius: 10px; background: linear-gradient(150deg, #28384b, #151d29); }
.es2-preview > strong { font-size: 12px; color: #ffe1ac; letter-spacing: .5px; }
.es2-mobile-preview { display: grid; grid-template-columns: 1fr 1fr; align-items: end; margin-top: 10px; gap: 20px; }
.es2-mobile-preview span { display: grid; place-items: center; border: 2px solid #dec28c; border-radius: 50%; background: #30475c; color: #f7e7c3; font-size: 21px; }
.es2-mini-stick { justify-self: start; grid-column: 1; grid-row: 1; width: calc(54px * var(--es2-mini-scale)); aspect-ratio: 1; }
.es2-mini-dash { justify-self: end; grid-column: 2; grid-row: 1; width: calc(40px * var(--es2-mini-scale)); aspect-ratio: 1; }
.es2-mobile-preview[data-side="right"] .es2-mini-stick { grid-column: 2; justify-self: end; }
.es2-mobile-preview[data-side="right"] .es2-mini-dash { grid-column: 1; justify-self: start; }
.es2-preview-demo { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
.es2-preview-demo span { padding: 5px 8px; border: 1px solid #c1b18b; background: #172638; border-radius: 5px; }
.es2-preview-demo .es2-preview-damage { color: #ffb89a; font-weight: 900; }
.es2-preview small { display: block; }
@media (max-width: 420px) {
  .es2-settings-head { flex-wrap: wrap; }
  .es2-options { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .es2-switch-row { align-items: flex-start; flex-direction: column; }
  .es2-switch-group { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  .es2-settings * { animation: none !important; transition: none !important; }
}
</style>
