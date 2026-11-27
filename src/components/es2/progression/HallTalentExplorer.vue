<script setup lang="ts">
import { computed, ref, nextTick, watch, onBeforeUnmount } from 'vue'
import { currentLocale, t } from '../../../i18n'
import { hallPrerequisiteRoute, HALL_GROUPS, hallTalentGroup, hallTalent, hallTalentCost, hallTalentEligible } from '../../../game/content/meta/hall-talents'
import { hallRankValues, type RankValue } from '../../../game/content/meta/hall-rank-values'
import { resolveHallRunSnapshot } from '../../../game/content/meta/hall-state'
import { RESEARCH } from '../../../game/content/meta/catalog'
import type { MetaState } from '../../../game/content/meta/state'
import HallGrowthBoard from './HallGrowthBoard.vue'
import type { HallNode } from './hall-model'

const props = withDefaults(defineProps<{ state: MetaState; hero: string; writable?: boolean }>(), {writable:false})
const emit = defineEmits<{ purchase: [id:string, rank:number]; attune: [universal:string[], signature:string|null, resonance:string|null]; corePrerequisite: [id:string] }>()
const live = computed(() => props.writable && props.state.version === 4 && !!props.state.hall && !props.state.cloudWallet)
const ownership = computed(() => props.state.hall?.ownership ?? {})
const equipped = computed(() => props.state.hall?.attunement)
const selectedSignature = computed(() => equipped.value?.hero[props.hero] ?? null)
const activeRanks=computed(()=>resolveHallRunSnapshot(props.state,props.hero).ranks)
const allSlots=computed(()=>[...(equipped.value?.universal??[]),selectedSignature.value,equipped.value?.resonance].filter((id):id is string=>!!id))
function clearSlot(id:string){if(!live.value)return;requestAttune((equipped.value?.universal??[]).filter(x=>x!==id),selectedSignature.value===id?null:selectedSignature.value,equipped.value?.resonance===id?null:equipped.value?.resonance??null)}
const selectable = computed(() => hallTalentGroup(group.value.id).filter(n => n.maxRank === 1 && ownership.value[n.id] === 1 && (tree.value !== 'hero' || n.group === props.hero)))
function toggleAttunement(id:string) {
  if (!live.value || !selectable.value.some(n=>n.id===id)) return
  let universal = [...(equipped.value?.universal ?? [])]
  let signature = selectedSignature.value
  let resonance = equipped.value?.resonance ?? null
  if (tree.value === 'discipline') {
    if (universal.includes(id)) universal = universal.filter(x=>x!==id)
    else if (universal.length < 2) universal.push(id)
    else return
  } else if (tree.value === 'hero') signature = signature === id ? null : id
  else resonance = resonance === id ? null : id
  requestAttune(universal, signature, resonance)
}
type AttuneEffect={id:string;kind:'keystone'|'signature'|'resonance'|'release';serial:number}
const attuneFx=ref<AttuneEffect|null>(null)
let pending:{hero:string;key:string;effect:AttuneEffect}|null=null
let timer:ReturnType<typeof setTimeout>|undefined
let pendingTimer:ReturnType<typeof setTimeout>|undefined
let serial=0
const selectionKey=(universal:readonly string[],signature:string|null,resonance:string|null)=>JSON.stringify([universal,signature,resonance])
const committedKey=computed(()=>selectionKey(equipped.value?.universal??[],selectedSignature.value,equipped.value?.resonance??null))
function requestAttune(universal:string[],signature:string|null,resonance:string|null){
  const key=selectionKey(universal,signature,resonance)
  if(key===committedKey.value)return
  const newUniversal=universal.find(id=>!equipped.value?.universal.includes(id))
  const newSignature=signature&&signature!==selectedSignature.value?signature:null
  const newResonance=resonance&&resonance!==equipped.value?.resonance?resonance:null
  const removed=allSlots.value.find(id=>!universal.includes(id)&&id!==signature&&id!==resonance)
  const id=newResonance??newSignature??newUniversal??removed
  if(!id)return
  pending={hero:props.hero,key,effect:{id,kind:newResonance?'resonance':newSignature?'signature':newUniversal?'keystone':'release',serial:++serial}}
  emit('attune',universal,signature,resonance)
  // Only the matching committed selection can acknowledge this request.
  clearTimeout(pendingTimer)
  pendingTimer=setTimeout(()=>{pending=null},250)
}
watch(committedKey,key=>{
  if(!pending)return
  if(pending.hero!==props.hero||pending.key!==key||!live.value){pending=null;return}
  attuneFx.value=pending.effect
  pending=null
  clearTimeout(timer)
  timer=setTimeout(()=>{attuneFx.value=null},1050)
})
watch(()=>props.hero,()=>{pending=null;attuneFx.value=null;clearTimeout(timer)})
onBeforeUnmount(()=>{clearTimeout(timer);clearTimeout(pendingTimer)})
const activeChoice = (id:string) => equipped.value?.universal.includes(id) || selectedSignature.value === id || equipped.value?.resonance === id
const trees = ['discipline','hero','synergy'] as const
type Tree = typeof trees[number]
const tree = ref<Tree>('discipline')
const selections = ref<Record<Tree,string>>({discipline:'offense',hero:props.hero,synergy:'synergy'})
const view = ref<'graph'|'list'>('graph')
const query = ref('')
const groupNav = ref<HTMLElement|null>(null)
const treeNav = ref<HTMLElement|null>(null)
const growthBoard=ref<InstanceType<typeof HallGrowthBoard>|null>(null)
const locale = currentLocale
const localized = (zh:string,en:string) => locale.value === 'en' ? en : zh
const tabs = computed(() => [
  {id:'discipline' as const,name:localized('共通能力','Disciplines')},
  {id:'hero' as const,name:localized('英雄專屬','Hero paths')},
  {id:'synergy' as const,name:localized('跨樹共鳴','Resonance')},
])
const groups = computed(() => HALL_GROUPS.filter(group => group.kind === tree.value))
const group = computed(() => groups.value.find(g => g.id === selections.value[tree.value]) ?? groups.value[0]!)
const glyphs: Record<string,string> = {sword:'offense-edge',shield:'defense-armor',star:'arcana-focus',wind:'mobility-stride',gem:'hunt-salvage',spirit:'summons-bond',arrow:'ranger-aim',dagger:'shadowblade-blade',heart:'crimson-paladin-oath',link:'synergy-blade-and-bastion'}
const art = import.meta.glob<string>('/src/assets/es4/hall/*.{svg,webp}', {eager:true,query:'?url',import:'default'})
const image = (id:string) => {const a=hallTalent(id)?.art;return a? (a.status==='approved'?art['/'+a.futureWebp]:undefined)??art['/'+a.temporarySvg]??'':''}
const definitions = computed(() => hallTalentGroup(group.value.id))
const title = (id:string) => {
  const node = hallTalent(id)
  return node ? localized(node.name,node.nameEn) : t(RESEARCH.find(r=>r.id===id)?.title ?? id)
}
function rankValueText(values: RankValue[] | undefined): string | undefined {
  return values?.map(({value,unit}) => {
    const amount = (value>0?'+':'')+value
    if(unit==='hp')return amount+' HP'
    if(unit==='count')return t('{value} 次重擲',{value})
    if(unit==='points')return t('{value} 個百分點',{value:amount})
    return amount+'%'
  }).join(' / ')
}
const nodes = computed<HallNode[]>(() => {
  const term = query.value.trim().toLocaleLowerCase()
  return definitions.value.filter(n=>!term || [n.name,n.nameEn,n.effect,n.effectEn].some(s=>s.toLocaleLowerCase().includes(term))).map(n=>({
    id:n.id, kind:'research', title:localized(n.name,n.nameEn),
    description:localized(n.effect,n.effectEn), art:image(n.id), rank:ownership.value[n.id] ?? 0, maxRank:n.maxRank,
    cost:hallTalentCost(n.id,ownership.value[n.id] ?? 0), locked:!hallTalentEligible(n.id,props.state,ownership.value,props.hero),
    canBuy:live.value && hallTalentEligible(n.id,props.state,ownership.value,props.hero) && props.state.embers >= (hallTalentCost(n.id,ownership.value[n.id] ?? 0) ?? Infinity),
    talentType:n.maxRank>1?'rank':tree.value==='hero'?'signature':tree.value==='synergy'?'resonance':'keystone',
    attunementStatus: n.maxRank===1 && ownership.value[n.id] ? activeRanks.value[n.id] ? localized('生效中','Active') : activeChoice(n.id) ? localized('已配置 · 未生效','Equipped · inactive') : localized('已擁有 · 未配置','Owned · unequipped') : undefined,
    current:rankValueText(hallRankValues(n.id,ownership.value[n.id]??0)?.current),
    next:rankValueText(hallRankValues(n.id,ownership.value[n.id]??0)?.next??undefined),
    requires:n.requires.map(req=>({...req,title:title(req.id)})),
    requirements:[...n.requires.map(req=>title(req.id)+' · Lv. '+req.rank),...(n.masteryGate?[localized('英雄專精','Hero mastery')+' · Lv. '+n.masteryGate]:[])],
  }))
})
async function jumpToPrerequisite(id:string) {
  const target=hallPrerequisiteRoute(id)
  if(!target)return
  if(target.tree==='core'){emit('corePrerequisite',id);return}
  tree.value=target.tree
  selections.value[target.tree]=target.group
  query.value=''
  await nextTick()
  await growthBoard.value?.focusNode(id)
}
function selectTree(id:Tree){tree.value=id;query.value=''}
function selectGroup(id:string){selections.value[tree.value]=id;query.value=''}
function move(event:KeyboardEvent, ids:readonly string[], id:string, select:(id:string)=>void, root:HTMLElement|null, attr:string){
  const index=ids.indexOf(id)
  const next=event.key==='Home'?0:event.key==='End'?ids.length-1:event.key==='ArrowRight'||event.key==='ArrowDown'?(index+1)%ids.length:event.key==='ArrowLeft'||event.key==='ArrowUp'?(index+ids.length-1)%ids.length:-1
  if(next<0||!ids[next])return
  event.preventDefault()
  select(ids[next]!)
  void nextTick(()=>root?.querySelector<HTMLElement>('['+attr+'="'+ids[next]+'"]')?.focus({preventScroll:true}))
}
function changeTree(id:string){if(trees.some(x=>x===id))selectTree(id as Tree)}
</script>
<template>
  <section class="es4-constellation" :style="{'--es4-accent':group.color}" :aria-label="localized('暮蝕昇華技能樹','Eclipse Ascendancy talent trees')">
    <header class="es4-heading">
      <div><small>✧ ECLIPSE ASCENDANCY</small><h3>{{ localized('暮蝕昇華','Eclipse Ascendancy') }}</h3></div>
      <span class="es4-preview">{{ live ? localized('隔離測試','Isolated playtest') : localized('規劃預覽','Design preview') }}</span>
    </header>
    <div ref="treeNav" class="es4-tree-nav" role="tablist" :aria-label="localized('技能分類','Talent category')">
      <button v-for="tab in tabs" :key="tab.id" :data-es4-tree="tab.id" type="button" role="tab" :aria-selected="tree===tab.id" :tabindex="tree===tab.id?0:-1" data-ui-sfx="select" @click="selectTree(tab.id)" @keydown="move($event,trees,tab.id,changeTree,treeNav,'data-es4-tree')">{{ tab.name }}</button>
    </div>
    <div ref="groupNav" class="es4-medallions" role="tablist" :aria-label="localized('選擇路線','Select path')">
      <button v-for="entry in groups" :key="entry.id" :data-es4-discipline="entry.id" type="button" role="tab" :aria-selected="group.id===entry.id" :tabindex="group.id===entry.id?0:-1" :style="{'--medal-color':entry.color}" data-ui-sfx="select" @click="selectGroup(entry.id)" @keydown="move($event,groups.map(g=>g.id),entry.id,selectGroup,groupNav,'data-es4-discipline')">
        <span class="es4-medal"><img :src="image(glyphs[entry.motif]??'arcana-focus')" width="36" height="36" alt=""/></span><span>{{ localized(entry.name,entry.nameEn) }}</span>
      </button>
    </div>
    <div class="es4-tools">
      <h4>{{ localized(group.name,group.nameEn) }} <small>{{ definitions.length }} {{ localized('節點','nodes') }}</small></h4>
      <div class="es4-view" role="group" :aria-label="localized('檢視方式','View mode')">
        <button type="button" data-ui-sfx="select" :aria-pressed="view==='graph'" @click="view='graph'">{{ localized('路線','Graph') }}</button>
        <button type="button" data-ui-sfx="select" :aria-pressed="view==='list'" @click="view='list'">{{ localized('列表','List') }}</button>
      </div>
      <input v-if="view==='list'" v-model="query" type="search" :aria-label="localized('搜尋技能','Search talents')" :placeholder="localized('搜尋技能','Search talents')"/>
    </div>
    <p v-if="!live" class="es4-notice">{{ localized('新能力尚未開放購買。預覽不會消耗餘燼，既有研究仍可正常升級。','New talents are not yet purchasable. Preview never spends embers; original research remains available.') }}</p>
    <HallGrowthBoard v-if="nodes.length" ref="growthBoard" :key="group.id" navigable-requirements @prerequisite="jumpToPrerequisite" :nodes="nodes" :tree="view==='graph' && tree!=='synergy'" :writable="live" :preview="!live" :class="{'es4-list':view==='list'}" @purchase="emit('purchase',$event.id,$event.rank)"/>
    <p v-else role="status">{{ localized('沒有符合的技能','No matching talents') }}</p>
    <section v-if="live" class="es4-attunement" :aria-label="localized('調律','Attunement')">
      <h4>{{ localized('調律配置','Attunement') }} · {{ equipped?.universal.length ?? 0 }}/2 · {{ selectedSignature ? 1 : 0 }}/1 · {{ equipped?.resonance ? 1 : 0 }}/1</h4>
      <p class="es4-notice">{{ localized('共通終極 2、英雄招牌 1、跨樹共鳴 1。只影響下一場遠征；共鳴需配戴兩個指定終極。','Two universal keystones, one hero signature and one resonance. Next run only; a resonance requires both specified keystones.') }}</p>
      <div class="es4-attune-status">
      <div v-if="attuneFx" :key="attuneFx.serial" class="es4-attune-feedback" :data-hall-attunement-fx="attuneFx.kind" role="status"><img :src="image(attuneFx.id)" alt="" width="28" height="28"/><span>{{ title(attuneFx.id) }} · {{ attuneFx.kind==='release'?localized('已解除調律','Attunement released'):localized('配置已更新','Attunement updated') }}</span><i aria-hidden="true"></i></div>
        <span v-else class="es4-attune-idle">{{ localized('調律僅於下一場遠征生效','Attunement applies on the next run') }}</span>
      </div>
      <div class="es4-slots"><button v-for="id in allSlots" :key="id" type="button" class="es4-equip" :data-es4-active-slot="id" :aria-label="localized('卸下 ','Unequip ')+title(id)" @click="clearSlot(id)">{{ title(id) }} · {{ activeRanks[id] ? localized('生效中','Active') : localized('條件未滿足','Inactive') }} ×</button></div>
      <button v-for="node in selectable" :key="node.id" type="button" class="es4-equip" :data-es4-attune="node.id" :aria-pressed="!!activeChoice(node.id)" :disabled="tree==='discipline' && !activeChoice(node.id) && (equipped?.universal.length ?? 0)>=2" @click="toggleAttunement(node.id)">{{ localized(node.name,node.nameEn) }} · {{ activeChoice(node.id) ? (activeRanks[node.id] ? localized('生效中','Active') : localized('已配置 · 未生效','Equipped · inactive')) : localized('配置','Equip') }}</button>
    </section>
  </section>
