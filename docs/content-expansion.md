# Content Expansion

## Evidence baseline
Runtime exposes nine seed/species concepts in `src/App.tsx` and the encyclopedia has rich lore for those species. Data packs currently include one crop, three item entries, three weather entries, one quest, three NPC archetypes, one tool, and one building.

## Suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Backfill `data/crops` for every runtime seed and encyclopedia species. | Removes content drift and enables data-only balancing. | M | L | H | H | H | H |
| Add crop families with shared traits and cross-family bonuses. | Gives collectors meaningful set goals. | M | L | H | H | H | M |
| Add quest packs: tutorial, daily contracts, weather trials, species mastery, and orchard unlock arcs. | Provides short, medium, and long-term objectives. | L | M | H | H | H | H |
| Add item tiers for fertilizers, pesticides, stabilizers, seeds, and tools. | Expands shop decisions and supports crafting. | L | M | H | H | H | H |
| Add NPC merchant inventory rotations. | Makes market visits surprising and creates return hooks. | M | M | H | H | H | M |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
