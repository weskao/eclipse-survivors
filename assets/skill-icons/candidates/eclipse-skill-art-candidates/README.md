# Eclipse Survivors — candidate skill art (not production-ready)

Target: `weskao/eclipse-survivors`, `feature/es2-release-readiness-integration`.

Five native-resolution candidates in `assets/skill-icons/` were cropped from 512×512 transparent source cells and downsampled to 384×384. Five evolution drafts in `drafts/skill-icons/` were cropped from a smaller source and centered on a transparent 384×384 canvas without enlarging; their edges were feathered. These drafts DO NOT satisfy native 3× detail and must not be committed as production art. All ten files are genuine, individually decoded static RGBA WebP files; no animated files were authored.

The mandatory Polytool `towebp` and `cwebp` tools were unavailable. Pillow WebP quality 100 was used for this candidate package only. The source rectangles, provenance and encoded hashes are recorded in `manifest.json`. No project file or GitHub branch was modified. No tests, browser QA or CI were run.

Before integration: regenerate the five evolution drafts at adequate source resolution, inspect all images against approved legacy artwork and the actual game card at 1×, export via Polytool in an isolated staging directory, and verify alpha and dimensions. Commit real assets before updating the shared resolver. Do not mark static-only images as generated atlas/animation entries. Preserve the existing 10 animated icons, reduced-motion stills, ES2 art, hero art and HUD atlas behavior. Update SVG expectations in `src/game/skill-art-choice.test.ts` and `src/components/ai-art-integration.test.ts`, verify both live and legacy card paths, and run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release` and real browser QA. Keep TODO items unchecked until accepted.
