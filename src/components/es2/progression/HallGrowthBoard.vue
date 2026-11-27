<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t } from '../../../i18n'
import { hallEdges, hallRows, type HallNode } from './hall-model'
const props = withDefaults(defineProps<{ nodes: readonly HallNode[]; writable?: boolean; tree?: boolean; visible?: boolean; preview?: boolean; navigableRequirements?: boolean }>(), { writable: true, tree: false, visible: true, preview: false })
const emit = defineEmits<{ purchase: [node: HallNode]; prerequisite: [id: string] }>()
const selected = ref('')
const hovered = ref('')
const detail = ref<HTMLElement | null>(null)
const root = ref<HTMLElement | null>(null)
const floating = ref(false)
const opened = ref(false)
const floatQuery = '(max-width: 739px), (hover: none) and (pointer: coarse)'
let media: MediaQueryList | undefined
let opener: HTMLElement | null = null
function closeDetail(restoreFocus = false) {
  if (!opened.value) return
  opened.value = false
  hovered.value = ''
  if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true })
}
function syncMedia() {
  floating.value = media?.matches ?? false
  if (!floating.value) closeDetail()
}
function dismissOutside(event: PointerEvent) {
  if (!floating.value || !opened.value || !(event.target instanceof Node)) return
  if (!detail.value?.contains(event.target) && !root.value?.contains(event.target)) closeDetail()
}
function dismissEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && floating.value && opened.value) {
    event.preventDefault()
    closeDetail(true)
  }
}
onMounted(() => {
  if (typeof window.matchMedia === 'function') {
    media = window.matchMedia(floatQuery)
    syncMedia()
    media.addEventListener?.('change', syncMedia)
  }
  document.addEventListener('pointerdown', dismissOutside, true)
  document.addEventListener('keydown', dismissEscape)
})
onBeforeUnmount(() => {
  media?.removeEventListener?.('change', syncMedia)
  document.removeEventListener('pointerdown', dismissOutside, true)
  document.removeEventListener('keydown', dismissEscape)
})
watch(() => props.visible, visible => { if (!visible) closeDetail() })
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
// Completion derives from committed ownership, not price or writability.
const completion = (node: HallNode) => node.maxRank > 0 && node.rank >= node.maxRank
  ? (node.maxRank === 1 ? 'unlocked' : 'mastered') : 'none'
const canPurchase = (node: HallNode) => completion(node) === 'none' && !props.preview && props.writable && node.canBuy && node.cost !== null
const status = (node: HallNode) => completion(node) === 'mastered' ? '已滿階' : completion(node) === 'unlocked' ? '已解鎖'
  : props.preview ? '規劃預覽' : node.locked ? '尚未解鎖' : !node.canBuy ? '餘燼不足' : '可升級'
const action = (node: HallNode) => completion(node) !== 'none' ? t(status(node)) : props.preview ? t('尚未開放升級') : node.cost === null || node.locked ? t(status(node))
  : t(node.kind === 'research' ? '研究 · {cost} ✧' : node.kind === 'legacy' ? '升級 · {cost} ✧' : '解鎖 · {cost} ✧', { cost: node.cost })

