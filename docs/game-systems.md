# Game Systems

This inventory summarizes the repository's current and potential mechanics. Status values use the requested scale: **Implemented**, **Partial**, **Missing**, **Unused**, **Broken**, or **Potential**.

## Assessment scale

| Field | Scale |
|---|---|
| Priority | Critical, High, Medium, Low |
| Development effort | Small, Medium, Large |
| Technical risk | Low, Medium, High |
| Gameplay / Replayability / Retention / Architecture impact | Low, Medium, High |

## Movement

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Partial | `gameplay/world/README.md` declares world ownership, locations, scene state, and `PLAYER_MOVED`; `data/weather/weather-definitions.json` includes movement multipliers; `src/App.tsx` uses orchard and tab selection instead of avatar navigation. | No player position model in live state, no collision/pathfinding, no map traversal UI, no stamina/speed rules, no weather-to-movement runtime integration. | Add grid or scene-node navigation between orchard plots, weather-based traversal modifiers, shortcuts, terrain types, and discoverable world locations. | High | Large | Medium | High | High | Medium | High |

## Interaction

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Implemented | `src/App.tsx` wires handlers for login, seed selection, plant actions, shop purchases, transfers, day advancement, climate control, tabs, and orchard selection; `gameplay/ui/README.md` defines UI-facing presentation boundaries. | No generic interaction component/system, limited contextual prompts, no keybind/controller abstraction, no interaction event audit trail beyond logs. | Introduce a shared action dispatcher with previews, confirmations, cooldowns, contextual tooltips, and analytics events. | High | Medium | Medium | High | Medium | High | High |

## Inventory

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Partial | `gameplay/inventory/README.md` owns item/equipment/inventory contracts; `data/items/item-definitions.json` defines resources, seeds, tools, food, quest items, and containers; `src/App.tsx` currently tracks currencies, plants, harvested types, and shop items rather than a full item stack inventory. | Runtime inventory state, stack add/remove operations, containers, equipment slots, item persistence migrations, UI screens, validation against item definitions. | Add stack-based inventory, quick slots, item filters, drag/drop, storage containers, item provenance, and item-driven crafting/trading. | Critical | Large | High | High | High | High | High |

## Combat

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Potential | `gameplay/combat/README.md` is a future capsule for encounters, damage resolution, and `COMBAT_STARTED`/`COMBAT_ENDED`; no combat runtime appears in `src/App.tsx` or data packs. | Actors, health, damage formulas, enemy data, encounter spawning, equipment integration, UI, rewards, defeat rules, tests. | Garden pest battles, defensive drones, weather-mutated creatures, non-lethal conflict, and combat-linked research rewards. | Low | Large | High | Medium | High | Medium | High |

## Crafting

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Partial | `gameplay/crafting/README.md` owns recipes and production rules; `data/buildings/building-definitions.json` includes a basic workbench with crafting categories; item definitions include tools and resources. | Recipe data pack, runtime crafting UI, ingredient consumption, output generation, station requirements, unlock rules, batch crafting, failure/quality outcomes. | Craft tools, greenhouse modules, fertilizers, automation components, cooking ingredients, and quest-specific devices. | High | Large | Medium | High | High | High | High |

## Building

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Potential | `data/buildings/building-definitions.json` defines `basic_workbench`; `src/App.tsx` has fixed orchard slots and unlockable orchards but no placement system. | Placement grid, building inventory, construction costs, footprints, upgrades, persistence, demolition/move rules, building effects. | Add workbenches, greenhouses, weather shields, storage sheds, power nodes, irrigation pipes, and decorative objects. | Medium | Large | High | High | High | High | High |

## Mining

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Missing | No `gameplay/mining` capsule, no mining data pack, and no mining actions in `src/App.tsx`; `data/items/item-definitions.json` has resources but no ore nodes or mining tools beyond a hoe. | Resource nodes, mine locations, pickaxe/tools, durability, stamina, loot tables, hazards, progression gates, inventory integration. | Procedural cave expeditions, mineral data for rare plant upgrades, weather-affected mine entrances, and mining contracts. | Low | Large | High | Medium | High | Medium | Medium |

## Fishing

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Missing | No `gameplay/fishing` capsule, no fish item definitions, no water bodies, and no fishing UI/actions in `src/App.tsx`. | Fishing rods, fish species, water locations, timing minigame, bait, weather/season tables, inventory and cooking integration. | Add biome-specific fish, rainy-day bonuses, aquarium collectibles, NPC fishing requests, and rare data-fish. | Low | Medium | Medium | Medium | High | Medium | Medium |

## Cooking

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Potential | `data/items/item-definitions.json` declares a `food` category, but there are no food entries, recipes, kitchen buildings, or cooking UI. | Ingredients, recipes, cooking stations, buffs, spoilage, consumption, recipe discovery, economy value. | Create plant-based meals that alter growth, stamina, NPC relationships, weather resistance, or research yields. | Medium | Medium | Medium | Medium | High | Medium | Medium |

