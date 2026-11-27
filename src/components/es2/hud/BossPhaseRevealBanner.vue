<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../../../i18n'
import { BOSS_DEFINITIONS } from '../../../game/content/bosses/definitions'
import type { BossPhaseReveal } from '../../../game/store'
const props = defineProps<{ reveal: BossPhaseReveal }>()
const boss = computed(() => BOSS_DEFINITIONS[props.reveal.boss])
</script>

<template>
  <div class="es2-phase-reveal" data-boss-phase-reveal :data-phase="reveal.phase" :data-boss="reveal.boss"
    :style="{ '--phase-accent': boss.color }" role="status" aria-live="polite" aria-atomic="true">
    <div class="es2-phase-reveal__ornament" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="31" stroke="currentColor" stroke-dasharray="2 5"/>
        <path d="M36 5 67 36 36 67 5 36Z M36 15 57 36 36 57 15 36Z" stroke="currentColor"/>
        <path d="M36 0V12M36 60V72M0 36H12M60 36H72" stroke="currentColor" stroke-width="2"/>
      </svg>
      <b>{{ reveal.phase === 3 ? 'III' : 'II' }}</b>
    </div>
    <div class="es2-phase-reveal__copy">
      <span>{{ t(boss.title) }} · {{ reveal.phase === 3 ? t('最終階段') : t('第二階段') }}</span>
      <strong>{{ t(boss.phaseNames[reveal.phase - 1]) }}</strong>
      <div class="es2-phase-reveal__ranks" aria-hidden="true"><i v-for="rank in 3" :key="rank" :data-lit="rank <= reveal.phase"></i></div>
    </div>
    <div class="es2-phase-reveal__sweep" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
.es2-phase-reveal {
  position:absolute; top:calc(100% + 6px); left:50%; transform:translateX(-50%);
  width:min(100%, 370px); min-width:0; min-height:55px; display:flex; align-items:center;
  gap:10px; padding:6px 13px; color:var(--phase-accent); pointer-events:none; isolation:isolate;
  overflow:hidden; border:1px solid color-mix(in srgb,var(--phase-accent) 68%,#6e513d);
  border-radius:5px 14px 5px 14px; background:linear-gradient(115deg,#100e18f5,#141926f2 70%,#10121df5);
  box-shadow:0 7px 24px #000b,inset 0 1px #ffffff18,0 0 13px color-mix(in srgb,var(--phase-accent) 28%,transparent);
  animation:phase-arrive .44s cubic-bezier(.17,.78,.26,1) both;
}
.es2-phase-reveal::before {
  content:''; position:absolute; inset:0; z-index:-1; opacity:.65;
  background:radial-gradient(ellipse at 15% 50%,color-mix(in srgb,var(--phase-accent) 27%,transparent),transparent 70%),
    repeating-linear-gradient(135deg,transparent 0 17px,#ffffff06 18px 19px,transparent 20px 34px);
}
.es2-phase-reveal[data-phase="3"] { border-color:var(--phase-accent); box-shadow:0 8px 28px #000c,inset 0 0 18px color-mix(in srgb,var(--phase-accent) 23%,transparent),0 0 19px color-mix(in srgb,var(--phase-accent) 42%,transparent); }
.es2-phase-reveal[data-boss="abyss-monarch"]::before { background:repeating-conic-gradient(from 12deg at 15% 50%,#a58aff18 0deg 5deg,transparent 5deg 30deg); }
.es2-phase-reveal[data-boss="frost-sovereign"]::before { background:repeating-linear-gradient(62deg,#9cddff16 0 1px,transparent 2px 24px),repeating-linear-gradient(-62deg,#9cddff10 0 1px,transparent 2px 24px); }
.es2-phase-reveal[data-boss="infernal-titan"]::before { background:radial-gradient(ellipse at 5% 110%,#ff99584a,transparent 75%),repeating-linear-gradient(145deg,transparent 0 30px,#ff995816 31px 33px,transparent 34px 56px); }
.es2-phase-reveal[data-boss="eclipse-seraph"]::before { background:repeating-conic-gradient(from 8deg at 15% 50%,#ffe8a81e 0deg 2deg,transparent 3deg 18deg),radial-gradient(ellipse at 15% 50%,#b88a542c,transparent 70%); }
.es2-phase-reveal__ornament { position:relative; display:grid; place-items:center; flex:0 0 45px; width:45px; height:45px; }
.es2-phase-reveal__ornament svg { position:absolute; inset:0; width:100%;height:100%; opacity:.9; animation:phase-seal .85s ease-out both; }
.es2-phase-reveal__ornament b { font:800 21px/1 Georgia,serif; color:#fff6df; text-shadow:0 0 8px var(--phase-accent); }
.es2-phase-reveal__copy { display:grid; flex:1; min-width:0; gap:2px; }
.es2-phase-reveal__copy > span { color:#e3dce6; font:650 10px/1.2 system-ui,sans-serif; overflow-wrap:anywhere; }
.es2-phase-reveal__copy strong { font:800 clamp(14px,2.1vw,21px)/1.15 Georgia,serif; color:#fff2dc; overflow-wrap:anywhere; text-shadow:0 0 8px color-mix(in srgb,var(--phase-accent) 65%,transparent); }
.es2-phase-reveal__ranks { display:flex; gap:4px; padding-top:2px; }
.es2-phase-reveal__ranks i { height:3px; width:23px; background:#ffffff1f; transform:skewX(-24deg); }
.es2-phase-reveal__ranks i[data-lit="true"] { background:var(--phase-accent); }
.es2-phase-reveal__sweep { position:absolute; inset:0; z-index:-1; background:linear-gradient(110deg,transparent 34%,color-mix(in srgb,var(--phase-accent) 25%,transparent) 50%,transparent 65%); transform:translateX(-120%); animation:phase-sweep .8s .12s ease-out both; }
@keyframes phase-arrive { from { opacity:0; translate:0 -7px; scale:.94; } to { opacity:1;translate:0 0;scale:1; } }
@keyframes phase-seal { from { rotate:-32deg; scale:.65;opacity:.2; } to { rotate:0deg;scale:1;opacity:.9; } }
@keyframes phase-sweep { from { transform:translateX(-120%); } to { transform:translateX(120%); } }
@media(max-width:700px),(orientation:landscape) and (max-height:520px) {
  .es2-phase-reveal { top:calc(100% + 3px); padding:4px 7px;gap:5px;min-height:38px; }
  .es2-phase-reveal__ornament { flex-basis:30px;width:30px;height:30px; }
  .es2-phase-reveal__ornament b { font-size:15px; }
  .es2-phase-reveal__copy > span { font-size:9px; }
  .es2-phase-reveal__copy strong { font-size:13px; }
}
@media(prefers-reduced-motion:reduce) { .es2-phase-reveal,.es2-phase-reveal__ornament svg,.es2-phase-reveal__sweep { animation:none!important; } .es2-phase-reveal__sweep { display:none; } }
:global([data-es2-reduce-motion="true"]) .es2-phase-reveal,
:global([data-es2-reduce-motion="true"]) .es2-phase-reveal *,
:global([data-es2-reduce-flashing="true"]) .es2-phase-reveal,
:global([data-es2-reduce-flashing="true"]) .es2-phase-reveal * { animation:none!important; }
</style>
