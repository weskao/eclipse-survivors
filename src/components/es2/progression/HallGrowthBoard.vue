<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { t } from '../../../i18n'
import { hallEdges, hallNodeState, hallRows, type HallNode } from './hall-model'
const props = withDefaults(defineProps<{ nodes: readonly HallNode[]; writable?: boolean; tree?: boolean }>(), { writable: true, tree: false })
const emit = defineEmits<{ purchase: [node: HallNode] }>()
const selected = ref('')
const hovered = ref('')
// Long-form copy folds away only where the dock is compact (CSS); state just records the player's choice.
const expanded = ref(false)
const bodyId = useId()
const rows = computed(() => props.tree ? hallRows(props.nodes) : [props.nodes])
const selectedNode = computed(() => props.nodes.find(node => node.id === selected.value) ?? props.nodes[0])
const active = computed(() => props.nodes.find(node => node.id === hovered.value) ?? selectedNode.value)
const isPreview = computed(() => active.value?.id !== selectedNode.value?.id)
const upgraded = ref<{ id: string; rank: number; milestone: boolean; revealed: readonly string[]; arrived: readonly string[] } | null>(null)
let celebrationTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(celebrationTimer))
let request: { id: string; rank: number; time: number } | null = null
let dispatching = false
const isFine = () => typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
const canPurchase = (node: HallNode) => props.writable && node.canBuy && node.cost !== null
const statusLabel = { locked: '尚未解鎖', poor: '餘燼不足', available: '可升級' } as const
const status = (node: HallNode) => {
  const state = hallNodeState(node)
  return state === 'maxed' ? (node.maxRank === 1 ? '已解鎖' : '已滿階') : statusLabel[state]
}
const action = (node: HallNode) => node.cost === null || node.locked ? t(status(node))
  : t(node.kind === 'research' ? '研究 · {cost} ✧' : node.kind === 'legacy' ? '升級 · {cost} ✧' : '解鎖 · {cost} ✧', { cost: node.cost })

function inspect(node: HallNode) {
  selected.value = node.id
  hovered.value = ''
}
function purchase(node: HallNode) {
  if (!canPurchase(node) || node.id !== selectedNode.value?.id || dispatching) return
  inspect(node)
  dispatching = true
  request = { id: node.id, rank: node.rank, time: Date.now() }
  emit('purchase', node)
  void nextTick(() => { dispatching = false })
}
watch(() => props.nodes, (nodes, previous) => {
  if (upgraded.value && nodes.find(node => node.id === upgraded.value?.id)?.rank !== upgraded.value.rank) {
    upgraded.value = null
    clearTimeout(celebrationTimer)
  }
  if (!request) return
  const node = nodes.find(item => item.id === request?.id)
  if (node && node.rank === request.rank + 1 && Date.now() - request.time < 2000) {
    const revealed = nodes.flatMap(child => child.requires
      .filter(req => req.id === node.id && node.rank >= req.rank
        && (previous.find(parent => parent.id === req.id)?.rank ?? 0) < req.rank)
      .map(req => req.id + ':' + child.id))
    const arrived = nodes.filter(child => !child.locked && previous.find(old => old.id === child.id)?.locked).map(child => child.id)
    upgraded.value = { id: node.id, rank: node.rank, milestone: node.rank === node.maxRank, revealed, arrived }
    clearTimeout(celebrationTimer)
    celebrationTimer = setTimeout(() => { upgraded.value = null }, arrived.length ? 1750 : 1450)
  }
  request = null
})
</script>

