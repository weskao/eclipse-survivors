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



  it('shows and clears the engine-owned combo without a synthetic feed', async () => {
    const { wrapper } = render({ hud: { ...equipped, combo: { count: 12 } } })
    expect(wrapper.get('[data-es2-combo]').text()).toContain('12×')
    await wrapper.setProps({ hud: { ...equipped } })
    expect(wrapper.find('[data-es2-combo]').exists()).toBe(false)
  })

  it('smoothly presents damage and healing without delaying authoritative HP, XP, boss or wave values', async () => {
    const { wrapper } = render({
      hud: { ...equipped, bossPct: 40 },
      feed: { wave: { number: 2, progressPct: 22 } },
    })
    const meter = (label: string) => wrapper.get(`[role="progressbar"][aria-label="${label}"]`)
    const fraction = (label: string) => (meter(label).element as HTMLElement).style.getPropertyValue('--es2-progress')
    expect(fraction('生命值')).toBe('0.75')
    expect(fraction('經驗值')).toBe('0.42')
    expect(fraction('首領生命值')).toBe('0.4')
    expect((meter('首領生命值').element as HTMLElement).style.getPropertyValue('--es2-boss-hp-color')).toBe('#d35048')
    expect(fraction('波次進度')).toBe('0.22')
    expect(meter('生命值').findAll('span')).toHaveLength(2)
    expect(meter('生命值').get('.es2-hud__track-trail').attributes('aria-hidden')).toBe('true')
    await wrapper.setProps({
      hud: { ...equipped, hpPct: 12, xpPct: 80, bossPct: 18 },
      feed: { wave: { number: 2, progressPct: 63 } },
    })
    expect(meter('生命值').attributes('aria-valuenow')).toBe('12')
    expect(fraction('生命值')).toBe('0.12')
    expect(meter('生命值').classes()).toContain('es2-hud__track--critical')
    expect(fraction('經驗值')).toBe('0.8')
    expect(fraction('首領生命值')).toBe('0.18')
    expect((meter('首領生命值').element as HTMLElement).style.getPropertyValue('--es2-boss-hp-color')).toBe('#eb674d')
    expect(fraction('波次進度')).toBe('0.63')
    await wrapper.setProps({ hud: { ...equipped, hpPct: 94, xpPct: 15, bossPct: 48 } })
    expect(meter('生命值').attributes('aria-valuenow')).toBe('94')
    expect(fraction('生命值')).toBe('0.94')
    expect(meter('生命值').classes()).not.toContain('es2-hud__track--critical')
    expect(fraction('經驗值')).toBe('0.15')
    expect(fraction('首領生命值')).toBe('0.48')
    expect((meter('首領生命值').element as HTMLElement).style.getPropertyValue('--es2-boss-hp-color')).toBe('#d35048')
  })

  it('snaps the hero health layers when reduced motion is enabled', async () => {
    const { wrapper } = render({ healthMotion: 'on' })
    const meter = wrapper.get('.es2-hud__track--health')
    const value = (name: string) => (meter.element as HTMLElement).style.getPropertyValue(name)
    await wrapper.setProps({ hud: { ...equipped, hpPct: 19 } })
    expect(meter.attributes('aria-valuenow')).toBe('19')
    expect(value('--hero-hp-front')).toBe('0.19')
    expect(value('--hero-hp-trail')).toBe('0.19')
    expect(meter.attributes('data-hero-hp-damage')).toBeUndefined()
    await wrapper.setProps({ hud: { ...equipped, hpPct: 88 } })
    expect(value('--hero-hp-front')).toBe('0.88')
    expect(value('--hero-hp-trail')).toBe('0.88')
    expect(meter.attributes('aria-valuenow')).toBe('88')
  })

  it('tracks an offscreen boss with actual distance, direction and artwork, then hides when visible', async () => {
    const offscreen = { left: 184, top: 278, angle: 47, distance: 524, artSrc: '/boss-phases@3x.webp', atlas: true }
    const { wrapper } = render({
      hud: { ...equipped, bossPct: 65 },
      feed: { boss: { name: 'Abyss Monarch', phase: 2, offscreen } },
    })
    const pointer = wrapper.get('[data-es2-boss-pointer]')
    expect(pointer.attributes('role')).toBe('img')
    expect(pointer.attributes('aria-label')).toContain('524')
    expect((pointer.element as HTMLElement).style.left).toBe('184px')
    expect((pointer.element as HTMLElement).style.top).toBe('278px')
    expect((pointer.element as HTMLElement).style.getPropertyValue('--es2-bearing')).toBe('47deg')
    expect(pointer.get('[data-es2-boss-icon]').attributes('style')).toContain('/boss-phases@3x.webp')
    await wrapper.setProps({ feed: { boss: { name: 'Abyss Monarch', phase: 2 } } })
    expect(wrapper.find('[data-es2-boss-pointer]').exists()).toBe(false)
    await wrapper.setProps({ hud: { ...equipped, bossPct: null }, feed: { boss: { name: 'Abyss Monarch', offscreen } } })
    expect(wrapper.find('[data-es2-boss-pointer]').exists()).toBe(false)
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

  it('offers an accessible home control only during an active run', async () => {
    const home = vi.fn()
    const { wrapper } = render({ canReturnHome: true, actions: { pause: vi.fn(), settings: vi.fn(), home } })
    const button = wrapper.get('[data-es2-home]')
    expect(button.attributes('aria-label')).toBeTruthy()
    expect(button.find('svg[aria-hidden="true"]').exists()).toBe(true)
    await button.trigger('click')
    expect(home).toHaveBeenCalledOnce()
    await wrapper.setProps({ canReturnHome: false })
    expect(wrapper.find('[data-es2-home]').exists()).toBe(false)
  })


  it('updates battle counters and live gameplay messages when the locale switches', async () => {
    const storage = { getItem: () => null, setItem: () => {} }
    const { setLocale } = await import('../../../i18n')
    setLocale('zh-TW', storage)
    const { wrapper } = render()
    expect(wrapper.text()).toContain('時間')
    expect(wrapper.get('[data-es2-settings]').attributes('aria-label')).toBe('開啟設定')
    setLocale('en', storage)
    await nextTick()
    expect(wrapper.text()).toContain('Time')
    expect(wrapper.get('[data-es2-settings]').attributes('aria-label')).toBe('Open settings')
    setLocale('zh-TW', storage)
  })

  it('collapses the mobile battle-information drawer on outside pointer, Escape and viewport changes', async () => {
    const { wrapper } = render({ canReturnHome: true })
    const toggle = wrapper.get('[data-es2-info-toggle]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.es2-hud').classes()).toContain('es2-hud--details-open')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    window.dispatchEvent(new Event('orientationchange'))
    await nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await wrapper.setProps({ canReturnHome: false })
    expect(wrapper.find('[data-es2-info-toggle]').exists()).toBe(false)
  })
})

