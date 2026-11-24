# Uploaded boss sheet QA (e35dcd4)

Four original PNGs remain unchanged at candidates/motion/spritesheets, with the existing SHA-256 manifest. Each is 948×1659, 4 columns × 7 rows, 237px per cell, 112 reference frames across four bosses. These are NOT native 3× and the source alpha/background and identity defects are still pending. No release or human approval is implied.

DEV only: use ?showcase=1&es2BossArtQa=infernal-titan&es2BossMotionQa=2 (substitute any of the four canonical boss IDs). Mode 1 remains the earlier attack-reference review. Mode 2 reads the actual encounter bodyMotion clock, maps windup to attack cells 1–2, attack to 3–4, and recover to its own row. Death is painted after the dead mob is removed only for the explicit sheet mode. Missing art and reduced motion keep static fallback for living bosses. Production does not load these PNGs. No collision, attacks, balance, or hero modifications.

This is a raw visual diagnostic, not a clean production atlas. Backgrounds and cell edges can visibly be wrong. Next gate: inspect each pose and remove background safely without damaging pale costume/effects, preserve source dimensions/provenance, author actual native-3× frames (at least 949 px at current maximum phase size), verify all device captures and obtain human approval. Do not set runtimeReady or native3x true on these sheets.
