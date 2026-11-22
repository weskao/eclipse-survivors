import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { emptyHud, type HudView } from '../../../game/store'
import CombatHud from './CombatHud.vue'

const equipped: HudView = {
  ...emptyHud(), who: '遊俠 · LV.7', hpPct: 75, hpLabel: '生命 90 / 120',
  xpPct: 42, kill: 76, timer: '03:21', bossPct: null, quest: '取得聖物',
  skills: [
    { id: 'bolt', icon: '⚡', title: '雷擊', rarity: 'rare', level: 2, maxLevel: 5, cooldown: 1.5, cooldownPct: 50, evolved: false },
    { id: 'shield', icon: '⛨', title: '護盾', rarity: 'common', level: 1, maxLevel: 5, cooldown: 0, cooldownPct: 0, evolved: false },
  ],
}
const instances: Array<{ unmount(): void }> = []
function render(override: Record<string, unknown> = {}) {
  const pause = vi.fn()
  const settings = vi.fn()
  const wrapper = mount(CombatHud, {
    attachTo: document.body,
    props: { active: true, choice: 'ranger' as const, hud: equipped, actions: { pause, settings }, ...override },
  })
  instances.push(wrapper)
  return { wrapper, pause, settings }
}
afterEach(() => {
  for (const wrapper of instances.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('ES2 combat HUD', () => {
  it('renders actual health, XP, skills, timer, kills and objective with accessible progress', () => {
    const { wrapper } = render()
    expect(wrapper.text()).toContain('遊俠 · LV.7')
    expect(wrapper.text()).toContain('生命 90 / 120')
    expect(wrapper.text()).toContain('03:21')
    expect(wrapper.text()).toContain('76')
    expect(wrapper.text()).toContain('取得聖物')
    expect(wrapper.get('[role="progressbar"][aria-label="生命值"]').attributes('aria-valuenow')).toBe('75')
    expect(wrapper.get('[role="progressbar"][aria-label="經驗值"]').attributes('aria-valuenow')).toBe('42')
    expect(wrapper.findAll('[data-es2-skill]')).toHaveLength(2)
    expect(wrapper.find('[data-es2-boss]').exists()).toBe(false)
    expect(wrapper.find('[data-es2-wave]').exists()).toBe(false)
    expect(wrapper.find('[data-es2-relic]').exists()).toBe(false)
    expect(wrapper.find('canvas[aria-label="戰場小地圖"]').exists()).toBe(true)
    // A replaced engine snapshot updates bars without a component-local timer.
    return wrapper.setProps({ hud: { ...equipped, hpPct: 28, xpPct: 83, kill: 78 } }).then(() => {
      expect(wrapper.get('[role="progressbar"][aria-label="生命值"]').attributes('aria-valuenow')).toBe('28')
      expect(wrapper.get('[role="progressbar"][aria-label="經驗值"]').attributes('aria-valuenow')).toBe('83')
      expect(wrapper.text()).toContain('78')
    })
  })


  it('updates the top-left portrait to each live specialization\'s true Canvas artwork', () => {
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
      const { wrapper } = render({ heroId: id, choice: id === 'spirit-summoner' ? 'wizard' : 'knight' })
      const portrait = wrapper.get('.es2-hud__portrait img')
      expect(portrait.attributes('src')).toContain(id + '-portrait@3x.webp')
    }
  })

  it('selects an actual equipped skill by pointer or keyboard-focusable button and shows live cooldowns', async () => {
    const { wrapper } = render()
    const first = wrapper.get('[data-es2-skill="bolt"]')
    expect(first.attributes('aria-pressed')).toBe('false')
    expect(first.attributes('title')).toContain('冷卻 1.5 秒')
    ;(first.element as HTMLButtonElement).focus()
    expect(document.activeElement).toBe(first.element)
    await first.trigger('click')
    expect(first.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-es2-skill-detail]').text()).toContain('雷擊')
    expect(wrapper.get('[data-es2-skill-detail]').text()).toContain('1.5')
    await wrapper.setProps({ hud: { ...equipped, skills: [equipped.skills[1]!] } })
    await nextTick()
    expect(wrapper.find('[data-es2-skill-detail]').exists()).toBe(false)
  })

  it('only displays optional real source data, honors interactive callbacks and audio state', async () => {
    const toggleMusic = vi.fn()
    const setMusicVolume = vi.fn()
    const pause = vi.fn()
    const settings = vi.fn()
    const { wrapper } = render({
      musicOn: true,
      sfxOn: true,
      musicVolume: 66,
      sfxVolume: 80,
      actions: { pause, settings, toggleMusic, toggleSfx: vi.fn(), setMusicVolume, setSfxVolume: vi.fn() },
      feed: {
        boss: { name: '霜之王', phase: 2, totalPhases: 3 },
        wave: { number: 9, announcement: '霜潮來襲' },
        combo: { count: 19 },
        relics: [{ id: 'a', title: '霜印', icon: '❄', rarity: 'rare' }],
        statuses: [{ id: 'b', title: '緩速', kind: 'debuff', remainingSeconds: 2 }],
        notices: [{ id: 'c', kind: 'critical', text: '暴擊 88' }, { id: 'd', kind: 'treasure', text: '傳說寶箱' }],
        objectives: [{ id: 'e', title: '開啟祭壇', progress: 1, target: 3 }],
      },
      hud: { ...equipped, bossPct: 44 },
    })
    expect(wrapper.get('[data-es2-encounter] [data-es2-boss]').text()).toContain('霜之王')
    expect(wrapper.get('[data-es2-encounter] [data-es2-wave]').text()).toContain('霜潮來襲')
    expect(wrapper.find('[data-es2-information-rail] .es2-hud__objectives').exists()).toBe(true)
    expect(wrapper.find('[data-es2-information-rail] .es2-hud__notices').exists()).toBe(true)
    expect(wrapper.get('[data-es2-boss]').text()).toContain('2 / 3')
    expect(wrapper.get('[data-es2-wave]').text()).toContain('霜潮來襲')
    expect(wrapper.get('[data-es2-combo]').text()).toContain('19')
    expect(wrapper.get('[data-es2-relic="a"]').attributes('title')).toContain('霜印')
    expect(wrapper.get('[data-es2-status="b"]').text()).toContain('緩速')
    expect(wrapper.text()).toContain('暴擊 88')
    expect(wrapper.text()).toContain('傳說寶箱')
    expect(wrapper.text()).toContain('開啟祭壇')
    await wrapper.get('[data-es2-pause]').trigger('click')
    await wrapper.get('[data-es2-settings]').trigger('click')
    await wrapper.get('#hudAudioTrigger').trigger('click')
    await nextTick()
    const range = document.querySelector<HTMLInputElement>('#hudMusicVolume')
    expect(range).not.toBeNull()
    range!.value = '37'
    range!.dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector<HTMLButtonElement>('#hudMusicMute')!.click()
    expect(toggleMusic).toHaveBeenCalledTimes(1)
    expect(setMusicVolume).toHaveBeenCalledWith(37)
    expect(pause).toHaveBeenCalledTimes(1)
    expect(settings).toHaveBeenCalledTimes(1)
  })

  it('does not mount visual overlay while inactive and removes UI cleanly on unmount', async () => {
    const { wrapper } = render({ active: false })
    // The map element must exist even while hidden: engine.mount captures it on menu mount.
    expect(wrapper.find('.es2-hud').exists()).toBe(true)
    expect(wrapper.get('.es2-hud').classes()).not.toContain('es2-hud--active')
    expect(wrapper.get('.es2-hud').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('canvas[aria-label="戰場小地圖"]').exists()).toBe(true)
    await wrapper.setProps({ active: true })
    expect(wrapper.get('.es2-hud').classes()).toContain('es2-hud--active')
    expect(wrapper.get('.es2-hud').attributes('aria-hidden')).toBe('false')
    wrapper.unmount()
    instances.splice(instances.indexOf(wrapper), 1)
    expect(document.querySelector('.es2-hud')).toBeNull()
  })
})
