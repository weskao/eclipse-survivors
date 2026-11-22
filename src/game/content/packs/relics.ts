import type { ContentPack } from '../contracts'
import { onRelicEvent } from '../relics/runtime'

/** No unsupported relics field: inventory and rewards live in independent runtime. */
export const RELICS_PACK: ContentPack = {
  id: 'relics',
  onEvent({ state }, event) { onRelicEvent(state, event) },
}
