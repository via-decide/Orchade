# Orchade Master Roadmap

Orchade is currently a React/Vite/Firebase orchard simulation whose runtime center is `src/App.tsx`, with domain extraction beginning in AI-readable `gameplay/*` feature capsules and JSON content under `data/*`. This bible treats the repo as entering production and prioritizes evidence from the current codebase: monolithic UI/runtime state, Firestore cloud persistence, data-definition seeds, scaffolded capsules, ADRs, and generated documentation automation.

## Evidence base
- Runtime shell: `src/App.tsx` owns app state, auth, Firestore sync, economy transfers, UI flows, and most rendering decisions.
- Domain extraction: `gameplay/module-manifest.json` declares ten capsules and their dependencies/events.
- Existing gameplay APIs: farming, weather, economy, world, and UI have initial facades; inventory/crafting/quests/NPC/combat are mostly scaffolded.
- Data pipeline seed: `data/crops`, `data/items`, `data/tools`, `data/buildings`, `data/quests`, `data/npcs`, and `data/weather` exist as JSON definitions.
- Persistence: Firebase auth and Firestore are configured; offline/cloud-save architecture is not yet separated from UI.

## Executive roadmap
| Track | Priority | Rationale | Dependencies | Complexity | Gameplay impact | Replayability | Retention | Maintainability |
|---|---:|---|---|---|---|---|---|---|
| Critical Foundation | P0 | Extract deterministic simulation, saves, events, schemas, and tests from the app shell. | ADRs, capsules, data schemas | High | Enables safe feature work | Medium | High | Very high |
| Core Gameplay | P1 | Deepen farming, inventory, crafting, weather, economy, quests, NPC loops. | Foundation | High | Very high | High | High | High |
| Simulation Expansion | P1 | Add seasons, ecology, logistics, automation, market simulation. | Core gameplay + telemetry | High | High | Very high | High | Medium |
| World Expansion | P2 | Villages, caves, travel, landmarks, secrets, biome progression. | World/content tools | High | Very high | Very high | High | Medium |
| Technical Excellence | P0/P1 | CI, performance budgets, save compatibility, content validation. | Foundation | Medium | Indirect | Medium | High | Very high |
| Visual Polish | P2 | Cohesive lighting, particles, vegetation, camera, hierarchy. | Art bible + perf budgets | Medium | High | Medium | Medium | Medium |
| Audio Polish | P2 | Adaptive music, ambience, feedback, accessibility audio. | Event bus + mixer | Medium | Medium | Medium | Medium | Medium |
| Accessibility | P1 | Keyboard/gamepad/touch, contrast, scalable UI, error recovery. | UX inventory | Medium | High | Medium | High | High |
| Modding | P3 | Content packs, schema validation, safe scripting, Workshop readiness. | Data-driven content | High | High | Very high | Medium | Medium |
| LiveOps | P3 | Seasonal events, telemetry, challenges, community goals. | Analytics + stable content | High | Medium | High | Very high | Medium |
| Experimental R&D | P4 | AI assistants, learned NPCs, advanced ecology. | Instrumentation | High | Unknown | High | Medium | Low |
| Future Vision | P4 | Multiplayer, dedicated servers, console/mobile parity. | Server-authoritative architecture | Very high | Very high | Very high | High | Medium |

## Phase gates
1. Stabilize state contracts and save versioning.
2. Move domain rules into capsules behind public APIs.
3. Validate all content through schemas and automated checks.
4. Introduce event-sourced simulation logs for replay/debug.
5. Expand world and LiveOps only after deterministic tests exist.
