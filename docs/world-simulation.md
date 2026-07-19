# World Simulation Plan

## Purpose

This document maps the desired world-simulation surface area for Orchade. Each area lists the current repository state, the most important gaps, possible expansion directions, and a practical implementation sequence. The plan assumes the existing migration path: keep the playable React app stable while moving domain logic into `gameplay/` capsules and data packs.

## Evidence baseline

- `src/simulation/worldSystems.ts` already names terrain, weather, day-night, temperature, water, wind, lighting, season, wildlife, and NPC simulation systems, but most systems are placeholders.
- Runtime state in `src/App.tsx` already includes day progression, weather, weather forecasts, climate control, orchards, plant plots, and location-like orchard unlocks.
- `data/` contains early data-pack examples for crops, weather, items, tools, buildings, quests, and NPC archetypes.
- `gameplay/world/` is the intended capsule for orchards, locations, scene state, and world progression boundaries, with dependencies on weather.

## Cross-system implementation principles

1. **Data first:** define world content in JSON catalogs before hard-coding behavior.
2. **Deterministic simulation:** use seeded random utilities for reproducible chunks, weather, events, spawns, and tests.
3. **Small adapters:** connect new systems to the legacy `src/App.tsx` state through thin adapters until the capsule migration is complete.
4. **Visible effects:** every simulated state should have a gameplay, UI, audio, or rendering consequence.
5. **Graceful degradation:** missing assets should use placeholders rather than blocking playable loops.

## Areas

### Biomes

- **Current state:** The game has multiple orchards and weather concepts, but no explicit biome model or biome-specific rules.
- **Missing features:** Biome definitions, biome tags on orchards/chunks, biome-specific weather probabilities, crop suitability, resources, flora, fauna, lighting palettes, and unlock requirements.
- **Expansion ideas:** Starter orchard meadow, humid fungal grove, arid solar terrace, alpine crystal ridge, flooded mangrove lab, and alien sky-garden biomes with distinct crop bonuses and hazards.
- **Implementation sequence:**
  1. Add `data/world/biomes.json` with IDs, climate ranges, resource tables, crop modifiers, palette hints, and unlock metadata.
  2. Add biome references to orchard/world-location state.
  3. Apply biome modifiers to weather rolls and plant lifecycle calculations.
  4. Add biome UI badges, encyclopedia entries, and balance tests.

### Terrain

- **Current state:** `terrain` exists as a named simulation system, but terrain is not represented in runtime gameplay beyond fixed orchard plots.
- **Missing features:** Terrain tiles, elevation, soil types, traversal cost, buildability, erosion, fertility, hazards, and procedural generation.
- **Expansion ideas:** Terraced farms, cliffs that shade plots, mineral outcrops, fertile riverbanks, toxic marsh patches, and terrain-shaping upgrades.
- **Implementation sequence:**
  1. Define a tile/chunk terrain schema with elevation, surface, fertility, moisture, and hazard fields.
  2. Generate deterministic terrain for each orchard or chunk from a seed.
  3. Map existing fixed plots onto terrain cells without changing core planting UX.
  4. Introduce terrain effects on growth, movement, resource placement, and building placement.

### Lighting

- **Current state:** Plant visualization changes lighting color for weather states, and `lighting` exists as a simulation system.
- **Missing features:** Global light model, biome palettes, time-of-day intensity, weather-driven visibility, artificial lights, shadow effects, and gameplay consequences.
- **Expansion ideas:** Grow lamps, moonlight crops, storm flashes, fog-diffused scenes, cave darkness, and light-sensitive secrets.
- **Implementation sequence:**
  1. Create a `WorldLightingState` derived from day phase, weather, biome, and indoor/outdoor context.
  2. Feed lighting values into UI/render adapters and plant visualizers.
  3. Add gameplay hooks for light-loving, shade-loving, and nocturnal species.
  4. Add tests for deterministic lighting transitions across day/night and weather changes.

### Day/night

