# World Simulation

## Evidence baseline
`src/simulation/worldSystems.ts` declares terrain, weather, day-night, temperature, water, wind, lighting, season, wildlife, and NPC simulation systems. Day-night can emit `DAY_STARTED`; weather can emit `WEATHER_CHANGED` with crop, movement, visibility, NPC behavior, audio, and lighting influence. Runtime React state already includes day, weather, weather forecast, climate control, and multiple orchards.

## Suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Add seasons to crop eligibility and weather probabilities. | Makes planting timing and crop planning matter. | L | M | H | H | H | H |
| Make each orchard location have modifiers such as humidity, soil richness, pests, and wind. | Turns unlocking orchards into strategic expansion. | M | M | H | H | H | M |
| Implement weather data as the source for crop, movement, visibility, lighting, and audio effects. | Unifies simulation, presentation, and balance. | M | M | H | M | H | H |
| Add wildlife events that can help or harm crops. | Creates memorable emergent stories and reactive choices. | L | M | H | H | M | M |
| Add forecast reliability and tools that improve predictions. | Gives players planning uncertainty and progression-driven mastery. | M | M | H | H | H | M |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