function inspect(node: HallNode, event?: MouseEvent) {
  selected.value = node.id
  hovered.value = ''
  if (event && floating.value) {
    opener = event.currentTarget as HTMLElement
    const wasOpen = opened.value
    opened.value = true
    if (!wasOpen && event.detail === 0) void nextTick(() => detail.value?.focus({ preventScroll: true }))
  }
}
/** Used by cross-tree links; one shared inspector and no new dialog. */
async function focusNode(id: string) {
  const node=props.nodes.find(item=>item.id===id)
  if (!node) return
  inspect(node)
  if(floating.value) {
    opened.value=true
    opener=root.value?.querySelector<HTMLElement>('[data-hall-inspect="'+id+'"]')??null
    await nextTick()
    detail.value?.focus({preventScroll:true})
  } else {
    await nextTick()
    root.value?.querySelector<HTMLElement>('[data-hall-inspect="'+id+'"]')?.focus({preventScroll:true})
  }
}
function followRequirement(index:number) {
  const requirement=active.value?.requires[index]
  if(requirement) emit('prerequisite',requirement.id)
}
defineExpose({focusNode})
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
    const revealed = nodes.filter(child=>!child.locked).flatMap(child => child.requires
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
  <div ref="root" class="hall-growth" :class="{ 'hall-growth--tree': tree, 'hall-growth--floating': floating }">
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
            :data-state="completion(node) !== 'none' ? 'maxed' : node.locked ? 'locked' : node.canBuy ? 'available' : 'poor'"
            :data-hall-completion="completion(node)"
            :data-talent-type="node.talentType" :data-selected="String(active?.id === node.id)" :data-hall-arrived="String(upgraded?.arrived.includes(node.id) ?? false)"
            @pointerenter="!floating && isFine() && (hovered = node.id)" @pointerleave="hovered === node.id && (hovered = '')">
            <button type="button" class="hall-inspect" data-ui-sfx="hall-inspect" :data-hall-inspect="node.id"
              :aria-pressed="selectedNode?.id === node.id" @focus="!floating && (hovered = node.id)" @blur="hovered = ''" @click="inspect(node, $event)">
              <span class="hall-ring" role="progressbar" :aria-label="t(node.title)" :aria-valuemin="0" :aria-valuemax="node.maxRank" :aria-valuenow="node.rank"
                :style="{ '--hall-rank-progress': (node.rank / node.maxRank * 100) + '%', '--hall-tick-step': 360 / node.maxRank + 'deg', '--hall-tip-angle': node.rank / node.maxRank * 360 + 'deg' }">
                <span class="hall-ring-metal" aria-hidden="true"></span>
                <span class="hall-ring-ticks" aria-hidden="true"></span>
                <span v-if="node.rank > 0 && node.rank < node.maxRank" class="hall-ring-tip" aria-hidden="true"></span>
                <img :src="node.art" alt="" width="64" height="64" loading="lazy" decoding="async" draggable="false" />
                <span v-if="completion(node) !== 'none'" class="hall-completion-crest" aria-hidden="true"><i></i></span>
                <span class="hall-rank">{{ completion(node) === 'mastered' ? 'MAX' : node.rank + ' / ' + node.maxRank }}</span>
              </span>
              <strong>{{ t(node.title) }}</strong>
              <span class="hall-status">{{ node.attunementStatus ?? t(status(node)) }}</span>
            </button>
            <span v-if="upgraded?.id === node.id" :key="upgraded.rank" :data-hall-upgraded="node.id" :data-ceremony="node.talentType" :data-milestone="String(upgraded.milestone)" :data-hall-stage="upgraded.rank" :data-hall-route="String(upgraded.arrived.length > 0)" class="hall-upgrade-fx" :style="{ '--hall-fx-scale': 1 + Math.min(5, upgraded.rank) * .08 }" aria-hidden="true">
              <i class="hall-wave"></i><i class="hall-wave"></i><i class="hall-wave"></i>
              <span class="hall-crown"></span>
              <span v-if="node.talentType && node.talentType!=='rank'" class="hall-ritual" :data-hall-ritual="node.talentType"><i class="hall-ritual-ray"></i><i class="hall-ritual-ray"></i><i class="hall-ritual-seal"></i></span>
              <span class="hall-particles"><i v-for="index in (upgraded.milestone ? 20 : 8 + Math.min(upgraded.rank, 4) * 2)" :key="index" :style="{ '--angle': index * 360 / (upgraded.milestone ? 20 : 8 + Math.min(upgraded.rank, 4) * 2) + 'deg', '--distance': (index % 3 === 0 ? 62 : 43) + 'px', '--delay': (index % 4) * 24 + 'ms' }"></i></span>
            </span>
          </article>
        </div>
      </template>
    </div>
    <Teleport to="body" :disabled="!floating">
    <aside v-if="active" v-show="visible && (!floating || opened)" ref="detail" class="hall-detail" :class="{ 'hall-detail--floating': floating }" :data-hall-detail-completion="completion(active)" :data-hall-detail="tree ? '' : undefined" :data-open="String(floating && opened && visible)" tabindex="-1" :aria-label="t('節點詳情')">
      <button v-if="floating" type="button" class="hall-detail-close" data-hall-close data-ui-sfx="select" :aria-label="t('關閉節點詳情')" @click="closeDetail(true)">×</button>
      <div class="hall-detail-heading"><img :src="active.art" alt="" width="48" height="48" /><div><small>{{ t('節點詳情') }}<span v-if="completion(active) === 'mastered'" class="hall-detail-max-mark"> · MAX</span></small><strong>{{ t(active.title) }}</strong></div></div>
      <div class="hall-detail-body">
      <p>{{ active.description }}</p>
      <p v-if="preview && active.cost !== null" class="hall-preview-price">{{ t('預計升級成本 · {cost} ✧', { cost: active.cost }) }}</p>
      <div v-if="active.current !== undefined" class="hall-comparison">
        <div><small>{{ t('目前效果') }}</small><b>{{ active.current }}</b></div>
        <span v-if="active.next !== undefined" aria-hidden="true">→</span>
        <div v-if="active.next !== undefined"><small>{{ t('下一階效果') }}</small><b>{{ active.next }}</b></div>
      </div>
      <div v-if="active.requirements.length" class="hall-requirements"><small>{{ t('前置條件') }}</small><div v-for="(requirement,index) in active.requirements" :key="requirement"><button v-if="navigableRequirements && active.requires[index]" type="button" class="hall-prerequisite-link" :data-hall-prerequisite="active.requires[index]?.id" data-ui-sfx="select" @click="followRequirement(index)">{{ requirement }} ↗</button><p v-else>{{ requirement }}</p></div></div>
      <small class="hall-status">{{ active.attunementStatus ?? t(status(active)) }}</small>
      <div v-if="upgraded?.id === active.id" role="status" class="hall-success" :key="upgraded.rank">
        <span class="hall-ceremony-label">{{ t(upgraded.milestone ? '最高等階達成' : '升級成功') }} · {{ upgraded.rank }} / {{ active.maxRank }}</span>
        <span v-if="upgraded.arrived.length" data-hall-unlock-notice class="hall-unlock-notice">{{ t('新研究已開啟') }} · {{ nodes.filter(node => upgraded?.arrived.includes(node.id)).map(node => t(node.title)).join(' · ') }}</span>
      </div>
      </div>
      <button class="hall-buy hall-confirm" type="button" data-ui-sfx="managed" data-hall-confirm :data-hall-purchase="active.id" :data-research="active.kind === 'research' ? active.id : undefined" :data-equipment="active.kind === 'equipment' ? active.id : undefined" :data-bonus="active.kind === 'bonus' ? active.id : undefined" :disabled="isPreview || !canPurchase(active)" @click="purchase(active)">{{ isPreview && completion(active) === 'none' ? t('選取節點後升級') : action(active) }}</button>
    </aside>
    </Teleport>
  </div>
</template>

<style scoped>
.hall-node[data-talent-type='signature'] .hall-ring{border-radius:24% 50% 24% 50%}.hall-node[data-talent-type='resonance'] .hall-ring{border-radius:34%;outline:1px solid #c1a6ed;outline-offset:2px}.hall-upgrade-fx[data-ceremony='signature']{filter:hue-rotate(28deg)}.hall-upgrade-fx[data-ceremony='resonance']{filter:hue-rotate(215deg)}
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
.hall-rank{position:absolute;z-index:4;bottom:-6px;left:50%;transform:translateX(-50%);min-width:38px;padding:1px 4px;border:1px solid #a98b53;border-radius:4px;background:linear-gradient(#29343c,#141d27);color:#f4d397;font:700 .69rem system-ui;white-space:nowrap;font-variant-numeric:tabular-nums;box-shadow:0 2px 3px #0007}
.hall-node[data-selected="true"] .hall-inspect{border-color:#b89a6340;background:radial-gradient(ellipse at 50% 28%,#d4b16b14,transparent 70%)}
.hall-status{font:600 .76rem/1.4 system-ui;color:#d8bc80}
.hall-node[data-state="locked"] .hall-status,.hall-node[data-state="poor"] .hall-status{color:#b7b4ad}
.hall-buy{position:relative;min-height:44px;width:100%;padding:5px 7px;border:1px solid #bd9d63;border-radius:5px;background:linear-gradient(#665035,#392d23);color:#fff0c9;font:600 .86rem/1.3 system-ui;white-space:normal;overflow-wrap:anywhere;cursor:pointer}
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
.hall-detail small{color:#c5b18c;font:600 .78rem/1.4 system-ui}
.hall-detail p{margin:0;color:#d0d3d8;font:400 .86rem/1.5 system-ui}
.hall-comparison{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px;border-block:1px solid #9b8b6c55;min-width:0}
.hall-comparison div{display:grid;gap:4px;min-width:0}
.hall-comparison b{font:700 1.1rem system-ui;font-variant-numeric:tabular-nums;color:#f7d18d}
.hall-comparison div:last-child b{color:#b6e7b7}
.hall-requirements p{margin-top:4px}
.hall-prerequisite-link{font:inherit;min-height:44px;max-width:100%;text-align:start;overflow-wrap:anywhere;color:inherit;background:none;border:0;border-bottom:1px solid currentColor;padding:4px 2px;cursor:pointer}.hall-prerequisite-link:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.hall-success{color:#b6e7b7!important}
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
@media(min-width:740px){.hall-growth{grid-template-columns:minmax(0,1fr) minmax(205px,30%);--hall-medallion:68px}.hall-map{padding:10px 18px}.hall-growth--tree .hall-row{max-width:400px;margin-inline:auto}.hall-growth--tree .hall-links{max-width:400px;margin-inline:auto}}
@media(orientation:landscape) and (min-width:560px) and (max-height:520px){.hall-growth{grid-template-columns:minmax(0,1fr) minmax(165px,36%);--hall-medallion:54px}.hall-map{padding:6px}.hall-links{height:10px}.hall-inspect{gap:2px;padding:2px}.hall-inspect strong{font-size:.75rem}.hall-detail{gap:6px;padding:9px}}
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

/* One detail template: a side inspector on wide fine-pointer layouts, a viewport
   overlay on touch/narrow screens. Teleport avoids transformed archive ancestors. */
.hall-growth--floating{grid-template-columns:minmax(0,1fr)!important}
.hall-detail--floating{position:fixed;z-index:305;inset-inline:max(8px,env(safe-area-inset-left)) max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));margin:0 auto;width:auto;max-width:520px;max-height:min(max(48dvh,185px),390px,calc(100dvh - max(8px,env(safe-area-inset-top)) - max(8px,env(safe-area-inset-bottom))));box-sizing:border-box;display:flex;flex-direction:column;gap:7px;padding:12px;background:linear-gradient(155deg,#26394b,#111b27 72%);border:1px solid #b99b65;border-top:2px solid #e7c58b;border-radius:15px 15px 8px 8px;box-shadow:0 -8px 32px #0009,inset 0 1px #e7c58b26;color:#ebdfcc;font:inherit;overscroll-behavior:contain;animation:hall-inspector-in .18s ease-out both}
.hall-detail--floating:focus{outline:none}
.hall-detail--floating .hall-detail-heading{padding-right:46px;flex:none;min-width:0}.hall-detail-heading>div{min-width:0;overflow-wrap:anywhere}
.hall-detail--floating .hall-detail-body{overflow-y:auto;overscroll-behavior:contain;min-height:0;flex:1;padding-right:2px}
.hall-detail--floating .hall-confirm{flex:none;position:relative;z-index:2}
.hall-detail--floating .hall-success{font-size:.78rem;margin-block:2px}
.hall-detail-close{position:absolute;top:6px;right:6px;display:grid;place-items:center;width:44px;height:44px;border:1px solid #b99b6566;border-radius:7px;background:#111c28;color:#e9d3ab;font:400 24px/1 system-ui;cursor:pointer}
.hall-detail-close:focus-visible{outline:2px solid #ffda94;outline-offset:1px}
@keyframes hall-inspector-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media(orientation:landscape) and (max-height:600px){
  .hall-detail--floating{inset-inline:auto max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));bottom:max(8px,env(safe-area-inset-bottom));width:min(44vw,330px);max-width:calc(100vw - max(8px,env(safe-area-inset-left)) - max(8px,env(safe-area-inset-right)));max-height:none;padding:9px;gap:5px;border-radius:10px;animation-name:hall-inspector-side}
  .hall-detail--floating .hall-detail-heading img{width:36px;height:36px;flex-basis:36px}
}
@keyframes hall-inspector-side{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.hall-detail--floating{animation:none}}
:global([data-es2-reduce-motion="true"] .hall-detail--floating){animation:none}

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
.hall-success{display:grid;gap:3px;line-height:1.35;overflow-wrap:anywhere;margin:0}
.hall-ceremony-label{font-weight:700;color:#dcefbf}
.hall-unlock-notice{font-size:.78rem;color:#f3d498;animation:hall-notice .35s .68s ease-out both}
@keyframes hall-notice{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.hall-node[data-hall-arrived="true"] .hall-rank,.hall-unlock-notice{animation:none!important}}
:global([data-es2-reduce-motion="true"] .hall-node[data-hall-arrived="true"] .hall-rank),
:global([data-es2-reduce-flashing="true"] .hall-node[data-hall-arrived="true"] .hall-rank),
:global([data-es2-reduce-motion="true"] .hall-unlock-notice),
:global([data-es2-reduce-flashing="true"] .hall-unlock-notice){animation:none!important}

/* Permanent earned crest: same footprint and artwork, independent of hover, selection,
   preview, affordability and the transient transaction celebration. */
.hall-completion-crest{position:absolute;inset:-3px;z-index:3;border:1px solid #dab87a;border-radius:50%;pointer-events:none;box-shadow:0 0 0 1px #493620,inset 0 0 0 1px #fff1b847}
.hall-completion-crest::before,.hall-completion-crest::after{content:'';position:absolute;top:40%;width:7px;height:15px;background:linear-gradient(135deg,#fff1bd 4%,#b98c43 44%,#79512a 68%,#e4c58b);clip-path:polygon(100% 0,100% 100%,0 50%);left:-4px}
.hall-completion-crest::after{left:auto;right:-4px;transform:rotate(180deg)}
.hall-completion-crest i{position:absolute;top:-4px;left:50%;width:10px;height:10px;transform:translateX(-50%) rotate(45deg);border:1px solid #fff0b7;background:linear-gradient(135deg,#fff2c2,#b78a49 50%,#6d4728);box-shadow:0 0 3px #20170f}
.hall-node[data-hall-completion="mastered"] .hall-ring{background:conic-gradient(#fff2c4,#b48747 19%,#ffe9ab 39%,#9a6932 64%,#efcf87 83%,#fff2c4);box-shadow:0 0 0 1px #271b11,0 0 0 3px #ad864c,0 0 10px #e3b96a55,inset 0 1px 2px #fff2c0}
.hall-node[data-hall-completion="mastered"] .hall-ring-metal{background:conic-gradient(from 0deg,#fff1bc 0 var(--hall-rank-progress),#333e48 var(--hall-rank-progress) 100%);box-shadow:inset 0 0 0 1px #65451f,inset 0 1px 2px #fff5c6}
.hall-node[data-hall-completion="mastered"] .hall-ring::before{background:radial-gradient(ellipse at 42% 25%,#58462f,#17232d 72%);border-color:#e8c783}
.hall-node[data-hall-completion="mastered"] .hall-rank{min-width:38px;background:linear-gradient(#fff0bc,#d7ad62 52%,#a77537);color:#302010;border-color:#fff0bd;text-shadow:none;letter-spacing:.07em}
.hall-node[data-hall-completion="mastered"] .hall-status{color:#f7d99b;font-weight:800}
.hall-node[data-hall-completion="mastered"] .hall-inspect strong{color:#f3d9ab}
.hall-node[data-hall-completion="mastered"][data-selected="true"] .hall-ring{box-shadow:0 0 0 1px #fff0bb,0 0 0 3px #c8a260,0 0 15px #e3b96a80,inset 0 1px 2px #fff2c0}
.hall-node[data-hall-completion="unlocked"] .hall-completion-crest{inset:-2px;border-color:#c9b28b}
.hall-node[data-hall-completion="unlocked"] .hall-completion-crest::before,.hall-node[data-hall-completion="unlocked"] .hall-completion-crest::after{display:none}
.hall-node[data-hall-completion="unlocked"] .hall-completion-crest i{background:linear-gradient(135deg,#f4e6c6,#9d8359);width:8px;height:8px}
.hall-detail[data-hall-detail-completion="mastered"]{border-color:#c7a66c}
.hall-detail-max-mark{color:#f4d99e;font-weight:800;letter-spacing:.08em}
.hall-detail[data-hall-detail-completion="mastered"] .hall-confirm:disabled{color:#e4c890;border-color:#b69b65;background:linear-gradient(150deg,#463c2d,#232c32);cursor:default}
/* Only a locally committed last rank animates the crest. Saved maxed nodes stay still. */
.hall-node[data-hall-completion="mastered"]:has(.hall-upgrade-fx[data-milestone="true"]) .hall-completion-crest{animation:hall-mastered-forge .92s .36s ease-out both}
.hall-node[data-hall-completion="mastered"]:has(.hall-upgrade-fx[data-milestone="true"]) .hall-rank{animation:hall-mastered-inscription .52s .64s ease-out both}
@keyframes hall-mastered-forge{0%{opacity:.25;transform:scale(1.18) rotate(-15deg)}48%{opacity:1;transform:scale(1.04) rotate(0deg);box-shadow:0 0 9px #efd197aa}100%{opacity:1;transform:none}}
@keyframes hall-mastered-inscription{0%{transform:translateX(-50%) scale(.9);filter:brightness(.9)}45%{transform:translateX(-50%) scale(1.08);filter:brightness(1.12)}100%{transform:translateX(-50%) scale(1);filter:none}}
@media(prefers-reduced-motion:reduce){.hall-completion-crest,.hall-rank{animation:none!important}}
:global([data-es2-reduce-motion="true"] .hall-completion-crest),
:global([data-es2-reduce-motion="true"] .hall-rank),
:global([data-es2-reduce-flashing="true"] .hall-completion-crest),
:global([data-es2-reduce-flashing="true"] .hall-rank){animation:none!important}

/* Three finite silhouettes, sharing the committed purchase event. */
.hall-ritual{position:absolute;left:50%;top:calc(var(--hall-medallion)/2 + 5px);width:var(--hall-medallion);aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none}
.hall-ritual-ray,.hall-ritual-seal{position:absolute;inset:-12%;opacity:0;display:block}
.hall-ritual[data-hall-ritual="keystone"] .hall-ritual-ray{border:2px solid #e9b86a;clip-path:polygon(0 0,100% 0,100% 28%,0 28%);animation:hall-forge-ray .7s ease-out both}
.hall-ritual[data-hall-ritual="keystone"] .hall-ritual-ray:nth-child(2){rotate:180deg}
.hall-ritual[data-hall-ritual="keystone"] .hall-ritual-seal{border:2px solid #ffdf99;transform:rotate(45deg);animation:hall-seal .85s .33s ease-out both}
.hall-ritual[data-hall-ritual="signature"] .hall-ritual-ray{inset:2% -28%;background:linear-gradient(110deg,transparent 35%,#e2fff9 48%,#9adcd8 50%,transparent 60%);clip-path:polygon(0 0,100% 35%,100% 50%,0 15%);animation:hall-blade-in .62s ease-out both}
.hall-ritual[data-hall-ritual="signature"] .hall-ritual-ray:nth-child(2){rotate:180deg;animation-delay:.1s}
.hall-ritual[data-hall-ritual="signature"] .hall-ritual-seal{border:2px solid #b9eee8;border-radius:24% 50%;animation:hall-seal .9s .38s ease-out both}
.hall-ritual[data-hall-ritual="resonance"] .hall-ritual-ray{inset:38% -45%;background:linear-gradient(90deg,transparent,#bcb1ff,#f5e7ff);clip-path:polygon(0 35%,85% 35%,100% 50%,85% 65%,0 65%);animation:hall-converge .68s ease-in-out both}
.hall-ritual[data-hall-ritual="resonance"] .hall-ritual-ray:nth-child(2){rotate:180deg;filter:hue-rotate(55deg)}
.hall-ritual[data-hall-ritual="resonance"] .hall-ritual-seal{border:2px solid #e9ddff;border-radius:34%;box-shadow:0 0 12px #c1a6ed;animation:hall-seal .72s .64s ease-out both}
@keyframes hall-forge-ray{0%{opacity:0;transform:translateY(-20px) scale(1.35)}45%{opacity:.9}100%{opacity:0;transform:translateY(0) scale(.9)}}
@keyframes hall-blade-in{0%{opacity:0;transform:translateX(-30px) rotate(-15deg)}45%{opacity:.85}100%{opacity:0;transform:translateX(24px) rotate(12deg)}}
@keyframes hall-converge{0%{opacity:0;transform:translateX(-45px) scaleX(.6)}35%{opacity:.95}90%{opacity:.7;transform:translateX(0) scaleX(.24)}100%{opacity:0;transform:scaleX(0)}}
@keyframes hall-seal{0%{opacity:0;scale:.75}35%{opacity:.9}100%{opacity:0;scale:1.55}}
@media(prefers-reduced-motion:reduce){.hall-ritual{display:none!important}}
:global([data-es2-reduce-motion="true"] .hall-ritual),:global([data-es2-reduce-flashing="true"] .hall-ritual){display:none!important}

.hall-growth--floating{grid-template-columns:minmax(0,1fr)}
.hall-inspect{box-sizing:border-box}
.hall-ring{box-sizing:border-box}
.hall-map{isolation:isolate}
.hall-upgrade-fx,.hall-upgrade-fx *{pointer-events:none}
.hall-ritual{max-width:100%}
@media(orientation:landscape) and (max-height:360px){.hall-detail--floating{padding:8px;gap:4px}.hall-detail--floating .hall-detail-heading img{width:30px;height:30px;flex-basis:30px}}
</style>
