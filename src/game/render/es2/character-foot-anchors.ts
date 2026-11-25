/**
 * Measured from the nine committed transparent WebP sheets: lowest alpha > 80
 * in each isolated 448px cell. Immutable pixel offsets keep the visible feet
 * on the same game-world ground point across run/attack/guard frame changes.
 * Recalculate and review these when replacing any source image.
 */
export const CHARACTER_FOOT_BOTTOMS = {
  shadowblade: {
    direction: [434,434,433,433,433,436,434,433,426,430,429,418,406,406,414,421],
    action: [421,419,407,418,421,416,420,418,411,410,409,410,420,421,420,422],
    special: [415,408,402,399,395,388,392,419],
  },
  'spirit-summoner': {
    direction: [421,430,431,426,418,418,422,440,412,424,426,420,422,421,422,421],
    action: [393,392,391,365,391,394,398,386,407,408,408,400,406,410,407,410],
    special: [424,421,421,421,421,421,421,421],
  },
  'crimson-paladin': {
    direction: [424,424,424,424,424,424,424,424,418,419,413,407,406,406,413,407],
    action: [403,413,413,413,414,414,417,417,413,413,397,401,413,413,414,415],
    special: [411,406,405,404,405,405,404,405],
  },
} as const