## Trading

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Partial | `gameplay/economy/README.md` owns pricing and shop contracts; `src/App.tsx` supports credits, Data Seeds, shop purchases, market exchange, transfers, and rankings; `data/npcs/npc-archetypes.json` includes merchant inventory for merchants. | Item trading, NPC shop inventories, buy/sell prices per item, dynamic pricing, trade reputation, auction/market history, anti-abuse validation. | Add rotating merchant stock, regional price spreads, player contracts, surplus crop markets, and friendship discounts. | High | Medium | Medium | High | High | High | High |

## Farming

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Implemented | `src/App.tsx` initializes orchards and plant state; `gameplay/farming/api.ts` exports lifecycle/actions; `src/constants.ts` defines plant stages and shop care items; `data/crops/crop-definitions.json` defines crop growth, water, nutrient, diseases, fertilizer, and harvest data. | Full crop data integration, seasons, soil types, weeds, disease resolution depth, tool durability, crop traits, farm layout editing, automation hooks. | Add crop genetics, seasonal calendars, soil health, greenhouse management, crossbreeding, crop quality, and event-driven quests. | Critical | Medium | Medium | High | High | High | High |

## Weather

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Implemented | `src/constants.ts` defines clear, rain, storm, heatwave, and fog weather; `gameplay/weather/api.ts` exports weather APIs; `data/weather/weather-definitions.json` includes climate modifiers; `src/App.tsx` tracks weather, forecasts, climate control, and weather visuals. | Multi-day climate model, seasonal probabilities, localized weather, weather alerts, complete data-pack synchronization with constants, movement/visibility integration. | Add extreme events, microclimates per orchard, forecast reliability, weather stations, crop affinities, and player-driven climate tech. | High | Medium | Medium | High | High | High | Medium |

## NPCs

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Potential | `gameplay/npc/README.md` owns NPC identity, schedules, dialogue hooks, relationships, and `NPC_UPDATED`; `data/npcs/npc-archetypes.json` defines villager, animal, and merchant archetypes. | Runtime NPC state, spawn locations, schedules, relationship values, interaction UI, persistence, animation, quest/trade integration. | Add named botanists, merchants, animals, helpers, rival growers, memory-driven relationships, and schedule-based discovery. | Medium | Large | High | High | High | High | High |

## Dialogue

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Potential | `data/quests/quest-definitions.json` references dialogue key `quest.first_harvest`; `gameplay/npc/README.md` lists dialogue hooks; no dialogue renderer or dialogue data pack is present. | Dialogue content files, branching choices, localization keys, speaker metadata, conditions, rewards, UI, history log. | Add branching NPC conversations, tutorial dialogue, ambient orchard chatter, relationship checks, and quest acceptance/turn-in scenes. | Medium | Medium | Medium | High | High | High | Medium |

## Quests

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Partial | `gameplay/quests/README.md` owns definitions, progress tracking, rewards, and `QUEST_PROGRESS`; `data/quests/quest-definitions.json` defines `first_harvest`; `docs/events.md` documents event-driven architecture. | Runtime quest journal, objective tracking, reward claiming, prerequisite evaluation, failure states, repeatables, UI integration, save migrations. | Add daily orders, story arcs, weather challenges, NPC requests, tutorial chain, and event-based automatic quest progress. | High | Medium | Medium | High | High | High | High |

## Progression

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Implemented | `src/App.tsx` tracks day, credits, Data Seeds, harvested types, orchard unlocks, plant growth, upgrades, and rankings; `src/constants.ts` defines growth stages and initial upgrades. | Unified progression model, level/XP curves, milestone rewards, prestige, tech tree, onboarding pacing, balance telemetry. | Add orchard mastery, research tiers, crop collection badges, tech unlock trees, seasonal ladders, and soft resets. | High | Medium | Medium | High | High | High | Medium |

## Skills

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Missing | No skill state in `src/types.ts`/`src/App.tsx`, no `gameplay/skills` capsule, and no skill definitions under `data/`. | Skill categories, XP sources, unlock perks, UI, save schema, balance rules, event hooks. | Add farming, botany, engineering, trading, exploration, and climate-control skill trees with active/passive perks. | Medium | Large | Medium | High | High | High | Medium |

## Achievements

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Potential | `src/App.tsx` imports and displays trophy/rankings concepts and tracks harvested types/global stats, but there is no achievements capsule or definitions data. | Achievement definitions, unlock evaluator, notifications, persistence, hidden achievements, reward grants, analytics. | Add crop collection achievements, perfect-care streaks, weather survival medals, economy milestones, and community leaderboard badges. | Medium | Medium | Medium | Medium | High | High | Medium |

