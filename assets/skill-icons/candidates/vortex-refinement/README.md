# Eclipse Survivors — slow vortex alternatives

Target: `weskao/eclipse-survivors`, `feature/es2-release-readiness-integration`.

The latest two 16-frame generated GIFs have 313 × 313 native pixels, 90 ms per frame, and nonuniform / reversing angular motion. Their authored sequence is preserved in `review-only/` as animated WebP; do not install as native 3× runtime art. No upscaling.

`assets/skill-icons/` contains a separate candidate built from the earlier 1254 × 1254 original paintings, not the latest 313px artwork. Both use a fixed center, slow counterclockwise outer orbit (5s / 6s per revolution), twice-per-loop inner energy flow, localized periodic twist, subtle independent particles, and no repeated endpoint, zoom, or global flashing. 384 × 384, 24 FPS, 120 / 144 unique frames, infinite loop. The still corresponds to frame 0.

The manifest records real decoded dimensions, alpha, frame counts, frame durations, SHA-256, and mean consecutive-frame and seam pixel differences. Seam metric is not a substitute for visual QA. Encoded using Pillow/libwebp; Polytool and cwebp unavailable. The per-animation 1.2 MB reference budget is not necessarily satisfied (see manifest). Do not treat as approved or mark TODO complete before Polytool, performance, and actual browser validation.

The GitHub branch was read but not changed. Existing mappings already load the same filenames. If manually accepting the alternative, replace only the four files under assets/skill-icons/ and update the corresponding two records in the existing project manifest, preserving all other records. Do not use the review-only files as runtime assets.
