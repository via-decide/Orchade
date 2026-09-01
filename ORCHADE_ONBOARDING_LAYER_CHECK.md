# ORCHADE ONBOARDING LAYER CHECK

**Audited**: 2026-09-01  
**Branch**: `claude/security-leak-orchade-card-ss3sue` @ `da88327`  
**Test suite**: 255/255 passing (9 test modules, 0 failures)

---

## Layer Classification

### 1. NEW-GAME ENGINE
**Status: IMPLEMENTED**

- `src/simulation/gameLoop.ts` — `GameLoopOrchestrator` with `boot()`, `tick()`, `shutdown()` lifecycle
- 10 simulation phases: boot → main-menu → world-generation → player-spawn → simulation-tick → input → gameplay-systems → render → autosave → shutdown
- System registration with priority ordering
- `EventBus` wired into context for cross-system communication
- Test evidence: `gameplay/world/tests/farm-loop.test.ts` (5/5 pass)

### 2. DETERMINISTIC SIMULATION CORE
**Status: IMPLEMENTED**

- `src/engine/random/rng.ts` — `DeterministicRandom` (LCG with `snapshot()`/`restore()`)
- `src/engine/replay/checksum.ts` — deterministic JSON-hash checksum
- `src/engine/replay/recorder.ts` — `ReplayRecorder` with frame recording + checkpoint snapshots
- `src/simulation/homestead/run.ts` — `runHomesteadScenario()` produces `HomesteadScenarioRun` with replay frames + final checksum
- `src/simulation/homestead/projectRun.ts` — `Project001RunSession` with daily checksums, metric series, failure summaries
- `src/engine/runtime/kernel.ts` — `EngineRuntimeKernel` integrating scheduler, events, commands, replay, metrics, RNG
- Test evidence: `tests/determinism.test.ts` (6/6 pass) — verifies identical seed → identical checksum

### 3. HOMESTEAD DAY TRANSITION
**Status: IMPLEMENTED**

- `src/simulation/homestead/advanceDay.ts` (187 lines) — `advanceHomesteadDay()` with:
  - Season rotation (30-day cycles)
  - Solar energy generation per season sunlight hours
  - Deterministic weather sampling (rainfall probability)
  - Water balance (catchment, cistern, consumption)
  - Livestock grazing + pasture biomass + manure → soil nitrogen
  - Crop growth stages, frost damage, nutrient drain, harvestability
- `src/simulation/homestead/state.ts` — `validateHomesteadState()` with invariant checks
- `src/simulation/homestead/scenario.ts` (281 lines) — `HomesteadScenarioDefinition` schema-v2 with full validation
- Test evidence: `tests/homesteadSimulation.test.ts` (17/17 pass)

### 4. PROJECT 001 FULL-SYSTEM SIMULATION
**Status: IMPLEMENTED**

- `src/simulation/homestead/projectTransition.ts` (447 lines) — `advanceProject001Day()` with 12+ subsystems: climate, rainfall, water, energy, crops, livestock, nutrients, food, labour, economy, observations, knowledge
- `src/simulation/homestead/projectState.ts` (284 lines) — `ProjectHomesteadState` with land, climate, foodProducers, livestock, water, energy, nutrients, household, economy, knowledge
- `src/simulation/homestead/projectRun.ts` (153 lines) — `runProject001Scenario()` + `compareProject001Scenarios()` + A/B metric deltas
- `src/simulation/homestead/projectInitialState.ts` (113 lines) — deterministic initial state from scenario definition
- `src/simulation/homestead/project001Scenario.ts` (171 lines) — `PROJECT_001_BASELINE_SCENARIO` with calibrated Indian homestead parameters
- `src/simulation/homestead/analytics.ts` — daily record creation for metric time series
- Test evidence: `tests/project001.test.ts` (35/35 pass)

### 5. TRUE-NUMBER PROVENANCE
**Status: IMPLEMENTED**

- `src/simulation/homestead/provenance.ts` (257 lines) — `ParameterOrigin` (MEASURED/RESEARCHED/REGIONAL_DEFAULT/USER_ASSUMPTION/DERIVED), `ParameterProvenanceRecord`, `ParameterProvenanceRegistry`, `DerivedValueEvidence`
- `src/simulation/homestead/trueNumber.ts` (249 lines) — `buildProject001TrueNumberReadModel()` producing `MetricDisplayValue[]` with origin, provenanceRef, derivationRef, quality, status
- Full registry creation from scenario: land, climate, household, foodProducers, livestock, water, energy, nutrients, economy
- Derived value evidence chain: cropYield, tankLevel, solarGeneration, labour, cash — all with input parameter refs + event refs
- Test evidence: `tests/digitalTwinContracts.test.ts` (51/51 pass, includes true-number assertions)

### 6. DIGITAL-TWIN CONTRACTS (Observation → Reconciliation → Prediction)
**Status: IMPLEMENTED**

- `src/simulation/homestead/observation.ts` (426 lines) — `validateAndNormalizeObservation()` with 22 validation reason codes, device source trust, metric definitions with physical bounds, unit conversion
- `src/simulation/homestead/reconciliation.ts` (91 lines) — `evaluateObservationReconciliation()` mapping observations to state paths (tank_level, pond_level, rainfall, temperature, battery, soil_moisture)
- `src/simulation/homestead/prediction.ts` (168 lines) — `createPrediction()`, `comparePredictionToObservation()`, `createCalibrationCandidate()`, `createModelParameterRevision()`
- Test evidence: `tests/digitalTwinContracts.test.ts` (51/51 pass)

### 7. CONTROL ENVELOPE
**Status: IMPLEMENTED**

