# Batch 26 — Titan alternate pose review

Source 7dbe9753edf989860f560ae084d286ab02fabf80 contains both WebPs and manifest; all three Git blob SHA-1 values match the delivered archive. Both are independent alternate studies, with phase/direction and identity unapproved; horns, armor, waist silhouette differ from canonical. Keep existing move and recover mappings unchanged rather than replacing them or alternating inconsistent art. Both names added to release exclusion, flags stay QA_PENDING/runtimeReady false/native3xApproved false. No new runtime mapping or gameplay changes.

Isolated execution: RED two missing release exclusions; GREEN four regex checks and six selector checks. Correct stale cross-boss phase-2 assertion from Batch 25: Abyss now has its own phase-2 awakening; Frost remains a negative case. Full Vitest/build/browser QA unavailable locally (github.com DNS failure); CI still requires verification.
