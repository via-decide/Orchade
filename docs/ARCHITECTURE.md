# Architecture

Orchade uses engine-first architecture. Gameplay systems are plugins registered into stable scheduler phases and communicate only through events.

## Layering

Runtime Kernel -> Scheduler/Events/Replay/Profiler -> Navigation/AI/World Services -> Gameplay Capsules -> UI/Renderer.

Circular dependencies across gameplay capsules are forbidden.

## Entity/component registry

Shared simulation state lives in the engine world. Gameplay capsules may add or query components through the registry, but cross-capsule behavior still flows through events and commands. This keeps ownership centralized while preserving modular systems.
