# Architecture

## Repository map
| Area | Role | Production concern |
|---|---|---|
| `src/App.tsx` | Current runtime shell, UI orchestration, auth/save integration, rendering composition | Too broad; split into app shell, simulation host, save adapter, screens |
| `src/components/*` | Plant card, visualizer, encyclopedia UI | Keep presentation-only; move rules out |
| `src/simulation/*` | Emerging deterministic simulation primitives | Promote to canonical simulation package |
| `gameplay/*` | AI-native feature capsules | Fill internals/tests and enforce boundaries |
| `data/*` | Seed content definitions | Add JSON Schema, IDs, validation, editor tooling |
| `docs/*` | Engineering knowledge base | Keep updated with ADR and roadmap changes |

## Dependency graph
| inventory | planned | farming, crafting, economy | INVENTORY_CHANGED | InventoryItem, InventoryState, createEmptyInventory |
| farming | in-progress | weather, world, ui | PLANT_WATERED, PLANT_HARVESTED, FARMING_STATE_CHANGED | FarmingState, PlantSummary, selectHarvestablePlants |
| combat | planned | inventory, world | COMBAT_STARTED, COMBAT_ENDED | CombatState, createCombatState |
| crafting | planned | inventory, economy | CRAFTING_COMPLETED | CraftingRecipe, CraftingState, canCraftRecipe |
| quests | planned | inventory, farming, npc | QUEST_PROGRESS | QuestState, QuestProgress, updateQuestProgress |
| npc | planned | quests, world | NPC_UPDATED | NpcState, NpcProfile, findNpc |
| weather | in-progress | world | WEATHER_UPDATED | WeatherState, WeatherKind, describeWeather |
| economy | in-progress | inventory, farming | ECONOMY_CHANGED | EconomyState, PriceQuote, quotePrice |
| ui | in-progress | farming, inventory, economy, weather | UI_TAB_CHANGED | GameplayTab, UiState, setActiveTab |
| world | in-progress | weather | PLAYER_MOVED, WORLD_UPDATED | WorldState, WorldLocation, advanceWorldDay |

## Runtime architecture
React renders the game shell, local React state stores current world/player data, gameplay capsule APIs perform selected domain transitions, Firebase Auth identifies users, and Firestore stores cloud state/global statistics. Target architecture: UI -> command bus -> simulation domain -> event log -> save projection -> render view models.

## Data flow
Input events create commands; commands validate against domain APIs; accepted commands mutate deterministic state; emitted events update logs, quests, analytics, saves, and UI view models. JSON definitions should feed registries at boot, never hard-coded UI conditionals.

## Save flow
Current save concerns are coupled to the app shell and Firestore. Target: versioned `SaveGame` envelope, local autosave adapter, cloud adapter, migration registry, conflict resolver, checksum, and compatibility tests.

## Rendering flow
Current rendering is React component driven with PlantVisualizer handling rich plant visuals. Target: screen route -> view model -> component tree -> asset registry -> animation/effects layer, with no domain mutation during render.

## Simulation flow
Day advancement should run weather forecast, plant lifecycle, economy ticks, NPC schedules, quest updates, world events, autosave, and telemetry in deterministic order with seeded RNG.

## Event graph
PLAYER_MOVED -> WORLD_UPDATED; WEATHER_UPDATED -> FARMING_STATE_CHANGED; PLANT_HARVESTED -> INVENTORY_CHANGED + ECONOMY_CHANGED + QUEST_PROGRESS; CRAFTING_COMPLETED -> INVENTORY_CHANGED; SAVE_REQUESTED -> SAVE_COMPLETED/SAVE_FAILED.

## Ownership graph
Capsules own their `state.ts`, `api.ts`, `public.ts`, tests, and internals. `src` may compose capsules but must not own reusable domain rules long term.

## Feature capsule maturity matrix
| Module | Cohesion | Coupling | Maintainability | Scalability | Testability | Documentation | AI readability | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| inventory | 2 | 2 | 2 | 2 | 2 | 4 | 4 | Capsule planned; runtime gap remains |
| farming | 3 | 2 | 3 | 3 | 2 | 4 | 4 | Runtime extraction started |
| combat | 2 | 3 | 2 | 2 | 2 | 4 | 4 | Capsule planned; runtime gap remains |
| crafting | 2 | 3 | 2 | 2 | 2 | 4 | 4 | Capsule planned; runtime gap remains |
| quests | 2 | 2 | 2 | 2 | 2 | 4 | 4 | Capsule planned; runtime gap remains |
| npc | 2 | 3 | 2 | 2 | 2 | 4 | 4 | Capsule planned; runtime gap remains |
| weather | 3 | 3 | 3 | 3 | 2 | 4 | 4 | Runtime extraction started |
| economy | 3 | 3 | 3 | 3 | 2 | 4 | 4 | Runtime extraction started |
| ui | 3 | 2 | 3 | 2 | 2 | 4 | 4 | Runtime extraction started |
| world | 3 | 3 | 3 | 2 | 2 | 4 | 4 | Runtime extraction started |

## Platform migration paths
- 10x content: schema validation, registries, lazy loading, content IDs.
- 100x content: asset bundles, indexed lookups, content QA dashboards.
- Multiplayer/dedicated servers: deterministic commands, authoritative server, event log replication.
- Mobile/console: input abstraction, responsive UI, memory budgets, certification-safe saves.
- Steam/mods: build pipeline, achievements abstraction, Workshop content packs.
- Offline/cloud saves: local-first saves with conflict resolution and cloud projection.
