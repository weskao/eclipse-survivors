<script setup lang="ts">
import type { UpgradeDef, UpgradeId } from '../game/types'

defineProps<{ active: boolean; upgrades: readonly UpgradeDef[] }>()
const emit = defineEmits<{ choose: [id: UpgradeId] }>()
</script>

<template>
  <div id="level" class="overlay" :class="{ active }"><div class="panel"><div class="kicker">LEVEL UP · CHOOSE YOUR BLESSING</div><h2>獲得新的命運刻印</h2><div class="cards" id="upgrades"><button v-for="(u, i) in upgrades" :key="u.id" class="upgrade" :data-up="u.id" @click="emit('choose', u.id)"><span class="portrait">{{ u.icon }}</span><strong>{{ u.title }}</strong><small>{{ u.desc }}</small><small style="opacity:.7;margin-top:6px">按 {{ i + 1 }} 選擇</small></button></div><p>選擇其中一項能力後繼續冒險</p></div></div>
</template>