<template>
  <div class="hall-growth" :class="{ 'hall-growth--tree': tree }">
    <div class="hall-map">
      <template v-for="(row, rowIndex) in rows" :key="rowIndex">
        <div v-if="tree && rowIndex > 0" class="hall-links" aria-hidden="true">
          <div v-for="edge in hallEdges(rows[rowIndex - 1] ?? [], row)" :key="edge.id"
            :data-hall-edge="edge.id" :data-route-up="String(edge.to < edge.from)" :data-active="String(edge.active)" :data-revealed="String(upgraded?.revealed.includes(edge.id) ?? false)" class="hall-edge"
            :style="{ '--from': edge.from + '%', '--to': edge.to + '%', '--left': Math.min(edge.from, edge.to) + '%', '--width': Math.abs(edge.from - edge.to) + '%', '--route-origin': edge.to < edge.from ? 'right' : 'left' }">
            <i></i><i></i><i></i>
          </div>
        </div>
        <div class="hall-row" :class="{ 'hall-row--single': tree && row.length === 1 }"
          :style="tree ? { '--columns': row.length } : undefined">
          <article v-for="node in row" :key="node.id" class="hall-node" :data-hall-node="node.id"
            :data-state="hallNodeState(node)"
            :data-selected="String(active?.id === node.id)" :data-hall-arrived="String(upgraded?.arrived.includes(node.id) ?? false)"
            @pointerenter="isFine() && (hovered = node.id)" @pointerleave="hovered === node.id && (hovered = '')">
            <button type="button" class="hall-inspect" data-ui-sfx="hall-inspect" :data-hall-inspect="node.id"
              :aria-pressed="selectedNode?.id === node.id" @focus="hovered = node.id" @blur="hovered = ''" @click="inspect(node)">
              <span class="hall-ring" role="progressbar" :aria-label="t(node.title)" :aria-valuemin="0" :aria-valuemax="node.maxRank" :aria-valuenow="node.rank"
                :style="{ '--hall-rank-progress': (node.rank / node.maxRank * 100) + '%', '--hall-tick-step': 360 / node.maxRank + 'deg', '--hall-tip-angle': node.rank / node.maxRank * 360 + 'deg' }">
                <span class="hall-ring-metal" aria-hidden="true"></span>
                <span class="hall-ring-ticks" aria-hidden="true"></span>
                <span v-if="node.rank > 0 && node.rank < node.maxRank" class="hall-ring-tip" aria-hidden="true"></span>
                <img :src="node.art" alt="" width="64" height="64" loading="lazy" decoding="async" draggable="false" />
                <span class="hall-rank">{{ node.rank }} / {{ node.maxRank }}<span v-if="node.maxRank > 1 && node.rank === node.maxRank" class="hall-node-max"> · MAX</span></span>
              </span>
              <strong>{{ t(node.title) }}</strong>
              <span class="hall-status">{{ t(status(node)) }}</span>
            </button>
            <span v-if="upgraded?.id === node.id" :key="upgraded.rank" :data-hall-upgraded="node.id" :data-milestone="String(upgraded.milestone)" :data-hall-stage="upgraded.rank" :data-hall-route="String(upgraded.arrived.length > 0)" class="hall-upgrade-fx" :style="{ '--hall-fx-scale': 1 + Math.min(5, upgraded.rank) * .08 }" aria-hidden="true">
              <i class="hall-wave"></i><i class="hall-wave"></i><i class="hall-wave"></i>
              <span class="hall-crown"></span>
              <span class="hall-particles"><i v-for="index in (upgraded.milestone ? 20 : 8 + Math.min(upgraded.rank, 4) * 2)" :key="index" :style="{ '--angle': index * 360 / (upgraded.milestone ? 20 : 8 + Math.min(upgraded.rank, 4) * 2) + 'deg', '--distance': (index % 3 === 0 ? 62 : 43) + 'px', '--delay': (index % 4) * 24 + 'ms' }"></i></span>
            </span>
          </article>
        </div>
      </template>
    </div>
    <aside v-if="active" class="hall-detail" data-hall-detail :data-rank-complete="String(active.maxRank > 1 && active.rank === active.maxRank)" :aria-label="t('節點詳情')">
      <div class="hall-detail-heading">
        <div class="hall-detail-emblem"><img :src="active.art" alt="" width="48" height="48" /></div>
        <div class="hall-detail-title">
          <small>{{ t(active.kind === 'research' ? '永久研究' : active.kind === 'legacy' ? '永久強化' : '起始裝備與祝福') }}</small>
          <strong>{{ t(active.title) }}</strong>
          <div v-if="active.maxRank > 1" class="hall-detail-rank" data-hall-rank-label>
            <b>Lv. {{ active.rank }} / {{ active.maxRank }}</b>
            <span v-if="active.rank === active.maxRank" class="hall-max-label">✦ MAX</span>
          </div>
          <div v-if="active.maxRank > 1" class="hall-detail-pips" aria-hidden="true">
            <i v-for="rank in active.maxRank" :key="rank" class="hall-detail-pip" :data-filled="String(rank <= active.rank)" :data-next="String(rank === active.rank + 1)"></i>
          </div>
        </div>
        <button type="button" class="hall-detail-toggle" data-hall-detail-toggle data-ui-sfx="select" :aria-controls="bodyId"
          :aria-expanded="expanded" :aria-label="t(expanded ? '收起節點說明' : '展開節點說明')" @click="expanded = !expanded"><span class="es2-info-glyph" aria-hidden="true">i</span></button>
      </div>
      <div v-if="active.current !== undefined" class="hall-comparison" :class="{ 'hall-comparison--single': active.next === undefined }">
        <div class="hall-effect" data-hall-current><small>{{ t('目前效果') }}</small><span class="hall-effect-level">Lv. {{ active.rank }}</span><b>{{ active.current }}</b></div>
        <span v-if="active.next !== undefined" class="hall-effect-arrow" aria-hidden="true">→</span>
        <div v-if="active.next !== undefined" class="hall-effect hall-effect--next" data-hall-next><small>{{ t('下一階效果') }}</small><span class="hall-effect-level">Lv. {{ active.rank + 1 }}</span><b>{{ active.next }}</b></div>
        <div v-if="active.next !== undefined && active.increment !== undefined" class="hall-effect-gain" data-hall-increment><small>{{ t('每階提升') }}</small><b>↑ {{ active.increment }}</b></div>
      </div>
      <div :id="bodyId" class="hall-detail-body" :data-expanded="String(expanded)" :data-state="hallNodeState(active)">
      <div class="hall-description"><small>{{ t('技能說明') }}</small><p>{{ active.description }}</p></div>
      <div v-if="active.requirements.length" class="hall-requirements"><small>{{ t('前置條件') }}</small><p v-for="requirement in active.requirements" :key="requirement">{{ requirement }}</p></div>
      <small class="hall-status hall-detail-status" :data-state="hallNodeState(active)">{{ t(status(active)) }}</small>
      </div>
      <button class="hall-buy hall-confirm" type="button" data-ui-sfx="managed" data-hall-confirm :data-hall-purchase="active.id" :data-research="active.kind === 'research' ? active.id : undefined" :data-equipment="active.kind === 'equipment' ? active.id : undefined" :data-bonus="active.kind === 'bonus' ? active.id : undefined" :disabled="isPreview || !canPurchase(active)" @click="purchase(active)">{{ isPreview ? t('選取節點後升級') : action(active) }}
        <span v-if="upgraded?.id === active.id" :key="active.id + ':' + upgraded.rank" class="hall-confirm-fx" :data-hall-confirm-fx="upgraded.rank" :data-milestone="String(upgraded.milestone)" aria-hidden="true"></span>
      </button>
      <div role="status" class="hall-announcement" data-hall-announcement>
        <template v-if="upgraded?.id === active.id">
        <span class="hall-ceremony-label">{{ t(upgraded.milestone ? '最高等階達成' : '升級成功') }} · {{ upgraded.rank }} / {{ active.maxRank }}</span>
        <span v-if="upgraded.arrived.length" data-hall-unlock-notice class="hall-unlock-notice">{{ t('新研究已開啟') }} · {{ nodes.filter(node => upgraded?.arrived.includes(node.id)).map(node => t(node.title)).join(' · ') }}</span>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
