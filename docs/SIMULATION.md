# Simulation

Simulation runs on a fixed timestep controlled by `SimulationClock`. Variable frame time is accumulated and converted into bounded substeps so deterministic systems receive stable `deltaMs` values.

## Tick pipeline

Input -> Commands -> Scheduler -> Event Flush -> Replay -> Profiler -> Debug Hooks.

## Determinism guarantees

- Ordered phases and priorities define stable execution.
- Systems with equal phase and priority are sorted by name.
- Randomness comes from `DeterministicRandom` snapshots.
- Replay frames include commands, events, seed state, tick, and checksum.
