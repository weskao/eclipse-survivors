import { BALANCE } from '../../config'
import { hallTalent } from './hall-talents'

type Unit = 'percent' | 'points' | 'reduction' | 'hp' | 'count'
export type RankValue = { value: number; unit: Unit }
type Field = readonly [keyof typeof BALANCE.hall | null, Unit]
/** Individual talent contributions before combined run caps, in description order. */
const effects: Record<string, readonly Field[]> = {
  "offense-edge": [
    [
      "edge",
      "percent"
    ]
  ],
  "offense-precision": [
    [
      "precision",
      "points"
    ]
  ],
  "offense-momentum": [
    [
      "momentum",
      "percent"
    ]
  ],
  "offense-execution": [
    [
      "execution",
      "percent"
    ]
  ],
  "offense-fervor": [
    [
      "fervor",
      "reduction"
    ]
  ],
  "defense-constitution": [
    [
      "constitution",
      "hp"
    ]
  ],
  "defense-armor": [
    [
      "armor",
      "reduction"
    ]
  ],
  "defense-recovery": [
    [
      "recovery",
      "percent"
    ]
  ],
  "defense-resolve": [
    [
      "resolve",
      "reduction"
    ]
  ],
  "defense-ward": [
    [
      "ward",
      "percent"
    ]
  ],
  "arcana-focus": [
    [
      "focus",
      "percent"
    ]
  ],
  "arcana-celerity": [
    [
      "celerity",
      "reduction"
    ]
  ],
  "arcana-reach": [
    [
      "reach",
      "percent"
    ]
  ],
  "arcana-frostbind": [
    [
      "frostbind",
      "percent"
    ]
  ],
  "arcana-resonance": [
    [
      "resonance",
      "percent"
    ]
  ],
  "mobility-stride": [
    [
      "stride",
      "percent"
    ]
  ],
  "mobility-dash": [
    [
      "dash",
      "reduction"
    ]
  ],
  "mobility-evasion": [
    [
      "evasion",
      "reduction"
    ]
  ],
  "mobility-afterwind": [
    [
      "afterwind",
      "percent"
    ]
  ],
  "mobility-hunter": [
    [
      "hunter",
      "percent"
    ]
  ],
  "hunt-magnet": [
    [
      "magnet",
      "percent"
    ]
  ],
  "hunt-learning": [
    [
      "learning",
      "percent"
    ]
  ],
  "hunt-salvage": [
    [
      null,
      "count"
    ]
  ],
  "hunt-sustain": [
    [
      "sustain",
      "percent"
    ]
  ],
  "hunt-fortune": [
    [
      "fortune",
      "percent"
    ]
  ],
  "summons-bond": [
    [
      "bond",
      "percent"
    ]
  ],
  "summons-tenacity": [
    [
      "tenacityDuration",
      "percent"
    ]
  ],
  "summons-duration": [
    [
      "summonDuration",
      "percent"
    ]
  ],
  "summons-command": [
    [
      "summonCommand",
      "reduction"
    ],
    [
      "command",
      "percent"
    ]
  ],
  "summons-soulward": [
    [
      "soulwardReduction",
      "reduction"
    ]
  ],
  "knight-discipline": [
    [
      "knightDiscipline",
      "percent"
    ]
  ],
  "knight-guard": [
    [
      "knightGuard",
      "reduction"
    ]
  ],
  "knight-riposte": [
    [
      "knightRiposte",
      "percent"
    ]
  ],
  "ranger-aim": [
    [
      "rangerAim",
      "percent"
    ]
  ],
  "ranger-mark": [
    [
      "rangerMark",
      "percent"
    ]
  ],
  "ranger-skirmish": [
    [
      "rangerSkirmish",
      "reduction"
    ]
  ],
  "wizard-study": [
    [
      "wizardStudy",
      "percent"
    ]
  ],
  "wizard-circle": [
    [
      "wizardCircle",
      "percent"
    ]
  ],
  "wizard-channel": [
    [
      "wizardChannel",
      "reduction"
    ]
  ],
  "shadowblade-blade": [
    [
      "shadowbladeBlade",
      "points"
    ]
  ],
  "shadowblade-vanish": [
    [
      "shadowVanish",
      "percent"
    ]
  ],
  "shadowblade-ambush": [
    [
      "shadowAmbush",
      "percent"
    ]
  ],
  "spirit-summoner-pact": [
    [
      "spiritPact",
      "percent"
    ]
  ],
  "spirit-summoner-pack": [
    [
      "spiritPack",
      "reduction"
    ]
  ],
  "spirit-summoner-mend": [
    [
      "spiritMend",
      "percent"
    ]
  ],
  "crimson-paladin-oath": [
    [
      "paladinOath",
      "percent"
    ]
  ],
  "crimson-paladin-sacrifice": [
    [
      "paladinSacrifice",
      "reduction"
    ]
  ],
  "crimson-paladin-vengeance": [
    [
      "paladinVengeance",
      "percent"
    ]
  ]
}

export function hallRankValues(id: string, rank: number): { current: RankValue[]; next: RankValue[] | null } | null {
  const node = hallTalent(id)
  const fields = effects[id]
  if (!node || !fields || !Number.isSafeInteger(rank) || rank < 0 || rank > node.maxRank) return null
  const values = (level: number): RankValue[] => fields.map(([key, unit]) => {
    const base = key === null ? Math.min(level, BALANCE.hall.salvageCap) : BALANCE.hall[key] * level
    const percent = unit === 'percent' || unit === 'points' || unit === 'reduction'
    const value = Number((base * (percent ? 100 : 1) * (unit === 'reduction' ? -1 : 1)).toFixed(4))
    return { value, unit }
  })
  return { current: values(rank), next: rank === node.maxRank ? null : values(rank + 1) }
}
