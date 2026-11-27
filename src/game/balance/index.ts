import world from './world.json'
import heroes from './heroes.json'
import progression from './progression.json'
import skills from './skills.json'
import weapons from './weapons.json'
import events from './events.json'
import enemies from './enemies.json'
import combat from './combat.json'
import evolutions from './evolutions.json'
import modes from './modes.json'
import bosses from './bosses.json'
import relics from './relics.json'
import meta from './meta.json'
import hall from './hall-effect-tuning.json'

/** Compose domain-owned balance data without changing any gameplay values or BALANCE keys. */
export const tuning = {
  world,
  heroes,
  progression,
  skills,
  weapons,
  events,
  enemies,
  combat,
  evolutions,
  modes,
  bosses,
  relics,
  meta,
  hall,
} as const