- **Current state:** The game tracks days and has a day-night simulation system that can emit `DAY_STARTED`, but the live loop is mostly day-advance oriented.
- **Missing features:** Time-of-day phases, hourly schedules, night-only behaviors, sleep/rest actions, lighting integration, and NPC/animal schedules.
- **Expansion ideas:** Dawn dew bonuses, midday heat stress, dusk pollinator windows, midnight bloom crops, and night raids/events.
- **Implementation sequence:**
  1. Add `timeOfDay`, `dayPhase`, and elapsed tick fields to world state.
  2. Convert daily changes into phase-based updates where safe.
  3. Route NPC, animals, lighting, weather transitions, and spawns through day phases.
  4. Add player actions that intentionally advance to morning/noon/evening/night.

### Weather

- **Current state:** Weather, forecasts, random weather selection, climate control, visual effects, and weather data-pack examples exist.
- **Missing features:** Complete data-driven weather catalog, biome/season probability tables, duration, intensity, fronts, forecast accuracy, and unified effects across farming, movement, lighting, audio, NPCs, and resources.
- **Expansion ideas:** Microclimates, drought chains, monsoons, aurora nights, meteor showers, pollen bursts, and player-built weather instruments.
- **Implementation sequence:**
  1. Move all weather constants into data packs and add clear/heatwave coverage.
  2. Add deterministic forecast generation with accuracy metadata.
  3. Apply weather effects through a single weather-effect resolver.
  4. Expand climate-control upgrades from override-only to mitigation, prediction, and harvesting bonuses.

### Water

- **Current state:** Plants have water needs, rain affects crop water conceptually, and `water` exists as a named simulation system.
- **Missing features:** World water bodies, irrigation networks, groundwater, flooding, drought, water quality, storage, and biome hydrology.
- **Expansion ideas:** Wells, canals, rain collectors, pumps, wetlands, seasonal rivers, polluted water purification, and water creatures.
- **Implementation sequence:**
  1. Add water availability and moisture fields to terrain/chunks.
  2. Connect rain, heatwave, soil, and irrigation to plot water updates.
  3. Add buildable water infrastructure with upkeep and capacity.
  4. Add flood/drought events, water resources, and water-dependent secrets.

### Trees

- **Current state:** Orchade focuses on plants/crops; trees are not a separate simulation category.
- **Missing features:** Tree lifecycle, canopy/shade, fruiting seasons, lumber resources, wildlife habitat, disease, pruning, and long-term growth.
- **Expansion ideas:** Ancient orchard trees, grafting, resin harvests, tree spirits, windbreak rows, and biome-defining keystone trees.
- **Implementation sequence:**
  1. Add tree archetypes to a world flora catalog.
  2. Represent trees as persistent entities with age, health, canopy radius, and harvest windows.
  3. Add shade and habitat effects to nearby plots and animals.
  4. Add pruning/grafting tools and tree-specific quests.

### Plants

- **Current state:** Plant lifecycle, water, nutrients, stress, pests, staged growth, harvests, encyclopedia lore, and crop data examples exist.
- **Missing features:** Full data-driven crop catalog, biome/season suitability, pollination, disease spread, genetics, companion planting, dormancy, and wild plants.
- **Expansion ideas:** Rare mutation lines, seed traits, invasive species, wild forage patches, plant families, and plant-based world puzzles.
- **Implementation sequence:**
  1. Align runtime plant species with crop data packs.
  2. Add environmental modifier resolution for biome, season, weather, light, soil, water, and neighbors.
  3. Introduce optional genetics/trait data without breaking existing save data.
  4. Add wild plant spawns and ecology interactions.

### Animals

- **Current state:** NPC archetype data includes an animal archetype, and `wildlife` exists as a simulation system, but animals are not live world entities.
- **Missing features:** Animal species, needs, movement, habitats, spawn rules, crop interactions, taming/repelling, predators, pollinators, and observation rewards.
- **Expansion ideas:** Pollinating moths, pest-eating birds, crop-raiding boars, burrowing mineral moles, seasonal migrations, and companion creatures.
- **Implementation sequence:**
  1. Add animal archetypes with habitat, schedule, diet, temperament, and interaction rules.
  2. Implement low-cost animal presence events before full pathfinding.
  3. Add visible entity simulation for high-value animals.
  4. Connect animals to ecology, quests, resources, and crop modifiers.

