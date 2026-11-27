import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const destination = 'artifacts/es2-mobile-browser'
const cases = [
  ['portrait-320', 320, 640, true],
  ['portrait-390', 390, 844, true],
  ['folded-360', 360, 800, true],
  ['unfolded-720', 720, 850, true],
  ['portrait-430', 430, 932, true],
  ['landscape-844', 844, 390, true],
  ['tablet-portrait-768', 768, 1024, true],
  ['tablet-landscape-1024', 1024, 768, true],
  ['desktop-1280', 1280, 720, false],
  ['desktop-1440', 1440, 900, false],
  ['desktop-1920', 1920, 1080, false],
  // 1280×720 at 200% browser zoom yields an equivalent 640×360 CSS viewport.
  // It tests reflow bounds, not the browser's native zoom implementation.
  ['desktop-zoom-200-equivalent', 640, 360, false],
]
const inset = 2
const inside = (box, width, height) => box.x >= -inset && box.y >= -inset
  && box.right <= width + inset && box.bottom <= height + inset
const rect = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom } }
// Text must fit in either language; intentionally scrollable archives are checked per item.
const assertLocalizedTextFits = async (page, caseName, locale) => {
  const issues = await page.evaluate(() => {
    const selectors = [
      '.es2-hero-copy strong', '.es2-hero-copy small',
      '.es2-mode-copy strong', '.es2-mode-copy small',
      '.es2-dialog-header h2', '.es2-dialog-header p',
      '.es2-dialog-actions button', '.es2-archive-tabs button',
      '.es2-archive-card strong', '.es2-archive-card p',
      '.es2-card-name', '.es2-card-description', '.es2-reward-strip span',
      '.hall-node', '.hall-inspect strong', '.hall-buy', '.hall-detail', '.hall-comparison',
    ]
    return [...document.querySelectorAll(selectors.join(','))]
      .filter(el => el.getClientRects().length && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2)
      .map(el => ({ selector: el.className, text: el.textContent?.trim().slice(0, 64),
        width: el.clientWidth, scrollWidth: el.scrollWidth }))
  })
  assert.deepEqual(issues, [], caseName + ': ' + locale + ' text overflow')
  const doc = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }))
  assert.ok(doc.content <= doc.viewport + inset, caseName + ': ' + locale + ' page overflow: ' + JSON.stringify(doc))
}
// The shared summary must reserve its entire trailing column, not just title-line space.
const assertSkillValueColumns = async (scope, label) => {
  const result = await scope.locator('.es2-active-summary[data-has-detail]').evaluateAll(rows => rows
    .filter(row => row.getClientRects().length)
    .map(row => {
      const main = row.querySelector('.es2-active-summary__main'), value = row.querySelector('[data-active-skill-cooldown]')
      const a = main.getBoundingClientRect(), b = value.getBoundingClientRect(), r = row.getBoundingClientRect()
      const css = getComputedStyle(value), rightPadding = parseFloat(css.paddingRight)
      const leftPadding = parseFloat(css.paddingLeft)
      const parts = [...value.children].map(el => {
        const bounds = el.getBoundingClientRect()
        return { right: bounds.right, width: bounds.width }
      })
      const shortValue = /^\d+(?:\.\d+)?s$/.test(value.textContent.trim())
      return { title: main.textContent.trim().slice(0, 48), width: b.width,
        valid: a.right <= b.left + 1
        && Math.abs(r.top - b.top) <= 2 && Math.abs(r.bottom - b.bottom) <= 2
        && value.scrollWidth <= value.clientWidth + 2 && b.width > 0
        && parseFloat(css.borderInlineStartWidth) === 0 && css.textAlign === 'end'
        && parts.every(part => Math.abs(part.right - (b.right - rightPadding)) <= 1)
        && (!shortValue || b.width <= Math.max(...parts.map(part => part.width)) + leftPadding + rightPadding + 2) }
    }))
  assert.ok(result.length > 0, label + ': missing shared skill value columns')
  assert.deepEqual(result.filter(row => !row.valid), [], label + ': skill value column overlaps or clips')
}
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
await mkdir(destination, { recursive: true })
try {
  const only = process.env.ES2_MATRIX_CASES?.split(",")
  for (const [name, width, height, mobile] of cases.filter(([id]) => !only || only.includes(id))) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile, hasTouch: mobile,
      reducedMotion: name === 'portrait-320' ? 'reduce' : 'no-preference',
      locale: name === 'desktop-1440' || name === 'tablet-landscape-1024' ? 'zh-TW' : 'en-US',
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    try {
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      try {
        await page.locator('.es2-start').waitFor({ state: 'visible', timeout: 30000 })
      } catch (error) {
        const ancestry = await page.locator('.es2-start').first().evaluate(el => {
          const result = []
          for (let node = el; node; node = node.parentElement) {
            const css = getComputedStyle(node), r = node.getBoundingClientRect()
            result.push({ tag: node.tagName, class: node.className, hidden: node.hidden,
              display: css.display, visibility: css.visibility, opacity: css.opacity,
              contentVisibility: css.contentVisibility, width: r.width, height: r.height })
          }
          return result
        }).catch(() => [])
        console.error('ES3_LOBBY_VISIBILITY ' + JSON.stringify({ name, errors, ancestry }))
        await page.screenshot({ path: destination + '/' + name + '-lobby-failure.png' }).catch(() => {})
        throw error
      }
      // Non-editable UI must never enter native text selection, including teleported overlays.
      const verifySelectionPolicy = async (stage) => {
        const offenders = await page.evaluate(() => [...document.body.querySelectorAll('*')]
          .filter(el => !el.closest('input, textarea, [contenteditable]:not([contenteditable="false"])'))
          .filter(el => el.getClientRects().length && getComputedStyle(el).userSelect !== 'none')
          .map(el => el.tagName + ' ' + (el.getAttribute('class') || '')).slice(0, 20))
        assert.deepEqual(offenders, [], name + ': selectable UI at ' + stage)
      }
      await verifySelectionPolicy('home')
      if (!mobile) {
        await page.locator('.es2-menu-brand h1').dblclick()
        assert.equal(await page.evaluate(() => window.getSelection()?.toString()), '', name + ': title text selected')
      }
      const editablePolicy = await page.evaluate(() => {
        const input = document.createElement('input')
        const textarea = document.createElement('textarea')
        const editable = document.createElement('div')
        editable.contentEditable = 'true'
        document.body.append(input, textarea, editable)
        try { return [input, textarea, editable].map(el => getComputedStyle(el).userSelect) }
        finally { input.remove(); textarea.remove(); editable.remove() }
      })
      assert.deepEqual(editablePolicy, ['text', 'text', 'text'], name + ': editable fields must remain selectable')
      const bounds = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
      }))
      assert.ok(bounds.documentWidth <= bounds.viewportWidth + inset,
        name + ': horizontal overflow: ' + JSON.stringify(bounds))
      // All devices expose the hall in the first viewport; wide devices also fit all six heroes.
      const verifyPage = async (selector, count, requireFit) => {
        const layout = await page.evaluate(({selector, requireFit}) => {
          const menu = document.querySelector('.es2-menu')
          const bar = menu.querySelector('.es2-menu-action-bar').getBoundingClientRect()
          const choices = [...menu.querySelectorAll(selector)]
          return { count: choices.length, offenders: choices.filter(el => {
            const r = el.getBoundingClientRect()
            return r.width === 0 || r.height === 0 || r.left < 0 || r.right > innerWidth + 2 ||
              (requireFit && (r.top < 0 || r.bottom > bar.top + 2))
          }).map(el => { const r = el.getBoundingClientRect(); return { text: el.textContent.trim().slice(0, 80), rect: { left:r.left, top:r.top, right:r.right, bottom:r.bottom }, dockTop:bar.top, viewport: [innerWidth, innerHeight] } }) }
        }, {selector, requireFit})
        assert.equal(layout.count, count, name + ': missing choices')
        assert.deepEqual(layout.offenders, [], name + ': choices outside visible menu')
      }
      const verifyDock = async () => {
        const actionLayout = await page.locator('.es2-expedition-change').evaluate(action => {
          const label = action.querySelector('.es2-expedition-change-label')
          const arrow = action.querySelector('.es2-expedition-change-arrow')
          const a = action.getBoundingClientRect(), l = label.getBoundingClientRect(), r = arrow.getBoundingClientRect()
          const range = document.createRange()
          range.selectNodeContents(label)
          const text = range.getBoundingClientRect()
          const brief = action.closest('button').getBoundingClientRect()
          const allowed = ['Modes', 'Heroes', '模式', '英雄']
          return { center: Math.abs((l.top + l.bottom - r.top - r.bottom) / 2),
            beside: r.left >= l.right - 1 && r.right <= a.right + 1 && a.right <= brief.right + 1,
            aligned: Math.abs(text.left - l.left) <= 1,
            fits: allowed.includes(label.textContent.trim()) && text.right <= l.right + 1 &&
              text.bottom <= l.bottom + 1 && label.scrollWidth <= label.clientWidth + 1,
            label: label.textContent.trim() }
        })
        assert.ok(actionLayout.center <= 1 && actionLayout.beside && actionLayout.aligned && actionLayout.fits,
          name + ': dock action alignment ' + JSON.stringify(actionLayout))
        for (const selector of ['[data-es2-expedition-summary]', '[data-es2-mode-summary]', '.es2-start']) {
          const el = page.locator(selector)
          assert.ok(inside(await el.evaluate(rect), width, height), name + ': dock clips ' + selector)
          assert.ok(await el.evaluate(node => node.scrollWidth <= node.clientWidth + 2), name + ': dock text overflow ' + selector)
        }
        const bounds = await page.evaluate(() => {
          const start = document.querySelector('.es2-start'), brief = document.querySelector('[data-es2-expedition-summary]')
          const a = start.getBoundingClientRect(), b = brief.getBoundingClientRect()
          const hit = document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2)
          return { hit: start.contains(hit), overlap: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
            startHeight: a.height, briefHeight: b.height }
        })
        assert.ok(bounds.hit && !bounds.overlap && bounds.startHeight >= 44 && bounds.briefHeight >= 44,
          name + ': inaccessible dock ' + JSON.stringify(bounds))
      }
      const wallet = page.locator('[data-es2-ember-wallet]')
      const walletLayout = await wallet.evaluate(el => {
        const value = el.querySelector('[data-es2-ember-value]'), label = el.querySelector('.es2-embers-label')
        const w = el.getBoundingClientRect(), h = el.closest('.es2-hall-heading').getBoundingClientRect()
        return { left:w.left, right:w.right, top:w.top, bottom:w.bottom, headingRight:h.right,
          font:parseFloat(getComputedStyle(value).fontSize), labelFont:parseFloat(getComputedStyle(label).fontSize),
          overflow:el.scrollWidth-el.clientWidth }
      })
      assert.ok(walletLayout.left >= 0 && walletLayout.right <= Math.min(width, walletLayout.headingRight) + 2 &&
        walletLayout.top >= 0 && walletLayout.bottom <= height && walletLayout.overflow <= 2 &&
        walletLayout.font >= 18 && walletLayout.font > walletLayout.labelFont,
        name + ': wallet prominence or bounds ' + JSON.stringify(walletLayout))
      await verifyDock()
      if (name === 'portrait-320') {
        const decoration = page.locator('[data-es2-portal-decoration]')
        for (const pseudo of ['::before', '::after']) {
          assert.equal(await decoration.evaluate((el, p) => getComputedStyle(el, p).animationName, pseudo), 'none')
        }
      }
      await verifyPage('[data-es2-hall-navigation] button', 5, true)
      await verifyPage('[data-hero], [data-hero-id]', 6, width >= 1000 && height >= 700)
      // The same name typography must apply to classic and specialization cards
      // even when the selection state intentionally changes their foreground color.
      const names = await page.locator('.es2-hero-select-card > .es2-hero-copy > strong').evaluateAll(nodes =>
        nodes.map(el => {
          const style = getComputedStyle(el)
          return { text: el.textContent.trim(), font: [style.fontFamily, style.fontSize, style.fontWeight,
            style.lineHeight, style.textAlign, style.overflowWrap].join('|'),
            visible: el.getBoundingClientRect().height > 0, fits: el.scrollWidth <= el.clientWidth + 2 }
        }))
      assert.equal(names.length, 6, name + ': shared hero names missing')
      assert.equal(new Set(names.map(n => n.font)).size, 1, name + ': hero name typography mismatch')
      assert.ok(names.every(n => n.text && n.visible && n.fits), name + ': hero name clipped ' + JSON.stringify(names))
      // Verify the real selection treatment is exclusive, visible, and stronger than an unselected card.
      const verifyHeroSelection = async () => {
        const result = await page.evaluate(() => {
          const selected = document.querySelector('.es2-hero-select-card[aria-pressed="true"]')
          const ordinary = document.querySelector('.es2-hero-select-card[aria-pressed="false"]')
          const status = selected.querySelector('[data-es2-hero-selected]')
          const a = selected.getBoundingClientRect(), b = status?.getBoundingClientRect()
          const style = getComputedStyle(selected), rest = getComputedStyle(ordinary)
          return { selectedCount: document.querySelectorAll('[data-es2-hero-selected]').length,
            insideCard: !!b && b.left >= a.left && b.right <= a.right && b.top >= a.top && b.bottom <= a.bottom,
            statusVisible: !!b && b.width > 0 && b.height > 0,
            borderDifferent: style.borderColor !== rest.borderColor, shadowDifferent: style.boxShadow !== rest.boxShadow,
            statusBackground: status && getComputedStyle(status).backgroundImage,
            textFits: status && status.scrollWidth <= status.clientWidth + 2 }
        })
        assert.ok(result.selectedCount === 1 && result.insideCard && result.statusVisible &&
          result.borderDifferent && result.shadowDifferent && result.statusBackground !== 'none' && result.textFits,
          name + ': unclear or clipped selected hero ' + JSON.stringify(result))
      }
      await verifyHeroSelection()
      await assertSkillValueColumns(page, name + ': lobby compact skill values')
      const hoverCapable = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)
      const cursor = await page.evaluate(() => ({
        body: getComputedStyle(document.body).cursor,
        action: getComputedStyle(document.querySelector('.es2-start')).cursor
      }))
      if (hoverCapable) {
        assert.match(cursor.body, /url\(/, name + ': desktop themed cursor missing')
        assert.match(cursor.action, /url\(/, name + ': desktop themed action cursor missing')
        assert.notEqual(cursor.body, cursor.action, name + ': actionable cursor must differ')
      } else {
        assert.ok(!cursor.body.includes('url(') && !cursor.action.includes('url('), name + ': custom cursor on touch')
      }
      // A real native cursor remains in place; a bounded, non-interactive accent
      // is triggered by mouse actions only, with reduced-motion/flashing opt-outs.
      const accent = page.locator('[data-es2-cursor-accent]')
      assert.equal(await accent.count(), 1, name + ': expected one reusable cursor accent')
      const exerciseCursor = () => page.locator('[data-hero="knight"]').dispatchEvent('pointerdown', {
        pointerType: 'mouse', button: 0, isPrimary: true, clientX: 100, clientY: 100
      })
      const motionAllowed = await page.evaluate(() => !matchMedia('(prefers-reduced-motion: reduce)').matches &&
        document.documentElement.dataset.es2ReduceMotion !== 'true' &&
        document.documentElement.dataset.es2ReduceFlashing !== 'true')
      await exerciseCursor()
      if (hoverCapable && motionAllowed) {
        assert.ok(await accent.evaluate(el => el.getAnimations().some(a => a.playState === 'running')),
          name + ': cursor accent did not animate')
        assert.equal(await accent.evaluate(el => getComputedStyle(el).pointerEvents), 'none')
      } else {
        assert.equal(await accent.evaluate(el => el.getAnimations().length), 0)
      }
      await page.evaluate(() => {
        const el = document.documentElement
        el.dataset.cursorTestPreviousMotion = el.getAttribute('data-es2-reduce-motion') ?? ''
        el.setAttribute('data-es2-reduce-motion', 'true')
      })
      await exerciseCursor()
      assert.equal(await accent.evaluate(el => getComputedStyle(el).display), 'none', name + ': reduced motion')
      await page.evaluate(() => {
        const el = document.documentElement
        const previous = el.dataset.cursorTestPreviousMotion
        if (previous) el.setAttribute('data-es2-reduce-motion', previous)
        else el.removeAttribute('data-es2-reduce-motion')
        delete el.dataset.cursorTestPreviousMotion
      })
      if (hoverCapable) {
        assert.equal(await page.locator('[data-es2-hero-details]:visible').count(), 6, name + ': desktop full-detail buttons')
        const card = page.locator('[data-hero="wizard"]')
        const selectedBefore = await page.locator('[data-es2-selected-hero]').getAttribute('data-es2-selected-hero')
        await card.hover()
        const tip = page.locator('[data-es2-hover-details]')
        await tip.waitFor({ state: 'visible' })
        assert.match(await tip.innerText(), /虛空術士|Void/i)
        await assertSkillValueColumns(tip, name + ': hero hover')
        assert.ok(inside(await tip.evaluate(rect), width, height), name + ': hero tooltip clips')
        assert.ok(await card.evaluate(el => {
          const a = el.getBoundingClientRect(), p = document.querySelector('[data-es2-hover-details]').getBoundingClientRect()
          return p.right <= a.left || p.left >= a.right || p.bottom <= a.top || p.top >= a.bottom
        }), name + ': hero tooltip overlaps its own trigger')
        assert.equal(await page.locator('[data-es2-hover-details]').count(), 1)
        assert.equal(await page.locator('[data-es2-selected-hero]').getAttribute('data-es2-selected-hero'), selectedBefore)
        assert.equal(await tip.evaluate(el => getComputedStyle(el).pointerEvents), 'none', name + ': tooltip must not intercept adjacent cards')
        await page.locator('[data-hero-id="spirit-summoner"]').hover()
        await tip.waitFor({ state: 'visible' })
        assert.match(await tip.innerText(), /靈契召喚師|Spirit Summoner/i)
        assert.ok(inside(await tip.evaluate(rect), width, height), name + ': specialization tooltip clips')
        await page.locator('[data-es2-hero-details="wizard"]').click()
        const desktopDetail = page.locator('.es2-dialog[role="dialog"]')
        await desktopDetail.waitFor({ state: 'visible' })
        await assertSkillValueColumns(desktopDetail, name + ': desktop hero detail')
        await desktopDetail.locator('.es2-close').click()
        await desktopDetail.waitFor({ state: 'hidden' })
        await page.keyboard.press('Escape')
        await tip.waitFor({ state: 'hidden' })
        // Keyboard users receive the same details without another tab stop.
        await page.mouse.move(0, 0)
        await page.keyboard.press('Tab')
        await card.focus()
        await tip.waitFor({ state: 'visible' })
        assert.equal(await card.getAttribute('aria-describedby'), await tip.getAttribute('id'))
        await page.keyboard.press('Escape')
        await tip.waitFor({ state: 'hidden' })
      } else {
        assert.equal(await page.locator('[data-es2-hero-details]:visible').count(), 6, name + ': touch details unavailable')
        await page.locator('[data-es2-hero-details="wizard"]').click()
        const details = page.locator('.es2-dialog[role="dialog"]')
        await details.waitFor({ state: 'visible' })
        await assertSkillValueColumns(details, name + ': touch hero detail')
        assert.match(await details.innerText(), /虛空術士|Void/i)
        await details.locator('.es2-close').click()
        await details.waitFor({ state: 'hidden' })
      }
      await page.screenshot({ path: destination + '/' + name + '-home-full.png', animations: 'disabled' })
      await page.locator('[data-es2-expedition-navigation]').click()
      // Inspect the actual first animation frame as well as the normal layout.
      // A translated full-width grid can clip at 390px even when its final layout fits.
      const entryOffenders = await page.locator('.es2-mode-section').evaluate(section => {
        const animations = section.getAnimations()
        const times = animations.map(animation => animation.currentTime)
        try {
          for (const animation of animations) animation.currentTime = 0
          return [...section.querySelectorAll('[data-mode], [data-objective-mode]')].flatMap(el => {
            const r = el.getBoundingClientRect()
            return r.left < -2 || r.right > innerWidth + 2 ? [{ text: el.textContent.trim().slice(0, 80), left: r.left, right: r.right }] : []
          })
        } finally {
          animations.forEach((animation, index) => { animation.currentTime = times[index] })
        }
      })
      assert.deepEqual(entryOffenders, [], name + ': expedition cards clip during the first entry frame')
      await verifyPage('[data-mode], [data-objective-mode]', 9, width >= 1000 && height >= 700)
      if (hoverCapable) {
        assert.equal(await page.locator('[data-es2-mode-details]:visible').count(), 5)
        const card = page.locator('[data-objective-mode="boss-rush"]')
        const before = await card.getAttribute('aria-checked')
        await card.hover()
        const tip = page.locator('[data-es2-hover-details]')
        await tip.waitFor({ state: 'visible' })
        assert.match(await tip.innerText(), /首領連戰|Boss Rush/i)
        assert.ok(inside(await tip.evaluate(rect), width, height), name + ': mode tooltip clips')
        assert.equal(await card.getAttribute('aria-checked'), before)
        await page.keyboard.press('Escape')
        await tip.waitFor({ state: 'hidden' })
      } else {
        assert.equal(await page.locator('[data-es2-mode-details]:visible').count(), 5)
      }
      await verifyDock()
      await verifyPage('[data-es2-hall-navigation] button', 5, true)
      await page.screenshot({ path: destination + '/' + name + '-expeditions.png', animations: 'disabled' })
      await page.locator('[data-es2-expedition-navigation]').click()
      const headerSettings = page.locator('.es2-top-actions [data-es2-settings]')
      const headerGoogle = page.locator('.es2-top-actions [data-es2-cloud-account]')
      const gear = await headerSettings.boundingBox()
      const google = await headerGoogle.boundingBox()
      assert.equal((await headerSettings.innerText()).trim(), '⚙', name + ': settings must be icon-only')
      assert.ok(gear && google && gear.width >= 44 && gear.height >= 44, name + ': settings touch target')
      assert.ok(Math.abs(gear.y + gear.height / 2 - google.y - google.height / 2) <= 2, name + ': Google/settings must align horizontally')
      assert.ok(gear.x - google.x - google.width >= 5 && gear.x - google.x - google.width <= 12, name + ': Google/settings gap must stay compact')
      assert.ok(gear.x + gear.width <= width + 1, name + ': settings clips the viewport')
      await headerSettings.click()
      const dialog = page.locator('.es2-dialog[role="dialog"]')
      await dialog.waitFor({ state: 'visible' })
      await verifySelectionPolicy('settings dialog and close button')
      await dialog.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
      const initialDialog = await dialog.evaluate(rect)
      assert.ok(inside(initialDialog, width, height),
        name + ': settings modal clips viewport: ' + JSON.stringify(initialDialog))
      const verifyDialogChrome = async (kind) => {
        const layout = await dialog.evaluate(element => {
          const bounds = child => { const b = child.getBoundingClientRect(); return { top:b.top, bottom:b.bottom, height:b.height } }
          return {
            panel: bounds(element),
            heading: bounds(element.querySelector('.es2-dialog-header')),
            body: bounds(element.querySelector('.es2-dialog-body')),
            actions: element.querySelector('.es2-dialog-actions') ? bounds(element.querySelector('.es2-dialog-actions')) : null,
          }
        })
        assert.ok(layout.heading.top >= layout.panel.top - inset && layout.heading.bottom <= layout.body.top + inset,
          name + ': ' + kind + ' heading is not pinned above the scrollable body: ' + JSON.stringify(layout))
        assert.ok(layout.body.bottom <= (layout.actions?.top ?? layout.panel.bottom) + inset,
          name + ': ' + kind + ' body obscures its actions: ' + JSON.stringify(layout))
        if (layout.actions) assert.ok(layout.actions.bottom <= layout.panel.bottom + inset,
          name + ': ' + kind + ' footer is outside the dialog: ' + JSON.stringify(layout))
      }
      const verifySettingsWidth = async (stage) => {
        const result = await dialog.evaluate(panel => {
          const body = panel.querySelector('.es2-dialog-body')
          const box = body.getBoundingClientRect()
          const left = box.left + body.clientLeft, right = left + body.clientWidth
          const offenders = [...body.querySelectorAll('section, header, div, button, input, label, output, p, strong, small, span')]
            .filter(el => el.getClientRects().length && el.getBoundingClientRect().width > 0)
            .filter(el => { const r = el.getBoundingClientRect(); return r.left < left - 1 || r.right > right + 1 })
            .map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.trim().slice(0, 50) }))
          const range = body.scrollWidth - body.clientWidth
          body.scrollLeft = 100
          const offset = body.scrollLeft
          body.scrollLeft = 0
          return { range, offset, panelRange: panel.scrollWidth - panel.clientWidth,
            overflowX: getComputedStyle(body).overflowX, overflowY: getComputedStyle(body).overflowY, offenders }
        })
        assert.equal(result.overflowX, 'hidden', name + ': ' + stage + ' horizontal scrolling enabled')
        assert.equal(result.overflowY, 'auto', name + ': ' + stage + ' vertical scrolling disabled')
        assert.ok(result.range <= 1 && result.panelRange <= 1 && result.offset <= 1,
          name + ': ' + stage + ' settings horizontal overflow ' + JSON.stringify(result))
        assert.deepEqual(result.offenders, [], name + ': ' + stage + ' settings controls clipped')
      }
      await verifyDialogChrome('settings')
      await verifySettingsWidth('initial')
      await dialog.locator('.es2-dialog-body').evaluate(element => { element.scrollTop = element.scrollHeight })
      await verifyDialogChrome('settings after scrolling')
      const scale = page.locator('#es2-interface-scale')
      await scale.evaluate(el => { el.value = '1.25'; el.dispatchEvent(new Event('input', { bubbles: true })) })
      const actual = await dialog.evaluate(el => getComputedStyle(el).getPropertyValue('--es2-ui-scale').trim())
      assert.equal(actual, '1.25', name + ': UI scale is not reflected by the dialog')
      assert.ok(inside(await dialog.evaluate(rect), width, height), name + ': 125% scaled modal clips viewport')
      const language = page.locator('#es2-language')
      await language.click()
      const option = page.locator('#es2-language-listbox [data-es2-value="en"]')
      await option.waitFor({ state: 'visible' })
      assert.ok(inside(await page.locator('#es2-language-listbox').evaluate(rect), width, height),
        name + ': language listbox clips viewport')
      await option.click()
      assert.equal(await language.getAttribute('aria-expanded'), 'false')
      await assertLocalizedTextFits(page, name, 'en')
      await verifySettingsWidth('English 125%')
      // Run the same real-browser layout check in Traditional Chinese.
      await language.click()
      await page.locator('#es2-language-listbox [data-es2-value="zh-TW"]').click()
      await assertLocalizedTextFits(page, name, 'zh-TW')
      await verifySettingsWidth('Traditional Chinese 125%')
      await language.click()
      await page.locator('#es2-language-listbox [data-es2-value="en"]').click()
      await page.screenshot({ path: destination + '/' + name + '-settings.png', animations: 'disabled' })
      await page.locator('.es2-close').click()
      await verifyDock()
      // The actual selection, not an authored mock, must update the visible brief on returning to the hero page.
      await page.locator('[data-es2-expedition-navigation]').click()
      await page.locator('[data-objective-mode="boss-rush"]').click()
      if (hoverCapable) {
        const tip = page.locator('[data-es2-hover-details]')
        await tip.waitFor({ state: 'visible' })
        const tipBottom = await tip.evaluate(el => el.getBoundingClientRect().bottom)
        const dockTop = await page.locator('.es2-menu-action-bar').evaluate(el => el.getBoundingClientRect().top)
        assert.ok(tipBottom <= dockTop + 2, name + ': hover dossier covers expedition dock')
      }
      await page.locator('[data-es2-expedition-navigation]').click()
      assert.equal(await page.locator('[data-es2-expedition-summary]').getAttribute('data-run-mode'), 'boss-rush')
      assert.match(await page.locator('[data-es2-mode-summary]').innerText(), /five increasingly powerful bosses/i)
      await verifyDock()
      await page.screenshot({ path: destination + '/' + name + '-portal-boss-rush-125.png', animations: 'disabled' })
      await page.locator('[data-es2-expedition-navigation]').click()
      await page.locator('[data-mode="quick"]').click()
      await page.locator('[data-es2-expedition-navigation]').click()
      await page.locator('.es2-hall-links button').first().click()
      const tabs = page.locator('.es2-hall-links button')
      const archivePage = page.locator('[data-es2-archive-page]')
      await archivePage.waitFor({ state: 'visible' })
      assert.equal(await tabs.count(), 5, name + ': missing archive categories')
      assert.equal(await page.locator('.es2-archive-tabs').count(), 0, name + ': duplicated archive navigation')
      assert.equal(await page.locator('[role="dialog"]').count(), 0, name + ': archive must not be modal')
      assert.equal(await page.locator('.es2-start').isVisible(), false)
      for (let index = 0; index < 5; index++) {
        await tabs.nth(index).click()
        assert.equal(await tabs.nth(index).getAttribute('aria-current'), 'page',
          name + ': archive selection is inaccessible')
        assert.ok(inside(await page.locator('[data-es2-return-lobby]').evaluate(rect), width, height),
          name + ': return navigation clips viewport')
        await verifySelectionPolicy('archive')
        await assertLocalizedTextFits(page, name, 'en-archive')
        const uncentered = await archivePage.locator('.es2-archive-card').evaluateAll(cards => cards.flatMap(card => {
          const slot = card.querySelector(':scope > .es2-archive-art')
          const art = slot?.firstElementChild
          if (!slot || !art) return [card.textContent.trim().slice(0, 64)]
          const a = art.getBoundingClientRect(), b = slot.getBoundingClientRect(), r = card.getBoundingClientRect()
          const centered = Math.abs((a.left + a.right - r.left - r.right) / 2) <= 1.5 &&
            Math.abs((a.top + a.bottom - b.top - b.bottom) / 2) <= 1.5 &&
            a.left >= b.left - 1 && a.right <= b.right + 1
          return centered ? [] : [card.textContent.trim().slice(0, 64)]
        }))
        assert.deepEqual(uncentered, [], name + ': archive artwork must be centered')
        if (await archivePage.getAttribute('data-es2-archive-page') === 'progression') {
          const power = page.locator('[data-hall-inspect="power"]')
          await power.waitFor({ state: 'visible' })
          // Geometry checks need settled layout: late fonts/art shift rows and make Playwright re-scroll on click.
          await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('.hall-growth img')].map(img => img.decode().catch(() => {}))) })
          const rank = await page.locator('[data-hall-node="power"] [role="progressbar"]').getAttribute('aria-valuenow')
          const growth = power.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " hall-growth ")][1]')
          assert.equal(await growth.locator('.hall-map .hall-buy, .hall-map p').count(), 0, name + ': redundant node card details')
          assert.equal(await growth.locator('.hall-map .hall-buy').count(), 0, name + ': no inline node purchase')
          const bounds = await growth.locator('.hall-map').evaluate(el => ({ height: el.getBoundingClientRect().height, scrollWidth: el.scrollWidth, width: el.clientWidth }))
          assert.ok(bounds.scrollWidth <= bounds.width + 1, name + ': compact graph overflows')
          assert.ok(bounds.height <= 405, name + ': compact graph exceeds height budget ' + bounds.height)
          const graph = await page.locator('[data-hall-edge]').count()
          if (await page.locator('.es2-progression-panel').count()) assert.equal(graph, 4, name + ': authoritative research edges missing')
          const node = graph ? page.locator('[data-hall-inspect="insight"]') : page.locator('[data-hall-inspect="vitality"]')
          // Upgrade dock: one in-flow inspector + purchase action, never a modal sheet to open and close.
          const scroller = page.locator('.es2-menu-scroll')
          const details = growth.locator('[data-hall-detail]')
          const buy = details.locator('[data-hall-confirm]')
          const clear = async (ids, label) => {
            const dock = await details.evaluate(rect)
            for (const id of ids) {
              const ring = await growth.locator('[data-hall-node="' + id + '"] .hall-ring').evaluate(rect)
              assert.ok(inside(ring, width, height), name + ': ' + label + ' node ' + id + ' outside viewport')
              assert.ok(ring.bottom <= dock.y + 1 || ring.right <= dock.x + 1 || ring.y >= dock.bottom - 1,
                name + ': ' + label + ' node ' + id + ' hidden under upgrade dock')
            }
          }
          const rowIds = await growth.locator('.hall-row').evaluateAll(rows => rows.map(row =>
            [...row.querySelectorAll('[data-hall-node]')].map(el => el.getAttribute('data-hall-node'))))
          await scroller.evaluate(el => { el.scrollTop = 0 })
          assert.equal(await page.locator('[data-hall-close], .hall-detail--floating').count(), 0, name + ': upgrade sheet must not need opening')
          assert.ok(inside(await buy.evaluate(rect), width, height), name + ': purchase action must be on the first screen')
          await clear(rowIds[0], 'first-screen')
          if (height >= 844 || (!mobile && height >= 900)) {
            await clear(rowIds.flat(), 'tall-screen')
            // Skins and reset live below the tree; only the tree + dock must fit the first screen.
            const bottom = await growth.evaluate(el => el.getBoundingClientRect().bottom)
            assert.ok(bottom <= height + 1, name + ': research hall must not need page scrolling (' + Math.round(bottom - height) + 'px)')
          }
          await growth.evaluate(el => el.scrollIntoView({ block: 'end', behavior: 'instant' }))
          assert.ok(inside(await buy.evaluate(rect), width, height), name + ': purchase action must stay docked while scrolling')
          await clear(rowIds.at(-1), 'scrolled')
          await node.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' })) // clear of the bottom dock
          const scrollBefore = await scroller.evaluate(el => el.scrollTop)
          // Raw pointer: Playwright's hover/click re-scroll on sub-pixel settling, hiding what a player sees.
          const box = await node.boundingBox()
          if (hoverCapable && !mobile) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
          const scrollAfter = await scroller.evaluate(el => el.scrollTop)
          assert.ok(Math.abs(scrollAfter - scrollBefore) <= 1, name + ': inspection must not scroll archive (' + scrollBefore + ' -> ' + scrollAfter + ')')
          assert.ok(inside(await buy.evaluate(rect), width, height), name + ': purchase action hidden after inspection')
          assert.equal((await details.locator('.hall-detail-heading strong').innerText()).trim(), (await node.locator('strong').innerText()).trim(), name + ': inspected node mismatch')
          assert.equal(await page.locator('[data-hall-node="power"] [role="progressbar"]').getAttribute('aria-valuenow'), rank, name + ': inspection must never spend')
          await power.locator('img').evaluate(img => img.decode())
          assert.ok(await power.locator('img').evaluate(img => img.naturalWidth > 0), name + ': WebP node art missing')
          if (hoverCapable && motionAllowed && !mobile) {
            await power.hover()
            assert.notEqual(await power.locator('.hall-ring').evaluate(el => getComputedStyle(el, '::after').animationName), 'none', name + ': hover shimmer absent')
          }
          for (const attribute of ['data-es2-reduce-motion', 'data-es2-reduce-flashing']) {
            const previous = await page.evaluate(key => {
              const root = document.documentElement
              const before = root.getAttribute(key)
              root.setAttribute(key, 'true')
              return before
            }, attribute)
            assert.equal(await power.locator('.hall-ring').evaluate(el => getComputedStyle(el, '::after').display), 'none', name + ': ' + attribute + ' must suppress shimmer')
            await page.evaluate(({ key, value }) => {
              if (value === null) document.documentElement.removeAttribute(key)
              else document.documentElement.setAttribute(key, value)
            }, { key: attribute, value: previous })
          }
          await assertLocalizedTextFits(page, name, 'en-hall-growth')
          await page.screenshot({ path: destination + '/' + name + '-hall-growth-en.png', animations: 'disabled' })
          if (await page.locator('[data-hall-tab="mastery"]').count()) {
            await page.locator('[data-hall-tab="mastery"]').click()
            assert.equal(await page.locator('[data-hall-category="mastery"]').isVisible(), true)
            assert.equal(await page.locator('[data-hall-category="research"]').isVisible(), false)
            await page.locator('[data-hall-tab="unlocks"]').click()
            assert.equal(await page.locator('[data-hall-category="unlocks"]').isVisible(), true)
            await page.locator('[data-hall-tab="achievements"]').click()
            assert.equal(await page.locator('[data-hall-category="achievements"]').isVisible(), true)
            await page.locator('[data-hall-tab="research"]').click()
            assert.equal(await page.locator('[data-hall-category="research"]').isVisible(), true)
          }
          await headerSettings.click()
          await page.locator('#es2-language').click()
          await page.locator('#es2-language-listbox [data-es2-value="zh-TW"]').click()
          await page.locator('.es2-close').click()
          await assertLocalizedTextFits(page, name, 'zh-TW-hall-growth')
          await page.screenshot({ path: destination + '/' + name + '-hall-growth-zh-TW.png', animations: 'disabled' })
          await headerSettings.click()
          await page.locator('#es2-language').click()
          await page.locator('#es2-language-listbox [data-es2-value="en"]').click()
          await page.locator('.es2-close').click()
        }
      }
      const achievement = page.locator('[data-es2-context-card="achievement:first-blood"]')
      const info = achievement.locator('[data-es2-card-info]')
      if (hoverCapable) {
        assert.equal(await info.isVisible(), true)
        await achievement.hover()
        const tip = page.locator('[data-es2-hover-details]')
        await tip.waitFor({ state: 'visible' })
        assert.ok(inside(await tip.evaluate(rect), width, height), name + ': archive detail clips')
        assert.match(await tip.innerText(), /初臨戰場|First Blood/i)
        await page.keyboard.press('Escape')
        await tip.waitFor({ state: 'hidden' })
      } else {
        assert.equal(await info.isVisible(), true)
        await info.click()
        const detail = page.locator('.es2-dialog[role="dialog"]')
        await detail.waitFor({ state: 'visible' })
        assert.match(await detail.innerText(), /初臨戰場|First Blood/i)
        await detail.locator('.es2-close').click()
      }
      await page.screenshot({ path: destination + '/' + name + '-archive.png', animations: 'disabled' })
      await page.locator('[data-es2-return-lobby]').click()
      await page.locator('.es2-start').waitFor({ state: 'visible' })
      await verifyDock()
      let startedGame = false
      if (mobile && name.startsWith('tablet-')) {
        // Touch tablets must not render a permanent desktop equipment bar over
        // the real joystick/dash; all secondary HUD content belongs in the drawer.
        await page.locator('.es2-start').click()
        await page.locator('.es2-mobile-controls[data-active="true"]').waitFor({ state: 'visible', timeout: 30000 })
        const toggle = page.locator('[data-es2-info-toggle]')
        await toggle.waitFor({ state: 'visible' })
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false',
          name + ': touch tablet should start with optional information collapsed')
        assert.equal(await page.locator('.es2-hud__bottom').isVisible(), false,
          name + ': permanent skill/relic bar overlaps touch controls')
        await toggle.click()
        const layout = await page.evaluate(() => {
          const box = el => { const b = el.getBoundingClientRect()
            return { x: b.x, y: b.y, right: b.right, bottom: b.bottom } }
          return {
            drawer: box(document.querySelector('[data-es2-info-panel]')),
            joystick: box(document.querySelector('[data-testid="es2-stick"]')),
            dash: box(document.querySelector('[data-testid="es2-dash"]')),
          }
        })
        const intersects = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
        assert.ok(!intersects(layout.drawer, layout.joystick) && !intersects(layout.drawer, layout.dash),
          name + ': drawer obscures touch controls ' + JSON.stringify(layout))
        await page.screenshot({ path: destination + '/' + name + '-game.png', animations: 'disabled' })
        startedGame = true
      } else if (!mobile && name !== 'desktop-zoom-200-equivalent') {
        await page.locator('.es2-start').click()
        await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
        assert.ok(await page.locator('.es2-hud__bottom').isVisible(),
          name + ': desktop equipment HUD unexpectedly collapsed')
        await page.screenshot({ path: destination + '/' + name + '-game.png', animations: 'disabled' })
        startedGame = true
      } else {
        await page.screenshot({ path: destination + '/' + name + '-menu.png', animations: 'disabled' })
      }
      if (startedGame) {
        await page.locator('[data-es2-pause]').click()
        await page.locator('#paused').waitFor({ state: 'visible' })
        const layers = await page.evaluate(() => ({
          backdrop: Number(getComputedStyle(document.querySelector('.es2-backdrop')).zIndex),
          hud: Number(getComputedStyle(document.querySelector('.es2-hud')).zIndex),
        }))
        assert.ok(layers.backdrop > layers.hud,
          name + ': pause dialog must appear above the combat HUD')
        await page.screenshot({ path: destination + '/' + name + '-pause.png', animations: 'disabled' })
        await page.locator('#resume').click()
        await page.locator('[data-es2-home]').click()
        await page.locator('[data-es2-home-confirm]').waitFor({ state: 'visible' })
        assert.ok(await page.locator('[data-es2-home-cancel]').evaluate(el => el.classList.contains('es2-primary')),
          name + ': Continue Battle must remain the primary non-destructive action')
        await page.screenshot({ path: destination + '/' + name + '-home-confirm.png', animations: 'disabled' })
        await page.locator('[data-es2-home-cancel]').click()
        await page.locator('.es2-hud--active').waitFor({ state: 'visible' })
      }
      if (mobile && width <= 430 && height > width) {
        await page.locator('[data-hero-id="spirit-summoner"]').click()
        await page.locator('.es2-start').click()
        await page.locator('.es2-hud--active').waitFor({ state: 'visible', timeout: 30000 })
        // Stress the actual rendered HUD with a long health/status value, independent of combat RNG.
        const healthLayout = await page.locator('.es2-hud__health-head').first().evaluate(row => {
          const value = row.lastElementChild
          const original = value.textContent
          value.textContent = 'HP 89 / 204 | 3/3 Charges ready'
          const r = row.getBoundingClientRect(), v = value.getBoundingClientRect()
          const hero = row.closest('.es2-hud__hero').getBoundingClientRect()
          const controls = document.querySelector('.es2-hud__controls').getBoundingClientRect()
          const result = { rowRight:r.right, valueRight:v.right, heroRight:hero.right, controlsLeft:controls.left,
            valueOverflow:value.scrollWidth-value.clientWidth }
          value.textContent = original
          return result
        })
        assert.ok(healthLayout.valueRight <= healthLayout.rowRight + 1 &&
          healthLayout.valueRight <= healthLayout.heroRight + 1 &&
          healthLayout.heroRight <= healthLayout.controlsLeft + 1 && healthLayout.valueOverflow <= 1,
          name + ': health/status overflows player panel ' + JSON.stringify(healthLayout))
      }
      assert.deepEqual(errors, [], name + ': uncaught browser exceptions')
      console.log('PASS ' + name + ': settings, scale, language, archive tabs and viewport bounds')
    } catch (error) {
      await page.screenshot({ path: destination + '/' + name + '-failed.png' }).catch(() => {})
      throw error
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
