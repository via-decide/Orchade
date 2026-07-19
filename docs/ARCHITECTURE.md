# Architecture

Orchade uses engine-first architecture. Gameplay systems are plugins registered into stable scheduler phases and communicate only through events.

## Layering

Runtime Kernel -> Scheduler/Events/Replay/Profiler -> Navigation/AI/World Services -> Gameplay Capsules -> UI/Renderer.

Circular dependencies across gameplay capsules are forbidden.
