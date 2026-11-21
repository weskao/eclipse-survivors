import type { ArtKey } from './types'
import knight from '../assets/knight.webp'
import ranger from '../assets/ranger.webp'
import wizard from '../assets/wizard.webp'
import slime from '../assets/slime.webp'
import bat from '../assets/bat.webp'
import goblin from '../assets/goblin.webp'
import golem from '../assets/golem.webp'
import boss from '../assets/boss.webp'
import ground from '../assets/ground.webp'
import courtyard from '../assets/courtyard.webp'
import bgm from '../assets/bgm.mp3'

export const ART_URLS: Record<ArtKey, string> = { knight, ranger, wizard, slime, bat, goblin, golem, boss, ground, courtyard }
export const BGM_URL: string = bgm

export type Artwork = Record<ArtKey, HTMLImageElement>

/** Original `artwork` map: one decoded Image per art key, started eagerly. */
export function loadArtwork(): Artwork {
  const out = {} as Artwork
  for (const k of Object.keys(ART_URLS) as ArtKey[]) {
    const image = new Image()
    image.src = ART_URLS[k]
    out[k] = image
  }
  return out
}
