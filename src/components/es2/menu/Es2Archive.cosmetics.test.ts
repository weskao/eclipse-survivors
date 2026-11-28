import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { getLocale, setLocale } from '../../../i18n'
import { emptyProfile } from '../../../meta/profile'
import { createMetaState } from '../../../game/content/meta/state'
import { HERO_DEFINITIONS } from '../../../game/content/heroes'
import { ART_URLS } from '../../../game/art'
import { cosmeticAura, COSMETICS } from '../../../meta/cosmetics'
import { ACHIEVEMENTS } from '../../../meta/achievements'
import { ACHIEVEMENTS as META_ACHIEVEMENTS } from '../../../game/content/meta/catalog'
import Es2Archive from './Es2Archive.vue'

const cases = [
  { hero: 'knight', skin: 'knight-gilded', zh: '獲得第一次勝利', en: 'Earn your first victory', metaZh: '獲得一場勝利', metaEn: 'Win an expedition' },
  { hero: 'ranger', skin: 'ranger-moonlit', zh: '單局擊敗 100 隻魔物', en: 'Defeat 100 monsters in one run', metaZh: '單局擊敗一百名敵人', metaEn: 'Defeat 100 enemies in a single run' },
  { hero: 'wizard', skin: 'wizard-astral', zh: '擊倒魔王', en: 'Defeat the boss', metaZh: '擊敗首領', metaEn: 'Defeat a boss' },
] as const

describe('hero cosmetic unlock guidance', () => {
  it.each(cases)('shows the actual $skin condition in both locales and removes it on unlock', async ({ hero, skin, zh, en, metaZh, metaEn }) => {
    const locale = getLocale()
    const profile = emptyProfile()
    setLocale('zh-TW')
    const wrapper = mount(Es2Archive, { props: { view: 'progression', profile, hero } })
    const option = () => wrapper.get(`[data-es2-cosmetic-option="${skin}"]`)
    try {
      expect(option().attributes('disabled')).toBeDefined()
      expect(option().get('[data-es2-cosmetic-unlock]').text()).toBe('解鎖條件：' + zh)
      ;(option().element as HTMLButtonElement).click()
      expect(wrapper.emitted('cosmetic')).toBeUndefined()
      setLocale('en')
      await wrapper.vm.$nextTick()
      expect(option().get('[data-es2-cosmetic-unlock]').text()).toBe('Unlock requirement: ' + en)
      await wrapper.setProps({ metaState: createMetaState(), metaStatus: 'ready' })
      expect(option().get('[data-es2-cosmetic-unlock]').text()).toBe('Unlock requirement: ' + metaEn)
      setLocale('zh-TW')
      await wrapper.vm.$nextTick()
      expect(option().get('[data-es2-cosmetic-unlock]').text()).toBe('解鎖條件：' + metaZh)
      await wrapper.setProps({ profile: { ...profile, unlockedCosmetics: [...profile.unlockedCosmetics, skin] } })
      expect(option().attributes('disabled')).toBeUndefined()
      expect(option().find('[data-es2-cosmetic-unlock]').exists()).toBe(false)
      await option().trigger('click')
      expect(wrapper.emitted('cosmetic')).toEqual([[hero, skin]])
      await wrapper.setProps({ profile })
      expect(option().attributes('disabled')).toBeDefined()
      expect(option().find('[data-es2-cosmetic-unlock]').exists()).toBe(true)
    } finally {
      wrapper.unmount()
      setLocale(locale)
    }
  })

  it.each(cases)('distinguishes equipped, available and locked $hero skins and updates after equip', async ({ hero, skin }) => {
    const locale = getLocale()
    setLocale('zh-TW')
    const profile = emptyProfile()
    const wrapper = mount(Es2Archive, { props: { view: 'progression', profile, hero } })
    const current = () => wrapper.get(`[data-es2-cosmetic-option="${hero}-default"]`)
    const next = () => wrapper.get(`[data-es2-cosmetic-option="${skin}"]`)
    try {
      expect(current().get('[data-es2-skin-status="equipped"]').text()).toContain('使用中')
      expect(current().attributes('aria-pressed')).toBe('true')
      expect(current().attributes('aria-disabled')).toBe('true')
      expect(current().find('[data-es2-skin-equipped-mark]').exists()).toBe(true)
      expect(next().find('[data-es2-skin-equipped-mark]').exists()).toBe(false)
      expect(next().find('[data-es2-skin-status]').exists()).toBe(false)
      await current().trigger('click')
      expect(wrapper.emitted('cosmetic')).toBeUndefined()
      const unlocked = { ...profile, unlockedCosmetics: [...profile.unlockedCosmetics, skin] }
      await wrapper.setProps({ profile: unlocked })
      expect(next().get('[data-es2-skin-status="available"]').text()).toContain('套用造型')
      await next().trigger('click')
      expect(wrapper.emitted('cosmetic')).toEqual([[hero, skin]])
      await wrapper.setProps({ profile: { ...unlocked, equippedCosmetics: { ...unlocked.equippedCosmetics, [hero]: skin } } })
      expect(next().find('[data-es2-skin-status="equipped"]').exists()).toBe(true)
      expect(current().find('[data-es2-skin-status="available"]').exists()).toBe(true)
      expect(next().find('[data-es2-skin-equipped-mark]').exists()).toBe(true)
      expect(current().find('[data-es2-skin-equipped-mark]').exists()).toBe(false)
      expect(next().attributes('aria-pressed')).toBe('true')
      expect(current().attributes('aria-disabled')).toBeUndefined()
    } finally { wrapper.unmount(); setLocale(locale) }
  })

  it('uses the actual portrait for every hero and keeps the existing shared aura entitlement', async () => {
    const profile = emptyProfile()
    const wrapper = mount(Es2Archive, { props: { view: 'progression', profile, hero: 'knight' } })
    const roster = [
      ...cases.map(({ hero }) => ({ id: hero, job: hero, portrait: ART_URLS[hero] })),
      ...Object.values(HERO_DEFINITIONS).map(hero => ({ id: hero.id, job: hero.legacyArtJob, portrait: hero.portraitSrc })),
    ]
    try {
      for (const { id, job, portrait } of roster) {
        await wrapper.setProps({ hero: job, heroId: id })
        const options = wrapper.findAll('[data-es2-cosmetic-option]')
        expect(options.length, id).toBeGreaterThanOrEqual(2)
        for (const option of options) {
          expect(option.get('img').attributes('src'), id).toBe(portrait)
        }
        const advanced = COSMETICS.find(s => s.hero === job && !s.id.endsWith('-default'))!
        const locked = wrapper.get(`[data-es2-cosmetic-option="${advanced.id}"]`)
        expect(locked.attributes('disabled')).toBeDefined()
        expect(locked.find('[data-es2-cosmetic-unlock]').exists()).toBe(true)
        expect((locked.element as HTMLElement).style.getPropertyValue('--es2-skin-ring')).toBe(cosmeticAura(advanced.id)[1])
      }
    } finally { wrapper.unmount() }
  })

  it('requires a real unlock source for every non-default cosmetic in both save systems', () => {
    for (const skin of COSMETICS.filter(s => !s.id.endsWith('-default'))) {
      expect(ACHIEVEMENTS.find(a => a.cosmetic === skin.id)?.hint, skin.id).toBeTruthy()
      expect(META_ACHIEVEMENTS.find(a => a.cosmetic === skin.id)?.description, skin.id).toBeTruthy()
    }
  })
})
