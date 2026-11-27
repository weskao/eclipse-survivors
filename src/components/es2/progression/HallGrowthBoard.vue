<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { t } from '../../../i18n'
import { hallEdges, hallRows, type HallNode } from './hall-model'
const props = withDefaults(defineProps<{ nodes: readonly HallNode[]; writable?: boolean; tree?: boolean }>(), { writable: true, tree: false })
const emit = defineEmits<{ purchase: [node: HallNode] }>()
const selected = ref('')
const hovered = ref('')
const detail = ref<HTMLElement | null>(null)
const rows = computed(() => props.tree ? hallRows(props.nodes) : [props.nodes])
const active = computed(() => props.nodes.find(node => node.id === hovered.value)
  ?? props.nodes.find(node => node.id === selected.value) ?? props.nodes[0])
const upgraded = ref<{ id: string; rank: number; milestone: boolean; revealed: readonly string[] } | null>(null)
let celebrationTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(celebrationTimer))
let request: { id: string; rank: number; time: number } | null = null
let dispatching = false
const isFine = () => typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
const canPurchase = (node: HallNode) => props.writable && node.canBuy && node.cost !== null
const status = (node: HallNode) => node.cost === null ? (node.maxRank === 1 ? '已解鎖' : '已滿階')
  : node.locked ? '尚未解鎖' : !node.canBuy ? '餘燼不足' : '可升級'
const action = (node: HallNode) => node.cost === null || node.locked ? t(status(node))
  : t(node.kind === 'research' ? '研究 · {cost} ✧' : node.kind === 'legacy' ? '升級 · {cost} ✧' : '解鎖 · {cost} ✧', { cost: node.cost })

