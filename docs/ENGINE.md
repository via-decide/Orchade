# Engine Runtime

The Orchade engine is centered on `EngineRuntimeKernel`, which owns the deterministic clock, scheduler, command buffer, event queue, replay recorder, profiler metrics, and seeded random stream.

## Runtime lifecycle

1. Input is converted into tick-addressed commands.
2. The fixed timestep clock emits one or more simulation steps.
3. Commands are drained and published as events.
4. Registered systems execute through the scheduler in deterministic phase/priority order.
5. Queued and delayed events flush for the tick.
6. Replay captures commands, events, random state, and checksum.
7. Profiler metrics record tick duration.

## Ownership

Gameplay capsules own gameplay state and public APIs. Engine modules own scheduling, communication, timing, replayability, navigation services, streaming state, and diagnostics.

## Dependency rule

Gameplay modules must not call each other directly. Cross-module effects must flow through commands, scheduler systems, or engine events.
