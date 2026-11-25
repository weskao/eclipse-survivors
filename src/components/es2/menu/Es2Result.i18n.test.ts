import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setLocale, t } from '../../../i18n'
import type { RunStats } from '../../../meta/types'
import Es2Result from './Es2Result.vue'

const storage = { getItem: () => null, setItem: () => {} }
afterEach(() => { setLocale('zh-TW', storage); document.body.innerHTML = '' })

const result = {
  id: 'localization-01', mode: 'quick', hero: 'knight', victory: true,
  seconds: 68, kills: 12, level: 4,
  damageDealt: 2000, damageTaken: 200, remainingHp: 50,
} as RunStats

describe('result celebration rendering contract', () => {
  it('contains short one-shot animations and a reduced-motion alternative', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/result-celebration.css'), 'utf8')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('[data-es2-reduce-flashing="true"]')
    expect(css).toContain('pointer-events: none')
    expect(css).toContain('animation-iteration-count: 1')
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('infinite')
  })
})

describe('localized expedition results', () => {
  it('renders streak records in both locales without fabricating records for older runs', async () => {
    setLocale('en', storage)
    const wrapper = mount(Es2Result, {
      props: { active: true, ending: '🏆 遠征勝利！', summary: '', result: { ...result, bestKillStreak: 12, bestMultiKill: 4 } },
      attachTo: document.body,
    })
    await nextTick()
    const stats = document.body.querySelector('.es2-result-stats')!
    expect(stats.textContent).toContain('Best kill streak')
    expect(stats.textContent).toContain('Best multikill')
    setLocale('zh-TW', storage)
    await nextTick()
    expect(stats.textContent).toContain('最高連殺')
    expect(stats.textContent).toContain('最高瞬間多殺')
    await wrapper.setProps({ result })
    expect(stats.textContent).not.toContain('最高連殺')
    wrapper.unmount()
  })

  it('renders a natural English summary and localized reward names, not internal IDs', async () => {
    setLocale('en', storage)
    const wrapper = mount(Es2Result, {
      props: {
        active: true, ending: '🏆 遠征勝利！',
        summary: '存活 68 秒 · 擊敗 12 隻魔物 · 等級 4',
        result,
        rewards: { embers: 20, newAchievements: ['first-blood'], newCosmetics: ['knight-gilded'] },
      },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.es2-dialog-header p')?.textContent).toContain(
      'Survived 68s · Defeated 12 enemies · Lv.4',
    )
    const rewards = document.body.querySelector('.es2-reward-strip')
    expect(rewards?.textContent).toContain(t('初臨戰場'))
    expect(rewards?.textContent).toContain(t('曙光鎏金'))
    expect(rewards?.textContent).not.toContain('first-blood')
    expect(rewards?.textContent).not.toContain('knight-gilded')
    setLocale('zh-TW', storage)
    await nextTick()
    expect(document.body.querySelector('.es2-dialog-header p')?.textContent).toContain(
      '存活 68 秒 · 擊敗 12 隻魔物 · 等級 4',
    )
    expect(rewards?.textContent).toContain('初臨戰場')
    wrapper.unmount()
  })
})

it('shows measured run XP, first upgrade, DPS and kills per minute in both languages', async () => {
  setLocale('en',storage)
  const wrapper=mount(Es2Result,{props:{active:true,ending:'',summary:'',result:{...result,seconds:60,damageDealt:1200,kills:30,xpEarned:75,firstUpgradeSeconds:8}},attachTo:document.body})
  await nextTick()
  const stats=document.body.querySelector('.es2-result-stats')!
  expect(stats.textContent).toContain('75XP earned')
  expect(stats.textContent).toContain('8.0sFirst upgrade')
  expect(stats.textContent).toContain('20Average DPS')
  expect(stats.textContent).toContain('30Kills per minute')
  setLocale('zh-TW',storage); await nextTick()
  expect(stats.textContent).toContain('首次升級時間')
  await wrapper.setProps({result})
  expect(stats.textContent).not.toContain('首次升級時間')
  wrapper.unmount()
})