function inspect(node: HallNode, move = false) {
  selected.value = node.id
  hovered.value = ''
  if (move && !isFine()) void nextTick(() => detail.value?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' }))
}
function purchase(node: HallNode) {
  if (!canPurchase(node) || dispatching) return
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
    upgraded.value = { id: node.id, rank: node.rank, milestone: node.rank === node.maxRank, revealed }
    clearTimeout(celebrationTimer)
    celebrationTimer = setTimeout(() => { upgraded.value = null }, 1350)
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
            :data-hall-edge="edge.id" :data-active="String(edge.active)" :data-revealed="String(upgraded?.revealed.includes(edge.id) ?? false)" class="hall-edge"
            :style="{ '--from': edge.from + '%', '--to': edge.to + '%', '--left': Math.min(edge.from, edge.to) + '%', '--width': Math.abs(edge.from - edge.to) + '%', '--route-origin': edge.to < edge.from ? 'right' : 'left' }">
            <i></i><i></i><i></i>
          </div>
        </div>
        <div class="hall-row" :class="{ 'hall-row--single': tree && row.length === 1 }"
          :style="tree ? { '--columns': row.length } : undefined">
          <article v-for="node in row" :key="node.id" class="hall-node" :data-hall-node="node.id"
            :data-state="node.cost === null ? 'maxed' : node.locked ? 'locked' : node.canBuy ? 'available' : 'poor'"
            :data-selected="String(active?.id === node.id)"
            @pointerenter="isFine() && (hovered = node.id)" @pointerleave="hovered === node.id && (hovered = '')">
            <button type="button" class="hall-inspect" data-ui-sfx="hall-inspect" :data-hall-inspect="node.id"
              :aria-pressed="active?.id === node.id" @focus="hovered = node.id" @blur="hovered = ''" @click="inspect(node, true)">
              <span class="hall-ring" role="progressbar" :aria-label="t(node.title)" :aria-valuemin="0" :aria-valuemax="node.maxRank" :aria-valuenow="node.rank"
                :style="{ '--hall-rank-progress': (node.rank / node.maxRank * 100) + '%' }">
                <img :src="node.art" alt="" width="64" height="64" loading="lazy" decoding="async" draggable="false" />
                <span class="hall-rank">{{ node.rank }} / {{ node.maxRank }}</span>
              </span>
              <strong>{{ t(node.title) }}</strong>
              <span class="hall-status">{{ t(status(node)) }}</span>
            </button>
            <p>{{ node.description }}</p>
            <button class="hall-buy" type="button" data-ui-sfx="managed" :data-research="node.kind === 'research' ? node.id : undefined"
              :data-equipment="node.kind === 'equipment' ? node.id : undefined" :data-bonus="node.kind === 'bonus' ? node.id : undefined"
              :data-hall-purchase="node.id" :disabled="!canPurchase(node)" @click="purchase(node)">{{ action(node) }}</button>
            <span v-if="upgraded?.id === node.id" :key="upgraded.rank" :data-hall-upgraded="node.id" :data-milestone="String(upgraded.milestone)" class="hall-upgrade-fx" aria-hidden="true">
              <i class="hall-wave"></i><i class="hall-wave"></i><i class="hall-wave"></i>
              <span class="hall-particles"><i v-for="index in 12" :key="index" :style="{ '--angle': index * 30 + 'deg', '--distance': (index % 3 === 0 ? 62 : 43) + 'px', '--delay': (index % 4) * 22 + 'ms' }"></i></span>
            </span>
          </article>
        </div>
      </template>
    </div>
    <aside v-if="active" ref="detail" class="hall-detail" :data-hall-detail="tree ? '' : undefined" :aria-label="t('節點詳情')">
      <div class="hall-detail-heading"><img :src="active.art" alt="" width="48" height="48" /><div><small>{{ t('節點詳情') }}</small><strong>{{ t(active.title) }}</strong></div></div>
      <p>{{ active.description }}</p>
      <div v-if="active.current !== undefined" class="hall-comparison">
        <div><small>{{ t('目前效果') }}</small><b>{{ active.current }}</b></div>
        <span v-if="active.next !== undefined" aria-hidden="true">→</span>
        <div v-if="active.next !== undefined"><small>{{ t('下一階效果') }}</small><b>{{ active.next }}</b></div>
      </div>
      <div v-if="active.requirements.length" class="hall-requirements"><small>{{ t('前置條件') }}</small><p v-for="requirement in active.requirements" :key="requirement">{{ requirement }}</p></div>
      <small class="hall-status">{{ t(status(active)) }}</small>
      <button class="hall-buy hall-confirm" type="button" data-ui-sfx="managed" data-hall-confirm :disabled="!canPurchase(active)" @click="purchase(active)">{{ action(active) }}</button>
      <p v-if="upgraded?.id === active.id" role="status" class="hall-success">{{ t('升級成功') }} · {{ upgraded.rank }} / {{ active.maxRank }}</p>
    </aside>
  </div>
</template>

<style scoped>
@property --hall-rank-progress { syntax: '<percentage>'; inherits: false; initial-value: 0%; }
.hall-growth{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0;font:inherit;color:#ebdfcc}
.hall-map{min-width:0;padding:clamp(8px,1.5vw,18px);border:1px solid #937a4a66;border-radius:5px 17px;background:radial-gradient(ellipse at 50% 0%,#253747,#101a26 64%);overflow:hidden}
.hall-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:clamp(6px,1.4vw,18px);align-items:stretch}
.hall-growth--tree .hall-row{grid-template-columns:repeat(var(--columns,2),minmax(0,1fr))}
.hall-growth--tree .hall-row--single{grid-template-columns:minmax(0,1fr);width:50%;min-width:min(100%,140px);margin-inline:auto}
.hall-node{position:relative;isolation:isolate;display:flex;flex-direction:column;gap:7px;align-items:stretch;padding:clamp(6px,1.25vw,15px);min-width:0;background:linear-gradient(155deg,#283441,#121c27 70%);border:1px solid #62718180;border-radius:4px 14px;color:#e5d9c8;overflow:hidden}
.hall-node[data-state="locked"]{border-color:#665e58;background:#171e26}
.hall-node[data-state="maxed"]{border-color:#bd9d60}
.hall-node[data-selected="true"]{border-color:#e5bd70;box-shadow:inset 0 0 14px #d3a45325}
.hall-inspect{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;width:100%;min-height:44px;padding:4px 0;border:0;background:none;color:inherit;font:inherit;text-align:center;cursor:pointer}
.hall-inspect strong,.hall-node p,.hall-detail{overflow-wrap:anywhere}
.hall-ring{position:relative;display:grid;place-items:center;width:clamp(62px,9vw,92px);max-width:100%;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 0deg,#f5d28b 0 var(--hall-rank-progress),#46505b var(--hall-rank-progress) 100%);box-shadow:0 0 0 1px #ab946a,0 3px 10px #0008;padding:4px;margin-block:2px 9px}
.hall-ring::before{content:'';position:absolute;inset:4px;background:#0a1521;border:1px solid #9e8656;border-radius:inherit}
.hall-ring img{position:relative;width:84%;height:84%;object-fit:contain;max-width:64px;max-height:64px}
.hall-node[data-state="locked"] .hall-ring img{filter:saturate(.35);opacity:.7}
.hall-rank{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);min-width:44px;padding:2px 5px;border:1px solid #9a7d4f;border-radius:4px;background:#182330;color:#f4d397;font:700 .75rem system-ui;white-space:nowrap;font-variant-numeric:tabular-nums}
.hall-status{font:600 .76rem/1.4 system-ui;color:#d8bc80}
.hall-node[data-state="locked"] .hall-status,.hall-node[data-state="poor"] .hall-status{color:#b7b4ad}
.hall-node p{margin:0;color:#c5c6cc;font:400 .8rem/1.45 system-ui;text-align:center;flex:1}
.hall-buy{position:relative;min-height:44px;width:100%;padding:5px 7px;border:1px solid #bd9d63;border-radius:5px;background:linear-gradient(#665035,#392d23);color:#fff0c9;font:600 .86rem/1.3 system-ui;white-space:normal;overflow-wrap:anywhere;cursor:pointer}
.hall-buy:disabled{background:#222a31;border-color:#62605b;color:#a8afb5;cursor:not-allowed}
.hall-buy:focus-visible,.hall-inspect:focus-visible{outline:2px solid #ffda94;outline-offset:-2px}
.hall-links{position:relative;height:clamp(20px,3vw,35px)}
.hall-edge{position:absolute;inset:0;color:#56616a;pointer-events:none}
.hall-edge[data-active="true"]{color:#dfb971}
.hall-edge i{position:absolute;display:block;background:currentColor;transition:background-color .4s,box-shadow .4s}
.hall-edge i:nth-child(1){left:var(--from);width:2px;top:0;height:50%}
.hall-edge i:nth-child(2){left:var(--left);width:max(2px,var(--width));height:2px;top:50%}
.hall-edge i:nth-child(3){left:var(--to);width:2px;top:50%;bottom:0}
.hall-edge[data-active="true"] i{box-shadow:0 0 5px #edbe6a55}
.hall-detail{align-self:start;min-width:0;display:grid;gap:10px;padding:clamp(12px,2vw,20px);border:1px solid #a58b5c80;border-radius:5px 14px;background:linear-gradient(155deg,#233344,#111b27)}
.hall-detail-heading{display:flex;align-items:center;gap:10px;min-width:0}
.hall-detail-heading img{object-fit:contain;flex:0 0 48px}
.hall-detail-heading strong,.hall-detail-heading small{display:block}
.hall-detail small{color:#c5b18c;font:600 .78rem/1.4 system-ui}
.hall-detail p{margin:0;color:#d0d3d8;font:400 .86rem/1.5 system-ui}
.hall-comparison{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px;border-block:1px solid #9b8b6c55;min-width:0}
.hall-comparison div{display:grid;gap:4px;min-width:0}
.hall-comparison b{font:700 1.1rem system-ui;font-variant-numeric:tabular-nums;color:#f7d18d}
.hall-comparison div:last-child b{color:#b6e7b7}
.hall-requirements p{margin-top:4px}
.hall-success{color:#b6e7b7!important}
.hall-ring{transition:--hall-rank-progress .62s cubic-bezier(.17,.76,.23,1),box-shadow .25s}
.hall-ring::after{content:'';position:absolute;inset:4px;border-radius:inherit;pointer-events:none;opacity:0;background:linear-gradient(112deg,transparent 31%,#e7c1841a 43%,#fff0c57a 50%,#e7c1841a 57%,transparent 69%);background-size:240% 100%;background-position:130% 0}
.hall-node[data-selected="true"] .hall-ring{box-shadow:0 0 0 1px #cfa86c,0 0 15px #d7a85b38}
.hall-node:has(.hall-upgrade-fx) .hall-ring::after,.hall-inspect:focus-visible .hall-ring::after{animation:hall-shimmer .8s ease-out both}
@media(hover:hover) and (pointer:fine){.hall-inspect:hover .hall-ring::after{animation:hall-shimmer .78s ease-out both}}
@keyframes hall-shimmer{0%{opacity:0;background-position:130% 0}20%{opacity:.8}80%{opacity:.65}100%{opacity:0;background-position:-45% 0}}
.hall-edge[data-revealed="true"] i::after{content:'';position:absolute;inset:0;background:#ffdc94;box-shadow:0 0 8px #f6bd73;transform-origin:top left;animation:hall-route-down .32s ease-out both}
.hall-edge[data-revealed="true"] i:nth-child(2)::after{transform-origin:var(--route-origin) center;animation:hall-route-across .25s .28s ease-out both}
.hall-edge[data-revealed="true"] i:nth-child(3)::after{animation-delay:.49s}
@keyframes hall-route-down{0%{transform:scaleY(0);opacity:.85}75%{opacity:.8}100%{transform:scaleY(1);opacity:0}}
@keyframes hall-route-across{0%{transform:scaleX(0);opacity:.85}75%{opacity:.8}100%{transform:scaleX(1);opacity:0}}
.hall-upgrade-fx{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;border-radius:inherit}
.hall-upgrade-fx::before{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,#efc98116 47%,#ffe7a94d 50%,transparent 63%);background-size:240% 100%;animation:hall-shimmer .9s ease-out both}
.hall-wave{position:absolute;left:50%;top:clamp(42px,6vw,65px);width:72px;aspect-ratio:1;border:2px solid #f7d597;border-radius:50%;transform:translate(-50%,-50%);opacity:0;animation:hall-awaken .75s ease-out both}
.hall-wave:nth-child(2){animation-delay:.1s;border-color:#b9d3db}
.hall-wave:nth-child(3){width:28px;animation-delay:.16s;border-style:dotted}
.hall-particles{position:absolute;left:50%;top:clamp(42px,6vw,65px);width:0;height:0}
.hall-particles i{position:absolute;left:0;top:0;width:3px;height:8px;border-radius:2px;background:#ffe4a5;box-shadow:0 0 6px #e9bb76;opacity:0;animation:hall-spark .68s var(--delay) ease-out both}
.hall-upgrade-fx[data-milestone="true"] .hall-wave{border-width:3px;animation-duration:1.05s}
.hall-upgrade-fx[data-milestone="true"] .hall-particles i{width:4px;height:11px;--distance:78px!important;animation-duration:.95s}
.hall-upgrade-fx[data-milestone="true"]::before{animation-duration:1.15s}
@keyframes hall-awaken{0%{opacity:0;transform:translate(-50%,-50%) scale(.45)}25%{opacity:.8}100%{opacity:0;transform:translate(-50%,-50%) scale(2.5)}}
@keyframes hall-spark{0%{opacity:0;transform:rotate(var(--angle)) translateY(-7px) scale(.5)}18%{opacity:.9}100%{opacity:0;transform:rotate(var(--angle)) translateY(calc(-1 * var(--distance))) scale(.15)}}
@media(hover:hover) and (pointer:fine){.hall-node:hover{border-color:#e5bd70}.hall-buy:hover:not(:disabled){background:linear-gradient(#7a603e,#4d3826)}}
@media(min-width:900px){.hall-growth{grid-template-columns:minmax(0,1fr) minmax(200px,27%)}}
@media(orientation:landscape) and (min-width:640px) and (max-height:520px){.hall-growth{grid-template-columns:minmax(0,1fr) minmax(165px,32%)}.hall-ring{width:60px}.hall-map{padding:6px}.hall-node{padding:6px}.hall-links{height:16px}}
@media(max-width:360px){.hall-map{padding:5px}.hall-node{padding:5px}.hall-row{gap:5px}.hall-detail{padding:10px}.hall-buy{font-size:.78rem}}
@media(prefers-reduced-motion:reduce){.hall-upgrade-fx,.hall-ring::after,.hall-edge i::after{display:none!important}.hall-ring,.hall-edge i{transition:none!important}}
:global([data-es2-reduce-motion="true"]) .hall-upgrade-fx,
:global([data-es2-reduce-motion="true"]) .hall-ring::after,
:global([data-es2-reduce-motion="true"]) .hall-edge i::after,
:global([data-es2-reduce-flashing="true"]) .hall-upgrade-fx,
:global([data-es2-reduce-flashing="true"]) .hall-ring::after,
:global([data-es2-reduce-flashing="true"]) .hall-edge i::after{display:none!important;animation:none!important}
:global([data-es2-reduce-motion="true"]) .hall-ring,:global([data-es2-reduce-motion="true"]) .hall-edge i,
:global([data-es2-reduce-flashing="true"]) .hall-ring,:global([data-es2-reduce-flashing="true"]) .hall-edge i{transition:none!important}
</style>
