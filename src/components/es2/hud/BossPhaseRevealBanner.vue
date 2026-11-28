<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../../../i18n'
import { BOSS_DEFINITIONS } from '../../../game/content/bosses/definitions'
import type { BossPhaseReveal } from '../../../game/store'
const props = defineProps<{ reveal: BossPhaseReveal }>()
const boss = computed(() => BOSS_DEFINITIONS[props.reveal.boss])
// Four authored silhouettes, shared motion/lifecycle. Do not duplicate the banner.
const sigils = {
  'abyss-monarch': 'M36 4C8 4 6 33 22 44S59 40 49 22S21 19 25 33S42 43 44 31 M36 68C64 68 66 39 50 28',
  'frost-sovereign': 'M36 3V69 M7 19L65 53 M7 53L65 19 M24 10L36 20L48 10 M24 62L36 52L48 62 M10 34L22 28L20 14 M62 38L50 44L52 58',
  'infernal-titan': 'M36 3L24 25L30 31L13 47L23 64L49 64L59 47L44 34L49 24Z M36 19L33 38L43 44L36 59L25 49L32 43Z',
  'eclipse-seraph': 'M36 7A29 29 0 1 0 65 36A24 24 0 1 1 36 7Z M36 0V12 M36 60V72 M0 36H12 M60 36H72 M12 12L20 20 M52 52L60 60 M12 60L20 52 M52 20L60 12',
} as const
const sigil = computed(() => sigils[props.reveal.boss])
</script>