### Villages

- **Current state:** NPC archetype data includes villagers and merchants, but no village map, schedule system, reputation, or services are implemented.
- **Missing features:** Village locations, buildings, NPC schedules, services, reputation, trade routes, festivals, dialogue hooks, and village progression.
- **Expansion ideas:** Biome villages with specialty markets, repair workshops, seed guilds, seasonal festivals, bulletin boards, and player-built outposts.
- **Implementation sequence:**
  1. Define village location records and core services.
  2. Attach NPC archetypes to village schedules and shops.
  3. Add reputation and quest hooks.
  4. Add village events, festivals, and economic links to resources.

### Dungeons

- **Current state:** Combat has a capsule scaffold, but world dungeons are not represented.
- **Missing features:** Dungeon entrances, procedural rooms, enemy/resource tables, hazards, keys, rewards, persistence, and difficulty scaling.
- **Expansion ideas:** Root caverns, abandoned hydro labs, crystal mines, storm bunkers, fungal ruins, and seasonal dungeon variants.
- **Implementation sequence:**
  1. Add dungeon location metadata and entrance unlock conditions.
  2. Implement room graph generation with deterministic seeds.
  3. Connect encounters, resources, secrets, and rewards through existing combat/inventory APIs.
  4. Add persistence for cleared rooms, shortcuts, and weekly reset variants.

### Resources

- **Current state:** Items and harvest rewards exist, but world resource nodes are not yet modeled.
- **Missing features:** Resource node types, spawn tables, depletion, gathering tools, quality tiers, biome/terrain placement, and market/crafting integration.
- **Expansion ideas:** Ore veins, resin, dew crystals, medicinal herbs, salvage, fish, meteor shards, and rare seasonal materials.
- **Implementation sequence:**
  1. Add resource definitions with gather requirements, yields, depletion, and regeneration rules.
  2. Place nodes through deterministic biome/terrain spawn tables.
  3. Connect gathering to inventory, tools, quests, and crafting.
  4. Add quality, rarity, and event-driven special resources.

### Secrets

- **Current state:** No dedicated secret discovery system is visible.
- **Missing features:** Hidden flags, discovery conditions, clue presentation, puzzle state, secret rewards, and replay-safe persistence.
- **Expansion ideas:** Hidden grove entrances, constellation planting patterns, weather-only doors, rare animal trails, buried caches, and lore fragments.
- **Implementation sequence:**
  1. Add secret definitions with conditions, hints, rewards, and persistence keys.
  2. Evaluate conditions on world events such as weather change, day phase, harvest, movement, and resource gathering.
  3. Add subtle UI/audio feedback for near misses and discoveries.
  4. Add multi-step secret chains tied to biomes and seasons.

### Spawn system

- **Current state:** Runtime creates fixed orchard plots and random weather; there is no generalized spawn manager.
- **Missing features:** Spawn tables, spawn budgets, seeded randomness, density controls, despawn rules, rarity, cooldowns, and cross-system ownership.
- **Expansion ideas:** Dynamic spawns for animals, resources, merchants, world events, secrets, and hazards using shared conditions.
- **Implementation sequence:**
  1. Create a deterministic spawn resolver with context inputs: biome, terrain, weather, season, day phase, player progress, and chunk.
  2. Start with passive resource and animal event spawns.
  3. Add spawn budgets and cooldowns for performance and balance.
  4. Expose debug tooling and tests for spawn reproducibility.

### Streaming

- **Current state:** The game appears to run as a compact app shell without world streaming.
- **Missing features:** World partitioning, async load boundaries, asset prefetching, entity activation ranges, persistence snapshots, and streaming telemetry.
- **Expansion ideas:** Seamless movement between orchards, villages, wilderness, and dungeons; predictive preloading based on route plans; low-memory mobile modes.
- **Implementation sequence:**
  1. Define world regions and chunks independently of rendering.
  2. Add async data loaders for region catalogs and generated chunk state.
  3. Activate simulation only near the player or relevant remote systems.
  4. Add performance metrics and fallback loading screens.

### Chunk loading