it('uses the same sampled health variables for the fixed boss HUD', async () => {
  const { wrapper } = render({ healthMotion: 'on', hud: { ...equipped, bossPct: 90 } })
  const meter = wrapper.get('.es2-hud__track--boss')
  const value = (name: string) => (meter.element as HTMLElement).style.getPropertyValue(name)
  await wrapper.setProps({ hud: { ...equipped, bossPct: 30, bossCriticalVersion: 3 } })
  expect(meter.attributes('aria-valuenow')).toBe('30')
  expect(value('--hero-hp-front')).toBe('0.3')
  expect(value('--hero-hp-trail')).toBe('0.3')
  expect(meter.attributes('data-hp-impact')).toBeUndefined()
})

it('shows a keyed, noninteractive phase reveal only for an explicit encounter event', async () => {
  const { wrapper } = render({ hud: { ...equipped, bossPct: 60 }, feed: { boss: { name: 'Abyss Monarch', phase: 2, totalPhases: 3 } } })
  expect(wrapper.find('[data-boss-phase-reveal]').exists()).toBe(false)
  await wrapper.setProps({ bossPhaseReveal: { boss: 'abyss-monarch', phase: 2, serial: 1, expiresAt: 10 } })
  const p2 = wrapper.get('[data-boss-phase-reveal]')
  expect(p2.attributes('data-phase')).toBe('2')
  expect(p2.attributes('role')).toBe('status')
  await wrapper.setProps({ bossPhaseReveal: { boss: 'abyss-monarch', phase: 3, serial: 2, expiresAt: 12 } })
  expect(wrapper.get('[data-boss-phase-reveal]').attributes('data-phase')).toBe('3')
  await wrapper.setProps({ bossPhaseReveal: null })
  expect(wrapper.find('[data-boss-phase-reveal]').exists()).toBe(false)
})

it('uses unique authored phase sigils for all four bosses', async () => {
  const { wrapper } = render({ hud: { ...equipped, bossPct: 30 }, feed: { boss: { name: 'Boss', phase: 3, totalPhases: 3 } } })
  const paths = new Set<string>()
  for (const [serial,boss] of (['abyss-monarch','frost-sovereign','infernal-titan','eclipse-seraph'] as const).entries()) {
    await wrapper.setProps({ bossPhaseReveal: { boss, phase: 3, serial: serial+1, expiresAt: 10 } })
    const path = wrapper.get('[data-boss-phase-sigil]').attributes('d')
    expect(path).toBeTruthy()
    paths.add(path!)
  }
  expect(paths.size).toBe(4)
})