</template>
<style scoped>
.es4-constellation{color:#e8d8bd;min-width:0;background:radial-gradient(ellipse at 50% 0%,#28374766,transparent 65%);border-top:1px solid #a58a5355;padding:12px 0;animation:es4-enter .2s ease-out both}
.es4-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.es4-heading h3{margin:3px 0;color:#edcf98;font-size:clamp(1rem,2.2vw,1.4rem);letter-spacing:.045em}
.es4-heading small{color:#b9a17a;font:600 .65rem system-ui;letter-spacing:.12em}
.es4-preview{font:600 .72rem system-ui;color:#c0b69e;border-bottom:1px solid #9b8761;padding:4px}
.es4-tree-nav{display:flex;align-items:stretch;gap:4px;border-bottom:1px solid #94794e55}
.es4-tree-nav button{flex:1;min-width:0;min-height:44px;padding:6px;border:0;border-bottom:2px solid transparent;background:none;color:#b9c1c9;font:600 .82rem/1.3 system-ui;cursor:pointer;overflow-wrap:anywhere}
.es4-tree-nav button[aria-selected=true]{color:#f3d69e;border-color:#e4be7b;background:linear-gradient(0deg,#dfb77218,transparent)}
.es4-medallions{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:12px 0}
.es4-medallions button{border:0;background:none;min-width:0;min-height:44px;color:#b8c3cd;display:grid;justify-items:center;align-content:start;gap:5px;padding:4px 2px;font:600 .77rem/1.3 system-ui;text-align:center;overflow-wrap:anywhere;cursor:pointer}
.es4-medal{display:grid;place-items:center;width:48px;max-width:100%;aspect-ratio:1;border-radius:50%;background:radial-gradient(ellipse at 43% 25%,#364755,#101924 78%);border:2px solid var(--medal-color);box-shadow:0 0 0 2px #161e27,inset 0 0 8px #0009;transition:transform .17s,box-shadow .17s}
.es4-medal img{width:76%;height:76%;object-fit:contain}
.es4-medallions button[aria-selected=true]{color:#f3d69e}
.es4-medallions button[aria-selected=true] .es4-medal{border-color:#f3d69e;box-shadow:0 0 0 2px #7a6041,0 0 11px var(--medal-color),inset 0 0 8px #0009}
.es4-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.es4-tools h4{margin:0;color:var(--es4-accent);font:700 .9rem system-ui}
.es4-tools h4 small{font:400 .72rem system-ui;color:#b5bec5}
.es4-view{display:flex;gap:2px;border:1px solid #a58a5355;border-radius:999px;padding:2px}
.es4-view button{min-height:40px;min-width:44px;padding:4px 12px;border:0;border-radius:999px;background:none;color:#bdc6ce;font:600 .76rem system-ui;cursor:pointer}
.es4-view button[aria-pressed=true]{background:#b18b4b30;color:#f8dca2}
.es4-tools input{min-height:44px;width:100%;border:1px solid #927b55;border-radius:6px;background:#101923;color:#ebdfcc;padding:8px;font:inherit}
.es4-attunement{border-top:1px solid #94794e55;padding:10px 0;margin-top:12px}.es4-attunement h4{color:#edcf98;margin:0}.es4-equip{min-height:44px;margin:4px;padding:6px 10px;border:1px solid #927b55;background:#18232e;color:#e8d8bd;border-radius:6px}.es4-equip[aria-pressed=true]{border-color:#f3d69e;background:#54452f}.es4-equip:disabled{opacity:.55}
.es4-notice{font:400 .76rem/1.45 system-ui;color:#c1b49a;margin:8px 0 10px}
.es4-constellation :deep(.hall-confirm){border-radius:4px 14px;background:linear-gradient(150deg,#54452f,#252d35);border-color:#8f7850}
.es4-constellation :deep(.hall-confirm:disabled){color:#b6b9bb;background:#252e35}
.es4-constellation :deep(.hall-ring-metal){box-shadow:inset 0 0 0 1px #111b25,inset 0 2px 4px #0009}
.es4-list :deep(.hall-row){grid-template-columns:1fr}
.es4-list :deep(.hall-inspect){display:grid;grid-template-columns:58px minmax(0,1fr);text-align:start;align-items:center;gap:5px 12px}
.es4-list :deep(.hall-ring){grid-row:span 2;width:48px;margin:2px 0 8px}
.es4-constellation button:focus-visible,.es4-tools input:focus-visible{outline:2px solid #ffde9d;outline-offset:2px}
@media(hover:hover) and (pointer:fine){.es4-medallions button:hover .es4-medal{transform:translateY(-2px);box-shadow:0 0 0 2px #a08454,0 0 12px var(--medal-color)}}
@media(max-width:480px){.es4-medallions{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.es4-medal{width:44px}.es4-tree-nav button{font-size:.76rem}}
@keyframes es4-enter{from{opacity:.7;transform:translateY(3px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.es4-constellation,.es4-medal{animation:none!important;transition:none!important;transform:none!important}}
:global([data-es2-reduce-motion="true"] .es4-constellation),:global([data-es2-reduce-flashing="true"] .es4-constellation){animation:none!important}
:global([data-es2-reduce-motion="true"] .es4-medal),:global([data-es2-reduce-flashing="true"] .es4-medal){transition:none!important;transform:none!important}

.es4-slots{display:flex;flex-wrap:wrap;gap:5px}
.es4-equip{position:relative;max-width:100%;overflow-wrap:anywhere;cursor:pointer;background:linear-gradient(145deg,#263744,#151e29);box-shadow:inset 0 1px #ffffff13,0 2px 5px #0005}
.es4-equip[aria-pressed=true]{border-color:#e9cf96;background:linear-gradient(145deg,#5c492e,#2d302d);color:#fff0cc}
.es4-equip:focus-visible{outline:2px solid #fff1bf;outline-offset:2px}
.es4-attune-feedback{position:relative;isolation:isolate;display:flex;align-items:center;gap:8px;overflow:hidden;min-height:34px;padding:5px 9px;margin:0;color:#e9dbb6;background:linear-gradient(115deg,#302b22,#182a37);border:1px solid #ba9863;border-radius:7px;font-size:.8rem;overflow-wrap:anywhere}
.es4-attune-feedback img{flex:none;object-fit:contain}
.es4-attune-feedback i{position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 32%,#ffdf9c55 50%,transparent 68%);animation:es4-attune-sweep .85s ease-out both;z-index:-1}
.es4-attune-feedback[data-hall-attunement-fx=signature]{border-color:#a4ddd4;color:#c8eee8}
.es4-attune-feedback[data-hall-attunement-fx=resonance]{border-color:#c2a7ef;color:#e5d7ff}
.es4-attune-feedback[data-hall-attunement-fx=resonance] i{background:linear-gradient(90deg,transparent,#ceb5ff66,transparent);animation-name:es4-attune-converge}
.es4-attune-feedback[data-hall-attunement-fx=release]{border-color:#8997a4;background:#17232c;color:#cbd3da}
.es4-attune-feedback[data-hall-attunement-fx=release] i{animation-direction:reverse}
@keyframes es4-attune-sweep{0%{transform:translateX(-100%);opacity:0}40%{opacity:1}100%{transform:translateX(100%);opacity:0}}
@keyframes es4-attune-converge{0%{transform:scaleX(2);opacity:0}40%{opacity:1}100%{transform:scaleX(0);opacity:0}}
@media(prefers-reduced-motion:reduce){.es4-attune-feedback i{display:none!important}}
:global([data-es2-reduce-motion="true"] .es4-attune-feedback i),:global([data-es2-reduce-flashing="true"] .es4-attune-feedback i){display:none!important}

.es4-attune-status{min-height:52px;display:grid;align-items:center;margin-block:7px;min-width:0}
.es4-attune-idle{font-size:.76rem;color:#b8c3cd;padding-inline:9px}
.es4-attune-feedback{box-sizing:border-box;width:100%;min-width:0}
.es4-attune-feedback span{min-width:0}
.es4-equip{box-sizing:border-box;min-width:0;max-width:calc(100% - 8px)}
@media(max-width:360px){.es4-attune-status{min-height:64px}.es4-equip{margin:2px;max-width:calc(100% - 4px)}}
</style>