## Pets

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Missing | `data/npcs/npc-archetypes.json` has an `animal` archetype, but no pet state, pet items, companion UI, or pet actions are wired in `src/App.tsx`. | Adoption, pet needs, affection, skills, animations, inventory interactions, pathing, save data. | Add companion critters that reduce pests, find seeds, forecast weather, fetch resources, and unlock cosmetic progression. | Low | Medium | Medium | Medium | High | Medium | Medium |

## Vehicles

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Missing | No vehicle capsule, no vehicle item/building definitions, and no movement runtime in `src/App.tsx` that would support mounts or transport. | Vehicle entities, controls, fuel/maintenance, garages, collision, cargo, map scale requiring transport. | Add hover-carts, irrigation drones, cargo tractors, and late-game traversal/automation vehicles. | Low | Large | High | Medium | Medium | Medium | High |

## Housing

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Potential | `data/buildings/building-definitions.json` shows building data can exist, but no house, furniture, room state, or home UI exists in `src/App.tsx`. | House entity, rooms, furniture placement, storage, rest/save benefits, cosmetics, visitor/NPC hooks. | Add grower quarters, lab rooms, trophy displays, furniture buffs, guest NPC visits, and account personalization. | Low | Large | Medium | Medium | High | Medium | High |

## Automation

| Current state | Repository evidence | Missing features | Expansion ideas | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Potential | `src/App.tsx` has manual plant care actions and climate control; `data/buildings/building-definitions.json` has a workbench hook; `gameplay/farming/README.md`, `gameplay/weather/README.md`, and `gameplay/economy/README.md` define separable domains needed for automation. | Timers/jobs, automated watering/fertilizing/pest control, power/resource costs, machine buildings, offline simulation rules, failure states. | Add irrigation networks, nutrient injectors, pest drones, climate AI, auto-harvesters, logistics belts, and programmable farm routines. | High | Large | High | High | High | High | High |

## Cross-system recommendations

| Recommendation | Why it matters | Priority | Development effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---|---|---|---|---|---|---|
| Promote item inventory to the central reward and cost substrate. | Crafting, cooking, trading, quests, mining, fishing, pets, housing, and automation all need reliable item stacks. | Critical | Large | High | High | High | High | High |
| Route mechanics through typed events. | The repository already describes capsule events; using them consistently will unlock quests, achievements, telemetry, and automation without coupling UI handlers together. | Critical | Medium | Medium | High | High | High | High |
| Split live UI handlers from domain reducers. | Farming/weather/economy extraction has started; continuing it lowers risk and makes balancing mechanics testable. | High | Medium | Medium | Medium | Medium | High | High |
| Build data-pack validation. | Many systems rely on `data/*`; schema checks will prevent broken content as mechanics expand. | High | Medium | Low | Medium | Medium | High | High |

## Progression Design Layers

The progression model should turn the current orchard loop into a set of connected long-term goals. Each layer below is designed to map directly to existing state types, constants, and data packs so progression can start as lightweight milestones before becoming a fully data-driven system.

### XP and level systems

Player XP should be awarded from actions already represented by `GameState`: advancing days, harvesting plants, earning credits, spending Data Seeds, unlocking orchards, and surviving weather pressure. A first implementation can add `playerLevel`, `currentXp`, and `lifetimeXp` to `GameState`, then use `day`, `credits`, `dataSeeds`, `orchards`, `harvestedTypes`, and `weather` as XP event inputs. `PLANT_STAGES` provides a natural growth XP ladder because each stage threshold marks a higher-care milestone, while `WEATHER_TYPES` can apply bonus XP for successfully maintaining plants during storms, heatwaves, and fog.

### Skill trees

Skill trees should specialize the broad `GlobalUpgrades` model into named branches. Farming skills can improve `waterEfficiency` and `nutrientRetention`; resilience skills can improve `stressResistance`; biosecurity skills can improve `pestDefense`; climate skills can reduce the cost or cooldown of `climateControl`. The current `INITIAL_UPGRADES` object is the baseline rank-zero tree state, and future nodes can unlock when the player reaches level thresholds, spends Data Seeds, harvests specific crop IDs, or owns specific item categories from `item-definitions.json` such as `tools`, `seeds`, and `resources`.

### Research and technology unlocks

Research should use `dataSeeds` as the core research currency and the Lab tab as its primary surface. Technology tiers can unlock new weather manipulation options from `WEATHER_TYPES`, new upgrade ranks in `GlobalUpgrades`, extra orchard slots from `Orchard.unlockCost`, and future crop definitions from `crop-definitions.json`. Each crop entry already contains water needs, nutrients, diseases, fertilizer effects, harvest outputs, and seasonal affinity, so research can expose advanced seed traits, disease counters, fertilizer recipes, or climate-control recipes without inventing a separate content source.

