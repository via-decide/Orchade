# EVENT_FLOW

Orchade engine infrastructure foundation for deterministic simulation core v1.

## Purpose

This document defines how gameplay capsules run as modular systems on top of scheduler, event, AI, navigation, streaming, replay, debugging, and profiling infrastructure.

## Rules

- Gameplay modules register systems with the scheduler instead of direct update calls.
- Gameplay modules communicate through events instead of mutating each other directly.
- Simulation state must be deterministic for a given input, command stream, random seed, and save snapshot.
- Systems expose stable public APIs, avoid circular dependencies, and remain independently testable.

## Current implementation

- Scheduler phases: INPUT, COMMANDS, WORLD, WEATHER, FARMING, ECOLOGY, NPC, AI, ECONOMY, QUESTS, EVENTS, SAVE, RENDER.
- Event bus supports synchronous, queued, delayed, replayable, filtered, and inspectable events.
- Navigation includes grid A* with terrain costs, dynamic obstacles, and path cache invalidation.
- AI includes memory, blackboard, perception, GOAP data shapes, planner, utility scoring, and behavior tree primitives.
- World streaming models Loaded, Visible, Active, Sleeping, and Unloaded chunk states.
- Replay records frames with inputs, commands, events, seeds, ticks, snapshots, and checksums.
- Profiler exports JSON, CSV, and Markdown performance summaries.
