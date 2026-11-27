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

## Handoff after the skill-tree workstream

Start this work only after skill-tree implementation is accepted and the owner authorizes a separate branch. Use measured skill-tree results, not assumed maximum power, as inputs. First build representative fresh, legacy, early/mid-investment and mature builds for all six heroes, including defensive, precision, area, stealth, summon and blood-oath roles. Measure survivability, time-to-kill, reward rate, proc frequency and performance in existing modes.

Plan subsequent waves: (A) audit existing enemy roles and encounter pacing; (B) propose chapters with distinct mechanics and readable counters; (C) propose enemy and boss variants with fair tells and meaningful positioning choices; (D) design optional challenge tiers, mode-selector briefings, unlock conditions, recommended builds and risk/reward; (E) simulate balance and assess performance, assets, audiovisual quality and responsive UI. Preserve accessible early content, support all six hero playstyles, avoid universal enemy health inflation and hidden difficulty scaling that negates earned progression. Avoid requiring a single build; use optional difficulty and varied objectives to reward player choice. Treat all numerical tuning and new mode concepts as proposals until measured and approved. Track each later work item separately in TODO.md and use its own TDD and acceptance evidence.