- **Current state:** No chunk model is implemented; orchards are fixed arrays of plots.
- **Missing features:** Chunk coordinates, chunk seeds, chunk cache, save serialization, dirty tracking, unload rules, and boundary stitching.
- **Expansion ideas:** Expandable orchards, wilderness exploration, procedural resource fields, instanced dungeons, and chunk-level ecology.
- **Implementation sequence:**
  1. Add `WorldChunk` types with coordinate, biome, terrain, entities, resources, and dirty flags.
  2. Generate chunks deterministically from world seed and biome map.
  3. Persist only player changes and important discovered state.
  4. Add load/unload tests and migration logic for existing saves.

### Ecology

- **Current state:** Plants, pests, weather, and wildlife concepts exist separately, but there is no ecology simulation.
- **Missing features:** Food webs, pollination, predator/prey relationships, habitat quality, biodiversity scores, invasive pressure, and ecological consequences.
- **Expansion ideas:** Healthy ecosystems that reduce pests, overharvesting penalties, pollinator corridors, habitat restoration quests, and biome health ratings.
- **Implementation sequence:**
  1. Define ecology metrics per biome/chunk: biodiversity, pollution, habitat, pest pressure, and pollinator activity.
  2. Update metrics from plants, trees, animals, weather, and player actions.
  3. Feed ecology metrics back into crop health, animal spawns, and resource regeneration.
  4. Add UI summaries and restoration goals.

### Resource regeneration

- **Current state:** Crops regrow through plant lifecycle, but world resources do not have depletion/regeneration behavior.
- **Missing features:** Regeneration timers, caps, seasonal availability, player impact, ecological modifiers, and anti-farming safeguards.
- **Expansion ideas:** Sustainable harvesting bonuses, depleted-zone recovery quests, rare regrowth after storms, and village policies that influence resource pressure.
- **Implementation sequence:**
  1. Add regeneration rules to resource definitions.
  2. Tick regeneration on day/season transitions rather than every frame.
  3. Modify regeneration by biome health, weather, season, and upgrades.
  4. Add tests for depletion, save/load, and deterministic regrowth.

### Seasonal transformation

- **Current state:** A season simulation system exists and crop data includes seasons, but seasons do not appear to drive live world transformation yet.
- **Missing features:** Calendar, season lengths, visual palettes, biome transformations, seasonal weather tables, crop availability, animal migration, festivals, and dungeon variants.
- **Expansion ideas:** Spring bloom surges, summer drought risk, autumn harvest festivals, winter dormancy, wet/dry seasons for alien biomes, and seasonal secret windows.
- **Implementation sequence:**
  1. Add calendar state with season, day-of-season, and year.
  2. Connect crop eligibility and weather probabilities to season.
  3. Add seasonal modifiers for resources, animals, lighting, villages, and events.
  4. Add transformation presentation: palettes, UI banners, event logs, and encyclopedia records.

### World events

- **Current state:** The simulation can emit events such as `DAY_STARTED` and `WEATHER_CHANGED`, and docs reference an event bus, but world events are not yet a content-driven system.
- **Missing features:** Event definitions, trigger conditions, durations, priorities, cooldowns, player choices, consequences, and event history.
- **Expansion ideas:** Meteor showers, pest swarms, market caravans, bloom festivals, drought emergencies, dungeon openings, animal migrations, and village requests.
- **Implementation sequence:**
  1. Define data-driven world event records with triggers, effects, duration, and messages.
  2. Add an event scheduler that consumes day phase, weather, season, biome, ecology, and progress.
  3. Implement low-risk notification-only events first, then events with choices and state changes.
  4. Add event history, balancing tests, and telemetry hooks.

## Recommended milestone order

1. **Foundation:** deterministic random utilities, world data schemas, biome definitions, calendar, and chunk/world types.
2. **Core environment:** weather, day/night, lighting, terrain, water, and plant environmental modifiers.
3. **Content placement:** spawn system, resources, trees, wild plants, animals, and resource regeneration.
4. **Places and progression:** villages, dungeons, secrets, streaming, and chunk loading.
5. **Emergence:** ecology, seasonal transformation, world events, advanced NPC/animal behavior, and long-term balancing.
