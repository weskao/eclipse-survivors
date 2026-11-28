import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setLocale } from '../../../i18n'
import type { RunStats } from '../../../meta/types'
import Es2Result from './Es2Result.vue'

const run: RunStats = { id:'result-a', mode:'quick', hero:'knight', victory:true, seconds:150,
  kills:960, level:19, damageDealt:1834502, damageTaken:400, remainingHp:50,
  bossDefeated:true, enemies:{}, abilities:[], xpEarned:400, firstUpgradeSeconds:8.2 }
const frames = new Map<number, FrameRequestCallback>()
let serial = 0
function clock() {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  setLocale('en')
}
async function advance(time: number) {
  const pending = [...frames.values()]; frames.clear()
  pending.forEach(callback => callback(time)); await nextTick()
}
const root = () => document.body.querySelector<HTMLElement>('.es2-result')!
const value = (id: string) => root().querySelector<HTMLElement>('[data-result-stat="' + id + '"] b')!
const setup = (victory: boolean, still = false) => mount(Es2Result, { attachTo: document.body,
  props:{active:true,ending:'',summary:'',result:{...run,victory},rewards:{embers:120,newAchievements:[],newCosmetics:[]},still} })
afterEach(() => { frames.clear(); vi.unstubAllGlobals(); setLocale('zh-TW'); document.body.innerHTML = '' })
describe('result reveal and navigation', () => {
  it.each([true,false])('settles all values immediately on click (victory=%s)', async victory => {
    clock(); const w=setup(victory)
    try {
      expect(value('kills').textContent).toBe('0')
      await advance(100); await advance(600)
      expect(Number(value('kills').textContent)).toBeGreaterThan(0)
      expect(Number(value('kills').textContent)).toBeLessThan(960)
      root().click(); await nextTick()
      expect(value('kills').textContent).toBe('960')
      expect(value('damage').textContent).toBe('1,834,502')
      expect(value('first-upgrade').textContent).toBe('8.2s')
      expect(root().querySelector('[data-result-reward]')?.textContent).toBe('120')
      expect(root().hasAttribute('data-result-revealing')).toBe(false)
      expect(frames.size).toBe(0)
      await w.setProps({active:false}); await w.setProps({active:true})
      expect(value('kills').textContent).toBe('960')
      await w.setProps({result:{...run,id:'result-b',victory}})
      expect(value('kills').textContent).toBe('0')
      document.body.querySelector<HTMLButtonElement>('.es2-dialog-actions .es2-secondary')!.click()
      await nextTick()
      expect(w.emitted('home')).toHaveLength(1)
      expect(frames.size).toBe(0)
    } finally {w.unmount()}
  })
  it('finishes naturally and honors still presentation', async () => {
    clock(); const w=setup(true)
    try {
      await advance(100); await advance(2000)
      expect(value('kills').textContent).toBe('960')
      expect(frames.size).toBe(0)
      await w.setProps({result:{...run,id:'result-c'},still:true})
      expect(value('damage').textContent).toBe('1,834,502')
      expect(frames.size).toBe(0)
      document.body.querySelector<HTMLButtonElement>('.es2-dialog-actions .es2-primary')!.click()
      expect(w.emitted('again')).toHaveLength(1)
    } finally {w.unmount()}
  })
})
