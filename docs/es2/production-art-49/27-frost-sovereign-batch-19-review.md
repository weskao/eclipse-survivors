# Batch 19 Frost idle review

Source: 7114396f017478378173daa941dd4d7a4af74d95. Committed 1312×1199 idle candidate, manifest alpha128 margins [29,4,15,5] fail the 16px gate; faint alpha touches three edges. The manifest explicitly forbids runtime wiring until review. Preserve canonical idle art and leave QA flags unchanged. Extend production asset filename exclusion to hover-key-a. Isolated regex regression: one expected RED failure; GREEN three cases passed. Full release CI remains unverified.

Batch 20 generated studies remain external reference-only because character identity did not match canonical art. No new runtime assets, gameplay or hero changes.
