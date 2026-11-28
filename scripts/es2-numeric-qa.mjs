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
    const font = parseFloat(getComputedStyle(value).fontSize)
    return { mode:card.dataset.mode, text:value.textContent, font,
      valid: font >= (card.dataset.mode==='endless'?26:18) && (!unit || parseFloat(getComputedStyle(unit).fontSize)>=11)
        && t.left>=c.left-1 && t.right<=c.right+1 && t.top>=c.top-1 && t.bottom<=c.bottom+1
        && copy.right<=t.left+1 && v.width<=t.width+1 && chip.scrollWidth<=chip.clientWidth+1
        && getComputedStyle(value).fontFamily.includes('Eclipse Numerals') }
  }))
  assert.equal(cards.length,4,label + ': missing classic time chips')
  assert.deepEqual(cards.filter(card=>!card.valid),[],label + ': duration readability or overflow')
}
