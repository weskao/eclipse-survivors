import assert from 'node:assert/strict'

// Verify actual decoded art and geometry, not an inline glyph or background.
export async function assertExpeditionModeIcons(page, label, { cards = false } = {}) {
  const selector = cards ? '[data-mode] .es2-mode-sigil, [data-objective-mode] .es2-mode-sigil, .es2-expedition-sigil' : '.es2-expedition-sigil'
  await page.locator(selector).first().waitFor({ state: 'visible' })
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(icon => {
    const img = icon.querySelector('img')
    return img && img.dataset.es2ImageState === 'loaded' && img.complete && img.naturalWidth > 0
  }), selector)
  const icons = await page.locator(selector).evaluateAll(async elements => Promise.all(elements.map(async icon => {
    const img = icon.querySelector('img')
    if (img) await img.decode().catch(() => {})
    const r = icon.getBoundingClientRect(), owner = icon.closest('button'), b = owner.getBoundingClientRect()
    const title = owner.querySelector('.es2-mode-copy, .es2-objective-heading strong, .es2-mobile-selected-mode')?.getBoundingClientRect()
    return { id: icon.dataset.es2ModeIcon, src: img?.currentSrc, naturalWidth: img?.naturalWidth, naturalHeight: img?.naturalHeight,
      square: Math.abs(r.width - r.height) <= 1, width: r.width,
      contained: r.left >= b.left - 1 && r.right <= b.right + 1 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1,
      separate: !title || r.right <= title.left + 1,
      imageFits: img && getComputedStyle(img).objectFit === 'contain' && getComputedStyle(icon).clipPath === 'none',
      loaded: img?.dataset.es2ImageState === 'loaded' && getComputedStyle(img).visibility === 'visible' && getComputedStyle(icon, '::before').content === 'none' }
  })))
  assert.equal(icons.length, cards ? await page.locator('[data-mode], [data-objective-mode]').count() + 1 : 1, label + ': missing mode emblems')
  for (const icon of icons) {
    assert.ok(icon.src && icon.naturalWidth === 192 && icon.naturalHeight === 192 &&
      icon.square && icon.width >= 28 && icon.contained && icon.separate && icon.imageFits && icon.loaded,
    label + ': mode emblem decode/layout ' + JSON.stringify(icon))
  }
  if (cards) {
    const dock = icons.at(-1)
    const matches = icons.slice(0, -1).filter(icon => icon.id === dock.id)
    assert.equal(new Set(icons.slice(0, -1).map(icon => icon.src)).size, icons.length - 1, label + ': distinct mode artwork')
    assert.equal(matches.length, 1, label + ': selected mode card missing')
    assert.equal(matches[0].src, dock.src, label + ': mode card/dock artwork differs')
  }
}
