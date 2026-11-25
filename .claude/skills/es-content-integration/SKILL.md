---
name: es-content-integration
description: Integrate Eclipse Survivors content packs or shared gameplay adapters when a feature must reach the real engine, player UI and release checks.
---

# Integrate gameplay content

1. Read the [Content Pack contract](../../../docs/content-pack-contract.md) and the changed subsystem's current handoff. For parallel branch integration, record the target base, source HEAD and owned paths. Inspect the source diff and checks at that SHA. Record missing, queued, cancelled or failed evidence explicitly. Keep production pack registration and shared host edits with the integration owner.
2. Test pack logic in isolation with a seeded RNG and per-run state. Add a deterministic RED test that starts from the real player or engine entry point, such as hero selection, a simulation step, chest pickup or event choice. The assertion should observe the promised outcome and fail before the host wiring lands.
3. Wire the smallest hook through the existing [engine](../../../src/game/engine.ts), [fixed step](../../../src/game/step.ts) or [production pack manifest](../../../src/game/content/packs/index.ts) as appropriate. Use authoritative transitions for hit, kill, reward, HUD and audiovisual feedback. Cover the applicable pause, reset, scene-change, shared actor/effect budget and legacy fallback cases.
4. For changes to save ownership or profile migration, identify the authoritative writer for settlement, spending and selections. Test migration and failed writes, reload, duplicate or stale receipts, and exactly-once settlement through the engine. Verify a failed migration preserves recoverable legacy data.
5. Run the [repository verification commands](../../../CLAUDE.md#mandatory-tdd-and-measurable-verification). For branch integration, check the final integration SHA's CI. Report pack registration, live runtime wiring, and verification results separately, including any uncovered player path.
