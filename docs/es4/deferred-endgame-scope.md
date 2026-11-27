# ES4 scope boundary — skill trees first

Implement only the Adventurer Hall talent ecosystem in this workstream. Existing chapter, monster, enemy wave director, boss, mode and difficulty behavior must remain unchanged. Any future changes to those areas are separate design tasks, not accepted implementation in this branch.

## Deferred endgame design
- New chapters: distinct environmental mechanics, telegraphed hazards, elites and boss phase objectives; avoid pure HP inflation.
- Monster ecology: complementary frontline, flank, control, ranged and support roles with readable counters; never demand one particular hero build.
- Mode selection: unlockable late-game expedition tiers, modifiers, boss trials, build challenges and endless objectives; preserve early accessible modes.
- Difficulty: deterministic challenge tiers and mixed enemy compositions, benchmark fresh/legacy/ES4 builds; optional higher difficulty, no invisible scaling that invalidates permanent growth.
- Rewards: time/skill/risk proportional, no mandatory grind, no new currency without design approval; audit existing wallet and receipt guarantees.
- UX and assets: mode choice briefing, difficulty indicators, recommended—not mandatory—builds, enemy telegraphs, bilingual mobile-friendly design and per-asset manifest.
- Separate future design/review, branches, tests, asset production, gameplay balance and actual QA. Do not change these systems during skill-tree implementation.
