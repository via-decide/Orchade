# Research Backlog

## Evidence baseline
The repository already distinguishes engineering evidence (`docs/`, ADRs, graphs), game data (`data/`), feature boundaries (`gameplay/`), and runtime behavior (`src/`). Research should therefore be validated against local code before implementation.

## Research questions and suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Balance model research: simulate crop ROI, stress failure rates, and upgrade payback periods. | Keeps progression fair and avoids dominant strategies. | M | L | H | H | H | M |
| UX research: observe first-session comprehension of tabs, resources, weather, and harvest readiness. | Reveals friction before adding more complexity. | M | L | H | M | H | L |
| Content taxonomy research: define species families, rarity tiers, and biome tags. | Makes future content coherent and easier to generate. | M | L | H | H | H | M |
| Performance research: profile Three.js particles and scene lifecycle on low-end devices. | Protects retention by keeping visuals smooth. | M | M | M | L | H | M |
| Live-ops research: test daily contracts, weather challenges, and archive milestones as return hooks. | Identifies retention features worth building first. | M | M | H | H | H | M |
| Architecture research: compare data validation approaches for JSON catalogs and Firestore saves. | Avoids fragile migrations as content scales. | S | L | M | M | H | H |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
