import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { setLocale } from '../../../i18n'
import type { RunStats } from '../../../meta/types'
import Es2Result from './Es2Result.vue'

const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/menu.css'), 'utf8')
const run = {
  id: 'run_test_001', mode: 'quick', hero: 'knight', victory: true, seconds: 90, kills: 3, level: 2,
  remainingHp: 10, damageDealt: 100, damageTaken: 20,
} as unknown as RunStats

const storage = { getItem: () => null, setItem: () => {} }
afterEach(() => { setLocale('zh-TW', storage); document.body.innerHTML = '' })

describe('expedition result screen fits without scrolling', () => {
  it('splits the result into a hero banner and a run report inside a result-variant dialog', () => {
    const wrapper = mount(Es2Result, {
      props: { active: true, ending: '勝利', summary: '', result: run,
        rewards: { embers: 20, newAchievements: ['first-blood'], newCosmetics: [] } },
      slots: { cloud: '<div class="es2-result-cloud">cloud</div>' },
      attachTo: document.body,
    })
    const dialog = document.body.querySelector('.es2-dialog')!
    expect(dialog.classList).toContain('es2-dialog-result')
    const banner = dialog.querySelector('.es2-result > .es2-result-banner')!
    const report = dialog.querySelector('.es2-result > .es2-result-report')!
    expect(banner.querySelector('.es2-result-hero img')).not.toBeNull()
    expect(banner.querySelector('.es2-result-status')).not.toBeNull()
    expect(report.querySelector('.es2-result-stats')?.children).toHaveLength(6)
    expect(report.querySelector('.es2-reward-strip')).not.toBeNull()
    expect(report.querySelector('.es2-result-cloud')).not.toBeNull()
    wrapper.unmount()
  })

  it('labels each reward kind once and lists its unlocks as compact chips', () => {
    const wrapper = mount(Es2Result, {
      props: { active: true, ending: '勝利', summary: '', result: run,
        rewards: { embers: 20, newAchievements: ['first-blood', 'first-victory'], newCosmetics: ['knight-gilded'] } },
      attachTo: document.body,
    })
    const groups = [...document.body.querySelectorAll('.es2-reward-strip .es2-reward-group')]
    expect(groups.map(group => group.querySelector('small')?.textContent)).toEqual(['新成就：', '新造型：'])
    expect(groups.map(group => group.querySelectorAll('span').length)).toEqual([2, 1])
    expect(document.body.querySelector('.es2-reward-strip')?.textContent?.match(/新成就：/g)).toHaveLength(1)
    wrapper.unmount()
  })

  it('never scrolls the result body; the portrait absorbs spare height instead', () => {
    expect(css).toMatch(/\.es2-dialog-result \.es2-dialog-body\{[^}]*overflow:hidden/)
    expect(css).not.toMatch(/\.es2-dialog-result \.es2-dialog-body\{[^}]*overflow-y:auto/)
    expect(css).toMatch(/\.es2-dialog-result \.es2-result-hero\{[^}]*flex:1 1 [^;]+;[^}]*min-height:/)
    expect(css).toMatch(/\.es2-dialog-result \.es2-result-hero img\{[^}]*object-fit:contain/)
  })

  it('never breaks a stat number across lines; the label wraps instead', () => {
    // The shared stat strip allows overflow-wrap:anywhere, which split "1,834,502" at 320px.
    expect(css).toMatch(/\.es2-dialog-result \.es2-result-stats b\{[^}]*white-space:nowrap/)
    expect(css).toMatch(/\.es2-dialog-result \.es2-result-stats small\{[^}]*min-width:0/)
  })

  it.each([
    ['zh-TW', run, '本次遠征英雄：曙鋼騎士'],
    ['en', run, 'Expedition Hero: Dawnsteel Knight'],
    ['en', { ...run, specializationId: 'crimson-paladin' }, 'Expedition Hero: Crimson Paladin'],
  ] as const)('names the expedition hero in the portrait alt (%s)', (locale, result, alt) => {
    setLocale(locale, storage)
    const wrapper = mount(Es2Result, {
      props: { active: true, ending: '勝利', summary: '', result: result as RunStats, rewards: null },
      attachTo: document.body,
    })
    expect(document.body.querySelector('.es2-result-hero img')?.getAttribute('alt')).toBe(alt)
    wrapper.unmount()
  })

  it('uses a two-column banner/report layout on wide and landscape screens', () => {
    expect(css).toMatch(/@media \(min-width:640px\)\{[^@]*\.es2-dialog-result \.es2-result\{[^}]*display:grid;grid-template-columns:/)
  })
})
