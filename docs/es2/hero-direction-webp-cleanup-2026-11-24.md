# Hero direction and WebP cleanup

Baseline: 8d6b9ded3e374792f5c17278f62bd04bf19fbca4. Five-source-first policy applies to every character/pose: E, SE, S, N, NE; W/SW/NW are reflection candidates only, subject to visual/mechanical equivalence. Existing independent asymmetric direction art is not removed until replacement passes review. No runtime or release approval changes.

Retired five rejected/duplicate PNG drafts (6750201 bytes in the checked-out tree). Each retained manifest includes original commit/path/blob/SHA-256 and reason; exact duplicate Shadowblade N points at the retained batch-5 source. No existing gameplay or preview image was removed.

| Removed file | Bytes | Reason |
|---|---:|---|
| `src/assets/es2/production/heroes/shadowblade/candidates/n-2026-11-24-batch-4/source.png` | 977458 | Identical Git blob to the retained batch-5 source; original margin fixed by batch 5. |
| `src/assets/es2/production/heroes/spirit-summoner/candidates/ne-2026-11-24-batch-4/source.png` | 1555277 | Rejected edge contact; superseded by batch-5 NE. |
| `src/assets/es2/production/heroes/spirit-summoner/candidates/nw-2026-11-24-batch-4/source.png` | 1436745 | Rejected handedness; independent batch-6 WebP remains comparison-only. |
| `src/assets/es2/production/heroes/crimson-paladin/candidates/ne-2026-11-24-batch-4/source.png` | 1363782 | Rejected identity mismatch; still requires a correct NE candidate. |
| `src/assets/es2/production/heroes/crimson-paladin/candidates/nw-2026-11-24-batch-4/source.png` | 1416939 | Rejected identity mismatch; independent NW or a verified NE reflection is still required. |

Active source PNGs remain until lossless master WebP migration with decoded RGBA proof and updated source-hash tests. Preserve all active WebP atlases, the independent NW comparison and existing SW/NW runtime sources. Current minimum canonical gap: Crimson Paladin NE; other left-facing gaps depend on staff/shield reflection review. This does not imply full ten-frame run or directional attack completion.
