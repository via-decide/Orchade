# ORCHADE v2 Gameplay Architecture

ORCHADE v2 treats gameplay as a simulation platform: features are registered systems, data lives in content packs, and cross-system communication happens through events instead of imports between domains.

## Core Loop

The isolated boot path is:

1. Game Boot
2. Main Menu
3. World Generation
4. Player Spawn
5. Simulation Tick
6. Input
7. Gameplay Systems
8. Render
9. Autosave
10. Shutdown

`GameLoopOrchestrator` owns this order and exposes registration points for gameplay systems. Systems receive a shared `SimulationContext`, emit events, and avoid direct references to unrelated systems.

## Independent World Systems

World simulation is split into terrain, weather, day-night, temperature, water, wind, lighting, season, wildlife, and NPC simulation systems. Each system has an independent update function and deterministic ordering.

## Data-Driven Gameplay

Content packs are stored under `/data`:

- `/data/items` for item categories, weight, stacks, sorting, filtering, quick slots, and hotbar metadata.
- `/data/crops` for crop stages, water, nutrients, harvest rules, disease risks, season compatibility, and fertilizer effects.
- `/data/npcs` for villager, animal, enemy, merchant, and worker archetypes that compose schedules, needs, goals, memory, relationships, and tasks.
- `/data/quests` for objectives, dialogue, rewards, dependencies, triggers, conditions, failure states, and repeatability.
- `/data/weather` for weather effects on crops, movement, visibility, NPC behavior, audio, and lighting.
- `/data/buildings` and `/data/tools` for crafting stations and tool actions.

## Event Bus Contract

Every gameplay action emits an event such as `PLAYER_MOVED`, `ITEM_PICKED`, `ITEM_DROPPED`, `CROP_PLANTED`, `CROP_HARVESTED`, `NPC_TALKED`, `QUEST_STARTED`, `QUEST_COMPLETED`, `DAY_STARTED`, and `WEATHER_CHANGED`.

## Extension Rules

- Adding Farming must not modify Combat.
- Adding NPCs must not modify Inventory.
- Adding Quests must not modify Rendering.
- New behavior should be added by registering a system or adding a data pack entry.