@property --hall-rank-progress { syntax: '<percentage>'; inherits: true; initial-value: 0%; }
@property --hall-tip-angle { syntax: '<angle>'; inherits: true; initial-value: 0deg; }
.hall-growth{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;min-width:0;font:inherit;color:#ebdfcc;--hall-medallion:68px}
.hall-map{min-width:0;padding:10px 12px;border:1px solid #937a4a55;border-radius:5px 14px;background:radial-gradient(ellipse at 50% 10%,#253747,#101a26 72%);overflow:hidden;align-self:start}
.hall-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,88px),1fr));gap:5px;align-items:start}
.hall-growth--tree .hall-row{grid-template-columns:repeat(var(--columns,2),minmax(0,1fr));gap:0}
.hall-growth--tree .hall-row--single{grid-template-columns:minmax(0,1fr);width:50%;min-width:0;margin-inline:auto}
.hall-node{position:relative;isolation:isolate;display:flex;justify-content:center;min-width:0;color:#e5d9c8}
.hall-inspect{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;width:100%;min-height:44px;padding:3px 4px;border:1px solid transparent;border-radius:9px;background:none;color:inherit;font:inherit;text-align:center;cursor:pointer}
.hall-inspect strong{font-size:.82rem;line-height:1.3;overflow-wrap:anywhere}
.hall-detail{overflow-wrap:anywhere}
.hall-ring{position:relative;isolation:isolate;display:grid;place-items:center;width:var(--hall-medallion);max-width:100%;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 0deg,#fff1b9 0deg,#c49a51 65deg,#f6d78f 165deg,#956c35 250deg,#f6dca4 360deg);box-shadow:0 0 0 1px #251a12,0 0 0 2px #a4834e,0 3px 7px #000b,inset 0 1px 2px #fff2c0a0;margin:2px 0 8px;padding:8px}
.hall-ring-metal{position:absolute;inset:3px;border-radius:50%;background:conic-gradient(from 0deg,#ffe7a1 0 var(--hall-rank-progress),#333e48 var(--hall-rank-progress) 100%);box-shadow:inset 0 0 0 1px #111b25,inset 0 2px 3px #0009}
.hall-ring-ticks{position:absolute;inset:1px;border-radius:50%;background:repeating-conic-gradient(from -1deg,#f6db9c99 0deg 1.6deg,transparent 1.6deg var(--hall-tick-step));mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 5px));pointer-events:none}
.hall-ring::before{content:'';position:absolute;inset:8px;z-index:1;border-radius:inherit;background:radial-gradient(ellipse at 44% 30%,#33404a,#101a26 68%);border:1px solid #ba9555;box-shadow:inset 0 0 7px #000c,0 0 0 1px #261c13}
.hall-ring img{position:relative;z-index:2;width:90%;height:90%;object-fit:contain;max-width:64px;max-height:64px;filter:drop-shadow(0 2px 2px #0009)}
.hall-ring-tip{position:absolute;z-index:3;inset:0;border-radius:50%;transform:rotate(var(--hall-tip-angle));pointer-events:none}
.hall-ring-tip::before{content:'';position:absolute;top:3px;left:50%;width:5px;height:5px;transform:translateX(-50%);border-radius:50%;background:#fff5d0;box-shadow:0 0 6px 2px #ffce72a0}
.hall-node[data-state="locked"] .hall-ring{filter:saturate(.42);opacity:.72}
.hall-node[data-state="locked"] .hall-ring img{filter:saturate(.35) drop-shadow(0 2px 2px #0009)}
.hall-node[data-state="maxed"] .hall-ring{box-shadow:0 0 0 1px #271b11,0 0 0 2px #d9b46e,0 0 13px #dfb16b55,inset 0 1px 2px #fff2c0}
.hall-rank{position:absolute;z-index:4;bottom:-6px;left:50%;transform:translateX(-50%);min-width:38px;padding:1px 4px;border:1px solid #a98b53;border-radius:4px;background:linear-gradient(#29343c,#141d27);color:#f4d397;font:700 .69rem var(--es2-font-numeric), system-ui;white-space:nowrap;font-variant-numeric:tabular-nums;box-shadow:0 2px 3px #0007}
.hall-node[data-selected="true"] .hall-inspect{border-color:#b89a6340;background:radial-gradient(ellipse at 50% 28%,#d4b16b14,transparent 70%)}
.hall-status{font:600 .76rem/1.4 var(--es2-font-numeric), system-ui;color:#d8bc80}
.hall-node[data-state="locked"] .hall-status,.hall-node[data-state="poor"] .hall-status{color:#b7b4ad}
.hall-buy{position:relative;min-height:44px;width:100%;padding:5px 7px;border:1px solid #bd9d63;border-radius:5px;background:linear-gradient(#665035,#392d23);color:#fff0c9;font:600 .86rem/1.3 var(--es2-font-numeric), system-ui;white-space:normal;overflow-wrap:anywhere;cursor:pointer}
.hall-buy:disabled{background:#222a31;border-color:#62605b;color:#a8afb5;cursor:not-allowed}
.hall-buy:focus-visible,.hall-inspect:focus-visible{outline:2px solid #ffda94;outline-offset:-2px}
.hall-links{position:relative;height:14px}
.hall-edge{position:absolute;inset:0;color:#56616a;pointer-events:none}
.hall-edge[data-active="true"]{color:#dfb971}
.hall-edge i{position:absolute;display:block;background:currentColor;transition:background-color .4s,box-shadow .4s}
.hall-edge i:nth-child(1){left:var(--from);width:2px;top:0;height:50%}
.hall-edge i:nth-child(2){left:var(--left);width:max(2px,var(--width));height:2px;top:50%}
.hall-edge i:nth-child(3){left:var(--to);width:2px;top:50%;bottom:0}
.hall-edge[data-active="true"] i{box-shadow:0 0 5px #edbe6a55}
.hall-detail{align-self:start;min-width:0;display:grid;gap:10px;padding:clamp(12px,2vw,20px);border:1px solid #a58b5c80;border-radius:5px 14px;background:linear-gradient(155deg,#233344,#111b27)}
.hall-detail-body{display:grid;gap:8px;min-width:0}
.hall-detail-heading{display:flex;align-items:center;gap:10px;min-width:0}
.hall-detail-heading img{object-fit:contain;flex:0 0 48px}
.hall-detail-heading strong,.hall-detail-heading small{display:block}
.hall-detail small{color:#c5b18c;font:600 .78rem/1.4 var(--es2-font-numeric), system-ui}
.hall-detail p{margin:0;color:#d0d3d8;font:400 .86rem/1.5 var(--es2-font-numeric), system-ui}
.hall-comparison{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px;border-block:1px solid #9b8b6c55;min-width:0}
.hall-comparison div{display:grid;gap:4px;min-width:0}
.hall-comparison b{font:700 1.1rem var(--es2-font-numeric), system-ui;font-variant-numeric:tabular-nums;color:#f7d18d}
.hall-comparison div:last-child b{color:#b6e7b7}
.hall-requirements p{margin-top:4px}
.hall-ring{transition:--hall-rank-progress .62s cubic-bezier(.17,.76,.23,1),--hall-tip-angle .62s cubic-bezier(.17,.76,.23,1),box-shadow .25s}
.hall-ring::after{content:'';position:absolute;inset:2px;z-index:5;border-radius:inherit;pointer-events:none;opacity:0;background:linear-gradient(112deg,transparent 31%,#e7c1841a 43%,#fff0c57a 50%,#e7c1841a 57%,transparent 69%);background-size:240% 100%;background-position:130% 0}
.hall-node[data-selected="true"] .hall-ring{box-shadow:0 0 0 1px #cfa86c,0 0 0 2px #dfbb78,0 0 13px #d7a85b60,inset 0 1px 2px #fff2c0}
.hall-node:has(.hall-upgrade-fx) .hall-ring::after,.hall-inspect:focus-visible .hall-ring::after{animation:hall-shimmer .8s ease-out both}
@media(hover:hover) and (pointer:fine){.hall-inspect:hover .hall-ring::after{animation:hall-shimmer .78s ease-out both}}
@keyframes hall-shimmer{0%{opacity:0;background-position:130% 0}20%{opacity:.8}80%{opacity:.65}100%{opacity:0;background-position:-45% 0}}
.hall-edge[data-revealed="true"] i::after{content:'';position:absolute;inset:0;background:#ffdc94;box-shadow:0 0 8px #f6bd73;transform-origin:top left;animation:hall-route-down .32s ease-out both}
.hall-edge[data-revealed="true"] i:nth-child(2)::after{transform-origin:var(--route-origin) center;animation:hall-route-across .25s .28s ease-out both}
.hall-edge[data-revealed="true"] i:nth-child(3)::after{animation-delay:.49s}
@keyframes hall-route-down{0%{transform:scaleY(0);opacity:.85}75%{opacity:.8}100%{transform:scaleY(1);opacity:0}}
@keyframes hall-route-across{0%{transform:scaleX(0);opacity:.85}75%{opacity:.8}100%{transform:scaleX(1);opacity:0}}
.hall-upgrade-fx{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:visible;border-radius:inherit}
.hall-upgrade-fx::before{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,#efc98116 47%,#ffe7a94d 50%,transparent 63%);background-size:240% 100%;animation:hall-shimmer .9s ease-out both}
.hall-wave{position:absolute;left:50%;top:calc(var(--hall-medallion) / 2 + 5px);width:calc(var(--hall-medallion) * var(--hall-fx-scale,1));aspect-ratio:1;border:2px solid #f7d597;border-radius:50%;transform:translate(-50%,-50%);opacity:0;animation:hall-awaken .75s ease-out both}
.hall-wave:nth-child(2){animation-delay:.1s;border-color:#b9d3db}
.hall-wave:nth-child(3){width:28px;animation-delay:.16s;border-style:dotted}
.hall-particles{position:absolute;left:50%;top:calc(var(--hall-medallion) / 2 + 5px);width:0;height:0}
.hall-particles i{position:absolute;left:0;top:0;width:3px;height:8px;border-radius:2px;background:#ffe4a5;box-shadow:0 0 6px #e9bb76;opacity:0;animation:hall-spark .68s var(--delay) ease-out both}
.hall-upgrade-fx[data-milestone="true"] .hall-wave{border-width:3px;animation-duration:1.05s}
.hall-upgrade-fx[data-milestone="true"] .hall-particles i{width:4px;height:11px;--distance:78px!important;animation-duration:.95s}
.hall-upgrade-fx[data-milestone="true"]::before{animation-duration:1.15s}
@keyframes hall-awaken{0%{opacity:0;transform:translate(-50%,-50%) scale(.45)}25%{opacity:.8}100%{opacity:0;transform:translate(-50%,-50%) scale(2.5)}}
@keyframes hall-spark{0%{opacity:0;transform:rotate(var(--angle)) translateY(-7px) scale(.5)}18%{opacity:.9}100%{opacity:0;transform:rotate(var(--angle)) translateY(calc(-1 * var(--distance))) scale(.15)}}
.hall-node[data-hall-arrived="true"] .hall-ring{animation:hall-destination .64s .68s ease-out both}
.hall-node[data-hall-arrived="true"] .hall-ring::after{animation:hall-shimmer .63s .68s ease-out both}
@keyframes hall-destination{0%{filter:saturate(.35);transform:scale(.94)}40%{filter:saturate(1.2) brightness(1.25);transform:scale(1.08);box-shadow:0 0 0 2px #e9c182,0 0 20px #e9c18299}100%{filter:none;transform:none}}
@media(hover:hover) and (pointer:fine){.hall-inspect:hover{border-color:#b89a6355}.hall-buy:hover:not(:disabled){background:linear-gradient(#7a603e,#4d3826)}}
@media(min-width:600px){.hall-growth{grid-template-columns:minmax(0,1fr) minmax(205px,30%);--hall-medallion:60px}.hall-map{padding:8px 18px}.hall-links{height:10px}.hall-growth--tree .hall-row{max-width:400px;margin-inline:auto}.hall-growth--tree .hall-links{max-width:400px;margin-inline:auto}}
@media(orientation:landscape) and (min-width:560px) and (max-height:520px){.hall-growth{grid-template-columns:minmax(0,1fr) minmax(165px,36%);--hall-medallion:54px}.hall-map{padding:6px}.hall-links{height:10px}.hall-inspect{gap:2px;padding:2px}.hall-inspect strong{font-size:.75rem}.hall-detail{gap:6px;padding:9px}}
/* The research graph has the same vertical budget on every viewport. Keep the
   compact tree geometry independent of the breakpoint used for the inspector. */
.hall-growth--tree{--hall-medallion:56px}
.hall-growth--tree .hall-map{padding-block:6px}
.hall-growth--tree .hall-links{height:10px}
@media(orientation:landscape) and (min-width:560px) and (max-height:520px){.hall-growth--tree{--hall-medallion:54px}}
@media(max-width:739px) and (orientation:portrait){.hall-growth{--hall-medallion:56px;gap:6px}.hall-ring{margin-bottom:4px}.hall-map{padding:6px}.hall-links{height:10px}}
@media(max-width:360px){.hall-growth{--hall-medallion:56px}.hall-map{padding:6px}.hall-links{height:10px}.hall-row{gap:3px}.hall-detail{padding:10px}.hall-buy{font-size:.78rem}}
@media(prefers-reduced-motion:reduce){.hall-node[data-hall-arrived="true"] .hall-ring{animation:none!important}.hall-upgrade-fx,.hall-ring::after,.hall-edge i::after{display:none!important}.hall-ring,.hall-edge i{transition:none!important}}
:global([data-es2-reduce-motion="true"] .hall-upgrade-fx),
:global([data-es2-reduce-motion="true"] .hall-ring::after),
:global([data-es2-reduce-motion="true"] .hall-edge i::after),
:global([data-es2-reduce-flashing="true"] .hall-upgrade-fx),
:global([data-es2-reduce-flashing="true"] .hall-ring::after),
:global([data-es2-reduce-flashing="true"] .hall-edge i::after){display:none!important;animation:none!important}
:global([data-es2-reduce-motion="true"] .hall-ring),:global([data-es2-reduce-motion="true"] .hall-edge i),
:global([data-es2-reduce-flashing="true"] .hall-ring),:global([data-es2-reduce-flashing="true"] .hall-edge i){transition:none!important}
:global([data-es2-reduce-motion="true"] .hall-node[data-hall-arrived="true"] .hall-ring),
:global([data-es2-reduce-flashing="true"] .hall-node[data-hall-arrived="true"] .hall-ring){animation:none!important}


/* Rank-dependent bounded ceremony, sized from the same medallion on every device. */
.hall-upgrade-fx[data-hall-stage="2"] .hall-wave{border-color:#f5ddaa}
.hall-upgrade-fx[data-hall-stage="3"] .hall-wave{border-color:#b5d4da;animation-duration:.86s}
.hall-upgrade-fx[data-hall-stage="4"] .hall-wave{border-color:#ffe6ac;animation-duration:.95s}
.hall-crown{position:absolute;left:50%;top:calc(var(--hall-medallion) / 2 + 5px);width:calc(var(--hall-medallion) * 1.18);aspect-ratio:1;border-radius:50%;background:repeating-conic-gradient(from 12deg,#fff0b7 0deg 1deg,transparent 1deg 30deg);mask:radial-gradient(farthest-side,transparent 74%,#000 76%,#000 94%,transparent 96%);opacity:0;transform:translate(-50%,-50%);animation:hall-crown-in .82s ease-out both}
.hall-upgrade-fx[data-milestone="true"] .hall-crown{width:calc(var(--hall-medallion) * 1.4);animation-duration:1.22s;background:repeating-conic-gradient(from 0deg,#ffe5a0 0deg 2deg,transparent 2deg 15deg)}
@keyframes hall-crown-in{0%{opacity:0;transform:translate(-50%,-50%) rotate(-24deg) scale(.72)}30%{opacity:.84}100%{opacity:0;transform:translate(-50%,-50%) rotate(24deg) scale(1.3)}}
.hall-node[data-hall-arrived="true"] .hall-ring{animation-duration:.85s}
.hall-node[data-hall-arrived="true"] .hall-rank{animation:hall-arrival-label .7s .68s ease-out both}
@keyframes hall-arrival-label{0%{box-shadow:0 0 0 #f0cc8000}35%{box-shadow:0 0 12px #f0cc80aa;color:#fff0c7}100%{box-shadow:0 2px 3px #0007}}
/* Keep the live announcement for assistive technology, never as a grid row.
   Confirmation feedback is a decorative, non-interactive overlay inside the existing button. */
.hall-announcement{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0}
.hall-confirm-fx{position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 0 2px #d4f1c5,inset 0 0 14px #9cdbad66;animation:hall-confirm-pulse .65s ease-out both}
.hall-confirm-fx[data-milestone="true"]{box-shadow:inset 0 0 0 2px #ffe4a0,inset 0 0 22px #ffce7966;animation-duration:1s}
@keyframes hall-confirm-pulse{0%{opacity:0}22%{opacity:1}100%{opacity:0}}
@media(prefers-reduced-motion:reduce){.hall-node[data-hall-arrived="true"] .hall-rank{animation:none!important}.hall-confirm-fx{display:none!important}}
:global([data-es2-reduce-motion="true"] .hall-node[data-hall-arrived="true"] .hall-rank),
:global([data-es2-reduce-flashing="true"] .hall-node[data-hall-arrived="true"] .hall-rank){animation:none!important}
:global([data-es2-reduce-motion="true"] .hall-confirm-fx),
:global([data-es2-reduce-flashing="true"] .hall-confirm-fx){display:none!important}

/* Shared upgrade inspector: restrained gilded surfaces, readable effect hierarchy,
   and persistent rank cues independent of the existing purchase ceremony. */
.hall-detail{border-radius:12px;background:radial-gradient(ellipse at 15% 0%,#473a35 0,transparent 56%),linear-gradient(155deg,#202b38,#101721 80%);box-shadow:inset 0 1px #f5d09b22,0 6px 20px #0004}
.hall-detail-heading{gap:10px;align-items:center}
.hall-detail-emblem{display:grid;place-items:center;flex:0 0 auto;width:58px;height:58px;padding:5px;box-sizing:border-box;border:1px solid #b99a64;border-radius:50%;background:radial-gradient(circle,#4d4543,#192331 72%);box-shadow:0 0 0 2px #9d805332,inset 0 0 7px #0008}
.hall-detail-emblem img{width:100%;height:100%;min-width:0;object-fit:contain;filter:drop-shadow(0 2px 3px #0009)}
.hall-detail-title{min-width:0;flex:1}
.hall-detail-title strong{color:#ffe2ad;font-size:clamp(1rem,1.5vw,1.25rem);line-height:1.2;margin:3px 0}
.hall-detail-rank{display:flex;gap:5px;align-items:center;flex-wrap:wrap;color:#e7c88e;font:600 .8rem/1.3 var(--es2-font-numeric), system-ui;font-variant-numeric:tabular-nums}
.hall-detail-pips{display:flex;gap:3px;margin-top:5px;max-width:180px}
.hall-detail-pip{height:5px;flex:1;min-width:0;border-radius:2px;background:#39434d;border:1px solid #96836b44}
.hall-detail-pip[data-filled="true"]{background:linear-gradient(90deg,#a67e42,#f4d795);border-color:#dfbe83;box-shadow:0 0 5px #caa36138}
.hall-detail-pip[data-next="true"]{border-color:#b69a69;background:#6e573750}
.hall-max-label,.hall-node-max{color:#ffdc86;font-weight:800}
.hall-detail[data-rank-complete="true"]{border-color:#e1bb72;box-shadow:inset 0 0 20px #d6a85a13,0 0 16px #d6a85a22}
.hall-detail[data-rank-complete="true"] .hall-detail-emblem{border-color:#ffe09a;box-shadow:0 0 0 2px #ac814d,0 0 14px #edba674d}
.hall-node[data-state="maxed"] .hall-rank{background:linear-gradient(#624b29,#302318);border-color:#e0bf79;color:#fff0b8}
.hall-description{display:grid;gap:4px;border-top:1px solid #b49b6940;padding-top:8px}
.hall-description p{color:#e0dce0;line-height:1.55}
.hall-comparison{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:5px;padding:0;border:0}
.hall-comparison--single{grid-template-columns:minmax(0,1fr)}
.hall-comparison .hall-effect{display:grid;align-content:start;gap:3px;padding:8px 6px;border:1px solid #a78c5b44;border-radius:7px;background:#121b25;min-width:0;text-align:center}
.hall-comparison .hall-effect--next{background:linear-gradient(150deg,#263c31,#182b29);border-color:#83b69566}
.hall-effect small{color:#d2bf9e;font-size:.73rem}
.hall-effect-level{color:#aeb7c2;font:500 .72rem/1.2 var(--es2-font-numeric), system-ui}
.hall-comparison .hall-effect b{color:#ffe2ad;font:750 clamp(1rem,2.1vw,1.4rem)/1.2 var(--es2-font-numeric), system-ui;overflow-wrap:anywhere}
.hall-comparison .hall-effect--next b{color:#a8e6ae}
.hall-effect-arrow{align-self:center;color:#c9ae7b;font-size:1rem}
.hall-comparison .hall-effect-gain{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;padding:4px;color:#a8e6ae}
.hall-comparison .hall-effect-gain b{font-size:.85rem;color:#a8e6ae}
.hall-requirements{padding:8px;border-radius:6px;background:#0e172175;border:1px solid #a78c5b35}
.hall-detail-status{justify-self:start;padding:3px 8px;border-radius:4px;border:1px solid #a78c5b55;background:#181e29}
.hall-detail-status[data-state="available"]{color:#a8e6ae;border-color:#83b69555}
.hall-detail-status[data-state="poor"]{color:#f3b5a5;border-color:#d07d6866}
.hall-detail-status[data-state="maxed"]{color:#ffe09a;border-color:#d9b46e88}
.hall-detail .hall-confirm:not(:disabled){background:linear-gradient(180deg,#a28149,#674a29);border-color:#edcb89;box-shadow:inset 0 1px #f6dfa966,0 3px 8px #0005;color:#fff4dc;font-weight:750}
@media(hover:hover) and (pointer:fine){.hall-detail .hall-confirm:hover:not(:disabled){background:linear-gradient(180deg,#b79860,#765735)}}
.hall-detail .hall-confirm:active:not(:disabled){box-shadow:inset 0 2px 5px #0006}
@media(max-width:360px){.hall-detail-heading{gap:7px}.hall-detail-emblem{width:46px;height:46px}.hall-comparison{gap:3px}.hall-comparison .hall-effect{padding:5px 3px}}
/* One upgrade dock in normal flow, never a modal to open and close: a sticky side
   column where width allows, pinned to the viewport bottom on portrait phones.
   Kept last so these layout rules win over the shared inspector surface above. */
.hall-detail{z-index:4}
/* 44px transparent hit target around the shared card Info glyph (.es2-info-glyph); no ring of its own. */
.hall-detail-toggle{display:none;place-items:center;flex:none;width:44px;height:44px;padding:0;margin:0;border:0;background:transparent;cursor:pointer}
.hall-detail-toggle[aria-expanded="true"] .es2-info-glyph{border-color:#ffe2ad;background:#2c3540}
.hall-detail-toggle:focus-visible{outline:2px solid #ffda94;outline-offset:-2px;border-radius:6px}
@media(min-width:600px) and (max-width:739px){.hall-growth{grid-template-columns:minmax(0,1fr) minmax(220px,36%)}}
@media(min-width:600px),(orientation:landscape) and (min-width:560px) and (max-height:520px){
  .hall-detail{position:sticky;top:8px;max-height:calc(100dvh - 16px);overflow-y:auto;overscroll-behavior:contain}
}
/* Compact dock only for narrow/touch or genuinely short landscape viewports.
   Desktop keeps its full effect comparison and description. */
@media(max-width:739px),(hover:none) and (pointer:coarse),(orientation:landscape) and (max-height:520px){
  .hall-detail{grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px 10px;padding:8px 10px}
  .hall-detail-heading{display:contents}
  .hall-detail .hall-detail-emblem{grid-row:1/span 2;width:44px;height:44px;padding:4px}
  .hall-detail-title{grid-column:2;grid-row:1;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 8px}
  .hall-detail-title strong{margin:0;font-size:1rem;overflow-wrap:break-word}
  .hall-detail-toggle{display:grid;grid-column:3;grid-row:1/span 2}
  .hall-detail-title>small,.hall-detail-pips,.hall-comparison .hall-effect-gain,
  .hall-comparison .hall-effect small,.hall-comparison .hall-effect-level{display:none}
  .hall-comparison{grid-column:2;grid-row:2;display:flex;align-items:baseline;flex-wrap:wrap;gap:0 6px}
  .hall-comparison .hall-effect{display:block;padding:0;border:0;background:none;text-align:start}
  .hall-comparison .hall-effect b{font-size:1rem}
  .hall-detail-body,.hall-detail .hall-confirm{grid-column:1/-1}
  .hall-detail-body[data-expanded="false"]:not([data-state="locked"]),
  .hall-detail-body[data-expanded="false"]>:not(.hall-requirements){display:none}
  .hall-detail-body[data-expanded="false"] .hall-requirements{display:flex;flex-wrap:wrap;gap:0 6px;padding:4px 8px}
}
/* Very short landscape (200% zoom, phones sideways): the side column is too narrow for emblem + title + toggle. */
@media(orientation:landscape) and (max-height:400px){
  .hall-detail{grid-template-columns:minmax(0,1fr) auto}
  .hall-detail .hall-detail-emblem{display:none}
  .hall-detail-title,.hall-comparison{grid-column:1}
  .hall-detail-toggle{grid-column:2}
  .hall-detail-title strong{font-size:.92rem}
}
/* Landscape: transpose the existing graph, preserving all four authoritative
   edges and the same buttons, rank state, purchase event, and focus order. */
@media(orientation:landscape) and (min-width:560px) and (max-height:520px){
  .hall-growth{grid-template-columns:minmax(0,1fr) minmax(200px,36%);gap:8px;align-items:start}
  .hall-growth--tree{--hall-medallion:46px}
  .hall-growth--tree .hall-map{display:flex;align-items:stretch;padding:5px;min-width:0}
  .hall-growth--tree .hall-row{display:grid;flex:1 1 0;grid-template-columns:minmax(0,1fr);grid-template-rows:repeat(var(--columns,2),minmax(0,1fr));width:auto;max-width:none;margin:0;align-items:center;gap:2px;min-width:0}
  .hall-growth--tree .hall-row--single{grid-template-rows:1fr}
  .hall-growth--tree .hall-links{flex:0 0 14px;width:14px;height:auto;max-width:none;margin:0;align-self:stretch}
  .hall-growth--tree .hall-edge i:nth-child(1){left:0;top:var(--from);width:50%;height:2px}
  .hall-growth--tree .hall-edge i:nth-child(2){left:50%;top:var(--left);width:2px;height:max(2px,var(--width))}
  .hall-growth--tree .hall-edge i:nth-child(3){left:50%;top:var(--to);width:50%;height:2px;bottom:auto}
  .hall-growth--tree .hall-edge[data-revealed="true"] i:first-child::after,.hall-growth--tree .hall-edge[data-revealed="true"] i:nth-child(3)::after{animation-name:hall-route-across;transform-origin:left center}
  .hall-growth--tree .hall-edge[data-revealed="true"] i:nth-child(2)::after{animation-name:hall-route-down;transform-origin:center top}
  .hall-growth--tree .hall-edge[data-revealed="true"][data-route-up="true"] i:nth-child(2)::after{transform-origin:center bottom}
  .hall-growth--tree .hall-inspect{padding:3px 2px;gap:2px;min-height:44px}
  .hall-growth--tree .hall-inspect strong{font-size:max(11px,.74rem);line-height:1.2}
  .hall-growth--tree .hall-status{font-size:max(11px,.7rem);line-height:1.2}
  .hall-growth--tree .hall-ring{margin:1px 0 5px;padding:6px}
  .hall-growth--tree .hall-ring::before{inset:6px}
  .hall-detail{position:sticky;top:8px;max-height:none;overflow:visible;gap:5px;padding:8px}
  .hall-detail-body[data-expanded="true"]{max-height:clamp(48px,20dvh,100px);overflow-y:auto;overscroll-behavior:contain}
  .hall-detail .hall-confirm{min-height:44px;margin:0}
  .hall-detail-toggle{width:44px;height:44px}
}
/* Wide fine-pointer screens retain the complete inspector; the buy action
   remains a single explicit operation below the current/next values. */
@media(min-width:740px) and (min-height:521px) and (hover:hover) and (pointer:fine){
  .hall-growth{grid-template-columns:minmax(0,1fr) minmax(230px,34%)}
}
@media(max-width:599px) and (orientation:portrait){
  .hall-detail{position:sticky;bottom:0;padding-bottom:max(8px,env(safe-area-inset-bottom));border-top:2px solid #e7c58b;border-radius:14px 14px 6px 6px;box-shadow:0 -10px 24px #050a10cc,inset 0 1px #f5d09b22}
}
</style>
