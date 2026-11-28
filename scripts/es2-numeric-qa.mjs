import assert from 'node:assert/strict'

export async function assertNumericFont(page, label) {
  const font = await page.evaluate(async () => {
    const family = '"Eclipse Numerals"'
    const loaded = await document.fonts.load('700 24px ' + family, '0123456789')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = '700 24px ' + family + ', system-ui, sans-serif'
    const widths = [...'0123456789'].map(digit => ctx.measureText(digit).width)
    const shape = char => {
      canvas.width = 40; canvas.height = 40
      ctx.font = '700 24px ' + family + ', system-ui, sans-serif'
      ctx.fillText(char, 3, 30)
      return Array.from(ctx.getImageData(0,0,40,40).data)
    }
    const zero = shape('0'), lower = shape('o'), upper = shape('O')
    return { loaded:loaded.some(face => face.status === 'loaded' && face.family.includes('Eclipse Numerals')),
      equal: Math.max(...widths)-Math.min(...widths)<.1,
      distinct: zero.some((v,i)=>v!==lower[i]) && zero.some((v,i)=>v!==upper[i]) }
  })
  assert.ok(font.loaded && font.equal && font.distinct, label + ': numeric face ' + JSON.stringify(font))
}

export async function assertModeDurations(page, label) {
  const cards = await page.locator('.es2-mode-card').evaluateAll(nodes => nodes.map(card => {
    const chip = card.querySelector('.es2-mode-time'), value = chip.querySelector('[data-es2-mode-time-value]')
    const unit = chip.querySelector('[data-es2-mode-time-unit]')
    const bounds = el => el.getBoundingClientRect()
    const c = bounds(card), t = bounds(chip), copy = bounds(card.querySelector('.es2-mode-copy')), v = bounds(value)
    const info = card.parentElement.querySelector('.es2-mode-detail-trigger')
    const i = info?.getBoundingClientRect()
    const font = parseFloat(getComputedStyle(value).fontSize)
    const endless = chip.classList.contains('es2-mode-time--endless')
    const centered = !endless || (Math.abs((v.top+v.bottom-t.top-t.bottom)/2)<=1 &&
      Math.abs((v.left+v.right-t.left-t.right)/2)<=1 && !unit)
    const icon = info?.querySelector('span')
    const heroInfo = document.querySelector('.es2-hero-detail-trigger')
    const infoStyle = info && getComputedStyle(info)
    const heroStyle = heroInfo && getComputedStyle(heroInfo)
    const plain = getComputedStyle(chip).borderTopWidth === '0px' &&
      getComputedStyle(chip).backgroundImage === 'none'
    const corner = !!i && Math.abs(i.top-c.top)<=1 && Math.abs(i.right-c.right)<=1 &&
      infoStyle.paddingTop==='15px' && icon?.getBoundingClientRect().width===22 &&
      (!heroStyle || infoStyle.paddingRight===heroStyle.paddingRight) &&
      !!icon && bounds(icon).top>=i.top+14 && bounds(icon).bottom<=i.bottom+1
    const cardStyle = getComputedStyle(card)
    const rightAligned = Math.abs(c.right-t.right-parseFloat(cardStyle.borderRightWidth)-parseFloat(cardStyle.paddingRight))<=1 &&
      parseFloat(cardStyle.paddingRight)<=9
    const bottomAligned = Math.abs(c.bottom-t.bottom-parseFloat(cardStyle.borderBottomWidth)-parseFloat(cardStyle.paddingBottom))<=1 &&
      parseFloat(cardStyle.paddingBottom)<=6
    const scale = parseFloat(getComputedStyle(card).getPropertyValue('--es2-ui-scale')) || 1
    const compact = scale > 1 || c.height <= 112
    const inline = !unit || (v.right<=unit.getBoundingClientRect().left+1 &&
      Math.abs((v.top+v.bottom-unit.getBoundingClientRect().top-unit.getBoundingClientRect().bottom)/2)<=1)
    return { mode:card.dataset.mode ?? card.dataset.objectiveMode, text:value.textContent, font,
      height:c.height, centered, plain, corner, rightAligned, bottomAligned, compact, inline, valid: centered && plain && corner && rightAligned && bottomAligned && compact && inline && !!i && i.width >= 44 && i.height >= 44 && i.left >= c.left-1 && i.right <= c.right+1
        && i.bottom <= c.bottom+1 && t.top >= i.bottom-1
        && font >= (value.textContent==='∞'?26:18) && (!unit || parseFloat(getComputedStyle(unit).fontSize)>=11)
        && t.left>=c.left-1 && t.right<=c.right+1 && t.top>=c.top-1 && t.bottom<=c.bottom+1
        && copy.right<=t.left+1 && copy.right<=i.left+1 && copy.top>=c.top-1 && copy.bottom<=c.bottom+1
        && v.width<=t.width+1 && chip.scrollWidth<=chip.clientWidth+1
        && getComputedStyle(value).fontFamily.includes('Eclipse Numerals') }
  }))
  assert.equal(cards.length,9,label + ': missing expedition time chips and info controls')
  const heights = cards.map(card=>card.height)
  assert.ok(Math.max(...heights)-Math.min(...heights)<=1, label + ': expedition card heights differ ' + JSON.stringify(cards.map(({mode,height})=>({mode,height}))))
  assert.deepEqual(cards.filter(card=>!card.valid),[],label + ': duration readability or overflow')
}

export async function assertDockDuration(page, label) {
  const summary = page.locator('[data-es2-expedition-summary]')
  const id = await summary.getAttribute('data-run-mode')
  const card = page.locator(`[data-es2-mode-id="${id}"] .es2-mode-time`)
  const dock = summary.locator('.es2-expedition-duration')
  const value = await dock.locator('[data-es2-mode-time-value]').textContent()
  assert.equal(value, await card.locator('[data-es2-mode-time-value]').textContent(), label + ': card/dock duration')
  assert.equal(await dock.getAttribute('aria-label'), await card.getAttribute('aria-label'))
  assert.equal(await dock.locator('[data-es2-mode-time-unit]').count(), value === '∞' ? 0 : 1)
  if (value !== '∞') assert.equal(await dock.locator('[data-es2-mode-time-unit]').textContent(), 'MIN')
  const layout = await dock.evaluate(el => {
    const b = el.getBoundingClientRect(), p = el.closest('.es2-mobile-selected-mode').getBoundingClientRect()
    const v = el.querySelector('[data-es2-mode-time-value]').getBoundingClientRect()
    return { fits:b.width>0 && b.height>0 && b.left>=p.left-1 && b.right<=p.right+1 &&
      el.scrollWidth<=el.clientWidth+1, centered:Math.abs((v.top+v.bottom-b.top-b.bottom)/2)<=1 }
  })
  assert.ok(layout.fits && layout.centered, label + ': dock duration geometry ' + JSON.stringify(layout))
}
