# Simulation Architecture

| Simulation | Current | Target | Ultimate vision |
|---|---|---|---|
| Farming | Plant lifecycle APIs and orchard UI exist | Deterministic growth, traits, soil, pests, tools | Breeding/ecology-driven orchards with emergent strategies |
| Ecology | Mostly aspirational | Soil health, pollinators, pests, biodiversity | Self-balancing ecosystem simulation |
| Seasons/climate | Weather forecast and climate control seeds | Seasonal calendars, hazards, modifiers | Regional climate models with adaptation gameplay |
| Economy | Shop and currency APIs started | Dynamic demand/sinks/merchant inventories | Player-influenced regional market equilibrium |
| NPC | Archetype data and capsule scaffold | Schedules, relationships, dialogue, services | Memory-bearing village society |
| Wildlife/enemies | Combat scaffold only | Encounter tables and animal behaviors | Ecosystem actors affecting crops/resources |
| Resources/crafting | JSON items/recipes scaffolding | Inventory recipes and station workflows | Logistics and automation production chains |
| Automation | Not implemented | Assistants, batch actions, routing | Programmable farm systems with safe scripting |

## Determinism rule
Every simulation tick must accept previous state, content registries, commands, and seeded RNG, then return next state plus events.
