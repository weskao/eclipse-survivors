# ES2 four HUD icons — native 3× remediation, QA pending

- Integration branch: `feature/es2-release-readiness-integration`
- Existing canonical IDs and live mapping unchanged: `WORLD_ART.ui['hud-health']`, `['hud-xp']`, `['hud-cooldown']`, `['hud-quest']`
- Existing consumers: `CombatHud.vue` live health, XP, objective and cooldown icon; `Es2Archive.vue` UI gallery.
- Origin: freshly generated 1254×1254 image with four unique 627×627 drawn images in a 2×2 sheet; **not an enlarged version of existing 192px icons**. Each 627×627 source was separately cropped and cleaned of source checkerboard into alpha, verified as individual RGBA images, then downsampled to 240×240 native source-derived runtime WebPs.
- Runtime WebP display: max known gallery 64px and live HUD 15px. QA allowance conservative 72px, 240/72 = 3.33× nominal source resolution.
- QA inspection: each cell alpha bbox below stays away from all edges, RGBA corners are transparent; source frames are disjoint without neighbor-region bleed. Each has WebP VP8X alpha flag, hash and byte-budget assertions in `hud-native3x.test.ts`; RED observed in [CI #45190532411](https://github.com/weskao/eclipse-survivors/actions/runs/45190532411) at legacy 192px sizes.
- **Not approved:** Visual style/contrast in actual combat, mobile/desktop Chromium screenshots, independent source-art originality verification and manual art acceptance remain pending. All four asset status values remain `needs-human-approval`. The project-wide blocking gate remains unchanged.

| Asset | 627px master bbox (x1,y1,x2,y2) | Master bytes | Master SHA-256 | 240px WebP bytes | Runtime SHA-256 |
|---|---|---:|---|---:|---|
| `hud-health` | `27,12,602,601` | 82594 | `4d9272cafee30ac4d1a7128d162ac03bb20d24bdc85e629461f88bf488a6cf99` | 19512 | `888950a8357e67c635a74f7aee4234d29bee4d162b7b78488cda5a7f3a98708d` |
| `hud-xp` | `17,9,603,601` | 86378 | `3a2cf8a017c72ba8a26f00a29cb748fac0e6adb70a020dd0741fa8896fb0f845` | 20220 | `8dff5f6070a3de656a928a975426a5a3234cb9479f4755064a69004033797679` |
| `hud-cooldown` | `61,9,566,601` | 83866 | `9ffd67332354093d8b64335849d1048a92353445a95d1a72decc9fb3add4e147` | 18398 | `7dd68ff7d0c24e63ee9e6a1295b9f536223e89685f121628ccbd54547017db67` |
| `hud-quest` | `50,19,580,577` | 92166 | `950ab208d9b7f276f88503dc55eb7a790084e389a6157f8c3fa11f500b22dc16` | 19870 | `00aea59ef50aa49826279e62b2a4bd9cf4fdeced7642dfefaf500dfc3111c9cc` |
