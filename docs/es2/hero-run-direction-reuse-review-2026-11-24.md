# Hero direction reuse review — batch 6

Owner upload: 66eb2defc8a1a652d96adc3d6ff320b37b0f15a1. The upload contains the Spirit Summoner NW WebP and manifest; its declared original source.png is not present. Preserve the committed WebP byte-for-byte and retain the manifest's QA_PENDING / eligibleForDevWiring=false / qaGameplayApplied=false. Restore the original PNG from the supplied batch-6 ZIP before final native detail review.

## Run/dash reuse decision (candidate QA)

| Hero | E→W | SE→SW | NE→NW | Remaining |
|---|---|---|---|---|
| Shadowblade | Existing approved-for-candidate-QA mirror | Keep existing independent SW | Keep existing independent NW | No missing four-frame candidate directions |
| Spirit Summoner | Not approved: staff handedness | Keep independent SW | Compare authored NW batch 6 with reflected NE batch 5; neither NW option admitted yet | W and NW review |
| Crimson Paladin | Not approved: sword/shield handedness | Keep independent SW | NE batch-4 rejected; no approved NW reflection | NE, NW and W |

The five-source strategy (E, SE, S, N, NE) is sufficient only if all three left-facing reflections are visually equivalent, including handedness and effect trajectory. Character art rule section 3 requires independent asymmetric art unless equivalence is demonstrated. Never reuse a reflection as independently authored frames. No change to attack, cast, special, hurt, death, victory, gameplay geometry or production acceptance.

The actual committed NW image and reflected NE share the existing candidate review page, synchronized frame stepping and 1×/detail scaling. The reflection reuses the decoded NE source and exact 768px crop through Canvas save/translate/scale/restore. This is a comparison, not gameplay or visual approval. The current gameplay inventory remains 24 clips; 19/24 run facings including one existing Shadowblade West mirror. Conditional five-source gap: Crimson Paladin NE only. If asymmetric mirrors fail review, independent left-facing assets remain necessary.
