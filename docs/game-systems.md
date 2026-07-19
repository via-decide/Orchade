# Game Systems

## Current systems
| System | Static evidence | Current player-facing behavior |
|---|---|---|
| Farming | Plant type fields and actions in `src/App.tsx`; `Plant` model in `src/types.ts`; crop definition data. | Plant, research, water, fertilize, pest control, harvest. |
| Weather | `WEATHER_TYPES`, forecasts, climate control UI, weather particles, weather data pack. | Weather changes resource drain, stress, research output, and visuals. |
| Economy | Credits, Data Seeds, shop items, upgrades, market exchange, transfer, rankings. | Players earn, spend, transfer, and compare wealth. |
| Progression | Plant stages, orchard unlock costs, upgrades, harvested species archive. | Short-term care loop and long-term unlock/collection goals. |
| Platform simulation | Event bus and ordered systems in `src/simulation`. | Mostly architectural; not fully player-visible. |

## Suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Create a `gameplay/farming` reducer for all plant actions. | Centralizes balance math and makes outcomes testable. | M | L | H | M | M | H |
| Add crop traits such as drought tolerance, pest resistance, growth speed, and weather affinity. | Gives seed choice strategic meaning beyond cost and flavor. | M | M | H | H | H | M |
| Add action previews for water/nutrient/stress/pest changes. | Helps players learn cause and effect before spending resources. | S | L | M | M | H | L |
| Connect quest progress to gameplay events such as `CROP_HARVESTED` and `WEATHER_CHANGED`. | Converts existing events into goals and rewards. | M | M | H | H | H | H |
| Add economy telemetry for sources and sinks. | Makes balancing rewards, upgrades, and shops evidence-based. | M | L | M | M | H | M |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
