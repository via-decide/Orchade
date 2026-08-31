# Homestead scenarios

The Plot Planner day cycle now crosses a deterministic simulation boundary:

```text
Scenario
↓
Initial State
↓
Deterministic RNG
↓
Daily Transition
↓
Structured Events
↓
Replay Frames + Checksums
↓
Final State
```

`HomesteadScenarioDefinition` is the schema-v2 canonical contract. It supplies stable scenario/revision identity, explicit simulation version and seed, daily time model, metric units, land, climate, household, food producers, livestock, water, energy, nutrients, economy, operating policy, and experiments. Invalid definitions fail before simulation. The Project 001 dogfood scenario starts at day 1 with seed `orchade-project-001-fixed`.

`advanceHomesteadDay` is a pure transition. It accepts canonical homestead state plus a scenario, restores the existing `DeterministicRandom` from the state's RNG snapshot, and returns the next state, updated RNG snapshot, and reproducibly identified events. It does not use React, browser APIs, Firebase, wall-clock time, or ambient randomness.

`runHomesteadScenario` is the small adapter to the existing replay subsystem. Each simulated day is recorded as a replay frame with deterministic events, the RNG snapshot, a state checkpoint, and a checksum. Equal scenario, initial state, and action sequence therefore produce equal stochastic history, final state, and checksum.

`runProject001Scenario` extends that same homestead simulation subsystem with coupled property balances, daily analytics, evidence-linked failures, immutable revision comparison, and a 365-day replay. It does not introduce another runtime or random-number implementation.

## Controller boundary

- `manual`: current Plot Planner player actions with deterministic physical day advancement.
- `deterministic`: reserved for a future rules-based controller.
- `ai-shadow`: schema preparation only; this code does not call an AI model or control the homestead.

The coefficients moved from Plot Planner retain their current game behavior. They are not automatically scientifically or agronomically validated. Parameter provenance, sensor calibration, real-world measurements, controller comparisons, and actuator integration remain future work.
