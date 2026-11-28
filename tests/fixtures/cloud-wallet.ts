import { createApp } from 'vue'
import App from '../../src/App.vue'
import { createEngine } from '../../src/game/engine'
import { MODES } from '../../src/meta/modes'
import '../../src/style.css'

if (!import.meta.env.DEV || import.meta.env.VITE_ES2_FIREBASE_EMULATOR !== '1' || location.hostname !== '127.0.0.1')
  throw Error('Cloud QA fixture is only available in the local emulator')
const engine = createEngine()
createApp(App, { engine }).mount('#app')
Object.assign(window, { __cloudQa: {
  balance: () => engine.ui.profile.embers,
  finish() {
    if (engine.state.mode !== 'play') throw Error('Start the real game before settling a run')
    // Deterministic timed victory exercises the real game settlement and result UI.
    engine.state.time = MODES[engine.state.runMode].duration ?? 300
    engine.state.kill = 100
    engine.state.bossSpawned = true
    engine.state.bossDefeated = true
    engine.advance(1 / 60)
  },
  spend: () => engine.purchaseResearch('power'),
} })