- `src/simulation/homestead/control.ts` (74 lines) — `evaluateControlDecision()` with fail-closed behavior
- `ActuatorCommand` → `ControlCheck[]` → `ControlDecision` (AUTHORIZED/REJECTED/DEFERRED)
- Required checks: sensorFreshness, tankAvailability, pumpHealth, valveHealth, energyAvailability, runtimeLimit
- Missing checks default to UNKNOWN → DEFERRED (fail-closed)
- Any FAIL → REJECTED (fail-closed)
- `PostActionVerification` interface for command follow-through

### 8. RESEARCH CREDITS & UNLOCK GATING
**Status: IMPLEMENTED**

- `gameplay/research-credits/` — full module with `api.ts` (24 lines), `state.ts`, `internal/ledger.ts`, `internal/unlocks.ts`
- `credit()`, `debit()`, `performUnlock()`, `isUnlocked()`, `getStarterUnlocks()`
- `UNLOCK_REGISTRY` with cost, requiredLevel, validSeasons per content item
- Wired into `planningTransition.ts` via `GRANT_RESEARCH_CREDITS` and `UNLOCK_CONTENT` intents
- Test evidence: `tests/progressionContracts.test.ts` (31/31 pass)

### 9. PROGRESSION (BUILD → OPERATE → MASTER)
**Status: IMPLEMENTED**

- `gameplay/progression/` — `api.ts` (25 lines), `state.ts`, `internal/levels.ts`, `internal/skins.ts`
- `checkLevelUp()`, `requireActiveEnvironmentSkin()`, `ProgressionState`, `EnvironmentSkin`
- Wired into `planningTransition.ts` via `EVALUATE_LEVEL` and `SELECT_ENVIRONMENT_SKIN` intents
- Test evidence: `tests/progressionContracts.test.ts` (31/31 pass)

### 10. PHYSICAL PREREQUISITE GATING
**Status: IMPLEMENTED**

- `gameplay/prerequisites/` — `api.ts`, `internal/evaluator.ts`, `public.ts`
- `evaluatePhysicalPrerequisites()` with season, area, capacity, resource, entity, component, capital checks
- `src/simulation/homestead/prerequisiteFacts.ts` — `deriveProjectPrerequisiteFacts()` mapping `ProjectHomesteadState` → `PhysicalPrerequisiteFacts`
- Test evidence: `tests/prerequisiteContracts.test.ts` (37/37 pass)

### 11. SYSTEM PERFORMANCE BOUNDARY
**Status: IMPLEMENTED**

- `src/simulation/homestead/systemPerformance.ts` (394 lines) — performance metric thresholds, entity budget assertions, frame budget monitoring
- `src/simulation/homestead/modelCapabilities.ts` (69 lines) — `PROJECT_001_MODEL_CAPABILITIES` declaring SUPPORTED/ESTIMATE_ONLY/NOT_MODELED for 14 subsystems + temporal resolution boundary
- Test evidence: `tests/systemPerformance.test.ts` (23/23 pass)

### 12. KNOWLEDGE / LEARNING LAYER
**Status: IMPLEMENTED**

- `src/simulation/homestead/knowledge.ts` — `createEvidenceBackedLearnedRule()` with evidence validation, `createWaterStorageExperimentSummary()` for A/B experiments
- `ProjectKnowledgeState` in `projectState.ts`: observations[], failures[], evidence[], learnedRules[]
- `ExperimentSummary` with SUPPORTED/PARTIALLY_SUPPORTED/REFUTED/INCONCLUSIVE status
- Evidence-backed rule requires non-empty condition, outcome, and valid evidence refs from the run

### 13. ACQUISITION AUTOMATION
**Status: NOT IMPLEMENTED**

- No autonomous acquisition pipeline, no automated procurement/scheduling system
- `src/simulation/homestead/planningTransition.ts` provides manual intent-based planning (GRANT_RESEARCH_CREDITS, UNLOCK_CONTENT, PLACE_COMPONENT, EVALUATE_LEVEL, SELECT_ENVIRONMENT_SKIN) — but no automated sequencing
- The blank-slate scenario (`blankSlateScenario.ts`) starts with empty land and zero infrastructure — additions enter through deterministic planning intents, but no "director" automates the sequence
- **This is the layer Issue #54 (new-game director) targets**

---

## Summary

| # | Layer | Status | Test Coverage |
|---|-------|--------|---------------|
| 1 | NEW-GAME ENGINE | IMPLEMENTED | 5 tests |
| 2 | DETERMINISTIC SIMULATION CORE | IMPLEMENTED | 6 tests |
| 3 | HOMESTEAD DAY TRANSITION | IMPLEMENTED | 17 tests |
| 4 | PROJECT 001 FULL-SYSTEM SIM | IMPLEMENTED | 35 tests |
| 5 | TRUE-NUMBER PROVENANCE | IMPLEMENTED | 51 tests (shared) |
| 6 | DIGITAL-TWIN CONTRACTS | IMPLEMENTED | 51 tests (shared) |
| 7 | CONTROL ENVELOPE | IMPLEMENTED | included in DT tests |
| 8 | RESEARCH CREDITS & UNLOCK | IMPLEMENTED | 31 tests |
| 9 | PROGRESSION (B→O→M) | IMPLEMENTED | 31 tests (shared) |
| 10 | PHYSICAL PREREQUISITES | IMPLEMENTED | 37 tests |
| 11 | SYSTEM PERFORMANCE | IMPLEMENTED | 23 tests |
| 12 | KNOWLEDGE / LEARNING | IMPLEMENTED | included in P001 tests |
| 13 | ACQUISITION AUTOMATION | NOT IMPLEMENTED | — |

**12 of 13 layers are IMPLEMENTED with passing tests. Layer 13 (Acquisition Automation) is the earliest incomplete dependency — it is what Issue #54 (deterministic new-game director) will build.**
