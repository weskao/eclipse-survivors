import assert from 'node:assert/strict'

export async function assertModeHotLayout(page, label) {
  const board = page.locator('[data-es2-expedition-board]')
  assert.equal(await board.locator('.es2-mode-radio').count(), 0, label + ': obsolete radio circles')
  assert.equal(await board.locator('[role="radio"][aria-checked="true"]').count(), 1)
  const badges = board.locator('[data-es2-mode-hot]')
  assert.ok(await badges.count() >= 1, label + ': no featured mode')
  for (const badge of await badges.all()) {
    const layout = await badge.evaluate(el => {
      const card = el.closest('[role="radio"]')
      const title = card.querySelector('.es2-mode-copy')
      const image = card.querySelector('.es2-mode-sigil')
      const duration = card.querySelector('.es2-mode-time')
      const info = card.parentElement.querySelector('.es2-mode-detail-trigger')
      const r = el.getBoundingClientRect(), c = card.getBoundingClientRect()
      const overlaps = node => {
        const b = node.getBoundingClientRect()
        return Math.min(r.right,b.right)-Math.max(r.left,b.left) > 1 && Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top) > 1
      }
      // A localized long title must not move the badge away from the card corner.
      const heading = title.querySelector('strong')
      const original = heading.textContent
      let stable
      try {
        heading.textContent = original + ' — An exceptionally long expedition name'
        const moved = el.getBoundingClientRect(), resized = card.getBoundingClientRect()
        stable = Math.abs((resized.right-moved.right)-(c.right-r.right))<=1 && Math.abs((moved.top-resized.top)-(r.top-c.top))<=1
      } finally { heading.textContent = original }
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(forced-colors: active)').matches ||
        !!el.closest('[data-es2-reduce-motion="true"],[data-es2-reduce-flashing="true"]')
      return { contained:r.width>0 && r.height>0 && r.left>=c.left-1 && r.right<=c.right+1 && r.top>=c.top-1 && r.bottom<=c.bottom+1,
        right: c.right-r.right, top:r.top-c.top, stable, overlap:[title,image,duration,info].filter(Boolean).some(overlaps),
        pointer:getComputedStyle(el).pointerEvents, animation:getComputedStyle(el,'::after').animationName,
        flame:getComputedStyle(el,'::before').animationName, reduced }
    })
    assert.ok(layout.contained && layout.stable && !layout.overlap && layout.pointer==='none' &&
      Math.abs(layout.right-9)<=1 && Math.abs(layout.top-6)<=1, label + ': HOT layout ' + JSON.stringify(layout))
    if (layout.reduced) assert.equal(layout.animation + '/' + layout.flame, 'none/none', label + ': reduced motion HOT')
    else {
      assert.match(layout.animation, /^es2-mode-hot-sweep(?:-|$)/)
      assert.match(layout.flame, /^es2-mode-hot-flame(?:-|$)/)
    }
  }
}
