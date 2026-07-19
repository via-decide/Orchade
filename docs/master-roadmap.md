# Master Roadmap

## Evidence baseline
Orchade is a React/Vite orchard simulation in migration from a playable legacy app in `src/` to AI-native gameplay capsules in `gameplay/`. Existing systems include plant care, weather, forecasts, climate control, orchards, daily progression, upgrades, market actions, credit transfer, rankings, login, encyclopedia unlocks, an event bus, ordered simulation systems, and seed data packs for crops, items, weather, tools, buildings, quests, and NPC archetypes.

## Roadmap phases
| Phase | Goal | Evidence | Exit criteria |
|---|---|---|---|
| 1. Stabilize core loop | Keep planting, tending, harvesting, upgrades, weather, and saves reliable. | `src/App.tsx`, `src/types.ts`, `src/constants.ts`. | Core loop covered by unit/integration tests and no behavior depends on duplicated constants. |
| 2. Data-driven gameplay | Runtime consumes `data/*` catalogs. | `data/*/*.json`, `DataPack<T>`. | Crops/items/weather/quests can be added by data only. |
| 3. Capsule extraction | Move domain logic into `gameplay/*` public APIs. | `gameplay/module-manifest.json`, capsule READMEs/TODOs. | React UI imports capsule APIs instead of owning rules. |
| 4. Player progression expansion | Add tutorial quests, collection goals, seasonal objectives, NPC merchants, and crafting. | Existing quest, NPC, item, building, and tool definitions. | New player has clear first-session goals and long-term goals. |
| 5. World simulation depth | Make weather, day/night, seasons, NPC simulation, wildlife, water, lighting, and terrain affect choices. | `src/simulation/worldSystems.ts`, weather data. | World state changes produce visible gameplay and presentation consequences. |
| 6. Polish and live operations | Improve UX, visuals, audio, metrics, saves, and content operations. | Docs/ADRs/graphs, Firebase persistence, rankings/global stats. | Repeatable release process and measurable retention loops. |

## Prioritized suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Build a first-session tutorial quest chain from the existing `first_harvest` quest. | Reduces early confusion and turns planting, tending, harvesting, and upgrades into explicit goals. | M | L | H | M | H | M |
| Replace hard-coded seed lists with the crop catalog plus encyclopedia metadata. | Makes species additions cheaper and prevents runtime/data drift. | M | M | H | H | H | H |
| Add daily/weekly contracts for specific crops and weather conditions. | Gives players reasons to return and changes crop priorities between sessions. | M | M | H | H | H | M |
| Implement inventory and crafting around tools, seeds, crop yields, and workbenches. | Turns harvested outputs into decisions instead of only currencies. | L | M | H | H | H | H |
| Add NPC merchants and relationship-gated offers. | Humanizes the orchard world and provides social progression beyond rankings. | L | M | H | H | H | H |
| Introduce seasons and biome-specific orchard modifiers. | Makes location unlocks strategically different rather than only more plots. | L | M | H | H | H | H |
| Add save migrations and schema validation for user documents/data packs. | Protects player progress as systems become data-driven. | M | M | M | M | H | H |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
