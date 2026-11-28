import type { Directive } from 'vue'
import './image-shimmer.css'

type State = 'loading' | 'loaded' | 'error'
type Entry = { source: string; dispose: () => void }
const entries = new WeakMap<HTMLElement, Entry>()

function bindImage(el: HTMLElement, source: string | undefined): void {
  const url = source ?? ''
  const previous = entries.get(el)
  if (previous?.source === url) return
  previous?.dispose()
  const state = (value: State) => { el.dataset.es2ImageState = value }
  if (!url) {
    state('error')
    entries.set(el, { source: url, dispose: () => {} })
    return
  }
  state('loading')
  const native = el instanceof HTMLImageElement
  const image = native ? el : new Image()
  const loaded = () => state('loaded')
  const failed = () => state('error')
  image.addEventListener('load', loaded)
  image.addEventListener('error', failed)
  entries.set(el, { source: url, dispose: () => {
    image.removeEventListener('load', loaded)
    image.removeEventListener('error', failed)
  } })
  if (!native) image.src = url
  // Cached images can complete before the directive's mounted hook.
  if (image.complete) state(image.naturalWidth > 0 ? 'loaded' : 'error')
}

/** Same loading treatment for actual img elements and authored CSS image atlases. */
export const vImageShimmer: Directive<HTMLElement, string | undefined> = {
  mounted: (el, binding) => bindImage(el, binding.value),
  updated: (el, binding) => bindImage(el, binding.value),
  unmounted: el => {
    entries.get(el)?.dispose()
    entries.delete(el)
  },
}
