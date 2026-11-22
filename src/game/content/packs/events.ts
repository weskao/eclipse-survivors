import type { ContentPack } from '../contracts'
import { WORLD_EVENT_DEFINITIONS } from '../world-events/definitions'

/**
 * Metadata-only registration. The integration branch must install the standalone
 * event director into the simulation and wire UI/mobile interaction separately.
 */
export const WORLD_EVENTS_PACK: ContentPack = {
  id: 'events',
  worldEvents: WORLD_EVENT_DEFINITIONS.map(({ id, title }) => ({ id, title })),
}
