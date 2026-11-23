# ES2 character artwork — exact file-to-runtime application map

Branch: `feature/es2-release-readiness-integration`. Rules: [CLAUDE.md](../../CLAUDE.md), [character-art-3x.md](../../.claude/rules/character-art-3x.md).

**Canonical IDs:** `shadowblade`, `spirit-summoner`, `crimson-paladin`. The original `knight`, `ranger`, `wizard` remain unchanged. All 3× assets are local project files, drawn at 1× design size; no remote image URLs, chat-only PNG, run-time image-generation services, or placeholder emojis.

## 1. Canonical identity shared by selection / HUD / Canvas

| Hero ID | Approved identity baseline | Existing committed 900px portrait (single source of truth) |
| --- | --- | --- |
| `shadowblade` | hood, charcoal/purple plated leather, purple dual daggers | `src/assets/es2/production/heroes/shadowblade-portrait@3x.webp` |
| `spirit-summoner` | female silver/white hair, ornate blue-white gown, spirit-fox motif, blue staff | `src/assets/es2/production/heroes/spirit-summoner-portrait@3x.webp` |
| `crimson-paladin` | female copper/red hair, red-gold plate armor, crimson cape, luminous shield/sword | `src/assets/es2/production/heroes/crimson-paladin-portrait@3x.webp` |

- Homepage: `src/components/es2/hero-roster/HeroRoster.vue` → `HeroPortrait.vue` → `HERO_DEFINITIONS[id].portraitSrc`.
- HUD: `src/components/es2/hud/CombatHud.vue` → `HeroPortrait.vue` with actual `heroId` (never infer from legacy `choice`).
- World: `src/game/render/index.ts` → `src/game/render/characters.ts` → `src/game/render/es2/production-heroes.ts`; preserve same hero identity and 1× display bounds.

## 2. New image input → staged asset map

The following are original generated PNGs from this conversation. **All nine WebP candidates have been committed to this branch and the runtime maps them directly**; keep `QA_PENDING` until the actual binary files appear in the repository and pass visual/pixel checks. A manifest or a source name alone is not a committed image.

| Hero | Source PNG (generated in chat) | Source pixels / grid | Required project deliverable |
| --- | --- | --- | --- |
| `shadowblade` | `影刃行者_紫焰十六式_sprite_圖_sheet.png` | 1254×1254 / 4×4 | `src/assets/es2/production/heroes/shadowblade/idle-ready@3x.webp` |
| `shadowblade` | `影刃行者_奔跑與雙刃連擊精靈圖譜.png` | 1254×1254 / 4×4 | `src/assets/es2/production/heroes/shadowblade/run-attack@3x.webp` |
| `shadowblade` | `影刃行者_紫霧突襲連擊.png` | 1774×887 / 4×2 | `src/assets/es2/production/heroes/shadowblade/special@3x.webp` |
| `spirit-summoner` | `靈契召喚師_幽狐法術姿態圖譜.png` | 1254×1254 / 4×4 | `src/assets/es2/production/heroes/spirit-summoner/idle-ready@3x.webp` |
| `spirit-summoner` | `靈契召喚師_幻狐奔行與施法_sprites.png` | 1254×1254 / 4×4 | `src/assets/es2/production/heroes/spirit-summoner/run-attack@3x.webp` |
| `spirit-summoner` | `靈契召喚師_幻狐秘術八連式.png` | 1774×887 / 4×2 | `src/assets/es2/production/heroes/spirit-summoner/special@3x.webp` |
| `crimson-paladin` | `緋紅聖騎四向戰鬥精靈圖譜.png` | 1254×1254 / 4×4 | `src/assets/es2/production/heroes/crimson-paladin/idle-ready@3x.webp` |
| `crimson-paladin` | `緋紅聖騎_奔跑與聖光連擊_sprite_表.png` | 1254×1254 / 4×4 | `src/assets/es2/production/heroes/crimson-paladin/run-attack@3x.webp` |
| `crimson-paladin` | `緋紅聖騎_聖盾終結技序列.png` | 1774×887 / 4×2 | `src/assets/es2/production/heroes/crimson-paladin/special@3x.webp` |

