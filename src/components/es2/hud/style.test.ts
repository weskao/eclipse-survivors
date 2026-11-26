import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/hud.css'), 'utf8')
const component = readFileSync(resolve(process.cwd(), 'src/components/es2/hud/CombatHud.vue'), 'utf8')
const app = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8')

describe('responsive ES2 encounter and information rail', () => {
  it('stacks the boss and wave without separate fixed positions', () => {
    expect(component).toContain('data-es2-encounter')
    expect(component).toContain('v-if="view.boss || view.wave || view.bossWarning"')
    expect(css).toMatch(/\.es2-hud__encounter\s*\{[^}]*flex-direction: column/s)
    expect(css).not.toMatch(/\.es2-hud__boss\s*\{[^}]*position:\s*absolute/s)
    expect(css).not.toMatch(/\.es2-hud__wave\s*\{[^}]*top:\s*\d+px/s)
  })
  it('places mode progress, objectives and notices in one scrollable rail', () => {
    expect(app).toContain('#mode-progress')
    expect(app).not.toContain('class="es2-objective-hud"')
    expect(component).toContain('data-es2-information-rail')
    expect(component).toContain('<slot name="mode-progress" />')
    expect(css).toMatch(/\.es2-hud__side\s*\{[^}]*overflow-y:\s*auto/s)
    expect(css).toContain('--es2-side-top')
    expect(css).toContain('--es2-footer-clear')
  })
  it('supports phones, landscape height limits, safe areas and status scrolling', () => {
    expect(css).toContain('@media (max-width: 700px)')
    expect(css).toContain('@media (max-width: 400px)')
    expect(css).toContain('@media (min-width: 1061px) and (max-width: 1399px)')
    expect(css).toContain('@media (orientation: landscape) and (max-height: 520px)')
    expect(css).toContain('safe-area-inset-bottom')
    expect(css).toContain('safe-area-inset-left')
    expect(css).toContain('safe-area-inset-right')
    expect(css).toMatch(/\.es2-hud__statuses\s*\{[^}]*overflow-y:\s*auto/s)
    expect(css).toContain('focus-visible')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('min-height: 44px')
  })
  it('keeps one polite announcement and real wave progress accessible', () => {
    expect(component.match(/aria-live="polite"/g)).toHaveLength(1)
    expect(component).toContain('data-es2-announcement')
    expect(component).toContain(':aria-label="t(\'波次進度\')"')
  })

  it('uses composited easing, a trailing damage layer, critical emphasis and reduced-motion fallback', () => {
    expect(css).toContain('transform: scaleX(var(--es2-progress, 0))')
    expect(css).toMatch(/transition: transform \.36s cubic-bezier/)
    expect(css).toContain('.es2-hud__track > .es2-hud__track-trail')
    expect(css).toContain('.es2-hud__track--critical')
    expect(css).toContain('.es2-hud__wave-track > span')
    expect(css).not.toContain('transition: width .12s linear')
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toContain('.es2-hud__track > span')
    expect(reduced).toContain('.es2-hud__wave-track > span')
    expect(component).toContain(':key="view.identity"')
  })

  it('keeps ES2 styles scoped and avoids changing the legacy game', () => {
    expect(css).toContain('.es2-hud')
    expect(css).not.toMatch(/(?:^|\n)\s*(?:html|body|#hud|#menu|#game)\b/)
  })

  it('keeps the short-landscape info toggle out of the right-side action lane', () => {
    const landscape = css.slice(css.lastIndexOf('/* The same compact information drawer'))
    expect(landscape).toContain('--es2-compact-info-top: max(116px')
    expect(landscape).toContain('(orientation: landscape) and (max-height: 520px) and (max-width: 1100px) and (pointer: coarse)')
    expect(landscape).toContain('.es2-hud__counter-row { display: flex;')
    expect(landscape).toContain('.es2-hud__info-toggle { position: static;')
    expect(component).toMatch(/class="es2-hud__counter-row"[\s\S]*?data-es2-info-toggle[\s\S]*?class="es2-hud__counters/)
    expect(component.match(/data-es2-info-toggle/g)).toHaveLength(1)
    expect(css).toContain('min-width: 44px; width: 44px; min-height: 44px; padding: 0')
    expect(css).toContain('font: 700 0/1.2 system-ui')
    expect(landscape).toContain('bottom: max(108px')
  })

  it('keeps tablet width overrides out of the short-landscape phone layout', () => {
    const tablet = css.slice(css.lastIndexOf('/* Touch tablets'))
    expect(tablet).toContain(
      '@media (pointer: coarse) and (min-width: 701px) and (max-width: 1100px) and (min-height: 521px)',
    )
  })
})

describe('gothic boss meter skin', () => {
  it('keeps the ornament frame outside the clipped accessible progress track', () => {
    const legacy = readFileSync(resolve(process.cwd(), 'src/components/GameHud.vue'), 'utf8')
    const shared = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')
    expect(component).toContain('class="boss-meter-frame"')
    expect(legacy).toContain('class="boss-meter-frame"')
    expect(shared).toContain('.boss-meter-frame::before')
    expect(shared).toContain('.boss-meter-frame::after')
    expect(shared).toContain('clip-path:polygon')
    expect(css).toContain('var(--es2-boss-hp-color, #a94463)')
    expect(css).toContain('.es2-hud__boss.es2-hud__plate')
  })
})

describe('bounded fixed boss health HUD', () => {
  it('centers the boss panel independently of the full-width encounter grid', () => {
    expect(css).toMatch(/\.es2-hud__boss\s*\{[^}]*align-self:\s*center;[^}]*width:\s*min\(100%, 420px, 52vw\)/s)
    expect(css).toMatch(/@media \(orientation: portrait\) and \(max-width: 700px\)\s*\{[^]*?\.es2-hud__boss\s*\{\s*width: min\(100%, 360px, 78vw\);\s*\}/)
    expect(css).toMatch(/\.es2-hud__encounter\s*\{ grid-area: 3 \/ 1 \/ auto \/ -1; \}/)
  })
  it('keeps the legacy fixed meter bounded in portrait and landscape too', () => {
    const shared = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')
    expect(shared).toContain('width:min(420px,52vw)')
    expect(shared).toContain('.boss-wrap{top:188px;width:min(360px,78vw)}')
    expect(shared).toContain('.boss-wrap{width:min(330px,38vw)}')
  })
})

describe('boss arrival warning vertical alignment', () => {
  it('uses the same top edge under the scene title for warning and live boss meter', () => {
    expect(component).toMatch(/class="es2-hud__encounter-stack">\s*<div[^>]*data-es2-scene-title[^>]*>[\s\S]*?<div[^>]*data-es2-encounter>/)
    expect(css).toContain('.es2-hud__scene-title + .es2-hud__encounter { margin-top: 8px; }')
    expect(css).toContain('.es2-hud__scene-title + .es2-hud__encounter { margin-top: 3px; }')
    expect(css).not.toMatch(/\.es2-hud__boss-warning\s*\{[^}]*\btop\s*:/s)
    expect(css).toMatch(/\.es2-hud__encounter\s*\{[^}]*top: var\(--es2-encounter-top\)/s)
    expect(component).toMatch(/data-es2-encounter[\s\S]*?data-es2-boss-warning[\s\S]*?data-es2-boss\s/)
  })
  it('uses the safe centered top lane on wide short-landscape screens regardless of pointer type', () => {
    expect(css).toMatch(/@media \(orientation: landscape\) and \(max-height: 520px\) and \(max-width: 1100px\)\s*\{[^]*?\.es2-hud__encounter-stack\s*\{[^}]*top: var\(--es2-encounter-top\)[^}]*width: min\(38vw, 330px,/)
    expect(css).toContain('--es2-encounter-top: max(48px, calc(env(safe-area-inset-top) + 8px))')
  })
})

describe('boss arrival warning character palette', () => {
  it('derives the entire countdown skin from the upcoming boss accent', () => {
    const surfaces = [[".es2-hud__boss-warning","background"],[".es2-hud__boss-warning","box-shadow"],[".es2-hud__boss-warning::before","color"],[".es2-hud__boss-warning-sigil","background"],[".es2-hud__boss-warning-text > span","color"],[".es2-hud__boss-warning-text > strong","color"],[".es2-hud__boss-warning-count","color"],[".es2-hud__boss-warning-count small","color"],[".es2-hud__boss-warning-track","border"],[".es2-hud__boss-warning-track > span","background"],[".es2-hud__boss-warning--urgent","box-shadow"]]
    for (const [selector, property] of surfaces) {
      const body = css.split(selector + ' {')[1]?.split('}')[0] ?? ''
      const declaration = body.split(';').find(part => part.trim().startsWith(property + ':')) ?? ''
      expect(declaration, selector + ' ' + property).toContain('var(--es2-warning-accent)')
    }
    const glow = css.split('@keyframes es2-boss-alert-glow {')[1]?.split('@media')[0] ?? ''
    expect(glow.match(/var\(--es2-warning-accent\)/g)).toHaveLength(2)
  })
})

describe('hero health uses the shared damage/heal sampler', () => {
  it('uses distinct composited front and trail values', () => {
    expect(component).toContain('useHeroHealthMotion')
    expect(css).toContain('scaleX(var(--hero-hp-front, var(--es2-progress, 0)))')
    expect(css).toContain('scaleX(var(--hero-hp-trail, var(--es2-progress, 0)))')
    expect(css).toContain('data-hero-hp-damage')
  })
})
