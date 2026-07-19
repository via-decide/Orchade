# Quality of Life

## Evidence baseline
The UI already includes tabs, logs, selected plant panels, visual status bars, weather forecast cards, market inputs, rankings, profile stats, and archive search. Plant actions currently require selecting individual plants and applying one action at a time.

## Suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Add bulk actions for watering, fertilizing, pesticide, and harvesting eligible plants. | Reduces repetitive clicks as orchards expand. | M | M | H | M | H | M |
| Add sortable/filterable orchard views by stress, water, pests, stage, and harvest readiness. | Helps players manage larger farms without scanning every plot. | M | L | H | M | H | M |
| Add clear disabled-state explanations for unaffordable or invalid actions. | Prevents confusion and reduces failed interactions. | S | L | M | L | H | L |
| Add configurable number formatting and compact tooltips. | Improves readability as currencies and stats scale. | S | L | M | L | M | L |
| Add manual save status and conflict indicators. | Builds trust in cloud persistence. | M | M | M | L | H | H |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
