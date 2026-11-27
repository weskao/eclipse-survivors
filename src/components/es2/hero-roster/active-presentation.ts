import type { HeroId } from '../../../game/types'
const THEMES = {
  knight: ['#d8b16d', '#fff0c0', '#35251d', 'dawnbreak', 'radial-gradient(ellipse, transparent 35%, #d8b16d 75%, #fff0c0)'],
  ranger: ['#80bd9f', '#dcf5c0', '#17322d', 'starfall', 'linear-gradient(105deg, transparent 25%, #8fe3a9 42%, #f0ffdd 49%, #9bd3a2 55%, transparent 72%)'],
  wizard: ['#a38ce8', '#eee0ff', '#251b43', 'collapse', 'radial-gradient(ellipse, #eee0ff, #a38ce8 40%, transparent 75%)'],
  shadowblade: ['#aaa0b4', '#e5dce4', '#241731', 'shadow-slash', 'linear-gradient(115deg, transparent 38%, #aaa0b4 46%, #fff 50%, #e5dce4 53%, transparent 62%)'],
  'spirit-summoner': ['#85b6b0', '#c3ddd4', '#122c3b', 'spirit-rise', 'radial-gradient(ellipse 70% 80% at 50% 100%, #c3ddd4, #85b6b080 45%, transparent 72%)'],
  'crimson-paladin': ['#b99a74', '#ebd2a7', '#371d2a', 'aegis-flare', 'radial-gradient(ellipse, transparent 52%, #e04a5c73 78%, #ebd2a7)'],
} as const satisfies Record<HeroId, readonly [string, string, string, string, string]>
export const ACTIVE_HERO_IDS = Object.freeze(Object.keys(THEMES) as HeroId[])
export function heroActiveTheme(id: HeroId) {
  const [accent, light, panel, animation, flourish] = THEMES[id]
  return {
    '--es2-special-accent': accent, '--es2-special-light': light, '--es2-special-panel': panel,
    '--es2-special-animation': 'es2-special-' + animation, '--es2-special-flourish': flourish,
  }
}
