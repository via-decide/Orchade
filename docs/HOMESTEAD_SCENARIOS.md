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

`HomesteadScenarioDefinition` supplies a stable ID, explicit schema version, explicit seed, start day, optional duration, and controller mode. Invalid definitions fail before simulation. The default Plot Planner scenario starts at day 1 with seed `orchade-plot-planner-default`.

`advanceHomesteadDay` is a pure transition. It accepts canonical homestead state plus a scenario, restores the existing `DeterministicRandom` from the state's RNG snapshot, and returns the next state, updated RNG snapshot, and reproducibly identified events. It does not use React, browser APIs, Firebase, wall-clock time, or ambient randomness.

`runHomesteadScenario` is the small adapter to the existing replay subsystem. Each simulated day is recorded as a replay frame with deterministic events, the RNG snapshot, a state checkpoint, and a checksum. Equal scenario, initial state, and action sequence therefore produce equal stochastic history, final state, and checksum.

## Controller boundary

- `manual`: current Plot Planner player actions with deterministic physical day advancement.
- `deterministic`: reserved for a future rules-based controller.
- `ai-shadow`: schema preparation only; this code does not call an AI model or control the homestead.

The coefficients moved from Plot Planner retain their current game behavior. They are not automatically scientifically or agronomically validated. Parameter provenance, sensor calibration, real-world measurements, controller comparisons, and actuator integration remain future work.