### Crop mastery

Crop mastery should track repeated success with each crop `id` in `crop-definitions.json`. The existing `harvestedTypes` array can represent discovery completion, while a future `cropMastery` map can count harvest quantity, best yield, low-stress harvests, pest-free harvests, and seasonal harvests. The Terran Sprout definition can seed the first mastery track: learn its water range, exploit its compost/synthetic/organic fertilizer modifiers, manage its root-rot and spore-blight risks, and ship its `terran_leaf` harvest item. Mastery rewards should include cosmetic archive badges, XP, Data Seeds, seed discounts, or small species-specific care bonuses.

### Tool mastery

Tool mastery should start from the `tools` category in `item-definitions.json`, currently represented by `field_hoe`. A lightweight implementation can track uses per tool ID and award mastery ranks that reduce action friction, improve planting outcomes, or unlock tool-specific perks. Tool mastery should eventually connect to crafting progression by requiring upgraded tools or tool ranks for advanced recipes, larger orchard maintenance, greenhouse construction, and automation interactions.

### Building progression

Building progression should extend the current orchard unlock model before a full placement system exists. `Orchard.isUnlocked` and `Orchard.unlockCost` already define expansion gates, and building unlocks can piggyback on those gates to introduce workbenches, storage, weather shields, irrigation, and lab modules. Once building definitions are expanded, each building should define prerequisites such as player level, research tier, item costs, required harvested crop types, or owned orchard count.

### Crafting progression

Crafting progression should use `item-definitions.json` as the output and ingredient vocabulary. The current categories give a clear recipe taxonomy: tools, seeds, resources, food, quest items, equipment, and containers. Crop harvest outputs such as `terran_leaf` can become early ingredients, while shop-care concepts from `SHOP_ITEMS` can become craftable fertilizer and pesticide recipes. Crafting levels should unlock batch sizes, recipe families, station access, quality bonuses, and reduced waste.

### Economy scaling

Economy progression should scale around `credits`, `dataSeeds`, shop costs, crop yields, and orchard expansion costs. Early progression can reward small credit payouts for harvests and require credits for `SHOP_ITEMS`; midgame can add crop-yield arbitrage, Data Seed exchange, and orchard unlock planning; late game can use prestige and LiveOps ladders to absorb surplus currency. Crop definitions already expose `minYield` and `maxYield`, while item definitions expose stack sizes and categories, giving the economy concrete levers for price, bulk sale, storage pressure, and market demand.

### Story progression

Story progression should be milestone-driven and should read from current discovery signals instead of requiring a separate story engine at first. The player can advance story chapters by reaching days survived, harvesting new crop types in `harvestedTypes`, unlocking orchards, earning Data Seeds, mastering weather events, and filling the archives. Crop lore can attach to crop IDs, item lore can attach to item IDs, and the Profile/Archives tabs can surface chapter rewards and encyclopedia entries.

### Achievements

Achievements should be an event-driven layer over existing state. Initial achievement triggers can include first harvest, first `terran_leaf`, first use of every `SHOP_ITEMS` care item, first unlocked orchard, first climate-control success, harvesting under each `WeatherType`, reaching each `PLANT_STAGES` threshold, and collecting each item category. Achievement rewards should be conservative: archive badges, profile cosmetics, small XP grants, or Data Seeds, with larger mechanical rewards reserved for research and skill trees.

### Prestige and new-game-plus

Prestige should unlock after major collection and economy milestones, such as all crop types discovered, all orchards unlocked, high player level, or archive completion. A new-game-plus reset can preserve account-level discoveries, achievements, crop mastery badges, and selected skill-tree nodes while resetting day, credits, planted orchards, and moment-to-moment plant state. Data Seeds are the best current prestige currency because they already sit outside simple credits and imply research/meta progression.

### Collection completion

Collection completion should combine crop IDs, harvest item IDs, seed IDs, tool IDs, weather encounters, achievements, and archive entries. `harvestedTypes` is the current crop collection seed, `crop-definitions.json` supplies the canonical crop list, and `item-definitions.json` supplies resource, seed, and tool collection categories. Collection UI should show discovered, owned, mastered, and perfected states separately so completionists can pursue both breadth and mastery depth.

### Seasonal and LiveOps progression

Seasonal progression should use crop seasons from `crop-definitions.json`, weather from `WEATHER_TYPES`, and economy goals from credits/Data Seeds to create time-boxed ladders without invalidating permanent progression. A season can ask players to harvest crops in supported seasons, complete weather challenges, craft limited recipes, earn leaderboard points, or fill event collection pages. LiveOps rewards should mostly be cosmetics, archive stamps, profile titles, and convenience bonuses so permanent power remains tied to stable systems such as XP, research, crop mastery, tools, buildings, and crafting.
