# Shadowblade animation integration

Scope: Shadowblade only; other heroes, hitboxes, gameplay damage, attack timing and skill rules unchanged.

## Runtime coverage

| State | Existing real source | Status |
|---|---|---|
| Run / dash | E, SE, S, SW, NW, N, NE four authored frames; W reflects E | Opt-in DEV Canvas QA; four distinct poses per direction, not ten |
| Idle / guard | 8 direction-specific ready/guard cells | Existing production fallback; native detail insufficient |
| Basic attack / cast | East four-frame QA clip; legacy East/West action strip | Other headings retain same-character guard; missing independent directional motion |
| Q special | East four-frame QA clip; legacy East/West special strip | Other headings remain incomplete |
| Hurt / death / victory | Existing same-character static directional fallback | Independent action sequences missing |

Existing real gameplay evidence: https://github.com/weskao/eclipse-survivors/actions/runs/45360755492 (batch 5), all eight run facings and East attack/special source cells drawn. This evidence predates the present change.

## Integration fixes

Shadowblade dash facing follows actual velocity when moving and retains the last heading when stationary. Direction and action transitions do not crossfade opposite silhouettes or distinct baked blade attacks; adjacent-frame smoothing and same-character decode fallback remain. Regression covers all eight actual state-to-Canvas dash headings, exact source selection, the one allowed West mirror, shared atlas reuse and direction/action changes.

Keep the existing seven independent run sources. No new directional art or extra mirrored exports were generated. Existing source-edge risks in East run/attack/special remain unverified; no release promotion. Four-frame candidates are not equivalent to full native 3× action sequences. Five-source-first inventory is complete for locomotion, but diagonal mirror substitution requires visual proof before retiring existing unique SW/NW art. No approval gate changes.

Run the affected renderer tests, full CI and real gameplay capture at this revision. Manual art and physical mobile QA remain necessary.