<template>
  <div class="es2-phase-reveal" data-boss-phase-reveal :data-phase="reveal.phase" :data-boss="reveal.boss"
    :style="{ '--phase-accent': boss.color }" role="status" aria-live="polite" aria-atomic="true">
    <div class="es2-phase-reveal__ornament" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="31" stroke="currentColor" stroke-dasharray="2 5"/>
        <path class="es2-phase-reveal__sigil" data-boss-phase-sigil :d="sigil" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
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
    <div class="es2-phase-reveal__energy" aria-hidden="true"><i v-for="n in 6" :key="n" :style="{ '--n': n }"></i></div>
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
.es2-phase-reveal__ornament b { font:800 21px/1 var(--es2-font-numeric), Georgia,serif; color:#fff6df; text-shadow:0 0 8px var(--phase-accent); }
.es2-phase-reveal__copy { display:grid; flex:1; min-width:0; gap:2px; }
.es2-phase-reveal__copy > span { color:#e3dce6; font:650 10px/1.2 var(--es2-font-numeric), system-ui,sans-serif; overflow-wrap:anywhere; }
.es2-phase-reveal__copy strong { font:800 clamp(14px,2.1vw,21px)/1.15 var(--es2-font-numeric), Georgia,serif; color:#fff2dc; overflow-wrap:anywhere; text-shadow:0 0 8px color-mix(in srgb,var(--phase-accent) 65%,transparent); }
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

/* Element-specific one-shot timing, never an infinite ambient animation. */
.es2-phase-reveal { --reveal-life:1.85s; --sigil-turn:-28deg; --sigil-enter:.55s; }
.es2-phase-reveal[data-phase="3"] { --reveal-life:2.35s; --sigil-enter:.8s; }
.es2-phase-reveal__copy strong { animation:phase-name .48s .16s cubic-bezier(.16,1,.3,1) both; }
.es2-phase-reveal__ranks i[data-lit="true"] { animation:phase-rank .38s cubic-bezier(.16,1,.3,1) both; }
.es2-phase-reveal__ranks i:nth-child(2) { animation-delay:.15s; }
.es2-phase-reveal__ranks i:nth-child(3) { animation-delay:.29s; }
.es2-phase-reveal__ornament b { z-index:1; animation:phase-number .48s .12s both; }
.es2-phase-reveal__energy {position:absolute;inset:0;pointer-events:none;z-index:-1;overflow:hidden;}
.es2-phase-reveal__energy i {position:absolute;left:calc(var(--n)*13%);top:50%;width:22px;height:2px;background:var(--phase-accent);box-shadow:0 0 7px var(--phase-accent);opacity:0;animation:phase-ember .72s calc(var(--n)*.05s) ease-out both;}
.es2-phase-reveal[data-boss="abyss-monarch"] { --sigil-turn:-150deg; background:linear-gradient(110deg,#211332,#0d1020 65%,#160f25); }
.es2-phase-reveal[data-boss="abyss-monarch"] .es2-phase-reveal__ornament svg { animation:abyss-converge var(--sigil-enter) both; }
.es2-phase-reveal[data-boss="abyss-monarch"] .es2-phase-reveal__energy i {border-radius:50%;width:9px;height:9px;animation-name:abyss-pull;}
.es2-phase-reveal[data-boss="frost-sovereign"] {background:linear-gradient(115deg,#132c3a,#111c2c 65%,#152735); }
.es2-phase-reveal[data-boss="frost-sovereign"] .es2-phase-reveal__ornament svg {animation:frost-crystallize var(--sigil-enter) both;}
.es2-phase-reveal[data-boss="frost-sovereign"] .es2-phase-reveal__energy i {width:9px;height:9px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);animation-name:frost-shatter;}
.es2-phase-reveal[data-boss="infernal-titan"] {background:linear-gradient(125deg,#382018,#201016 65%,#2f1512);}
.es2-phase-reveal[data-boss="infernal-titan"] .es2-phase-reveal__ornament svg {animation:infernal-ignite var(--sigil-enter) both;}
.es2-phase-reveal[data-boss="infernal-titan"] .es2-phase-reveal__energy i {width:4px;height:15px;animation-name:infernal-rise;}
.es2-phase-reveal[data-boss="eclipse-seraph"] {background:linear-gradient(110deg,#332b22,#161725 65%,#282016);}
.es2-phase-reveal[data-boss="eclipse-seraph"] .es2-phase-reveal__ornament svg {animation:seraph-eclipse var(--sigil-enter) both;}
.es2-phase-reveal[data-boss="eclipse-seraph"] .es2-phase-reveal__energy i {width:17px;height:3px;animation-name:seraph-rays;}
.es2-phase-reveal[data-phase="3"] .es2-phase-reveal__energy i {animation-duration:1.1s;}
@keyframes phase-name {from{opacity:0;transform:translateX(-9px);letter-spacing:.08em}to{opacity:1;transform:translateX(0);letter-spacing:normal}}
@keyframes phase-rank {from{opacity:.15;transform:skewX(-24deg) scaleX(.1)}to{opacity:1;transform:skewX(-24deg) scaleX(1)}}
@keyframes phase-number {from{opacity:0;scale:1.45}to{opacity:1;scale:1}}
@keyframes phase-ember {0%{opacity:0;transform:translateY(10px)}40%{opacity:.6}100%{opacity:0;transform:translateY(-25px)}}
@keyframes abyss-converge {from{rotate:-150deg;scale:1.35;opacity:.15}65%{rotate:9deg;scale:.82;opacity:.8}to{rotate:0deg;scale:1;opacity:.95}}
@keyframes abyss-pull {from{opacity:0;transform:translate(28px,-18px) scale(1.4)}35%{opacity:.55}to{opacity:0;transform:translate(-80px,0) scale(.1)}}
@keyframes frost-crystallize {from{scale:.25;opacity:.15}65%{scale:1.13;opacity:.85}to{scale:1;opacity:.95}}
@keyframes frost-shatter {from{opacity:0;transform:translate(-15px,0) rotate(0)}35%{opacity:.65}to{opacity:0;transform:translate(28px,-27px) rotate(75deg)}}
@keyframes infernal-ignite {from{scale:.85 .4;translate:0 7px;opacity:.25}60%{scale:1.12 1.2;translate:0 -2px;opacity:.9}to{scale:1;translate:0 0;opacity:.95}}
@keyframes infernal-rise {from{opacity:0;transform:translateY(25px) scaleY(.6)}30%{opacity:.65}to{opacity:0;transform:translateY(-35px) scaleY(.15)}}
@keyframes seraph-eclipse {from{rotate:65deg;scale:1.55;opacity:.12}55%{rotate:-8deg;scale:1.02;opacity:.75}to{rotate:0deg;scale:1;opacity:.95}}
@keyframes seraph-rays {from{opacity:0;transform:translate(-22px,15px) rotate(-30deg)}35%{opacity:.55}to{opacity:0;transform:translate(42px,-25px) rotate(-30deg)}}
@media(prefers-reduced-motion:reduce){.es2-phase-reveal,.es2-phase-reveal *{animation:none!important}.es2-phase-reveal__energy{display:none}}
:global([data-es2-reduce-motion="true"]) .es2-phase-reveal *,
:global([data-es2-reduce-flashing="true"]) .es2-phase-reveal * {animation:none!important}
</style>
