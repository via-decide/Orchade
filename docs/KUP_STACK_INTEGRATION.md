# KUP Stack Integration

This is Orchade's side of KUP-STACK-001 (cross-system interoperability
coordinating LogicHub, Orchade, and ViaDecide through versioned contracts).
Full architecture and the frozen ownership matrix: `via-decide/kup-program`,
`docs/stack/`.

## What this system owns

Real-system / property state: `Property`, `PropertyRevision`,
`PropertyEntity`, `PropertyRealityMode`, `PropertyEquipmentInstance`,
`ResourceGraph`, operating policy, simulation scenario, simulation run,
observations, experiments, plan-vs-actual, operational history, property
bottlenecks.

## What it does not own

Canonical engineering design definition, a global engineering knowledge
repository, or public decision-page state. A property bottleneck can
*generate* an engineering requirement (KUP-STACK-001E, not yet built), but
Orchade never writes LogicHub's engineering revision directly.

## What it exports

Not yet built. Planned: `SimulationRunReceiptV1` (KUP-STACK-001F, → ViaDecide)
and `PropertyEngineeringRequirement` (KUP-STACK-001E, → LogicHub).

## What it imports

Not yet built. Planned: `EngineeringArtifactExport` from LogicHub
(KUP-STACK-001D) — imported by fetch → schema validate → hash verify →
snapshot/pin → map into Orchade's own `EquipmentTwin`/`PropertyEquipmentInstance`
contract → user accepts import → candidate `PropertyRevision` created.
Orchade never trusts a remote system's *mutable* state; every import is
pinned to an exact revision + contentHash at import time.

## Supported contract version

`KUP_INTEROP_V1` (`contractVersion: "1"`). Schema hashes pinned in
`interop/contract-lock.json`, sourced from `via-decide/kup-program` commit
`5f77a5c0eb65aa476a3a28e8e16dcd4324426def` (KUP-STACK-001A/B, PR #63 branch
tip, pending merge — update `sourceCommit` once merged; a single-field
change, no code depends on the exact value).

## Source-of-truth rules

Orchade is the sole source of truth for its own `Property`/`PropertyRevision`
graph. No other system may write to it directly — LogicHub raises an
`ENGINEERING_REVISION_RELEASED` event, ViaDecide proposes a
`CANDIDATE_SYSTEM_PROPOSED` intent; Orchade validates and creates its own
revision in response. See `SYSTEM_OWNERSHIP.md` in kup-program for the full
cross-system rule ("no system may modify another system's canonical object
directly").

## Failure behavior

Not yet wired to real adapters (see `_status` in
`public/.well-known/kup-stack.json`). Once KUP-STACK-001D/E/F land, a
LogicHub outage must not break replay of Orchade's already-pinned historical
runs (spec Part 24) — a pinned `KupCanonicalRef` (revisionId + contentHash)
remains valid without its producer being reachable. Failure codes follow
`kup-program`'s `docs/stack/FAILURE_AND_UNKNOWN_POLICY.md`
(`UNKNOWN_ARTIFACT`, `INTEGRITY_FAILURE`, `SOURCE_UNAVAILABLE`, etc.).
