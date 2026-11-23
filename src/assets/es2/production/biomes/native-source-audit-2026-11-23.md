# ES2 biomes — original source sheets / native-3× remediation (2026-11-23)

**Scope:** only `src/assets/es2/production/biomes/**`. All eight existing production WebPs remain in place and `needs-human-approval`; no source hash was modified by this audit.

## Original source retrieval

Downloaded the actual GitHub Actions `es2-world-art-source-review` artifact (run [45173141087](https://github.com/weskao/eclipse-survivors/actions/runs/45173141087), artifact ID `14818227501`), extracted source `assets/images/imgs1.png` and `imgs9.png` and inspected them, instead of relying only on WebP filename `@3x`.

- `imgs1.png` has **1672×941 px**, containing the Abyssal Necropolis and Celestial Rift world concepts and many smaller isolated symbols, props, architecture and tile previews.
- `imgs9.png` has **1672×941 px**, containing the Blood Moon Cathedral and Cursed Forest concepts and smaller component props.
- **The overall 1672 px sheet width is not the resolution of a single prop.** The right-side individual elements are much smaller than the full collage. No native **330×330 per isolated prop** source was established in either sheet, so cropping them to four 330 px cells without separately authored detail would not meet strict native-3× requirements.
- Existing `ground` rendered at 384px needs a genuine authored 1152px source; `decor` rendered at 110px needs four genuine 330px sources per atlas. The current 768px and four 96px images are **not** sufficient. The original ground/decor files and manifest hashes are deliberately unchanged.

## Separate local-only candidates produced, NOT in GitHub

Three independently generated high-resolution floor masters were inspected and cropped without enlarging the existing production 768 px art. A candidate archive exists in the conversation, **not on the repository branch**:

| Candidate (ground) | Source master | Candidate WebP | Bytes | Candidate SHA-256 | Decoded mean seam delta RGB (top/bottom, left/right) | Decision |
|---|---|---|---:|---|---|---|
| blood-moon-cathedral | original illustration 1254×1254 | 1152×1152 | 467142 | `7863a3111779dff6eacd6bb8ccf7e8da2da0615081c7255190fa977aa06a370e` | 2.94 / 3.05 | QA_PENDING; not in GitHub |
| cursed-forest | original illustration 1254×1254 | 1152×1152 | 549912 | `ea4f17a975d589aba1d4ed28f11591deeed6f1f6017eaec49884a418268ce9e0` | 4.14 / 3.84 | QA_PENDING; not in GitHub |
| abyssal-necropolis | original illustration 1254×1254 | 1152×1152 | 509626 | `63c3a79aa355b24a7a90c015a82042937ba9e6f02d30bf5b0e6e39ddc1c55c52` | 3.00 / 3.23 | QA_PENDING; not in GitHub |

The values are from locally decoded candidate WebPs, **not** a Chromium real-gameplay proof. The separately attempted procedural Celestial Rift ground was **rejected** for aesthetic mismatch and not included as a releasable candidate. Four separate decor atlases remain unproduced at genuine native 3× quality.

## Verified CI / real-browser baseline

- [Run 45175132980](https://github.com/weskao/eclipse-survivors/actions/runs/45175132980): the eight original biome dimensions correctly fail native 3×; existing world-art integrity tests pass; TypeScript, build and check-release pass; full suite remains red (8 biome-native-source blockers plus 2 other art/hero gate blockers).
- [Run 45173141087](https://github.com/weskao/eclipse-survivors/actions/runs/45173141087): integration branch recorded authentic Chromium screenshots for four current biome scenes at desktop 1440×900 and mobile 375×812. These are **baseline old asset** captures, not the newly generated candidates.
- The locally extracted production build is inspectable, but Chromium navigation in the current container returned `ERR_BLOCKED_BY_ADMINISTRATOR`; no new live gameplay QA capture is claimed here.

## Admission

Candidate package is **not** applied to this GitHub branch: the available GitHub connector accepts text writes and explicit base64 Git blobs, but has no direct method to transfer binary files from the current local artifact workspace. Do not pretend this note or a 2×2 mock-up proves a binary commit.

Next safe transaction after the actual 8 authoritative images are available through a binary-capable GitHub upload: commit each new 1152×1152 ground and 1320×330 decor WebP **into this owned project path first**, regenerate manifest SHA-256 and provenance, maintain source crop 330×330, run original integrity/native-3× TDD, then live Canvas screenshots at desktop/mobile, and manual approval. Keep all original art as fallback until those checks genuinely pass. No PR, no develop/main changes, no force push, and no relaxation of approval gates.

Audited branch head before writing: `7fda5228b316555a23e5904b9dfab80275bb8d86`.
