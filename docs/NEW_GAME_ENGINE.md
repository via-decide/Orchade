# New-Game Director Engine

The director engine (`gameplay/director/`) orchestrates the first-session player experience by composing existing deterministic systems into a guided objective flow.

## Architecture

```
gameplay/director/
  public.ts          # Types: NewGameState, PlayerObjective, PlayerAction
  state.ts           # createNewGameState() factory
  api.ts             # Public re-exports
  internal/
    objectives.ts    # OBJECTIVE_GRAPH + deriveNextPlayerObjective
    bootstrap.ts     # One-time starter voucher (idempotent)
    actions.ts       # deriveAvailablePlayerActions
    transitions.ts   # Placement → scenario bridge, day advance
    failures.ts      # Failure detection + recovery suggestions
    progression.ts   # Consequence-driven level evaluation
  tests/
    director.test.ts # 14 deterministic contract tests
```

## Core Types

**NewGameState** — the aggregate root:
- `runId`, `scenarioId`, `seed` — identity and determinism
- `day`, `phase`, `objectiveId` — current position
- `completedObjectiveIds` — progress history
- `planning` (HomesteadPlanningState), `simulation` (HomesteadSimulationState), `scenario` (HomesteadScenarioDefinition) — composed subsystems
- `bootstrapRedeemed`, `simulationReady` — one-time gates

**NewGamePhase**: `ORIENTATION` → `FIRST_BUILD` → `FIRST_OPERATION` → `ESTABLISHED`

**PlayerObjective**: `{ id, title, reason, permittedIntentTypes, targetIds?, blockedBy? }`

**PlayerAction**: `{ id, label, intentType, availability, blockReason?, targetId?, cost? }`

## Objective Graph

Nine objectives in a fixed deterministic chain:

1. `inspect_land` (ORIENTATION) — always completable
2. `choose_starter_plan` (ORIENTATION) — shows season-valid free crops
3. `place_first_food_producer` (FIRST_BUILD) — requires unlocked crop + area
4. `establish_water_source` (FIRST_BUILD) — auto-completes on day advance
5. `advance_first_day` (FIRST_OPERATION) — requires placement applied
6. `respond_to_consequence` (FIRST_OPERATION) — auto-completes at day ≥ 2
7. `complete_first_harvest` (FIRST_OPERATION) — checks harvestable zones
8. `introduce_research` (FIRST_OPERATION) — needs a paid unlock
9. `unlock_next_system` (ESTABLISHED) — needs 2+ paid unlocks

After all nine, `deriveNextPlayerObjective` returns a `free_play` sentinel.

## Key Functions

### State Factory
```ts
createNewGameState(options?: { runId?, seed?, scenarioOptions? }): NewGameState
```
Creates a blank-slate scenario with empty water/solar/zones and day 0 (simulation starts at day 1 internally).

### Objective Derivation
```ts
deriveNextPlayerObjective(state: NewGameState, season: UnlockSeason): PlayerObjective
```
Pure function — returns the first incomplete objective from the graph.

### Action Availability
```ts
deriveAvailablePlayerActions(state: NewGameState, season: UnlockSeason): PlayerAction[]
```
Returns all possible actions with their availability status: `AVAILABLE`, `LOCKED`, `BLOCKED_RESOURCE`, `BLOCKED_LEVEL`, `BLOCKED_SEASON`, `BLOCKED_PREREQUISITE`, `BLOCKED_STATE`.

### Starter Bootstrap
```ts
deriveStarterBootstrap(state, season): BootstrapVoucher | null
redeemBootstrap(state, voucher): { state, events }
```
One-time, idempotent voucher granting 20 research credits. Returns null / empty events on double redemption.

### Placement Bridge
```ts
applyPlacementsToScenario(state): { state, events }
```
Converts planning placements into scenario food producers and land placements, assigns crops to simulation zones.

### Day Advance
```ts
advanceNewGameDay(state): { state, events, simulationEvents }
```
Wraps `advanceHomesteadDay` for the NewGameState aggregate.

### Consequence Processing
```ts
processSimulationConsequences(state, events, season): { state, events }
```
After qualifying simulation events (`CONTENT_UNLOCKED`, `HARVEST_COMPLETED`, etc.), auto-evaluates level progression, auto-completes objectives, and detects/clears failures.

## Determinism Guarantees

- All functions are pure — same inputs produce same outputs
- No `Math.random()`, `Date.now()`, or `crypto.randomUUID()` in the pipeline
- RNG uses `DeterministicRandom` seeded via `hashSeed(string)`
- Replay test confirms identical objective sequences across runs

## UI Integration

`ObjectiveBanner` component (`src/components/ObjectiveBanner.tsx`) renders:
- Current phase badge with color coding
- Objective title and reason
- Available action count
- Progress bar (completed / total objectives)

Mounted in PlotPlanner between the header and plot board.

## Test Coverage

14 contract tests in `gameplay/director/tests/director.test.ts`:
1. Blank slate produces legal first objective
2. Same seed → identical objectives and actions
3. Bootstrap cannot be redeemed twice
4. Invalid placement rejected with reason
5. Legal placement changes planning state
6. Placement changes simulation behavior
7. Wrong-season starter filtering
8. Insufficient-area rejection
9. Fresh player cannot deadlock
10. Progression recomputes after qualifying events
11. Replay produces identical objective sequence
12. Restored state does not duplicate bootstrap
13. UI gating matches engine availability
14. Planned modules not required for first session
