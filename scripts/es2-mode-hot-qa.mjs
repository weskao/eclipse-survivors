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
      const board = card.closest('[data-es2-expedition-board]')
      const peers = [...board.querySelectorAll('[role="radio"]')].filter(node=>node!==card)
      const geometry = () => [card, title, image, duration, info, ...peers].map(node => {
        const b = node.getBoundingClientRect()
        const s = getComputedStyle(node)
        return [b.x,b.y,b.width,b.height,s.paddingBlockStart,s.minHeight]
      })
      const before = geometry()
      const previousDisplay = el.style.display
      const wasHot = card.classList.contains('es2-mode-has-hot')
      let unchanged
      try {
        el.style.display = 'none'
        card.classList.remove('es2-mode-has-hot')
        const after = geometry()
        unchanged = before.every((row,i)=>row.every((v,j)=>typeof v==='number'?Math.abs(v-after[i][j])<=.5:v===after[i][j]))
      } finally {
        el.style.display = previousDisplay
        card.classList.toggle('es2-mode-has-hot', wasHot)
      }
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
      const grid = card.closest('.es2-mode-grid')
      const headingRow = grid.previousElementSibling
      const infoIcon = info.querySelector('span')
      const borderCenter = c.top + parseFloat(getComputedStyle(card).borderTopWidth)/2
      const centeredOnBorder = Math.abs((r.top+r.bottom)/2-borderCenter)<=1.5
      return { contained:r.width>0 && r.height>0 && r.left>=c.left-1 && r.right<=c.right+1 && r.top<c.top && r.bottom>c.top,
        right: c.right-r.right, top:r.top-c.top, centeredOnBorder, stable, unchanged,
        // HOT is decorative and pointer-transparent; the invisible part of
        // the Info hit target may extend behind it, but its visible icon may not.
        overlap:[title,image,duration,infoIcon,headingRow,...peers].filter(Boolean).some(overlaps),
        infoGap:infoIcon.getBoundingClientRect().top-r.bottom,
        pointer:getComputedStyle(el).pointerEvents, animation:getComputedStyle(el,'::after').animationName,
        flame:[...el.querySelectorAll('.es2-mode-hot-flame')].map(node=>getComputedStyle(node).animationName),
        embers:[...el.querySelectorAll('.es2-mode-hot-ember')].map(node=>getComputedStyle(node).animationName), reduced }
    })
    assert.ok(layout.unchanged, label + ': HOT toggle changes card or peer geometry ' + JSON.stringify(layout))
    assert.ok(layout.contained && layout.stable && !layout.overlap && layout.pointer==='none' &&
      Math.abs(layout.right-9)<=1 && layout.centeredOnBorder && layout.infoGap>=3, label + ': HOT layout ' + JSON.stringify(layout))
    assert.equal(layout.flame.length, 3, label + ': layered flame')
    assert.equal(layout.embers.length, 3, label + ': ember particles')
    if (layout.reduced) assert.ok([layout.animation, ...layout.flame, ...layout.embers].every(name=>name==='none'), label + ': reduced motion HOT')
    else {
      assert.match(layout.animation, /^es2-mode-hot-sweep(?:-|$)/)
      assert.ok(layout.flame.every(name=>/^es2-mode-hot-flame(?:-|$)/.test(name)), label + ': animated flame layers')
      assert.ok(layout.embers.every(name=>/^es2-mode-hot-ember(?:-|$)/.test(name)), label + ': animated embers')
    }
  }
}
