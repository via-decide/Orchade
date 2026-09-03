# Property Model Migration Inventory (Wave 0)

Required before writing any new Property Model v1 code (ORCHADE P0,
section 1). Classifies every existing contract this codebase already has
against the new `src/property/` foundation, so nothing mature gets
duplicated "because it would be easier."

Classification vocabulary: **REUSE** (use verbatim, no change), **EXTEND**
(add fields/variants additively, same file), **WRAP** (a thin adapter
exists so Property-level code has an ergonomic entry point, but the
underlying contract and its validation stay canonical and singular),
**MIGRATE** (superseded by a new Property-level contract; the old shape is
kept only for backward compatibility with existing tests/fixtures),
**DEPRECATE** (should eventually be removed; not used by new code).

## Simulation core (`src/simulation/homestead/`)

| Contract | File | Classification | Notes |
|---|---|---|---|
| `HomesteadScenarioDefinition` | `scenario.ts` | **REUSE** | Stays the immutable simulation *input*. `Property`/`PropertyRevision` are the new persistent *world state*; they compile into this, they never replace it (section 0's explicit rule). |
| `LandPlacementType`, `FoodProducerType` | `scenario.ts` | **EXTEND** (already done, PR #56) | Additive-only literal members added for Site Planner; the new `scenarioCompiler.ts` reuses the same extended unions rather than adding a third set. |
| `validateHomesteadScenario` | `scenario.ts` | **REUSE** | The compiler's output must still pass this unchanged. |
| `ProjectHomesteadState` | `projectState.ts` | **REUSE** | Live/simulated day-by-day state. Property does not shadow this. |
| `runProject001Scenario`, `compareProject001Scenarios` | `projectRun.ts` | **REUSE** | The one deterministic simulation boundary. `equipmentCandidateTest.ts` already reuses `compareProject001Scenarios`; nothing new calls a day-transition function directly. |
| `ParameterOrigin`, `ParameterProvenanceRecord`, `ModelIdentity` | `provenance.ts` | **REUSE** | `EquipmentTwinDefinition.parameterOrigins` already reuses `ParameterOrigin` verbatim (PR #56). Property-level parameters will do the same. |
| `ModelCapabilityStatus` | `modelCapabilities.ts` | **REUSE** | Reused verbatim by `EquipmentTwinDefinition.modelCapabilityStatus`; the scenario compiler surfaces the same three values rather than inventing a fourth. |
| `DeviceSource`, `ObservationRecord`, `RawObservation`, `validateAndNormalizeObservation` | `observation.ts` | **REUSE** | Section 14 explicitly forbids a competing `PropertyObservation` type. Property-level observation ingestion (Wave 9, not in this PR) will call these functions directly, keyed by `propertyId`/`entityId` fields these contracts already carry. |
| `PredictionRecord`, `PredictionComparison`, `CalibrationCandidate`, `ModelParameterRevision` | `prediction.ts` | **REUSE** | Plan-vs-actual (Wave 12, deferred) will call these directly. |
| `ReconciliationDecision`, `evaluateObservationReconciliation` | `reconciliation.ts` | **REUSE** | Unchanged reconciliation boundary. |
| `ActuatorCommand`, `ControlDecision`, `evaluateControlDecision`, `PostActionVerification` | `control.ts` | **REUSE** | `EquipmentControlDefinition.actuatorCommandType` already reuses `ActuatorCommandType` verbatim (PR #56). |
| `ScenarioRevisionDefinition`, `createScenarioRevision` | `scenario.ts`, `revision.ts` | **WRAP** | This is a *scenario*-level revision (a handful of hardcoded change paths: tank capacity, placement removal). `PropertyRevision` (new, this PR) is a *property*-level revision one layer up, with its own hash and its own entity graph; it does not extend or reuse `createScenarioRevision`'s narrow switch. The scenario-level revision mechanism keeps working unchanged for direct scenario editing (e.g. `docs/HOMESTEAD_SCENARIOS.md` fixtures). |
| `PROJECT_001_BASELINE_SCENARIO`, `createBlankSlateScenario`, farm profiles | `project001Scenario.ts`, `blankSlateScenario.ts`, `farmProfiles.ts` | **REUSE** | Used as-is by tests and by the new compiler's assumption defaults where sensible (temperate climate, household baseline numbers). |
| `knowledge.ts` (`LearnedRule`, `ExperimentSummary`, `createWaterStorageExperimentSummary`) | `knowledge.ts` | **WRAP** (deferred) | Wave 10 (Experiment attachment, not in this PR) will wrap this against canonical `PropertyEntity` refs rather than inventing a second experiment shape. `LearnedRule`/`EvidenceRecord` stay canonical. |
| `HomesteadPlanningState`, `applyHomesteadPlanningIntent` | `planningTransition.ts` | **REUSE**, scoped to `gameplay/director/` | Not touched by Property Model v1; the new-game director's own planning flow is unrelated to Site Planner/Property. |

## Site Planner (`gameplay/site-planner/`, PR #56)

| Contract | Classification | Notes |
|---|---|---|
| `SiteGeometry`, `SiteModuleDefinition`, `SiteResourceConnection`, `SiteProject` | **MIGRATE (deferred, Wave 11)** | Section 38 mandates Site Planner become a `PROPERTY -> PLAN` *view*, not a parallel `SiteProject` world. This PR does **not** perform that migration -- it is explicitly Wave 11, after the Property foundation (Waves 2-3), reality fixtures (Wave 4), and equipment/expert-knowledge layers (Waves 5-8) land. Site Planner keeps compiling directly to `HomesteadScenarioDefinition` via its own `compileSiteProjectToHomesteadScenario()` for now. Migrating it prematurely, before `PropertyEntity`/`PropertyGraph` are proven, would be exactly the kind of "duplicate a mature concept to make the new architecture easier" this task explicitly forbids (section 1). |
| `SiteModuleType` (23 module classes), catalog defaults | **REUSE as a design reference, not imported** | The new `src/property/entity.ts` `PropertyEntityType` set intentionally reuses the *same names* (`VEGETABLE_BED`, `WATER_TANK`, ...) for continuity, but is defined fresh in `src/property/` rather than importing from `gameplay/site-planner/` -- `src/property/` is core substrate that `gameplay/site-planner/` should eventually depend on (Wave 11), never the reverse. This is a deliberate, temporary, documented duplication of a handful of type literals and small profile shapes (footprint/resource/labour/economic), not a duplicated *engine*. |

## Property Reality / EquipmentTwin (`src/property/`, PR #56 -- this PR's own prior work)

| Contract | Classification | Notes |
|---|---|---|
| `PropertyRealityMode`, `EntityRealityStatus`, `PropertyRealityDeclaration`, `validateEntityRealityConsistency`, `proposeRealityTransition` (`reality.ts`) | **REUSE, unchanged** | These already match sections 5-8 exactly. The only change in this PR is *where they attach*: `PropertyRealityDeclaration` becomes `Property.realityDeclaration` and `EntityRealityStatus` becomes `PropertyEntity.realityStatus`, instead of living on a freestanding `PropertyRealitySnapshot`. `PropertyRealitySnapshot`/`PropertyRealityHistory` are now superseded by `Property`/`PropertyRevision` (see below) but are left in place, unused by new code, rather than deleted mid-task -- they have their own passing test suite and no other code depends on removing them. |
| `EquipmentTwinDefinition`, `EquipmentTwinRegistry`, lifecycle functions (`equipmentTwin.ts`) | **REUSE, unchanged** | Matches sections 25-34 exactly already. |
| `PropertyEquipmentInstance` (`propertyEquipment.ts`) | **REUSE, unchanged shape** | Already carries `propertyId`/`propertyRevisionId` fields; this PR makes those fields refer to real `Property`/`PropertyRevision` ids instead of `HomesteadScenarioDefinition.id`/`.revision.id`. |
| `EquipmentCandidateTestIntent`, `runEquipmentCandidateTest` (`equipmentCandidateTest.ts`) | **EXTEND (this PR)** | Previously took a raw `HomesteadScenarioDefinition` as "baseline." This PR changes it to take a `PropertyRevision` and compile through the new `compilePropertyRevisionToHomesteadScenario()`, per section 40's mandated flow (`BASELINE REVISION -> CLONE CANDIDATE REVISION -> ... -> SCENARIO COMPILER -> SAME PROJECT 001 ENGINE`). |
| `docs/PROPERTY_REALITY_MODE.md`'s "no separate Property aggregate" decision | **SUPERSEDED (this PR)** | The previous PR explicitly decided *not* to introduce a `Property` wrapper, treating `scenario.id`/`scenario.revision.id` as the property identity. This task explicitly mandates a real `Property` aggregate distinct from `HomesteadScenarioDefinition` (section 0: "Property is persistent world/user state. HomesteadScenarioDefinition is immutable simulation input. Do not collapse them into one mutable object."). That earlier decision is reversed here; the doc is updated accordingly. |

## What this PR adds fresh (no prior contract to reuse)

`Property`, `PropertyIntent`, `PropertyEntity`, `PropertyGraph`,
`PropertyResourceGraph`/`PropertyResourceConnection`, `PropertyRevision`,
and `compilePropertyRevisionToHomesteadScenario()` are genuinely new --
nothing in the existing codebase modeled a persistent, multi-entity,
revisioned world above the scenario layer. These are built in
`src/property/{property,intent,entity,graph,resourceGraph,revision,
scenarioCompiler}.ts`.

## Explicitly deferred in this PR (see the wave ordering, section 57)

Per "Do not invert this order," this PR implements through Wave 4 plus the
equipment/candidate-test rewiring, and stops. Not implemented here:

- **Wave 8 -- Expert Knowledge** (`Protocol`, `Model`, `Constraint`,
  `ExpertEvidence`, `ExpertPack`, knowledge activation).
- **Wave 10 -- Experiment attachment** to canonical `PropertyEntity` refs.
- **Wave 11 -- Site Planner adapter** (migrating `gameplay/site-planner/`
  onto `PropertyEntity`/`PropertyGraph` instead of its own `SiteProject`).
- **Wave 12 -- completeness / evidence-coverage / plan-vs-actual /
  UNKNOWN-reason classification / decision-utility metrics.**
- **Wave 13 -- minimum required UI.**
- **Wave 14 -- Property intelligence / AI boundary.**
- Section 45's "Can I add 20 chickens?" acceptance path (depends on the
  compiler and livestock entity mapping existing first, which this PR
  does provide, but the end-to-end natural-language-shaped acceptance
  contract itself is not wired up).
- The full Final Acceptance Demo (section 65) end-to-end; this PR proves
  Steps 1-2's underlying contracts (VIRTUAL property, 365-day run,
  test-before-buy against a `PropertyRevision`) but not Steps 3-7
  (LogicHub retest revision, physical bench device HYBRID transition with
  live observations, expert-pack A/B comparison, REAL acquisition,
  plan-vs-reality calibration loop), which depend on the deferred waves
  above.
