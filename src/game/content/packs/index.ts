import type { ContentPack } from '../contracts'
import { WEAPONS_PACK } from './weapons'

/** Integration owner is the only branch that edits this index. Feature packs live beside it. */
export const CONTENT_PACKS: readonly ContentPack[] = Object.freeze([WEAPONS_PACK])
