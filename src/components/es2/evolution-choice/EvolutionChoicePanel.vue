<script setup lang="ts">
import { t } from '../../../i18n'
import { computed } from 'vue'
import type { ContentId, GameState } from '../../../game/types'
import { evolutionChoices, type EvolutionChoice } from './model'
import { animatedEs2ImageSrc, stillEs2ImageSrc } from '../../../game/ui-art'

const props = defineProps<{ state: GameState; active: boolean }>()
const emit = defineEmits<{ choose: [id: ContentId] }>()
const choices = computed(() => evolutionChoices(props.state))

function choose(choice: EvolutionChoice): void {
  if (props.active && choice.eligible) emit('choose', choice.id)
}
</script>

<template>
  <section v-if="active" class="es2-evolution-choices" :aria-label="t('神兵進化配方')">
    <header class="es2-evolution-head">
      <h2>{{ t("✦ 命運進化") }}</h2>
      <p>{{ t("將武器與被動技能提升至指定等級，即可解鎖傳說之力。") }}</p>
    </header>
    <ul class="es2-evolution-grid">
      <li v-for="choice in choices" :key="choice.id">
        <button type="button" class="es2-evolution-card"
          :class="{ 'is-ready': choice.eligible, 'is-unlocked': choice.unlocked }"
          :disabled="!choice.eligible"
          :aria-label="t(`${choice.title}：${choice.weaponTitle} ${choice.weaponLevel} / ${choice.requiredWeaponLevel}，${choice.passiveTitle} ${choice.passiveLevel} / ${choice.requiredPassiveLevel}`)"
          @click="choose(choice)">
          <span class="es2-evolution-icon" aria-hidden="true">
            <picture v-if="animatedEs2ImageSrc(choice.id)">
              <source media="(prefers-reduced-motion: reduce)" :srcset="stillEs2ImageSrc(choice.id)" />
              <img class="es2-evolution-art" :src="choice.eligible && !choice.unlocked ? animatedEs2ImageSrc(choice.id) : stillEs2ImageSrc(choice.id)"
                width="96" height="96" decoding="async" loading="lazy" draggable="false" alt="" />
            </picture>
            <template v-else>{{ choice.icon }}</template>
          </span>
          <span class="es2-evolution-title">{{ t(choice.title) }}</span>
          <span class="es2-evolution-desc">{{ t(choice.description) }}</span>
          <span class="es2-evolution-gates">
            <span>{{ choice.weaponTitle }} <strong>{{ choice.weaponLevel }} / {{ choice.requiredWeaponLevel }}</strong></span>
            <span>{{ choice.passiveTitle }} <strong>{{ choice.passiveLevel }} / {{ choice.requiredPassiveLevel }}</strong></span>
          </span>
          <span class="es2-evolution-status">{{ t(choice.unlocked ? '✓ 已解鎖' : choice.eligible ? '✦ 可進化' : '尚未達成條件') }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.es2-evolution-choices {
  color: #f8ebdd;
  max-height: min(75vh, 760px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
}
.es2-evolution-head { text-align: center; margin-bottom: 16px; }
.es2-evolution-head h2 { margin: 0 0 7px; font-size: 1.35rem; letter-spacing: .08em; color: #f9dfb0; }
.es2-evolution-head p { margin: 0; color: #cbbdb4; font-size: .86rem; }
.es2-evolution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.es2-evolution-card {
  width: 100%;
  height: 100%;
  min-height: 222px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 16px;
  border: 1px solid #7d6262;
  border-radius: 14px;
  background: linear-gradient(145deg, #302532, #15121e);
  color: inherit;
  text-align: center;
  font: inherit;
}
.es2-evolution-card:disabled { cursor: not-allowed; opacity: .72; }
.es2-evolution-card.is-ready {
  cursor: pointer;
  border-color: #eac782;
  box-shadow: inset 0 0 18px #e0ae5540;
}
.es2-evolution-card.is-ready:hover { background: #3c2c3e; }
.es2-evolution-card:focus-visible { outline: 3px solid #ffe8ab; outline-offset: 3px; }
.es2-evolution-card.is-unlocked { border-color: #9fbeaa; }
.es2-evolution-icon { font-size: 2rem; color: #f9dc9e; }
.es2-evolution-art { display: block; width: 96px; height: 96px; max-width: 100%; object-fit: contain; }
.es2-evolution-title { font-weight: 700; font-size: 1rem; }
.es2-evolution-desc { color: #e0d1c9; font-size: .78rem; line-height: 1.4; }
.es2-evolution-gates { display: grid; gap: 4px; width: 100%; margin-top: auto; font-size: .78rem; }
.es2-evolution-gates > span { display: flex; justify-content: space-between; gap: 8px; }
.es2-evolution-gates strong { color: #fce1a7; white-space: nowrap; }
.es2-evolution-status { color: #ffdda0; font-size: .8rem; }
@media (max-width: 480px) {
  .es2-evolution-choices { padding: 10px; }
  .es2-evolution-card { min-height: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .es2-evolution-card { transition: none; }
}

/* Premium art-first presentation: static gradients, no all-card compositing loop. */
.es2-evolution-card{
  position:relative;isolation:isolate;overflow:hidden;
  border:1.5px solid #a387b2;
  background:radial-gradient(ellipse 82% 60% at 50% 8%,#a66cce4a,transparent 74%),linear-gradient(155deg,#3d2b49,#1d1b30 73%,#141825);
  box-shadow:0 11px 24px #0009,inset 0 1px 0 #fff2;
  transition:border-color .17s ease,box-shadow .17s ease,background-color .17s ease;
}
.es2-evolution-card::before{
  content:'';position:absolute;inset:6px;pointer-events:none;
  border:1px solid #d7b7ff28;border-radius:10px;
}
.es2-evolution-icon{
  display:grid;place-items:center;
  position:relative;flex:none;width:clamp(96px,15vw,126px);height:clamp(96px,15vw,126px);
  border-radius:18px;border:1px solid #d6b6ee59;
  background:radial-gradient(circle at 50% 48%,#9d68c56e,transparent 70%),linear-gradient(145deg,#2c2542,#17152a);
  box-shadow:inset 0 1px 0 #ffe3ff36,0 4px 14px #0008;
}
.es2-evolution-icon::before{
  content:'';position:absolute;inset:13px;
  border:1px solid #e6bbf56a;border-radius:50%;
  pointer-events:none;transform:scaleY(.76);
}
.es2-evolution-icon picture{position:relative;z-index:1;width:100%;height:100%;display:grid;place-items:center}
.es2-evolution-art{
  width:100%;height:100%;max-width:100%;object-fit:contain;
  object-position:center;padding:5px;
}
.es2-evolution-title{
  color:#fff0d4;font-size:clamp(.99rem,1.3vw,1.13rem);font-weight:900;line-height:1.3;
  text-shadow:0 2px 6px #000a;
}
.es2-evolution-desc{color:#e5d5e8;font-size:.82rem;line-height:1.5}
.es2-evolution-gates{
  border-top:1px solid #d6b7dd40;padding-top:8px;gap:7px;
}
.es2-evolution-gates strong{font-variant-numeric:tabular-nums}
.es2-evolution-status{
  align-self:stretch;padding:7px 9px;border:1px solid #bc98c375;border-radius:8px;
  background:#1c172bba;font-size:.82rem;font-weight:800;
}
.es2-evolution-card:disabled{opacity:.88;filter:none}
.es2-evolution-card.is-ready{
  border-color:#ffe1a0;
  background:radial-gradient(ellipse 82% 60% at 50% 8%,#e4b65d56,transparent 74%),linear-gradient(155deg,#4b3445,#272139 73%,#151927);
  box-shadow:0 12px 28px #000b,0 0 0 1px #ffe1a04e,inset 0 1px 0 #fff4;
}
.es2-evolution-card.is-ready .es2-evolution-icon{border-color:#ffe1a0;box-shadow:0 0 16px #eabf7257,inset 0 1px 0 #fff6}
.es2-evolution-card.is-ready .es2-evolution-status{
  color:#ffedbe;background:#503c29;border-color:#f5d38d;
}
.es2-evolution-card.is-ready:hover{
  background:radial-gradient(ellipse 82% 60% at 50% 8%,#f3c77666,transparent 74%),linear-gradient(155deg,#533b4b,#272139);
  box-shadow:0 15px 29px #000b,0 0 17px #e9b65f55;
}
.es2-evolution-card.is-unlocked{border-color:#93c3af}
.es2-evolution-card:focus-visible{outline:3px solid #fff0bd;outline-offset:3px}
@media(max-width:610px){
  .es2-evolution-card{padding:12px;gap:7px}
  .es2-evolution-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,165px),1fr));gap:9px}
  .es2-evolution-icon{width:96px;height:96px}
}
@media(max-height:570px) and (orientation:landscape){
  .es2-evolution-card{min-height:0;padding:9px}
  .es2-evolution-icon{width:72px;height:72px}
}
@media(prefers-reduced-motion:reduce){
  .es2-evolution-card{transition:none}
  .es2-evolution-card.is-ready:hover{box-shadow:0 12px 28px #000b}
}
</style>
