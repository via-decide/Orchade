# Gameplay Systems Encyclopedia

## farming
Current implementation: in-progress capsule with FarmingState, PlantSummary, selectHarvestablePlants. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: core orchard care and harvest mastery. Dependencies: weather, world, ui. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## inventory
Current implementation: planned capsule with InventoryItem, InventoryState, createEmptyInventory. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: supports long-term simulation depth. Dependencies: farming, crafting, economy. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## crafting
Current implementation: planned capsule with CraftingRecipe, CraftingState, canCraftRecipe. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: supports long-term simulation depth. Dependencies: inventory, economy. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## weather
Current implementation: in-progress capsule with WeatherState, WeatherKind, describeWeather. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: supports long-term simulation depth. Dependencies: world. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## economy
Current implementation: in-progress capsule with EconomyState, PriceQuote, quotePrice. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: meaningful trade, pricing, and specialization. Dependencies: inventory, farming. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## world
Current implementation: in-progress capsule with WorldState, WorldLocation, advanceWorldDay. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: sense of place and progression. Dependencies: weather. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## quests
Current implementation: planned capsule with QuestState, QuestProgress, updateQuestProgress. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: supports long-term simulation depth. Dependencies: inventory, farming, npc. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## npc
Current implementation: planned capsule with NpcState, NpcProfile, findNpc. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: supports long-term simulation depth. Dependencies: quests, world. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## combat
Current implementation: planned capsule with CombatState, createCombatState. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: supports long-term simulation depth. Dependencies: inventory, world. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## ui
Current implementation: in-progress capsule with GameplayTab, UiState, setActiveTab. Missing capabilities: production content depth, executable tests, validation, tuning telemetry. Engineering limitations: runtime behavior is still partly centralized in `src/App.tsx` or scaffold-only. Player value: supports long-term simulation depth. Dependencies: farming, inventory, economy, weather. Expansion opportunities: data-driven definitions, events, achievements, balancing dashboards, and AI-readable examples. Implementation order: define state contract -> migrate pure rules -> add tests -> connect events -> add content.

## Dead and weak loops
Current weak loops are harvest-to-shop repetition without enough quest pressure, specialization, NPC consequence, tool mastery, or world discovery. Fix by tying plant choices to contracts, local demands, biome access, achievements, and visible orchard transformation.