**Quality warning:** a 1254×1254 source divided into 4×4 cells contains only about `313.5×313.5` source pixels per frame. The 1774×887 4×2 inputs contain about `443.5×443.5` per frame. Their non-integer grids require explicit verified integer crop boundaries; do not use `width / 4` as a floating Canvas source coordinate, assume gutters are perfectly isolated or interpolate them to a bigger number and claim true 3× detail. For world sprites drawn at 134–147px high, 4×4 sources remain below the strict 402–441px native height target. The paladin run sheet has a mostly opaque pale background that **must be accurately removed before acceptance**. These images are candidates, not artistically signed-off 3× masters.

## 3. Already committed atlas (current runtime fallback, not full native 3×)

| Asset name pattern | Actual pixels / frame geometry | Actual usage |
| --- | --- | --- |
| `<id>-portrait@3x.webp` | 900×900 | Character select, HUD, and world fallback |
| `<id>-8dir-motion@3x.webp` | 3072×1920, 8×5 × 384px | Eight direction idle / guard; **east-only** run, attack, special; west mirrored |
| `<id>-run-attack@3x.webp` | 3584×448, eight 448px cells | Archived right-facing animation source |
| `<id>-8dir@3x.webp` | 1024×512, 128px cells | Archived low-detail source, not normal world rendering |

Current `<id>-8dir-motion@3x.webp` was composed from 198px input frames, so it is **nominal 3× geometry only**. The nine new 448px/cell WebP candidate assets are now committed and rendered via the pose/source map. The old 384px-cell atlas is retained only for compatibility and historical comparison. Do **not** remove the current working fallback before that happens.

## 4. Motion mapping (current runtime and next full-art gate)

Engine directions `[E, SE, S, SW, W, NW, N, NE]` use 0–7. **New 4×4 split sources** use the same order across the first two rows: `sourceIndex = engineDirection`; guard uses `sourceIndex = engineDirection + 8`. The archived 384px-cell atlas uses a different old order and must not be used with the new index map.

- `idle`: directional idle frame; `ready`: directional combat guard; `run`/`dash`: authored sequential frames when that *direction* exists; `attack`/`cast`: attack/cast sequence selected by phase; `special`: unique skill frames only while `anim.special` is true; `hurt`, `death`, `victory`, reduced motion: consistent same-character still/animation, never another hero.
- The new split sheets contain 16 directional frames (eight idle + eight guard), 16 east run/attack frames (eight each) and eight east special frames; all are four columns wide. The archived old 40-frame sheet uses `0=idle8, 1=guard8, 2=east-run8, 3=east-attack8, 4=east-special8`. **There are no authored southeast/south/southwest/northwest/north/northeast eight-frame run or attack clips in this atlas**. Do not imply otherwise by repeating idle/guard.
- Where per-frame source detail is insufficient or a direction is missing, render the same-character high-resolution portrait/idle safe fallback, keep visual identity and gameplay geometry unchanged, and mark that exact `<hero, pose, facing>` `QA_PENDING`.
- In future pose-separated sheets, keep one typed source-of-truth map in `production-heroes.ts`, do not duplicate HTML/CSS/Canvas sprite-frame selection code, and do not add hot-loop allocations.

## 5. Validation / release checklist

- [x] Nine WebP **candidates** committed, with exact integer crop grid and candidate paladin matte cleanup; **native 3× detail, image identity and matte QA remain pending**
- [ ] Per-file/frame SHA-256, source pixels, authored pixels, layout, timing, anchor, alpha, budget, `native3x`, and `QA_PENDING|APPROVED` recorded
- [ ] All eight directions each have genuine idle, run, attack/cast, special poses and real ordered consecutive frames; no false eight-way claim
- [x] Canvas now selects the nine committed sheets per hero, pose and facing and caps actor size at 147px; actual-device visual alignment still needs review
- [ ] HUD/selection/scene identity matches exactly for all six heroes and reduced-motion / fallback
- [ ] No neighboring sprite bleed, background matte, frame jump, memory leak, unbounded decode or blurry upscaling at 320px/375px/mobile landscape/desktop
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release` and real browser screenshots independently verified

**Status:** Nine new split WebP assets are committed and selected by the current world renderer. The 198px legacy sheet remains archived; newly generated 313px and 443px sources remain **QA_PENDING**, and only E/W have full consecutive action strips. Do not claim fully authored 3× eight-direction motion or final artistic signoff.
